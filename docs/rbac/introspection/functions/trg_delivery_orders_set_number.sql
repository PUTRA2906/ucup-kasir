CREATE OR REPLACE FUNCTION public.trg_delivery_orders_set_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.do_number IS NULL OR NEW.do_number = '' THEN
    NEW.do_number := generate_delivery_number();
  END IF;
  RETURN NEW;
END;
$function$;
