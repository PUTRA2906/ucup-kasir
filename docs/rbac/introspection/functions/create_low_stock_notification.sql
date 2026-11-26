CREATE OR REPLACE FUNCTION public.create_low_stock_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_minimum_stock INTEGER;
BEGIN
  -- Ambil user_id dari produk
  v_user_id := NEW.user_id;

  -- Ambil minimum stock dari stock_alerts (nilai spesifik) bila ada
  SELECT minimum_stock INTO v_minimum_stock
  FROM stock_alerts
  WHERE product_id = NEW.id AND user_id = v_user_id AND alert_enabled = true;

  -- Fallback ke kolom minimum_stock pada products
  IF v_minimum_stock IS NULL THEN
    v_minimum_stock := NEW.minimum_stock;
  END IF;

  IF v_minimum_stock IS NULL THEN
    v_minimum_stock := 10;
  END IF;

  -- Jika stok mencapai atau di bawah minimum, buat notifikasi
  IF NEW.stock <= v_minimum_stock AND (OLD.stock IS NULL OR OLD.stock > v_minimum_stock) THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data
    ) VALUES (
      v_user_id,
      'stock_alert',
      'Stok Produk Menipis',
      'Produk "' || NEW.name || '" memiliki stok ' || NEW.stock || ' (minimum: ' || v_minimum_stock || ')',
      jsonb_build_object(
        'product_id', NEW.id,
        'product_name', NEW.name,
        'current_stock', NEW.stock,
        'minimum_stock', v_minimum_stock
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;
