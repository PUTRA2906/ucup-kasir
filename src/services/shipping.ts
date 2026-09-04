import { supabase } from '@/lib/supabase'
import type {
  Vehicle,
  VehicleInsert,
  VehicleUpdate,
  DeliveryOrder,
  DeliveryOrderInsert,
  DeliveryOrderUpdate,
  DeliveryItem,
  DeliveryItemInsert,
  DeliveryTracking,
  DeliveryTrackingInsert,
} from '@/types/database'

// ============================================================
// Service: Modul Pengiriman / Shipping (Supabase / Web)
// - Master Kendaraan (Vehicle)
// - Surat Jalan / Delivery Order (DO)
// - Item DO
// - Tracking / Timeline
// ============================================================

export const shippingService = {
  // ============================================================
  // VEHICLES
  // ============================================================

  async fetchVehicles(): Promise<Vehicle[]> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('plate_number')
    if (error) throw error
    return (data || []) as Vehicle[]
  },

  async getVehicle(id: string): Promise<Vehicle | null> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as Vehicle
  },

  async createVehicle(input: VehicleInsert): Promise<Vehicle> {
    const { data, error } = await supabase
      .from('vehicles')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data as Vehicle
  },

  async updateVehicle(id: string, updates: VehicleUpdate): Promise<Vehicle> {
    const { data, error } = await supabase
      .from('vehicles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Vehicle
  },

  async deleteVehicle(id: string): Promise<void> {
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  // ============================================================
  // DELIVERY ORDERS
  // ============================================================

  async fetchDeliveryOrders(): Promise<DeliveryOrder[]> {
    const { data, error } = await supabase
      .from('delivery_orders')
      .select(`
        *,
        vehicle:vehicles(*),
        driver:employees(*)
      `)
      .order('do_date', { ascending: false })
    if (error) throw error
    return (data || []) as DeliveryOrder[]
  },

  async getDeliveryOrder(id: string): Promise<DeliveryOrder | null> {
    const { data, error } = await supabase
      .from('delivery_orders')
      .select(`
        *,
        vehicle:vehicles(*),
        driver:employees(*),
        items:delivery_items(*),
        tracking:delivery_tracking(*)
      `)
      .eq('id', id)
      .single()
    if (error) throw error
    return data as DeliveryOrder
  },

  async createDeliveryOrder(input: DeliveryOrderInsert): Promise<DeliveryOrder> {
    const { data, error } = await supabase
      .from('delivery_orders')
      .insert({
        ...input,
        status: 'draft',
      })
      .select()
      .single()
    if (error) throw error
    return data as DeliveryOrder
  },

  async updateDeliveryOrder(id: string, updates: DeliveryOrderUpdate): Promise<DeliveryOrder> {
    const { data, error } = await supabase
      .from('delivery_orders')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as DeliveryOrder
  },

  async updateDeliveryStatus(id: string, status: DeliveryOrder['status'], note?: string): Promise<DeliveryOrder> {
    const { data, error } = await supabase
      .from('delivery_orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error

    // Catat tracking
    await supabase
      .from('delivery_tracking')
      .insert({
        delivery_order_id: id,
        status,
        note: note || null,
      })

    return data as DeliveryOrder
  },

  async deleteDeliveryOrder(id: string): Promise<void> {
    const { error } = await supabase
      .from('delivery_orders')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  // ============================================================
  // DELIVERY ITEMS
  // ============================================================

  async fetchDeliveryItems(deliveryOrderId: string): Promise<DeliveryItem[]> {
    const { data, error } = await supabase
      .from('delivery_items')
      .select('*')
      .eq('delivery_order_id', deliveryOrderId)
    if (error) throw error
    return (data || []) as DeliveryItem[]
  },

  async saveDeliveryItems(doId: string, items: DeliveryItemInsert[]): Promise<DeliveryItem[]> {
    // Hapus lama, insert baru
    await supabase
      .from('delivery_items')
      .delete()
      .eq('delivery_order_id', doId)

    if (items.length === 0) return []

    const { data, error } = await supabase
      .from('delivery_items')
      .insert(items.map((i) => ({ ...i, delivery_order_id: doId })))
      .select()
    if (error) throw error
    return (data || []) as DeliveryItem[]
  },

  // ============================================================
  // DELIVERY TRACKING
  // ============================================================

  async fetchDeliveryTracking(deliveryOrderId: string): Promise<DeliveryTracking[]> {
    const { data, error } = await supabase
      .from('delivery_tracking')
      .select('*')
      .eq('delivery_order_id', deliveryOrderId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as DeliveryTracking[]
  },
}