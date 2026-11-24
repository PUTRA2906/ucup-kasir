-- ============================================================
-- Blokir pembuatan jurnal manual / jurnal penyesuaian pada periode
-- yang sudah ditutup (tutup buku).
--
-- Sebelumnya proteksi hanya ada di UI (dan trigger DELETE). Fungsi RPC
-- masih menerima insert jurnal bertanggal periode tertutup, sehingga
-- jurnal bisa masuk lewat pemanggilan langsung / klien lain.
--
-- close_period() sendiri tidak memakai post_journal, jadi jurnal penutup
-- (yang bertanggal period_end) tetap bisa dibuat.
-- ============================================================

CREATE OR REPLACE FUNCTION post_journal(p_entry_date date, p_description text, p_lines jsonb)
RETURNS uuid
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

  IF check_period_closed(p_entry_date, v_user_id) THEN
    RAISE EXCEPTION 'Periode % sudah ditutup. Buka kembali periode tersebut sebelum mencatat jurnal.',
      p_entry_date;
  END IF;

  IF p_lines IS NULL OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'Jurnal harus memiliki minimal 1 baris';
  END IF;

  IF p_description IS NULL OR trim(p_description) = '' THEN
    RAISE EXCEPTION 'Deskripsi jurnal wajib diisi';
  END IF;

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
    RAISE EXCEPTION 'Jurnal harus memiliki nilai debit atau kredit';
  END IF;

  IF round(v_total_debit, 2) <> round(v_total_credit, 2) THEN
    RAISE EXCEPTION 'Total debit (%) tidak sama dengan total kredit (%)',
      v_total_debit, v_total_credit;
  END IF;

  v_entry_timestamp := p_entry_date::date + CURRENT_TIME;

  INSERT INTO journal_entries (user_id, entry_date, description, reference_type)
  VALUES (v_user_id, v_entry_timestamp, p_description, 'manual')
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

CREATE OR REPLACE FUNCTION post_adjusting_journal(p_entry_date date, p_description text, p_lines jsonb)
RETURNS uuid
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

  IF check_period_closed(p_entry_date, v_user_id) THEN
    RAISE EXCEPTION 'Periode % sudah ditutup. Buka kembali periode tersebut sebelum mencatat jurnal penyesuaian.',
      p_entry_date;
  END IF;

  IF p_lines IS NULL OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'Jurnal penyesuaian harus memiliki minimal 1 baris';
  END IF;

  IF p_description IS NULL OR trim(p_description) = '' THEN
    RAISE EXCEPTION 'Keterangan jurnal penyesuaian wajib diisi';
  END IF;

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

COMMENT ON FUNCTION post_journal(date, text, jsonb) IS
'Posting jurnal umum manual. Ditolak jika tanggal berada di periode yang sudah ditutup.';
COMMENT ON FUNCTION post_adjusting_journal(date, text, jsonb) IS
'Posting jurnal penyesuaian. Ditolak jika tanggal berada di periode yang sudah ditutup.';
