# Dokumentasi Struktur Project Ucup Kasir

Panduan lengkap untuk memahami struktur kode, alur data, dan arsitektur aplikasi Ucup Kasir.

---

## 📋 Daftar Isi

1. [Overview Arsitektur](#overview-arsitektur)
2. [Struktur Folder](#struktur-folder)
3. [Layer Pattern](#layer-pattern)
4. [Alur Data](#alur-data)
5. [Penjelasan per Folder](#penjelasan-per-folder)
6. [Flow Diagram](#flow-diagram)
7. [Best Practices](#best-practices)

---

## Overview Arsitektur

Ucup Kasir menggunakan **3-Layer Architecture** yang clean dan maintainable:

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

### Key Principles:

- **Separation of Concerns** — UI tidak langsung akses database
- **Single Source of Truth** — State management via Pinia
- **Type Safety** — Full TypeScript dengan strict mode
- **Offline Support** — SQLite untuk Android native app
- **Error Logging** — Semua error Supabase terekam otomatis

---

## Struktur Folder

```
src/
├── assets/              # Static assets (CSS, images)
├── components/          # Vue components (reusable)
│   ├── charts/          # Chart components (ApexCharts)
│   ├── common/          # Common UI components
│   ├── dashboard/       # Dashboard-specific components
│   ├── dev/             # Developer tools components
│   ├── ecommerce/       # E-commerce components
│   ├── finance/         # Finance module components
│   ├── forms/           # Form components (DateField, SelectField)
│   ├── hr/              # HR module components
│   ├── layout/          # Layout components (Header, Sidebar)
│   ├── profile/         # Profile components
│   ├── reports/         # Report components
│   ├── shipping/        # Shipping module components
│   ├── tables/          # Table components
│   └── ui/              # UI primitives
├── composables/         # Vue composables (reusable logic)
├── constants/           # Constants (kecamatan list, etc)
├── data/                # Static data (quick menu)
├── db/                  # SQLite schema & migrations (offline)
├── icons/               # SVG icon components
├── lib/                 # Core libraries
│   ├── supabase.ts      # Supabase client + error logging
│   ├── sqlite.ts        # SQLite client (offline mode)
│   ├── eventLog.ts      # Event logging system
│   ├── platform.ts      # Platform detection
│   └── network.ts       # Network status
├── router/              # Vue Router configuration
│   └── index.ts         # Routes + auth guard
├── services/            # Data access layer (17 services)
│   ├── products.ts      # Product CRUD
│   ├── transactions.ts  # Transaction operations
│   ├── customers.ts     # Customer CRUD
│   ├── stock.ts         # Stock management
│   ├── finance.ts       # Finance/accounting
│   ├── purchasing.ts    # Purchase orders & suppliers
│   ├── hr.ts            # HR & payroll
│   ├── shipping.ts      # Delivery orders
│   └── ...              # 9 more services
├── stores/              # Pinia stores (global state)
│   ├── auth.ts          # Authentication state
│   ├── products.ts      # Products state
│   ├── transactions.ts  # Transactions state
│   └── ...              # 14 more stores
├── types/               # TypeScript type definitions
│   ├── database.ts      # Database table types
│   └── ...              # Other types
├── utils/               # Utility functions
├── views/               # Pages (route components)
│   ├── Auth/            # Signin & Signup
│   ├── Categories/      # Category CRUD
│   ├── Customers/       # Customer CRUD
│   ├── Finance/         # Finance module (10 pages)
│   ├── Hr/              # HR module (8 pages)
│   ├── Invoices/        # Invoice management (6 pages)
│   ├── PriceMatrix/     # Price matrix management
│   ├── Products/        # Product CRUD
│   ├── Purchasing/      # Purchasing module (15 pages)
│   ├── Reports/         # Reports (9 pages)
│   ├── Returns/         # Product returns
│   ├── Settings/        # App settings (7 pages)
│   ├── Shipping/        # Shipping module (6 pages)
│   ├── Stock/           # Stock management (5 pages)
│   ├── Sync/            # Sync & backup
│   └── Transactions/    # Transaction CRUD (5 pages)
├── main.ts              # App entry point
└── App.vue              # Root component
```

---

## Layer Pattern

### 1. Views Layer (UI)

**Lokasi:** `src/views/`

**Tanggung jawab:**
- Render UI
- Handle user input
- Display data dari stores
- Call store actions untuk mutasi data

**Contoh:**
```vue
<!-- src/views/Products/ProductList.vue -->
<script setup lang="ts">
import { useProductsStore } from '@/stores/products'
import { onMounted } from 'vue'

const productsStore = useProductsStore()

onMounted(async () => {
  await productsStore.fetchProducts() // Call store action
})
</script>

<template>
  <div>
    <!-- Display data dari store -->
    <div v-for="product in productsStore.products" :key="product.id">
      {{ product.name }}
    </div>
  </div>
</template>
```

**Aturan:**
- ❌ **JANGAN** langsung import dari `services/` di view
- ✅ **GUNAKAN** stores untuk akses data
- ✅ **GUNAKAN** composables untuk reusable logic (toast, confirm, pdf export)

---

### 2. Stores Layer (State Management)

**Lokasi:** `src/stores/`

**Tanggung jawab:**
- Manage global state
- Call services untuk fetch/mutate data
- Cache data untuk performa
- Handle loading & error states

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
      products.value = await productService.getProducts() // Call service
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      loading.value = false
    }
  }

  return { products, loading, fetchProducts }
})
```

**Aturan:**
- ✅ **CALL** services untuk data operations
- ✅ **CACHE** data yang sering dipakai
- ✅ **HANDLE** loading & error states
- ❌ **JANGAN** langsung akses Supabase dari store (pakai service layer)

---

### 3. Services Layer (Data Access)

**Lokasi:** `src/services/`

**Tanggung jawab:**
- Akses Supabase (CRUD operations)
- Call RPC functions
- Business logic terkait data
- Return typed data

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

**Aturan:**
- ✅ **EXPORT** functions (bukan class)
- ✅ **THROW** error jika Supabase return error
- ✅ **RETURN** typed data (TypeScript)
- ✅ **USE** RPC functions untuk operasi kompleks (transaksi, dll)

---

### 4. Composables Layer (Reusable Logic)

**Lokasi:** `src/composables/`

**Tanggung jawab:**
- Reusable UI logic
- Side effects (toast, confirm dialog)
- Utilities (PDF export, CSV export)

**Contoh:**
```typescript
// src/composables/useToast.ts
import { ref } from 'vue'

export function useToast() {
  const message = ref('')
  const type = ref<'success' | 'error' | 'info'>('info')

  function show(msg: string, t: typeof type.value = 'info') {
    message.value = msg
    type.value = t
  }

  return { message, type, show }
}
```

**Available Composables:**
- `useToast()` — Toast notifications
- `useConfirm()` — Confirmation dialog (bukan native `confirm()`)
- `usePdfExport()` — Export invoice to PDF
- `useCsv()` — Export data to CSV
- `useDataTable()` — Table utilities (pagination, sorting)
- `usePriceMatrix()` — Calculate price dengan matrix
- `useNavigationStack()` — Handle Android back button
- `useSidebar()` — Sidebar toggle state

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
- ✅ Atomicity — semua atau tidak sama sekali
- ✅ Consistency — data tetap konsisten
- ✅ Performance — 1 roundtrip vs multiple queries
- ✅ Security — business logic di server, bukan client

---

## Penjelasan per Folder

### 📁 `src/components/`

Komponen Vue yang reusable. **Total: 89 komponen**

#### `components/common/`
Komponen UI umum yang dipakai di banyak tempat:

- **Buttons:** `ButtonPrimary.vue`, `ButtonSecondary.vue`
- **Cards:** `Card.vue`, `StatCard.vue`
- **Modals:** `Modal.vue`, `ModalOverlay.vue`
- **Dialogs:** `ConfirmDialog.vue` — custom dialog (bukan native `confirm()`)
- **Loaders:** `LoadingSpinner.vue`, `SkeletonLoader.vue`
- **Alerts:** `Alert.vue`, `Toast.vue`

**Aturan:**
- ❌ JANGAN pakai native `alert()` atau `confirm()`
- ✅ GUNAKAN `ConfirmDialog` component + `useConfirm()` composable

#### `components/forms/`
Form input components:

- **DateField.vue** — Date picker (date-only, bukan datetime)
- **SelectField.vue** — Custom dropdown select
- **InputField.vue** — Text input dengan validation
- **TextareaField.vue** — Textarea dengan auto-resize

**Aturan:**
- ❌ JANGAN pakai `<input type="date">` native di UI bisnis
- ❌ JANGAN pakai `<select>` native di UI bisnis
- ✅ GUNAKAN `DateField` dan `SelectField` components

#### `components/layout/`
Layout components:

- **Header.vue** — App header dengan user menu
- **Sidebar.vue** — Navigation sidebar
- **Footer.vue** — App footer
- **Breadcrumb.vue** — Breadcrumb navigation

#### `components/tables/`
Table components untuk data display:

- **DataTable.vue** — Generic data table dengan sorting & pagination
- **ProductTable.vue** — Specialized table untuk products
- **TransactionTable.vue** — Specialized table untuk transactions

#### `components/charts/`
Chart components (ApexCharts):

- **LineChart.vue** — Line chart
- **BarChart.vue** — Bar chart
- **PieChart.vue** — Pie chart
- **AreaChart.vue** — Area chart

#### Module-specific components:

- `components/finance/` — Finance module components
- `components/hr/` — HR module components
- `components/shipping/` — Shipping module components
- `components/reports/` — Report components

---

### 📁 `src/composables/`

Vue composables untuk reusable logic. **Total: 12 composables**

| Composable | Purpose | Usage |
|------------|---------|-------|
| `useToast()` | Toast notifications | `const toast = useToast(); toast.show('Success!', 'success')` |
| `useConfirm()` | Confirmation dialog | `const confirm = useConfirm(); const ok = await confirm.show('Delete?')` |
| `usePdfExport()` | Export invoice to PDF | `const pdf = usePdfExport(); await pdf.exportInvoice(transaction)` |
| `useCsv()` | Export data to CSV | `const csv = useCsv(); csv.export(data, 'filename.csv')` |
| `useDataTable()` | Table utilities | Pagination, sorting, filtering |
| `usePriceMatrix()` | Calculate price | Calculate final price dengan priority rules |
| `useNavigationStack()` | Navigation history | Handle Android back button |
| `useSidebar()` | Sidebar state | Toggle sidebar open/close |
| `usePayrollSlipPdf()` | Payroll PDF | Export payroll slip to PDF |
| `useDeliveryOrderPdf()` | Delivery order PDF | Export delivery order to PDF |

**Cara pakai:**

```vue
<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'

const toast = useToast()
const confirm = useConfirm()

async function handleDelete() {
  const ok = await confirm.show('Yakin ingin menghapus?')
  if (!ok) return
  
  try {
    // Delete logic
    toast.show('Berhasil dihapus', 'success')
  } catch (error) {
    toast.show('Gagal menghapus', 'error')
  }
}
</script>
```

---

### 📁 `src/services/`

Data access layer — semua operasi Supabase. **Total: 20 services**

| Service | Purpose | Key Functions |
|---------|---------|---------------|
| `products.ts` | Product CRUD | `getProducts()`, `createProduct()`, `updateProduct()` |
| `transactions.ts` | Transaction operations | `createTransaction()` (RPC), `getTransactions()` |
| `customers.ts` | Customer CRUD | `getCustomers()`, `createCustomer()` |
| `stock.ts` | Stock management | `getStockMovements()`, `adjustStock()` |
| `finance.ts` | Finance/accounting | `getChartOfAccounts()`, `createJournal()` |
| `purchasing.ts` | Purchase orders | `createPurchaseOrder()`, `createGoodsReceipt()` |
| `hr.ts` | HR & payroll | `getEmployees()`, `createPayrollSlip()` |
| `shipping.ts` | Delivery orders | `createDeliveryOrder()`, `getDeliveryOrders()` |
| `priceMatrixService.ts` | Price calculation | `calculatePrice()` — 4 priority levels |
| `salesReport.ts` | Sales reports | `getSalesReport()`, `getProfitReport()` |
| `returns.ts` | Product returns | `createReturn()` (RPC) |
| `categories.ts` | Category CRUD | `getCategories()`, `createCategory()` |
| `notifications.ts` | Notifications | `getNotifications()`, `markAsRead()` |
| `storeSettings.ts` | Store settings | `getStoreSettings()`, `updateStoreSettings()` |
| `dailyCash.ts` | Daily cash report | `getDailyCashReport()` |
| `dailyBank.ts` | Daily bank report | `getDailyBankReport()` |
| `agingReceivables.ts` | Aging receivables | `getAgingReceivables()` |
| `itemPaymentService.ts` | Item payment allocation | `allocatePaymentToItems()` |

**Pattern:**

Semua service mengikuti pattern yang sama:

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

// CREATE — insert data
export async function createItem(item: Omit<Table, 'id'>): Promise<Table> {
  const { data, error } = await supabase
    .from('table_name')
    .insert(item)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// UPDATE — update data
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

// DELETE — delete data
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

---

### 📁 `src/stores/`

Pinia stores untuk global state management. **Total: 17 stores**

| Store | Purpose | State |
|-------|---------|-------|
| `auth.ts` | Authentication | `user`, `session`, `isAuthenticated` |
| `products.ts` | Products state | `products`, `categories`, `loading` |
| `transactions.ts` | Transactions state | `transactions`, `selectedTransaction` |
| `customers.ts` | Customers state | `customers`, `loading` |
| `stock.ts` | Stock state | `stockMovements`, `lowStockProducts` |
| `finance.ts` | Finance state | `chartOfAccounts`, `journals` |
| `purchasing.ts` | Purchasing state | `purchaseOrders`, `suppliers` |
| `hr.ts` | HR state | `employees`, `payrollSlips` |
| `shipping.ts` | Shipping state | `deliveryOrders`, `vehicles` |
| `priceMatrix.ts` | Price matrix state | `priceTiers`, `customerPrices` |
| `salesReport.ts` | Sales report state | `reportData`, `dateRange` |
| `returns.ts` | Returns state | `returns`, `loading` |
| `notifications.ts` | Notifications state | `notifications`, `unreadCount` |
| `storeSettings.ts` | Store settings state | `settings`, `loading` |
| `sync.ts` | Sync state | `lastSync`, `pendingChanges` |

**Pattern:**

```typescript
// src/stores/example.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as service from '@/services/example'
import type { Item } from '@/types/database'

export const useExampleStore = defineStore('example', () => {
  // State
  const items = ref<Item[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Computed (getters)
  const itemCount = computed(() => items.value.length)
  const hasItems = computed(() => items.value.length > 0)

  // Actions
  async function fetchItems() {
    loading.value = true
    error.value = null
    try {
      items.value = await service.getItems()
    } catch (e) {
      error.value = (e as Error).message
      console.error('Failed to fetch items:', e)
    } finally {
      loading.value = false
    }
  }

  async function createItem(item: Omit<Item, 'id'>) {
    try {
      const newItem = await service.createItem(item)
      items.value.push(newItem)
      return newItem
    } catch (e) {
      error.value = (e as Error).message
      throw e
    }
  }

  return {
    // State
    items,
    loading,
    error,
    // Getters
    itemCount,
    hasItems,
    // Actions
    fetchItems,
    createItem,
  }
})
```

---

### 📁 `src/views/`

Pages (route components). **Total: 100+ pages**

Setiap module punya folder sendiri dengan CRUD pages:

#### `views/Products/` — Product Management
- `ProductList.vue` — List all products
- `AddProduct.vue` — Create new product
- `EditProduct.vue` — Edit product
- `ProductDetail.vue` — View product detail

#### `views/Transactions/` — Transaction Management
- `TransactionList.vue` — List all transactions
- `AddTransaction.vue` — Create new transaction
- `AddTransactionFromHome.vue` — Quick transaction from home
- `TransactionDetail.vue` — View transaction detail
- `InvoicePage.vue` — Print invoice

#### `views/Customers/` — Customer Management
- `CustomerList.vue` — List all customers
- `AddCustomer.vue` — Create new customer
- `EditCustomer.vue` — Edit customer
- `CustomerDetail.vue` — View customer detail + piutang

#### `views/Invoices/` — Invoice Management (Grouped by Kecamatan)
- `InvoiceKecamatanList.vue` — Select kecamatan (24 kecamatan Banyuwangi)
- `InvoiceCustomerList.vue` — Select customer per kecamatan
- `CustomerInvoiceList.vue` — List invoices per customer
- `InvoiceDetail.vue` — View invoice detail
- `InvoicePrint.vue` — Print invoice PDF
- `AddCustomerTransaction.vue` — Add transaction to customer invoice

#### `views/Stock/` — Stock Management
- `StockManagement.vue` — View all stock
- `StockDetail.vue` — Stock detail per product
- `StockMovements.vue` — Stock movement history
- `StockAdjustmentModal.vue` — Adjust stock manually
- `StockOpnameModal.vue` — Stock opname

#### `views/Finance/` — Finance/Accounting Module (10 pages)
- `FinanceDashboard.vue` — Finance overview
- `ChartOfAccounts.vue` — Manage COA
- `JournalList.vue` — List all journals
- `JournalForm.vue` — Create/edit journal
- `JournalDetail.vue` — View journal detail
- `GeneralLedger.vue` — Buku besar
- `TrialBalance.vue` — Neraca saldo
- `BalanceSheet.vue` — Neraca
- `CashFlow.vue` — Arus kas
- `ClosingPeriods.vue` — Tutup buku periode

#### `views/Purchasing/` — Purchasing Module (15 pages)
- `PurchaseDashboard.vue` — Purchase overview
- `SupplierList.vue` — Manage suppliers
- `AddSupplier.vue` — Add supplier
- `EditSupplier.vue` — Edit supplier
- `PurchaseOrderList.vue` — List POs
- `PurchaseOrderForm.vue` — Create/edit PO
- `PurchaseOrderDetail.vue` — View PO detail
- `GoodsReceiptList.vue` — List GRNs
- `GoodsReceiptForm.vue` — Create GRN (receive goods)
- `GoodsReceiptDetail.vue` — View GRN detail
- `PurchaseInvoiceList.vue` — List purchase invoices
- `PurchaseInvoiceForm.vue` — Create purchase invoice
- `PurchaseInvoiceDetail.vue` — View purchase invoice
- `PurchaseReturnList.vue` — List returns to supplier
- `PurchaseReturnForm.vue` — Create return to supplier
- `PurchaseReturnDetail.vue` — View return detail

#### `views/Hr/` — HR & Payroll Module (8 pages)
- `EmployeeList.vue` — List all employees
- `EmployeeForm.vue` — Create/edit employee
- `EmployeeDetail.vue` — View employee detail
- `EmployeeLoanList.vue` — List kasbon karyawan
- `PayrollListNew.vue` — Payroll management (**per-karyawan**, bukan global period)
- `PayrollSlipPrint.vue` — Print payroll slip PDF

**Penting:** Sistem payroll sudah diubah dari periode global ke **per-karyawan**. Setiap slip gaji dibuat untuk satu karyawan dengan periode tertentu.

#### `views/Shipping/` — Shipping Module (6 pages)
- `DeliveryOrderList.vue` — List delivery orders
- `DeliveryOrderForm.vue` — Create delivery order
- `DeliveryOrderDetail.vue` — View delivery order detail
- `DeliveryOrderPrint.vue` — Print delivery order PDF
- `PendingShipmentList.vue` — Pending shipments
- `VehicleList.vue` — Manage vehicles

#### `views/Reports/` — Reports (9 pages)
- `ReportsIndex.vue` — Reports dashboard
- `SalesReport.vue` — Sales report per period
- `ProfitLossReport.vue` — Profit & loss report
- `TransactionProfitReport.vue` — Profit per transaction
- `TransactionProfitDetail.vue` — Transaction profit detail
- `AgingReceivablesReport.vue` — Aging receivables (piutang umur)
- `DailyCashReport.vue` — Daily cash report
- `DailyBankReport.vue` — Daily bank report
- `MonthlyCashReport.vue` — Monthly cash summary

#### `views/Settings/` — Settings (7 pages)
- `StoreSettings.vue` — Main settings page
- `StoreInfo.vue` — Store information (nama, alamat, logo)
- `ProfileSettings.vue` — User profile & password
- `GlobalVariables.vue` — App-wide variables
- `EventLog.vue` — View event log (errors, warnings)
- `SyncDebugger.vue` — Debug sync issues
- `FixPaymentAllocation.vue` — Fix payment allocation (laba terealisasi)

#### `views/Auth/` — Authentication (2 pages)
- `Signin.vue` — Login page
- `Signup.vue` — Register page

#### `views/PriceMatrix/` — Price Matrix Management
- `PriceMatrixMenu.vue` — Main menu
- `customers/` — Customer-specific prices
- `groups/` — Customer group prices
- `groupPrices/` — Group price management
- `tiers/` — Quantity-based tiers

---

### 📁 `src/lib/`

Core libraries dan utilities.

#### `lib/supabase.ts` — Supabase Client + Error Logging

**Fitur utama:**
- Inisialisasi Supabase client
- **Auto-logging semua error Supabase** ke event log
- Instrumentasi dengan Proxy untuk tracking query
- Mencatat table, operation, filters, dan error detail

**Cara kerja:**
```typescript
// Setiap query Supabase otomatis ter-log jika error
const { data, error } = await supabase
  .from('products')
  .select('*')
  .eq('id', '123')

// Jika error, otomatis tercatat:
// - Level: error
// - Source: supabase
// - Event: request_failed
// - Message: select products: <error message>
// - Detail: filters: eq(id)
```

#### `lib/sqlite.ts` — SQLite Client (Offline Mode)

**Purpose:** Local database untuk Android native app (offline support)

**Fitur:**
- Inisialisasi SQLite database
- Schema migrations
- Sync dengan Supabase saat online

**Status:** Masih dalam development, lihat `docs/` untuk detail.

#### `lib/eventLog.ts` — Event Logging System

**Purpose:** Catat semua event penting (error, warning, info) untuk debugging

**Functions:**
- `logEvent()` — Log event (level, source, event, message, detail)
- `getEventLog()` — Get all logs
- `flushToSQLite()` — Simpan log ke SQLite (Android)

**Usage:**
```typescript
import { logEvent } from '@/lib/eventLog'

logEvent({
  level: 'error',
  source: 'transaction',
  event: 'create_failed',
  message: 'Gagal membuat transaksi: stok tidak cukup',
  detail: 'Product ID: 123, Requested: 10, Available: 5'
})
```

**View logs:** `/settings/event-log`

#### `lib/platform.ts` — Platform Detection

**Purpose:** Detect apakah app berjalan di web atau native Android

**Functions:**
- `isNativeApp()` — Returns `true` jika Android native, `false` jika web
- `getPlatform()` — Returns platform name ('android' | 'web')

**Usage:**
```typescript
import { isNativeApp } from '@/lib/platform'

if (isNativeApp()) {
  // Android-specific code (SQLite, Capacitor API)
} else {
  // Web-specific code
}
```

#### `lib/network.ts` — Network Status

**Purpose:** Detect online/offline status

**Usage:**
```typescript
import { useNetwork } from '@/lib/network'

const { isOnline } = useNetwork()

if (isOnline.value) {
  // Do network request
} else {
  // Show offline message
}
```

---

### 📁 `src/router/`

Vue Router configuration dengan **auth guard**.

#### Key Features:

1. **Route definitions** — Semua routes aplikasi
2. **Auth guard** — Redirect ke `/signin` jika belum login
3. **Meta fields** — Page title, auth required, dll
4. **Lazy loading** — Dynamic imports untuk code splitting

#### Auth Guard Flow:

```
User navigates to /products
       ↓
Router beforeEach hook triggered
       ↓
Check: Is user authenticated?
       ↓
  YES → Allow navigation
   NO → Redirect to /signin
```

**Implementation:**
```typescript
// src/router/index.ts
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  await authStore.initialize() // Load session from localStorage

  if (to.path !== '/signin' && to.path !== '/signup' && !authStore.isAuthenticated) {
    // Not authenticated, redirect to signin
    next('/signin')
  } else {
    // Authenticated or public page, allow
    next()
  }
})
```

---

### 📁 `src/types/`

TypeScript type definitions.

#### `types/database.ts` — Database Table Types

**Purpose:** Type definitions untuk semua tabel database

**Generated from:** Supabase schema

**Usage:**
```typescript
import type { Product, Transaction, Customer } from '@/types/database'

const product: Product = {
  id: '123',
  name: 'Indomie Goreng',
  sku: 'IND-001',
  purchase_price: 2500,
  selling_price: 3000,
  stock: 100,
  // ...
}
```

**Benefit:**
- ✅ Type safety
- ✅ Autocomplete di IDE
- ✅ Catch errors saat development

---

### 📁 `src/constants/`

Konstanta aplikasi.

#### `constants/kecamatan.ts` — Daftar Kecamatan Banyuwangi

**Purpose:** 24 kecamatan di Kabupaten Banyuwangi untuk grouping customers

**Content:**
```typescript
export const KECAMATAN_LIST = [
  'Banyuwangi',
  'Giri',
  'Kabat',
  'Rogojampi',
  'Genteng',
  // ... 19 more
]
```

**Usage:** Di invoice module untuk filter customer per kecamatan

---

### 📁 `src/utils/`

Utility functions.

**Contoh:**
- Date formatting
- Number formatting (currency)
- String helpers
- Validation helpers

---

## Flow Diagram

### Transaction Creation Flow (Kompleks)

```
┌─────────────────────────────────────────────────┐
│ User fills transaction form                     │
│ - Select customer                               │
│ - Add products (with quantity)                  │
│ - Set payment method (cash/credit)              │
│ - Add discount, shipping fee                    │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│ View validates input                            │
│ - Check all required fields                     │
│ - Validate quantity > 0                         │
│ - Validate total > 0                            │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│ View calls store.createTransaction()            │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│ Store calls transactionService.createTransaction()│
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│ Service calls supabase.rpc('create_transaction', {│
│   customer_id,                                  │
│   items: [{product_id, quantity, price}],       │
│   payment_method,                               │
│   discount,                                     │
│   shipping_fee                                  │
│ })                                              │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│ Supabase executes SQL function (ATOMIC):        │
│                                                 │
│ BEGIN;                                          │
│   1. INSERT INTO transactions (...)             │
│   2. INSERT INTO transaction_items (...)        │
│   3. UPDATE products SET stock = stock - qty    │
│   4. INSERT INTO stock_movements (...)          │
│   5. IF payment_method = 'credit' THEN          │
│        UPDATE customer piutang                  │
│ COMMIT;                                         │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│ RPC returns transaction_id                      │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│ Service returns transaction_id to Store         │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│ Store updates local state                       │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│ View shows success toast                        │
│ View redirects to /transactions/{id}            │
└─────────────────────────────────────────────────┘
```

### Price Calculation Flow (Price Matrix)

```
User adds product to transaction
       ↓
View calls usePriceMatrix().calculatePrice(productId, customerId, quantity)
       ↓
Composable calls priceMatrixService.calculatePrice()
       ↓
Service checks 4 priority levels:
  1. Customer-specific price? → USE IT ✓
  2. Group price? → USE IT ✓
  3. Quantity tier price? → USE IT ✓
  4. Default product price → USE IT ✓
       ↓
Return final price
       ↓
View displays price in form
```

**Priority order:**
1. **Harga Khusus Customer** (highest priority)
2. **Harga Grup**
3. **Harga Tier (quantity bracket)**
4. **Harga Default** (lowest priority)

---

## Best Practices

### 1. Component Organization

✅ **DO:**
```vue
<!-- ProductCard.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import type { Product } from '@/types/database'

interface Props {
  product: Product
}

const props = defineProps<Props>()
const displayPrice = computed(() => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR'
  }).format(props.product.selling_price)
})
</script>

