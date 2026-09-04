import { supabase } from '@/lib/supabase'
import type {
  Supplier,
  SupplierInsert,
  SupplierUpdate,
  SupplierWithStats,
  PurchaseOrder,
  PurchaseOrderInput,
  PurchaseOrderItem,
  PurchaseOrderUpdate,
  GoodsReceipt,
  GoodsReceiptInput,
  GoodsReceiptItem,
  PurchaseInvoice,
  PurchaseInvoiceInput,
  PurchaseInvoiceItem,
  PurchaseInvoicePayment,
  PurchaseReturn,
  PurchaseReturnInput,
  PurchaseReturnItem,
} from '@/types/database'

// ============================================================
// Service: Modul Pembelian Barang (Supabase / Web)
// Mirror dari src/services/sqlite/purchasing.ts
//
// - CRUD Supplier
// - Purchase Orders (via RPC create_purchase_order)
// - Goods Receipts / GRN (via RPC create_goods_receipt — auto-stok + auto-jurnal)
// - Purchase Invoices (via RPC create_purchase_invoice)
// - PI Payments (via RPC add_pi_payment — auto-jurnal bayar hutang)
// - Purchase Returns (via RPC create_purchase_return — auto-jurnal reversal)
// ============================================================

export const purchasingService = {
  // ============================================================
  // SUPPLIERS
  // ============================================================

  async fetchSuppliers(): Promise<Supplier[]> {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name')
    if (error) throw error
    return (data || []) as Supplier[]
  },

  async getSupplier(id: string): Promise<Supplier | null> {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as Supplier
  },

  async createSupplier(input: SupplierInsert): Promise<Supplier> {
    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        ...input,
        supplier_type: input.supplier_type ?? 'langsung',
        payment_term: input.payment_term ?? 'tunai',
        credit_limit: input.credit_limit ?? 0,
        is_active: input.is_active !== false,
      })
      .select()
      .single()
    if (error) throw error
    return data as Supplier
  },

  async updateSupplier(id: string, updates: SupplierUpdate): Promise<Supplier> {
    const { data, error } = await supabase
      .from('suppliers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Supplier
  },

  async deleteSupplier(id: string): Promise<void> {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  /** Supplier dengan statistik pembelian & saldo utang. */
  async fetchSuppliersWithStats(): Promise<SupplierWithStats[]> {
    const suppliers = await this.fetchSuppliers()

    const { data: poRows, error: poErr } = await supabase
      .from('purchase_orders')
      .select('supplier_id, total')
    if (poErr) throw poErr

    const { data: piRows, error: piErr } = await supabase
      .from('purchase_invoices')
      .select('supplier_id, remaining_amount, payment_status')
    if (piErr) throw piErr

    const totalBySupplier = new Map<string, number>()
    for (const r of (poRows || [])) {
      const sId = r.supplier_id as string
      if (!sId) continue
      totalBySupplier.set(sId, (totalBySupplier.get(sId) || 0) + Number(r.total || 0))
    }

    const outstandingBySupplier = new Map<string, number>()
    for (const r of (piRows || [])) {
      const sId = r.supplier_id as string
      if (!sId) continue
      if (r.payment_status !== 'lunas') {
        outstandingBySupplier.set(sId, (outstandingBySupplier.get(sId) || 0) + Number(r.remaining_amount || 0))
      }
    }

    return suppliers.map((s) => ({
      ...s,
      total_purchases: totalBySupplier.get(s.id) || 0,
      outstanding_balance: outstandingBySupplier.get(s.id) || 0,
    }))
  },

  // ============================================================
  // PURCHASE ORDERS
  // ============================================================

  async fetchPurchaseOrders(): Promise<PurchaseOrder[]> {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*, supplier:suppliers(id, name, phone), items:po_items(*)')
      .order('po_date', { ascending: false })
    if (error) throw error
    return (data || []) as PurchaseOrder[]
  },

  async getPurchaseOrder(id: string): Promise<PurchaseOrder | null> {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*, supplier:suppliers(id, name, phone), items:po_items(*)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as PurchaseOrder
  },

  async createPurchaseOrder(input: PurchaseOrderInput): Promise<PurchaseOrder> {
    const { data, error } = await supabase.rpc('create_purchase_order', {
      p_supplier_id: input.supplier_id ?? null,
      p_supplier_name: input.supplier_name ?? null,
      p_po_date: input.po_date,
      p_expected_date: input.expected_date ?? null,
      p_notes: input.notes ?? null,
      p_items: input.items.map((it) => ({
        product_id: it.product_id ?? null,
        product_name: it.product_name,
        quantity: it.quantity,
        price: it.price,
        discount: it.discount ?? 0,
      })),
    })
    if (error) throw error
    return (await this.getPurchaseOrder(data as string))!
  },

  async updatePurchaseOrderStatus(id: string, status: PurchaseOrder['status']): Promise<void> {
    const { error } = await supabase
      .from('purchase_orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  },

  async deletePurchaseOrder(id: string): Promise<void> {
    const { error } = await supabase
      .from('purchase_orders')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  // ============================================================
  // GOODS RECEIPTS (GRN)
  // ============================================================

  async fetchGoodsReceipts(): Promise<GoodsReceipt[]> {
    const { data, error } = await supabase
      .from('goods_receipts')
      .select('*, items:grn_items(*)')
      .order('receipt_date', { ascending: false })
    if (error) throw error
    return (data || []) as GoodsReceipt[]
  },

  async getGoodsReceipt(id: string): Promise<GoodsReceipt | null> {
    const { data, error } = await supabase
      .from('goods_receipts')
      .select('*, items:grn_items(*)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as GoodsReceipt
  },

  async createGoodsReceipt(input: GoodsReceiptInput): Promise<GoodsReceipt> {
    const { data, error } = await supabase.rpc('create_goods_receipt', {
      p_po_id: input.po_id ?? null,
      p_supplier_id: input.supplier_id ?? null,
      p_supplier_name: input.supplier_name ?? null,
      p_receipt_date: input.receipt_date,
      p_notes: input.notes ?? null,
      p_items: input.items.map((it) => ({
        po_item_id: it.po_item_id ?? null,
        product_id: it.product_id ?? null,
        product_name: it.product_name,
        quantity_received: it.quantity_received,
        quantity_rejected: it.quantity_rejected ?? 0,
        price: it.price,
      })),
    })
    if (error) throw error
    return (await this.getGoodsReceipt(data as string))!
  },

  // ============================================================
  // PURCHASE INVOICES
  // ============================================================

  async fetchPurchaseInvoices(): Promise<PurchaseInvoice[]> {
    const { data, error } = await supabase
      .from('purchase_invoices')
      .select('*, items:pi_items(*), payments:pi_payments(*)')
      .order('invoice_date', { ascending: false })
    if (error) throw error
    return (data || []) as PurchaseInvoice[]
  },

  async getPurchaseInvoice(id: string): Promise<PurchaseInvoice | null> {
    const { data, error } = await supabase
      .from('purchase_invoices')
      .select('*, items:pi_items(*), payments:pi_payments(*)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as PurchaseInvoice
  },

  async createPurchaseInvoice(input: PurchaseInvoiceInput): Promise<PurchaseInvoice> {
    const { data, error } = await supabase.rpc('create_purchase_invoice', {
      p_grn_id: input.grn_id ?? null,
      p_supplier_id: input.supplier_id ?? null,
      p_supplier_name: input.supplier_name ?? null,
      p_invoice_date: input.invoice_date,
      p_due_date: input.due_date ?? null,
      p_discount: input.discount ?? 0,
      p_tax: input.tax ?? 0,
      p_shipping_cost: input.shipping_cost ?? 0,
      p_notes: input.notes ?? null,
      p_items: input.items.map((it) => ({
        grn_item_id: it.po_item_id ?? null,
        product_id: it.product_id ?? null,
        product_name: it.product_name,
        quantity: it.quantity_received ?? 0,
        price: it.price,
      })),
    })
    if (error) throw error
    return (await this.getPurchaseInvoice(data as string))!
  },

  async addPIPayment(piId: string, amount: number, paymentMethod: string, notes?: string): Promise<PurchaseInvoicePayment> {
    const { data, error } = await supabase.rpc('add_pi_payment', {
      p_pi_id: piId,
      p_amount: amount,
      p_payment_method: paymentMethod ?? 'tunai',
      p_notes: notes ?? null,
    })
    if (error) throw error

    const paymentId = data as string
    const { data: payment, error: payErr } = await supabase
      .from('pi_payments')
      .select('*')
      .eq('id', paymentId)
      .single()
    if (payErr) throw payErr
    return payment as PurchaseInvoicePayment
  },

  // ============================================================
  // PURCHASE RETURNS
  // ============================================================

  async fetchPurchaseReturns(): Promise<PurchaseReturn[]> {
    const { data, error } = await supabase
      .from('purchase_returns')
      .select('*, items:purchase_return_items(*)')
      .order('return_date', { ascending: false })
    if (error) throw error
    return (data || []) as PurchaseReturn[]
  },

  async getPurchaseReturn(id: string): Promise<PurchaseReturn | null> {
    const { data, error } = await supabase
      .from('purchase_returns')
      .select('*, items:purchase_return_items(*)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as PurchaseReturn
  },

  async createPurchaseReturn(input: PurchaseReturnInput): Promise<PurchaseReturn> {
    const { data, error } = await supabase.rpc('create_purchase_return', {
      p_grn_id: input.grn_id ?? null,
      p_pi_id: input.pi_id ?? null,
      p_supplier_id: input.supplier_id ?? null,
      p_supplier_name: input.supplier_name ?? null,
      p_return_date: input.return_date,
      p_reason: input.reason ?? 'cacat',
      p_notes: input.notes ?? null,
      p_items: input.items.map((it) => ({
        product_id: it.product_id ?? null,
        product_name: it.product_name,
        quantity: it.quantity_received ?? 0,
        price: it.price,
        price_buy: 0,
      })),
    })
    if (error) throw error
    return (await this.getPurchaseReturn(data as string))!
  },
}
