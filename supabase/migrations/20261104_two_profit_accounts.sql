-- ============================================================
-- Migrasi: Sistem 2 Akun Laba (Simplified)
-- Project: Ucup Kasir
-- Date: 2026-11-04
--
-- Konsep:
-- 1. Laba Aktual (3-3100): Total profit dari semua transaksi
-- 2. Laba Direalisasi (3-3200): Profit yang sudah terima kas (bisa diambil owner)
--
-- Flow:
-- - Transaksi tunai: tambah ke keduanya
-- - Transaksi kredit: tambah ke Laba Aktual saja
-- - Pembayaran piutang: pindahkan sebagian ke Laba Direalisasi
-- - Owner ambil uang: kurangi Laba Direalisasi (jurnal drawing)
-- ============================================================

-- ============================================================
-- 1. UPDATE AKUN DEFAULT (rename existing)
-- ============================================================

-- Update akun 3-3100 jadi "Laba Aktual"
UPDATE chart_of_accounts
SET name = 'Laba Aktual'
WHERE code = '3-3100' AND is_system = true;

-- Update akun 3-3200 jadi "Laba Direalisasi"
UPDATE chart_of_accounts
SET name = 'Laba Direalisasi'
WHERE code = '3-3200' AND is_system = true;

-- Jika belum ada, insert keduanya
INSERT INTO chart_of_accounts (code, name, type, normal_balance, is_active, is_system, user_id)
SELECT
  '3-3100',
  'Laba Aktual',
  'ekuitas',
  'kredit',
  true,
  true,
  u.id
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM chart_of_accounts
  WHERE code = '3-3100' AND user_id = u.id
)
ON CONFLICT DO NOTHING;

INSERT INTO chart_of_accounts (code, name, type, normal_balance, is_active, is_system, user_id)
SELECT
  '3-3200',
  'Laba Direalisasi',
  'ekuitas',
  'kredit',
  true,
  true,
  u.id
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM chart_of_accounts
  WHERE code = '3-3200' AND user_id = u.id
)
ON CONFLICT DO NOTHING;

COMMENT ON COLUMN chart_of_accounts.code IS 'Kode akun: 3-3100 = Laba Aktual, 3-3200 = Laba Direalisasi';

-- ============================================================
-- 2. DROP FUNGSI LAMA (yang kompleks dengan item allocation)
-- ============================================================

DROP TRIGGER IF EXISTS trg_reclassify_on_payment ON transaction_payments;
DROP FUNCTION IF EXISTS trigger_reclassify_on_payment();
DROP FUNCTION IF EXISTS reclassify_retained_earnings(numeric, uuid);
DROP FUNCTION IF EXISTS get_realised_profit_for_period(uuid, date, date);

-- ============================================================
-- 3. FUNGSI BARU: get_profit_summary()
-- Hitung laba aktual & direalisasi dengan cara sederhana
-- ============================================================

