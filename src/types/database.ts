export interface Category {
  id: string
  user_id?: string
  name: string
  description?: string
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  user_id?: string
  name: string
  description?: string
  category_id?: string
  price_buy: number
  price_sell: number
  stock: number
  minimum_stock?: number
  sku?: string
  code?: string
  barcode?: string
  unit?: string
  image_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CategoryWithProducts extends Category {
  products?: Product[]
}

export interface ProductWithCategory extends Product {
  category?: Category
}

export interface Customer {
  id: string
  user_id?: string
  name: string
  store_name?: string
  phone?: string
  kecamatan?: string
  address?: string
  notes?: string
  credit_limit: number
  created_at: string
  updated_at: string
}

export interface TransactionItem {
  id: string
  user_id?: string
  transaction_id: string
  product_id?: string
  product_name: string
  price: number
  quantity: number
  subtotal: number
  created_at: string
}

export interface TransactionPayment {
  id: string
  user_id?: string
  transaction_id: string
  amount: number
  payment_method: string
  notes?: string
  created_at: string
}

/** Status fulfillment transaksi penjualan. */
export type TransactionStatus = 'disiapkan' | 'dikirim' | 'selesai'

export interface Transaction {
  id: string
  user_id?: string
  transaction_number: string
  customer_id?: string
  customer_name?: string
  subtotal: number
  discount: number
  return_amount?: number
  shipping_cost?: number
  total: number
  payment_method: string
  paid_amount: number
  change_amount: number
  remaining_amount: number
  payment_status: string
  status: string
  transaction_status: TransactionStatus
  notes?: string
  created_at: string
  updated_at: string
  items?: TransactionItem[]
  payments?: TransactionPayment[]
}

export type CategoryInsert = Omit<Category, 'id' | 'created_at' | 'updated_at'>
export type CategoryUpdate = Partial<CategoryInsert>

export type CustomerInsert = Omit<Customer, 'id' | 'created_at' | 'updated_at'>
export type CustomerUpdate = Partial<CustomerInsert>

export type ProductInsert = Omit<Product, 'id' | 'created_at' | 'updated_at'>
export type ProductUpdate = Partial<ProductInsert>

export interface TransactionItemInput {
  product_id: string
  quantity: number
  price?: number
}

export interface TransactionInput {
  customer_id?: string
  customer_name?: string
  payment_method: string
  paid_amount: number
  discount: number
  shipping_cost?: number
  return_amount?: number
  notes?: string
  transaction_date?: string
  items: TransactionItemInput[]
}

export interface ReturnItem {
  id: string
  user_id?: string
  return_id: string
  product_id?: string
  product_name: string
  price: number
  quantity: number
  subtotal: number
  created_at: string
}

export interface TransactionReturn {
  id: string
  user_id?: string
  transaction_id: string
  return_number: string
  total_refund: number
  notes?: string
  created_at: string
  updated_at: string
  items?: ReturnItem[]
  transaction?: {
    id: string
    transaction_number: string
    customer_name?: string
    status: string
  }
}

export interface ReturnItemInput {
  product_id: string
  quantity: number
}

export interface StoreSettings {
  id: string
  user_id?: string
  store_name: string
  store_subtitle?: string
  store_address?: string
  store_phone?: string
  store_email?: string
  tax_enabled?: boolean
  tax_rate?: number
  default_credit_limit?: number
  loading_rate_per_sack?: number
  currency?: string
  receipt_footer?: string
  created_at: string
  updated_at: string
}

export type StoreSettingsUpdate = Partial<Omit<StoreSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

// ============================================================
// Modul Finance — Double-entry Accounting
// ============================================================

export interface Account {
  id: string
  user_id?: string
  code: string
  name: string
  type: 'aset' | 'kewajiban' | 'ekuitas' | 'pendapatan' | 'beban'
  normal_balance: 'debit' | 'kredit'
  is_active: boolean
  is_system: boolean
  parent_id?: string
  created_at: string
  updated_at: string
}

export type AccountInsert = Omit<Account, 'id' | 'created_at' | 'updated_at'>
export type AccountUpdate = Partial<AccountInsert>

export interface JournalLine {
  id: string
  user_id?: string
  journal_id: string
  account_id: string
  account_code: string
  account_name: string
  debit: number
  credit: number
  created_at: string
}

export interface JournalEntry {
  id: string
  user_id?: string
  journal_number: string
  entry_date: string
  description: string
  reference_type?: 'manual' | 'transaction' | 'return' | 'payment' | 'void' | 'purchase' | 'purchase_payment' | 'purchase_return'
  reference_id?: string
  status: 'draft' | 'posted' | 'void'
  created_at: string
  updated_at: string
  lines?: JournalLine[]
}

export interface JournalLineInput {
  account_id: string
  debit: number
  credit: number
}

export interface JournalInput {
  entry_date: string
  description: string
  lines: JournalLineInput[]
}

/** Saldo akun (untuk Buku Besar & Neraca) */
export interface AccountBalance {
  account_id: string
  account_code: string
  account_name: string
  account_type: Account['type']
  normal_balance: 'debit' | 'kredit'
  total_debit: number
  total_credit: number
  balance: number  // saldo akhir (debit - credit, disesuaikan normal_balance)
}

/** Baris Buku Besar */
export interface LedgerEntry {
  entry_date: string
  journal_number: string
  description: string
  reference_type?: string
  debit: number
  credit: number
  balance: number  // saldo berjalan
}

// ============================================================
// Tutup Buku (Closing Period)
// ============================================================

export interface ClosingPeriod {
  id: string
  user_id?: string
  period_start: string  // 'YYYY-MM-DD'
  period_end: string    // 'YYYY-MM-DD'
  closed_at: string     // ISO timestamp
  closed_by: string     // user_id
  notes?: string
  status: 'closed' | 'reopened'
  snapshot_balances?: AccountBalance[]  // JSON parsed dari JSONB
  created_at: string
  updated_at: string
}

export interface ClosePeriodInput {
  period_start: string  // 'YYYY-MM-DD'
  period_end: string    // 'YYYY-MM-DD'
  notes?: string
}

// ============================================================
// Modul Pembelian Barang — Purchasing / Procurement
// ============================================================

export interface Supplier {
  id: string
  user_id?: string
  name: string
  contact_person?: string
  phone?: string
  email?: string
  address?: string
  supplier_type: 'langsung' | 'distributor' | 'grosir' | 'importir'
  payment_term: 'tunai' | '7' | '14' | '30'
  credit_limit: number
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type SupplierInsert = Omit<Supplier, 'id' | 'created_at' | 'updated_at'>
export type SupplierUpdate = Partial<SupplierInsert>

export interface SupplierWithStats extends Supplier {
  total_purchases?: number
  outstanding_balance?: number
}

export interface PurchaseOrderItem {
  id: string
  user_id?: string
  po_id: string
  product_id?: string
  product_name: string
  quantity: number
  price: number
  discount: number
  subtotal: number
  received_quantity: number
  created_at: string
}

export interface PurchaseOrder {
  id: string
  user_id?: string
  po_number: string
  supplier_id?: string
  supplier_name?: string
  po_date: string
  expected_date?: string
  status: 'draft' | 'submitted' | 'confirmed' | 'partial' | 'completed' | 'cancelled'
  subtotal: number
  discount: number
  tax: number
  shipping_cost: number
  total: number
  notes?: string
  created_at: string
  updated_at: string
  items?: PurchaseOrderItem[]
  supplier?: Pick<Supplier, 'id' | 'name' | 'phone'>
}

export interface POItemInput {
  product_id: string
  product_name: string
  quantity: number
  price: number
  discount?: number
}

export interface PurchaseOrderInput {
  supplier_id?: string
  supplier_name?: string
  po_date: string
  expected_date?: string
  discount?: number
  tax?: number
  shipping_cost?: number
  notes?: string
  items: POItemInput[]
}

export type PurchaseOrderInsert = Omit<PurchaseOrder, 'id' | 'created_at' | 'updated_at'>
export type PurchaseOrderUpdate = Partial<PurchaseOrderInsert>

export interface GoodsReceiptItem {
  id: string
  user_id?: string
  grn_id: string
  po_item_id?: string
  product_id?: string
  product_name: string
  quantity_received: number
  quantity_rejected: number
  price: number
  subtotal: number
  created_at: string
}

export interface GoodsReceipt {
  id: string
  user_id?: string
  grn_number: string
  po_id?: string
  supplier_id?: string
  supplier_name?: string
  receipt_date: string
  status: 'draft' | 'completed' | 'cancelled'
  total: number
  notes?: string
  created_at: string
  updated_at: string
  items?: GoodsReceiptItem[]
}

export interface GRNItemInput {
  po_item_id?: string
  product_id: string
  product_name: string
  quantity_received: number
  quantity_rejected?: number
  price: number
}

export interface GoodsReceiptInput {
  po_id?: string
  supplier_id?: string
  supplier_name?: string
  receipt_date: string
  notes?: string
  items: GRNItemInput[]
}

export interface PurchaseInvoiceItem {
  id: string
  user_id?: string
  pi_id: string
  grn_item_id?: string
  product_id?: string
  product_name: string
  quantity: number
  price: number
  subtotal: number
  created_at: string
}

export interface PurchaseInvoicePayment {
  id: string
  user_id?: string
  pi_id: string
  amount: number
  payment_method: string
  notes?: string
  created_at: string
}

export interface PurchaseInvoice {
  id: string
  user_id?: string
  pi_number: string
  grn_id?: string
  po_id?: string
  supplier_id?: string
  supplier_name?: string
  invoice_date: string
  due_date?: string
  subtotal: number
  discount: number
  tax: number
  shipping_cost: number
  total: number
  paid_amount: number
  remaining_amount: number
  payment_status: 'belum_lunas' | 'sebagian' | 'lunas'
  notes?: string
  created_at: string
  updated_at: string
  items?: PurchaseInvoiceItem[]
  payments?: PurchaseInvoicePayment[]
}

export interface PurchaseInvoiceInput {
  grn_id?: string
  po_id?: string
  supplier_id?: string
  supplier_name?: string
  invoice_date: string
  due_date?: string
  discount?: number
  tax?: number
  shipping_cost?: number
  notes?: string
  items: GRNItemInput[]
}

export interface PurchaseReturnItem {
  id: string
  user_id?: string
  pr_id: string
  product_id?: string
  product_name: string
  quantity: number
  price: number
  price_buy: number
  subtotal: number
  created_at: string
}

export interface PurchaseReturn {
  id: string
  user_id?: string
  pr_number: string
  grn_id?: string
  pi_id?: string
  supplier_id?: string
  supplier_name?: string
  return_date: string
  total_refund: number
  reason: 'cacat' | 'salah_produk' | 'kadaluarsa' | 'rusak_kirim' | 'lainnya'
  notes?: string
  status: 'draft' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
  items?: PurchaseReturnItem[]
}

export interface PurchaseReturnInput {
  grn_id?: string
  pi_id?: string
  supplier_id?: string
  supplier_name?: string
  return_date: string
  reason: 'cacat' | 'salah_produk' | 'kadaluarsa' | 'rusak_kirim' | 'lainnya'
  notes?: string
  items: GRNItemInput[]
}

// ============================================================
// Modul HR & Payroll — Manajemen Karyawan
// ============================================================

// Jabatan di sistem ini hanya 2 (teks tetap): 'supir' | 'loader'.
// Master departemen/jabatan sudah dihapus — tidak ada tabel relasi lagi.
export type PositionName = 'supir' | 'loader'

export interface Employee {
  id: string
  user_id?: string
  employee_code: string
  name: string
  gender?: 'laki_laki' | 'perempuan'
  birth_place?: string
  birth_date?: string
  phone?: string
  email?: string
  address?: string
  identity_type?: string
  identity_number?: string
  position?: PositionName | ''
  join_date?: string
  resign_date?: string
  status: 'aktif' | 'cuti' | 'nonaktif' | 'keluar'
  salary_type: 'bulanan' | 'harian' | 'mingguan'
  base_salary: number
  bank_name?: string
  bank_account_number?: string
  bank_account_name?: string
  npwp?: string
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type EmployeeInsert = Omit<Employee, 'id' | 'created_at' | 'updated_at'>
export type EmployeeUpdate = Partial<EmployeeInsert>

export interface EmployeeWithStats extends Employee {
  total_attendance?: number
  total_absences?: number
}

export interface Attendance {
  id: string
  user_id?: string
  employee_id: string
  attendance_date: string
  check_in?: string
  check_out?: string
  status: 'hadir' | 'izin' | 'sakit' | 'cuti' | 'alpa'
  notes?: string
  created_at: string
  updated_at: string
  employee?: Employee
}

export type AttendanceInsert = Omit<Attendance, 'id' | 'created_at' | 'updated_at'>
export type AttendanceUpdate = Partial<AttendanceInsert>

// Payroll Component & PayrollItem sudah dihapus dari sistem baru
// Komponen otomatis tidak dipakai lagi, hanya potongan kasbon manual

export interface Payroll {
  id: string
  user_id?: string
  employee_id: string
  period_code: string
  period_start: string
  period_end: string
  base_salary: number
  incentive_amount: number
  kasbon_deduction: number
  total_net: number
  incentive_details?: Array<{
    type: 'loader' | 'driver'
    date: string
    do_number: string
    description: string
    quantity?: number
    unit_price?: number
    amount: number
  }>
  status: 'draft' | 'paid'
  journal_entry_id?: string
  paid_at?: string
  notes?: string
  created_at: string
  updated_at: string
  employee?: Employee
}

export type PayrollInsert = Omit<Payroll, 'id' | 'created_at' | 'updated_at' | 'employee'>
export type PayrollUpdate = Partial<PayrollInsert>

// ============================================================
// Kasbon Karyawan (Employee Loans)
// ============================================================

export interface EmployeeLoan {
  id: string
  user_id?: string
  employee_id: string
  loan_date: string
  amount: number
  remaining_amount: number
  description?: string
  status: 'active' | 'paid' | 'cancelled'
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
  employee?: Employee
  payments?: EmployeeLoanPayment[]
}

export type EmployeeLoanInsert = Omit<EmployeeLoan, 'id' | 'created_at' | 'updated_at' | 'employee' | 'payments'>
export type EmployeeLoanUpdate = Partial<EmployeeLoanInsert>

export interface EmployeeLoanPayment {
  id: string
  loan_id: string
  payroll_id?: string
  payment_date: string
  amount: number
  notes?: string
  created_at: string
  created_by?: string
  loan?: EmployeeLoan
  payroll?: Payroll
}

export type EmployeeLoanPaymentInsert = Omit<EmployeeLoanPayment, 'id' | 'created_at' | 'loan' | 'payroll'>
export type EmployeeLoanPaymentUpdate = Partial<EmployeeLoanPaymentInsert>

/**
 * Pilihan potongan kasbon per karyawan saat generate payroll.
 * 'all' = potong semua sisa, 'half' = potong setengah, 'none' = jangan potong,
 * string angka (mis. '500000') = potong sesuai nominal.
 */
export type KasbonChoice = 'all' | 'half' | 'none' | (string & {})

/** Hasil RPC apply_kasbon_deductions */
export interface KasbonDeductionResult {
  applied_count: number
  applied_amount: number
}

// ============================================================
// Modul Shipping / Pengiriman — Surat Jalan
// ============================================================

export interface Vehicle {
  id: string
  user_id?: string
  plate_number: string
  vehicle_type: string
  brand?: string
  capacity_kg: number
  status: 'tersedia' | 'dipakai' | 'service'
  is_active: boolean
  created_at: string
  updated_at: string
}

export type VehicleInsert = Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>
export type VehicleUpdate = Partial<VehicleInsert>

// ------------------------------------------------------------
// Anak Surat Jalan: referensi transaksi (1 DO → banyak transaksi),
// tim muat, dan daftar barang dimuat (input manual).
// Upah loader: CEIL( Σ(jumlah × harga) ÷ jumlah loader ) per DO selesai.
// ------------------------------------------------------------

export interface DeliveryOrderTransaction {
  id: string
  user_id?: string
  delivery_order_id: string
  transaction_id: string
  created_at: string
}

export type DeliveryOrderTransactionInput = {
  transaction_id: string
}

export interface DeliveryLoader {
  id: string
  user_id?: string
  delivery_order_id: string
  employee_id: string
  employee_name?: string
  created_at: string
}

export type DeliveryLoaderInput = {
  employee_id: string
  employee_name?: string
}

export interface DeliveryLoadItem {
  id: string
  user_id?: string
  delivery_order_id: string
  product_name: string
  quantity: number
  unit_price: number
  created_at: string
}

export type DeliveryLoadItemInput = {
  product_name: string
  quantity: number
  unit_price: number
}

export interface DeliveryOrder {
  id: string
  user_id?: string
  do_number: string
  do_date: string
  customer_id?: string
  customer_name?: string
  customer_address?: string
  vehicle_id?: string
  driver_id?: string
  driver_name?: string
  driver_fee?: number
  notes?: string
  status: 'draft' | 'disiapkan' | 'dikirim' | 'selesai' | 'batal'
  created_at: string
  updated_at: string
  vehicle?: Vehicle
  driver?: Employee
  items?: DeliveryItem[]
  tracking?: DeliveryTracking[]
  /** ID transaksi yang dirujuk surat jalan ini (banyak) */
  transaction_ids?: string[]
  transactions?: Transaction[]
  /** Tim muat (karyawan) */
  loaders?: DeliveryLoader[]
  /** Daftar barang dimuat (input manual) */
  load_items?: DeliveryLoadItem[]
  /** Total karung (SUM quantity items) — dihitung dinamis */
  qty_total?: number
}

export type DeliveryOrderInsert = Omit<DeliveryOrder, 'id' | 'created_at' | 'updated_at'>
export type DeliveryOrderUpdate = Partial<DeliveryOrderInsert>

export interface DeliveryItem {
  id: string
  user_id?: string
  delivery_order_id: string
  product_id?: string
  product_name: string
  quantity: number
  created_at: string
}

export type DeliveryItemInsert = Omit<DeliveryItem, 'id' | 'created_at'>

export interface DeliveryTracking {
  id: string
  user_id?: string
  delivery_order_id: string
  status: 'draft' | 'disiapkan' | 'dikirim' | 'selesai' | 'batal'
  note?: string
  created_at: string
}

export type DeliveryTrackingInsert = Omit<DeliveryTracking, 'id' | 'created_at'>
