/**
 * Utility untuk memperbaiki alokasi pembayaran yang hilang.
 *
 * Masalah: Laba terealisasi tidak update saat ada pembayaran cicilan
 * Penyebab: Tabel transaction_item_payments tidak terisi
 * Solusi: Alokasikan semua pembayaran yang belum punya alokasi
 */

import { supabase } from '@/lib/supabase'

export interface PaymentAllocationResult {
  mode: 'supabase'
  totalPayments: number
  fixedPayments: number
  errors: string[]
  details: Array<{
    paymentId: string
    transactionId: string
    amount: number
    allocationsCreated: number
  }>
}

/**
 * Alokasikan pembayaran ke items (FIFO strategy)
 * Versi TypeScript dari fungsi SQL allocate_payment_to_items
 */
async function allocatePaymentToItemsSupabase(
  transactionId: string,
  paymentId: string,
  paymentAmount: number
): Promise<number> {
  // Ambil items yang belum lunas
  const { data: items, error: itemsError } = await supabase
    .from('transaction_items')
    .select('id, subtotal')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: true })

  if (itemsError) throw itemsError

  let remainingPayment = paymentAmount
  let allocationsCreated = 0

  for (const item of items || []) {
    // Cek berapa yang sudah dibayar untuk item ini
    const { data: existingAllocations } = await supabase
      .from('transaction_item_payments')
      .select('allocated_amount')
      .eq('item_id', item.id)

    const alreadyPaid = (existingAllocations || []).reduce(
      (sum, a) => sum + Number(a.allocated_amount),
      0
    )

    const itemRemaining = item.subtotal - alreadyPaid

    if (itemRemaining <= 0) continue // Item sudah lunas

    // Alokasikan ke item ini
    const allocated = Math.min(remainingPayment, itemRemaining)

    const { error: insertError } = await supabase
      .from('transaction_item_payments')
      .insert({
        transaction_id: transactionId,
        item_id: item.id,
        payment_id: paymentId,
        allocated_amount: allocated,
      })

    if (insertError) throw insertError

    allocationsCreated++
    remainingPayment -= allocated

    if (remainingPayment <= 0) break
  }

  return allocationsCreated
}

/**
 * Fix pembayaran yang belum dialokasikan (Supabase mode)
 */
async function fixPaymentAllocationSupabase(): Promise<PaymentAllocationResult> {
  const result: PaymentAllocationResult = {
    mode: 'supabase',
    totalPayments: 0,
    fixedPayments: 0,
    errors: [],
    details: [],
  }

  try {
    // Ambil semua pembayaran
    const { data: payments, error: paymentsError } = await supabase
      .from('transaction_payments')
      .select('id, transaction_id, amount, created_at')
      .order('created_at', { ascending: true })

    if (paymentsError) throw paymentsError

    result.totalPayments = payments?.length || 0

    for (const payment of payments || []) {
      try {
        // Cek apakah pembayaran ini sudah punya alokasi
        const { data: existingAllocations, error: checkError } = await supabase
          .from('transaction_item_payments')
          .select('id')
          .eq('payment_id', payment.id)
          .limit(1)

        if (checkError) throw checkError

        // Jika sudah ada alokasi, skip
        if (existingAllocations && existingAllocations.length > 0) {
          continue
        }

        // Alokasikan pembayaran ini
        const allocationsCreated = await allocatePaymentToItemsSupabase(
          payment.transaction_id,
          payment.id,
          payment.amount
        )

        result.fixedPayments++
        result.details.push({
          paymentId: payment.id,
          transactionId: payment.transaction_id,
          amount: payment.amount,
          allocationsCreated,
        })
      } catch (error: any) {
        result.errors.push(
          `Payment ${payment.id}: ${error.message || 'Unknown error'}`
        )
      }
    }
  } catch (error: any) {
    result.errors.push(`Fatal error: ${error.message || 'Unknown error'}`)
  }

  return result
}

/**
 * Entry point — selalu memakai Supabase (mode offline sudah dihapus).
 */
export async function fixPaymentAllocation(): Promise<PaymentAllocationResult> {
  return await fixPaymentAllocationSupabase()
}

/**
 * Format hasil untuk ditampilkan ke user
 */
export function formatFixResult(result: PaymentAllocationResult): string {
  const lines: string[] = []

  lines.push(`Mode: ${result.mode.toUpperCase()}`)
  lines.push(`Total pembayaran: ${result.totalPayments}`)
  lines.push(`Pembayaran yang diperbaiki: ${result.fixedPayments}`)

  if (result.fixedPayments > 0) {
    lines.push('')
    lines.push('Detail perbaikan:')
    result.details.forEach((detail, index) => {
      lines.push(
        `${index + 1}. Rp ${detail.amount.toLocaleString('id-ID')} - ${detail.allocationsCreated} alokasi dibuat`
      )
    })
  }

  if (result.errors.length > 0) {
    lines.push('')
    lines.push('⚠️ Error:')
    result.errors.forEach((error, index) => {
      lines.push(`${index + 1}. ${error}`)
    })
  }

  if (result.fixedPayments === 0 && result.errors.length === 0) {
    lines.push('')
    lines.push('✅ Semua pembayaran sudah dialokasikan dengan benar!')
  } else if (result.fixedPayments > 0) {
    lines.push('')
    lines.push('✅ Perbaikan selesai! Silakan cek laporan laba rugi.')
  }

  return lines.join('\n')
}
