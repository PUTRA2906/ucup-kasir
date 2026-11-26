-- ============================================================
-- Insentif bongkar muat pindah dari modul Perjalanan ke Surat Jalan
-- - Hapus trips & trip_loaders (modul Perjalanan dihapus)
-- - delivery_orders: drop trip_id & transaction_id (backfill → join table)
-- - Tabel baru: delivery_loaders (tim muat), delivery_load_items
--   (barang dimuat: nama+jumlah+harga), delivery_order_transactions
--   (1 surat jalan → banyak transaksi)
-- - store_settings: drop kolom rate global (tidak dipakai lagi)
-- - generate_payroll v3: upah = CEIL( Σ(qty × unit_price) ÷ jumlah loader )
--   per surat jalan status 'selesai' dalam periode; satu orang boleh ikut
--   beberapa DO → digabung SATU baris "Insentif Bongkar Muat".
-- ============================================================

-- 1) Backfill referensi transaksi lama ke join table SEBELUM kolomnya dibuang
CREATE TABLE IF NOT EXISTS public.delivery_order_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  delivery_order_id uuid NOT NULL REFERENCES public.delivery_orders(id) ON DELETE CASCADE,
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (delivery_order_id, transaction_id)
);

INSERT INTO public.delivery_order_transactions (user_id, delivery_order_id, transaction_id)
SELECT user_id, id, transaction_id FROM public.delivery_orders
WHERE transaction_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 2) Tabel loader & barang muat per surat jalan
CREATE TABLE IF NOT EXISTS public.delivery_loaders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  delivery_order_id uuid NOT NULL REFERENCES public.delivery_orders(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  employee_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (delivery_order_id, employee_id)
);

CREATE TABLE IF NOT EXISTS public.delivery_load_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  delivery_order_id uuid NOT NULL REFERENCES public.delivery_orders(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_loaders_do ON public.delivery_loaders (delivery_order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_load_items_do ON public.delivery_load_items (delivery_order_id);
CREATE INDEX IF NOT EXISTS idx_do_transactions_do ON public.delivery_order_transactions (delivery_order_id);
CREATE INDEX IF NOT EXISTS idx_do_transactions_tx ON public.delivery_order_transactions (transaction_id);

-- 3) RLS
ALTER TABLE public.delivery_loaders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_load_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_order_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "delivery_loaders_user_is" ON public.delivery_loaders;
CREATE POLICY "delivery_loaders_user_is" ON public.delivery_loaders
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delivery_load_items_user_is" ON public.delivery_load_items;
CREATE POLICY "delivery_load_items_user_is" ON public.delivery_load_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delivery_order_transactions_user_is" ON public.delivery_order_transactions;
CREATE POLICY "delivery_order_transactions_user_is" ON public.delivery_order_transactions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4) Buang modul Perjalanan & kolom lama
-- (buang kolom penahan FK dulu, baru drop tabelnya)
ALTER TABLE public.delivery_orders DROP COLUMN IF EXISTS trip_id;
ALTER TABLE public.delivery_orders DROP COLUMN IF EXISTS transaction_id;

DROP TABLE IF EXISTS public.trip_loaders;
DROP TABLE IF EXISTS public.trips;
DROP FUNCTION IF EXISTS public.trg_trips_set_number();
DROP FUNCTION IF EXISTS public.generate_trip_number();

ALTER TABLE public.store_settings
  DROP COLUMN IF EXISTS loading_rate_per_sack,
  DROP COLUMN IF EXISTS unloading_rate_per_sack;

-- 5) generate_payroll v3 — insentif berbasis surat jalan
CREATE OR REPLACE FUNCTION public.generate_payroll(p_period_id uuid)
RETURNS SETOF public.payrolls
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_period payroll_periods%ROWTYPE;
  v_employee RECORD;
  v_payroll_id uuid;
  v_allowance numeric;
  v_deduction numeric;
  v_gross numeric;
  v_net numeric;
  v_component RECORD;
  v_comp_amount numeric;
  v_insentif numeric;
  v_do RECORD;
