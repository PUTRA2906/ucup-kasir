-- ============================================================
-- Fix: trigger prevent_closed_period_return mereference kolom
-- return_date yang tidak ada di tabel returns.
-- Tabel returns menggunakan created_at, bukan return_date.
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_closed_period_return()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF check_period_closed(NEW.created_at::date, NEW.user_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah retur di periode yang sudah ditutup (%).',
      NEW.created_at::date;
  END IF;

  RETURN NEW;
END;
$$;
