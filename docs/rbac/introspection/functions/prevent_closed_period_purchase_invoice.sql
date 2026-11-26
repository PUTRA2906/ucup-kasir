CREATE OR REPLACE FUNCTION public.prevent_closed_period_purchase_invoice()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF check_period_closed(NEW.invoice_date::date, NEW.user_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah invoice pembelian di periode yang sudah ditutup (%).',
      NEW.invoice_date::date;
  END IF;
  RETURN NEW;
END;
$function$;
