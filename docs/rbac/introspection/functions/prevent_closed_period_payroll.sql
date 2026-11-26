CREATE OR REPLACE FUNCTION public.prevent_closed_period_payroll()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF check_period_closed(NEW.period_start::date, NEW.user_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah slip gaji di periode yang sudah ditutup (%).',
      NEW.period_start::date;
  END IF;
  RETURN NEW;
END;
$function$;
