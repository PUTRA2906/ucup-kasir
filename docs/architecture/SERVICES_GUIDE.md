# Services Layer Guide

Panduan lengkap untuk memahami dan menggunakan services layer di Ucup Kasir.

---

## 📋 Daftar Isi

1. [Apa itu Services Layer?](#apa-itu-services-layer)
2. [Service Pattern](#service-pattern)
3. [Daftar Services](#daftar-services)
4. [CRUD Operations](#crud-operations)
5. [RPC Functions](#rpc-functions)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)

---

## Apa itu Services Layer?

Services layer adalah **Data Access Layer** yang bertanggung jawab untuk:
- Akses Supabase (CRUD operations)
- Call RPC functions
- Business logic terkait data
- Return typed data

**Posisi di arsitektur:**
```
Views → Stores → Services → Supabase
```

**Tanggung jawab:**
- ✅ Akses database via Supabase client
- ✅ Call RPC functions untuk operasi kompleks
- ✅ Transform data jika perlu
- ✅ Throw error jika Supabase return error
- ❌ TIDAK handle UI state (loading, error messages)
- ❌ TIDAK cache data (itu tanggung jawab store)

---

## Service Pattern

Semua service mengikuti pattern yang sama:

### Standard Pattern

```typescript
// src/services/example.ts
import { supabase } from '@/lib/supabase'
import type { Table } from '@/types/database'

// GET — fetch data
export async function getItems(): Promise<Table[]> {
  const { data, error } = await supabase
    .from('table_name')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

// GET by ID
export async function getItemById(id: string): Promise<Table | null> {
  const { data, error } = await supabase
    .from('table_name')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

// CREATE
export async function createItem(item: Omit<Table, 'id'>): Promise<Table> {
  const { data, error } = await supabase
    .from('table_name')
    .insert(item)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// UPDATE
export async function updateItem(id: string, updates: Partial<Table>): Promise<Table> {
  const { data, error } = await supabase
    .from('table_name')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// DELETE
export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('table_name')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// RPC — complex operation
export async function complexOperation(params: any): Promise<any> {
  const { data, error } = await supabase.rpc('function_name', params)
  if (error) throw error
  return data
}
```

### Key Points:

1. **Export functions** (bukan class)
2. **Throw error** jika Supabase return error (jangan return `{data, error}`)
3. **Type return values** dengan TypeScript
4. **Use `.select()` after INSERT/UPDATE** untuk get inserted/updated data
5. **Use `.single()` untuk single result**
6. **Use `.order()` untuk sorting**

---

## Daftar Services

Project punya **20 services**:

| Service | Purpose | Key Functions |
|---------|---------|---------------|
| **products.ts** | Product CRUD | `getProducts()`, `createProduct()`, `updateProduct()`, `deleteProduct()` |
| **categories.ts** | Category CRUD | `getCategories()`, `createCategory()`, `updateCategory()`, `deleteCategory()` |
| **customers.ts** | Customer CRUD | `getCustomers()`, `createCustomer()`, `updateCustomer()`, `deleteCustomer()` |
| **transactions.ts** | Transaction operations | `createTransaction()` (RPC), `getTransactions()`, `voidTransaction()` (RPC) |
| **returns.ts** | Product returns | `createReturn()` (RPC), `getReturns()` |
| **stock.ts** | Stock management | `getStockMovements()`, `adjustStock()`, `getStockByProduct()` |
| **priceMatrixService.ts** | Price calculation | `calculatePrice()` — 4 priority levels |
| **notifications.ts** | Notifications | `getNotifications()`, `markAsRead()`, `createNotification()` |
| **storeSettings.ts** | Store settings | `getStoreSettings()`, `updateStoreSettings()` |
| **finance.ts** | Finance/accounting | `getChartOfAccounts()`, `createJournal()`, `getGeneralLedger()`, `getTrialBalance()` |
| **purchasing.ts** | Purchase orders | `createPurchaseOrder()`, `createGoodsReceipt()`, `createPurchaseInvoice()` |
| **hr.ts** | HR & payroll | `getEmployees()`, `createEmployee()`, `createPayrollSlip()`, `getEmployeeLoans()` |
| **shipping.ts** | Delivery orders | `createDeliveryOrder()`, `getDeliveryOrders()`, `updateDeliveryStatus()` |
| **salesReport.ts** | Sales reports | `getSalesReport()`, `getProfitReport()` |
| **salesReportEnhanced.ts** | Enhanced sales reports | `getEnhancedSalesReport()` |
| **dailyCash.ts** | Daily cash report | `getDailyCashReport()`, `createDailyCashEntry()` |
| **dailyBank.ts** | Daily bank report | `getDailyBankReport()`, `createDailyBankEntry()` |
| **agingReceivables.ts** | Aging receivables | `getAgingReceivables()` |
| **itemPaymentService.ts** | Item payment allocation | `allocatePaymentToItems()`, `getRealizedProfit()` |
| **index.ts** | Re-export all | `export * from './products'`, etc. |

---

## CRUD Operations

### 1. GET — Fetch Data

```typescript
// Get all items
export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name')
  
  if (error) throw error
  return data || []
}

// Get with filter
export async function getProductsByCategory(categoryId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('category_id', categoryId)
    .order('name')
  
  if (error) throw error
  return data || []
}

// Get with joins
export async function getProductsWithCategory(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(id, name)
    `)
    .order('name')
  
  if (error) throw error
  return data || []
}

// Get by ID
export async function getProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

// Get with pagination
export async function getProducts(page: number, limit: number): Promise<Product[]> {
  const from = (page - 1) * limit
  const to = from + limit - 1
  
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name')
    .range(from, to)
  
  if (error) throw error
  return data || []
}
```

### 2. CREATE — Insert Data

```typescript
export async function createProduct(product: Omit<Product, 'id'>): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()  // ✅ Important: select after insert to get inserted data
    .single()
  
  if (error) throw error
  return data
}

// Bulk insert
export async function createProducts(products: Omit<Product, 'id'>[]): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .insert(products)
    .select()
  
  if (error) throw error
  return data || []
}
```

### 3. UPDATE — Update Data

```typescript
export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()  // ✅ Important: select after update
    .single()
  
  if (error) throw error
  return data
}

