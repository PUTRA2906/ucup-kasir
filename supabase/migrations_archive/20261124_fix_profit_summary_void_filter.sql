-- ============================================================
-- Perbaiki filter status transaksi di get_profit_summary().
--
-- Bug: fungsi memakai `t.status != 'dibatalkan'`, padahal status yang
-- benar-benar dipakai aplikasi adalah 'selesai' / 'batal' (lihat
-- void_transaction() yang men-set status = 'batal'). Akibatnya transaksi
-- yang dibatalkan tetap dihitung sebagai pendapatan & laba.
--
-- Dampak ke tutup buku: total_profit & realized_profit menjadi terlalu
-- besar, sehingga rasio laba direalisasi di close_period() salah dan
-- pembagian ke 3-3200 / 3-3100 tidak akurat.
--
-- Perbaikan: kecualikan 'batal' dan 'void' (defensif untuk data lama).
-- ============================================================

CREATE OR REPLACE FUNCTION get_profit_summary(
  p_user_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE(
  total_revenue numeric,
  total_cogs numeric,
  total_profit numeric,
  realized_revenue numeric,
  realized_cogs numeric,
  realized_profit numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_revenue numeric := 0;
  v_total_cogs numeric := 0;
  v_realized_revenue numeric := 0;
  v_date_filter text := '';
BEGIN
  -- Build date filter
  IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
    v_date_filter := format(' AND t.created_at::date >= %L AND t.created_at::date <= %L', p_start_date, p_end_date);
  END IF;

  -- Total revenue & COGS (semua transaksi yang tidak dibatalkan)
  EXECUTE format('
    SELECT
      COALESCE(SUM(t.total), 0),
      COALESCE(SUM(
        (SELECT SUM(ti.quantity * COALESCE(p.price_buy, 0))
         FROM transaction_items ti
         LEFT JOIN products p ON p.id = ti.product_id
         WHERE ti.transaction_id = t.id)
      ), 0)
    FROM transactions t
    WHERE t.user_id = $1
      AND t.status NOT IN (''batal'', ''void'')
      %s
  ', v_date_filter)
  INTO v_total_revenue, v_total_cogs
  USING p_user_id;

  -- Realized revenue (tunai + piutang terbayar)
  EXECUTE format('
    SELECT COALESCE(SUM(t.paid_amount), 0)
    FROM transactions t
    WHERE t.user_id = $1
      AND t.status NOT IN (''batal'', ''void'')
      %s
  ', v_date_filter)
  INTO v_realized_revenue
  USING p_user_id;

  -- Realized COGS = proportional COGS based on payment ratio
  RETURN QUERY
  SELECT
    v_total_revenue,
    v_total_cogs,
    (v_total_revenue - v_total_cogs) as total_profit,
    v_realized_revenue,
    CASE
      WHEN v_total_revenue > 0 THEN (v_realized_revenue / v_total_revenue) * v_total_cogs
      ELSE 0
    END as realized_cogs,
    CASE
      WHEN v_total_revenue > 0 THEN v_realized_revenue - ((v_realized_revenue / v_total_revenue) * v_total_cogs)
      ELSE 0
    END as realized_profit;
END;
$$;

COMMENT ON FUNCTION get_profit_summary(uuid, date, date) IS
'Ringkasan laba aktual & direalisasi. Transaksi berstatus batal/void dikecualikan.';
