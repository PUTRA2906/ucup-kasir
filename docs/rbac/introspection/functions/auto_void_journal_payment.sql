CREATE OR REPLACE FUNCTION public.auto_void_journal_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_journal_id uuid;
BEGIN
  -- Cari jurnal yang reference ke payment ini
  SELECT id INTO v_journal_id
  FROM journal_entries
  WHERE reference_type = 'payment'
  AND reference_id = OLD.transaction_id
  AND user_id = OLD.user_id
  AND status = 'posted'
  LIMIT 1;

  -- Void jurnal jika ditemukan
  IF v_journal_id IS NOT NULL THEN
    UPDATE journal_entries
    SET status = 'void',
        updated_at = NOW()
    WHERE id = v_journal_id;
    
    RAISE NOTICE 'Journal voided: %', v_journal_id;
  END IF;

  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in auto_void_journal_payment: %', SQLERRM;
    RETURN OLD;
END;
$function$;
