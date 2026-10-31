# Arsitektur Project Ucup Kasir

Panduan arsitektur aplikasi Ucup Kasir — pattern, layer, dan alur data.

---

## 📋 Daftar Isi

1. [Overview Arsitektur](#overview-arsitektur)
2. [3-Layer Architecture](#3-layer-architecture)
3. [Alur Data](#alur-data)
4. [Key Principles](#key-principles)
5. [Diagram Arsitektur](#diagram-arsitektur)

---

## Overview Arsitektur

Ucup Kasir menggunakan **3-Layer Architecture** yang clean, maintainable, dan scalable:

```
┌─────────────────────────────────────────────────────┐
│                   Views (UI Layer)                  │  ← User interaction
│              Vue Components + Forms                 │
└─────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────┐
│              Stores (State Management)              │  ← Global state (Pinia)
│           + Composables (Reusable Logic)            │
└─────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────┐
│              Services (Data Access Layer)           │  ← Business logic
│              Supabase API calls + RPC               │
└─────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────┐
│            Supabase (Backend + Database)            │  ← PostgreSQL + Auth + RLS
└─────────────────────────────────────────────────────┘
```

---

## 3-Layer Architecture

### Layer 1: Views (UI Layer)

**Lokasi:** `src/views/` dan `src/components/`

**Tanggung jawab:**
- Render UI
- Handle user input
- Display data dari stores
- Call store actions untuk mutasi data

**Aturan:**
- ❌ **JANGAN** langsung import dari `services/`
- ✅ **GUNAKAN** stores untuk akses data
- ✅ **GUNAKAN** composables untuk reusable logic

**Contoh:**
```vue
<!-- src/views/Products/ProductList.vue -->
<script setup lang="ts">
import { useProductsStore } from '@/stores/products'
import { onMounted } from 'vue'

const productsStore = useProductsStore()

onMounted(async () => {
  await productsStore.fetchProducts() // ✅ Call store action
})
</script>

<template>
  <div>
    <div v-for="product in productsStore.products" :key="product.id">
      {{ product.name }}
    </div>
  </div>
</template>
```

---

### Layer 2: Stores (State Management)

**Lokasi:** `src/stores/`

**Tanggung jawab:**
- Manage global state
- Call services untuk fetch/mutate data
- Cache data untuk performa
- Handle loading & error states

**Aturan:**
- ✅ **CALL** services untuk data operations
- ✅ **CACHE** data yang sering dipakai
- ✅ **HANDLE** loading & error states
- ❌ **JANGAN** langsung akses Supabase (pakai service layer)

**Contoh:**
```typescript
// src/stores/products.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as productService from '@/services/products'
import type { Product } from '@/types/database'

export const useProductsStore = defineStore('products', () => {
  const products = ref<Product[]>([])
  const loading = ref(false)

  async function fetchProducts() {
    loading.value = true
    try {
      products.value = await productService.getProducts() // ✅ Call service
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      loading.value = false
    }
  }

  return { products, loading, fetchProducts }
})
```

---

### Layer 3: Services (Data Access)

**Lokasi:** `src/services/`

**Tanggung jawab:**
- Akses Supabase (CRUD operations)
- Call RPC functions
- Business logic terkait data
- Return typed data

**Aturan:**
- ✅ **EXPORT** functions (bukan class)
- ✅ **THROW** error jika Supabase return error
- ✅ **RETURN** typed data (TypeScript)
- ✅ **USE** RPC functions untuk operasi kompleks

**Contoh:**
```typescript
// src/services/products.ts
import { supabase } from '@/lib/supabase'
import type { Product } from '@/types/database'

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name')
  
  if (error) throw error
  return data || []
}

export async function createProduct(product: Omit<Product, 'id'>): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .single()
  
  if (error) throw error
  return data
}
```

---

## Alur Data

### Read Flow (Fetch Data)

```
User clicks button
       ↓
View calls store.fetchProducts()
       ↓
Store calls productService.getProducts()
       ↓
Service calls supabase.from('products').select()
       ↓
Supabase returns data
       ↓
Service returns typed data to Store
       ↓
Store updates reactive state
       ↓
View automatically re-renders (Vue reactivity)
```

### Write Flow (Mutate Data)

```
User submits form
       ↓
View validates input
       ↓
View calls store.createProduct(formData)
       ↓
Store calls productService.createProduct(formData)
       ↓
Service calls supabase.from('products').insert()
       ↓
Supabase returns inserted data
       ↓
Service returns new product to Store
       ↓
Store updates reactive state (add to array)
       ↓
View shows success toast
```

### Transaction Flow (Complex Operation)

**Penting:** Transaksi menggunakan **RPC function** untuk atomicity!

```
User creates transaction
       ↓
View calls store.createTransaction(transactionData)
       ↓
Store calls transactionService.createTransaction()
       ↓
Service calls supabase.rpc('create_transaction', {...})
       ↓
Supabase executes SQL function:
  - Insert to transactions table
  - Insert to transaction_items table
  - Update stock (products.stock)
  - Insert to stock_movements table
  - All in ONE transaction (atomic)
       ↓
RPC returns transaction ID
       ↓
Service returns ID to Store
       ↓
Store updates state
       ↓
View redirects to transaction detail
```

**Kenapa RPC?**
- ✅ **Atomicity** — semua atau tidak sama sekali
- ✅ **Consistency** — data tetap konsisten
- ✅ **Performance** — 1 roundtrip vs multiple queries
- ✅ **Security** — business logic di server, bukan client

---

## Key Principles

### 1. Separation of Concerns

Setiap layer punya tanggung jawab yang jelas:
- **Views** → UI dan user interaction
- **Stores** → State management
- **Services** → Data access
- **Supabase** → Database

**Benefit:**
- Code lebih maintainable
- Mudah di-test
- Mudah di-debug
- Mudah diganti (misal: ganti backend)

### 2. Single Source of Truth

State disimpan di **Pinia stores** sebagai single source of truth.

**Aturan:**
- ❌ **JANGAN** simpan state di component (except local UI state)
- ✅ **GUNAKAN** stores untuk shared state
- ✅ **SUBSCRIBE** ke store dari multiple components

**Contoh:**
```typescript
// ✅ Good: State di store
const productsStore = useProductsStore()
const products = productsStore.products // Reactive

// ❌ Bad: State di component
const products = ref([])
// Multiple components punya copy berbeda → tidak sync
```

### 3. Type Safety

Full TypeScript dengan strict mode.

**Benefit:**
- Catch errors saat development
- Autocomplete di IDE
- Refactoring lebih aman
- Self-documenting code

**Aturan:**
- ✅ **DEFINE** types untuk semua data
- ✅ **IMPORT** types dari `@/types/database`
- ❌ **JANGAN** pakai `any`

### 4. Error Logging

Semua error Supabase terekam otomatis ke Event Log.

**Cara kerja:**
- Supabase client dibungkus dengan Proxy
- Setiap error di-intercept dan di-log
- Log bisa dilihat di `/settings/event-log`

**Benefit:**
- Debugging lebih mudah
- Track production issues
- Know what went wrong (table, operation, filters)

### 5. Offline Support (Android)

Android native app pakai SQLite untuk offline mode.

**Flow:**
1. User offline → data disimpan di SQLite lokal
2. User online → sync ke Supabase
3. Conflict resolution (last-write-wins)

**Status:** Masih dalam development.

---

## Diagram Arsitektur

### Component Hierarchy

```
App.vue (Root)
├── Header.vue
├── Sidebar.vue
└── Router View
    ├── Dashboard (Ecommerce.vue)
    │   ├── StatCard.vue (x4)
    │   ├── SalesChart.vue
    │   └── RecentTransactions.vue
    │
    ├── Products
    │   ├── ProductList.vue
    │   │   ├── DataTable.vue
    │   │   └── ProductCard.vue (x many)
    │   ├── AddProduct.vue
    │   │   └── ProductForm.vue
    │   └── ProductDetail.vue
    │
    ├── Transactions
    │   ├── TransactionList.vue
    │   ├── AddTransaction.vue
    │   │   ├── CustomerSelect.vue
    │   │   ├── ProductSearch.vue
    │   │   └── TransactionForm.vue
    │   └── TransactionDetail.vue
    │       └── InvoicePrint.vue
    │
    └── [Other modules...]
```

### Data Flow Diagram

```
┌──────────────────────────────────────────────────────┐
│                     Browser/App                      │
└──────────────────────────────────────────────────────┘
                          │
                          │ HTTP/WebSocket
                          ↓
┌──────────────────────────────────────────────────────┐
│                   Supabase Cloud                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐    │
│  │   Auth     │  │    API     │  │  Realtime  │    │
│  └────────────┘  └────────────┘  └────────────┘    │
│                          │                           │
│                          ↓                           │
│  ┌──────────────────────────────────────────────┐  │
│  │           PostgreSQL Database                 │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐   │  │
│  │  │  Tables  │  │   RLS    │  │Functions │   │  │
│  │  └──────────┘  └──────────┘  └──────────┘   │  │
│  └──────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

### State Management Flow

```
┌─────────────────────────────────────────────────────┐
│                    Pinia Stores                     │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │   Auth   │  │ Products │  │ Customers│        │
│  └──────────┘  └──────────┘  └──────────┘        │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  Transactions │ Stock  │  │  Finance │        │
│  └──────────┘  └──────────┘  └──────────┘        │
│                                                     │
│  [14 more stores...]                               │
└─────────────────────────────────────────────────────┘
                        ↕
┌─────────────────────────────────────────────────────┐
│                   Vue Components                    │
│              (Subscribe to store state)             │
└─────────────────────────────────────────────────────┘
```

---

## Module Architecture

### Transaction Module (Contoh)

```
views/Transactions/
├── TransactionList.vue         → Display transactions
├── AddTransaction.vue          → Create transaction form
├── TransactionDetail.vue       → View transaction detail
└── InvoicePage.vue             → Print invoice

stores/transactions.ts          → State management
  - transactions: Transaction[]
  - selectedTransaction: Transaction | null
  - loading: boolean
  - fetchTransactions()
  - createTransaction()
  - getTransactionById()

services/transactions.ts        → Data access
  - getTransactions()
  - createTransaction() → calls RPC
  - getTransactionById()
  - voidTransaction() → calls RPC

Supabase:
  - transactions table
  - transaction_items table
  - create_transaction() RPC function
  - void_transaction() RPC function
```

### Flow dalam Module:

```
1. User opens /transactions
   → TransactionList.vue mounted
   → calls store.fetchTransactions()
   → store calls service.getTransactions()
   → service queries Supabase
   → data returned and displayed

2. User clicks "Tambah Transaksi"
   → Navigate to /transactions/add
   → AddTransaction.vue rendered
   → User fills form
   → Submit form
   → calls store.createTransaction()
   → store calls service.createTransaction()
   → service calls supabase.rpc('create_transaction')
   → RPC executes (atomic)
   → Success → redirect to /transactions/{id}
```

---

## Best Practices

### ✅ DO:

1. **Follow layer pattern** — View → Store → Service → Supabase
2. **Use TypeScript types** — Type safety untuk semua data
3. **Handle errors gracefully** — Show toast, log error
4. **Use composables for reusable logic** — Toast, confirm, PDF export
5. **Use custom form controls** — DateField, SelectField
6. **Use RPC for complex operations** — Transactions, returns
7. **Cache data in stores** — Avoid redundant API calls

### ❌ DON'T:

1. **Don't access Supabase directly from views** — Use stores
2. **Don't use native dialogs** — Use ConfirmDialog + useConfirm()
3. **Don't use native form controls** — Use DateField, SelectField
4. **Don't return `{data, error}` from services** — Throw error
5. **Don't use `any` type** — Define proper types
6. **Don't insert transactions directly** — Use RPC functions
7. **Don't silently catch errors** — Always provide feedback

---

## Anti-Patterns (Hindari!)

### ❌ Anti-Pattern 1: Direct Supabase Access in View

```vue
<!-- ❌ BAD -->
<script setup>
import { supabase } from '@/lib/supabase'

const { data } = await supabase.from('products').select()
</script>
```

**Kenapa buruk:**
- Melanggar separation of concerns
- Susah di-test
- Code duplication
- No caching
- No error handling centralized

### ❌ Anti-Pattern 2: Service Returns `{data, error}`

```typescript
// ❌ BAD
export async function getProducts() {
  return await supabase.from('products').select()
}

// Caller harus check error setiap kali
const { data, error } = await getProducts()
if (error) {
  // Handle error
}
```

**Kenapa buruk:**
- Error handling tersebar di mana-mana
- Caller bisa lupa check error
- Not idiomatic TypeScript (should throw)

**✅ Good:**
```typescript
export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select()
  if (error) throw error // ✅ Throw, let caller catch
  return data || []
}
```

### ❌ Anti-Pattern 3: Insert Transaction Langsung

```typescript
// ❌ BAD: Insert transaction directly
await supabase.from('transactions').insert({...})
await supabase.from('transaction_items').insert([...])
await supabase.from('products').update({...}) // Update stock
```

**Kenapa buruk:**
- Tidak atomic — bisa partial success
- Data bisa inconsistent
- Multiple roundtrips (slow)
- Security risk (client side logic)

**✅ Good:**
```typescript
// ✅ Use RPC function (atomic, safe, fast)
await supabase.rpc('create_transaction', {
  customer_id,
  items,
  payment_method
})
```

---

## Resources

- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)
- [Pinia Docs](https://pinia.vuejs.org/)
- [Supabase Docs](https://supabase.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

---

**Next:** Baca dokumentasi lainnya:
- `FOLDER_STRUCTURE.md` — Detail struktur folder
- `SERVICES_GUIDE.md` — Panduan services layer
- `STORES_GUIDE.md` — Panduan stores layer
- `VIEWS_GUIDE.md` — Panduan views layer
- `FLOW_DIAGRAMS.md` — Diagram alur lengkap

**Last updated:** 2026-10-30
