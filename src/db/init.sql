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