CREATE OR REPLACE FUNCTION get_profit_summary(
  p_user_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  total_revenue numeric,
  total_cogs numeric,
  total_profit numeric,        -- Laba Aktual
  realized_revenue numeric,
  realized_cogs numeric,
  realized_profit numeric       -- Laba Direalisasi
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_revenue numeric := 0;
  v_total_cogs numeric := 0;
  v_realized_revenue numeric := 0;
  v_date_filter text := '';
BEGIN
  -- Build date filter
  IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
    v_date_filter := format(' AND t.created_at::date >= %L AND t.created_at::date <= %L', p_start_date, p_end_date);
  END IF;

  -- Total revenue & COGS (semua transaksi)
  EXECUTE format('
    SELECT
      COALESCE(SUM(t.total), 0),
      COALESCE(SUM(
        (SELECT SUM(ti.quantity * COALESCE(p.price_buy, 0))
         FROM transaction_items ti
         LEFT JOIN products p ON p.id = ti.product_id
         WHERE ti.transaction_id = t.id)
      ), 0)
    FROM transactions t
    WHERE t.user_id = $1
      AND t.status != ''dibatalkan''
      %s
  ', v_date_filter)
  INTO v_total_revenue, v_total_cogs
  USING p_user_id;

  -- Realized revenue (tunai + piutang terbayar)
  EXECUTE format('
    SELECT COALESCE(SUM(t.paid_amount), 0)
    FROM transactions t
    WHERE t.user_id = $1
      AND t.status != ''dibatalkan''
      %s
  ', v_date_filter)
  INTO v_realized_revenue
  USING p_user_id;

  -- Realized COGS = proportional COGS based on payment ratio
  RETURN QUERY
  SELECT
    v_total_revenue,
    v_total_cogs,
    (v_total_revenue - v_total_cogs) as total_profit,
    v_realized_revenue,
    CASE
      WHEN v_total_revenue > 0 THEN (v_realized_revenue / v_total_revenue) * v_total_cogs
      ELSE 0
    END as realized_cogs,
    CASE
      WHEN v_total_revenue > 0 THEN v_realized_revenue - ((v_realized_revenue / v_total_revenue) * v_total_cogs)
      ELSE 0
    END as realized_profit;
END;
$$;

COMMENT ON FUNCTION get_profit_summary IS 'Hitung laba aktual & direalisasi (simplified proportional method)';

-- ============================================================
-- 4. MODIFIKASI: close_period() dengan 2 Akun Laba Sederhana
-- ============================================================

CREATE OR REPLACE FUNCTION close_period(
  p_period_start date,
  p_period_end date,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_closing_id uuid;
  v_balances jsonb;
  v_journal_id uuid;
  v_journal_number text;

  -- Akun IDs
  v_laba_aktual_id uuid;
  v_laba_direalisasi_id uuid;

  -- Saldo
  v_total_pendapatan numeric := 0;
  v_total_beban numeric := 0;
  v_laba_aktual numeric := 0;
  v_laba_direalisasi numeric := 0;

  -- Profit summary
  v_profit record;
BEGIN
  -- 1. Validasi: Periode tidak boleh overlap dengan periode tertutup lainnya
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

  -- 2. Hitung total pendapatan & beban
  SELECT
    COALESCE(SUM(CASE WHEN coa.type = 'pendapatan' THEN jl.credit - jl.debit ELSE 0 END), 0) as pendapatan,
    COALESCE(SUM(CASE WHEN coa.type = 'beban' THEN jl.debit - jl.credit ELSE 0 END), 0) as beban
  INTO v_total_pendapatan, v_total_beban
  FROM journal_lines jl
  INNER JOIN journal_entries je ON je.id = jl.journal_id
  INNER JOIN chart_of_accounts coa ON coa.id = jl.account_id
  WHERE je.user_id = v_user_id
    AND je.status = 'posted'
    AND je.entry_date::date >= p_period_start
    AND je.entry_date::date <= p_period_end
    AND coa.type IN ('pendapatan', 'beban');

  v_laba_aktual := v_total_pendapatan - v_total_beban;

  -- 3. Hitung laba direalisasi dari transaksi
  SELECT * INTO v_profit
  FROM get_profit_summary(v_user_id, p_period_start, p_period_end);

  v_laba_direalisasi := COALESCE(v_profit.realized_profit, 0);

  -- 4. Cari ID akun untuk jurnal penutup
  SELECT id INTO v_laba_aktual_id
  FROM chart_of_accounts
  WHERE user_id = v_user_id AND code = '3-3100' AND is_active = true
  LIMIT 1;

  SELECT id INTO v_laba_direalisasi_id
  FROM chart_of_accounts
  WHERE user_id = v_user_id AND code = '3-3200' AND is_active = true
  LIMIT 1;

  IF v_laba_aktual_id IS NULL OR v_laba_direalisasi_id IS NULL THEN
    RAISE EXCEPTION 'Akun Laba Aktual/Direalisasi tidak ditemukan. Seed COA terlebih dahulu.';
  END IF;

  -- 5. Buat jurnal penutup (hanya jika ada laba/rugi)
  IF ABS(v_laba_aktual) > 0.01 THEN
    -- Generate journal number
    v_journal_number := 'CLOSING-' || TO_CHAR(p_period_end, 'YYYYMMDD') || '-' || SUBSTRING(gen_random_uuid()::text, 1, 8);
    v_journal_id := gen_random_uuid();

    -- Insert journal entry
    INSERT INTO journal_entries (
      id, user_id, journal_number, entry_date, description, reference_type, status, created_at, updated_at
    ) VALUES (
      v_journal_id,
      v_user_id,
      v_journal_number,
      p_period_end,
      'Jurnal Penutup Periode ' || p_period_start || ' s/d ' || p_period_end,
      'closing',
      'posted',
      now(),
      now()
    );

    -- Tutup semua akun pendapatan (Debit)
    INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at)
    SELECT
      gen_random_uuid(),
      v_user_id,
      v_journal_id,
      coa.id,
      coa.code,
      coa.name,
      COALESCE(SUM(jl.credit - jl.debit), 0),
      0,
      now()
    FROM chart_of_accounts coa
    LEFT JOIN journal_lines jl ON jl.account_id = coa.id
    LEFT JOIN journal_entries je ON je.id = jl.journal_id
    WHERE coa.user_id = v_user_id
      AND coa.type = 'pendapatan'
      AND coa.is_active = true
      AND je.status = 'posted'
      AND je.entry_date::date >= p_period_start
      AND je.entry_date::date <= p_period_end
    GROUP BY coa.id, coa.code, coa.name
    HAVING SUM(jl.credit - jl.debit) > 0;

    -- Tutup semua akun beban (Kredit)
    INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at)
    SELECT
      gen_random_uuid(),
      v_user_id,
      v_journal_id,
      coa.id,
      coa.code,
      coa.name,
      0,
      COALESCE(SUM(jl.debit - jl.credit), 0),
      now()
    FROM chart_of_accounts coa
    LEFT JOIN journal_lines jl ON jl.account_id = coa.id
    LEFT JOIN journal_entries je ON je.id = jl.journal_id
    WHERE coa.user_id = v_user_id
      AND coa.type = 'beban'
      AND coa.is_active = true
      AND je.status = 'posted'
      AND je.entry_date::date >= p_period_start
      AND je.entry_date::date <= p_period_end
    GROUP BY coa.id, coa.code, coa.name
    HAVING SUM(jl.debit - jl.credit) > 0;

    -- Catat ke Laba Aktual (total profit)
    IF ABS(v_laba_aktual) > 0.01 THEN
      INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at)
      VALUES (
        gen_random_uuid(),
        v_user_id,
        v_journal_id,
        v_laba_aktual_id,
        '3-3100',
        'Laba Aktual',
        0,
        v_laba_aktual,
        now()
      );
    END IF;

    -- Catat ke Laba Direalisasi (realized profit)
    IF ABS(v_laba_direalisasi) > 0.01 THEN
      INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at)
      VALUES (
        gen_random_uuid(),
        v_user_id,
        v_journal_id,
        v_laba_direalisasi_id,
        '3-3200',
        'Laba Direalisasi',
        0,
        v_laba_direalisasi,
        now()
      );
    END IF;
  END IF;

  -- 6. Hitung snapshot saldo semua akun SETELAH jurnal penutup
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

  -- 7. Insert closing period
  INSERT INTO closing_periods (
    user_id,
    period_start,
    period_end,
    closed_by,
    notes,
    snapshot_balances,
    status
  ) VALUES (
    v_user_id,
    p_period_start,
    p_period_end,
    v_user_id,
    p_notes,
    v_balances,
    'closed'
  )
  RETURNING id INTO v_closing_id;

  RETURN v_closing_id;
