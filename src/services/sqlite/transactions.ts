import { query, queryOne, run, addToSyncQueue, transaction } from './db'
import { getCurrentUserId, uuid, nowIso, generateTransactionNumber } from './db'
import { sqliteFinanceService } from './finance'
import type { Transaction, TransactionInput, TransactionItem, TransactionPayment } from '@/types/database'

// ============================================================
// SQLite Service: Transactions
// Mirror dari src/services/transactions.ts + replikasi fungsi RPC:
//   - create_transaction (atomik: validasi stok, simpan transaksi+items, kurangi stok, catat pembayaran)
//   - add_transaction_payment (atomik: catat pembayaran, update status)
//   - delete_transaction (atomik: kembalikan stok, hapus)
//   - void_transaction (atomik: kembalikan stok, set status=batal)
// Plus replikasi trigger: record_stock_movement, create_transaction_notification, create_payment_notification
// ============================================================

export interface CreateTransactionResult {
  id: string
}

export const sqliteTransactionsService = {
  async getAll(): Promise<Transaction[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT * FROM transactions
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    )
    return rows.map((r) => this.mapRow(r))
  },

  async getById(id: string): Promise<Transaction | null> {
    const userId = getCurrentUserId()
    const row = await queryOne<any>(
      `SELECT * FROM transactions WHERE id = ? AND user_id = ?`,
      [id, userId]
    )
    if (!row) return null

    const txn = this.mapRow(row)
    txn.items = await this.getItems(id)
    txn.payments = await this.getPayments(id)
    return txn
  },

  async getItems(transactionId: string): Promise<TransactionItem[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT * FROM transaction_items WHERE transaction_id = ? AND user_id = ? ORDER BY created_at ASC`,
      [transactionId, userId]
    )
    return rows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      transaction_id: r.transaction_id,
      product_id: r.product_id ?? undefined,
      product_name: r.product_name,
      price: r.price,
      quantity: r.quantity,
      subtotal: r.subtotal,
      created_at: r.created_at,
    }))
  },

  async getPayments(transactionId: string): Promise<TransactionPayment[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT * FROM transaction_payments WHERE transaction_id = ? AND user_id = ? ORDER BY created_at ASC`,
      [transactionId, userId]
    )
    return rows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      transaction_id: r.transaction_id,
      amount: r.amount,
      payment_method: r.payment_method,
      notes: r.notes ?? undefined,
      created_at: r.created_at,
    }))
  },

  /**
   * Replikasi fungsi RPC create_transaction:
   * 1. Validasi stok & hitung total dari tiap item
   * 2. Simpan header transaksi (dengan custom date)
   * 3. Simpan rincian item + kurangi stok produk
   * 4. Catat pembayaran awal (jika ada)
   * 5. Replikasi trigger: record_stock_movement + create_transaction_notification
   * 6. Queue ke sync_queue
   */
  async create(input: TransactionInput): Promise<string> {
    const userId = getCurrentUserId()
    const txnId = uuid()
    const now = nowIso()
    const transactionDate = input.transaction_date || now

    let autoJournalId: string | null = null

    return transaction(async (tx) => {
      // 1. Validasi stok & hitung total
      let total = 0
      const itemDetails: Array<{
        productId: string
        productName: string
        price: number
        quantity: number
        priceBuy: number
        stockBefore: number
        stockAfter: number
      }> = []

      for (const item of input.items) {
        const product = await tx.query<any>(
          `SELECT id, name, price_sell, price_buy, stock FROM products WHERE id = ? AND user_id = ?`,
          [item.product_id, userId]
        )
        const p = product[0]
        if (!p) throw new Error('Produk tidak ditemukan')
        if (item.quantity <= 0) throw new Error('Jumlah tidak valid')

        const price = item.price && item.price > 0 ? item.price : p.price_sell
        const subtotal = price * item.quantity
        total += subtotal

        if (p.stock < item.quantity) {
          throw new Error(`Stok ${p.name} tidak mencukupi (sisa ${p.stock})`)
        }

        itemDetails.push({
          productId: p.id,
          productName: p.name,
          price,
          quantity: item.quantity,
          priceBuy: p.price_buy || 0,
          stockBefore: p.stock,
          stockAfter: p.stock - item.quantity,
        })
      }

      // 2. Hitung total setelah diskon & retur
      total = Math.max(total - (input.discount || 0) - (input.return_amount || 0), 0)
      const paid = input.paid_amount || 0
      const remaining = Math.max(total - paid, 0)
      const paymentStatus = paid >= total ? 'lunas' : 'belum_lunas'
      const transactionNumber = generateTransactionNumber()

      // Hitung total HPP (cost of goods sold) untuk auto-jurnal
      const totalCogs = itemDetails.reduce((sum, d) => sum + d.priceBuy * d.quantity, 0)

      // 3. Simpan header transaksi
      await tx.run(
        `INSERT INTO transactions (id, user_id, transaction_number, customer_id, customer_name,
                                   subtotal, discount, total, payment_method, paid_amount,
                                   change_amount, remaining_amount, payment_status, status, notes,
                                   created_at, updated_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'selesai', ?, ?, ?, 'pending', ?)`,
        [
          txnId,
          userId,
          transactionNumber,
          input.customer_id ?? null,
          input.customer_name ?? null,
          total + (input.discount || 0) + (input.return_amount || 0), // subtotal asli
          (input.discount || 0) + (input.return_amount || 0),         // discount = diskon + retur (sesuai RPC)
          total,
          input.payment_method || 'tunai',
          paid,
          Math.max(paid - total, 0),
          remaining,
          paymentStatus,
          input.notes ?? null,
          transactionDate,
          transactionDate,
          now,
        ]
      )

      // 4. Simpan items + kurangi stok + replikasi record_stock_movement
      for (const detail of itemDetails) {
        const itemId = uuid()
        const subtotal = detail.price * detail.quantity

        await tx.run(
          `INSERT INTO transaction_items (id, user_id, transaction_id, product_id, product_name,
                                          price, quantity, subtotal, created_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
          [
            itemId,
            userId,
            txnId,
            detail.productId,
            detail.productName,
            detail.price,
            detail.quantity,
            subtotal,
            transactionDate,
            now,
          ]
        )

        await tx.run(
          `UPDATE products SET stock = ?, updated_at = ?, sync_status = 'pending', updated_at_local = ?
           WHERE id = ? AND user_id = ?`,
          [detail.stockAfter, now, now, detail.productId, userId]
        )

        // Replikasi trigger: record_stock_movement
        await tx.run(
          `INSERT INTO stock_movements (id, user_id, product_id, movement_type, quantity,
                                        quantity_before, quantity_after, reference_type, reference_id,
                                        notes, created_at, created_by, sync_status, updated_at_local)
           VALUES (?, ?, ?, 'out', ?, ?, ?, 'transaction', ?, ?, ?, ?, 'pending', ?)`,
          [
            uuid(),
            userId,
            detail.productId,
            detail.quantity,
            detail.stockBefore,
            detail.stockAfter,
            txnId,
            'Transaksi ' + transactionNumber,
            transactionDate,
            userId,
            now,
          ]
        )

        // Replikasi trigger: create_low_stock_notification
        if (detail.stockAfter <= 10) {
          await this.insertLowStockNotification(tx, detail.productId, detail.productName, detail.stockAfter)
        }
      }

      // 5. Catat pembayaran awal (jika ada)
      if (paid > 0) {
        const paymentId = uuid()
        await tx.run(
          `INSERT INTO transaction_payments (id, user_id, transaction_id, amount, payment_method, notes, created_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, NULL, ?, 'pending', ?)`,
          [paymentId, userId, txnId, paid, input.payment_method || 'tunai', transactionDate, now]
        )
      }

      // 6. Replikasi trigger: create_transaction_notification
      await tx.run(
        `INSERT INTO notifications (id, user_id, type, title, message, data, is_read, created_at, sync_status, updated_at_local)
         VALUES (?, ?, 'transaction', 'Transaksi Baru', ?, ?, 0, ?, 'pending', ?)`,
        [
          uuid(),
          userId,
          `Transaksi ${transactionNumber} berhasil dibuat dengan total ${total}`,
          JSON.stringify({ transaction_id: txnId, transaction_number: transactionNumber, total }),
          transactionDate,
          now,
        ]
      )

      // 7. Auto-jurnal: catat penjualan ke pembukuan (jika COA sudah di-seed)
      autoJournalId = await sqliteFinanceService.postSalesJournal(
        tx,
        userId,
        txnId,
        input.customer_name ?? null,
        total,
        paid,
        remaining,
        totalCogs,
        transactionDate,
        now
      )
    }).then(async () => {
      // Queue header transaksi (items/stock movements ikut terqueue sebagai payload)
      const txn = await this.getById(txnId)
      await addToSyncQueue('INSERT', 'transactions', txnId, txn || { id: txnId })

      // Queue jurnal otomatis (header + lines) agar ikut tersinkron
      if (autoJournalId) {
        const journal = await sqliteFinanceService.getJournal(autoJournalId)
        await addToSyncQueue('INSERT', 'journal_entries', autoJournalId, journal || { id: autoJournalId })
      }
      return txnId
    })
  },

  /**
   * Replikasi fungsi RPC add_transaction_payment:
   * 1. Validasi sisa cicilan
   * 2. Catat pembayaran
   * 3. Update paid_amount, remaining_amount, payment_status
   * 4. Replikasi trigger: create_payment_notification
   */
  async addPayment(
    transactionId: string,
    amount: number,
    paymentMethod: string,
    notes?: string
  ): Promise<string> {
    const userId = getCurrentUserId()
    const paymentId = uuid()
    const now = nowIso()
    let autoJournalId: string | null = null

    await transaction(async (tx) => {
      // Ambil transaksi
      const txnRows = await tx.query<any>(
        `SELECT id, total, paid_amount, remaining_amount, transaction_number FROM transactions
         WHERE id = ? AND user_id = ?`,
        [transactionId, userId]
      )
      const txn = txnRows[0]
      if (!txn) throw new Error('Transaksi tidak ditemukan')
      if (amount <= 0) throw new Error('Jumlah pembayaran tidak valid')
      if (amount > txn.remaining_amount) {
        throw new Error(`Pembayaran melebihi sisa cicilan (sisa ${txn.remaining_amount})`)
      }

      // Catat pembayaran
      await tx.run(
        `INSERT INTO transaction_payments (id, user_id, transaction_id, amount, payment_method, notes, created_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [paymentId, userId, transactionId, amount, paymentMethod || 'tunai', notes ?? null, now, now]
      )

      // Update transaksi
      const newPaid = txn.paid_amount + amount
      const newRemaining = txn.remaining_amount - amount
      const newStatus = newRemaining <= 0 ? 'lunas' : 'belum_lunas'
      await tx.run(
        `UPDATE transactions
         SET paid_amount = ?, remaining_amount = ?, payment_status = ?, updated_at = ?,
             sync_status = 'pending', updated_at_local = ?
         WHERE id = ? AND user_id = ?`,
        [newPaid, newRemaining, newStatus, now, now, transactionId, userId]
      )

      // Replikasi trigger: create_payment_notification
      await tx.run(
        `INSERT INTO notifications (id, user_id, type, title, message, data, is_read, created_at, sync_status, updated_at_local)
         VALUES (?, ?, 'payment', 'Pembayaran Diterima', ?, ?, 0, ?, 'pending', ?)`,
        [
          uuid(),
          userId,
          `Pembayaran ${amount} untuk transaksi ${txn.transaction_number} berhasil dicatat`,
          JSON.stringify({ payment_id: paymentId, transaction_id: transactionId, amount, payment_method: paymentMethod || 'tunai' }),
          now,
          now,
        ]
      )

      // Auto-jurnal: pindahkan Piutang → Kas
      autoJournalId = await sqliteFinanceService.postPaymentJournal(
        tx,
        userId,
        transactionId,
        amount,
        txn.transaction_number,
        now
      )
    })

    await addToSyncQueue('INSERT', 'transaction_payments', paymentId, { id: paymentId, transaction_id: transactionId, amount, payment_method: paymentMethod })
    // Header transaksi juga berubah
    const txn = await this.getById(transactionId)
    if (txn) await addToSyncQueue('UPDATE', 'transactions', transactionId, txn)

    // Queue jurnal pembayaran
    if (autoJournalId) {
      const journal = await sqliteFinanceService.getJournal(autoJournalId)
      await addToSyncQueue('INSERT', 'journal_entries', autoJournalId, journal || { id: autoJournalId })
    }

    return paymentId
  },

  /**
   * Replikasi fungsi RPC delete_transaction:
   * 1. Kembalikan stok produk dari tiap item
   * 2. Hapus transaksi (items ikut terhapus via cascade)
   */
  async delete(id: string): Promise<void> {
    const userId = getCurrentUserId()
    const now = nowIso()
    const deletedJournalIds: string[] = []

    await transaction(async (tx) => {
      // Hapus baris jurnal & jurnal terkait (agar tidak orphan)
      const journals = await tx.query<any>(
        `SELECT id FROM journal_entries WHERE reference_type IN ('transaction', 'payment', 'void')
         AND reference_id = ? AND user_id = ?`,
        [id, userId]
      )
      for (const j of journals) {
        deletedJournalIds.push(j.id)
        await tx.run(
          `DELETE FROM journal_lines WHERE journal_id = ? AND user_id = ?`,
          [j.id, userId]
        )
      }
      await tx.run(
        `DELETE FROM journal_entries WHERE reference_type IN ('transaction', 'payment', 'void')
         AND reference_id = ? AND user_id = ?`,
        [id, userId]
      )

      const items = await tx.query<any>(
        `SELECT product_id, quantity FROM transaction_items WHERE transaction_id = ? AND user_id = ?`,
        [id, userId]
      )

      // Kembalikan stok
      for (const item of items) {
        if (item.product_id) {
          const before = await tx.query<any>('SELECT stock FROM products WHERE id = ? AND user_id = ?', [item.product_id, userId])
          const after = before[0] ? before[0].stock + item.quantity : item.quantity
          await tx.run(
            `UPDATE products SET stock = ?, updated_at = ?, sync_status = 'pending', updated_at_local = ?
             WHERE id = ? AND user_id = ?`,
            [after, nowIso(), nowIso(), item.product_id, userId]
          )
          await tx.run(
            `INSERT INTO stock_movements (id, user_id, product_id, movement_type, quantity,
                                          quantity_before, quantity_after, reference_type, reference_id,
                                          notes, created_at, created_by, sync_status, updated_at_local)
             VALUES (?, ?, ?, 'in', ?, ?, ?, 'transaction_delete', ?, 'Pengembalian stok hapus transaksi', ?, ?, 'pending', ?)`,
            [uuid(), userId, item.product_id, item.quantity, before[0]?.stock ?? 0, after, id, nowIso(), userId, nowIso()]
          )
        }
      }

      await tx.run('DELETE FROM transactions WHERE id = ? AND user_id = ?', [id, userId])
    })

    await addToSyncQueue('DELETE', 'transactions', id, { id })
    // Queue DELETE jurnal yang ikut terhapus
    for (const jid of deletedJournalIds) {
      await addToSyncQueue('DELETE', 'journal_entries', jid, { id: jid })
    }
  },

  /**
   * Replikasi fungsi RPC void_transaction:
   * 1. Validasi status (bukan batal)
   * 2. Kembalikan stok produk
   * 3. Set status = 'batal' (data tetap tersimpan)
   */
  async voidTransaction(id: string): Promise<void> {
    const userId = getCurrentUserId()
    const now = nowIso()
    let autoJournalId: string | null = null

    await transaction(async (tx) => {
      const txnRows = await tx.query<any>(
        `SELECT status, transaction_number, total, paid_amount, remaining_amount FROM transactions WHERE id = ? AND user_id = ?`,
        [id, userId]
      )
      const txn = txnRows[0]
      if (!txn) throw new Error('Transaksi tidak ditemukan')
      if (txn.status === 'batal') throw new Error('Transaksi sudah dibatalkan sebelumnya')

      const items = await tx.query<any>(
        `SELECT ti.product_id, ti.quantity, COALESCE(p.price_buy, 0) AS price_buy
         FROM transaction_items ti
         LEFT JOIN products p ON p.id = ti.product_id
         WHERE ti.transaction_id = ? AND ti.user_id = ?`,
        [id, userId]
      )

      let totalCogs = 0
      for (const item of items) {
        totalCogs += item.price_buy * item.quantity
        if (item.product_id) {
          const before = await tx.query<any>('SELECT stock FROM products WHERE id = ? AND user_id = ?', [item.product_id, userId])
          const after = before[0] ? before[0].stock + item.quantity : item.quantity
          await tx.run(
            `UPDATE products SET stock = ?, updated_at = ?, sync_status = 'pending', updated_at_local = ?
             WHERE id = ? AND user_id = ?`,
            [after, now, now, item.product_id, userId]
          )
          await tx.run(
            `INSERT INTO stock_movements (id, user_id, product_id, movement_type, quantity,
                                          quantity_before, quantity_after, reference_type, reference_id,
                                          notes, created_at, created_by, sync_status, updated_at_local)
             VALUES (?, ?, ?, 'in', ?, ?, ?, 'transaction_void', ?, 'Pengembalian stok transaksi batal', ?, ?, 'pending', ?)`,
            [uuid(), userId, item.product_id, item.quantity, before[0]?.stock ?? 0, after, id, now, userId, now]
          )
        }
      }

      await tx.run(
        `UPDATE transactions SET status = 'batal', updated_at = ?, sync_status = 'pending', updated_at_local = ?
         WHERE id = ? AND user_id = ?`,
        [now, now, id, userId]
      )

      // Void jurnal penjualan terkait
      await sqliteFinanceService.voidJournalByReference(tx, userId, 'transaction', id, now)

      // Auto-jurnal: jurnal reversal void
      autoJournalId = await sqliteFinanceService.postVoidJournal(
        tx,
        userId,
        id,
        txn.transaction_number,
        txn.total,
        txn.paid_amount,
        txn.remaining_amount,
        totalCogs,
        now
      )
    })

    const txn = await this.getById(id)
    if (txn) await addToSyncQueue('UPDATE', 'transactions', id, txn)

    // Queue jurnal void
    if (autoJournalId) {
      const journal = await sqliteFinanceService.getJournal(autoJournalId)
      await addToSyncQueue('INSERT', 'journal_entries', autoJournalId, journal || { id: autoJournalId })
    }
  },

  async search(queryStr: string): Promise<Transaction[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT * FROM transactions
       WHERE user_id = ? AND (transaction_number LIKE ? OR customer_name LIKE ?)
       ORDER BY created_at DESC`,
      [userId, `%${queryStr}%`, `%${queryStr}%`]
    )
    return rows.map((r) => this.mapRow(r))
  },

  async getByCustomer(customerId: string): Promise<Transaction[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT * FROM transactions
       WHERE user_id = ? AND customer_id = ? AND status = 'selesai'
       ORDER BY created_at DESC`,
      [userId, customerId]
    )
    return Promise.all(rows.map(async (r) => {
      const txn = this.mapRow(r)
      txn.items = await this.getItems(r.id)
      return txn
    }))
  },

  // ============================================================
  // Helper khusus sync
  // ============================================================

  /** Replace semua data dari hasil download Supabase (transactions + items + payments). */
  async replaceAll(records: Array<Transaction & { items?: TransactionItem[]; payments?: TransactionPayment[] }>): Promise<void> {
    const userId = getCurrentUserId()
    await transaction(async (tx) => {
      // Hapus data lama (items & payments ikut cascade)
      await tx.run('DELETE FROM transactions WHERE user_id = ?', [userId])

      for (const t of records) {
        await tx.run(
          `INSERT OR REPLACE INTO transactions (id, user_id, transaction_number, customer_id, customer_name,
                   subtotal, discount, shipping_cost, return_amount, total, payment_method, paid_amount,
                   change_amount, remaining_amount, payment_status, status, notes, created_at, updated_at,
                   sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
          [
            t.id, userId, t.transaction_number, t.customer_id ?? null, t.customer_name ?? null,
            t.subtotal, t.discount, t.shipping_cost ?? 0, t.return_amount ?? 0, t.total,
            t.payment_method, t.paid_amount, t.change_amount, t.remaining_amount,
            t.payment_status, t.status, t.notes ?? null, t.created_at, t.updated_at, t.updated_at,
          ]
        )

        // Items
        for (const item of t.items || []) {
          await tx.run(
            `INSERT OR REPLACE INTO transaction_items (id, user_id, transaction_id, product_id, product_name,
                     price, quantity, subtotal, created_at, sync_status, updated_at_local)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
            [item.id, userId, t.id, item.product_id ?? null, item.product_name, item.price, item.quantity, item.subtotal, item.created_at, item.created_at]
          )
        }

        // Payments
        for (const p of t.payments || []) {
          await tx.run(
            `INSERT OR REPLACE INTO transaction_payments (id, user_id, transaction_id, amount, payment_method, notes, created_at, sync_status, updated_at_local)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
            [p.id, userId, t.id, p.amount, p.payment_method, p.notes ?? null, p.created_at, p.created_at]
          )
        }
      }
    })
  },

  // ============================================================
  // Internal helpers
  // ============================================================

  /** Replikasi trigger create_low_stock_notification. */
  async insertLowStockNotification(
    tx: any,
    productId: string,
    productName: string,
    stock: number
  ): Promise<void> {
    const userId = getCurrentUserId()
    const now = nowIso()
    await tx.run(
      `INSERT INTO notifications (id, user_id, type, title, message, data, is_read, created_at, sync_status, updated_at_local)
       VALUES (?, ?, 'stock_alert', 'Stok Produk Menipis', ?, ?, 0, ?, 'pending', ?)`,
      [
        uuid(),
        userId,
        `Produk "${productName}" memiliki stok ${stock} (minimum: 10)`,
        JSON.stringify({ product_id: productId, product_name: productName, current_stock: stock, minimum_stock: 10 }),
        now,
        now,
      ]
    )
  },

  mapRow(r: any): Transaction {
    return {
      id: r.id,
      user_id: r.user_id,
      transaction_number: r.transaction_number,
      customer_id: r.customer_id ?? undefined,
      customer_name: r.customer_name ?? undefined,
      subtotal: r.subtotal,
      discount: r.discount,
      shipping_cost: r.shipping_cost ?? undefined,
      return_amount: r.return_amount ?? undefined,
      total: r.total,
      payment_method: r.payment_method,
      paid_amount: r.paid_amount,
      change_amount: r.change_amount,
      remaining_amount: r.remaining_amount,
      payment_status: r.payment_status,
      status: r.status,
      notes: r.notes ?? undefined,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }
  },
}
