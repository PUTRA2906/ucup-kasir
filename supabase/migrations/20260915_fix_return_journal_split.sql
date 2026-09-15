-- ============================================================
-- Fix: pembagian Kas vs Piutang pada auto-jurnal create_return
-- ============================================================
-- BUG pada versi sebelumnya (20260901_finance_module.sql):
--   Jurnal meng-kredit Kas sebesar LEAST(refund, paid_amount) DAN
--   meng-kredit Piutang sebesar LEAST(refund, remaining_amount)
--   secara terpisah. Untuk transaksi campuran (DP tunai + kredit),
--   nilai yang sama dihitung dua kali sehingga total kredit
--   melebihi debit pendapatan (jurnal tidak balance).
--
--   Contoh: total 1.000.000, DP 400.000, piutang 600.000, retur 300.000
--   Salah : kredit Kas 300.000 + kredit Piutang 300.000 = 600.000
--   Benar : piutang diserap dulu (refund ≤ remaining) =>
--           kredit Piutang 300.000, kredit Kas 0
--
-- FIX: bagi refund proporsional sesuai urutan pelunasan di UPDATE
--   transactions di fungsi yang sama: porsi piutang =
--   LEAST(refund, remaining_lama), sisanya baru porsi kas.
--   Ini konsisten dengan: remaining_baru = GREATEST(total - refund - paid, 0).

