-- ============================================================
-- Query untuk memeriksa apakah fungsi create_transaction
-- sudah memiliki pemanggilan allocate_payment_to_items
-- ============================================================

-- 1. Cek isi fungsi create_transaction
SELECT
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'create_transaction'
  AND pronamespace = 'public'::regnamespace;

-- 2. Cek apakah ada teks 'allocate_payment_to_items' di dalam fungsi
SELECT
  proname,
  CASE
    WHEN pg_get_functiondef(oid) LIKE '%allocate_payment_to_items%'
    THEN '✅ SUDAH ADA pemanggilan allocate_payment_to_items'
    ELSE '❌ BELUM ADA pemanggilan allocate_payment_to_items'
  END as status
FROM pg_proc
WHERE proname = 'create_transaction'
  AND pronamespace = 'public'::regnamespace;

-- 3. Cek apakah fungsi allocate_payment_to_items ada
SELECT
  proname as function_name,
  prokind as kind,
  pronargs as num_args
FROM pg_proc
WHERE proname = 'allocate_payment_to_items'
  AND pronamespace = 'public'::regnamespace;
