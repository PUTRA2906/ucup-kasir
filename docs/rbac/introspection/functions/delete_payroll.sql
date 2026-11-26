CREATE OR REPLACE FUNCTION public.delete_payroll(p_payroll_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_journal_id uuid;
BEGIN
  v_user_id := auth.uid();

  SELECT journal_entry_id INTO v_journal_id
  FROM payrolls
  WHERE id = p_payroll_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Slip gaji tidak ditemukan';
  END IF;

  IF v_journal_id IS NOT NULL THEN
    DELETE FROM journal_lines WHERE journal_entry_id = v_journal_id;
    DELETE FROM journal_entries WHERE id = v_journal_id;
  END IF;

  DELETE FROM payrolls WHERE id = p_payroll_id AND user_id = v_user_id;

  RETURN true;
END;
$function$;
