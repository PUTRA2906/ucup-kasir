CREATE OR REPLACE FUNCTION public.trigger_init_coa_on_first_transaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Auto-init COA jika belum ada
  PERFORM init_default_coa_for_user(NEW.user_id);
  RETURN NEW;
END;
$function$;
