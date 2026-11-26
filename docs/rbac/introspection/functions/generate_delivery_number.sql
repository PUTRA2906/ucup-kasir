CREATE OR REPLACE FUNCTION public.generate_delivery_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_year TEXT;
  v_count INTEGER;
  v_number TEXT;
BEGIN
  v_year := to_char(now(), 'YYYY');
  SELECT COUNT(*) INTO v_count
  FROM delivery_orders
  WHERE user_id = auth.uid();

  v_number := 'SJ-' || v_year || '-' || LPAD(COALESCE(v_count + 1, 1)::TEXT, 4, '0');
  RETURN v_number;
END;
$function$;
