export interface Category {
  id: string
  user_id?: string
  name: string
  description?: string
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  user_id?: string
  name: string
  description?: string
  category_id?: string
  price_buy: number
  price_sell: number
  stock: number
  minimum_stock?: number
  sku?: string
  barcode?: string
  image_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CategoryWithProducts extends Category {
  products?: Product[]
}

export interface ProductWithCategory extends Product {
  category?: Category
}

export interface Customer {
  id: string
  user_id?: string
  name: string
  store_name?: string
  phone?: string
  kecamatan?: string
  address?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface TransactionItem {
  id: string
  user_id?: string
  transaction_id: string
  product_id?: string
  product_name: string
  price: number
  quantity: number
  subtotal: number
  created_at: string
}

export interface TransactionPayment {
  id: string
  user_id?: string
  transaction_id: string
  amount: number
  payment_method: string
  notes?: string
  created_at: string
}

export interface Transaction {
  id: string
  user_id?: string
  transaction_number: string
  customer_id?: string
  customer_name?: string
  subtotal: number
  discount: number
  return_amount?: number
  shipping_cost?: number
  total: number
  payment_method: string
  paid_amount: number
  change_amount: number
  remaining_amount: number
  payment_status: string
  status: string
  notes?: string
  created_at: string
  updated_at: string
  items?: TransactionItem[]
  payments?: TransactionPayment[]
}

export type CategoryInsert = Omit<Category, 'id' | 'created_at' | 'updated_at'>
export type CategoryUpdate = Partial<CategoryInsert>

export type CustomerInsert = Omit<Customer, 'id' | 'created_at' | 'updated_at'>
export type CustomerUpdate = Partial<CustomerInsert>

export type ProductInsert = Omit<Product, 'id' | 'created_at' | 'updated_at'>
export type ProductUpdate = Partial<ProductInsert>

export interface TransactionItemInput {
  product_id: string
  quantity: number
  price?: number
}

export interface TransactionInput {
  customer_id?: string
  customer_name?: string
  payment_method: string
  paid_amount: number
  discount: number
  shipping_cost?: number
  return_amount?: number
  notes?: string
  transaction_date?: string
  items: TransactionItemInput[]
}

export interface ReturnItem {
  id: string
  user_id?: string
  return_id: string
  product_id?: string
  product_name: string
  price: number
  quantity: number
  subtotal: number
  created_at: string
}

export interface TransactionReturn {
  id: string
  user_id?: string
  transaction_id: string
  return_number: string
  total_refund: number
  notes?: string
  created_at: string
  updated_at: string
  items?: ReturnItem[]
  transaction?: {
    id: string
    transaction_number: string
    customer_name?: string
    status: string
  }
}

export interface ReturnItemInput {
  product_id: string
  quantity: number
}

export interface StoreSettings {
  id: string
  user_id?: string
  store_name: string
  store_subtitle?: string
  store_address?: string
  store_phone?: string
  store_email?: string
  tax_enabled?: boolean
  tax_rate?: number
  currency?: string
  receipt_footer?: string
  created_at: string
  updated_at: string
}

export type StoreSettingsUpdate = Partial<Omit<StoreSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
