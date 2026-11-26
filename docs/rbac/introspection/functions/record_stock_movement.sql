CREATE OR REPLACE FUNCTION public.record_stock_movement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Hanya catat jika stok berubah
  IF NEW.stock != OLD.stock THEN
    INSERT INTO stock_movements (
      user_id,
      product_id,
      movement_type,
      quantity,
      quantity_before,
      quantity_after,
      notes
    ) VALUES (
      NEW.user_id,
      NEW.id,
      CASE 
        WHEN NEW.stock > OLD.stock THEN 'in'
        ELSE 'out'
      END,
      ABS(NEW.stock - OLD.stock),
      OLD.stock,
      NEW.stock,
      'Automatic stock movement'
    );
  END IF;
  RETURN NEW;
END;
$function$;
