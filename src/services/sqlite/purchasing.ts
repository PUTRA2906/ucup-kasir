import { query, queryOne, run, addToSyncQueue, transaction } from './db'
import type { TransactionExecutor } from '@/lib/sqlite'
import { getCurrentUserId, uuid, nowIso } from './db'
import type {
  Supplier,
  SupplierInsert,
  SupplierUpdate,
  SupplierWithStats,
  PurchaseOrder,
  PurchaseOrderInput,
  PurchaseOrderItem,
  GoodsReceipt,
  GoodsReceiptInput,
  GoodsReceiptItem,
  PurchaseInvoice,
  PurchaseInvoiceInput,
  PurchaseInvoiceItem,
  PurchaseInvoicePayment,
  PurchaseReturn,
  PurchaseReturnInput,
  PurchaseReturnItem,
} from '@/types/database'

// ============================================================
// SQLite Service: Modul Pembelian Barang
// Mirror dari src/services/purchasing.ts + replikasi fungsi RPC
// Supabase (create_purchase_order, create_goods_receipt,
// create_purchase_invoice, add_pi_payment, create_purchase_return).
//
// Setiap operasi yang menulis:
//   - filter user_id manual (pengganti RLS)
//   - tulis ke sync_queue untuk sinkronisasi offline → Supabase
//   - update stok + catat stock_movement
//   - generate auto-jurnal (Persediaan/Utang)
// ============================================================