BEGIN
  v_user_id := auth.uid();

  SELECT * INTO v_period
  FROM payroll_periods
  WHERE id = p_period_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Periode payroll tidak ditemukan';
  END IF;

  IF v_period.status = 'paid' THEN
    RAISE EXCEPTION 'Periode payroll sudah dibayar, tidak bisa digenerate ulang';
  END IF;

  DELETE FROM payroll_items WHERE payroll_id IN (SELECT id FROM payrolls WHERE period_id = p_period_id AND user_id = v_user_id);
  DELETE FROM payrolls WHERE period_id = p_period_id AND user_id = v_user_id;

  FOR v_employee IN
    SELECT e.*, p.base_salary as position_salary
    FROM employees e
    LEFT JOIN positions p ON p.id = e.position_id
    WHERE e.user_id = v_user_id AND e.is_active = true AND e.status = 'aktif'
  LOOP
    v_payroll_id := gen_random_uuid();
    v_allowance := 0;
    v_deduction := 0;

    v_gross := COALESCE(NULLIF(v_employee.base_salary, 0), COALESCE(v_employee.position_salary, 0));

    INSERT INTO payrolls (id, user_id, period_id, employee_id, base_salary, total_allowance, total_deduction, total_gross, total_net, status)
    VALUES (v_payroll_id, v_user_id, p_period_id, v_employee.id, v_gross, 0, 0, v_gross, v_gross, 'draft');

    FOR v_component IN
      SELECT * FROM payroll_components
      WHERE user_id = v_user_id AND is_active = true
        AND (
          apply_to = 'semua'
          OR (apply_to = 'per_jabatan' AND position_id = v_employee.position_id)
          OR (apply_to = 'per_karyawan' AND employee_id = v_employee.id)
        )
    LOOP
      IF v_component.is_percentage THEN
        v_comp_amount := ROUND(v_gross * v_component.amount / 100, 2);
      ELSE
        v_comp_amount := v_component.amount;
      END IF;

      INSERT INTO payroll_items (id, user_id, payroll_id, component_id, component_name, component_type, amount)
      VALUES (gen_random_uuid(), v_user_id, v_payroll_id, v_component.id, v_component.name, v_component.type, v_comp_amount);

      IF v_component.type = 'tunjangan' THEN
        v_allowance := v_allowance + v_comp_amount;
      ELSE
        v_deduction := v_deduction + v_comp_amount;
      END IF;
    END LOOP;

    -- ---- Insentif bongkar muat (per surat jalan selesai) ----
    v_insentif := 0;

    IF EXISTS (
      SELECT 1 FROM delivery_loaders l WHERE l.employee_id = v_employee.id
    ) THEN
      FOR v_do IN
        SELECT dor.id,
               COALESCE((SELECT SUM(li.quantity * li.unit_price) FROM delivery_load_items li WHERE li.delivery_order_id = dor.id), 0) AS nilai,
               (SELECT COUNT(*) FROM delivery_loaders l WHERE l.delivery_order_id = dor.id) AS orang
        FROM delivery_orders dor
        WHERE dor.user_id = v_user_id
          AND dor.status = 'selesai'
          AND dor.do_date BETWEEN v_period.start_date AND v_period.end_date
          AND EXISTS (SELECT 1 FROM delivery_loaders l WHERE l.delivery_order_id = dor.id AND l.employee_id = v_employee.id)
      LOOP
        IF v_do.orang > 0 AND v_do.nilai > 0 THEN
          v_insentif := v_insentif + CEIL(v_do.nilai / v_do.orang);
        END IF;
      END LOOP;
    END IF;

    IF v_insentif > 0 THEN
      INSERT INTO payroll_items (id, user_id, payroll_id, component_id, component_name, component_type, amount)
      VALUES (gen_random_uuid(), v_user_id, v_payroll_id, NULL, 'Insentif Bongkar Muat', 'tunjangan', v_insentif);
      v_allowance := v_allowance + v_insentif;
    END IF;

    v_net := v_gross + v_allowance - v_deduction;

    UPDATE payrolls
    SET total_allowance = v_allowance,
        total_deduction = v_deduction,
        total_gross = v_gross + v_allowance,
        total_net = v_net
    WHERE id = v_payroll_id;
  END LOOP;

  UPDATE payroll_periods
  SET status = 'generated',
      total_employee = (SELECT COUNT(*) FROM payrolls WHERE period_id = p_period_id AND user_id = v_user_id),
      total_gross = (SELECT COALESCE(SUM(total_gross), 0) FROM payrolls WHERE period_id = p_period_id AND user_id = v_user_id),
      total_deduction = (SELECT COALESCE(SUM(total_deduction), 0) FROM payrolls WHERE period_id = p_period_id AND user_id = v_user_id),
      total_net = (SELECT COALESCE(SUM(total_net), 0) FROM payrolls WHERE period_id = p_period_id AND user_id = v_user_id)
  WHERE id = p_period_id;

  RETURN QUERY
  SELECT * FROM payrolls WHERE period_id = p_period_id AND user_id = v_user_id ORDER BY created_at;
END;
$function$;
