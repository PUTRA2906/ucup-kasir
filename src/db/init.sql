-- ============================================================
-- Skema SQLite Lokal — Ucup Kasir
-- Replikasi 1:1 dari Supabase + kolom sync metadata
-- Tiap tabel mendapat: sync_status ('synced' | 'pending' | 'failed')
--                      updated_at_local (timestamp update terakhir lokal)
-- ============================================================

-- 1) Categories
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT
);

-- 2) Products
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category_id TEXT,
  price_buy REAL NOT NULL DEFAULT 0,
  price_sell REAL NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  minimum_stock INTEGER NOT NULL DEFAULT 10,
  sku TEXT,
  barcode TEXT,
  image_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);
CREATE INDEX IF NOT EXISTS idx_products_user_name ON products (user_id, name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_id);

-- 3) Customers
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  store_name TEXT,
  phone TEXT,
  kecamatan TEXT,
  address TEXT,
  notes TEXT,
  credit_limit REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT
);
CREATE INDEX IF NOT EXISTS idx_customers_user_name ON customers (user_id, name);

-- 4) Transactions (header)
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  transaction_number TEXT NOT NULL,
  customer_id TEXT,
  customer_name TEXT,
  subtotal REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  shipping_cost REAL NOT NULL DEFAULT 0,
  return_amount REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'tunai',
  paid_amount REAL NOT NULL DEFAULT 0,
  change_amount REAL NOT NULL DEFAULT 0,
  remaining_amount REAL NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'belum_lunas',
  status TEXT NOT NULL DEFAULT 'selesai',
  transaction_status TEXT NOT NULL DEFAULT 'disiapkan',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);
CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON transactions (user_id, created_at DESC);

-- 5) Transaction Items
CREATE TABLE IF NOT EXISTS transaction_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  product_id TEXT,
  product_name TEXT NOT NULL,
  price REAL NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  subtotal REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_transaction_items_txn ON transaction_items (transaction_id);

-- 6) Transaction Payments
CREATE TABLE IF NOT EXISTS transaction_payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'tunai',
  notes TEXT,
  created_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_transaction_payments_txn ON transaction_payments (transaction_id, created_at DESC);

-- 6b) Transaction Item Payments (alokasi pembayaran per item)
CREATE TABLE IF NOT EXISTS transaction_item_payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  payment_id TEXT NOT NULL,
  allocated_amount REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES transaction_items(id) ON DELETE CASCADE,
  FOREIGN KEY (payment_id) REFERENCES transaction_payments(id) ON DELETE CASCADE,
  CHECK (allocated_amount > 0)
);
CREATE INDEX IF NOT EXISTS idx_item_payments_transaction ON transaction_item_payments (transaction_id);
CREATE INDEX IF NOT EXISTS idx_item_payments_item ON transaction_item_payments (item_id);
CREATE INDEX IF NOT EXISTS idx_item_payments_payment ON transaction_item_payments (payment_id);
CREATE INDEX IF NOT EXISTS idx_item_payments_user_created ON transaction_item_payments (user_id, created_at DESC);

-- 7) Returns (header)
CREATE TABLE IF NOT EXISTS returns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  return_number TEXT NOT NULL,
  total_refund REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_returns_transaction ON returns (transaction_id);

-- 8) Return Items
CREATE TABLE IF NOT EXISTS return_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  return_id TEXT NOT NULL,
  product_id TEXT,
  product_name TEXT NOT NULL,
  price REAL NOT NULL DEFAULT 0,
  price_buy REAL NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  subtotal REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT,
  FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_return_items_return ON return_items (return_id);

-- 9) Store Settings (1 record per user)
CREATE TABLE IF NOT EXISTS store_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  store_name TEXT NOT NULL DEFAULT 'Ucup Kasir',
  store_subtitle TEXT DEFAULT 'Toko Berkat Jaya Makmur',
  store_address TEXT DEFAULT '',
  store_phone TEXT DEFAULT '',
  store_email TEXT DEFAULT '',
  tax_enabled INTEGER NOT NULL DEFAULT 0,
  tax_rate REAL NOT NULL DEFAULT 0,
  default_credit_limit REAL NOT NULL DEFAULT 0,
  loading_rate_per_sack REAL NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'IDR',
  receipt_footer TEXT DEFAULT 'Terima kasih atas kunjungan Anda',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT
);

