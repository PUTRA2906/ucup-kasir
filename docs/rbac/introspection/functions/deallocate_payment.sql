CREATE OR REPLACE FUNCTION public.deallocate_payment(p_payment_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM transaction_item_payments
  WHERE payment_id = p_payment_id AND user_id = auth.uid();
END;
$function$;
