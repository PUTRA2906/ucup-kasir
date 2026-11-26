CREATE OR REPLACE FUNCTION public.revert_loan_payments_on_payroll_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_payment RECORD;
BEGIN
  IF OLD.status = 'paid' THEN
    RAISE EXCEPTION 'Payroll sudah dibayar (jurnal terposting). Tidak bisa dihapus.';
  END IF;

  -- Kembalikan sisa tiap loan yang dipotong dari payroll ini
  FOR v_payment IN
    SELECT p.loan_id, SUM(p.amount) AS total
    FROM employee_loan_payments p
    WHERE p.payroll_id = OLD.id
    GROUP BY p.loan_id
  LOOP
    UPDATE employee_loans l
    SET remaining_amount = l.remaining_amount + v_payment.total,
        status = 'active'
    WHERE l.id = v_payment.loan_id;
  END LOOP;

  DELETE FROM employee_loan_payments WHERE payroll_id = OLD.id;
  RETURN OLD;
END;
$function$;
