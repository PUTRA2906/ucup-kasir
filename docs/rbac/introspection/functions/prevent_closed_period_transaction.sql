CREATE OR REPLACE FUNCTION public.prevent_closed_period_transaction()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF check_period_closed(NEW.created_at::date, NEW.user_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah transaksi di periode yang sudah ditutup (%).',
      NEW.created_at::date;
  END IF;
  RETURN NEW;
END;
$function$;
