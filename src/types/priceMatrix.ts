export interface PriceTier {
  id: string
  store_id: string
  product_id: string
  min_quantity: number
  max_quantity: number | null
  tier_price: number
  tier_name?: string
  is_active: boolean
  start_date?: string
  end_date?: string
  created_at: string
  updated_at: string
}

export interface CustomerPriceMatrix {
  id: string
  store_id: string
  customer_id: string | null
  group_id: string | null
  product_id: string
  custom_price: number
  min_quantity: number
  is_active: boolean
  start_date?: string
  end_date?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface CustomerGroup {
  id: string
  store_id: string
  name: string
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CustomerGroupMember {
  id: string
  store_id: string
  group_id: string
  customer_id: string
  created_at: string
}

export interface CustomerGroupWithMembers extends CustomerGroup {
  members?: Array<{ customer_id: string; customer?: { id: string; name: string } | null }>
  member_count?: number
}

export interface PriceTierWithProduct extends PriceTier {
  product?: {
    id: string
    name: string
    sku?: string
    price_sell: number
  }
}

export interface CustomerPriceMatrixWithDetails extends CustomerPriceMatrix {
  customer?: {
    id: string
    name: string
  } | null
  group?: {
    id: string
    name: string
  } | null
  product?: {
    id: string
    name: string
    sku?: string
    price_sell: number
  }
}

export interface ApplicablePriceResult {
  price: number
  source: 'default' | 'tier' | 'custom'
  tier_name?: string
  min_quantity?: number
}
