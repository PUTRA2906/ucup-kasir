CREATE OR REPLACE FUNCTION public.prevent_closed_period_journal_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF check_period_closed(OLD.entry_date::date, OLD.user_id) THEN
    RAISE EXCEPTION 'Tidak dapat menghapus jurnal di periode yang sudah ditutup (%).',
      OLD.entry_date::date;
  END IF;
  RETURN OLD;
END;
$function$;
