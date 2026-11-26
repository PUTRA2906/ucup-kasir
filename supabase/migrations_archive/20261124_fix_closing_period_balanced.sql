-- ============================================================
-- Migrasi: Perbaikan Tutup Buku (Closing Period) — Jurnal Penutup Balance
-- Project: Ucup Kasir
-- Date: 2026-11-24
--
-- Masalah yang diperbaiki:
-- 1. close_period() lama mengkredit 3-3100 (Laba Piutang) sebesar TOTAL
--    laba, sementara trigger pembayaran juga mengkredit 3-3200
--    (Laba Direalisasi) satu sisi → jurnal penutup TIDAK balance.
--    Data live: CLOSING-20261104-4e12338f selisih -Rp 640.000.
-- 2. close_period() lama tidak mengisi journal_entries.reference_id,
--    sehingga reopen/delete tidak bisa menemukan jurnal penutup.
-- 3. reopen_period() hanya mengubah status → saldo pendapatan/beban
--    tetap 0 padahal periode dibuka kembali.
-- 4. delete_closing_period() hanya menghapus baris periode → jurnal
--    penutup yatim tetap ada.
-- 5. auto_update_realized_profit() membuat jurnal satu sisi (hanya
--    kredit 3-3200) → jurnal tidak balance.
-- 6. Tidak ada proteksi DELETE jurnal di periode tertutup.
-- 7. Sebagian user belum punya akun 3-3100/3-3200 → close_period gagal.
--
-- Konsep 2 akun laba (dipakai konsisten oleh SQL, SQLite, dan UI):
--   - 3-3100 = Laba Piutang           (laba akrual / masih di piutang)
--   - 3-3200 = Laba Direalisasi       (laba yang sudah terima kas)
--   Total laba = 3-3100 + 3-3200.
--
-- Jurnal penutup yang dihasilkan:
--   Debit  semua akun pendapatan        (menutup ke 0)
--   Kredit semua akun beban             (menutup ke 0)
--   Kredit 3-3200 = porsi laba direalisasi
--   Kredit 3-3100 = porsi laba belum terealisasi
--   → total debit = total kredit (selalu balance; rugi didebit ke 3-3100).
-- ============================================================

-- ============================================================
-- 1. BACKFILL AKUN LABa (idempotent)
-- ============================================================
-- close_period() butuh KEDUA akun. Lengkapi yang kurang tanpa menimpa
-- akun yang sudah ada (nama custom user dipertahankan).
INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_active, is_system)
SELECT DISTINCT c.user_id, '3-3100', 'Laba Piutang', 'ekuitas', 'kredit', true, true
FROM chart_of_accounts c
WHERE NOT EXISTS (
  SELECT 1 FROM chart_of_accounts d
  WHERE d.user_id = c.user_id AND d.code = '3-3100'
)
ON CONFLICT (user_id, code) DO NOTHING;

INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_active, is_system)
SELECT DISTINCT c.user_id, '3-3200', 'Laba Direalisasi', 'ekuitas', 'kredit', true, true
FROM chart_of_accounts c
WHERE NOT EXISTS (
  SELECT 1 FROM chart_of_accounts d
  WHERE d.user_id = c.user_id AND d.code = '3-3200'
)
ON CONFLICT (user_id, code) DO NOTHING;