-- 10) Stock Movements
CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  movement_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  quantity_before INTEGER NOT NULL DEFAULT 0,
  quantity_after INTEGER NOT NULL DEFAULT 0,
  reference_type TEXT,
  reference_id TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT,
  FOREIGN KEY (product_id) REFERENCES products(id)
);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements (product_id, created_at DESC);

-- 11) Stock Adjustments
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  adjustment_type TEXT NOT NULL,
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  quantity_change INTEGER NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT,
  FOREIGN KEY (product_id) REFERENCES products(id)
);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_product ON stock_adjustments (product_id, created_at DESC);

-- 12) Stock Opnames
CREATE TABLE IF NOT EXISTS stock_opnames (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  opname_number TEXT NOT NULL UNIQUE,
  opname_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  created_by TEXT,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT
);

-- 13) Stock Opname Items
CREATE TABLE IF NOT EXISTS stock_opname_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  opname_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  system_quantity INTEGER NOT NULL,
  actual_quantity INTEGER NOT NULL,
  difference INTEGER NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT,
  FOREIGN KEY (opname_id) REFERENCES stock_opnames(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);
CREATE INDEX IF NOT EXISTS idx_stock_opname_items_opname ON stock_opname_items (opname_id);

-- 14) Stock Alerts
CREATE TABLE IF NOT EXISTS stock_alerts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  minimum_stock INTEGER NOT NULL DEFAULT 10,
  alert_enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT,
  FOREIGN KEY (product_id) REFERENCES products(id)
);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_product ON stock_alerts (product_id);

-- 15) Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  read_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications (user_id, created_at DESC);

-- ============================================================
-- Tabel Metadata
-- ============================================================

-- 16) Sync Queue — operasi yang perlu diupload ke Supabase
CREATE TABLE IF NOT EXISTS sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation TEXT NOT NULL,      -- 'INSERT' | 'UPDATE' | 'DELETE'
  table_name TEXT NOT NULL,     -- 'products', 'transactions', dll
  record_id TEXT NOT NULL,      -- UUID record yang diubah
  payload TEXT NOT NULL,        -- JSON dari data yang diubah
  created_at TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT
);

-- 17) Sync Metadata — key-value store
CREATE TABLE IF NOT EXISTS sync_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- key yang dipakai:
--   'last_sync_at'      : waktu upload terakhir berhasil
--   'last_download_at'  : waktu download terakhir dari Supabase
--   'user_id'           : user yang datanya ada di SQLite
--   'schema_version'    : versi schema SQLite

-- 17b) Event Log — perekam aktivitas & error aplikasi (LOKAL SAJA,
--      tidak ikut disinkron ke Supabase). Sumber error: sqlite,
--      supabase, sync, auth, network, app.
CREATE TABLE IF NOT EXISTS app_event_log (
  uid TEXT PRIMARY KEY,          -- id unik dari buffer in-memory
  ts INTEGER NOT NULL,           -- epoch ms
  level TEXT NOT NULL,           -- 'info' | 'warn' | 'error'
  source TEXT NOT NULL,          -- 'sqlite' | 'supabase' | 'sync' | 'auth' | 'network' | 'app'
  event TEXT NOT NULL,           -- kode event, mis. 'query_failed', 'sync_upload'
  message TEXT NOT NULL,
  detail TEXT,                   -- stack trace / JSON opsional
  platform TEXT NOT NULL         -- 'android' | 'web'
);
CREATE INDEX IF NOT EXISTS idx_app_event_log_ts ON app_event_log (ts DESC);

-- ============================================================
-- Modul Finance — Double-entry Accounting
-- ============================================================

-- 18) Chart of Accounts
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('aset', 'kewajiban', 'ekuitas', 'pendapatan', 'beban')),
  normal_balance TEXT NOT NULL DEFAULT 'debit' CHECK (normal_balance IN ('debit', 'kredit')),
  is_active INTEGER NOT NULL DEFAULT 1,
  is_system INTEGER NOT NULL DEFAULT 0,
  parent_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT,
  UNIQUE (user_id, code),
  FOREIGN KEY (parent_id) REFERENCES chart_of_accounts(id)
);
CREATE INDEX IF NOT EXISTS idx_coa_user_type ON chart_of_accounts (user_id, type);

