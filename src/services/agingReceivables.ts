import { supabase } from '@/lib/supabase'

export interface AgingRow {
  customer_id: string
  customer_name: string
  kecamatan: string
  current: number       // 0–3 bulan (0–90 hari)
  days3_6: number       // 3–6 bulan (91–180 hari)
  days6_12: number      // 6 bulan–1 tahun (181–365 hari)
  over1year: number     // >1 tahun (>365 hari)
  total: number
  oldest_date: string
}

export interface AgingSummary {
  total_current: number
  total_3_6: number
  total_6_12: number
  total_over1year: number
  grand_total: number
  customer_count: number
}

export interface AgingReport {
  rows: AgingRow[]
  summary: AgingSummary
  as_of_date: string
}

export const agingReceivablesService = {
  async getAgingReport(asOfDate?: string): Promise<AgingReport> {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) throw new Error('Not authenticated')

    const refDate = asOfDate || new Date().toISOString().split('T')[0]
    const endOfDay = refDate + 'T23:59:59.999Z'

    const { data, error } = await supabase
      .from('transactions')
      .select('customer_id, customer_name, remaining_amount, created_at, customer:customers(kecamatan)')
      .eq('user_id', userData.user.id)
      .neq('payment_status', 'lunas')
      .not('status', 'in', '("void","batal")')
      .gt('remaining_amount', 0)
      .lte('created_at', endOfDay)
      .order('customer_name', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) throw error

    const customerMap = new Map<string, AgingRow>()

    for (const row of data || []) {
      const key = row.customer_id || `__noname__${row.customer_name}`
      const txDate = new Date(row.created_at)
      const ref = new Date(refDate)
      const diffDays = Math.floor((ref.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24))
      const amount = Number(row.remaining_amount || 0)
      const kecamatan = (row.customer as any)?.kecamatan || '-'

      if (!customerMap.has(key)) {
        customerMap.set(key, {
          customer_id: row.customer_id || '',
          customer_name: row.customer_name || 'Tanpa Nama',
          kecamatan,
          current: 0,
          days3_6: 0,
          days6_12: 0,
          over1year: 0,
          total: 0,
          oldest_date: row.created_at,
        })
      }

      const entry = customerMap.get(key)!

      if (diffDays <= 90) entry.current += amount
      else if (diffDays <= 180) entry.days3_6 += amount
      else if (diffDays <= 365) entry.days6_12 += amount
      else entry.over1year += amount

      entry.total += amount

      if (new Date(row.created_at) < new Date(entry.oldest_date)) {
        entry.oldest_date = row.created_at
      }
    }

    const rows = Array.from(customerMap.values())
      .sort((a, b) => b.total - a.total)

    const summary: AgingSummary = {
      total_current: rows.reduce((s, r) => s + r.current, 0),
      total_3_6: rows.reduce((s, r) => s + r.days3_6, 0),
      total_6_12: rows.reduce((s, r) => s + r.days6_12, 0),
      total_over1year: rows.reduce((s, r) => s + r.over1year, 0),
      grand_total: rows.reduce((s, r) => s + r.total, 0),
      customer_count: rows.length,
    }

    return { rows, summary, as_of_date: refDate }
  }
}
