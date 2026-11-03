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
  DeliveryLoader,
  DeliveryLoaderInput,
  DeliveryLoadItem,
  DeliveryLoadItemInput,
} from '@/types/database'

// ============================================================
// Service: Modul Pengiriman / Shipping (Supabase / Web)
// - Master Kendaraan (Vehicle)
// - Surat Jalan / Delivery Order (DO)
// - Item DO
// - Tracking / Timeline
// - Anak DO: transaksi, tim muat, barang dimuat (insentif bongkar muat)
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
        driver:employees(*),
        transaction_ids:delivery_order_transactions(transaction_id)
      `)
      .order('do_date', { ascending: false })
    if (error) throw error
    return (data || []).map((d: any) => ({
      ...d,
      transaction_ids: (d.transaction_ids || []).map((t: any) => t.transaction_id),
    })) as DeliveryOrder[]
  },

  async getDeliveryOrder(id: string): Promise<DeliveryOrder | null> {
    const { data, error } = await supabase
      .from('delivery_orders')
      .select(`
        *,
        vehicle:vehicles(*),
        driver:employees(*),
        items:delivery_items(*),
        tracking:delivery_tracking(*),
        loaders:delivery_loaders(*),
        load_items:delivery_load_items(*),
        link_transactions:delivery_order_transactions(*)
      `)
      .eq('id', id)
      .single()
    if (error) throw error

    const doData = data as any
    doData.transaction_ids = (doData.link_transactions || []).map((t: any) => t.transaction_id)
    delete doData.link_transactions

    if (doData.transaction_ids.length > 0) {
      const { data: txRows } = await supabase
        .from('transactions')
        .select('*')
        .in('id', doData.transaction_ids)
      doData.transactions = txRows || []
    } else {
      doData.transactions = []
    }
    return doData as DeliveryOrder
  },

  async createDeliveryOrder(input: DeliveryOrderInsert): Promise<DeliveryOrder> {
    const { transaction_ids: _t, loaders: _l, load_items: _li, transactions: _tx, ...cols } = input as any
    const { data, error } = await supabase
      .from('delivery_orders')
      .insert({
        ...cols,
        status: 'draft',
      })
      .select()
      .single()
    if (error) throw error
    return data as DeliveryOrder
  },

  async updateDeliveryOrder(id: string, updates: DeliveryOrderUpdate): Promise<DeliveryOrder> {
    const { transaction_ids: _t, loaders: _l, load_items: _li, transactions: _tx, ...cols } = updates as any
    const { data, error } = await supabase
      .from('delivery_orders')
      .update({ ...cols, updated_at: new Date().toISOString() })
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

    // Update status transaksi yang terkait dengan delivery order ini
    // Mapping: delivery_order.status -> transaction.transaction_status
    // - 'disiapkan' -> 'disiapkan'
    // - 'dikirim' -> 'dikirim'
    // - 'selesai' -> 'selesai'
    if (status === 'disiapkan' || status === 'dikirim' || status === 'selesai') {
      // Ambil daftar transaction_id yang terkait dengan DO ini
      const { data: links } = await supabase
        .from('delivery_order_transactions')
        .select('transaction_id')
        .eq('delivery_order_id', id)

      const transactionIds = (links || []).map(l => l.transaction_id)

      if (transactionIds.length > 0) {
        // Update transaction_status untuk semua transaksi terkait
        await supabase
          .from('transactions')
          .update({ transaction_status: status })
          .in('id', transactionIds)
      }
    }

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

  // ============================================================
  // ANAK SURAT JALAN: transaksi, tim muat, barang dimuat
  // ============================================================

  /** Simpan ulang referensi transaksi DO (hapus lama, insert baru). */
  async saveDeliveryOrderTransactions(doId: string, transactionIds: string[]): Promise<void> {
    await supabase
      .from('delivery_order_transactions')
      .delete()
      .eq('delivery_order_id', doId)

    if (transactionIds.length === 0) return

    const { error } = await supabase
      .from('delivery_order_transactions')
      .insert(transactionIds.map((tid) => ({ delivery_order_id: doId, transaction_id: tid })))
    if (error) throw error
  },

  /** Simpan ulang tim muat DO (hapus lama, insert baru). */
  async saveDeliveryLoaders(doId: string, loaders: DeliveryLoaderInput[]): Promise<DeliveryLoader[]> {
    await supabase
      .from('delivery_loaders')
      .delete()
      .eq('delivery_order_id', doId)

    if (loaders.length === 0) return []

    const { data, error } = await supabase
      .from('delivery_loaders')
      .insert(loaders.map((l) => ({ ...l, delivery_order_id: doId })))
      .select()
    if (error) throw error
    return (data || []) as DeliveryLoader[]
  },

  /** Simpan ulang daftar barang dimuat DO (hapus lama, insert baru). */
  async saveDeliveryLoadItems(doId: string, items: DeliveryLoadItemInput[]): Promise<DeliveryLoadItem[]> {
    await supabase
      .from('delivery_load_items')
      .delete()
      .eq('delivery_order_id', doId)

    if (items.length === 0) return []

    const { data, error } = await supabase
      .from('delivery_load_items')
      .insert(items.map((i) => ({ ...i, delivery_order_id: doId })))
      .select()
    if (error) throw error
    return (data || []) as DeliveryLoadItem[]
  },
}