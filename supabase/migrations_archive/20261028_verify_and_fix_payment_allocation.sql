-- ============================================================
-- Migration: Verify & Fix Payment Allocation
-- Tanggal: 2026-10-28
--
-- Tujuan:
-- 1. Verifikasi bahwa semua pembayaran sudah dialokasikan ke items
-- 2. Alokasikan ulang pembayaran yang belum punya alokasi
-- 3. Tampilkan laporan pembayaran yang diperbaiki
-- ============================================================

-- Temporary table untuk tracking pembayaran yang diperbaiki
CREATE TEMP TABLE IF NOT EXISTS temp_fixed_payments (
  payment_id uuid,
  transaction_id uuid,
  amount numeric,
  allocated_before int,
  allocated_after int
);

-- 1. Identifikasi pembayaran yang belum punya alokasi
DO $$
DECLARE
  v_payment RECORD;
  v_allocated_before int;
  v_allocated_after int;
  v_fixed_count int := 0;
BEGIN
  RAISE NOTICE '=== Verifikasi Alokasi Pembayaran ===';

  FOR v_payment IN
    SELECT
      tp.id as payment_id,
      tp.transaction_id,
      tp.amount,
      tp.created_at,
      t.customer_name
    FROM transaction_payments tp
    JOIN transactions t ON t.id = tp.transaction_id
    ORDER BY tp.created_at ASC
  LOOP
    -- Cek berapa alokasi sebelum fix
    SELECT COUNT(*) INTO v_allocated_before
    FROM transaction_item_payments
    WHERE payment_id = v_payment.payment_id;

    -- Jika belum ada alokasi, alokasikan sekarang
    IF v_allocated_before = 0 THEN
      BEGIN
        PERFORM allocate_payment_to_items(
          v_payment.transaction_id,
          v_payment.payment_id,
          v_payment.amount
        );

        -- Cek berapa alokasi setelah fix
        SELECT COUNT(*) INTO v_allocated_after
        FROM transaction_item_payments
        WHERE payment_id = v_payment.payment_id;

        -- Catat ke temp table
        INSERT INTO temp_fixed_payments
        VALUES (v_payment.payment_id, v_payment.transaction_id, v_payment.amount,
                v_allocated_before, v_allocated_after);

        v_fixed_count := v_fixed_count + 1;

        RAISE NOTICE 'Fixed: Payment % (Rp %) untuk customer "%" - % alokasi dibuat',
          v_payment.payment_id, v_payment.amount, v_payment.customer_name, v_allocated_after;

      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Gagal mengalokasikan payment %: %', v_payment.payment_id, SQLERRM;
      END;
    END IF;
  END LOOP;

  RAISE NOTICE '=== Selesai ===';
  RAISE NOTICE 'Total pembayaran yang diperbaiki: %', v_fixed_count;
END $$;

-- 2. Tampilkan ringkasan hasil perbaikan
DO $$
DECLARE
  v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM temp_fixed_payments;

  IF v_count > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '=== Ringkasan Pembayaran yang Diperbaiki ===';
    RAISE NOTICE 'Total: % pembayaran', v_count;
    RAISE NOTICE 'Total nilai: Rp %', (SELECT SUM(amount) FROM temp_fixed_payments);
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '✅ Semua pembayaran sudah dialokasikan dengan benar!';
    RAISE NOTICE '';
  END IF;
END $$;

-- 3. Verifikasi integritas alokasi (harus balance)
DO $$
DECLARE
  v_payment RECORD;
  v_total_allocated numeric;
  v_mismatch_count int := 0;
BEGIN
  RAISE NOTICE '=== Verifikasi Integritas Alokasi ===';

  FOR v_payment IN
    SELECT
      tp.id as payment_id,
      tp.amount as payment_amount,
      COALESCE(SUM(tip.allocated_amount), 0) as total_allocated
    FROM transaction_payments tp
    LEFT JOIN transaction_item_payments tip ON tip.payment_id = tp.id
    GROUP BY tp.id, tp.amount
    HAVING tp.amount != COALESCE(SUM(tip.allocated_amount), 0)
  LOOP
    v_mismatch_count := v_mismatch_count + 1;
    RAISE WARNING 'Mismatch: Payment % - Payment: Rp %, Allocated: Rp %',
      v_payment.payment_id, v_payment.payment_amount, v_payment.total_allocated;
  END LOOP;

  IF v_mismatch_count = 0 THEN
    RAISE NOTICE '✅ Semua alokasi balance dengan payment amount!';
  ELSE
    RAISE NOTICE '⚠️  Ditemukan % payment dengan alokasi tidak balance', v_mismatch_count;
  END IF;

  RAISE NOTICE '';
END $$;

-- 4. Statistik akhir
DO $$
DECLARE
  v_total_payments int;
  v_total_allocated int;
  v_total_unallocated int;
BEGIN
  SELECT COUNT(*) INTO v_total_payments FROM transaction_payments;

  SELECT COUNT(DISTINCT payment_id) INTO v_total_allocated
  FROM transaction_item_payments;

  v_total_unallocated := v_total_payments - v_total_allocated;

  RAISE NOTICE '=== Statistik Akhir ===';
  RAISE NOTICE 'Total pembayaran: %', v_total_payments;
  RAISE NOTICE 'Sudah dialokasikan: %', v_total_allocated;
  RAISE NOTICE 'Belum dialokasikan: %', v_total_unallocated;

  IF v_total_unallocated = 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Semua pembayaran sudah teralokasi dengan sempurna!';
  END IF;
END $$;

-- Cleanup
DROP TABLE IF EXISTS temp_fixed_payments;
