-- ============================================================
-- Migrasi: Split Laba Ditahan ke Terealisasi & Belum Terealisasi
-- Project: Ucup Kasir
-- Date: 2026-11-04
--
-- Fitur:
-- 1. Update akun 3-3100 jadi "Laba Ditahan (Terealisasi)"
-- 2. Tambah akun 3-3200 "Laba Ditahan (Belum Terealisasi)"
-- 3. Fungsi get_realised_profit_for_period() untuk hitung laba terealisasi
-- 4. Modifikasi close_period() untuk split laba ke 2 akun
-- 5. Fungsi reclassify_retained_earnings() untuk reklasifikasi saat piutang dibayar
-- ============================================================

-- ============================================================
-- 1. UPDATE & INSERT AKUN DEFAULT (hanya jika belum ada)
-- ============================================================

-- Update akun 3-3100 jika ada
UPDATE chart_of_accounts
SET name = 'Laba Ditahan (Terealisasi)'
WHERE code = '3-3100' AND is_system = true;

-- Insert akun 3-3200 jika belum ada (gunakan ON CONFLICT untuk idempotency)
INSERT INTO chart_of_accounts (code, name, type, normal_balance, is_active, is_system, user_id)
SELECT
  '3-3200',
  'Laba Ditahan (Belum Terealisasi)',
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

COMMENT ON COLUMN chart_of_accounts.code IS 'Kode akun: 3-3100 = Laba Terealisasi, 3-3200 = Laba Belum Terealisasi';

-- ============================================================
-- 2. FUNGSI: get_realised_profit_for_period()
-- Menghitung laba terealisasi berdasarkan alokasi pembayaran per item
-- ============================================================