// Update multiple rows
export async function updateProductsByCategory(
  categoryId: string, 
  updates: Partial<Product>
): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('category_id', categoryId)
    .select()
  
  if (error) throw error
  return data || []
}
```

### 4. DELETE — Delete Data

```typescript
export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Soft delete (update status instead of delete)
export async function softDeleteProduct(id: string): Promise<Product> {
  return updateProduct(id, { status: 'deleted', deleted_at: new Date().toISOString() })
}
```

---

## RPC Functions

Untuk operasi kompleks (transaksi, retur, dll), gunakan **RPC functions**.

### Kenapa RPC?

- ✅ **Atomic** — semua atau tidak sama sekali
- ✅ **Consistent** — data tetap valid
- ✅ **Fast** — 1 roundtrip vs banyak queries
- ✅ **Secure** — logic di server, bukan client

### Pattern RPC Call

```typescript
export async function createTransaction(params: TransactionParams): Promise<string> {
  const { data, error } = await supabase.rpc('create_transaction', {
    p_customer_id: params.customerId,
    p_items: params.items,
    p_payment_method: params.paymentMethod,
    p_discount: params.discount,
    p_shipping_fee: params.shippingFee,
  })
  
  if (error) throw error
  return data // returns transaction_id
}
```

### Contoh RPC Functions di Project

#### 1. Create Transaction

```typescript
// src/services/transactions.ts
export async function createTransaction(params: {
  customerId?: string
  items: { productId: string; quantity: number; price: number }[]
  paymentMethod: 'cash' | 'credit'
  discount?: number
  shippingFee?: number
  downPayment?: number
  transactionDate?: string
}): Promise<string> {
  const { data, error } = await supabase.rpc('create_transaction', {
    p_customer_id: params.customerId,
    p_items: params.items,
    p_payment_method: params.paymentMethod,
    p_discount: params.discount || 0,
    p_shipping_fee: params.shippingFee || 0,
    p_down_payment: params.downPayment || 0,
    p_transaction_date: params.transactionDate || new Date().toISOString(),
  })
  
  if (error) throw error
  return data // transaction_id
}
```

**What it does:**
1. Insert to `transactions` table
2. Insert to `transaction_items` table (multiple items)
3. Update stock for each product (`products.stock`)
4. Insert to `stock_movements` table
5. If credit: update customer piutang
6. All in ONE atomic transaction

#### 2. Void Transaction

```typescript
export async function voidTransaction(transactionId: string): Promise<void> {
  const { error } = await supabase.rpc('void_transaction', {
    p_transaction_id: transactionId,
  })
  
  if (error) throw error
}
```

**What it does:**
1. Mark transaction as voided
2. Return stock for each item
3. Insert reverse stock movements
4. If credit: reverse customer piutang
5. All atomic

#### 3. Create Return

```typescript
// src/services/returns.ts
export async function createReturn(params: {
  transactionId: string
  items: { transactionItemId: string; quantity: number }[]
  refundMethod: 'cash' | 'reduce_debt'
  reason?: string
}): Promise<string> {
  const { data, error } = await supabase.rpc('create_return', {
    p_transaction_id: params.transactionId,
    p_items: params.items,
    p_refund_method: params.refundMethod,
    p_reason: params.reason,
  })
  
  if (error) throw error
  return data // return_id
}
```

**What it does:**
1. Insert to `returns` table
2. Insert to `return_items` table
3. Return stock for each item
4. Insert stock movements
5. Update transaction `return_amount`
6. If reduce_debt: reduce customer piutang
7. All atomic

#### 4. Add Transaction Payment

```typescript
// src/services/transactions.ts
export async function addTransactionPayment(params: {
  transactionId: string
  amount: number
  paymentDate?: string
  notes?: string
}): Promise<string> {
  const { data, error } = await supabase.rpc('add_transaction_payment', {
    p_transaction_id: params.transactionId,
    p_amount: params.amount,
    p_payment_date: params.paymentDate || new Date().toISOString(),
    p_notes: params.notes,
  })
  
  if (error) throw error
  return data // payment_id
}
```

**What it does:**
1. Insert to `transaction_payments` table
2. Update transaction `paid_amount`
3. If fully paid: mark as `paid`
4. Reduce customer piutang
5. All atomic

---

## Error Handling

### Pattern: Throw Error

Services **HARUS** throw error jika Supabase return error:

```typescript
// ✅ GOOD: Throw error
export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select()
  
  if (error) throw error  // ✅ Throw!
  return data || []
}
```

```typescript
// ❌ BAD: Return {data, error}
export async function getProducts() {
  return await supabase.from('products').select()  // ❌ Caller harus check error
}
```

### Why Throw?

1. **Consistent error handling** — Caller pakai try-catch
2. **TypeScript type safety** — Return type clear (bukan union)
3. **Idiomatic** — Standard pattern di TypeScript
4. **Centralized logging** — Error otomatis ter-log di Supabase client

### Error sudah ter-log otomatis!

Supabase client di `src/lib/supabase.ts` sudah dibungkus dengan Proxy yang **auto-log semua error**.

**Tidak perlu log manual:**
```typescript
// ❌ Don't do this
export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select()
  
  if (error) {
    console.error('Failed to fetch products:', error)  // ❌ Redundant
    logEvent({...})  // ❌ Redundant
    throw error
  }
  return data || []
}

