CREATE OR REPLACE FUNCTION public.delete_return(p_return_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_item RECORD;
BEGIN
  -- Hapus jurnal retur terkait (reversal) agar tidak orphan
  DELETE FROM journal_lines
  WHERE journal_id IN (
    SELECT id FROM journal_entries
    WHERE reference_type = 'return' AND reference_id = p_return_id AND user_id = auth.uid()
  );
  DELETE FROM journal_entries
  WHERE reference_type = 'return' AND reference_id = p_return_id AND user_id = auth.uid();

  -- Kurangi kembali stok produk
  FOR v_item IN
    SELECT ri.product_id, ri.quantity
    FROM return_items ri
    WHERE ri.return_id = p_return_id AND ri.user_id = auth.uid()
  LOOP
    IF v_item.product_id IS NOT NULL THEN
      UPDATE products
      SET stock = stock - v_item.quantity,
          updated_at = now()
      WHERE id = v_item.product_id AND user_id = auth.uid();
    END IF;
  END LOOP;

  DELETE FROM returns
  WHERE id = p_return_id AND user_id = auth.uid();
END;
$function$;
