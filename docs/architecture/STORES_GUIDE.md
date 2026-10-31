# Stores Layer Guide

Panduan lengkap untuk memahami dan menggunakan stores layer (Pinia) di Ucup Kasir.

---

## 📋 Daftar Isi

1. [Apa itu Stores Layer?](#apa-itu-stores-layer)
2. [Store Pattern](#store-pattern)
3. [Daftar Stores](#daftar-stores)
4. [State Management](#state-management)
5. [Actions](#actions)
6. [Getters](#getters)
7. [Best Practices](#best-practices)

---

## Apa itu Stores Layer?

Stores layer adalah **State Management Layer** menggunakan Pinia yang bertanggung jawab untuk:
- Manage global state
- Call services untuk fetch/mutate data
- Cache data untuk performa
- Handle loading & error states

**Posisi di arsitektur:**
```
Views → Stores → Services → Supabase
```

**Tanggung jawab:**
- ✅ Manage reactive state (products, transactions, dll)
- ✅ Call services untuk data operations
- ✅ Cache data untuk avoid redundant API calls
- ✅ Provide computed values (getters)
- ❌ TIDAK akses Supabase langsung (pakai service layer)
- ❌ TIDAK render UI (itu tanggung jawab views)

---

## Store Pattern

Semua store menggunakan **Composition API pattern** dengan Pinia:

### Standard Pattern

```typescript
// src/stores/example.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as exampleService from '@/services/example'
import type { Item } from '@/types/database'

export const useExampleStore = defineStore('example', () => {
  // ============================================================
  // STATE
  // ============================================================
  const items = ref<Item[]>([])
  const selectedItem = ref<Item | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ============================================================
  // GETTERS (Computed)
  // ============================================================
  const itemCount = computed(() => items.value.length)
  
  const hasItems = computed(() => items.value.length > 0)
  
  const sortedItems = computed(() => {
    return [...items.value].sort((a, b) => a.name.localeCompare(b.name))
  })

  // ============================================================
  // ACTIONS
  // ============================================================
  
  // Fetch all items
  async function fetchItems() {
    loading.value = true
    error.value = null
    try {
      items.value = await exampleService.getItems()
    } catch (e) {
      error.value = (e as Error).message
      console.error('Failed to fetch items:', e)
    } finally {
      loading.value = false
    }
  }

  // Get item by ID
  async function getItemById(id: string) {
    loading.value = true
    error.value = null
    try {
      const item = await exampleService.getItemById(id)
      selectedItem.value = item
      return item
    } catch (e) {
      error.value = (e as Error).message
      console.error('Failed to get item:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  // Create item
  async function createItem(item: Omit<Item, 'id'>) {
    loading.value = true
    error.value = null
    try {
      const newItem = await exampleService.createItem(item)
      items.value.push(newItem)
      return newItem
    } catch (e) {
      error.value = (e as Error).message
      console.error('Failed to create item:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  // Update item
  async function updateItem(id: string, updates: Partial<Item>) {
    loading.value = true
    error.value = null
    try {
      const updated = await exampleService.updateItem(id, updates)
      
      // Update in local state
      const index = items.value.findIndex(i => i.id === id)
      if (index !== -1) {
        items.value[index] = updated
      }
      
      // Update selected if it's the same item
      if (selectedItem.value?.id === id) {
        selectedItem.value = updated
      }
      
      return updated
    } catch (e) {
      error.value = (e as Error).message
      console.error('Failed to update item:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  // Delete item
  async function deleteItem(id: string) {
    loading.value = true
    error.value = null
    try {
      await exampleService.deleteItem(id)
      
      // Remove from local state
      items.value = items.value.filter(i => i.id !== id)
      
      // Clear selected if it's the deleted item
      if (selectedItem.value?.id === id) {
        selectedItem.value = null
      }
    } catch (e) {
      error.value = (e as Error).message
      console.error('Failed to delete item:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  // Clear error
  function clearError() {
    error.value = null
  }

  // ============================================================
  // RETURN (Public API)
  // ============================================================
  return {
    // State
    items,
    selectedItem,
    loading,
    error,
    
    // Getters
    itemCount,
    hasItems,
    sortedItems,
    
    // Actions
    fetchItems,
    getItemById,
    createItem,
    updateItem,
    deleteItem,
    clearError,
  }
})
```

### Key Points:

1. **Use Composition API** — `defineStore(name, () => {...})`
2. **Group code by concern** — State, Getters, Actions
3. **Return public API** — Only expose what views need
4. **Handle loading & error** — Always set loading state
5. **Update local state after mutations** — Keep state in sync
6. **Call services for data** — Never access Supabase directly

---

## Daftar Stores

Project punya **17 stores**:

| Store | Purpose | Key State |
|-------|---------|-----------|
| **auth.ts** | Authentication | `user`, `session`, `isAuthenticated` |
| **products.ts** | Products management | `products`, `categories`, `loading` |
| **transactions.ts** | Transactions | `transactions`, `selectedTransaction` |
| **customers.ts** | Customers | `customers`, `loading` |
| **stock.ts** | Stock management | `stockMovements`, `lowStockProducts` |
| **finance.ts** | Finance/accounting | `chartOfAccounts`, `journals`, `ledger` |
| **purchasing.ts** | Purchasing | `purchaseOrders`, `suppliers`, `goodsReceipts` |
| **hr.ts** | HR & payroll | `employees`, `payrollSlips`, `loans` |
| **shipping.ts** | Shipping | `deliveryOrders`, `vehicles` |
| **priceMatrix.ts** | Price matrix | `priceTiers`, `customerPrices`, `groupPrices` |
| **salesReport.ts** | Sales reports | `reportData`, `dateRange` |
| **salesReportEnhanced.ts** | Enhanced reports | `enhancedData` |
| **returns.ts** | Product returns | `returns`, `loading` |
| **categories.ts** | Categories | `categories`, `loading` |
| **notifications.ts** | Notifications | `notifications`, `unreadCount` |
| **storeSettings.ts** | Store settings | `settings`, `loading` |
| **sync.ts** | Sync state | `lastSync`, `pendingChanges` |

---

## State Management

### 1. Reactive State with `ref()`

```typescript
import { ref } from 'vue'

// Primitive values
const loading = ref(false)
const error = ref<string | null>(null)
const count = ref(0)

// Objects
const user = ref<User | null>(null)

// Arrays
const products = ref<Product[]>([])
```

### 2. Computed State (Getters)

```typescript
import { computed } from 'vue'

// Simple computed
const productCount = computed(() => products.value.length)

// Computed with logic
const lowStockProducts = computed(() => {
  return products.value.filter(p => p.stock < p.min_stock)
})

// Computed with parameters (return function)
const getProductById = computed(() => {
  return (id: string) => products.value.find(p => p.id === id)
})
```

### 3. State Initialization

```typescript
export const useProductsStore = defineStore('products', () => {
  const products = ref<Product[]>([])
  const categories = ref<Category[]>([])
  const loading = ref(false)
  
  // Initialize on store creation (optional)
  async function initialize() {
    if (products.value.length === 0) {
      await fetchProducts()
    }
    if (categories.value.length === 0) {
      await fetchCategories()
    }
  }
  
  return { products, categories, loading, initialize }
})
```

---

## Actions

### 1. Fetch Data (Read)

```typescript
async function fetchProducts() {
  loading.value = true
  error.value = null
  
  try {
    products.value = await productService.getProducts()
  } catch (e) {
    error.value = (e as Error).message
    console.error('Failed to fetch products:', e)
    // Don't throw — let view handle via error state
  } finally {
    loading.value = false
  }
}
```

### 2. Create Data

```typescript
async function createProduct(product: Omit<Product, 'id'>) {
  loading.value = true
  error.value = null
  
  try {
    const newProduct = await productService.createProduct(product)
    
    // Add to local state
    products.value.push(newProduct)
    
    return newProduct
  } catch (e) {
    error.value = (e as Error).message
    console.error('Failed to create product:', e)
    throw e // Throw so view can handle (show toast, etc)
  } finally {
    loading.value = false
  }
}
```

### 3. Update Data

```typescript
async function updateProduct(id: string, updates: Partial<Product>) {
  loading.value = true
  error.value = null
  
  try {
    const updated = await productService.updateProduct(id, updates)
    
    // Update in local state
    const index = products.value.findIndex(p => p.id === id)
    if (index !== -1) {
      products.value[index] = updated
    }
    
    return updated
  } catch (e) {
    error.value = (e as Error).message
    console.error('Failed to update product:', e)
    throw e
  } finally {
    loading.value = false
  }
}
```

### 4. Delete Data

```typescript
async function deleteProduct(id: string) {
  loading.value = true
  error.value = null
  
  try {
    await productService.deleteProduct(id)
    
    // Remove from local state
    products.value = products.value.filter(p => p.id !== id)
  } catch (e) {
    error.value = (e as Error).message
    console.error('Failed to delete product:', e)
    throw e
  } finally {
    loading.value = false
  }
}
```

### 5. Complex Operations

```typescript
async function createTransaction(data: TransactionData) {
  loading.value = true
  error.value = null
  
  try {
    // Call RPC via service
    const transactionId = await transactionService.createTransaction(data)
    
    // Fetch updated data
    await fetchTransactions()
    
    // Update related stores if needed
    const productsStore = useProductsStore()
    await productsStore.fetchProducts() // Update stock
    
    return transactionId
  } catch (e) {
    error.value = (e as Error).message
    console.error('Failed to create transaction:', e)
    throw e
  } finally {
    loading.value = false
  }
}
```

---

## Getters

### 1. Simple Getters

```typescript
// Count
const productCount = computed(() => products.value.length)

// Boolean check
const hasProducts = computed(() => products.value.length > 0)

// Sum/aggregate
const totalStock = computed(() => {
  return products.value.reduce((sum, p) => sum + p.stock, 0)
})
```

### 2. Filtered Getters

```typescript
// Filter by condition
const lowStockProducts = computed(() => {
  return products.value.filter(p => p.stock < p.min_stock)
})

// Filter by category
const getProductsByCategory = computed(() => {
  return (categoryId: string) => {
    return products.value.filter(p => p.category_id === categoryId)
  }
})
```

### 3. Sorted Getters

```typescript
const sortedProducts = computed(() => {
  return [...products.value].sort((a, b) => a.name.localeCompare(b.name))
})

const productsSortedByStock = computed(() => {
  return [...products.value].sort((a, b) => a.stock - b.stock)
})
```

### 4. Search Getters

```typescript
const searchProducts = computed(() => {
  return (query: string) => {
    const q = query.toLowerCase()
    return products.value.filter(p => 
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q)
    )
  }
})
```

---

## Best Practices

### ✅ DO:

#### 1. Use Composition API Pattern

```typescript
// ✅ GOOD
export const useProductsStore = defineStore('products', () => {
  const products = ref<Product[]>([])
  
  async function fetchProducts() {
    // ...
  }
  
  return { products, fetchProducts }
})
```

#### 2. Handle Loading & Error States

```typescript
// ✅ GOOD
async function fetchProducts() {
  loading.value = true
  error.value = null
  
  try {
    products.value = await productService.getProducts()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}
```

#### 3. Update Local State After Mutations

```typescript
// ✅ GOOD: Update local state
async function createProduct(product: Omit<Product, 'id'>) {
  const newProduct = await productService.createProduct(product)
  products.value.push(newProduct) // ✅ Update local
  return newProduct
}
```

#### 4. Use Other Stores When Needed

```typescript
// ✅ GOOD: Use other stores
async function createTransaction(data: TransactionData) {
  const txnId = await transactionService.createTransaction(data)
  
  // Update stock in products store
  const productsStore = useProductsStore()
  await productsStore.fetchProducts()
  
  return txnId
}
```

#### 5. Type Everything

```typescript
// ✅ GOOD: Typed
const products = ref<Product[]>([])
const selectedProduct = ref<Product | null>(null)

async function fetchProducts(): Promise<void> {
  // ...
}
```

---

### ❌ DON'T:

#### 1. Don't Access Supabase Directly

```typescript
// ❌ BAD: Accessing Supabase from store
import { supabase } from '@/lib/supabase'

async function fetchProducts() {
  const { data } = await supabase.from('products').select() // ❌
  products.value = data
}

// ✅ GOOD: Use service
async function fetchProducts() {
  products.value = await productService.getProducts() // ✅
}
```

#### 2. Don't Forget Error Handling

```typescript
// ❌ BAD: No error handling
async function fetchProducts() {
  products.value = await productService.getProducts()
  // What if it throws? ❌
}

// ✅ GOOD: Handle errors
async function fetchProducts() {
  try {
    products.value = await productService.getProducts()
  } catch (e) {
    error.value = (e as Error).message
  }
}
```

#### 3. Don't Forget Loading States

```typescript
// ❌ BAD: No loading state
async function fetchProducts() {
  products.value = await productService.getProducts()
}

// ✅ GOOD: Set loading
async function fetchProducts() {
  loading.value = true
  try {
    products.value = await productService.getProducts()
  } finally {
    loading.value = false
  }
}
```

#### 4. Don't Mutate State Directly (outside actions)

```typescript
// ❌ BAD: Mutate from view
const productsStore = useProductsStore()
productsStore.products.push(newProduct) // ❌ Direct mutation

// ✅ GOOD: Use action
const productsStore = useProductsStore()
await productsStore.createProduct(newProduct) // ✅
```

---

## Usage in Views

### 1. Basic Usage

```vue
<script setup lang="ts">
import { useProductsStore } from '@/stores/products'
import { onMounted } from 'vue'

const productsStore = useProductsStore()

onMounted(async () => {
  await productsStore.fetchProducts()
})
</script>

<template>
  <div>
    <div v-if="productsStore.loading">Loading...</div>
    <div v-else-if="productsStore.error">Error: {{ productsStore.error }}</div>
    <div v-else>
      <div v-for="product in productsStore.products" :key="product.id">
        {{ product.name }}
      </div>
    </div>
  </div>
</template>
```

### 2. Using Getters

```vue
<script setup lang="ts">
import { useProductsStore } from '@/stores/products'

const productsStore = useProductsStore()
</script>

<template>
  <div>
    <p>Total: {{ productsStore.productCount }}</p>
    
    <div v-if="productsStore.hasProducts">
      <div v-for="product in productsStore.sortedProducts" :key="product.id">
        {{ product.name }}
      </div>
    </div>
    <div v-else>
      No products
    </div>
  </div>
</template>
```

### 3. Calling Actions

```vue
<script setup lang="ts">
import { useProductsStore } from '@/stores/products'
import { useToast } from '@/composables/useToast'
import { ref } from 'vue'

const productsStore = useProductsStore()
const toast = useToast()

const form = ref({
  name: '',
  price: 0,
})

async function handleSubmit() {
  try {
    await productsStore.createProduct(form.value)
    toast.show('Product created', 'success')
    form.value = { name: '', price: 0 }
  } catch (error) {
    toast.show('Failed to create product', 'error')
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <input v-model="form.name" />
    <input v-model.number="form.price" />
    <button type="submit" :disabled="productsStore.loading">
      Submit
    </button>
  </form>
</template>
```

---

## Real Examples from Project

### 1. Auth Store

```typescript
// src/stores/auth.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const session = ref<Session | null>(null)

  const isAuthenticated = computed(() => !!user.value)

  async function initialize() {
    const { data } = await supabase.auth.getSession()
    session.value = data.session
    user.value = data.session?.user ?? null
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) throw error
    
    session.value = data.session
    user.value = data.user
  }

  async function signOut() {
    await supabase.auth.signOut()
    session.value = null
    user.value = null
  }

  return {
    user,
    session,
    isAuthenticated,
    initialize,
    signIn,
    signOut,
  }
})
```

### 2. Products Store (Simplified)

```typescript
// src/stores/products.ts (simplified)
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as productService from '@/services/products'
import type { Product } from '@/types/database'

export const useProductsStore = defineStore('products', () => {
  const products = ref<Product[]>([])
  const loading = ref(false)

  const productCount = computed(() => products.value.length)
  
  const lowStockProducts = computed(() => {
    return products.value.filter(p => p.stock < (p.min_stock || 10))
  })

  async function fetchProducts() {
    loading.value = true
    try {
      products.value = await productService.getProducts()
    } finally {
      loading.value = false
    }
  }

  async function createProduct(product: Omit<Product, 'id'>) {
    const newProduct = await productService.createProduct(product)
    products.value.push(newProduct)
    return newProduct
  }

  return {
    products,
    loading,
    productCount,
    lowStockProducts,
    fetchProducts,
    createProduct,
  }
})
```

---

## Resources

- [Pinia Docs](https://pinia.vuejs.org/)
- [Vue Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)
- [Vue Reactivity](https://vuejs.org/guide/essentials/reactivity-fundamentals.html)

---

**Next:** Baca dokumentasi lainnya:
- `VIEWS_GUIDE.md` — Panduan views layer
- `COMPOSABLES_GUIDE.md` — Panduan composables

**Last updated:** 2026-10-30