-- 19) Jurnal Umum (header)
CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  journal_number TEXT NOT NULL,
  entry_date TEXT NOT NULL,
  description TEXT NOT NULL,
  reference_type TEXT CHECK (reference_type IN ('manual', 'transaction', 'return', 'payment', 'void', 'purchase', 'purchase_payment', 'purchase_return', 'payroll')),
  reference_id TEXT,
  status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('draft', 'posted', 'void')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT
);
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_date ON journal_entries (user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_reference ON journal_entries (reference_type, reference_id);

-- 20) Baris Jurnal (detail debit/kredit)
CREATE TABLE IF NOT EXISTS journal_lines (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  journal_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  debit REAL NOT NULL DEFAULT 0,
  credit REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT,
  FOREIGN KEY (journal_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id)
);
CREATE INDEX IF NOT EXISTS idx_journal_lines_journal ON journal_lines (journal_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_lines (account_id);

-- ============================================================
-- Modul Pembelian Barang — Purchasing / Procurement
-- ============================================================

-- 21) Suppliers (Master Pemasok)
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  supplier_type TEXT NOT NULL DEFAULT 'langsung' CHECK (supplier_type IN ('langsung', 'distributor', 'grosir', 'importir')),
  payment_term TEXT NOT NULL DEFAULT 'tunai' CHECK (payment_term IN ('tunai', '7', '14', '30')),
  credit_limit REAL NOT NULL DEFAULT 0,
  notes TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT
);
CREATE INDEX IF NOT EXISTS idx_suppliers_user_name ON suppliers (user_id, name);

-- 22) Purchase Orders (header pesanan pembelian)
CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  po_number TEXT NOT NULL,
  supplier_id TEXT,
  supplier_name TEXT,
  po_date TEXT NOT NULL,
  expected_date TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'confirmed', 'partial', 'completed', 'cancelled')),
  subtotal REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  tax REAL NOT NULL DEFAULT 0,
  shipping_cost REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_po_user_date ON purchase_orders (user_id, po_date DESC);
CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders (supplier_id);

-- 23) PO Items (detail pesanan pembelian)
CREATE TABLE IF NOT EXISTS po_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  po_id TEXT NOT NULL,
  product_id TEXT,
  product_name TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 0,
  price REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  subtotal REAL NOT NULL DEFAULT 0,
  received_quantity REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT,
  FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_po_items_po ON po_items (po_id);

-- 24) Goods Receipts (penerimaan barang / GRN)
CREATE TABLE IF NOT EXISTS goods_receipts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  grn_number TEXT NOT NULL,
  po_id TEXT,
  supplier_id TEXT,
  supplier_name TEXT,
  receipt_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'cancelled')),
  total REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT,
  FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE SET NULL,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_grn_user_date ON goods_receipts (user_id, receipt_date DESC);

-- 25) GRN Items (barang yang benar-benar diterima)
CREATE TABLE IF NOT EXISTS grn_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  grn_id TEXT NOT NULL,
  po_item_id TEXT,
  product_id TEXT,
  product_name TEXT NOT NULL,
  quantity_received REAL NOT NULL DEFAULT 0,
  quantity_rejected REAL NOT NULL DEFAULT 0,
  price REAL NOT NULL DEFAULT 0,
  subtotal REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT,
  FOREIGN KEY (grn_id) REFERENCES goods_receipts(id) ON DELETE CASCADE,
  FOREIGN KEY (po_item_id) REFERENCES po_items(id) ON DELETE SET NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_grn_items_grn ON grn_items (grn_id);

-- 26) Purchase Invoices (tagihan dari supplier)
CREATE TABLE IF NOT EXISTS purchase_invoices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  pi_number TEXT NOT NULL,
  grn_id TEXT,
  po_id TEXT,
  supplier_id TEXT,
  supplier_name TEXT,
  invoice_date TEXT NOT NULL,
  due_date TEXT,
  subtotal REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  tax REAL NOT NULL DEFAULT 0,
  shipping_cost REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  paid_amount REAL NOT NULL DEFAULT 0,
  remaining_amount REAL NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'belum_lunas' CHECK (payment_status IN ('belum_lunas', 'sebagian', 'lunas')),
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT,
  FOREIGN KEY (grn_id) REFERENCES goods_receipts(id) ON DELETE SET NULL,
  FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE SET NULL,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_pi_user_date ON purchase_invoices (user_id, invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_pi_supplier ON purchase_invoices (supplier_id);

-- 27) PI Items (barang yang ditagih)
CREATE TABLE IF NOT EXISTS pi_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  pi_id TEXT NOT NULL,
  grn_item_id TEXT,
  product_id TEXT,
  product_name TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 0,
  price REAL NOT NULL DEFAULT 0,
  subtotal REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT,
  FOREIGN KEY (pi_id) REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (grn_item_id) REFERENCES grn_items(id) ON DELETE SET NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_pi_items_pi ON pi_items (pi_id);