CREATE OR REPLACE FUNCTION get_realised_profit_for_period(
  p_user_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  total_revenue numeric,
  realised_revenue numeric,
  unrealised_revenue numeric,
  total_cogs numeric,
  realised_cogs numeric,
  total_profit numeric,
  realised_profit numeric,
  unrealised_profit numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_revenue numeric := 0;
  v_realised_revenue numeric := 0;
  v_unrealised_revenue numeric := 0;
  v_total_cogs numeric := 0;
  v_realised_cogs numeric := 0;
  v_tx record;
  v_item record;
  v_allocated numeric;
  v_allocation_ratio numeric;
BEGIN
  -- Loop semua transaksi dalam periode
  FOR v_tx IN
    SELECT id, total, paid_amount, remaining_amount
    FROM transactions
    WHERE user_id = p_user_id
      AND created_at::date >= p_start_date
      AND created_at::date <= p_end_date
  LOOP
    v_total_revenue := v_total_revenue + COALESCE(v_tx.total, 0);
    v_realised_revenue := v_realised_revenue + COALESCE(v_tx.paid_amount, 0);
    v_unrealised_revenue := v_unrealised_revenue + COALESCE(v_tx.remaining_amount, 0);

    -- Loop semua item dalam transaksi ini
    FOR v_item IN
      SELECT
        ti.id as item_id,
        ti.quantity,
        ti.subtotal,
        COALESCE(p.price_buy, 0) as price_buy
      FROM transaction_items ti
      LEFT JOIN products p ON p.id = ti.product_id
      WHERE ti.transaction_id = v_tx.id
    LOOP
      -- HPP item
      v_total_cogs := v_total_cogs + (v_item.price_buy * v_item.quantity);

      -- Total alokasi pembayaran untuk item ini
      SELECT COALESCE(SUM(allocated_amount), 0)
      INTO v_allocated
      FROM transaction_item_payments
      WHERE item_id = v_item.item_id;

      -- Jika ada alokasi, hitung HPP terealisasi
      IF v_allocated > 0 AND v_item.subtotal > 0 THEN
        v_allocation_ratio := v_allocated / v_item.subtotal;
        v_realised_cogs := v_realised_cogs + (v_item.price_buy * v_item.quantity * v_allocation_ratio);
      END IF;
    END LOOP;
  END LOOP;

  -- Return hasil
  RETURN QUERY SELECT
    v_total_revenue,
    v_realised_revenue,
    v_unrealised_revenue,
    v_total_cogs,
    v_realised_cogs,
    (v_total_revenue - v_total_cogs) as v_total_profit,
    (v_realised_revenue - v_realised_cogs) as v_realised_profit,
    (v_total_revenue - v_total_cogs - (v_realised_revenue - v_realised_cogs)) as v_unrealised_profit;
END;
$$;

COMMENT ON FUNCTION get_realised_profit_for_period IS 'Hitung laba terealisasi berdasarkan alokasi pembayaran per item';

-- ============================================================
-- 3. MODIFIKASI: close_period() dengan Split Laba
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
  v_pendapatan_id uuid;
  v_beban_id uuid;
  v_laba_terealisasi_id uuid;
  v_laba_belum_terealisasi_id uuid;

  -- Saldo
  v_total_pendapatan numeric := 0;
  v_total_beban numeric := 0;
  v_total_laba numeric := 0;

  -- Laba terealisasi
  v_realised_profit numeric := 0;
  v_unrealised_profit numeric := 0;
  v_profit_result record;
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

  v_total_laba := v_total_pendapatan - v_total_beban;

  -- 3. Hitung laba terealisasi dari transaksi
  SELECT * INTO v_profit_result
  FROM get_realised_profit_for_period(v_user_id, p_period_start, p_period_end);

  v_realised_profit := COALESCE(v_profit_result.realised_profit, 0);
  v_unrealised_profit := v_total_laba - v_realised_profit;

  -- 4. Cari ID akun untuk jurnal penutup
  SELECT id INTO v_laba_terealisasi_id
  FROM chart_of_accounts
  WHERE user_id = v_user_id AND code = '3-3100' AND is_active = true
  LIMIT 1;

  SELECT id INTO v_laba_belum_terealisasi_id
  FROM chart_of_accounts
  WHERE user_id = v_user_id AND code = '3-3200' AND is_active = true
  LIMIT 1;

  IF v_laba_terealisasi_id IS NULL OR v_laba_belum_terealisasi_id IS NULL THEN
    RAISE EXCEPTION 'Akun Laba Ditahan tidak ditemukan. Seed COA terlebih dahulu.';
  END IF;

  -- 5. Buat jurnal penutup (hanya jika ada laba/rugi)
  IF ABS(v_total_laba) > 0.01 THEN
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

    -- Split laba ke 2 akun: Terealisasi & Belum Terealisasi
    IF v_realised_profit > 0 THEN
      INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at)
      VALUES (
        gen_random_uuid(),
        v_user_id,
        v_journal_id,
        v_laba_terealisasi_id,
        '3-3100',
        'Laba Ditahan (Terealisasi)',
        0,
        v_realised_profit,
        now()
      );
    END IF;

    IF v_unrealised_profit > 0 THEN
      INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at)
      VALUES (
        gen_random_uuid(),
        v_user_id,
        v_journal_id,
        v_laba_belum_terealisasi_id,
        '3-3200',
        'Laba Ditahan (Belum Terealisasi)',
        0,
        v_unrealised_profit,
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

COMMENT ON FUNCTION close_period IS 'Tutup periode + buat jurnal penutup + split laba ke Terealisasi & Belum Terealisasi';

-- ============================================================
-- 4. FUNGSI: reclassify_retained_earnings()
-- Dipanggil saat piutang dibayar untuk pindahkan laba dari Belum ke Terealisasi
-- ============================================================

CREATE OR REPLACE FUNCTION reclassify_retained_earnings(
  p_payment_amount numeric,
  p_transaction_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_journal_id uuid;
  v_journal_number text;
  v_laba_terealisasi_id uuid;
  v_laba_belum_terealisasi_id uuid;
  v_reclassify_amount numeric := 0;
  v_item record;
  v_allocated numeric;
  v_allocation_ratio numeric;
BEGIN
  -- Cari ID akun
  SELECT id INTO v_laba_terealisasi_id
  FROM chart_of_accounts
  WHERE user_id = v_user_id AND code = '3-3100' AND is_active = true
  LIMIT 1;

  SELECT id INTO v_laba_belum_terealisasi_id
  FROM chart_of_accounts
  WHERE user_id = v_user_id AND code = '3-3200' AND is_active = true
  LIMIT 1;

  IF v_laba_terealisasi_id IS NULL OR v_laba_belum_terealisasi_id IS NULL THEN
    -- Akun belum ada, skip (mungkin belum tutup buku pertama kali)
    RETURN;
  END IF;

  -- Hitung berapa laba yang terealisasi dari pembayaran ini
  -- Loop semua item dalam transaksi
  FOR v_item IN
    SELECT
      ti.id as item_id,
      ti.quantity,
      ti.subtotal,
      ti.price as price_sell,
      COALESCE(p.price_buy, 0) as price_buy
    FROM transaction_items ti
    LEFT JOIN products p ON p.id = ti.product_id
    WHERE ti.transaction_id = p_transaction_id
  LOOP
    -- Total alokasi pembayaran untuk item ini
    SELECT COALESCE(SUM(allocated_amount), 0)
    INTO v_allocated
    FROM transaction_item_payments
    WHERE item_id = v_item.item_id;

    -- Rasio pembayaran item
    IF v_item.subtotal > 0 THEN
      v_allocation_ratio := v_allocated / v_item.subtotal;
    ELSE
      v_allocation_ratio := 0;
    END IF;

    -- Laba item yang terealisasi = (price_sell - price_buy) × qty × rasio
    v_reclassify_amount := v_reclassify_amount +
      ((v_item.price_sell - v_item.price_buy) * v_item.quantity * v_allocation_ratio);
  END LOOP;

  -- Jika ada laba yang perlu direklasifikasi
  IF v_reclassify_amount > 0.01 THEN
    -- Generate journal number
    v_journal_number := 'RECLASSIFY-' || TO_CHAR(now(), 'YYYYMMDD-HH24MISS') || '-' || SUBSTRING(gen_random_uuid()::text, 1, 6);
    v_journal_id := gen_random_uuid();

    -- Buat jurnal reklasifikasi
    INSERT INTO journal_entries (
      id, user_id, journal_number, entry_date, description, reference_type, reference_id, status, created_at, updated_at
    ) VALUES (
      v_journal_id,
      v_user_id,
      v_journal_number,
      CURRENT_DATE,
      'Reklasifikasi Laba: Piutang Terbayar',
      'reclassify',
      p_transaction_id,
      'posted',
      now(),
      now()
    );

    -- Debit: Laba Ditahan (Belum Terealisasi)
    INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at)
    VALUES (
      gen_random_uuid(),
      v_user_id,
      v_journal_id,
      v_laba_belum_terealisasi_id,
      '3-3200',
      'Laba Ditahan (Belum Terealisasi)',
      v_reclassify_amount,
      0,
      now()
    );

    -- Kredit: Laba Ditahan (Terealisasi)
    INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at)
    VALUES (
      gen_random_uuid(),
      v_user_id,
      v_journal_id,
      v_laba_terealisasi_id,
      '3-3100',
      'Laba Ditahan (Terealisasi)',
      0,
      v_reclassify_amount,
      now()
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION reclassify_retained_earnings IS 'Reklasifikasi laba dari Belum Terealisasi ke Terealisasi saat piutang dibayar';

-- ============================================================
-- 5. TRIGGER: Auto Reclassify saat Pembayaran
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_reclassify_on_payment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Panggil reklasifikasi untuk transaksi ini
  PERFORM reclassify_retained_earnings(NEW.amount, NEW.transaction_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reclassify_on_payment ON transaction_payments;
CREATE TRIGGER trg_reclassify_on_payment
AFTER INSERT ON transaction_payments
FOR EACH ROW EXECUTE FUNCTION trigger_reclassify_on_payment();

COMMENT ON TRIGGER trg_reclassify_on_payment ON transaction_payments IS 'Auto reklasifikasi laba saat piutang dibayar';

-- ============================================================
-- 6. GRANT PERMISSIONS
-- ============================================================

GRANT EXECUTE ON FUNCTION get_realised_profit_for_period TO authenticated;
GRANT EXECUTE ON FUNCTION reclassify_retained_earnings TO authenticated;
