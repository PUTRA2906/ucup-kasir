-- ============================================================
-- Migration: Auto Update Transaction on Payment Delete
-- Trigger untuk update paid_amount dan remaining_amount di transaksi
-- saat pembayaran dihapus, dan hapus alokasi pembayaran ke items
-- ============================================================

-- Fungsi untuk hapus alokasi pembayaran ke items saat payment dihapus
CREATE OR REPLACE FUNCTION auto_delete_payment_allocations()
RETURNS TRIGGER AS $$
BEGIN
  -- Hapus semua alokasi pembayaran ini ke items
  DELETE FROM transaction_item_payments
  WHERE payment_id = OLD.id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Hapus alokasi saat payment dihapus (BEFORE DELETE, sebelum void jurnal)
DROP TRIGGER IF EXISTS trigger_auto_delete_payment_allocations ON transaction_payments;

CREATE TRIGGER trigger_auto_delete_payment_allocations
  BEFORE DELETE ON transaction_payments
  FOR EACH ROW
  EXECUTE FUNCTION auto_delete_payment_allocations();

-- Fungsi untuk update transaksi saat payment dihapus
CREATE OR REPLACE FUNCTION auto_update_transaction_on_payment_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_transaction transactions%ROWTYPE;
  v_new_paid numeric;
  v_new_remaining numeric;
  v_new_status text;
BEGIN
  -- Ambil data transaksi
  SELECT * INTO v_transaction
  FROM transactions
  WHERE id = OLD.transaction_id;

  -- Skip jika transaksi tidak ditemukan
  IF v_transaction IS NULL THEN
    RETURN OLD;
  END IF;

  -- Hitung ulang paid_amount dan remaining_amount
  v_new_paid := GREATEST(0, v_transaction.paid_amount - OLD.amount);
  v_new_remaining := v_transaction.total - v_new_paid;
  v_new_status := CASE WHEN v_new_remaining > 0 THEN 'belum_lunas' ELSE 'lunas' END;

  -- Update transaksi
  UPDATE transactions
  SET paid_amount = v_new_paid,
      remaining_amount = v_new_remaining,
      payment_status = v_new_status,
      updated_at = NOW()
  WHERE id = OLD.transaction_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Update transaksi saat payment dihapus (AFTER DELETE, setelah void jurnal)
DROP TRIGGER IF EXISTS trigger_auto_update_transaction_on_payment_delete ON transaction_payments;

CREATE TRIGGER trigger_auto_update_transaction_on_payment_delete
  AFTER DELETE ON transaction_payments
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_transaction_on_payment_delete();

-- ============================================================
-- Komentar & Dokumentasi
-- ============================================================

COMMENT ON FUNCTION auto_delete_payment_allocations() IS
'Auto-delete alokasi pembayaran ke items saat pembayaran dihapus.
Trigger ini jalan BEFORE DELETE, sebelum trigger void jurnal dan update transaksi.';

COMMENT ON FUNCTION auto_update_transaction_on_payment_delete() IS
'Auto-update paid_amount, remaining_amount, dan payment_status di transaksi
saat pembayaran cicilan dihapus.
Trigger ini jalan AFTER DELETE, setelah trigger void jurnal.';

COMMENT ON TRIGGER trigger_auto_delete_payment_allocations ON transaction_payments IS
'Auto-delete alokasi pembayaran ke items saat pembayaran dihapus.';

COMMENT ON TRIGGER trigger_auto_update_transaction_on_payment_delete ON transaction_payments IS
'Auto-update transaksi saat pembayaran dihapus.
Mengurangi paid_amount, menambah remaining_amount, dan update payment_status.';
