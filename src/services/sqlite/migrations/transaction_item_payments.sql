-- ============================================================
-- SQLite Migration: transaction_item_payments
-- ============================================================

-- 1) Tabel alokasi pembayaran per item
CREATE TABLE IF NOT EXISTS transaction_item_payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  payment_id TEXT NOT NULL,
  allocated_amount REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES transaction_items(id) ON DELETE CASCADE,
  FOREIGN KEY (payment_id) REFERENCES transaction_payments(id) ON DELETE CASCADE,
  CHECK (allocated_amount > 0)
);

-- Indexes untuk performa
CREATE INDEX IF NOT EXISTS idx_item_payments_transaction 
  ON transaction_item_payments(transaction_id);
  
CREATE INDEX IF NOT EXISTS idx_item_payments_item 
  ON transaction_item_payments(item_id);
  
CREATE INDEX IF NOT EXISTS idx_item_payments_payment 
  ON transaction_item_payments(payment_id);
  
CREATE INDEX IF NOT EXISTS idx_item_payments_user_created 
  ON transaction_item_payments(user_id, created_at DESC);