-- 28) PI Payments (pembayaran ke supplier)
CREATE TABLE IF NOT EXISTS pi_payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  pi_id TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'tunai',
  notes TEXT,
  created_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT,
  FOREIGN KEY (pi_id) REFERENCES purchase_invoices(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_pi_payments_pi ON pi_payments (pi_id, created_at DESC);

-- 29) Purchase Returns (retur ke supplier)
CREATE TABLE IF NOT EXISTS purchase_returns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  pr_number TEXT NOT NULL,
  grn_id TEXT,
  pi_id TEXT,
  supplier_id TEXT,
  supplier_name TEXT,
  return_date TEXT NOT NULL,
  total_refund REAL NOT NULL DEFAULT 0,
  reason TEXT NOT NULL DEFAULT 'cacat' CHECK (reason IN ('cacat', 'salah_produk', 'kadaluarsa', 'rusak_kirim', 'lainnya')),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('draft', 'completed', 'cancelled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT,
  FOREIGN KEY (grn_id) REFERENCES goods_receipts(id) ON DELETE SET NULL,
  FOREIGN KEY (pi_id) REFERENCES purchase_invoices(id) ON DELETE SET NULL,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_pr_user_date ON purchase_returns (user_id, return_date DESC);

-- 30) Purchase Return Items
CREATE TABLE IF NOT EXISTS purchase_return_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  pr_id TEXT NOT NULL,
  product_id TEXT,
  product_name TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 0,
  price REAL NOT NULL DEFAULT 0,
  price_buy REAL NOT NULL DEFAULT 0,
  subtotal REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT,
  FOREIGN KEY (pr_id) REFERENCES purchase_returns(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_pr_items_pr ON purchase_return_items (pr_id);

-- ============================================================
-- Update CHECK constraint reference_type pada journal_entries
-- (tabel sudah ada di database lama — ALTER TABLE rebuild agar
--  mendukung tipe referensi baru modul pembelian)
-- ============================================================
ALTER TABLE journal_entries DROP CONSTRAINT IF EXISTS journal_entries_check_old;

-- ============================================================
-- Modul HR & Payroll — Manajemen Karyawan
-- ============================================================

-- (31 & 32 dihapus: master Departemen/Jabatan tidak dipakai lagi —
--  jabatan kini teks tetap 'supir' | 'loader' di kolom employees.position)

-- 33) Karyawan (Master Pegawai)
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  employee_code TEXT NOT NULL,
  name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('laki_laki', 'perempuan')),
  birth_place TEXT,
  birth_date TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  identity_type TEXT,
  identity_number TEXT,
  position TEXT CHECK (position IN ('supir', 'loader')),
  join_date TEXT,
  resign_date TEXT,
  status TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'cuti', 'nonaktif', 'keluar')),
  salary_type TEXT NOT NULL DEFAULT 'bulanan' CHECK (salary_type IN ('bulanan', 'harian', 'mingguan')),
  base_salary REAL NOT NULL DEFAULT 0,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_name TEXT,
  npwp TEXT,
  notes TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT
);
CREATE INDEX IF NOT EXISTS idx_employees_user_name ON employees (user_id, name);