-- ============================================================
-- 2. close_period() — JURNAL PENUTUP BALANCE + SPLIT 2 AKUN
-- ============================================================
CREATE OR REPLACE FUNCTION close_period(
  p_period_start date,
  p_period_end date,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_closing_id uuid := gen_random_uuid();
  v_journal_id uuid := gen_random_uuid();
  v_journal_number text;
  v_balances jsonb;

  v_laba_piutang_id uuid;
  v_laba_direalisasi_id uuid;

  v_total_pendapatan numeric := 0;
  v_total_beban numeric := 0;
  v_plug numeric := 0;
  v_realised numeric := 0;
  v_total_profit numeric := 0;
  v_ratio numeric := 0;
  v_realised_part numeric := 0;
  v_unrealised_part numeric := 0;
  v_profit record;
  v_has_lines boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Tidak ada sesi pengguna';
  END IF;

  IF p_period_end < p_period_start THEN
    RAISE EXCEPTION 'Tanggal akhir periode harus >= tanggal mulai.';
  END IF;

  -- 1. Validasi: tidak boleh overlap dengan periode tertutup lain
  IF EXISTS(
    SELECT 1 FROM closing_periods
    WHERE user_id = v_user_id
      AND status = 'closed'
      AND (
        (p_period_start >= period_start AND p_period_start <= period_end) OR
        (p_period_end >= period_start AND p_period_end <= period_end) OR
        (p_period_start <= period_start AND p_period_end >= period_end)
      )
  ) THEN
    RAISE EXCEPTION 'Periode ini overlap dengan periode yang sudah ditutup.';
  END IF;

  -- 2. Hitung total pendapatan & beban periode dari jurnal posted
  --    (kecualikan jurnal penutup agar tidak menutup dua kali).
  SELECT
    COALESCE(SUM(CASE WHEN coa.type = 'pendapatan' THEN jl.credit - jl.debit ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN coa.type = 'beban'      THEN jl.debit - jl.credit ELSE 0 END), 0)
  INTO v_total_pendapatan, v_total_beban
  FROM journal_lines jl
  INNER JOIN journal_entries je ON je.id = jl.journal_id
  INNER JOIN chart_of_accounts coa ON coa.id = jl.account_id
  WHERE je.user_id = v_user_id
    AND je.status = 'posted'
    AND COALESCE(je.reference_type, '') <> 'closing'
    AND je.entry_date::date >= p_period_start
    AND je.entry_date::date <= p_period_end
    AND coa.type IN ('pendapatan', 'beban');

  -- 3. Ambil ID akun laba
  SELECT id INTO v_laba_piutang_id
  FROM chart_of_accounts
  WHERE user_id = v_user_id AND code = '3-3100' AND is_active = true
  LIMIT 1;

  SELECT id INTO v_laba_direalisasi_id
  FROM chart_of_accounts
  WHERE user_id = v_user_id AND code = '3-3200' AND is_active = true
  LIMIT 1;

  IF v_laba_piutang_id IS NULL OR v_laba_direalisasi_id IS NULL THEN
    RAISE EXCEPTION 'Akun Laba Piutang/Direalisasi tidak ditemukan. Seed COA terlebih dahulu.';
  END IF;

  -- 4. Buat jurnal penutup (hanya jika ada aktivitas pendapatan/beban)
  IF ABS(v_total_pendapatan) > 0.01 OR ABS(v_total_beban) > 0.01 THEN
    v_journal_number := 'CLOSING-' || TO_CHAR(p_period_end, 'YYYYMMDD') || '-' || SUBSTRING(gen_random_uuid()::text, 1, 8);

    INSERT INTO journal_entries (
      id, user_id, journal_number, entry_date, description,
      reference_type, reference_id, status, created_at, updated_at
    ) VALUES (
      v_journal_id, v_user_id, v_journal_number, p_period_end,
      'Jurnal Penutup Periode ' || p_period_start || ' s/d ' || p_period_end,
      'closing', v_closing_id, 'posted', now(), now()
    );

    -- Debit semua akun pendapatan (tutup ke 0)
    INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at)
    SELECT gen_random_uuid(), v_user_id, v_journal_id, coa.id, coa.code, coa.name,
           COALESCE(SUM(jl.credit - jl.debit), 0), 0, now()
    FROM chart_of_accounts coa
    LEFT JOIN journal_lines jl ON jl.account_id = coa.id
    LEFT JOIN journal_entries je ON je.id = jl.journal_id
    WHERE coa.user_id = v_user_id
      AND coa.type = 'pendapatan'
      AND coa.is_active = true
      AND je.status = 'posted'
      AND COALESCE(je.reference_type, '') <> 'closing'
      AND je.entry_date::date >= p_period_start
      AND je.entry_date::date <= p_period_end
    GROUP BY coa.id, coa.code, coa.name
    HAVING SUM(jl.credit - jl.debit) > 0;

    -- Kredit semua akun beban (tutup ke 0)
    INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at)
    SELECT gen_random_uuid(), v_user_id, v_journal_id, coa.id, coa.code, coa.name,
           0, COALESCE(SUM(jl.debit - jl.credit), 0), now()
    FROM chart_of_accounts coa
    LEFT JOIN journal_lines jl ON jl.account_id = coa.id
    LEFT JOIN journal_entries je ON je.id = jl.journal_id
    WHERE coa.user_id = v_user_id
      AND coa.type = 'beban'
      AND coa.is_active = true
      AND je.status = 'posted'
      AND COALESCE(je.reference_type, '') <> 'closing'
      AND je.entry_date::date >= p_period_start
      AND je.entry_date::date <= p_period_end
    GROUP BY coa.id, coa.code, coa.name
    HAVING SUM(jl.debit - jl.credit) > 0;

    SELECT EXISTS (SELECT 1 FROM journal_lines WHERE journal_id = v_journal_id)
    INTO v_has_lines;

    -- Plug ekuitas = total debit − total kredit dari baris pendapatan/beban.
    -- Ini selalu membuat jurnal balance, termasuk bila ada akun kontra.
    SELECT COALESCE(SUM(debit) - SUM(credit), 0)
    INTO v_plug
    FROM journal_lines
    WHERE journal_id = v_journal_id;

    IF v_has_lines AND ABS(v_plug) > 0.01 THEN
      -- Rasio laba direalisasi dari transaksi (cash basis)
      SELECT * INTO v_profit
      FROM get_profit_summary(v_user_id, p_period_start, p_period_end);

      v_realised := COALESCE(v_profit.realized_profit, 0);
      v_total_profit := COALESCE(v_profit.total_profit, 0);

      IF v_total_profit > 0.01 THEN
        v_ratio := v_realised / v_total_profit;
        IF v_ratio < 0 THEN v_ratio := 0; END IF;
        IF v_ratio > 1 THEN v_ratio := 1; END IF;
      ELSE
        v_ratio := 0;
      END IF;

      v_realised_part := ROUND(v_plug * v_ratio, 2);
      v_unrealised_part := v_plug - v_realised_part;

      IF v_plug >= 0 THEN
        -- Laba: kredit 3-3200 (direalisasi) + 3-3100 (belum terealisasi)
        IF ABS(v_realised_part) > 0.01 THEN
          INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at)
          VALUES (gen_random_uuid(), v_user_id, v_journal_id, v_laba_direalisasi_id,
                  '3-3200', 'Laba Direalisasi', 0, v_realised_part, now());
        END IF;
        IF ABS(v_unrealised_part) > 0.01 THEN
          INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at)
          VALUES (gen_random_uuid(), v_user_id, v_journal_id, v_laba_piutang_id,
                  '3-3100', 'Laba Piutang', 0, v_unrealised_part, now());
        END IF;
      ELSE
        -- Rugi: debit 3-3100 sebesar |plug|
        INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at)
        VALUES (gen_random_uuid(), v_user_id, v_journal_id, v_laba_piutang_id,
                '3-3100', 'Laba Piutang', ABS(v_plug), 0, now());
      END IF;
    END IF;

    -- Safety check: jurnal penutup wajib balance
    IF (
      SELECT ABS(COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0))
      FROM journal_lines jl WHERE jl.journal_id = v_journal_id
    ) > 0.01 THEN
      RAISE EXCEPTION 'Jurnal penutup tidak balance — proses dibatalkan.';
    END IF;

    -- Tidak ada baris (mis. hanya akun kontra) → jangan simpan jurnal kosong
    IF NOT v_has_lines THEN
      DELETE FROM journal_entries WHERE id = v_journal_id;
    END IF;
  END IF;

  -- 5. Snapshot saldo semua akun per tanggal penutupan (setelah jurnal)
  SELECT jsonb_agg(
    jsonb_build_object(
      'account_id', account_id,
      'account_code', account_code,
      'account_name', account_name,
      'account_type', account_type,
      'normal_balance', normal_balance,
      'balance', balance
    )
  )
  INTO v_balances
  FROM (
    SELECT
      coa.id as account_id,
      coa.code as account_code,
      coa.name as account_name,
      coa.type as account_type,
      coa.normal_balance as normal_balance,
      COALESCE(SUM(
        CASE
          WHEN coa.normal_balance = 'debit' THEN jl.debit - jl.credit
          ELSE jl.credit - jl.debit
        END
      ), 0) as balance
    FROM chart_of_accounts coa
    LEFT JOIN journal_lines jl ON jl.account_id = coa.id
    LEFT JOIN journal_entries je ON je.id = jl.journal_id
    WHERE coa.user_id = v_user_id
      AND coa.is_active = true
      AND (je.id IS NULL OR (
        je.status = 'posted'
        AND je.entry_date::date <= p_period_end
      ))
    GROUP BY coa.id, coa.code, coa.name, coa.type, coa.normal_balance
  ) balances;

  -- 6. Hapus baris 'reopened' dengan rentang sama agar bisa ditutup ulang
  DELETE FROM closing_periods
  WHERE user_id = v_user_id
    AND period_start = p_period_start
    AND period_end = p_period_end
    AND status = 'reopened';

  -- 7. Insert closing period (id = reference_id jurnal penutup)
  INSERT INTO closing_periods (
    id, user_id, period_start, period_end, closed_by, notes, snapshot_balances, status
  ) VALUES (
    v_closing_id, v_user_id, p_period_start, p_period_end, v_user_id, p_notes, v_balances, 'closed'
  );

  RETURN v_closing_id;
