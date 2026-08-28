import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { productsServiceAdapter } from '@/services'
import type { Product, ProductInsert, ProductUpdate, ProductWithCategory } from '@/types/database'

export const useProductsStore = defineStore('products', () => {
  const products = ref<ProductWithCategory[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const activeProducts = computed(() =>
    products.value.filter((p) => p.is_active)
  )

  const lowStockProducts = computed(() =>
    products.value.filter((p) => p.stock <= 10 && p.is_active)
  )

  async function fetchProducts(includeInactive = false) {
    loading.value = true
    error.value = null
    try {
      products.value = await productsServiceAdapter.getAll(includeInactive)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getProduct(id: string) {
    loading.value = true
    error.value = null
    try {
      return await productsServiceAdapter.getById(id)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getProductsByCategory(categoryId: string) {
    loading.value = true
    error.value = null
    try {
      return await productsServiceAdapter.getByCategory(categoryId)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getProductBySku(sku: string) {
    loading.value = true
    error.value = null
    try {
      return await productsServiceAdapter.getBySku(sku)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getProductByBarcode(barcode: string) {
    loading.value = true
    error.value = null
    try {
      return await productsServiceAdapter.getByBarcode(barcode)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createProduct(product: ProductInsert) {
    loading.value = true
    error.value = null
    try {
      const newProduct = await productsServiceAdapter.create(product)
      // Optimistic: append ke local array, bukan refetch semua
      products.value.unshift(newProduct)
      return newProduct
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createProducts(productsToInsert: ProductInsert[]) {
    loading.value = true
    error.value = null
    try {
      const newProducts = await productsServiceAdapter.createMany(productsToInsert)
      products.value.unshift(...newProducts)
      return newProducts
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function syncMinimumStocks(
    entries: { product_id: string; minimum_stock: number }[],
  ) {
    // Tidak perlu sync ke Supabase langsung — di SQLite semua lokal.
    // Update langsung minimum_stock di products
    for (const entry of entries) {
      const idx = products.value.findIndex(p => p.id === entry.product_id)
      if (idx !== -1) {
        products.value[idx].minimum_stock = entry.minimum_stock
      }
      // Juga update di database
      try {
        await productsServiceAdapter.update(entry.product_id, { minimum_stock: entry.minimum_stock })
      } catch (e) {
        // non-critical
      }
    }
  }

  async function updateProduct(id: string, product: ProductUpdate) {
    loading.value = true
    error.value = null

    // Simpan state lama untuk rollback
    const index = products.value.findIndex((p) => p.id === id)
    const oldProduct = index !== -1 ? { ...products.value[index] } : null

    try {
      const updatedProduct = await productsServiceAdapter.update(id, product)
      if (index !== -1 && updatedProduct) {
        products.value[index] = updatedProduct
      }
      return updatedProduct
    } catch (e: any) {
      // Rollback: restore old value
      if (oldProduct && index !== -1) {
        products.value[index] = oldProduct as ProductWithCategory
      }
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteProduct(id: string) {
    loading.value = true
    error.value = null

    const index = products.value.findIndex((p) => p.id === id)
    const oldProduct = index !== -1 ? { ...products.value[index] } : null

    try {
      await productsServiceAdapter.delete(id)
      products.value = products.value.filter((p) => p.id !== id)
    } catch (e: any) {
      // Rollback: restore product
      if (oldProduct && index !== -1) {
        products.value.splice(index, 0, oldProduct as ProductWithCategory)
      }
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateStock(id: string, quantity: number) {
    loading.value = true
    error.value = null

    const index = products.value.findIndex((p) => p.id === id)
    const oldStock = index !== -1 ? products.value[index].stock : null

    try {
      const updatedProduct = await productsServiceAdapter.updateStock(id, quantity)
      if (index !== -1) {
        products.value[index].stock = updatedProduct.stock
      }
      return updatedProduct
    } catch (e: any) {
      if (oldStock !== null && index !== -1) {
        products.value[index].stock = oldStock
      }
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function adjustStock(id: string, adjustment: number) {
    const index = products.value.findIndex((p) => p.id === id)
    const oldStock = index !== -1 ? products.value[index].stock : null

    try {
      const updatedProduct = await productsServiceAdapter.adjustStock(id, adjustment)
      if (index !== -1) {
        products.value[index].stock = updatedProduct.stock
      }
      return updatedProduct
    } catch (e: any) {
      if (oldStock !== null && index !== -1) {
        products.value[index].stock = oldStock
      }
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function searchProducts(query: string) {
    loading.value = true
    error.value = null
    try {
      return await productsServiceAdapter.search(query)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchLowStockProducts(threshold = 10) {
    loading.value = true
    error.value = null
    try {
      return await productsServiceAdapter.getLowStock(threshold)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    products,
    activeProducts,
    lowStockProducts,
    loading,
    error,
    fetchProducts,
    getProduct,
    getProductsByCategory,
    getProductBySku,
    getProductByBarcode,
    createProduct,
    createProducts,
    syncMinimumStocks,
    updateProduct,
    deleteProduct,
    updateStock,
    adjustStock,
    searchProducts,
    fetchLowStockProducts
  }
})