<template>
  <div class="product-card">
    <h3>{{ product.name }}</h3>
    <p>{{ displayPrice }}</p>
  </div>
</template>
```

❌ **DON'T:**
```vue
<!-- Bad: Mixing concerns -->
<script setup>
import { supabase } from '@/lib/supabase' // ❌ Don't import supabase directly in component

const { data } = await supabase.from('products').select() // ❌ Don't query in component
</script>
```

### 2. Service Layer

✅ **DO:**
```typescript
// src/services/products.ts
export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name')
  
  if (error) throw error // ✅ Throw error untuk error handling di store
  return data || []
}
```

❌ **DON'T:**
```typescript
// ❌ Don't return { data, error }
export async function getProducts() {
  return await supabase.from('products').select()
}
```

### 3. Store Pattern

✅ **DO:**
```typescript
// src/stores/products.ts
export const useProductsStore = defineStore('products', () => {
  const products = ref<Product[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

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

  return { products, loading, error, fetchProducts }
})
```

❌ **DON'T:**
```typescript
// ❌ Don't access Supabase directly from store
export const useProductsStore = defineStore('products', () => {
  async function fetchProducts() {
    const { data } = await supabase.from('products').select() // ❌
    products.value = data
  }
})
```

### 4. Error Handling

✅ **DO:**
```typescript
try {
  await store.createProduct(formData)
  toast.show('Produk berhasil dibuat', 'success')
  router.push('/products')
} catch (error) {
  toast.show(`Gagal membuat produk: ${(error as Error).message}`, 'error')
}
```

❌ **DON'T:**
```typescript
// ❌ Don't silently catch errors
try {
  await store.createProduct(formData)
} catch (error) {
  // No user feedback ❌
}
```

### 5. TypeScript Types

✅ **DO:**
```typescript
import type { Product } from '@/types/database'

interface FormData {
  name: string
  price: number
}

function createProduct(data: FormData): Promise<Product> {
  // ...
}
```

❌ **DON'T:**
```typescript
// ❌ Don't use 'any'
function createProduct(data: any): any {
  // ...
}
```

### 6. Custom Form Controls

✅ **DO:**
```vue
<template>
  <DateField v-model="transactionDate" label="Tanggal Transaksi" />
  <SelectField v-model="paymentMethod" :options="paymentMethods" />
</template>
```

❌ **DON'T:**
```vue
<template>
  <!-- ❌ Don't use native input date -->
  <input type="date" v-model="transactionDate" />
  
  <!-- ❌ Don't use native select -->
  <select v-model="paymentMethod">
    <option>Cash</option>
    <option>Credit</option>
  </select>
</template>
```

### 7. Dialogs & Notifications

✅ **DO:**
```typescript
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'

const confirm = useConfirm()
const toast = useToast()

const ok = await confirm.show('Yakin ingin menghapus?')
if (ok) {
  await deleteProduct()
  toast.show('Berhasil dihapus', 'success')
}
```

❌ **DON'T:**
```typescript
// ❌ Don't use native dialogs
const ok = confirm('Yakin ingin menghapus?')
if (ok) {
  await deleteProduct()
  alert('Berhasil dihapus') // ❌
}
```

---

## Debugging Tips

### 1. Check Event Log

Semua error Supabase otomatis tercatat di Event Log:

**Cara akses:**
1. Buka `/settings/event-log`
2. Filter by level (error, warning, info)
3. Filter by source (supabase, auth, transaction, etc)
4. Lihat detail error (table, operation, filters)

### 2. Vue DevTools

Install Vue DevTools extension untuk debugging:
- Inspect component state
- View Pinia stores
- Track events
- Time travel debugging

### 3. Supabase Logs

Check Supabase dashboard untuk:
- Database logs
- Auth logs
- API logs
- RPC function logs

### 4. Network Tab

Buka Chrome DevTools → Network tab:
- Check API requests
- Inspect request/response
- Check status codes
- View timing

---

## File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase.vue | `ProductCard.vue` |
| Views | PascalCase.vue | `ProductList.vue` |
| Services | camelCase.ts | `products.ts` |
| Stores | camelCase.ts | `products.ts` |
| Composables | useCamelCase.ts | `useToast.ts` |
| Types | camelCase.ts | `database.ts` |
| Constants | camelCase.ts | `kecamatan.ts` |

---

## Import Aliases

Project menggunakan alias `@/` untuk import dari `src/`:

```typescript
// ✅ DO: Use alias
import { useToast } from '@/composables/useToast'
import { supabase } from '@/lib/supabase'
import type { Product } from '@/types/database'

// ❌ DON'T: Use relative paths
import { useToast } from '../../../composables/useToast'
```

---

## Next Steps

Setelah membaca dokumentasi ini:

1. ✅ Baca `CLAUDE.md` untuk project-specific guidelines
2. ✅ Explore codebase — buka file-file penting:
   - `src/main.ts` — Entry point
   - `src/router/index.ts` — Routes
   - `src/lib/supabase.ts` — Supabase setup
   - `src/stores/auth.ts` — Auth state
   - `src/services/transactions.ts` — Transaction logic
3. ✅ Baca database migration files di `supabase/migrations/`
4. ✅ Test aplikasi: `npm run dev`
5. ✅ Buat dokumentasi tambahan jika menemukan pattern baru

---

## Resources

- **Vue 3 Docs:** https://vuejs.org/
- **Pinia Docs:** https://pinia.vuejs.org/
- **Supabase Docs:** https://supabase.com/docs
- **TypeScript Docs:** https://www.typescriptlang.org/docs/
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Capacitor Docs:** https://capacitorjs.com/docs

---

**Dokumentasi ini akan terus di-update seiring berkembangnya project.**

**Last updated:** 2026-10-30
