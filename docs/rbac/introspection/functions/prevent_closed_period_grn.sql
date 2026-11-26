CREATE OR REPLACE FUNCTION public.prevent_closed_period_grn()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF check_period_closed(NEW.receipt_date::date, NEW.user_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah penerimaan barang di periode yang sudah ditutup (%).',
      NEW.receipt_date::date;
  END IF;
  RETURN NEW;
END;
$function$;
