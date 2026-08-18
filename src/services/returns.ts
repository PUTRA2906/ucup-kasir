import { supabase } from '@/lib/supabase'
import type { TransactionReturn, ReturnItemInput } from '@/types/database'

export const returnsService = {
  async createReturn(
    transactionId: string,
    items: ReturnItemInput[],
    notes?: string
  ): Promise<string> {
    const { data, error } = await supabase.rpc('create_return', {
      p_transaction_id: transactionId,
      p_items: items,
      p_notes: notes || null,
    })

    if (error) throw error
    return data as string
  },

  async getByTransaction(transactionId: string): Promise<TransactionReturn[]> {
    const { data, error } = await supabase
      .from('returns')
      .select(`*, items:return_items(*)`)
      .eq('transaction_id', transactionId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async deleteReturn(id: string): Promise<void> {
    const { error } = await supabase.rpc('delete_return', {
      p_return_id: id,
    })

    if (error) throw error
  },

  async getAll(): Promise<any[]> {
    const { data, error } = await supabase
      .from('returns')
      .select(`
        *,
        items:return_items(*),
        transaction:transactions(id, transaction_number, customer_name, status)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },
}
