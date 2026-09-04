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
  barcode?: string
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

export interface Department {
  id: string
  user_id?: string
  name: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type DepartmentInsert = Omit<Department, 'id' | 'created_at' | 'updated_at'>
export type DepartmentUpdate = Partial<DepartmentInsert>

export interface Position {
  id: string
  user_id?: string
  department_id?: string
  name: string
  base_salary: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type PositionInsert = Omit<Position, 'id' | 'created_at' | 'updated_at'>
export type PositionUpdate = Partial<PositionInsert>

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
  department_id?: string
  position_id?: string
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
  department?: Department
  position?: Position
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

export interface PayrollComponent {
  id: string
  user_id?: string
  name: string
  type: 'tunjangan' | 'potongan'
  amount: number
  is_percentage: boolean
  apply_to: 'semua' | 'per_jabatan' | 'per_karyawan'
  position_id?: string
  employee_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type PayrollComponentInsert = Omit<PayrollComponent, 'id' | 'created_at' | 'updated_at'>
export type PayrollComponentUpdate = Partial<PayrollComponentInsert>

export interface PayrollPeriod {
  id: string
  user_id?: string
  period_code: string
  period_month: number
  period_year: number
  start_date: string
  end_date: string
  status: 'draft' | 'generated' | 'paid' | 'cancelled'
  total_employee: number
  total_gross: number
  total_deduction: number
  total_net: number
  paid_at?: string
  created_at: string
  updated_at: string
}

export type PayrollPeriodInsert = Omit<PayrollPeriod, 'id' | 'created_at' | 'updated_at'>
export type PayrollPeriodUpdate = Partial<PayrollPeriodInsert>

export interface PayrollItem {
  id: string
  user_id?: string
  payroll_id: string
  component_id?: string
  component_name: string
  component_type: 'tunjangan' | 'potongan'
  amount: number
  created_at: string
}

export interface Payroll {
  id: string
  user_id?: string
  period_id: string
  employee_id: string
  base_salary: number
  total_allowance: number
  total_deduction: number
  total_gross: number
  total_net: number
  status: 'draft' | 'paid'
  notes?: string
  created_at: string
  updated_at: string
  items?: PayrollItem[]
  employee?: Employee
}

export type PayrollInsert = Omit<Payroll, 'id' | 'created_at' | 'updated_at'>
export type PayrollUpdate = Partial<PayrollInsert>

export interface PayrollSummary {
  period_id: string
  period_code: string
  employee_count: number
  total_gross: number
  total_deduction: number
  total_net: number
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

export interface DeliveryOrder {
  id: string
  user_id?: string
  do_number: string
  do_date: string
  transaction_id?: string
  customer_id?: string
  customer_name?: string
  customer_address?: string
  vehicle_id?: string
  driver_id?: string
  driver_name?: string
  notes?: string
  status: 'draft' | 'disiapkan' | 'dikirim' | 'selesai' | 'batal'
  created_at: string
  updated_at: string
  vehicle?: Vehicle
  driver?: Employee
  items?: DeliveryItem[]
  tracking?: DeliveryTracking[]
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