CREATE OR REPLACE FUNCTION create_return(
  p_transaction_id uuid,
  p_items jsonb,
  p_notes text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_return_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_qty integer;
  v_product_name text;
  v_price numeric;
  v_price_buy numeric;
  v_subtotal numeric;
  v_total_refund numeric := 0;
  v_bought integer;
  v_returned integer;
  v_status text;
  v_transaction_number text;
  v_paid_amount numeric;
  v_remaining_amount numeric;
  v_total numeric;
  -- Pembagian porsi refund untuk auto-jurnal
  v_portion_piutang numeric;
  v_portion_kas numeric;
  -- Akun untuk auto-jurnal reversal
  v_account_kas uuid;
  v_account_piutang uuid;
  v_account_pendapatan uuid;
  v_account_hpp uuid;
  v_account_persediaan uuid;
  v_journal_id uuid;
  v_total_cogs_returned numeric := 0;
  v_cogs numeric;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Tidak ada item yang diretur';
  END IF;

  SELECT status, transaction_number, paid_amount, remaining_amount, total
    INTO v_status, v_transaction_number, v_paid_amount, v_remaining_amount, v_total
  FROM transactions
  WHERE id = p_transaction_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaksi tidak ditemukan';
  END IF;

  IF v_status = 'batal' THEN
    RAISE EXCEPTION 'Transaksi batal tidak dapat diretur';
  END IF;

  -- Validasi semua item dulu sebelum menulis apa pun
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::int;

    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Jumlah retur harus lebih dari 0';
    END IF;

    SELECT quantity INTO v_bought
    FROM transaction_items
    WHERE transaction_id = p_transaction_id
      AND product_id = v_product_id
      AND user_id = auth.uid();

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produk tidak ada di transaksi ini';
    END IF;

    SELECT COALESCE(SUM(ri.quantity), 0) INTO v_returned
    FROM return_items ri
    JOIN returns r ON r.id = ri.return_id
    WHERE r.transaction_id = p_transaction_id
      AND ri.product_id = v_product_id
      AND r.user_id = auth.uid();

    IF v_qty > v_bought - v_returned THEN
      RAISE EXCEPTION 'Jumlah retur melebihi sisa produk (maks %)', v_bought - v_returned;
    END IF;
  END LOOP;

  -- Simpan header retur
  INSERT INTO returns (user_id, transaction_id, notes, total_refund)
  VALUES (auth.uid(), p_transaction_id, p_notes, 0)
  RETURNING id INTO v_return_id;

  -- Simpan item retur + kembalikan stok + simpan price_buy untuk laporan
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::int;

    -- Ambil harga jual dari transaction_items (untuk refund)
    SELECT product_name, price INTO v_product_name, v_price
    FROM transaction_items
    WHERE transaction_id = p_transaction_id AND product_id = v_product_id;

    -- Ambil harga beli dari products (untuk perhitungan modal/HPP)
    SELECT price_buy INTO v_price_buy
    FROM products
    WHERE id = v_product_id AND user_id = auth.uid();

    v_subtotal := v_price * v_qty;
    v_total_refund := v_total_refund + v_subtotal;

    v_cogs := COALESCE(v_price_buy, 0) * v_qty;
    v_total_cogs_returned := v_total_cogs_returned + v_cogs;

    -- Simpan return_item dengan price_buy
    INSERT INTO return_items (user_id, return_id, product_id, product_name, price, price_buy, quantity, subtotal)
    VALUES (auth.uid(), v_return_id, v_product_id, v_product_name, v_price, COALESCE(v_price_buy, 0), v_qty, v_subtotal);

    UPDATE products
    SET stock = stock + v_qty,
        updated_at = now()
    WHERE id = v_product_id AND user_id = auth.uid();
  END LOOP;

  UPDATE returns SET total_refund = v_total_refund WHERE id = v_return_id;

  -- Kurangi total tagihan transaksi sesuai nilai barang yang diretur
  UPDATE transactions
  SET subtotal = GREATEST(subtotal - v_total_refund, 0),
      total = GREATEST(total - v_total_refund, 0),
      remaining_amount = GREATEST(GREATEST(total - v_total_refund, 0) - paid_amount, 0),
      payment_status = CASE WHEN paid_amount >= GREATEST(total - v_total_refund, 0)
                            THEN 'lunas' ELSE 'belum_lunas' END,
      updated_at = now()
  WHERE id = p_transaction_id AND user_id = auth.uid();

  -- ============================================================
  -- AUTO-JURNAL: Reversal — balikkan jurnal penjualan
  -- ============================================================
  -- Bagi refund: porsi piutang diserap dulu (konsisten dengan
  -- UPDATE remaining_amount di atas), sisanya baru porsi kas.
  v_portion_piutang := LEAST(v_total_refund, COALESCE(v_remaining_amount, 0));
  v_portion_kas := v_total_refund - v_portion_piutang;

  SELECT id INTO v_account_kas
  FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '1-1000';
  SELECT id INTO v_account_piutang
  FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '1-1100';
  SELECT id INTO v_account_pendapatan
  FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '4-4000';
  SELECT id INTO v_account_hpp
  FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '5-5000';
  SELECT id INTO v_account_persediaan
  FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '1-1200';

  IF v_account_pendapatan IS NOT NULL THEN
    INSERT INTO journal_entries (user_id, entry_date, description, reference_type, reference_id)
    VALUES (auth.uid(), now(), 'Retur ' || v_transaction_number,
            'return', v_return_id)
    RETURNING id INTO v_journal_id;

    -- Reversal Pendapatan (debit, karena normalnya kredit)
    INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
    SELECT auth.uid(), v_journal_id, v_account_pendapatan, '4-4000', 'Pendapatan Penjualan', v_total_refund, 0;

    -- Kredit Piutang hanya untuk porsi yang memang mengurangi piutang
    IF v_portion_piutang > 0 AND v_account_piutang IS NOT NULL THEN
      INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT auth.uid(), v_journal_id, v_account_piutang, '1-1100', 'Piutang Usaha', 0, v_portion_piutang;
    END IF;

    -- Kredit Kas hanya untuk porsi yang benar-benar dikembalikan tunai
    IF v_portion_kas > 0 AND v_account_kas IS NOT NULL THEN
      INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT auth.uid(), v_journal_id, v_account_kas, '1-1000', 'Kas', 0, v_portion_kas;
    END IF;

    -- Reversal HPP & Persediaan
    IF v_total_cogs_returned > 0 AND v_account_hpp IS NOT NULL AND v_account_persediaan IS NOT NULL THEN
      INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT auth.uid(), v_journal_id, v_account_persediaan, '1-1200', 'Persediaan Barang', v_total_cogs_returned, 0;

      INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT auth.uid(), v_journal_id, v_account_hpp, '5-5000', 'Harga Pokok Penjualan (HPP)', 0, v_total_cogs_returned;
    END IF;
  END IF;

  RETURN v_return_id;
END;
$$;
