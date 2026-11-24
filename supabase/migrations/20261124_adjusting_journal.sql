-- ============================================================
-- Migration: Jurnal Penyesuaian (Adjusting Journal Entry / AJP)
-- Tanggal: 2026-11-24
--
-- Tujuan:
--   Mendukung kertas kerja "Neraca Saldo & Penyesuaian" yang terdiri dari:
--     - Saldo sebelum penyesuaian
--     - Jurnal penyesuaian
--     - Saldo setelah penyesuaian
--
-- Perubahan:
--   1. Tambah 'adjusting' ke CHECK reference_type journal_entries.
--   2. Fungsi post_adjusting_journal() — sama seperti post_journal()
--      (validasi akun + balance, atomic), tetapi menandai jurnal dengan
--      reference_type='adjusting' agar bisa dipisahkan dari transaksi
--      operasional di laporan.
--
-- Catatan:
--   - Jurnal penyesuaian tetap mematuhi trigger periode tertutup, karena
--     insert-nya melalui tabel journal_entries yang sama.
--   - Jurnal penyesuaian TIDAK mengubah stok/transaksi; hanya jurnal.
-- ============================================================

-- ============================================================
-- 1. Izinkan reference_type = 'adjusting'
-- ============================================================
ALTER TABLE journal_entries DROP CONSTRAINT IF EXISTS journal_entries_reference_type_check;
ALTER TABLE journal_entries ADD CONSTRAINT journal_entries_reference_type_check
  CHECK (reference_type = ANY (ARRAY[
    'manual', 'transaction', 'return', 'payment', 'void',
    'purchase', 'purchase_payment', 'purchase_return',
    'payroll', 'closing', 'reclassify', 'stock_adjustment',
    'adjusting'
  ]));

-- ============================================================
-- 2. Fungsi: post_adjusting_journal()
-- ============================================================
DROP FUNCTION IF EXISTS post_adjusting_journal(date, TEXT, jsonb);

CREATE OR REPLACE FUNCTION post_adjusting_journal(
  p_entry_date DATE,
  p_description TEXT,
  p_lines jsonb  -- [{account_id, debit, credit}]
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_journal_id uuid;
  v_line jsonb;
  v_total_debit numeric := 0;
  v_total_credit numeric := 0;
  v_account chart_of_accounts%ROWTYPE;
  v_user_id uuid;
  v_entry_timestamp timestamptz;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Tidak ada sesi pengguna';
  END IF;

  IF p_lines IS NULL OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'Jurnal penyesuaian harus memiliki minimal 1 baris';
  END IF;

  IF p_description IS NULL OR trim(p_description) = '' THEN
    RAISE EXCEPTION 'Keterangan jurnal penyesuaian wajib diisi';
  END IF;

  -- Validasi setiap baris
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    SELECT * INTO v_account
    FROM chart_of_accounts
    WHERE id = (v_line->>'account_id')::uuid
      AND user_id = v_user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Akun tidak ditemukan';
    END IF;

    IF NOT v_account.is_active THEN
      RAISE EXCEPTION 'Akun % tidak aktif', v_account.name;
    END IF;

    v_total_debit := v_total_debit + COALESCE((v_line->>'debit')::numeric, 0);
    v_total_credit := v_total_credit + COALESCE((v_line->>'credit')::numeric, 0);
  END LOOP;

  IF v_total_debit <= 0 AND v_total_credit <= 0 THEN
    RAISE EXCEPTION 'Jurnal penyesuaian harus memiliki nilai debit atau kredit';
  END IF;

  IF round(v_total_debit, 2) <> round(v_total_credit, 2) THEN
    RAISE EXCEPTION 'Total debit (%) tidak sama dengan total kredit (%)',
      v_total_debit, v_total_credit;
  END IF;

  -- Tanggal pilihan user + waktu sekarang (agar urutan jurnal wajar)
  v_entry_timestamp := p_entry_date::date + CURRENT_TIME;

  INSERT INTO journal_entries (user_id, entry_date, description, reference_type)
  VALUES (v_user_id, v_entry_timestamp, p_description, 'adjusting')
  RETURNING id INTO v_journal_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    SELECT * INTO v_account
    FROM chart_of_accounts
    WHERE id = (v_line->>'account_id')::uuid
      AND user_id = v_user_id;

    INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name,
                                debit, credit)
    VALUES (v_user_id, v_journal_id, v_account.id, v_account.code, v_account.name,
            COALESCE((v_line->>'debit')::numeric, 0),
            COALESCE((v_line->>'credit')::numeric, 0));
  END LOOP;

  RETURN v_journal_id;
END;
$$;

COMMENT ON FUNCTION post_adjusting_journal IS
'Posting jurnal penyesuaian (AJP) dengan reference_type = adjusting';

GRANT EXECUTE ON FUNCTION post_adjusting_journal(date, TEXT, jsonb) TO authenticated;
