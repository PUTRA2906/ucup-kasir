import { supabase } from '@/lib/supabase'
import type { Product, ProductInsert, ProductUpdate, ProductWithCategory } from '@/types/database'

/**
 * Kolom yang dibaca dari `v_products` (bukan tabel `products`).
 *
 * Sejak migrasi 0004, `authenticated` tidak lagi punya SELECT penuh pada tabel
 * `products` — `price_buy` & `price_modal` dicabut dan dimasker oleh view.
 * Karena itu semua query baca WAJIB lewat `v_products` dengan daftar kolom
 * eksplisit; `select('*')` pada tabel dasar akan ditolak database.
 *
 * `price_buy`/`price_modal` tetap diminta karena view mengembalikan NULL untuk
 * role tanpa `hpp.read` — bukan error, dan tipe Product membutuhkannya.
 */
const PRODUCT_COLUMNS = [
  'id',
  'store_id',
  'name',
  'description',
  'category_id',
  'sku',
  'barcode',
  'image_url',
  'is_active',
  'price_sell',
  'stock',
  'minimum_stock',
  'created_by',
  'created_at',
  'updated_at',
  'price_buy',
  'price_modal',
].join(', ')

const PRODUCT_WITH_CATEGORY = `${PRODUCT_COLUMNS}, category:categories(id, store_id, name, description, created_at, updated_at)`

/**
 * `v_products` adalah view, bukan tabel yang dikenal klien Supabase tanpa
 * tipe generated (proyek ini memakai klien untyped). PostgREST menurunkan
 * hasilnya ke `GenericStringError`, jadi setiap pembacaan di-cast eksplisit —
 * sama seperti penanganan hasil untyped lain di proyek ini.
 */
type QueryResult<T> = { data: unknown; error: unknown }
const rows = <T>(res: QueryResult<T>): T[] => (res.data ?? []) as T[]
const row = <T>(res: QueryResult<T>): T | null => (res.data ?? null) as T | null

export const productsService = {
  async getAll(includeInactive = false): Promise<ProductWithCategory[]> {
    let query = supabase
      .from('v_products')
      .select(PRODUCT_WITH_CATEGORY)
      .order('name')

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) throw error
    return rows<ProductWithCategory>({ data, error })
  },

  async getById(id: string): Promise<ProductWithCategory | null> {
    const { data, error } = await supabase
      .from('v_products')
      .select(PRODUCT_WITH_CATEGORY)
      .eq('id', id)
      .single()

    if (error) throw error
    return row<ProductWithCategory>({ data, error })
  },

  async getByCategory(categoryId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('v_products')
      .select(PRODUCT_COLUMNS)
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .order('name')

    if (error) throw error
    return rows<Product>({ data, error })
  },

  async getBySku(sku: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('v_products')
      .select(PRODUCT_COLUMNS)
      .eq('sku', sku)
      .single()

    if (error) throw error
    return row<Product>({ data, error })
  },

  async getByBarcode(barcode: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('v_products')
      .select(PRODUCT_COLUMNS)
      .eq('barcode', barcode)
      .single()

    if (error) throw error
    return row<Product>({ data, error })
  },

  /**
   * Buat produk lewat RPC `create_product` (migrasi 0004).
   *
   * RPC ini mencatat stok awal + jurnal (Dr Persediaan / Cr Modal) secara
   * atomik di server. Sebelumnya jurnal dibuat dari klien dengan
   * `postInitialStockJournal` yang dijaga `finance.write`; role `gudang`
   * (punya product.write, tanpa finance.write) membuat jurnalnya gagal dan
   * error-nya ditelan diam-diam.
   */
  async create(product: ProductInsert): Promise<ProductWithCategory> {
    const { data: newId, error } = await supabase.rpc('create_product', {
      p_name: product.name,
      p_price_sell: product.price_sell,
      p_price_buy: product.price_buy ?? 0,
      p_stock: product.stock ?? 0,
      p_sku: product.sku ?? null,
      p_barcode: product.barcode ?? null,
      p_category_id: product.category_id ?? null,
      p_minimum_stock: product.minimum_stock ?? 10,
      p_description: product.description ?? null,
      p_is_active: product.is_active ?? true,
    })

    if (error) throw error

    const created = await this.getById(newId as string)
    return this.withCategory(created)
  },

  /**
   * Insert banyak produk sekaligus (import CSV / bulk).
   *
   * Memakai RPC `create_product` per baris (bukan bulk insert) supaya setiap
   * produk dengan stok awal tetap mendapat jurnal stok yang atomik dan
   * permission `product.write` ditegakkan server-side. Import CSV memang
   * sekuensial; jumlah baris realistis (ratusan) masih wajar.
   */
  async createMany(products: ProductInsert[]): Promise<ProductWithCategory[]> {
    if (products.length === 0) return []

    const ids: string[] = []
    for (const product of products) {
      const created = await this.create(product)
      ids.push(created.id)
    }

    const { data, error } = await supabase
      .from('v_products')
      .select(PRODUCT_WITH_CATEGORY)
      .in('id', ids)

    if (error) throw error

    // Pertahankan urutan input.
    const byId = new Map((data || []).map((row: any) => [row.id, row]))
    return ids.map((id) => this.withCategory(byId.get(id))).filter(Boolean) as ProductWithCategory[]
  },

  async update(id: string, product: ProductUpdate): Promise<ProductWithCategory> {
    const { error } = await supabase
      .from('products')
      .update(product)
      .eq('id', id)

    if (error) throw error

    // Ambil ulang lewat view: `returning price_buy` akan ditolak untuk role
    // tanpa hpp.read, dan view sudah mengembalikan nilai yang benar per role.
    const updated = await this.getById(id)
    return this.withCategory(updated)
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async updateStock(id: string, quantity: number): Promise<ProductWithCategory> {
    const { error } = await supabase
      .from('products')
      .update({ stock: quantity })
      .eq('id', id)

    if (error) throw error

    const updated = await this.getById(id)
    return this.withCategory(updated)
  },

  async adjustStock(id: string, adjustment: number): Promise<ProductWithCategory> {
    const product = await this.getById(id)
    if (!product) throw new Error('Product not found')

    const newStock = product.stock + adjustment
    return this.updateStock(id, newStock)
  },

  async search(query: string): Promise<ProductWithCategory[]> {
    const { data, error } = await supabase
      .from('v_products')
      .select(PRODUCT_WITH_CATEGORY)
      .or(`name.ilike.%${query}%,sku.ilike.%${query}%,barcode.ilike.%${query}%`)
      .eq('is_active', true)
      .order('name')

    if (error) throw error
    return rows<ProductWithCategory>({ data, error })
  },

  async getLowStock(threshold = 10): Promise<ProductWithCategory[]> {
    const { data, error } = await supabase
      .from('v_products')
      .select(PRODUCT_WITH_CATEGORY)
      .lte('stock', threshold)
      .eq('is_active', true)
      .order('stock')

    if (error) throw error
    return rows<ProductWithCategory>({ data, error })
  },

  /** Normalisasi hasil query tunggal ke ProductWithCategory. */
  withCategory(r: any): ProductWithCategory {
    if (!r) throw new Error('Data produk tidak ditemukan')
    const { category, ...rest } = r
    return { ...rest, category: category ?? undefined } as ProductWithCategory
  }
}
