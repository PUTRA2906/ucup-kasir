-- Migration: Add incentive_details column to payrolls table
-- Date: 2026-09-16
-- Description: Menambahkan kolom untuk menyimpan detail breakdown insentif (loader & driver) di slip gaji

-- Add incentive_details column (JSONB untuk Postgres)
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS incentive_details JSONB;

-- Add comment untuk dokumentasi
COMMENT ON COLUMN payrolls.incentive_details IS 'Detail breakdown insentif per surat jalan (tanggal, DO number, deskripsi, amount)';

-- Create index untuk query performa (opsional tapi bagus untuk filter)
CREATE INDEX IF NOT EXISTS idx_payrolls_incentive_details ON payrolls USING gin (incentive_details);