END;
$$;

COMMENT ON FUNCTION close_period(date, date, text) IS
'Tutup periode: buat jurnal penutup balance + split laba ke Laba Direalisasi (3-3200) dan Laba Piutang (3-3100), lalu simpan snapshot saldo. reference_id jurnal = id closing_periods.';

-- ============================================================
-- 3. reopen_period() — VOID JURNAL PENUTUP + BUKA STATUS
-- ============================================================
CREATE OR REPLACE FUNCTION reopen_period(p_closing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_period_end date;
BEGIN
  SELECT period_end INTO v_period_end
  FROM closing_periods
  WHERE id = p_closing_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Periode tidak ditemukan atau bukan milik Anda.';
  END IF;

  -- Batalkan jurnal penutup terkait (void, bukan hapus — jejak audit tetap ada).
  -- Fallback: jurnal penutup lama yang reference_id-nya NULL dikenali dari tanggal.
  UPDATE journal_entries
  SET status = 'void', updated_at = now()
  WHERE user_id = v_user_id
    AND reference_type = 'closing'
    AND status <> 'void'
    AND (
      reference_id = p_closing_id
      OR (reference_id IS NULL AND entry_date::date = v_period_end)
    );

  UPDATE closing_periods
  SET status = 'reopened',
      updated_at = now()
  WHERE id = p_closing_id;
END;
$$;

COMMENT ON FUNCTION reopen_period(uuid) IS
'Buka kembali periode: void jurnal penutup terkait agar pendapatan/beban muncul lagi.';

-- ============================================================
-- 4. delete_closing_period() — VOID JURNAL + HAPUS PERIODE
-- ============================================================
CREATE OR REPLACE FUNCTION delete_closing_period(p_closing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_period_end date;
BEGIN
  SELECT period_end INTO v_period_end
  FROM closing_periods
  WHERE id = p_closing_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Periode tidak ditemukan atau bukan milik Anda.';
  END IF;

  -- Void jurnal penutup sebelum periode dihapus (agar tidak jadi jurnal yatim)
  UPDATE journal_entries
  SET status = 'void', updated_at = now()
  WHERE user_id = v_user_id
    AND reference_type = 'closing'
    AND status <> 'void'
    AND (
      reference_id = p_closing_id
      OR (reference_id IS NULL AND entry_date::date = v_period_end)
    );

  DELETE FROM closing_periods WHERE id = p_closing_id;
END;
$$;

COMMENT ON FUNCTION delete_closing_period(uuid) IS
'Hapus periode tertutup; jurnal penutupnya di-void terlebih dahulu.';

-- ============================================================
-- 5. Proteksi DELETE jurnal di periode tertutup (fungsi saja)
-- ============================================================
-- Trigger dipasang di bagian 8, SETELAH perbaikan data lama, agar
-- pembersihan jurnal rusak di bagian 7 tidak ikut terblokir.
CREATE OR REPLACE FUNCTION prevent_closed_period_journal_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF check_period_closed(OLD.entry_date::date, OLD.user_id) THEN
    RAISE EXCEPTION 'Tidak dapat menghapus jurnal di periode yang sudah ditutup (%).',
      OLD.entry_date::date;
  END IF;
  RETURN OLD;
END;
$$;

-- ============================================================
-- 6. auto_update_realized_profit() — REKLASIFIKASI BALANCE
--
-- Saat piutang dibayar untuk transaksi yang periodenya SUDAH ditutup,
-- pindahkan laba dari Laba Piutang (3-3100) ke Laba Direalisasi (3-3200):
--   Debit  3-3100
--   Kredit 3-3200
-- (sebelumnya hanya kredit 3-3200 → jurnal tidak balance)
-- ============================================================
CREATE OR REPLACE FUNCTION auto_update_realized_profit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_journal_id uuid;
  v_journal_number text;
  v_laba_piutang_id uuid;
  v_laba_direalisasi_id uuid;
  v_payment_profit numeric := 0;
  v_available numeric := 0;
  v_tx record;
BEGIN
  SELECT user_id, total, created_at
  INTO v_tx
  FROM transactions
  WHERE id = NEW.transaction_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_user_id := v_tx.user_id;

  -- Hanya reklasifikasi jika periode transaksi sudah ditutup
  -- (laba sudah diakui di 3-3100 lewat jurnal penutup).
  IF NOT check_period_closed(v_tx.created_at::date, v_user_id) THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_laba_piutang_id
  FROM chart_of_accounts
  WHERE user_id = v_user_id AND code = '3-3100' AND is_active = true
  LIMIT 1;

  SELECT id INTO v_laba_direalisasi_id
  FROM chart_of_accounts
  WHERE user_id = v_user_id AND code = '3-3200' AND is_active = true
  LIMIT 1;

  IF v_laba_piutang_id IS NULL OR v_laba_direalisasi_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Laba yang direalisasi oleh pembayaran ini (proporsional)
  SELECT
    (NEW.amount / NULLIF(v_tx.total, 0)) *
    (v_tx.total - COALESCE(SUM(ti.quantity * COALESCE(p.price_buy, 0)), 0))
  INTO v_payment_profit
  FROM transaction_items ti
  LEFT JOIN products p ON p.id = ti.product_id
  WHERE ti.transaction_id = NEW.transaction_id;

  v_payment_profit := COALESCE(v_payment_profit, 0);

  IF v_payment_profit <= 0.01 THEN
    RETURN NEW;
  END IF;

  -- Jangan melebihi saldo kredit 3-3100 yang tersedia
  SELECT COALESCE(SUM(jl.credit - jl.debit), 0)
  INTO v_available
  FROM journal_lines jl
  INNER JOIN journal_entries je ON je.id = jl.journal_id
  WHERE jl.user_id = v_user_id
    AND jl.account_id = v_laba_piutang_id
    AND je.status = 'posted';

  IF v_available <= 0.01 THEN
    RETURN NEW;
  END IF;

  IF v_payment_profit > v_available THEN
    v_payment_profit := v_available;
  END IF;

  v_journal_number := 'REALIZE-' || TO_CHAR(now(), 'YYYYMMDD-HH24MISS') || '-' || SUBSTRING(gen_random_uuid()::text, 1, 6);
  v_journal_id := gen_random_uuid();

  INSERT INTO journal_entries (
    id, user_id, journal_number, entry_date, description,
    reference_type, reference_id, status, created_at, updated_at
  ) VALUES (
    v_journal_id, v_user_id, v_journal_number, CURRENT_DATE,
    'Realisasi Laba: Pembayaran Piutang',
    'reclassify', NEW.id, 'posted', now(), now()
  );

  INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at)
  VALUES (gen_random_uuid(), v_user_id, v_journal_id, v_laba_piutang_id,
          '3-3100', 'Laba Piutang', v_payment_profit, 0, now());

  INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at)
  VALUES (gen_random_uuid(), v_user_id, v_journal_id, v_laba_direalisasi_id,
          '3-3200', 'Laba Direalisasi', 0, v_payment_profit, now());

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_update_realized_profit ON transaction_payments;
CREATE TRIGGER trg_auto_update_realized_profit
AFTER INSERT ON transaction_payments
FOR EACH ROW EXECUTE FUNCTION auto_update_realized_profit();

