-- ============================================================
-- Migrasi: kolom transaction_status pada tabel transactions
-- Project: Ucup Kasir
--
-- Menambah status transaksi (fulfillment) terpisah dari status
-- pembayaran & status void. Nilai: 'disiapkan' | 'dikirim' | 'selesai'.
-- Transaksi lama di-backfill ke 'selesai' agar tidak berubah perilaku.
-- Aman dijalankan ulang (idempotent).
-- ============================================================

-- 1) Tambah kolom jika belum ada
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_status text NOT NULL DEFAULT 'disiapkan';

-- 2) Backfill data lama: transaksi yang sudah ada dianggap selesai
--    (dibuat sebelum fitur status ada)
UPDATE transactions
SET transaction_status = 'selesai'
WHERE transaction_status = 'disiapkan'
  AND created_at < '2026-09-09';

-- 3) Indeks untuk filter status
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_status ON transactions (user_id, transaction_status);

-- 4) Kolom ikut sertakan di RPC create_transaction (opsional, RPC existing
--    tetap bekerja karena kolom punya DEFAULT 'disiapkan').
--    Tidak ada perubahan RPC — status baru diupdate via UPDATE langsung.
