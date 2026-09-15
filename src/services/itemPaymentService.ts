import { supabase } from '@/lib/supabase'

// ============================================================
// INTERFACES & TYPES
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

export interface ItemPaymentDetail extends ItemPaymentSummary {
  allocations: ItemPaymentAllocation[]
}

export interface AllocationInput {
  item_id: string
  amount: number
}

// ============================================================
// SERVICE IMPLEMENTATION
// ============================================================

export const itemPaymentService = {
  /**
   * Ambil semua alokasi pembayaran untuk suatu transaksi
   */
  async getAllocationsByTransaction(transactionId: string): Promise<ItemPaymentAllocation[]> {
    const { data, error } = await supabase
      .from('transaction_item_payments')
      .select('*')
      .eq('transaction_id', transactionId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  },

  /**
   * Ambil semua alokasi pembayaran untuk suatu item
   */
  async getAllocationsByItem(itemId: string): Promise<ItemPaymentAllocation[]> {
    const { data, error } = await supabase
      .from('transaction_item_payments')
      .select('*')
      .eq('item_id', itemId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  },

  /**
   * Ambil semua alokasi untuk suatu payment
   */
  async getAllocationsByPayment(paymentId: string): Promise<ItemPaymentAllocation[]> {
    const { data, error } = await supabase
      .from('transaction_item_payments')
      .select('*')
      .eq('payment_id', paymentId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  },

  /**
   * Ambil summary pembayaran per item untuk suatu transaksi
   * Menggunakan view transaction_items_payment_summary
   */
  async getItemPaymentSummary(transactionId: string): Promise<ItemPaymentSummary[]> {
    const { data, error } = await supabase
      .from('transaction_items_payment_summary')
      .select('*')
      .eq('transaction_id', transactionId)

    if (error) throw error
    return data || []
  },

  /**
   * Ambil detail pembayaran untuk suatu item (summary + allocations)
   */
  async getItemPaymentDetail(itemId: string): Promise<ItemPaymentDetail | null> {
    // Get summary
    const { data: summaryData, error: summaryError } = await supabase
      .from('transaction_items_payment_summary')
      .select('*')
      .eq('item_id', itemId)
      .single()

    if (summaryError) throw summaryError
    if (!summaryData) return null

    // Get allocations
    const allocations = await this.getAllocationsByItem(itemId)

    return {
      ...summaryData,
      allocations,
    }
  },

  /**
   * Reallocate payment: ubah alokasi pembayaran secara manual
   * Berguna untuk UI admin yang ingin mengatur alokasi custom
   * 
   * @param paymentId - ID payment yang akan di-reallocate
   * @param allocations - Array of {item_id, amount}
   */
  async reallocatePayment(
    paymentId: string,
    allocations: AllocationInput[]
  ): Promise<void> {
    // Convert to JSONB format for PostgreSQL
    const allocationsJson = allocations.map((a) => ({
      item_id: a.item_id,
      amount: a.amount,
    }))

    const { error } = await supabase.rpc('reallocate_payment', {
      p_payment_id: paymentId,
      p_allocations: allocationsJson,
    })

    if (error) throw error
  },

  /**
   * Deallocate payment: hapus semua alokasi untuk suatu payment
   * Berguna saat akan delete payment atau reallocate
   */
  async deallocatePayment(paymentId: string): Promise<void> {
    const { error } = await supabase.rpc('deallocate_payment', {
      p_payment_id: paymentId,
    })

    if (error) throw error
  },

  /**
   * Delete payment beserta alokasinya
   * Menggunakan fungsi delete_transaction_payment yang sudah handle semua logic
   */
  async deletePayment(paymentId: string): Promise<void> {
    const { error } = await supabase.rpc('delete_transaction_payment', {
      p_payment_id: paymentId,
    })

    if (error) throw error
  },

  /**
   * Manual allocation: alokasikan pembayaran ke item tertentu
   * Berguna untuk kasus khusus dimana user ingin allocate manual
   * 
   * NOTE: Biasanya tidak diperlukan karena create_transaction dan
   * add_transaction_payment sudah auto-allocate dengan strategi FIFO
   */
  async allocatePaymentToItems(
    transactionId: string,
    paymentId: string,
    paymentAmount: number
  ): Promise<void> {
    const { error } = await supabase.rpc('allocate_payment_to_items', {
      p_transaction_id: transactionId,
      p_payment_id: paymentId,
      p_payment_amount: paymentAmount,
    })

    if (error) throw error
  },

  /**
   * Create manual allocation record
   * Low-level function, biasanya tidak digunakan langsung
   * Gunakan reallocatePayment atau allocatePaymentToItems instead
   */
  async createAllocation(
    transactionId: string,
    itemId: string,
    paymentId: string,
    allocatedAmount: number,
    notes?: string
  ): Promise<string> {
    const { data, error } = await supabase
      .from('transaction_item_payments')
      .insert({
        transaction_id: transactionId,
        item_id: itemId,
        payment_id: paymentId,
        allocated_amount: allocatedAmount,
        notes: notes || null,
      })
      .select('id')
      .single()

    if (error) throw error
    return data.id
  },

  /**
   * Delete allocation record
   * Low-level function, gunakan deallocatePayment atau deletePayment instead
   */
  async deleteAllocation(allocationId: string): Promise<void> {
    const { error } = await supabase
      .from('transaction_item_payments')
      .delete()
      .eq('id', allocationId)

    if (error) throw error
  },

  /**
   * Get payment validation status
   * Check apakah payment sudah fully allocated atau belum
   */
  async getPaymentAllocationStatus(paymentId: string): Promise<{
    payment_amount: number
    allocated_amount: number
    remaining_amount: number
    is_fully_allocated: boolean
  }> {
    // Get payment amount
    const { data: payment, error: paymentError } = await supabase
      .from('transaction_payments')
      .select('amount')
      .eq('id', paymentId)
      .single()

    if (paymentError) throw paymentError

    // Get total allocated
    const { data: allocations, error: allocError } = await supabase
      .from('transaction_item_payments')
      .select('allocated_amount')
      .eq('payment_id', paymentId)

    if (allocError) throw allocError

    const allocatedAmount = allocations.reduce((sum, a) => sum + Number(a.allocated_amount), 0)
    const remainingAmount = Number(payment.amount) - allocatedAmount

    return {
      payment_amount: Number(payment.amount),
      allocated_amount: allocatedAmount,
      remaining_amount: remainingAmount,
      is_fully_allocated: Math.abs(remainingAmount) < 0.01, // tolerance untuk floating point
    }
  },

  /**
   * Get item payment validation status
   * Check apakah item sudah fully paid atau belum
   */
  async getItemPaymentStatus(itemId: string): Promise<{
    item_total: number
    paid_amount: number
    remaining_amount: number
    is_fully_paid: boolean
  }> {
    const summary = await this.getItemPaymentDetail(itemId)

    if (!summary) {
      throw new Error('Item tidak ditemukan')
    }

    return {
      item_total: Number(summary.item_total),
      paid_amount: Number(summary.paid_amount),
      remaining_amount: Number(summary.remaining_amount),
      is_fully_paid: summary.payment_status === 'lunas',
    }
  },
}