// ✅ Do this
export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select()
  
  if (error) throw error  // ✅ Auto-logged!
  return data || []
}
```

Error otomatis tercatat dengan detail:
- Level: error
- Source: supabase
- Event: request_failed
- Message: `select products: <error message>`
- Detail: `filters: eq(category_id)`

View di: `/settings/event-log`

---

## Best Practices

### ✅ DO:

#### 1. Export Functions (bukan class)

```typescript
// ✅ GOOD
export async function getProducts(): Promise<Product[]> {
  // ...
}

export async function createProduct(product: Omit<Product, 'id'>): Promise<Product> {
  // ...
}
```

```typescript
// ❌ BAD: Class-based
class ProductService {
  async getProducts(): Promise<Product[]> {
    // ...
  }
}
export default new ProductService()
```

#### 2. Type Return Values

```typescript
// ✅ GOOD: Typed
export async function getProducts(): Promise<Product[]> {
  // ...
}

// ❌ BAD: Untyped
export async function getProducts() {
  // ...
}
```

#### 3. Use TypeScript Utility Types

```typescript
// ✅ GOOD: Use Omit for create (no id)
export async function createProduct(
  product: Omit<Product, 'id' | 'created_at'>
): Promise<Product> {
  // ...
}

// ✅ GOOD: Use Partial for update
export async function updateProduct(
  id: string,
  updates: Partial<Product>
): Promise<Product> {
  // ...
}
```

#### 4. Use `.select()` After INSERT/UPDATE

```typescript
// ✅ GOOD: Get inserted data
const { data, error } = await supabase
  .from('products')
  .insert(product)
  .select()  // ✅
  .single()

// ❌ BAD: No select (data akan null)
const { data, error } = await supabase
  .from('products')
  .insert(product)
// data = null ❌
```

#### 5. Return Empty Array (bukan null)

```typescript
// ✅ GOOD
export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select()
  if (error) throw error
  return data || []  // ✅ Empty array
}