END;
$$;

COMMENT ON FUNCTION close_period IS 'Tutup periode + split laba ke Aktual & Direalisasi (simplified)';

-- ============================================================
-- 5. FUNGSI: auto_update_realized_profit()
-- Dipanggil saat ada pembayaran untuk update Laba Direalisasi
-- ============================================================

CREATE OR REPLACE FUNCTION auto_update_realized_profit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_journal_id uuid;
  v_journal_number text;
  v_laba_aktual_id uuid;
  v_laba_direalisasi_id uuid;
  v_payment_profit numeric := 0;
  v_tx record;
BEGIN
  -- Get user_id dari transaction
  SELECT user_id, total, paid_amount
  INTO v_tx
  FROM transactions
  WHERE id = NEW.transaction_id;

  v_user_id := v_tx.user_id;

  -- Cari ID akun
  SELECT id INTO v_laba_aktual_id
  FROM chart_of_accounts
  WHERE user_id = v_user_id AND code = '3-3100' AND is_active = true
  LIMIT 1;

  SELECT id INTO v_laba_direalisasi_id
  FROM chart_of_accounts
  WHERE user_id = v_user_id AND code = '3-3200' AND is_active = true
  LIMIT 1;

  -- Jika akun belum ada, skip (belum tutup buku pertama kali)
  IF v_laba_aktual_id IS NULL OR v_laba_direalisasi_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Hitung profit yang direalisasi dari pembayaran ini
  -- Rumus sederhana: (payment_amount / total) * total_profit_transaksi
  SELECT
    (NEW.amount / NULLIF(v_tx.total, 0)) *
    (v_tx.total - COALESCE(SUM(ti.quantity * COALESCE(p.price_buy, 0)), 0))
  INTO v_payment_profit
  FROM transaction_items ti
  LEFT JOIN products p ON p.id = ti.product_id
  WHERE ti.transaction_id = NEW.transaction_id;

  v_payment_profit := COALESCE(v_payment_profit, 0);

  -- Jika ada profit yang direalisasi, buat jurnal
  IF v_payment_profit > 0.01 THEN
    -- Generate journal number
    v_journal_number := 'REALIZE-' || TO_CHAR(now(), 'YYYYMMDD-HH24MISS') || '-' || SUBSTRING(gen_random_uuid()::text, 1, 6);
    v_journal_id := gen_random_uuid();

    -- Buat jurnal: debit Laba Aktual, kredit Laba Direalisasi
    -- (SALAH! Harusnya TIDAK mengurangi Laba Aktual)
    -- Koreksi: Cukup tambah Laba Direalisasi tanpa kurangi Laba Aktual

    INSERT INTO journal_entries (
      id, user_id, journal_number, entry_date, description, reference_type, reference_id, status, created_at, updated_at
    ) VALUES (
      v_journal_id,
      v_user_id,
      v_journal_number,
      CURRENT_DATE,
      'Realisasi Laba: Pembayaran Piutang',
      'payment',
      NEW.id,
      'posted',
      now(),
      now()
    );

    -- HANYA kredit Laba Direalisasi (tidak ada debit ke Laba Aktual)
    -- Karena Laba Aktual sudah dicatat saat transaksi
    INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at)
    VALUES (
      gen_random_uuid(),
      v_user_id,
      v_journal_id,
      v_laba_direalisasi_id,
      '3-3200',
      'Laba Direalisasi',
      0,
      v_payment_profit,
      now()
    );

    -- Debit ke Piutang (sudah tercatat di jurnal payment, skip di sini)
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_update_realized_profit ON transaction_payments;
CREATE TRIGGER trg_auto_update_realized_profit
AFTER INSERT ON transaction_payments
FOR EACH ROW EXECUTE FUNCTION auto_update_realized_profit();

COMMENT ON TRIGGER trg_auto_update_realized_profit ON transaction_payments IS 'Auto update Laba Direalisasi saat pembayaran piutang';

-- ============================================================
-- 6. GRANT PERMISSIONS
-- ============================================================

GRANT EXECUTE ON FUNCTION get_profit_summary TO authenticated;
GRANT EXECUTE ON FUNCTION close_period TO authenticated;
