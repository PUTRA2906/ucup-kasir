-- Tambahkan kolom minimum_stock ke tabel products.
--
-- Latar belakang: stok minimum per produk sebelumnya hanya disimpan di tabel
-- stock_alerts, tetapi beberapa fitur frontend (import/export CSV, halaman
-- Stok Gudang) membaca minimum_stock dari tabel products. Menambahkan kolom
-- ini ke products menjadikan pembacaan tunggal dan konsisten, sementara
-- stock_alerts tetap dipakai trigger notifikasi stok menipis.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS minimum_stock integer NOT NULL DEFAULT 10;

-- Backfill nilai minimum_stock dari stock_alerts yang sudah ada agar tidak
-- kehilangan pengaturan yang pernah dibuat user.
UPDATE products p
SET minimum_stock = COALESCE(
  (SELECT sa.minimum_stock
   FROM stock_alerts sa
   WHERE sa.product_id = p.id
     AND sa.user_id = p.user_id
     AND sa.alert_enabled = true
   ORDER BY sa.updated_at DESC
   LIMIT 1),
  10
)
WHERE EXISTS (
  SELECT 1 FROM stock_alerts sa2
  WHERE sa2.product_id = p.id AND sa2.user_id = p.user_id
);

-- Update trigger notifikasi stok menipis: utamakan nilai spesifik dari
-- stock_alerts, fallback ke kolom minimum_stock di products, lalu default 10.
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