// ❌ BAD
export async function getProducts(): Promise<Product[] | null> {
  const { data, error } = await supabase.from('products').select()
  if (error) throw error
  return data  // ❌ Bisa null, caller harus check
}
```

#### 6. Use RPC for Complex Operations

```typescript
// ✅ GOOD: Use RPC (atomic)
export async function createTransaction(params: any): Promise<string> {
  const { data, error } = await supabase.rpc('create_transaction', params)
  if (error) throw error
  return data
}

// ❌ BAD: Multiple queries (not atomic)
export async function createTransaction(params: any): Promise<string> {
  // Insert transaction
  const { data: txn } = await supabase.from('transactions').insert({...})
  
  // Insert items (PROBLEM: jika error di sini, transaction sudah masuk!)
  await supabase.from('transaction_items').insert([...])
  
  // Update stock (PROBLEM: jika error di sini, data inconsistent!)
  await supabase.from('products').update({...})
  
  // ❌ Not atomic!
}
```

---

### ❌ DON'T:

#### 1. Don't Return `{data, error}`

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

#### 2. Don't Log Errors Manually

```typescript
// ❌ BAD: Redundant logging
export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select()
  
  if (error) {
    console.error('Error:', error)  // ❌ Redundant
    logEvent({...})  // ❌ Redundant
    throw error
  }
  return data || []
}

// ✅ GOOD: Auto-logged
export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select()
  if (error) throw error  // ✅ Auto-logged!
  return data || []
}
```

#### 3. Don't Handle UI State

```typescript
// ❌ BAD: Service tidak boleh handle UI state
export async function getProducts(): Promise<Product[]> {
  showLoadingSpinner()  // ❌ UI logic di service
  
  const { data, error } = await supabase.from('products').select()
  
  hideLoadingSpinner()  // ❌
  
  if (error) {
    showToast('Error', 'error')  // ❌
    throw error
  }
  return data || []
}

// ✅ GOOD: Pure data access
export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select()
  if (error) throw error
  return data || []
}
```

#### 4. Don't Use `any` Type

```typescript
// ❌ BAD
export async function getProducts(): Promise<any> {
  // ...
}

// ✅ GOOD
export async function getProducts(): Promise<Product[]> {
  // ...
}
```

---

## Testing Services

### Manual Testing

Test di browser console:

```typescript
// Import service
import * as productService from '@/services/products'

// Test get
const products = await productService.getProducts()
console.log(products)

// Test create
const newProduct = await productService.createProduct({
  name: 'Test Product',
  sku: 'TEST-001',
  purchase_price: 1000,
  selling_price: 1500,
  stock: 10,
})
console.log(newProduct)
```

### Unit Testing (Future)

```typescript
// tests/services/products.test.ts
import { describe, it, expect, vi } from 'vitest'
import * as productService from '@/services/products'

describe('productService', () => {
  it('should fetch products', async () => {
    const products = await productService.getProducts()
    expect(Array.isArray(products)).toBe(true)
  })
  
  it('should create product', async () => {
    const product = await productService.createProduct({
      name: 'Test',
      // ...
    })
    expect(product.id).toBeDefined()
  })
})
```

---

## Common Patterns

### 1. Get with User Filter (RLS)

Supabase RLS otomatis filter by `auth.uid()`:

```typescript
// Service tidak perlu pass user_id — RLS handle otomatis
export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')  // RLS otomatis filter by user_id
  
  if (error) throw error
  return data || []
}
```

### 2. Search/Filter

```typescript
export async function searchProducts(query: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .or(`name.ilike.%${query}%,sku.ilike.%${query}%`)
    .order('name')
  
  if (error) throw error
  return data || []
}
```

### 3. Count

```typescript
export async function getProductCount(): Promise<number> {
  const { count, error } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
  
  if (error) throw error
  return count || 0
}
```

### 4. Aggregation

```typescript
export async function getTotalStock(): Promise<number> {
  const { data, error } = await supabase
    .from('products')
    .select('stock')
  
  if (error) throw error
  
  return data?.reduce((sum, p) => sum + (p.stock || 0), 0) || 0
}
```

---

## Resources

- [Supabase Query Docs](https://supabase.com/docs/reference/javascript/select)
- [Supabase RPC Docs](https://supabase.com/docs/reference/javascript/rpc)
- [TypeScript Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)

---

**Next:** Baca dokumentasi lainnya:
- `STORES_GUIDE.md` — Panduan stores layer
- `VIEWS_GUIDE.md` — Panduan views layer
- `RPC_FUNCTIONS.md` — Detail RPC functions

**Last updated:** 2026-10-30
