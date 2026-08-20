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

  async getLinkedReturns(transactionId: string): Promise<TransactionReturn[]> {
    const { data, error } = await supabase
      .from('returns')
      .select(`*, items:return_items(*)`)
      .like('notes', `%linked:${transactionId}%`)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getReturnsForNewTransaction(transactionId: string): Promise<TransactionReturn[]> {
    // Untuk transaksi BARU yang dibuat dengan retur:
    // 1. Ambil transaksi untuk cek waktu pembuatan dan return_amount
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select('created_at, return_amount')
      .eq('id', transactionId)
      .single()

    if (txError || !transaction || !transaction.return_amount || transaction.return_amount <= 0) {
      return []
    }

    // 2. Cari semua retur yang dibuat dalam rentang waktu 5 detik dari transaksi ini
    //    dan memiliki notes "Retur gabungan dengan transaksi baru"
    const startTime = new Date(transaction.created_at)
    startTime.setSeconds(startTime.getSeconds() - 5)
    const endTime = new Date(transaction.created_at)
    endTime.setSeconds(endTime.getSeconds() + 5)

    const { data, error } = await supabase
      .from('returns')
      .select(`*, items:return_items(*)`)
      .gte('created_at', startTime.toISOString())
      .lte('created_at', endTime.toISOString())
      .like('notes', '%Retur gabungan dengan transaksi baru%')
      .order('created_at', { ascending: false })

    if (error) return []
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
