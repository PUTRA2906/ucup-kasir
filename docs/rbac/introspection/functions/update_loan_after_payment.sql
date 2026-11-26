CREATE OR REPLACE FUNCTION public.update_loan_after_payment()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_new_remaining numeric;
BEGIN
  SELECT remaining_amount - NEW.amount INTO v_new_remaining
  FROM employee_loans WHERE id = NEW.loan_id FOR UPDATE;

  UPDATE employee_loans
  SET remaining_amount = GREATEST(v_new_remaining, 0),
      status = CASE WHEN v_new_remaining <= 0 THEN 'paid' ELSE 'active' END
  WHERE id = NEW.loan_id;

  RETURN NEW;
END;
$function$;
