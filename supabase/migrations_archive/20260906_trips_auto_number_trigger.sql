-- ============================================================
-- Nomor trip otomatis di Supabase (mirror pola delivery_orders)
-- createTrip() jalur web mengirim input tanpa trip_number →
-- NOT NULL trips.trip_number butuh trigger pengisi, sama seperti
-- trg_delivery_orders_set_number. Jalur sync (genericUpsert)
-- selalu mengirim trip_number terisi → trigger tidak menimpa.
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_trip_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM trips WHERE user_id = auth.uid();
  RETURN 'TRP-' || to_char(now(), 'YYYYMMDD') || '-' || LPAD(COALESCE(v_count + 1, 1)::TEXT, 4, '0');
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_trips_set_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.trip_number IS NULL OR NEW.trip_number = '' THEN
    NEW.trip_number := generate_trip_number();
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_trips_set_number ON public.trips;
CREATE TRIGGER trg_trips_set_number BEFORE INSERT ON public.trips
  FOR EACH ROW EXECUTE FUNCTION trg_trips_set_number();
