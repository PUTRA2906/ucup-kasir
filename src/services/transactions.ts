import { supabase } from '@/lib/supabase'
import type { Transaction, TransactionInput, TransactionStatus } from '@/types/database'

export const transactionsService = {
  async getAll(): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        items:transaction_items(*)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getPaginated(
    page: number,
    perPage: number,
    filters?: {
      search?: string
      paymentStatus?: string
      transactionStatus?: string
      recordStatus?: string
      paymentMethod?: string
      customer?: string
      dateFrom?: string
      dateTo?: string
      minAmount?: number
      maxAmount?: number
      sortOrder?: string
    }
  ): Promise<{ data: Transaction[]; count: number }> {
    const from = (page - 1) * perPage
    const to = from + perPage - 1

    let query = supabase
      .from('transactions')
      .select('*, items:transaction_items(*)', { count: 'exact' })

    // Filter status catatan (aktif/void/batal)
    if (filters?.recordStatus === 'aktif') {
      query = query.not('status', 'in', '("void","batal")')
    } else if (filters?.recordStatus === 'batal') {
      query = query.in('status', ['void', 'batal'])
    }

    // Filter status transaksi (disiapkan/dikirim/selesai)
    if (filters?.transactionStatus && filters.transactionStatus !== 'semua') {
      query = query.eq('transaction_status', filters.transactionStatus)
    }

    // Filter status pembayaran
    if (filters?.paymentStatus && filters.paymentStatus !== 'semua') {
      if (filters.paymentStatus === 'lunas') {
        query = query.eq('payment_status', 'lunas')
      } else {
        query = query.neq('payment_status', 'lunas')
      }
    }

    // Filter metode pembayaran
    if (filters?.paymentMethod) {
      query = query.eq('payment_method', filters.paymentMethod)
    }

    // Filter customer
    if (filters?.customer === '__tanpa__') {
      query = query.is('customer_name', null)
    } else if (filters?.customer) {
      query = query.eq('customer_name', filters.customer)
    }

    // Filter tanggal
    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom + 'T00:00:00')
    }
    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo + 'T23:59:59.999')
    }

    // Filter nominal
    if (filters?.minAmount !== undefined) {
      query = query.gte('total', filters.minAmount)
    }
    if (filters?.maxAmount !== undefined) {
      query = query.lte('total', filters.maxAmount)
    }

    // Pencarian teks (nomor transaksi & nama customer)
    if (filters?.search) {
      query = query.or(
        `transaction_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%`
      )
    }

    // Pengurutan
    switch (filters?.sortOrder) {
      case 'oldest':
        query = query.order('created_at', { ascending: true })
        break
      case 'highest':
        query = query.order('total', { ascending: false })
        break
      case 'lowest':
        query = query.order('total', { ascending: true })
        break
      default:
        query = query.order('created_at', { ascending: false })
    }

    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) throw error
    return { data: data || [], count: count ?? 0 }
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
      p_transaction_date: input.transaction_date || new Date().toISOString(),
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

  async void(id: string): Promise<void> {
    const { error } = await supabase
      .from('transactions')
      .update({ status: 'void' })
      .eq('id', id)

    if (error) throw error
  },

  /** Ubah status transaksi (disiapkan/dikirim/selesai). */
  async updateStatus(id: string, transactionStatus: TransactionStatus): Promise<void> {
    const { error } = await supabase
      .from('transactions')
      .update({ transaction_status: transactionStatus })
      .eq('id', id)

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

  /**
   * Import transaksi dari CSV yang sudah di-parse.
   * Setiap baris CSV bisa berupa item baru di transaksi yang sama (gabung by no_transaksi atau tanggal+customer).
   * Auto-jurnal ditangani oleh RPC create_transaction di Supabase (SECURITY DEFINER).
   *
   * Kolom CSV (case-insensitive):
   *   Wajib  : tanggal, nama_produk / produk, qty / jumlah, harga / harga_satuan
   *   Opsional: no_transaksi, nama_customer / customer, metode_bayar / bayar, jumlah_bayar / bayar,
   *             diskon, ongkir / shipping, catatan / notes
   */
  async importFromCsv(
    rows: Record<string, string>[],
    headers: string[]
  ): Promise<{ created: number; skipped: number; errors: string[] }> {
    // ── 1. Ambil semua produk untuk lookup nama → id ──────────────────
    const { data: allProducts, error: prodErr } = await supabase
      .from('products')
      .select('id, name, sku, price_sell')
      .eq('is_active', true)

    if (prodErr) throw prodErr

    const productByName = new Map<string, { id: string; price_sell: number }>()
    const productBySku = new Map<string, { id: string; price_sell: number }>()
    for (const p of allProducts || []) {
      productByName.set(p.name.toLowerCase().trim(), { id: p.id, price_sell: p.price_sell })
      if (p.sku) productBySku.set(p.sku.toLowerCase().trim(), { id: p.id, price_sell: p.price_sell })
    }

    // ── 2. Helper normalisasi header ──────────────────────────────────
    const norm = (s: string) => s.toLowerCase().replace(/[\s_\-./]/g, '')

    const findCol = (record: Record<string, string>, aliases: string[]): string => {
      for (const key of Object.keys(record)) {
        if (aliases.includes(norm(key))) return record[key] ?? ''
      }
      return ''
    }

    const parseNum = (s: string): number => {
      const clean = s.replace(/[^0-9.,\-]/g, '').replace(/\./g, '').replace(',', '.')
      return parseFloat(clean) || 0
    }

    const parseDate = (s: string): string | null => {
      if (!s.trim()) return null
      // Coba format DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
      const slash = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
      if (slash) {
        const [, d, m, y] = slash
        const year = y.length === 2 ? `20${y}` : y
        return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
      }
      const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
      if (iso) return s.slice(0, 10)
      return null
    }

    // ── 3. Kelompokkan baris per transaksi ────────────────────────────
    interface TxGroup {
      groupKey: string
      rowNumber: number
      tanggal: string
      customerName: string
      paymentMethod: string
      paidAmount: number
      discount: number
      shippingCost: number
      notes: string
      items: Array<{ product_id: string; quantity: number; price: number; productName: string }>
    }

    const groups = new Map<string, TxGroup>()
    const errors: string[] = []

    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx]
      const rowNum = idx + 2

      // Baca kolom
      const noTxn    = findCol(row, ['notransaksi', 'notx', 'no', 'nomor', 'notransaksi'])
      const tanggalRaw = findCol(row, ['tanggal', 'date', 'tgl'])
      const namaProduk = findCol(row, ['namaproduk', 'produk', 'product', 'namabarang', 'barang', 'item', 'sku'])
      const qtyRaw   = findCol(row, ['qty', 'jumlah', 'quantity', 'jml'])
      const hargaRaw = findCol(row, ['harga', 'hargasatuan', 'price', 'hargajual'])
      const customer = findCol(row, ['namacustomer', 'customer', 'pelanggan', 'nama'])
      const bayarRaw = findCol(row, ['metodebayar', 'metode', 'bayar', 'paymentmethod', 'payment'])
      const paidRaw  = findCol(row, ['jumlahbayar', 'bayar', 'paid', 'dibayar', 'tunai'])
      const diskonRaw = findCol(row, ['diskon', 'discount', 'potongan'])
      const ongkirRaw = findCol(row, ['ongkir', 'shipping', 'ongkos', 'kirim'])
      const notesVal = findCol(row, ['catatan', 'notes', 'keterangan'])

      // Validasi kolom wajib
      if (!tanggalRaw.trim() && !noTxn.trim()) {
        errors.push(`Baris ${rowNum}: Kolom Tanggal kosong, baris dilewati`)
        continue
      }
      if (!namaProduk.trim()) {
        errors.push(`Baris ${rowNum}: Kolom Nama Produk kosong, baris dilewati`)
        continue
      }

      const tanggal = parseDate(tanggalRaw) || new Date().toISOString().slice(0, 10)
      const qty = Math.max(parseNum(qtyRaw), 1)
      const harga = parseNum(hargaRaw)

      if (harga <= 0) {
        errors.push(`Baris ${rowNum}: Harga satuan tidak valid ("${hargaRaw}"), baris dilewati`)
        continue
      }

      // Cari produk by nama atau SKU
      const nameLower = namaProduk.toLowerCase().trim()
      const produk = productByName.get(nameLower) || productBySku.get(nameLower)

      if (!produk) {
        errors.push(`Baris ${rowNum}: Produk "${namaProduk}" tidak ditemukan, baris dilewati`)
        continue
      }

      // Tentukan group key: pakai no. transaksi jika ada, selainnya tanggal+customer
      const groupKey = noTxn.trim()
        ? `txno:${noTxn.trim()}`
        : `date:${tanggal}|cust:${customer.trim().toLowerCase()}`

      if (!groups.has(groupKey)) {
        const methodMap: Record<string, string> = {
          tunai: 'tunai', cash: 'tunai',
          transfer: 'transfer', tf: 'transfer', bank: 'transfer',
          qris: 'qris', qr: 'qris',
          tempo: 'tempo', kredit: 'tempo', credit: 'tempo',
        }
        const rawMethod = bayarRaw.toLowerCase().trim()
        const method = methodMap[rawMethod] || (rawMethod || 'tunai')

        groups.set(groupKey, {
          groupKey,
          rowNumber: rowNum,
          tanggal,
          customerName: customer.trim(),
          paymentMethod: method,
          paidAmount: parseNum(paidRaw),
          discount: parseNum(diskonRaw),
          shippingCost: parseNum(ongkirRaw),
          notes: notesVal.trim(),
          items: [],
        })
      }

      groups.get(groupKey)!.items.push({
        product_id: produk.id,
        quantity: qty,
        price: harga > 0 ? harga : produk.price_sell,
        productName: namaProduk,
      })
    }

    // ── 4. Buat transaksi per group ───────────────────────────────────
    let created = 0
    let skipped = 0

    for (const [, grp] of groups) {
      if (grp.items.length === 0) {
        skipped++
        continue
      }

      const subtotal = grp.items.reduce((s, i) => s + i.price * i.quantity, 0)
      const total = Math.max(subtotal - grp.discount + grp.shippingCost, 0)
      const paidAmount = grp.paidAmount > 0 ? grp.paidAmount : (grp.paymentMethod !== 'tempo' ? total : 0)

      try {
        await this.create({
          customer_name: grp.customerName || undefined,
          payment_method: grp.paymentMethod,
          paid_amount: paidAmount,
          discount: grp.discount,
          shipping_cost: grp.shippingCost || undefined,
          notes: grp.notes || undefined,
          transaction_date: grp.tanggal + 'T00:00:00',
          items: grp.items.map((i) => ({
            product_id: i.product_id,
            quantity: i.quantity,
            price: i.price,
          })),
        })
        created++
      } catch (e: any) {
        skipped++
        errors.push(`Grup ${grp.groupKey} (baris ${grp.rowNumber}): ${e.message}`)
      }
    }

    return { created, skipped, errors }
  },
}
