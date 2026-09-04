import { defineStore } from 'pinia'
import { ref } from 'vue'
import { purchasingServiceAdapter } from '@/services'
import type {
  Supplier,
  SupplierInsert,
  SupplierUpdate,
  SupplierWithStats,
  PurchaseOrder,
  PurchaseOrderInput,
  GoodsReceipt,
  GoodsReceiptInput,
  PurchaseInvoice,
  PurchaseInvoiceInput,
  PurchaseInvoicePayment,
  PurchaseReturn,
  PurchaseReturnInput,
} from '@/types/database'

// ============================================================
// Store: Modul Pembelian Barang
// - Master Supplier
// - Purchase Orders (PO)
// - Goods Receipts (GRN)
// - Purchase Invoices (PI) + pembayaran
// - Purchase Returns (Retur Pembelian)
// ============================================================

export const usePurchasingStore = defineStore('purchasing', () => {
  // ============================================================
  // State
  // ============================================================
  const suppliers = ref<Supplier[]>([])
  const suppliersWithStats = ref<SupplierWithStats[]>([])
  const purchaseOrders = ref<PurchaseOrder[]>([])
  const goodsReceipts = ref<GoodsReceipt[]>([])
  const purchaseInvoices = ref<PurchaseInvoice[]>([])
  const purchaseReturns = ref<PurchaseReturn[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ============================================================
  // SUPPLIERS
  // ============================================================

  async function fetchSuppliers() {
    loading.value = true
    error.value = null
    try {
      suppliers.value = await purchasingServiceAdapter.fetchSuppliers()
      return suppliers.value
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchSuppliersWithStats() {
    loading.value = true
    error.value = null
    try {
      suppliersWithStats.value = await purchasingServiceAdapter.fetchSuppliersWithStats()
      return suppliersWithStats.value
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createSupplier(input: SupplierInsert) {
    loading.value = true
    error.value = null
    try {
      const created = await purchasingServiceAdapter.createSupplier(input)
      suppliers.value.push(created)
      return created
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateSupplier(id: string, updates: SupplierUpdate) {
    loading.value = true
    error.value = null

    const index = suppliers.value.findIndex((s) => s.id === id)
    const old = index !== -1 ? { ...suppliers.value[index] } : null

    try {
      const updated = await purchasingServiceAdapter.updateSupplier(id, updates)
      if (index !== -1) suppliers.value[index] = updated
      return updated
    } catch (e: any) {
      if (old && index !== -1) suppliers.value[index] = old
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteSupplier(id: string) {
    loading.value = true
    error.value = null

    const index = suppliers.value.findIndex((s) => s.id === id)
    const old = index !== -1 ? { ...suppliers.value[index] } : null

    try {
      await purchasingServiceAdapter.deleteSupplier(id)
      suppliers.value = suppliers.value.filter((s) => s.id !== id)
      suppliersWithStats.value = suppliersWithStats.value.filter((s) => s.id !== id)
    } catch (e: any) {
      if (old && index !== -1) suppliers.value.splice(index, 0, old)
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  // ============================================================
  // PURCHASE ORDERS
  // ============================================================

  async function fetchPurchaseOrders() {
    loading.value = true
    error.value = null
    try {
      purchaseOrders.value = await purchasingServiceAdapter.fetchPurchaseOrders()
      return purchaseOrders.value
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getPurchaseOrder(id: string): Promise<PurchaseOrder | null> {
    loading.value = true
    error.value = null
    try {
      return await purchasingServiceAdapter.getPurchaseOrder(id)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createPurchaseOrder(input: PurchaseOrderInput) {
    loading.value = true
    error.value = null
    try {
      const created = await purchasingServiceAdapter.createPurchaseOrder(input)
      await fetchPurchaseOrders()
      return created
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updatePurchaseOrderStatus(id: string, status: PurchaseOrder['status']) {
    loading.value = true
    error.value = null
    try {
      await purchasingServiceAdapter.updatePurchaseOrderStatus(id, status)
      await fetchPurchaseOrders()
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deletePurchaseOrder(id: string) {
    loading.value = true
    error.value = null
    try {
      await purchasingServiceAdapter.deletePurchaseOrder(id)
      purchaseOrders.value = purchaseOrders.value.filter((p) => p.id !== id)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  // ============================================================
  // GOODS RECEIPTS (GRN)
  // ============================================================

  async function fetchGoodsReceipts() {
    loading.value = true
    error.value = null
    try {
      goodsReceipts.value = await purchasingServiceAdapter.fetchGoodsReceipts()
      return goodsReceipts.value
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getGoodsReceipt(id: string): Promise<GoodsReceipt | null> {
    loading.value = true
    error.value = null
    try {
      return await purchasingServiceAdapter.getGoodsReceipt(id)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createGoodsReceipt(input: GoodsReceiptInput) {
    loading.value = true
    error.value = null
    try {
      const created = await purchasingServiceAdapter.createGoodsReceipt(input)
      await fetchGoodsReceipts()
      await fetchPurchaseOrders()
      return created
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  // ============================================================
  // PURCHASE INVOICES
  // ============================================================

  async function fetchPurchaseInvoices() {
    loading.value = true
    error.value = null
    try {
      purchaseInvoices.value = await purchasingServiceAdapter.fetchPurchaseInvoices()
      return purchaseInvoices.value
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getPurchaseInvoice(id: string): Promise<PurchaseInvoice | null> {
    loading.value = true
    error.value = null
    try {
      return await purchasingServiceAdapter.getPurchaseInvoice(id)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createPurchaseInvoice(input: PurchaseInvoiceInput) {
    loading.value = true
    error.value = null
    try {
      const created = await purchasingServiceAdapter.createPurchaseInvoice(input)
      await fetchPurchaseInvoices()
      return created
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function addPIPayment(piId: string, amount: number, paymentMethod: string, notes?: string): Promise<PurchaseInvoicePayment> {
    loading.value = true
    error.value = null
    try {
      const payment = await purchasingServiceAdapter.addPIPayment(piId, amount, paymentMethod, notes)
      await fetchPurchaseInvoices()
      return payment
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  // ============================================================
  // PURCHASE RETURNS
  // ============================================================

  async function fetchPurchaseReturns() {
    loading.value = true
    error.value = null
    try {
      purchaseReturns.value = await purchasingServiceAdapter.fetchPurchaseReturns()
      return purchaseReturns.value
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getPurchaseReturn(id: string): Promise<PurchaseReturn | null> {
    loading.value = true
    error.value = null
    try {
      return await purchasingServiceAdapter.getPurchaseReturn(id)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createPurchaseReturn(input: PurchaseReturnInput) {
    loading.value = true
    error.value = null
    try {
      const created = await purchasingServiceAdapter.createPurchaseReturn(input)
      await fetchPurchaseReturns()
      await fetchGoodsReceipts()
      return created
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    suppliers,
    suppliersWithStats,
    purchaseOrders,
    goodsReceipts,
    purchaseInvoices,
    purchaseReturns,
    loading,
    error,
    fetchSuppliers,
    fetchSuppliersWithStats,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    fetchPurchaseOrders,
    getPurchaseOrder,
    createPurchaseOrder,
    updatePurchaseOrderStatus,
    deletePurchaseOrder,
    fetchGoodsReceipts,
    getGoodsReceipt,
    createGoodsReceipt,
    fetchPurchaseInvoices,
    getPurchaseInvoice,
    createPurchaseInvoice,
    addPIPayment,
    fetchPurchaseReturns,
    getPurchaseReturn,
    createPurchaseReturn,
  }
})
