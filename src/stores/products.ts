import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { productsService } from '@/services/products'
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
      products.value = await productsService.getAll(includeInactive)
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
      return await productsService.getById(id)
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
      return await productsService.getByCategory(categoryId)
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
      return await productsService.getBySku(sku)
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
      return await productsService.getByBarcode(barcode)
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
      const newProduct = await productsService.create(product)
      await fetchProducts()
      return newProduct
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateProduct(id: string, product: ProductUpdate) {
    loading.value = true
    error.value = null
    try {
      const updatedProduct = await productsService.update(id, product)
      const index = products.value.findIndex((p) => p.id === id)
      if (index !== -1) {
        const fullProduct = await productsService.getById(id)
        if (fullProduct) {
          products.value[index] = fullProduct
        }
      }
      return updatedProduct
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteProduct(id: string) {
    loading.value = true
    error.value = null
    try {
      await productsService.delete(id)
      products.value = products.value.filter((p) => p.id !== id)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateStock(id: string, quantity: number) {
    loading.value = true
    error.value = null
    try {
      const updatedProduct = await productsService.updateStock(id, quantity)
      const index = products.value.findIndex((p) => p.id === id)
      if (index !== -1) {
        products.value[index].stock = updatedProduct.stock
      }
      return updatedProduct
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function adjustStock(id: string, adjustment: number) {
    loading.value = true
    error.value = null
    try {
      const updatedProduct = await productsService.adjustStock(id, adjustment)
      const index = products.value.findIndex((p) => p.id === id)
      if (index !== -1) {
        products.value[index].stock = updatedProduct.stock
      }
      return updatedProduct
    } catch (e: any) {
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
      return await productsService.search(query)
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
      return await productsService.getLowStock(threshold)
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
    updateProduct,
    deleteProduct,
    updateStock,
    adjustStock,
    searchProducts,
    fetchLowStockProducts
  }
})