-- 34) Absensi Karyawan
CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  attendance_date TEXT NOT NULL,
  check_in TEXT,
  check_out TEXT,
  status TEXT NOT NULL DEFAULT 'hadir' CHECK (status IN ('hadir', 'izin', 'sakit', 'cuti', 'alpa')),
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance (user_id, attendance_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance (employee_id);

-- 35) Payroll (slip gaji per karyawan, periode mandiri per slip)
CREATE TABLE IF NOT EXISTS payrolls (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  period_code TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  base_salary REAL NOT NULL DEFAULT 0,
  incentive_amount REAL NOT NULL DEFAULT 0,
  kasbon_deduction REAL NOT NULL DEFAULT 0,
  total_net REAL NOT NULL DEFAULT 0,
  incentive_details TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'paid')),
  journal_entry_id TEXT,
  paid_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT,
  UNIQUE (user_id, period_code),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_payrolls_user_employee ON payrolls (user_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_payrolls_period_dates ON payrolls (period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_payrolls_status ON payrolls (status);
CREATE INDEX IF NOT EXISTS idx_payrolls_journal ON payrolls (journal_entry_id);

-- 38b) Kasbon Karyawan (Employee Loans)
CREATE TABLE IF NOT EXISTS employee_loans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  loan_date TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  remaining_amount REAL NOT NULL DEFAULT 0,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid', 'cancelled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_employee_loans_user ON employee_loans (user_id);
CREATE INDEX IF NOT EXISTS idx_employee_loans_employee ON employee_loans (employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_loans_date ON employee_loans (loan_date DESC);

-- 38c) Riwayat Pembayaran/Potongan Kasbon
CREATE TABLE IF NOT EXISTS employee_loan_payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  loan_id TEXT NOT NULL,
  payroll_id TEXT,
  payment_date TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT,
  FOREIGN KEY (loan_id) REFERENCES employee_loans(id) ON DELETE CASCADE,
  FOREIGN KEY (payroll_id) REFERENCES payrolls(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_employee_loan_payments_loan ON employee_loan_payments (loan_id);
CREATE INDEX IF NOT EXISTS idx_employee_loan_payments_payroll ON employee_loan_payments (payroll_id);

-- ============================================================
-- Modul Shipping / Pengiriman — Surat Jalan
-- ============================================================

-- 38) Kendaraan (Armada)
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plate_number TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  brand TEXT,
  capacity_kg REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'tersedia' CHECK (status IN ('tersedia', 'dipakai', 'service')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT
);
CREATE INDEX IF NOT EXISTS idx_vehicles_user_plate ON vehicles (user_id, plate_number);

-- 39) Surat Jalan / Delivery Order (header)
CREATE TABLE IF NOT EXISTS delivery_orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  do_number TEXT NOT NULL,
  do_date TEXT NOT NULL,
  customer_id TEXT,
  customer_name TEXT,
  customer_address TEXT,
  vehicle_id TEXT,
  driver_id TEXT,
  driver_name TEXT,
  driver_fee REAL NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'disiapkan', 'dikirim', 'selesai', 'batal')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
  FOREIGN KEY (driver_id) REFERENCES employees(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_user_date ON delivery_orders (user_id, do_date DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_status ON delivery_orders (status);

-- 40) Referensi transaksi per Surat Jalan (1 DO → banyak transaksi)
CREATE TABLE IF NOT EXISTS delivery_order_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  delivery_order_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT,
  FOREIGN KEY (delivery_order_id) REFERENCES delivery_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  UNIQUE (delivery_order_id, transaction_id)
);
CREATE INDEX IF NOT EXISTS idx_do_transactions_do ON delivery_order_transactions (delivery_order_id);
CREATE INDEX IF NOT EXISTS idx_do_transactions_tx ON delivery_order_transactions (transaction_id);

-- 41) Tim muat per Surat Jalan (karyawan yang ikut memuat)
CREATE TABLE IF NOT EXISTS delivery_loaders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  delivery_order_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  employee_name TEXT,
  created_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT,
  FOREIGN KEY (delivery_order_id) REFERENCES delivery_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE (delivery_order_id, employee_id)
);
CREATE INDEX IF NOT EXISTS idx_delivery_loaders_do ON delivery_loaders (delivery_order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_loaders_employee ON delivery_loaders (employee_id);

-- 42) Barang dimuat per Surat Jalan (input manual: nama + jumlah + harga upah/satuan)
CREATE TABLE IF NOT EXISTS delivery_load_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  delivery_order_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 0,
  unit_price REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT,
  FOREIGN KEY (delivery_order_id) REFERENCES delivery_orders(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_delivery_load_items_do ON delivery_load_items (delivery_order_id);

-- 43) Item Surat Jalan
CREATE TABLE IF NOT EXISTS delivery_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  delivery_order_id TEXT NOT NULL,
  product_id TEXT,
  product_name TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT,
  FOREIGN KEY (delivery_order_id) REFERENCES delivery_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_delivery_items_do ON delivery_items (delivery_order_id);

