CREATE OR REPLACE FUNCTION public.prevent_closed_period_po()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF check_period_closed(NEW.po_date::date, NEW.user_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah purchase order di periode yang sudah ditutup (%).',
      NEW.po_date::date;
  END IF;
  RETURN NEW;
END;
$function$;
