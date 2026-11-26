CREATE OR REPLACE FUNCTION public.check_period_closed(p_date date, p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_closed boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM closing_periods
    WHERE user_id = p_user_id
      AND status = 'closed'
      AND p_date >= period_start
      AND p_date <= period_end
  ) INTO v_closed;

  RETURN v_closed;
END;
$function$;
