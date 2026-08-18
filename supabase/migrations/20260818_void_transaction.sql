-- Migrasi: Fitur void/batalkan transaksi
-- Menggantikan penghapusan transaksi secara permanen.
-- Transaksi ditandai status = 'batal', stok produk dikembalikan,
-- namun riwayat transaksi & pembayaran tetap tersimpan untuk audit/laporan.

DROP FUNCTION IF EXISTS void_transaction;

CREATE OR REPLACE FUNCTION void_transaction(p_transaction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_status text;
BEGIN
  -- Ambil status transaksi (pastikan milik user yang login)
  SELECT status INTO v_status
  FROM transactions
  WHERE id = p_transaction_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaksi tidak ditemukan';
  END IF;

  IF v_status = 'batal' THEN
    RAISE EXCEPTION 'Transaksi sudah dibatalkan sebelumnya';
  END IF;

  -- Kembalikan stok produk dari tiap item
  FOR v_item IN
    SELECT ti.product_id, ti.quantity
    FROM transaction_items ti
    WHERE ti.transaction_id = p_transaction_id
      AND ti.user_id = auth.uid()
  LOOP
    IF v_item.product_id IS NOT NULL THEN
      UPDATE products
      SET stock = stock + v_item.quantity,
          updated_at = now()
      WHERE id = v_item.product_id AND user_id = auth.uid();
    END IF;
  END LOOP;

  -- Tandai transaksi sebagai batal (data tetap tersimpan)
  UPDATE transactions
  SET status = 'batal',
      updated_at = now()
  WHERE id = p_transaction_id AND user_id = auth.uid();
END;
$$;
