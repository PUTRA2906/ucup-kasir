CREATE OR REPLACE FUNCTION public.create_payment_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_transaction_number TEXT;
BEGIN
  -- Ambil nomor transaksi
  SELECT transaction_number INTO v_transaction_number
  FROM transactions
  WHERE id = NEW.transaction_id;
  
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    NEW.user_id,
    'payment',
    'Pembayaran Diterima',
    'Pembayaran ' || NEW.amount || ' untuk transaksi ' || v_transaction_number || ' berhasil dicatat',
    jsonb_build_object(
      'payment_id', NEW.id,
      'transaction_id', NEW.transaction_id,
      'amount', NEW.amount,
      'payment_method', NEW.payment_method
    )
  );
  
  RETURN NEW;
END;
$function$;
