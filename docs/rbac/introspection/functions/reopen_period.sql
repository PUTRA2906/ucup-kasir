CREATE OR REPLACE FUNCTION public.reopen_period(p_closing_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_period_end date;
BEGIN
  SELECT period_end INTO v_period_end
  FROM closing_periods
  WHERE id = p_closing_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Periode tidak ditemukan atau bukan milik Anda.';
  END IF;

  UPDATE journal_entries
  SET status = 'void', updated_at = now()
  WHERE user_id = v_user_id
    AND reference_type = 'closing'
    AND status <> 'void'
    AND (
      reference_id = p_closing_id
      OR (reference_id IS NULL AND entry_date::date = v_period_end)
    );

  UPDATE closing_periods
  SET status = 'reopened',
      updated_at = now()
  WHERE id = p_closing_id;
END;
$function$;