-- 41) Timeline Tracking Surat Jalan
CREATE TABLE IF NOT EXISTS delivery_tracking (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  delivery_order_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'disiapkan', 'dikirim', 'selesai', 'batal')),
  note TEXT,
  created_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT,
  FOREIGN KEY (delivery_order_id) REFERENCES delivery_orders(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_do ON delivery_tracking (delivery_order_id, created_at DESC);

-- ============================================================
-- MATRIKS HARGA (price matrix) — mirror Supabase
-- Prioritas resolve harga: per-pelanggan → per-grup → tier → price_sell.
-- ============================================================

-- 44) Customer Groups (grup pelanggan untuk harga grup)
CREATE TABLE IF NOT EXISTS customer_groups (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  notes TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT
);
CREATE INDEX IF NOT EXISTS idx_customer_groups_user ON customer_groups (user_id);

-- 45) Customer Group Members (anggota grup)
CREATE TABLE IF NOT EXISTS customer_group_members (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT,
  UNIQUE (group_id, customer_id),
  FOREIGN KEY (group_id) REFERENCES customer_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_cgm_group ON customer_group_members (group_id);
CREATE INDEX IF NOT EXISTS idx_cgm_customer ON customer_group_members (customer_id);

-- 46) Price Tiers (harga bertingkat per rentang kuantitas)
CREATE TABLE IF NOT EXISTS price_tiers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  min_quantity INTEGER NOT NULL CHECK (min_quantity > 0),
  max_quantity INTEGER,
  tier_price REAL NOT NULL,
  tier_name TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  start_date TEXT,
  end_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_price_tiers_user_product ON price_tiers (user_id, product_id, is_active);

-- 47) Customer Price Matrix (harga khusus per pelanggan ATAU per grup)
-- Tepat salah satu dari customer_id / group_id terisi.
CREATE TABLE IF NOT EXISTS customer_price_matrix (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  customer_id TEXT,
  group_id TEXT,
  product_id TEXT NOT NULL,
  custom_price REAL NOT NULL,
  min_quantity INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  start_date TEXT,
  end_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at_local TEXT,
  CHECK (
    (customer_id IS NOT NULL AND group_id IS NULL)
    OR (customer_id IS NULL AND group_id IS NOT NULL)
  ),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES customer_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_cpm_user_customer ON customer_price_matrix (user_id, customer_id, product_id);
CREATE INDEX IF NOT EXISTS idx_cpm_group ON customer_price_matrix (group_id);

-- ============================================================
-- MIGRASI DB LAMA: pivot insentif dari Perjalanan → Surat Jalan
-- (initSchema menjalankan statement satu per satu dengan try/catch;
--  pada DB baru statement ini gagal "no such table/column" & diabaikan)
-- ============================================================
-- backfill referensi transaksi lama ke join table (sudah ada di Supabase → synced)
INSERT OR IGNORE INTO delivery_order_transactions (id, user_id, delivery_order_id, transaction_id, created_at, sync_status)
SELECT lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))),
       user_id, id, transaction_id, created_at, 'synced'
FROM delivery_orders WHERE transaction_id IS NOT NULL;

-- Catatan: SQLite menolak DROP COLUMN pada kolom ber-FK, jadi kolom
-- trip_id/transaction_id lama dibiarkan yatim (kode tidak membacanya lagi).
DROP INDEX IF EXISTS idx_delivery_orders_trip;
DROP INDEX IF EXISTS idx_delivery_orders_transaction;
DROP TABLE IF EXISTS trip_loaders;
DROP TABLE IF EXISTS trips;

-- ============================================================
-- MIGRASI DB LAMA: hapus master Departemen/Jabatan
-- Rebuild employees & payroll_components (buang department_id/
-- position_id, backfill position TEXT) dilakukan di kode TS
-- (src/lib/sqlite.ts → migrateSchema) karena butuh urutan aman:
-- PRAGMA foreign_keys OFF dulu agar DROP tidak cascade ke
-- attendance/payroll/employee_loans.
-- ============================================================
