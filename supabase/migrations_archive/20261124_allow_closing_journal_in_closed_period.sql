-- ============================================================
-- Izinkan jurnal penutup (reference_type = 'closing') masuk walaupun
-- periodenya sudah tercatat sebagai 'closed'.
--
-- Latar belakang: close_period() membuat jurnal penutup bertanggal
-- period_end — yang secara definisi berada DI DALAM periode yang baru
-- ditutup. Trigger prevent_closed_period_journal() memblokir semua
-- INSERT/UPDATE di periode tertutup, sehingga jurnal penutup bisa
-- ditolak (mis. saat sinkronisasi Android yang mengirim jurnal penutup
-- dan baris closing_periods secara paralel/berurutan).
--
-- Aturan baru:
--   - Jurnal penutup yang reference_id-nya menunjuk closing_periods milik
--     user yang sama → diizinkan.
--   - Jurnal penutup legacy tanpa reference_id → diizinkan (data lama).
--   - Selain itu, perilaku lama tetap: periode tertutup = ditolak.
-- Void (status='void') tetap diizinkan seperti sebelumnya.
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_closed_period_journal()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Skip untuk operasi void (status = 'void')
  IF TG_OP = 'UPDATE' AND NEW.status = 'void' THEN
    RETURN NEW;
  END IF;

  -- Jurnal penutup bertanggal period_end — izinkan bila terhubung ke
  -- closing_periods milik user dan tanggalnya memang period_end periode itu.
  IF NEW.reference_type = 'closing' THEN
    IF NEW.reference_id IS NULL THEN
      RETURN NEW;
    END IF;
    IF EXISTS (
      SELECT 1 FROM closing_periods cp
      WHERE cp.id = NEW.reference_id
        AND cp.user_id = NEW.user_id
        AND cp.period_end = NEW.entry_date::date
    ) THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Cek periode tertutup
  IF check_period_closed(NEW.entry_date::date, NEW.user_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah jurnal di periode yang sudah ditutup (%).',
      NEW.entry_date::date;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION prevent_closed_period_journal() IS
'Blokir jurnal di periode tertutup, kecuali jurnal penutup milik closing_periods tersebut dan operasi void.';
