-- ============================================================
-- Migrasi: Fungsi Hapus Tutup Buku
-- Project: Ucup Kasir
-- Date: 2026-11-04
--
-- Fitur:
-- Fungsi delete_closing_period() untuk menghapus periode tertutup
-- ============================================================

-- ============================================================
-- FUNGSI: delete_closing_period()
-- ============================================================

CREATE OR REPLACE FUNCTION delete_closing_period(p_closing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  -- Validasi: Hanya bisa hapus milik sendiri
  IF NOT EXISTS(
    SELECT 1 FROM closing_periods
    WHERE id = p_closing_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Periode tidak ditemukan atau bukan milik Anda.';
  END IF;

  -- Hapus periode
  DELETE FROM closing_periods
  WHERE id = p_closing_id;
END;
$$;

COMMENT ON FUNCTION delete_closing_period IS 'Hapus periode yang sudah ditutup';

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

GRANT EXECUTE ON FUNCTION delete_closing_period TO authenticated;
