import { supabase } from '@/lib/supabase'
import type { Transaction, TransactionInput } from '@/types/database'

export const transactionsService = {
  async getAll(): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getById(id: string): Promise<Transaction | null> {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        items:transaction_items(*),
        payments:transaction_payments(*)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async addPayment(
    transactionId: string,
    amount: number,
    paymentMethod: string,
    notes?: string
  ): Promise<string> {
    const { data, error } = await supabase.rpc('add_transaction_payment', {
      p_transaction_id: transactionId,
      p_amount: amount,
      p_payment_method: paymentMethod,
      p_notes: notes || null,
    })

    if (error) throw error
    return data as string
  },

  async create(input: TransactionInput): Promise<string> {
    const { data, error } = await supabase.rpc('create_transaction', {
      p_customer_id: input.customer_id || null,
      p_customer_name: input.customer_name || null,
      p_payment_method: input.payment_method,
      p_paid_amount: input.paid_amount,
      p_discount: input.discount,
      p_notes: input.notes || null,
      p_items: input.items,
      p_return_amount: input.return_amount || 0,
    })

    if (error) throw error
    return data as string
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.rpc('delete_transaction', {
      p_transaction_id: id,
    })

    if (error) throw error
  },

  async voidTransaction(id: string): Promise<void> {
    const { error } = await supabase.rpc('void_transaction', {
      p_transaction_id: id,
    })

    if (error) throw error
  },

  async search(query: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .or(`transaction_number.ilike.%${query}%,customer_name.ilike.%${query}%`)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getByCustomer(customerId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        items:transaction_items(*)
      `)
      .eq('customer_id', customerId)
      .eq('status', 'selesai')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },
}
