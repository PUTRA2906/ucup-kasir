CREATE OR REPLACE FUNCTION public.create_transaction_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    NEW.user_id,
    'transaction',
    'Transaksi Baru',
    'Transaksi ' || NEW.transaction_number || ' berhasil dibuat dengan total ' || NEW.total,
    jsonb_build_object(
      'transaction_id', NEW.id,
      'transaction_number', NEW.transaction_number,
      'total', NEW.total,
      'customer_name', NEW.customer_name
    )
  );
  
  RETURN NEW;
END;
$function$;
