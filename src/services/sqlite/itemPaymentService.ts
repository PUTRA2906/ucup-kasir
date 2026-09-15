import { query, queryOne, run, addToSyncQueue } from './db'
import { getCurrentUserId, uuid, nowIso } from './db'

// ============================================================
// SQLite Service: Item Payment Allocations
// Mirror dari src/services/itemPaymentService.ts untuk offline-first
// ============================================================

export interface ItemPaymentAllocation {
  id: string
  user_id: string
  transaction_id: string
  item_id: string
  payment_id: string
  allocated_amount: number
  notes?: string
  created_at: string
}

export interface ItemPaymentSummary {
  item_id: string
  transaction_id: string
  user_id: string
  product_id?: string
  product_name: string
  item_total: number
  paid_amount: number
  remaining_amount: number
  payment_status: 'lunas' | 'sebagian' | 'belum_bayar'
}

export const sqliteItemPaymentService = {
  /**
   * Ambil semua alokasi pembayaran untuk suatu transaksi
   */
  async getAllocationsByTransaction(transactionId: string): Promise<ItemPaymentAllocation[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT * FROM transaction_item_payments 
       WHERE transaction_id = ? AND user_id = ?
       ORDER BY created_at ASC`,
      [transactionId, userId]
    )
    return rows.map(this.mapRow)
  },

  /**
   * Ambil semua alokasi pembayaran untuk suatu item
   */
  async getAllocationsByItem(itemId: string): Promise<ItemPaymentAllocation[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT * FROM transaction_item_payments 
       WHERE item_id = ? AND user_id = ?
       ORDER BY created_at ASC`,
      [itemId, userId]
    )
    return rows.map(this.mapRow)
  },

  /**
   * Ambil semua alokasi untuk suatu payment
   */
  async getAllocationsByPayment(paymentId: string): Promise<ItemPaymentAllocation[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT * FROM transaction_item_payments 
       WHERE payment_id = ? AND user_id = ?
       ORDER BY created_at ASC`,
      [paymentId, userId]
    )
    return rows.map(this.mapRow)
  },

  /**
   * Ambil summary pembayaran per item untuk suatu transaksi
   */
  async getItemPaymentSummary(transactionId: string): Promise<ItemPaymentSummary[]> {
    const userId = getCurrentUserId()
    
    const rows = await query<any>(
      `SELECT 
        ti.id as item_id,
        ti.transaction_id,
        ti.user_id,
        ti.product_id,
        ti.product_name,
        ti.subtotal as item_total,
        COALESCE(SUM(tip.allocated_amount), 0) as paid_amount,
        ti.subtotal - COALESCE(SUM(tip.allocated_amount), 0) as remaining_amount,
        CASE 
          WHEN COALESCE(SUM(tip.allocated_amount), 0) >= ti.subtotal THEN 'lunas'
          WHEN COALESCE(SUM(tip.allocated_amount), 0) > 0 THEN 'sebagian'
          ELSE 'belum_bayar'
        END as payment_status
      FROM transaction_items ti
      LEFT JOIN transaction_item_payments tip ON tip.item_id = ti.id
      WHERE ti.transaction_id = ? AND ti.user_id = ?
      GROUP BY ti.id, ti.transaction_id, ti.user_id, ti.product_id, ti.product_name, ti.subtotal`,
      [transactionId, userId]
    )
    
    return rows.map((r) => ({
      item_id: r.item_id,
      transaction_id: r.transaction_id,
      user_id: r.user_id,
      product_id: r.product_id ?? undefined,
      product_name: r.product_name,
      item_total: r.item_total,
      paid_amount: r.paid_amount,
      remaining_amount: r.remaining_amount,
      payment_status: r.payment_status as 'lunas' | 'sebagian' | 'belum_bayar',
    }))
  },

  /**
   * Reallocate payment: ubah alokasi pembayaran secara manual
   */
  async reallocatePayment(
    paymentId: string,
    allocations: Array<{ item_id: string; amount: number }>
  ): Promise<void> {
    const userId = getCurrentUserId()
    
    // Get payment info
    const payment = await queryOne<any>(
      `SELECT id, amount, transaction_id FROM transaction_payments 
       WHERE id = ? AND user_id = ?`,
      [paymentId, userId]
    )
    
    if (!payment) {
      throw new Error('Payment tidak ditemukan')
    }
    
    // Validate total allocation
    const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0)
    if (totalAllocated > payment.amount) {
      throw new Error(`Total alokasi (${totalAllocated}) melebihi amount payment (${payment.amount})`)
    }
    
    // Delete existing allocations
    await run(
      `DELETE FROM transaction_item_payments WHERE payment_id = ? AND user_id = ?`,
      [paymentId, userId]
    )
    
    // Insert new allocations
    for (const alloc of allocations) {
      if (alloc.amount > 0) {
        await this.createAllocation(
          payment.transaction_id,
          alloc.item_id,
          paymentId,
          alloc.amount
        )
      }
    }
    
    // Queue to sync
    await addToSyncQueue('UPDATE', 'transaction_item_payments', paymentId, {})
  },

  /**
   * Deallocate payment: hapus semua alokasi untuk suatu payment
   */
  async deallocatePayment(paymentId: string): Promise<void> {
    const userId = getCurrentUserId()
    await run(
      `DELETE FROM transaction_item_payments WHERE payment_id = ? AND user_id = ?`,
      [paymentId, userId]
    )
    await addToSyncQueue('DELETE', 'transaction_item_payments', paymentId, {})
  },

  /**
   * Auto-allocate payment to items (FIFO strategy)
   * Alokasi pembayaran ke item secara berurutan (item pertama dulu)
   */
  async allocatePaymentToItems(
    transactionId: string,
    paymentId: string,
    paymentAmount: number
  ): Promise<void> {
    const userId = getCurrentUserId()
    
    // Get items dalam transaksi (FIFO: by created_at)
    const items = await query<any>(
      `SELECT 
        ti.id as item_id,
        ti.subtotal,
        COALESCE(SUM(tip.allocated_amount), 0) as already_paid
      FROM transaction_items ti
      LEFT JOIN transaction_item_payments tip ON tip.item_id = ti.id
      WHERE ti.transaction_id = ? AND ti.user_id = ?
      GROUP BY ti.id, ti.subtotal, ti.created_at
      ORDER BY ti.created_at ASC`,
      [transactionId, userId]
    )
    
    let remainingPayment = paymentAmount
    
    for (const item of items) {
      // Skip item yang sudah lunas
      const itemRemaining = item.subtotal - item.already_paid
      if (itemRemaining <= 0) continue
      
      // Hitung alokasi untuk item ini
      const allocated = Math.min(remainingPayment, itemRemaining)
      
      // Insert alokasi
      await this.createAllocation(transactionId, item.item_id, paymentId, allocated)
      
      // Kurangi sisa pembayaran
      remainingPayment -= allocated
      
      // Berhenti jika pembayaran habis
      if (remainingPayment <= 0) break
    }
    
    if (remainingPayment > 0.01) {
      console.warn(`Sisa pembayaran ${remainingPayment} tidak teralokasi untuk transaction ${transactionId}`)
    }
  },

  /**
   * Create allocation record
   */
  async createAllocation(
    transactionId: string,
    itemId: string,
    paymentId: string,
    allocatedAmount: number,
    notes?: string
  ): Promise<string> {
    const userId = getCurrentUserId()
    const id = uuid()
    const now = nowIso()
    
    await run(
      `INSERT INTO transaction_item_payments 
       (id, user_id, transaction_id, item_id, payment_id, allocated_amount, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, transactionId, itemId, paymentId, allocatedAmount, notes ?? null, now]
    )
    
    await addToSyncQueue('INSERT', 'transaction_item_payments', id, {})
    return id
  },

  /**
   * Delete allocation record
   */
  async deleteAllocation(allocationId: string): Promise<void> {
    const userId = getCurrentUserId()
    await run(
      `DELETE FROM transaction_item_payments WHERE id = ? AND user_id = ?`,
      [allocationId, userId]
    )
    await addToSyncQueue('DELETE', 'transaction_item_payments', allocationId, {})
  },

  /**
   * Get payment allocation status
   */
  async getPaymentAllocationStatus(paymentId: string): Promise<{
    payment_amount: number
    allocated_amount: number
    remaining_amount: number
    is_fully_allocated: boolean
  }> {
    const userId = getCurrentUserId()
    
    // Get payment amount
    const payment = await queryOne<any>(
      `SELECT amount FROM transaction_payments WHERE id = ? AND user_id = ?`,
      [paymentId, userId]
    )
    
    if (!payment) {
      throw new Error('Payment tidak ditemukan')
    }
    
    // Get total allocated
    const result = await queryOne<any>(
      `SELECT COALESCE(SUM(allocated_amount), 0) as allocated_amount
       FROM transaction_item_payments 
       WHERE payment_id = ? AND user_id = ?`,
      [paymentId, userId]
    )
    
    const allocatedAmount = result?.allocated_amount ?? 0
    const remainingAmount = payment.amount - allocatedAmount
    
    return {
      payment_amount: payment.amount,
      allocated_amount: allocatedAmount,
      remaining_amount: remainingAmount,
      is_fully_allocated: Math.abs(remainingAmount) < 0.01,
    }
  },

  /**
   * Get item payment status
   */
  async getItemPaymentStatus(itemId: string): Promise<{
    item_total: number
    paid_amount: number
    remaining_amount: number
    is_fully_paid: boolean
  }> {
    const userId = getCurrentUserId()
    
    const result = await queryOne<any>(
      `SELECT 
        ti.subtotal as item_total,
        COALESCE(SUM(tip.allocated_amount), 0) as paid_amount,
        ti.subtotal - COALESCE(SUM(tip.allocated_amount), 0) as remaining_amount,
        CASE 
          WHEN COALESCE(SUM(tip.allocated_amount), 0) >= ti.subtotal THEN 1
          ELSE 0
        END as is_fully_paid
      FROM transaction_items ti
      LEFT JOIN transaction_item_payments tip ON tip.item_id = ti.id
      WHERE ti.id = ? AND ti.user_id = ?
      GROUP BY ti.id, ti.subtotal`,
      [itemId, userId]
    )
    
    if (!result) {
      throw new Error('Item tidak ditemukan')
    }
    
    return {
      item_total: result.item_total,
      paid_amount: result.paid_amount,
      remaining_amount: result.remaining_amount,
      is_fully_paid: result.is_fully_paid === 1,
    }
  },

  mapRow(row: any): ItemPaymentAllocation {
    return {
      id: row.id,
      user_id: row.user_id,
      transaction_id: row.transaction_id,
      item_id: row.item_id,
      payment_id: row.payment_id,
      allocated_amount: row.allocated_amount,
      notes: row.notes ?? undefined,
      created_at: row.created_at,
    }
  },
}
