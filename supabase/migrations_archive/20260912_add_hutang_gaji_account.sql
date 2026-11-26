-- ============================================================
-- Migration: Tambah Akun Default "Hutang Gaji"
-- Date: 2026-09-12
-- Purpose: Menambahkan akun kewajiban "Hutang Gaji" untuk
--          mendukung jurnal payroll yang memerlukan akun ini
-- ============================================================

-- Tambahkan akun Hutang Gaji ke semua user yang sudah ada
INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system, is_active)
SELECT
  user_id,
  '2-2100' as code,
  'Hutang Gaji' as name,
  'kewajiban' as type,
  'kredit' as normal_balance,
  true as is_system,
  true as is_active
FROM (
  SELECT DISTINCT user_id
  FROM chart_of_accounts
) AS existing_users
WHERE NOT EXISTS (
  SELECT 1
  FROM chart_of_accounts
  WHERE user_id = existing_users.user_id
    AND code = '2-2100'
);
