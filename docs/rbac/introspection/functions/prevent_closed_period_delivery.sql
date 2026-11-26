CREATE OR REPLACE FUNCTION public.prevent_closed_period_delivery()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF check_period_closed(NEW.do_date::date, NEW.user_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah surat jalan di periode yang sudah ditutup (%).',
      NEW.do_date::date;
  END IF;
  RETURN NEW;
END;
$function$;
