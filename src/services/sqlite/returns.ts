import { query, queryOne, addToSyncQueue, transaction } from './db'
import { getCurrentUserId, uuid, nowIso, generateReturnNumber } from './db'
import type { TransactionReturn, ReturnItem, ReturnItemInput } from '@/types/database'

// ============================================================
// SQLite Service: Returns
// Mirror dari src/services/returns.ts + replikasi fungsi RPC:
//   - create_return (atomik: validasi qty → simpan return+items → tambah stok → update transaksi)
//   - delete_return (atomik: kurangi stok → pulihkan total transaksi → hapus)
// Plus replikasi trigger: record_stock_movement, create_low_stock_notification, create_return_notification
// ============================================================

export const sqliteReturnsService = {
  /**
   * Replikasi fungsi RPC create_return:
   * 1. Validasi semua item dulu (qty > 0, produk ada di transaksi, tidak melebihi sisa)
   * 2. Simpan header retur (return_number + total_refund 0)
   * 3. Simpan item retur + kembalikan stok + simpan price_buy untuk laporan
   * 4. Update total_refund retur
   * 5. Kurangi total tagihan transaksi (subtotal, total, remaining, payment_status)
   * 6. Replikasi trigger: record_stock_movement ('in') + create_return_notification
   */
  async createReturn(transactionId: string, items: ReturnItemInput[], notes?: string): Promise<string> {
    const userId = getCurrentUserId()
    const returnId = uuid()
    const now = nowIso()
    const returnNumber = generateReturnNumber()

    return transaction(async (tx) => {
      // --- 1. Validasi transaksi ---
      const txnRows = await tx.query<any>(
        `SELECT status, subtotal, total, paid_amount, remaining_amount, transaction_number FROM transactions
         WHERE id = ? AND user_id = ?`,
        [transactionId, userId]
      )
      const txn = txnRows[0]
      if (!txn) throw new Error('Transaksi tidak ditemukan')
      if (txn.status === 'batal') throw new Error('Transaksi batal tidak dapat diretur')
      if (!items || items.length === 0) throw new Error('Tidak ada item yang diretur')

      // --- 2. Validasi semua item dulu sebelum menulis ---
      const validated: Array<{
        productId: string
        quantity: number
        productName: string
        price: number
        priceBuy: number
        stockBefore: number
        stockAfter: number
      }> = []

      for (const item of items) {
        if (!item.quantity || item.quantity <= 0) {
          throw new Error('Jumlah retur harus lebih dari 0')
        }

        // Produk harus ada di transaksi ini
        const tiRows = await tx.query<any>(
          `SELECT product_name, price, quantity FROM transaction_items
           WHERE transaction_id = ? AND product_id = ? AND user_id = ?`,
          [transactionId, item.product_id, userId]
        )
        const ti = tiRows[0]
        if (!ti) throw new Error('Produk tidak ada di transaksi ini')

        // Hitung total yang sudah diretur untuk produk ini
        const retRows = await tx.query<any>(
          `SELECT COALESCE(SUM(ri.quantity), 0) AS returned
           FROM return_items ri
           JOIN returns r ON r.id = ri.return_id
           WHERE r.transaction_id = ? AND ri.product_id = ? AND r.user_id = ?`,
          [transactionId, item.product_id, userId]
        )
        const alreadyReturned = retRows[0]?.returned ?? 0

        const remainingReturnable = ti.quantity - alreadyReturned
        if (item.quantity > remainingReturnable) {
          throw new Error(`Jumlah retur melebihi sisa produk (maks ${remainingReturnable})`)
        }

        // Ambil price_buy untuk laporan modal
        const prodRows = await tx.query<any>(
          `SELECT price_buy, stock FROM products WHERE id = ? AND user_id = ?`,
          [item.product_id, userId]
        )
        const prod = prodRows[0]

        validated.push({
          productId: item.product_id,
          quantity: item.quantity,
          productName: ti.product_name,
          price: ti.price,
          priceBuy: prod?.price_buy ?? 0,
          stockBefore: prod?.stock ?? 0,
          stockAfter: (prod?.stock ?? 0) + item.quantity,
        })
      }

      // --- 3. Simpan header retur ---
      await tx.run(
        `INSERT INTO returns (id, user_id, transaction_id, return_number, total_refund, notes,
                              created_at, updated_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, 0, ?, ?, ?, 'pending', ?)`,
        [returnId, userId, transactionId, returnNumber, notes ?? null, now, now, now]
      )

      // --- 4. Simpan item retur + kembalikan stok + replikasi trigger ---
      let totalRefund = 0
      for (const v of validated) {
        const itemId = uuid()
        const subtotal = v.price * v.quantity
        totalRefund += subtotal

        await tx.run(
          `INSERT INTO return_items (id, user_id, return_id, product_id, product_name, price,
                                     price_buy, quantity, subtotal, created_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
          [itemId, userId, returnId, v.productId, v.productName, v.price, v.priceBuy, v.quantity, subtotal, now, now]
        )

        await tx.run(
          `UPDATE products SET stock = ?, updated_at = ?, sync_status = 'pending', updated_at_local = ?
           WHERE id = ? AND user_id = ?`,
          [v.stockAfter, now, now, v.productId, userId]
        )

        // Replikasi trigger: record_stock_movement ('in')
        await tx.run(
          `INSERT INTO stock_movements (id, user_id, product_id, movement_type, quantity,
                                        quantity_before, quantity_after, reference_type, reference_id,
                                        notes, created_at, created_by, sync_status, updated_at_local)
           VALUES (?, ?, ?, 'in', ?, ?, ?, 'return', ?, ?, ?, ?, 'pending', ?)`,
          [
            uuid(),
            userId,
            v.productId,
            v.quantity,
            v.stockBefore,
            v.stockAfter,
            returnId,
            'Retur ' + returnNumber,
            now,
            userId,
            now,
          ]
        )

        // Replikasi trigger: create_low_stock_notification (jika turun lewat batas, tidak mungkin saat retur — skip)
        // Stok bertambah saat retur, tidak pernah memicu low stock.
      }

      // --- 5. Update total_refund retur ---
      await tx.run(
        `UPDATE returns SET total_refund = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
        [totalRefund, now, returnId, userId]
      )

      // --- 6. Kurangi total tagihan transaksi ---
      const newTotal = Math.max(txn.total - totalRefund, 0)
      const newSubtotal = Math.max(txn.subtotal - totalRefund, 0)
      const newRemaining = Math.max(newTotal - txn.paid_amount, 0)
      const newPaymentStatus = txn.paid_amount >= newTotal ? 'lunas' : 'belum_lunas'

      await tx.run(
        `UPDATE transactions
         SET subtotal = ?, total = ?, remaining_amount = ?, payment_status = ?, updated_at = ?,
             sync_status = 'pending', updated_at_local = ?
         WHERE id = ? AND user_id = ?`,
        [newSubtotal, newTotal, newRemaining, newPaymentStatus, now, now, transactionId, userId]
      )

      // --- 7. Replikasi trigger: create_return_notification ---
      await tx.run(
        `INSERT INTO notifications (id, user_id, type, title, message, data, is_read, created_at, sync_status, updated_at_local)
         VALUES (?, ?, 'return', 'Retur Produk', ?, ?, 0, ?, 'pending', ?)`,
        [
          uuid(),
          userId,
          `Retur ${returnNumber} untuk transaksi ${txn.transaction_number} berhasil diproses`,
          JSON.stringify({ return_id: returnId, return_number: returnNumber, transaction_id: transactionId, total_refund: totalRefund }),
          now,
          now,
        ]
      )
    }).then(async () => {
      // Queue retur (items ikut sebagai payload)
      const created = await this.getById(returnId)
      await addToSyncQueue('INSERT', 'returns', returnId, created || { id: returnId })
      // Header transaksi juga berubah
      const txn = await this.getById(transactionId)
      if (txn) await addToSyncQueue('UPDATE', 'transactions', transactionId, txn)
      return returnId
    })
  },

  /**
   * Replikasi fungsi RPC delete_return:
   * 1. Ambil total_refund + transaction_id
   * 2. Kurangi kembali stok produk (sudah ditambah saat retur)
   * 3. Replikasi trigger: record_stock_movement ('out') dengan reference 'return_cancelled'
   * 4. Pulihkan total tagihan transaksi
   * 5. Hapus retur (items ikut cascade)
   */
  async deleteReturn(id: string): Promise<{ transactionId: string }> {
    const userId = getCurrentUserId()
    const now = nowIso()

    return transaction(async (tx) => {
      const retRows = await tx.query<any>(
        `SELECT total_refund, transaction_id, return_number FROM returns WHERE id = ? AND user_id = ?`,
        [id, userId]
      )
      const ret = retRows[0]
      if (!ret) throw new Error('Retur tidak ditemukan')

      // Ambil txn untuk hitung ulang
      const txnRows = await tx.query<any>(
        `SELECT subtotal, total, paid_amount FROM transactions WHERE id = ? AND user_id = ?`,
        [ret.transaction_id, userId]
      )
      const txn = txnRows[0]
      if (!txn) throw new Error('Transaksi tidak ditemukan')

      // Kurangi kembali stok
      const items = await tx.query<any>(
        `SELECT product_id, quantity FROM return_items WHERE return_id = ? AND user_id = ?`,
        [id, userId]
      )

      for (const item of items) {
        if (!item.product_id) continue
        const prodRows = await tx.query<any>(
          `SELECT stock FROM products WHERE id = ? AND user_id = ?`,
          [item.product_id, userId]
        )
        const stockBefore = prodRows[0]?.stock ?? 0
        const stockAfter = Math.max(stockBefore - item.quantity, 0)

        await tx.run(
          `UPDATE products SET stock = ?, updated_at = ?, sync_status = 'pending', updated_at_local = ?
           WHERE id = ? AND user_id = ?`,
          [stockAfter, now, now, item.product_id, userId]
        )

        // Replikasi trigger: record_stock_movement ('out' pembatalan retur)
        await tx.run(
          `INSERT INTO stock_movements (id, user_id, product_id, movement_type, quantity,
                                        quantity_before, quantity_after, reference_type, reference_id,
                                        notes, created_at, created_by, sync_status, updated_at_local)
           VALUES (?, ?, ?, 'out', ?, ?, ?, 'return_cancelled', ?, ?, ?, ?, 'pending', ?)`,
          [
            uuid(),
            userId,
            item.product_id,
            item.quantity,
            stockBefore,
            stockAfter,
            id,
            'Pembatalan retur ' + ret.return_number,
            now,
            userId,
            now,
          ]
        )
      }

      // Pulihkan total tagihan transaksi
      const newTotal = txn.total + ret.total_refund
      const newSubtotal = txn.subtotal + ret.total_refund
      const newRemaining = Math.max(newTotal - txn.paid_amount, 0)
      const newPaymentStatus = txn.paid_amount >= newTotal ? 'lunas' : 'belum_lunas'

      await tx.run(
        `UPDATE transactions
         SET subtotal = ?, total = ?, remaining_amount = ?, payment_status = ?, updated_at = ?,
             sync_status = 'pending', updated_at_local = ?
         WHERE id = ? AND user_id = ?`,
        [newSubtotal, newTotal, newRemaining, newPaymentStatus, now, now, ret.transaction_id, userId]
      )

      // Hapus retur (return_items ikut cascade)
      await tx.run('DELETE FROM returns WHERE id = ? AND user_id = ?', [id, userId])

      return { transactionId: ret.transaction_id }
    }).then(async ({ transactionId }) => {
      await addToSyncQueue('DELETE', 'returns', id, { id })
      // Header transaksi juga berubah
      const txn = await this.getById(transactionId)
      if (txn) await addToSyncQueue('UPDATE', 'transactions', transactionId, txn)
      return { transactionId }
    })
  },

  async getById(id: string): Promise<TransactionReturn | null> {
    const userId = getCurrentUserId()
    const row = await queryOne<any>(
      `SELECT id, user_id, transaction_id, return_number, total_refund, notes, created_at, updated_at
       FROM returns WHERE id = ? AND user_id = ?`,
      [id, userId]
    )
    if (!row) return null
    const ret = this.mapRow(row)
    ret.items = await this.getItems(id)
    return ret
  },

  async getItems(returnId: string): Promise<ReturnItem[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT id, user_id, return_id, product_id, product_name, price, price_buy, quantity, subtotal, created_at
       FROM return_items WHERE return_id = ? AND user_id = ? ORDER BY created_at ASC`,
      [returnId, userId]
    )
    return rows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      return_id: r.return_id,
      product_id: r.product_id ?? undefined,
      product_name: r.product_name,
      price: r.price,
      quantity: r.quantity,
      subtotal: r.subtotal,
      created_at: r.created_at,
    }))
  },

  async getByTransaction(transactionId: string): Promise<TransactionReturn[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT id, user_id, transaction_id, return_number, total_refund, notes, created_at, updated_at
       FROM returns WHERE transaction_id = ? AND user_id = ? ORDER BY created_at DESC`,
      [transactionId, userId]
    )
    return Promise.all(rows.map(async (r) => {
      const ret = this.mapRow(r)
      ret.items = await this.getItems(r.id)
      return ret
    }))
  },

  /** Cari retur berdasarkan notes linked (mirip getLinkedReturns Supabase). */
  async getLinkedReturns(transactionId: string): Promise<TransactionReturn[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT id, user_id, transaction_id, return_number, total_refund, notes, created_at, updated_at
       FROM returns WHERE user_id = ? AND notes LIKE ? ORDER BY created_at DESC`,
      [userId, `%linked:${transactionId}%`]
    )
    return Promise.all(rows.map(async (r) => {
      const ret = this.mapRow(r)
      ret.items = await this.getItems(r.id)
      return ret
    }))
  },

  /** Mirip getReturnsForNewTransaction: cari retur gabungan dalam rentang 5 detik. */
  async getReturnsForNewTransaction(transactionId: string): Promise<TransactionReturn[]> {
    const userId = getCurrentUserId()
    // Ambil created_at + return_amount transaksi
    const txn = await queryOne<any>(
      `SELECT created_at, return_amount FROM transactions WHERE id = ? AND user_id = ?`,
      [transactionId, userId]
    )
    if (!txn || !txn.return_amount || txn.return_amount <= 0) return []

    const txnTime = new Date(txn.created_at).getTime()
    const startIso = new Date(txnTime - 5000).toISOString()
    const endIso = new Date(txnTime + 5000).toISOString()

    const rows = await query<any>(
      `SELECT id, user_id, transaction_id, return_number, total_refund, notes, created_at, updated_at
       FROM returns
       WHERE user_id = ? AND created_at >= ? AND created_at <= ? AND notes LIKE ?
       ORDER BY created_at DESC`,
      [userId, startIso, endIso, '%Retur gabungan dengan transaksi baru%']
    )
    return Promise.all(rows.map(async (r) => {
      const ret = this.mapRow(r)
      ret.items = await this.getItems(r.id)
      return ret
    }))
  },

  /** Ambil semua retur (untuk laporan / history). */
  async getAll(): Promise<TransactionReturn[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT id, user_id, transaction_id, return_number, total_refund, notes, created_at, updated_at
       FROM returns WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    )
    return Promise.all(rows.map(async (r) => {
      const ret = this.mapRow(r)
      ret.items = await this.getItems(r.id)
      ret.transaction = await this.getTransactionInfo(r.transaction_id)
      return ret
    }))
  },

  // ============================================================
  // Helper khusus sync
  // ============================================================

  /** Replace semua data dari hasil download Supabase (returns + return_items). */
  async replaceAll(records: Array<TransactionReturn & { items?: ReturnItem[] }>): Promise<void> {
    const userId = getCurrentUserId()
    await transaction(async (tx) => {
      await tx.run('DELETE FROM returns WHERE user_id = ?', [userId])

      for (const r of records) {
        await tx.run(
          `INSERT OR REPLACE INTO returns (id, user_id, transaction_id, return_number, total_refund,
                   notes, created_at, updated_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
          [r.id, userId, r.transaction_id, r.return_number, r.total_refund, r.notes ?? null, r.created_at, r.updated_at, r.updated_at]
        )
        for (const item of r.items || []) {
          await tx.run(
            `INSERT OR REPLACE INTO return_items (id, user_id, return_id, product_id, product_name,
                     price, price_buy, quantity, subtotal, created_at, sync_status, updated_at_local)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
            [item.id, userId, r.id, item.product_id ?? null, item.product_name, item.price, 0, item.quantity, item.subtotal, item.created_at, item.created_at]
          )
        }
      }
    })
  },

  // ============================================================
  // Internal helpers
  // ============================================================

  private async getTransactionInfo(transactionId: string): Promise<TransactionReturn['transaction']> {
    const row = await queryOne<any>(
      `SELECT id, transaction_number, customer_name, status FROM transactions WHERE id = ?`,
      [transactionId]
    )
    if (!row) return undefined
    return {
      id: row.id,
      transaction_number: row.transaction_number,
      customer_name: row.customer_name ?? undefined,
      status: row.status,
    }
  },

  private mapRow(r: any): TransactionReturn {
    return {
      id: r.id,
      user_id: r.user_id,
      transaction_id: r.transaction_id,
      return_number: r.return_number,
      total_refund: r.total_refund,
      notes: r.notes ?? undefined,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }
  },
}
