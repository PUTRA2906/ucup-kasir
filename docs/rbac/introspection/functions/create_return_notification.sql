CREATE OR REPLACE FUNCTION public.create_return_notification()
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
    'return',
    'Retur Produk',
    'Retur ' || NEW.return_number || ' untuk transaksi ' || v_transaction_number || ' berhasil diproses',
    jsonb_build_object(
      'return_id', NEW.id,
      'return_number', NEW.return_number,
      'transaction_id', NEW.transaction_id,
      'total_refund', NEW.total_refund
    )
  );
  
  RETURN NEW;
END;
$function$;
