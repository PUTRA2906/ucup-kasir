import { supabase } from '@/lib/supabase'
import type { Product, ProductInsert, ProductUpdate, ProductWithCategory } from '@/types/database'

export const productsService = {
  async getAll(includeInactive = false): Promise<ProductWithCategory[]> {
    let query = supabase
      .from('products')
      .select(`
        *,
        category:categories(*)
      `)
      .order('name')

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  },

  async getById(id: string): Promise<ProductWithCategory | null> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(*)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async getByCategory(categoryId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .order('name')

    if (error) throw error
    return data || []
  },

  async getBySku(sku: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('sku', sku)
      .single()

    if (error) throw error
    return data
  },

  async getByBarcode(barcode: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', barcode)
      .single()

    if (error) throw error
    return data
  },

  async create(product: ProductInsert): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async update(id: string, product: ProductUpdate): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update(product)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async updateStock(id: string, quantity: number): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update({ stock: quantity })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async adjustStock(id: string, adjustment: number): Promise<Product> {
    const product = await this.getById(id)
    if (!product) throw new Error('Product not found')

    const newStock = product.stock + adjustment
    return this.updateStock(id, newStock)
  },

  async search(query: string): Promise<ProductWithCategory[]> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(*)
      `)
      .or(`name.ilike.%${query}%,sku.ilike.%${query}%,barcode.ilike.%${query}%`)
      .eq('is_active', true)
      .order('name')

    if (error) throw error
    return data || []
  },

  async getLowStock(threshold = 10): Promise<ProductWithCategory[]> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(*)
      `)
      .lte('stock', threshold)
      .eq('is_active', true)
      .order('stock')

    if (error) throw error
    return data || []
  }
}
