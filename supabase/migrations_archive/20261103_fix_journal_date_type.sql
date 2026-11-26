-- ============================================================
-- Fix: Ubah tipe parameter post_journal dari timestamptz ke DATE
-- untuk menghindari masalah timezone conversion
-- PLUS: Simpan entry_date dengan waktu NOW() agar jurnal manual
-- muncul paling atas (tidak di-override ke midnight)
-- ============================================================

DROP FUNCTION IF EXISTS post_journal(timestamptz, TEXT, jsonb);

CREATE OR REPLACE FUNCTION post_journal(
  p_entry_date DATE,  -- Ubah dari timestamptz ke DATE
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

  IF p_lines IS NULL OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'Jurnal harus memiliki minimal 1 baris';
  END IF;

  IF p_description IS NULL OR trim(p_description) = '' THEN
    RAISE EXCEPTION 'Deskripsi jurnal wajib diisi';
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

  -- Validasi balance
  IF v_total_debit <= 0 AND v_total_credit <= 0 THEN
    RAISE EXCEPTION 'Jurnal harus memiliki nilai debit atau kredit';
  END IF;

  IF round(v_total_debit, 2) <> round(v_total_credit, 2) THEN
    RAISE EXCEPTION 'Total debit (%) tidak sama dengan total kredit (%)',
      v_total_debit, v_total_credit;
  END IF;

  -- Buat timestamp: DATE yang dipilih user + waktu NOW()
  -- Jadi jurnal manual yang baru dibuat akan punya waktu sekarang, bukan midnight
  -- Contoh: user pilih 2026-11-03, waktu buat 13:37 → entry_date = 2026-11-03 13:37:12
  v_entry_timestamp := p_entry_date::date + CURRENT_TIME;

  -- Simpan header jurnal dengan timestamp gabungan
  INSERT INTO journal_entries (user_id, entry_date, description, reference_type)
  VALUES (v_user_id, v_entry_timestamp, p_description, 'manual')
  RETURNING id INTO v_journal_id;

  -- Simpan baris jurnal
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