COMMENT ON TRIGGER trg_auto_update_realized_profit ON transaction_payments IS
'Reklasifikasi laba piutang → direalisasi (balance) saat piutang dibayar pada periode tertutup.';

-- ============================================================
-- 7. PERBAIKAN DATA LAMA (idempotent)
-- ============================================================
-- Jurnal penutup lama yang tidak balance tidak bisa "diperbaiki" tanpa
-- mengubah angka historis. Solusi aman & dapat diaudit:
--   - void jurnal penutup yang tidak balance
--   - buka kembali periode terkait agar bisa ditutup ulang dengan
--     fungsi close_period() yang baru (balance)
--   - void jurnal 'REALIZE-*' satu sisi (legacy auto_update_realized_profit)
--   - hapus jurnal tanpa baris
--
-- Drop proteksi DELETE dulu agar rerun migrasi tetap bisa membersihkan data;
-- trigger dipasang kembali di bagian 8.
DROP TRIGGER IF EXISTS trg_prevent_closed_period_journal_delete ON journal_entries;

DO $$
DECLARE
  v_rec record;
  v_fixed_closing integer := 0;
  v_fixed_payment integer := 0;
  v_deleted_empty integer := 0;
  v_reopened_legacy integer := 0;
BEGIN
  -- 7a. Jurnal penutup tidak balance → void + buka periode
  FOR v_rec IN
    SELECT je.id, je.user_id, je.entry_date::date AS entry_date,
           je.reference_id,
           ABS(SUM(jl.debit) - SUM(jl.credit)) AS diff
    FROM journal_entries je
    INNER JOIN journal_lines jl ON jl.journal_id = je.id
    WHERE je.reference_type = 'closing'
      AND je.status = 'posted'
    GROUP BY je.id, je.user_id, je.entry_date, je.reference_id
    HAVING ABS(SUM(jl.debit) - SUM(jl.credit)) > 0.01
  LOOP
    UPDATE journal_entries SET status = 'void', updated_at = now() WHERE id = v_rec.id;

    UPDATE closing_periods
    SET status = 'reopened', updated_at = now()
    WHERE user_id = v_rec.user_id
      AND status = 'closed'
      AND (
        (v_rec.reference_id IS NOT NULL AND id = v_rec.reference_id)
        OR (v_rec.reference_id IS NULL AND period_end = v_rec.entry_date)
      );

    v_fixed_closing := v_fixed_closing + 1;
    RAISE NOTICE 'Void jurnal penutup tidak balance % (selisih %)', v_rec.id, v_rec.diff;
  END LOOP;

  -- 7b. Jurnal realisasi legacy satu sisi (reference_type='payment',
  --     nomor REALIZE-*, hanya kredit) → void
  FOR v_rec IN
    SELECT je.id, ABS(SUM(jl.debit) - SUM(jl.credit)) AS diff
    FROM journal_entries je
    INNER JOIN journal_lines jl ON jl.journal_id = je.id
    WHERE je.reference_type = 'payment'
      AND je.journal_number LIKE 'REALIZE-%'
      AND je.status = 'posted'
    GROUP BY je.id
    HAVING ABS(SUM(jl.debit) - SUM(jl.credit)) > 0.01
  LOOP
    UPDATE journal_entries SET status = 'void', updated_at = now() WHERE id = v_rec.id;
    v_fixed_payment := v_fixed_payment + 1;
  END LOOP;

  -- 7c. Hapus jurnal tanpa baris (sisa close_period yang gagal di tengah)
  WITH empty AS (
    DELETE FROM journal_entries je
    WHERE je.status = 'posted'
      AND NOT EXISTS (SELECT 1 FROM journal_lines jl WHERE jl.journal_id = je.id)
    RETURNING je.id
  )
  SELECT COUNT(*) INTO v_deleted_empty FROM empty;

  -- 7d. Periode 'closed' dari fungsi lama (snapshot-only) belum menutup
  --     pendapatan/beban. Dikenali dari snapshot yang masih punya saldo
  --     pendapatan/beban tidak nol. Buka kembali agar bisa ditutup ulang
  --     dengan close_period() baru yang menghasilkan jurnal balance.
  UPDATE closing_periods cp
  SET status = 'reopened', updated_at = now()
  WHERE cp.status = 'closed'
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(cp.snapshot_balances, '[]'::jsonb)) b
      WHERE b->>'account_type' IN ('pendapatan', 'beban')
        AND ABS(COALESCE((b->>'balance')::numeric, 0)) > 0.01
    )
    AND NOT EXISTS (
      SELECT 1 FROM journal_entries je
      WHERE je.user_id = cp.user_id
        AND je.reference_type = 'closing'
        AND je.status = 'posted'
        AND (
          je.reference_id = cp.id
          OR (je.reference_id IS NULL AND je.entry_date::date = cp.period_end)
        )
    );

  GET DIAGNOSTICS v_reopened_legacy = ROW_COUNT;

  RAISE NOTICE 'Perbaikan data tutup buku: % jurnal penutup di-void, % jurnal realisasi legacy di-void, % jurnal kosong dihapus, % periode legacy dibuka kembali',
    v_fixed_closing, v_fixed_payment, v_deleted_empty, v_reopened_legacy;
END;
$$;

-- ============================================================
-- 8. PASANG proteksi DELETE jurnal (setelah pembersihan data)
-- ============================================================
DROP TRIGGER IF EXISTS trg_prevent_closed_period_journal_delete ON journal_entries;
CREATE TRIGGER trg_prevent_closed_period_journal_delete
BEFORE DELETE ON journal_entries
FOR EACH ROW EXECUTE FUNCTION prevent_closed_period_journal_delete();

-- ============================================================
-- 9. GRANT PERMISSIONS
-- ============================================================
GRANT EXECUTE ON FUNCTION close_period(date, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION reopen_period(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_closing_period(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_period_closed(date, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_profit_summary(uuid, date, date) TO authenticated;