/** Generate nomor dokumen: PO/GRN/PI/PR-YYYYMMDD-XXXXXX */
function generateDocNumber(prefix: 'PO' | 'GRN' | 'PI' | 'PR'): string {
  const now = new Date()
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}`
  const suffix = Math.random().toString(36).substring(2, 8).toUpperCase().padEnd(6, 'X')
  return `${prefix}-${date}-${suffix}`
}

export const sqlitePurchasingService = {
  // ============================================================
  // SUPPLIERS
  // ============================================================

  async fetchSuppliers(): Promise<Supplier[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT * FROM suppliers WHERE user_id = ? ORDER BY name ASC`,
      [userId]
    )
    return rows.map((r) => this.mapSupplier(r))
  },

  async getSupplier(id: string): Promise<Supplier | null> {
    const userId = getCurrentUserId()
    const row = await queryOne<any>(
      `SELECT * FROM suppliers WHERE id = ? AND user_id = ?`,
      [id, userId]
    )
    return row ? this.mapSupplier(row) : null
  },

  async createSupplier(input: SupplierInsert): Promise<Supplier> {
    const userId = getCurrentUserId()
    const id = uuid()
    const now = nowIso()

    await run(
      `INSERT INTO suppliers (id, user_id, name, contact_person, phone, email, address,
                              supplier_type, payment_term, credit_limit, notes, is_active,
                              created_at, updated_at, sync_status, updated_at_local)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        id, userId, input.name, input.contact_person ?? null, input.phone ?? null,
        input.email ?? null, input.address ?? null, input.supplier_type ?? 'langsung',
        input.payment_term ?? 'tunai', input.credit_limit ?? 0, input.notes ?? null,
        input.is_active === false ? 0 : 1, now, now, now,
      ]
    )

    const created: Supplier = {
      id, user_id: userId, name: input.name,
      contact_person: input.contact_person, phone: input.phone, email: input.email,
      address: input.address, supplier_type: input.supplier_type ?? 'langsung',
      payment_term: input.payment_term ?? 'tunai', credit_limit: input.credit_limit ?? 0,
      notes: input.notes, is_active: input.is_active !== false,
      created_at: now, updated_at: now,
    }
    await addToSyncQueue('INSERT', 'suppliers', id, created)
    return created
  },

  async updateSupplier(id: string, updates: SupplierUpdate): Promise<Supplier> {
    const userId = getCurrentUserId()
    const now = nowIso()
    const existing = await this.getSupplier(id)
    if (!existing) throw new Error('Supplier tidak ditemukan')

    const next: Supplier = { ...existing, ...updates, updated_at: now }

    await run(
      `UPDATE suppliers
       SET name = ?, contact_person = ?, phone = ?, email = ?, address = ?,
           supplier_type = ?, payment_term = ?, credit_limit = ?, notes = ?, is_active = ?,
           updated_at = ?, sync_status = 'pending', updated_at_local = ?
       WHERE id = ? AND user_id = ?`,
      [
        next.name, next.contact_person ?? null, next.phone ?? null, next.email ?? null,
        next.address ?? null, next.supplier_type, next.payment_term, next.credit_limit,
        next.notes ?? null, next.is_active ? 1 : 0, now, now, id, userId,
      ]
    )
    await addToSyncQueue('UPDATE', 'suppliers', id, next)
    return next
  },

  async deleteSupplier(id: string): Promise<void> {
    const userId = getCurrentUserId()
    await run(`DELETE FROM suppliers WHERE id = ? AND user_id = ?`, [id, userId])
    await addToSyncQueue('DELETE', 'suppliers', id, { id })
  },

  /** Supplier dengan total pembelian & saldo utang (dari PO & PI). */
  async fetchSuppliersWithStats(): Promise<SupplierWithStats[]> {
    const userId = getCurrentUserId()
    const suppliers = await this.fetchSuppliers()

    const poRows = await query<any>(
      `SELECT supplier_id, total FROM purchase_orders WHERE user_id = ?`,
      [userId]
    )
    const piRows = await query<any>(
      `SELECT supplier_id, remaining_amount, payment_status FROM purchase_invoices WHERE user_id = ?`,
      [userId]
    )

    const totalBySupplier = new Map<string, number>()
    for (const r of poRows) {
      const sId = r.supplier_id
      if (!sId) continue
      totalBySupplier.set(sId, (totalBySupplier.get(sId) || 0) + Number(r.total || 0))
    }

    const outstandingBySupplier = new Map<string, number>()
    for (const r of piRows) {
      const sId = r.supplier_id
      if (!sId) continue
      if (r.payment_status !== 'lunas') {
        outstandingBySupplier.set(sId, (outstandingBySupplier.get(sId) || 0) + Number(r.remaining_amount || 0))
      }
    }

    return suppliers.map((s) => ({
      ...s,
      total_purchases: totalBySupplier.get(s.id) || 0,
      outstanding_balance: outstandingBySupplier.get(s.id) || 0,
    }))
  },

  // ============================================================
  // PURCHASE ORDERS
  // ============================================================

  async fetchPurchaseOrders(): Promise<PurchaseOrder[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT * FROM purchase_orders WHERE user_id = ? ORDER BY po_date DESC`,
      [userId]
    )
    return Promise.all(rows.map(async (r) => {
      const po = this.mapPurchaseOrder(r)
      po.items = await this.fetchPOItems(r.id)
      return po
    }))
  },

  async getPurchaseOrder(id: string): Promise<PurchaseOrder | null> {
    const userId = getCurrentUserId()
    const row = await queryOne<any>(
      `SELECT * FROM purchase_orders WHERE id = ? AND user_id = ?`,
      [id, userId]
    )
    if (!row) return null
    const po = this.mapPurchaseOrder(row)
    po.items = await this.fetchPOItems(id)
    return po
  },

  async fetchPOItems(poId: string): Promise<PurchaseOrderItem[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT * FROM po_items WHERE po_id = ? AND user_id = ? ORDER BY created_at ASC`,
      [poId, userId]
    )
    return rows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      po_id: r.po_id,
      product_id: r.product_id ?? undefined,
      product_name: r.product_name,
      quantity: r.quantity,
      price: r.price,
      discount: r.discount,
      subtotal: r.subtotal,
      received_quantity: r.received_quantity,
      created_at: r.created_at,
    }))
  },

  /**
   * Buat Purchase Order (draft):
   * 1. Simpan header + items
   * 2. Hitung subtotal/total
   * 3. Queue ke sync_queue
   */
  async createPurchaseOrder(input: PurchaseOrderInput): Promise<PurchaseOrder> {
    const userId = getCurrentUserId()
    const id = uuid()
    const now = nowIso()
    const poNumber = generateDocNumber('PO')

    let subtotal = 0
    for (const item of input.items) {
      subtotal += (item.quantity * item.price) - (item.discount ?? 0)
    }
    const total = subtotal - (input.discount ?? 0) + (input.tax ?? 0) + (input.shipping_cost ?? 0)

    await transaction(async (tx) => {
      await tx.run(
        `INSERT INTO purchase_orders (id, user_id, po_number, supplier_id, supplier_name,
                                      po_date, expected_date, status, subtotal, discount, tax,
                                      shipping_cost, total, notes, created_at, updated_at,
                                      sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [
          id, userId, poNumber, input.supplier_id ?? null, input.supplier_name ?? null,
          input.po_date, input.expected_date ?? null, subtotal, input.discount ?? 0,
          input.tax ?? 0, input.shipping_cost ?? 0, total, input.notes ?? null,
          now, now, now,
        ]
      )

      for (const item of input.items) {
        const itemId = uuid()
        const itemSubtotal = (item.quantity * item.price) - (item.discount ?? 0)
        await tx.run(
          `INSERT INTO po_items (id, user_id, po_id, product_id, product_name, quantity, price,
                                 discount, subtotal, received_quantity, created_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'pending', ?)`,
          [
            itemId, userId, id, item.product_id ?? null, item.product_name, item.quantity,
            item.price, item.discount ?? 0, itemSubtotal, now, now,
          ]
        )
      }
    })

    const created = await this.getPurchaseOrder(id)
    if (created) await addToSyncQueue('INSERT', 'purchase_orders', id, created)
    return created!
  },

  /** Ubah status PO (submit/confirm/cancel). */
  async updatePurchaseOrderStatus(id: string, status: PurchaseOrder['status']): Promise<void> {
    const userId = getCurrentUserId()
    const now = nowIso()
    await run(
      `UPDATE purchase_orders SET status = ?, updated_at = ?, sync_status = 'pending', updated_at_local = ?
       WHERE id = ? AND user_id = ?`,
      [status, now, now, id, userId]
    )
    const updated = await this.getPurchaseOrder(id)
    if (updated) await addToSyncQueue('UPDATE', 'purchase_orders', id, updated)
  },

  async deletePurchaseOrder(id: string): Promise<void> {
    const userId = getCurrentUserId()
    await run(`DELETE FROM purchase_orders WHERE id = ? AND user_id = ?`, [id, userId])
    await addToSyncQueue('DELETE', 'purchase_orders', id, { id })
  },

  // ============================================================
  // GOODS RECEIPTS (GRN) — auto-stok + auto-jurnal
  // ============================================================

  async fetchGoodsReceipts(): Promise<GoodsReceipt[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT * FROM goods_receipts WHERE user_id = ? ORDER BY receipt_date DESC`,
      [userId]
    )
    return Promise.all(rows.map(async (r) => {
      const grn = this.mapGoodsReceipt(r)
      grn.items = await this.fetchGRNItems(r.id)
      return grn
    }))
  },

  async getGoodsReceipt(id: string): Promise<GoodsReceipt | null> {
    const userId = getCurrentUserId()
    const row = await queryOne<any>(
      `SELECT * FROM goods_receipts WHERE id = ? AND user_id = ?`,
      [id, userId]
    )
    if (!row) return null
    const grn = this.mapGoodsReceipt(row)
    grn.items = await this.fetchGRNItems(id)
    return grn
  },

  async fetchGRNItems(grnId: string): Promise<GoodsReceiptItem[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT * FROM grn_items WHERE grn_id = ? AND user_id = ? ORDER BY created_at ASC`,
      [grnId, userId]
    )
    return rows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      grn_id: r.grn_id,
      po_item_id: r.po_item_id ?? undefined,
      product_id: r.product_id ?? undefined,
      product_name: r.product_name,
      quantity_received: r.quantity_received,
      quantity_rejected: r.quantity_rejected,
      price: r.price,
      subtotal: r.subtotal,
      created_at: r.created_at,
    }))
  },

  /**
   * Buat Goods Receipt (replikasi create_goods_receipt):
   * 1. Simpan header + items GRN
   * 2. Update stok produk (+ qty diterima)
   * 3. Catat stock_movement 'in' per item
   * 4. Update PO received_quantity + status (partial/completed)
   * 5. Auto-jurnal: Persediaan (Debit) → Utang Usaha (Kredit)
   * 6. Queue semuanya ke sync_queue
   */
  async createGoodsReceipt(input: GoodsReceiptInput): Promise<GoodsReceipt> {
    const userId = getCurrentUserId()
    const id = uuid()
    const now = nowIso()
    const grnNumber = generateDocNumber('GRN')
    let autoJournalId: string | null = null

    let total = 0
    for (const item of input.items) {
      total += (item.quantity_received + (item.quantity_rejected ?? 0)) * item.price
    }

    await transaction(async (tx) => {
      // Header
      await tx.run(
        `INSERT INTO goods_receipts (id, user_id, grn_number, po_id, supplier_id, supplier_name,
                                     receipt_date, status, total, notes, created_at, updated_at,
                                     sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?, 'pending', ?)`,
        [
          id, userId, grnNumber, input.po_id ?? null, input.supplier_id ?? null,
          input.supplier_name ?? null, input.receipt_date, total, input.notes ?? null,
          now, now, now,
        ]
      )

      for (const item of input.items) {
        const itemId = uuid()
        const qtyReceived = item.quantity_received
        const qtyRejected = item.quantity_rejected ?? 0
        const subtotal = (qtyReceived + qtyRejected) * item.price

        // Simpan item GRN
        await tx.run(
          `INSERT INTO grn_items (id, user_id, grn_id, po_item_id, product_id, product_name,
                                  quantity_received, quantity_rejected, price, subtotal,
                                  created_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
          [
            itemId, userId, id, item.po_item_id ?? null, item.product_id ?? null,
            item.product_name, qtyReceived, qtyRejected, item.price, subtotal, now, now,
          ]
        )

        // Ambil stok sebelum
        const prods = await tx.query<{ stock: number }>(
          `SELECT stock FROM products WHERE id = ? AND user_id = ?`,
          [item.product_id, userId]
        )
        const stockBefore = prods[0]?.stock ?? 0

        if (qtyReceived > 0) {
          // Update stok
          await tx.run(
            `UPDATE products SET stock = ?, updated_at = ?, sync_status = 'pending', updated_at_local = ?
             WHERE id = ? AND user_id = ?`,
            [stockBefore + qtyReceived, now, now, item.product_id, userId]
          )

          // Catat stock_movement 'in'
          await tx.run(
            `INSERT INTO stock_movements (id, user_id, product_id, movement_type, quantity,
                                          quantity_before, quantity_after, reference_type, reference_id,
                                          notes, created_at, created_by, sync_status, updated_at_local)
             VALUES (?, ?, ?, 'in', ?, ?, ?, 'purchase', ?, ?, ?, ?, 'pending', ?)`,
            [
              uuid(), userId, item.product_id, qtyReceived,
              stockBefore, stockBefore + qtyReceived, id,
              `Penerimaan ${grnNumber}`,
              now, userId, now,
            ]
          )
        }

        // Update PO item received_quantity
        if (item.po_item_id) {
          await tx.run(
            `UPDATE po_items
             SET received_quantity = received_quantity + ?
             WHERE id = ? AND user_id = ?`,
            [qtyReceived + qtyRejected, item.po_item_id, userId]
          )
        }
      }

      // Update status PO: partial / completed
      if (input.po_id) {
        const poTotalsRows = await tx.query<any>(
          `SELECT COALESCE(SUM(quantity), 0) AS total, COALESCE(SUM(received_quantity), 0) AS received
           FROM po_items WHERE po_id = ? AND user_id = ?`,
          [input.po_id, userId]
        )
        const poTotals = poTotalsRows[0]
        if (poTotals && poTotals.received >= poTotals.total) {
          await tx.run(
            `UPDATE purchase_orders SET status = 'completed', updated_at = ?, sync_status = 'pending', updated_at_local = ?
             WHERE id = ? AND user_id = ?`,
            [now, now, input.po_id, userId]
          )
        } else {
          await tx.run(
            `UPDATE purchase_orders SET status = 'partial', updated_at = ?, sync_status = 'pending', updated_at_local = ?
             WHERE id = ? AND user_id = ?`,
            [now, now, input.po_id, userId]
          )
        }
      }

      // Auto-jurnal: Persediaan (Debit) → Utang Usaha (Kredit)
      autoJournalId = await this.postPurchaseJournal(tx, userId, id, 'purchase', `Penerimaan barang ${input.supplier_name ?? ''}`, total, now)
    })

    // Queue setelah transaksi commit
    const created = await this.getGoodsReceipt(id)
    if (created) await addToSyncQueue('INSERT', 'goods_receipts', id, created as any)

    const grnItems = await this.fetchGRNItems(id)
    for (const it of grnItems) {
      await addToSyncQueue('INSERT', 'grn_items', it.id, it)
    }

    if (input.po_id) {
      const po = await this.getPurchaseOrder(input.po_id)
      if (po) await addToSyncQueue('UPDATE', 'purchase_orders', po.id, po)
    }

    if (autoJournalId) {
      const journal = await this.getJournal(autoJournalId)
      if (journal) await addToSyncQueue('INSERT', 'journal_entries', autoJournalId, journal)
    }

    return created!
  },

  // ============================================================
  // PURCHASE INVOICES
  // ============================================================

  async fetchPurchaseInvoices(): Promise<PurchaseInvoice[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT * FROM purchase_invoices WHERE user_id = ? ORDER BY invoice_date DESC`,
      [userId]
    )
    return Promise.all(rows.map(async (r) => {
      const pi = this.mapPurchaseInvoice(r)
      pi.items = await this.fetchPIItems(r.id)
      pi.payments = await this.fetchPIPayments(r.id)
      return pi
    }))
  },

  async getPurchaseInvoice(id: string): Promise<PurchaseInvoice | null> {
    const userId = getCurrentUserId()
    const row = await queryOne<any>(
      `SELECT * FROM purchase_invoices WHERE id = ? AND user_id = ?`,
      [id, userId]
    )
    if (!row) return null
    const pi = this.mapPurchaseInvoice(row)
    pi.items = await this.fetchPIItems(id)
    pi.payments = await this.fetchPIPayments(id)
    return pi
  },

  async fetchPIItems(piId: string): Promise<PurchaseInvoiceItem[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT * FROM pi_items WHERE pi_id = ? AND user_id = ? ORDER BY created_at ASC`,
      [piId, userId]
    )
    return rows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      pi_id: r.pi_id,
      grn_item_id: r.grn_item_id ?? undefined,
      product_id: r.product_id ?? undefined,
      product_name: r.product_name,
      quantity: r.quantity,
      price: r.price,
      subtotal: r.subtotal,
      created_at: r.created_at,
    }))
  },

  async fetchPIPayments(piId: string): Promise<PurchaseInvoicePayment[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT * FROM pi_payments WHERE pi_id = ? AND user_id = ? ORDER BY created_at DESC`,
      [piId, userId]
    )
    return rows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      pi_id: r.pi_id,
      amount: r.amount,
      payment_method: r.payment_method,
      notes: r.notes ?? undefined,
      created_at: r.created_at,
    }))
  },

  /**
   * Buat Purchase Invoice (replikasi create_purchase_invoice):
   * 1. Simpan header + items PI (bisa dari GRN)
   * 2. Hitung subtotal/total
   * 3. Queue ke sync_queue
   */
  async createPurchaseInvoice(input: PurchaseInvoiceInput): Promise<PurchaseInvoice> {
    const userId = getCurrentUserId()
    const id = uuid()
    const now = nowIso()
    const piNumber = generateDocNumber('PI')

    let subtotal = 0
    for (const item of input.items) {
      subtotal += (item.quantity_received ?? 0) * item.price
    }
    const total = subtotal - (input.discount ?? 0) + (input.tax ?? 0) + (input.shipping_cost ?? 0)

    await transaction(async (tx) => {
      await tx.run(
        `INSERT INTO purchase_invoices (id, user_id, pi_number, grn_id, po_id, supplier_id, supplier_name,
                                        invoice_date, due_date, subtotal, discount, tax, shipping_cost, total,
                                        paid_amount, remaining_amount, payment_status, notes,
                                        created_at, updated_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'belum_lunas', ?, ?, ?, 'pending', ?)`,
        [
          id, userId, piNumber, input.grn_id ?? null,
          (input as any).po_id ?? null, input.supplier_id ?? null, input.supplier_name ?? null,
          input.invoice_date, input.due_date ?? null, subtotal, input.discount ?? 0,
          input.tax ?? 0, input.shipping_cost ?? 0, total, total, input.notes ?? null,
          now, now, now,
        ]
      )

      for (const item of input.items) {
        const itemId = uuid()
        const qty = item.quantity_received ?? 0
        const itemSubtotal = qty * item.price
        await tx.run(
          `INSERT INTO pi_items (id, user_id, pi_id, grn_item_id, product_id, product_name,
                                 quantity, price, subtotal, created_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
          [
            itemId, userId, id, item.po_item_id ?? null, item.product_id ?? null,
            item.product_name, qty, item.price, itemSubtotal, now, now,
          ]
        )
      }
    })

    const created = await this.getPurchaseInvoice(id)
    if (created) await addToSyncQueue('INSERT', 'purchase_invoices', id, created)

    // Queue item PI
    const items = await this.fetchPIItems(id)
    for (const it of items) {
      await addToSyncQueue('INSERT', 'pi_items', it.id, it)
    }
    return created!
  },

  /**
   * Tambah pembayaran ke Purchase Invoice (replikasi add_pi_payment):
   * 1. Validasi amount ≤ remaining
   * 2. Simpan pi_payments
   * 3. Update paid_amount / remaining / payment_status
   * 4. Auto-jurnal: Utang (Debit) → Kas (Kredit)
   */
  async addPIPayment(piId: string, amount: number, paymentMethod: string, notes?: string): Promise<PurchaseInvoicePayment> {
    const userId = getCurrentUserId()
    const now = nowIso()
    const paymentId = uuid()
    let autoJournalId: string | null = null

    const pi = await this.getPurchaseInvoice(piId)
    if (!pi) throw new Error('Invoice tidak ditemukan')
    if (amount <= 0) throw new Error('Jumlah pembayaran tidak valid')
    if (amount > pi.remaining_amount) {
      throw new Error(`Pembayaran melebihi sisa tagihan (sisa ${pi.remaining_amount.toLocaleString('id-ID')})`)
    }

    await transaction(async (tx) => {
      await tx.run(
        `INSERT INTO pi_payments (id, user_id, pi_id, amount, payment_method, notes, created_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [paymentId, userId, piId, amount, paymentMethod ?? 'tunai', notes ?? null, now, now]
      )

      const newPaid = pi.paid_amount + amount
      const newRemaining = pi.remaining_amount - amount
      const newStatus = newRemaining <= 0 ? 'lunas' : 'sebagian'

      await tx.run(
        `UPDATE purchase_invoices
         SET paid_amount = ?, remaining_amount = ?, payment_status = ?, updated_at = ?,
             sync_status = 'pending', updated_at_local = ?
         WHERE id = ? AND user_id = ?`,
        [newPaid, newRemaining, newStatus, now, now, piId, userId]
      )

      // Auto-jurnal: Utang (Debit) → Kas (Kredit)
      autoJournalId = await this.postPurchaseJournal(tx, userId, piId, 'purchase_payment', `Pembayaran ${pi.pi_number}`, amount, now)
    })

    const payment: PurchaseInvoicePayment = {
      id: paymentId, user_id: userId, pi_id: piId,
      amount, payment_method: paymentMethod ?? 'tunai',
      notes, created_at: now,
    }
    await addToSyncQueue('INSERT', 'pi_payments', paymentId, payment)

    const updatedPi = await this.getPurchaseInvoice(piId)
    if (updatedPi) await addToSyncQueue('UPDATE', 'purchase_invoices', piId, updatedPi)

    if (autoJournalId) {
      const journal = await this.getJournal(autoJournalId)
      if (journal) await addToSyncQueue('INSERT', 'journal_entries', autoJournalId, journal)
    }

    return payment
  },

  // ============================================================
  // PURCHASE RETURNS — auto-stok + auto-jurnal reversal
  // ============================================================

  async fetchPurchaseReturns(): Promise<PurchaseReturn[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT * FROM purchase_returns WHERE user_id = ? ORDER BY return_date DESC`,
      [userId]
    )
    return Promise.all(rows.map(async (r) => {
      const pr = this.mapPurchaseReturn(r)
      pr.items = await this.fetchPRItems(r.id)
      return pr
    }))
  },

  async getPurchaseReturn(id: string): Promise<PurchaseReturn | null> {
    const userId = getCurrentUserId()
    const row = await queryOne<any>(
      `SELECT * FROM purchase_returns WHERE id = ? AND user_id = ?`,
      [id, userId]
    )
    if (!row) return null
    const pr = this.mapPurchaseReturn(row)
    pr.items = await this.fetchPRItems(id)
    return pr
  },

  async fetchPRItems(prId: string): Promise<PurchaseReturnItem[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT * FROM purchase_return_items WHERE pr_id = ? AND user_id = ? ORDER BY created_at ASC`,
      [prId, userId]
    )
    return rows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      pr_id: r.pr_id,
      product_id: r.product_id ?? undefined,
      product_name: r.product_name,
      quantity: r.quantity,
      price: r.price,
      price_buy: r.price_buy,
      subtotal: r.subtotal,
      created_at: r.created_at,
    }))
  },

  /**
   * Buat Purchase Return (replikasi create_purchase_return):
   * 1. Simpan header + items
   * 2. Kurangi stok + catat stock_movement 'out'
   * 3. Auto-jurnal reversal: Utang (Debit) → Persediaan (Kredit)
   */
  async createPurchaseReturn(input: PurchaseReturnInput): Promise<PurchaseReturn> {
    const userId = getCurrentUserId()
    const id = uuid()
    const now = nowIso()
    const prNumber = generateDocNumber('PR')
    let autoJournalId: string | null = null

    let totalRefund = 0
    for (const item of input.items) {
      totalRefund += item.quantity_received * item.price
    }

    await transaction(async (tx) => {
      await tx.run(
        `INSERT INTO purchase_returns (id, user_id, pr_number, grn_id, pi_id, supplier_id, supplier_name,
                                       return_date, total_refund, reason, notes, status,
                                       created_at, updated_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, 'pending', ?)`,
        [
          id, userId, prNumber, input.grn_id ?? null, input.pi_id ?? null,
          input.supplier_id ?? null, input.supplier_name ?? null, input.return_date,
          totalRefund, input.reason ?? 'cacat', input.notes ?? null, now, now, now,
        ]
      )

      for (const item of input.items) {
        const itemId = uuid()
        const qty = item.quantity_received
        const subtotal = qty * item.price

        await tx.run(
          `INSERT INTO purchase_return_items (id, user_id, pr_id, product_id, product_name,
                                              quantity, price, price_buy, subtotal, created_at,
                                              sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
          [
            itemId, userId, id, item.product_id ?? null, item.product_name,
            qty, item.price, 0, subtotal, now, now,
          ]
        )

        // Ambil stok sebelum
        const prods = await tx.query<{ stock: number }>(
          `SELECT stock FROM products WHERE id = ? AND user_id = ?`,
          [item.product_id, userId]
        )
        const stockBefore = prods[0]?.stock ?? 0

        // Kurangi stok
        await tx.run(
          `UPDATE products SET stock = ?, updated_at = ?, sync_status = 'pending', updated_at_local = ?
           WHERE id = ? AND user_id = ?`,
          [Math.max(stockBefore - qty, 0), now, now, item.product_id, userId]
        )

        // Catat stock_movement 'out'
        await tx.run(
          `INSERT INTO stock_movements (id, user_id, product_id, movement_type, quantity,
                                        quantity_before, quantity_after, reference_type, reference_id,
                                        notes, created_at, created_by, sync_status, updated_at_local)
           VALUES (?, ?, ?, 'out', ?, ?, ?, 'purchase_return', ?, ?, ?, ?, 'pending', ?)`,
          [
            uuid(), userId, item.product_id, qty,
            stockBefore, Math.max(stockBefore - qty, 0), id,
            `Retur pembelian ${prNumber}`,
            now, userId, now,
          ]
        )
      }

      // Auto-jurnal reversal: Utang (Debit) → Persediaan (Kredit)
      autoJournalId = await this.postPurchaseJournal(tx, userId, id, 'purchase_return', `Retur pembelian ke ${input.supplier_name ?? ''}`, totalRefund, now)
    })

    const created = await this.getPurchaseReturn(id)
    if (created) await addToSyncQueue('INSERT', 'purchase_returns', id, created as any)

    const items = await this.fetchPRItems(id)
    for (const it of items) {
      await addToSyncQueue('INSERT', 'purchase_return_items', it.id, it)
    }

    if (autoJournalId) {
      const journal = await this.getJournal(autoJournalId)
      if (journal) await addToSyncQueue('INSERT', 'journal_entries', autoJournalId, journal)
    }

    return (created ?? await this.getPurchaseReturn(id))!
  },

  // ============================================================
  // AUTO-JURNAL helper
  // ============================================================

  /**
   * Buat jurnal pembelian.
   * - 'purchase'         : Persediaan (Debit) → Utang Usaha (Kredit)
   * - 'purchase_payment' : Utang Usaha (Debit) → Kas (Kredit)
   * - 'purchase_return'  : Utang Usaha (Debit) → Persediaan (Kredit)
   */
  async postPurchaseJournal(
    tx: TransactionExecutor,
    userId: string,
    referenceId: string,
    referenceType: 'purchase' | 'purchase_payment' | 'purchase_return',
    description: string,
    amount: number,
    now: string
  ): Promise<string | null> {
    if (amount <= 0) return null

    const journalId = uuid()
    const date = now.split('T')[0].replace(/-/g, '')
    const suffix = Math.random().toString(36).substring(2, 8).toUpperCase()
    const journalNumber = `JRN-${date}-${suffix}`

    const accounts = await tx.query<any>(
      `SELECT id, code, name FROM chart_of_accounts WHERE user_id = ? AND code IN ('1-1000', '1-1200', '2-2000')`,
      [userId]
    )
    const accMap: Record<string, any> = {}
    for (const a of accounts) accMap[a.code] = a
    const kas = accMap['1-1000']
    const persediaan = accMap['1-1200']
    const utang = accMap['2-2000']

    if (!persediaan || !utang) return null

    await tx.run(
      `INSERT INTO journal_entries (id, user_id, journal_number, entry_date, description, reference_type, reference_id, status, created_at, updated_at, sync_status, updated_at_local)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'posted', ?, ?, 'pending', ?)`,
      [journalId, userId, journalNumber, now, description, referenceType, referenceId, now, now, now]
    )

    if (referenceType === 'purchase') {
      // Debit Persediaan, Kredit Utang
      await tx.run(
        `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, '1-1200', 'Persediaan Barang', ?, 0, ?, 'pending', ?)`,
        [uuid(), userId, journalId, persediaan.id, amount, now, now]
      )
      await tx.run(
        `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, '2-2000', 'Utang Usaha', 0, ?, ?, 'pending', ?)`,
        [uuid(), userId, journalId, utang.id, amount, now, now]
      )
    } else if (referenceType === 'purchase_payment') {
      // Debit Utang, Kredit Kas
      await tx.run(
        `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, '2-2000', 'Utang Usaha', ?, 0, ?, 'pending', ?)`,
        [uuid(), userId, journalId, utang.id, amount, now, now]
      )
      await tx.run(
        `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, '1-1000', 'Kas', 0, ?, ?, 'pending', ?)`,
        [uuid(), userId, journalId, kas?.id ?? utang.id, amount, now, now]
      )
    } else {
      // purchase_return: Debit Utang, Kredit Persediaan
      await tx.run(
        `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, '2-2000', 'Utang Usaha', ?, 0, ?, 'pending', ?)`,
        [uuid(), userId, journalId, utang.id, amount, now, now]
      )
      await tx.run(
        `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, '1-1200', 'Persediaan Barang', 0, ?, ?, 'pending', ?)`,
        [uuid(), userId, journalId, persediaan.id, amount, now, now]
      )
    }

    return journalId
  },

  /** Ambil jurnal lengkap (untuk di-queue setelah auto-jurnal). */
  async getJournal(journalId: string): Promise<any | null> {
    const userId = getCurrentUserId()
    const row = await queryOne<any>(
      `SELECT * FROM journal_entries WHERE id = ? AND user_id = ?`,
      [journalId, userId]
    )
    if (!row) return null
    const lines = await query<any>(
      `SELECT * FROM journal_lines WHERE journal_id = ? AND user_id = ?`,
      [journalId, userId]
    )
    return { ...row, lines }
  },

  // ============================================================
  // Sync helpers (dipanggil saat download full dari Supabase)
  // ============================================================

  async replaceAllSuppliers(records: Supplier[]): Promise<void> {
    const userId = getCurrentUserId()
    await run('DELETE FROM suppliers WHERE user_id = ?', [userId])
    for (const s of records) {
      await run(
        `INSERT OR REPLACE INTO suppliers (id, user_id, name, contact_person, phone, email, address,
                                           supplier_type, payment_term, credit_limit, notes, is_active,
                                           created_at, updated_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
        [s.id, s.user_id || userId, s.name, s.contact_person ?? null, s.phone ?? null,
         s.email ?? null, s.address ?? null, s.supplier_type, s.payment_term, s.credit_limit,
         s.notes ?? null, s.is_active ? 1 : 0, s.created_at, s.updated_at, s.updated_at]
      )
    }
  },

  async replaceAllPurchaseOrders(records: Array<PurchaseOrder & { items?: PurchaseOrderItem[] }>): Promise<void> {
    const userId = getCurrentUserId()
    await run('DELETE FROM purchase_orders WHERE user_id = ?', [userId])
    for (const po of records) {
      await run(
        `INSERT OR REPLACE INTO purchase_orders (id, user_id, po_number, supplier_id, supplier_name,
                                                 po_date, expected_date, status, subtotal, discount, tax,
                                                 shipping_cost, total, notes, created_at, updated_at,
                                                 sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
        [po.id, po.user_id || userId, po.po_number, po.supplier_id ?? null, po.supplier_name ?? null,
         po.po_date, po.expected_date ?? null, po.status, po.subtotal, po.discount, po.tax,
         po.shipping_cost, po.total, po.notes ?? null, po.created_at, po.updated_at, po.updated_at]
      )
      for (const it of po.items || []) {
        await run(
          `INSERT OR REPLACE INTO po_items (id, user_id, po_id, product_id, product_name, quantity, price,
                                           discount, subtotal, received_quantity, created_at,
                                           sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
          [it.id, it.user_id || userId, po.id, it.product_id ?? null, it.product_name, it.quantity,
           it.price, it.discount, it.subtotal, it.received_quantity, it.created_at, it.created_at]
        )
      }
    }
  },

  async replaceAllGoodsReceipts(records: Array<GoodsReceipt & { items?: GoodsReceiptItem[] }>): Promise<void> {
    const userId = getCurrentUserId()
    await run('DELETE FROM goods_receipts WHERE user_id = ?', [userId])
    for (const grn of records) {
      await run(
        `INSERT OR REPLACE INTO goods_receipts (id, user_id, grn_number, po_id, supplier_id, supplier_name,
                                                receipt_date, status, total, notes, created_at, updated_at,
                                                sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
        [grn.id, grn.user_id || userId, grn.grn_number, grn.po_id ?? null, grn.supplier_id ?? null,
         grn.supplier_name ?? null, grn.receipt_date, grn.status, grn.total, grn.notes ?? null,
         grn.created_at, grn.updated_at, grn.updated_at]
      )
      for (const it of grn.items || []) {
        await run(
          `INSERT OR REPLACE INTO grn_items (id, user_id, grn_id, po_item_id, product_id, product_name,
                                             quantity_received, quantity_rejected, price, subtotal, created_at,
                                             sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
          [it.id, it.user_id || userId, grn.id, it.po_item_id ?? null, it.product_id ?? null,
           it.product_name, it.quantity_received, it.quantity_rejected, it.price, it.subtotal,
           it.created_at, it.created_at]
        )
      }
    }
  },

  async replaceAllPurchaseInvoices(records: Array<PurchaseInvoice & { items?: PurchaseInvoiceItem[]; payments?: PurchaseInvoicePayment[] }>): Promise<void> {
    const userId = getCurrentUserId()
    await run('DELETE FROM purchase_invoices WHERE user_id = ?', [userId])
    for (const pi of records) {
      await run(
        `INSERT OR REPLACE INTO purchase_invoices (id, user_id, pi_number, grn_id, po_id, supplier_id, supplier_name,
                                                   invoice_date, due_date, subtotal, discount, tax, shipping_cost,
                                                   total, paid_amount, remaining_amount, payment_status, notes,
                                                   created_at, updated_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
        [pi.id, pi.user_id || userId, pi.pi_number, pi.grn_id ?? null, pi.po_id ?? null,
         pi.supplier_id ?? null, pi.supplier_name ?? null, pi.invoice_date, pi.due_date ?? null,
         pi.subtotal, pi.discount, pi.tax, pi.shipping_cost, pi.total, pi.paid_amount,
         pi.remaining_amount, pi.payment_status, pi.notes ?? null, pi.created_at, pi.updated_at,
         pi.updated_at]
      )
      for (const it of pi.items || []) {
        await run(
          `INSERT OR REPLACE INTO pi_items (id, user_id, pi_id, grn_item_id, product_id, product_name,
                                            quantity, price, subtotal, created_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
          [it.id, it.user_id || userId, pi.id, it.grn_item_id ?? null, it.product_id ?? null,
           it.product_name, it.quantity, it.price, it.subtotal, it.created_at, it.created_at]
        )
      }
      for (const p of pi.payments || []) {
        await run(
          `INSERT OR REPLACE INTO pi_payments (id, user_id, pi_id, amount, payment_method, notes, created_at,
                                               sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
          [p.id, p.user_id || userId, pi.id, p.amount, p.payment_method, p.notes ?? null,
           p.created_at, p.created_at]
        )
      }
    }
  },

  async replaceAllPurchaseReturns(records: Array<PurchaseReturn & { items?: PurchaseReturnItem[] }>): Promise<void> {
    const userId = getCurrentUserId()
    await run('DELETE FROM purchase_returns WHERE user_id = ?', [userId])
    for (const pr of records) {
      await run(
        `INSERT OR REPLACE INTO purchase_returns (id, user_id, pr_number, grn_id, pi_id, supplier_id, supplier_name,
                                                  return_date, total_refund, reason, notes, status,
                                                  created_at, updated_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
        [pr.id, pr.user_id || userId, pr.pr_number, pr.grn_id ?? null, pr.pi_id ?? null,
         pr.supplier_id ?? null, pr.supplier_name ?? null, pr.return_date, pr.total_refund,
         pr.reason, pr.notes ?? null, pr.status, pr.created_at, pr.updated_at, pr.updated_at]
      )
      for (const it of pr.items || []) {
        await run(
          `INSERT OR REPLACE INTO purchase_return_items (id, user_id, pr_id, product_id, product_name,
                                                         quantity, price, price_buy, subtotal, created_at,
                                                         sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
          [it.id, it.user_id || userId, pr.id, it.product_id ?? null, it.product_name,
           it.quantity, it.price, it.price_buy, it.subtotal, it.created_at, it.created_at]
        )
      }
    }
  },

  // ============================================================
  // Internal helpers
  // ============================================================

  mapSupplier(r: any): Supplier {
    return {
      id: r.id,
      user_id: r.user_id,
      name: r.name,
      contact_person: r.contact_person ?? undefined,
      phone: r.phone ?? undefined,
      email: r.email ?? undefined,
      address: r.address ?? undefined,
      supplier_type: r.supplier_type,
      payment_term: r.payment_term,
      credit_limit: r.credit_limit,
      notes: r.notes ?? undefined,
      is_active: !!r.is_active,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }
  },

  mapPurchaseOrder(r: any): PurchaseOrder {
    return {
      id: r.id,
      user_id: r.user_id,
      po_number: r.po_number,
      supplier_id: r.supplier_id ?? undefined,
      supplier_name: r.supplier_name ?? undefined,
      po_date: r.po_date,
      expected_date: r.expected_date ?? undefined,
      status: r.status,
      subtotal: r.subtotal,
      discount: r.discount,
      tax: r.tax,
      shipping_cost: r.shipping_cost,
      total: r.total,
      notes: r.notes ?? undefined,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }
  },

  mapGoodsReceipt(r: any): GoodsReceipt {
    return {
      id: r.id,
      user_id: r.user_id,
      grn_number: r.grn_number,
      po_id: r.po_id ?? undefined,
      supplier_id: r.supplier_id ?? undefined,
      supplier_name: r.supplier_name ?? undefined,
      receipt_date: r.receipt_date,
      status: r.status,
      total: r.total,
      notes: r.notes ?? undefined,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }
  },

  mapPurchaseInvoice(r: any): PurchaseInvoice {
    return {
      id: r.id,
      user_id: r.user_id,
      pi_number: r.pi_number,
      grn_id: r.grn_id ?? undefined,
      po_id: r.po_id ?? undefined,
      supplier_id: r.supplier_id ?? undefined,
      supplier_name: r.supplier_name ?? undefined,
      invoice_date: r.invoice_date,
      due_date: r.due_date ?? undefined,
      subtotal: r.subtotal,
      discount: r.discount,
      tax: r.tax,
      shipping_cost: r.shipping_cost,
      total: r.total,
      paid_amount: r.paid_amount,
      remaining_amount: r.remaining_amount,
      payment_status: r.payment_status,
      notes: r.notes ?? undefined,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }
  },

  mapPurchaseReturn(r: any): PurchaseReturn {
    return {
      id: r.id,
      user_id: r.user_id,
      pr_number: r.pr_number,
      grn_id: r.grn_id ?? undefined,
      pi_id: r.pi_id ?? undefined,
      supplier_id: r.supplier_id ?? undefined,
      supplier_name: r.supplier_name ?? undefined,
      return_date: r.return_date,
      total_refund: r.total_refund,
      reason: r.reason,
      notes: r.notes ?? undefined,
      status: r.status,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }
  },
}
