-- ============================================================================
-- 0003_functions.sql — Fase 2: konversi fungsi SQL + masking HPP
--
--   * kolom TENANT user_id -> store_id, auth.uid() -> current_store_id()
--   * permission guard pada 28 RPC write (errcode 42501)
--   * search_path dikunci di SEMUA fungsi (public, pg_temp)
--   * v_products: masking HPP (security_invoker = true)
--   * fix S1: transaction_items_payment_summary security_invoker = true
--   * COA: satu daftar 18 akun (init_default_coa_for_store)
--   * notifikasi: 1 baris per anggota toko (notifications.user_id = ORANG)
--
-- Dihasilkan oleh docs/rbac/gen_functions.py — jangan edit manual.
-- ============================================================================

-- ============================================================================
-- 0. DROP: fungsi mati + fungsi yang nama parameternya berubah
-- ============================================================================

drop function if exists public.init_default_coa_for_current_user();
drop function if exists public.init_default_coa_for_user(uuid);
drop function if exists public.create_default_store_settings();
drop function if exists public.check_period_closed(date, uuid);
drop function if exists public.get_profit_summary(uuid, date, date);

-- ============================================================================
-- A. FUNGSI YANG DITULIS ULANG (COA, periode, notifikasi, stok)
-- ============================================================================

-- ============================================================================
-- init_default_coa_for_store: SATU daftar 18 akun untuk semua jalur.
--
-- 0002 hanya men-seed 16 akun (tanpa 2-2100 Hutang Gaji dan 3-3200 Laba
-- Direalisasi) dan punya early-return, sehingga akun yang kurang tidak pernah
-- dilengkapi. Akibatnya close_period() dan post_payroll_journal() gagal di
-- toko baru. Versi ini idempotent (ON CONFLICT DO NOTHING) tanpa early-return.
-- ============================================================================
create or replace function public.init_default_coa_for_store(p_store_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_store_id is null then
    return;
  end if;

  insert into public.chart_of_accounts
    (store_id, code, name, type, normal_balance, is_active, is_system)
  values
    -- ASET
    (p_store_id, '1-1000', 'Kas',                         'aset',       'debit',  true, true),
    (p_store_id, '1-1010', 'Bank',                        'aset',       'debit',  true, true),
    (p_store_id, '1-1100', 'Piutang Usaha',               'aset',       'debit',  true, true),
    (p_store_id, '1-1200', 'Persediaan Barang Dagangan',  'aset',       'debit',  true, true),
    -- KEWAJIBAN
    (p_store_id, '2-2000', 'Utang Usaha',                 'kewajiban',  'kredit', true, true),
    (p_store_id, '2-2100', 'Hutang Gaji',                 'kewajiban',  'kredit', true, true),
    -- EKUITAS
    (p_store_id, '3-3000', 'Modal Pemilik',               'ekuitas',    'kredit', true, true),
    (p_store_id, '3-3100', 'Laba Piutang',                'ekuitas',    'kredit', true, true),
    (p_store_id, '3-3200', 'Laba Direalisasi',            'ekuitas',    'kredit', true, true),
    -- PENDAPATAN
    (p_store_id, '4-4000', 'Pendapatan Penjualan',        'pendapatan', 'kredit', true, true),
    (p_store_id, '4-4100', 'Pendapatan Lainnya',          'pendapatan', 'kredit', true, true),
    -- BEBAN
    (p_store_id, '5-5000', 'Harga Pokok Penjualan (HPP)', 'beban',      'debit',  true, true),
    (p_store_id, '5-5100', 'Beban Operasional',           'beban',      'debit',  true, true),
    (p_store_id, '5-5200', 'Beban Gaji',                  'beban',      'debit',  true, true),
    (p_store_id, '5-5300', 'Beban Sewa',                  'beban',      'debit',  true, true),
    (p_store_id, '5-5400', 'Beban Utilitas',              'beban',      'debit',  true, true),
    (p_store_id, '5-5500', 'Beban Transportasi',          'beban',      'debit',  true, true),
    (p_store_id, '5-5600', 'Beban Lainnya',               'beban',      'debit',  true, true)
  on conflict (store_id, code) do nothing;
end;
$$;

comment on function public.init_default_coa_for_store(uuid) is
  'Seed/melengkapi 18 akun COA default untuk sebuah toko (idempotent).';

-- ============================================================================
-- seed_default_accounts: DIPERTAHANKAN sebagai pembungkus tipis.
--
-- RBAC_PLAN menyebutnya di daftar DROP, tetapi frontend masih memanggilnya
-- (src/services/finance.ts:38). Menghapusnya di Fase 2 = halaman Finance mati.
-- Satu implementasi (init_default_coa_for_store); fungsi ini hanya delegasi.
-- Nama bisa dihapus di Fase 3 setelah frontend berhenti memanggilnya.
-- ============================================================================
create or replace function public.seed_default_accounts()
returns setof public.chart_of_accounts
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_store_id uuid := public.current_store_id();
begin
  if v_store_id is null then
    raise exception 'Tidak ada sesi pengguna' using errcode = '42501';
  end if;

  if not public.has_permission('finance.write') then
    raise exception 'Akses ditolak: butuh permission finance.write' using errcode = '42501';
  end if;

  perform public.init_default_coa_for_store(v_store_id);

  return query
    select * from public.chart_of_accounts
    where store_id = v_store_id
    order by code;
end;
$$;

comment on function public.seed_default_accounts() is
  'Seed akun default untuk toko aktif. Delegasi ke init_default_coa_for_store().';

-- ============================================================================
-- check_period_closed: parameter p_user_id -> p_store_id (tenant).
-- Signature (date, uuid) tetap; hanya nama parameter berubah -> DROP dulu.
-- ============================================================================
create or replace function public.check_period_closed(p_date date, p_store_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_closed boolean;
begin
  select exists (
    select 1 from public.closing_periods
    where store_id = p_store_id
      and status = 'closed'
      and p_date >= period_start
      and p_date <= period_end
  ) into v_closed;

  return v_closed;
end;
$$;

comment on function public.check_period_closed(date, uuid) is
  'True bila tanggal berada di periode yang sudah ditutup untuk toko tsb.';

-- ============================================================================
-- get_profit_summary: p_user_id -> p_store_id, dynamic SQL dibuang,
-- guard report.sales.read (fungsi ini membuka HPP/laba).
-- ============================================================================
create or replace function public.get_profit_summary(
  p_store_id uuid,
  p_start_date date default null,
  p_end_date date default null
)
returns table (
  total_revenue numeric,
  total_cogs numeric,
  total_profit numeric,
  realized_revenue numeric,
  realized_cogs numeric,
  realized_profit numeric
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_total_revenue numeric := 0;
  v_total_cogs numeric := 0;
  v_realized_revenue numeric := 0;
begin
  if not public.has_permission('report.sales.read') then
    raise exception 'Akses ditolak: butuh permission report.sales.read' using errcode = '42501';
  end if;

  select
    coalesce(sum(t.total), 0),
    coalesce(sum((
      select sum(ti.quantity * coalesce(p.price_buy, 0))
      from public.transaction_items ti
      left join public.products p on p.id = ti.product_id
      where ti.transaction_id = t.id
    )), 0),
    coalesce(sum(t.paid_amount), 0)
  into v_total_revenue, v_total_cogs, v_realized_revenue
  from public.transactions t
  where t.store_id = p_store_id
    and t.status not in ('batal', 'void')
    and (p_start_date is null or t.created_at::date >= p_start_date)
    and (p_end_date is null or t.created_at::date <= p_end_date);

  return query
  select
    v_total_revenue,
    v_total_cogs,
    v_total_revenue - v_total_cogs,
    v_realized_revenue,
    case when v_total_revenue > 0
         then (v_realized_revenue / v_total_revenue) * v_total_cogs else 0 end,
    case when v_total_revenue > 0
         then v_realized_revenue - ((v_realized_revenue / v_total_revenue) * v_total_cogs)
         else 0 end;
end;
$$;

-- ============================================================================
-- NOTIFIKASI: satu baris per anggota aktif toko.
-- `notifications.user_id` memang berarti ORANG -> tetap user_id.
-- ============================================================================
create or replace function public.create_transaction_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member record;
begin
  for v_member in
    select user_id from public.store_members
    where store_id = new.store_id and is_active
  loop
    insert into public.notifications (user_id, type, title, message, data)
    values (
      v_member.user_id,
      'transaction',
      'Transaksi Baru',
      'Transaksi ' || new.transaction_number || ' berhasil dibuat dengan total ' || new.total,
      jsonb_build_object(
        'transaction_id', new.id,
        'transaction_number', new.transaction_number,
        'total', new.total,
        'customer_name', new.customer_name
      )
    );
  end loop;

  return new;
end;
$$;

create or replace function public.create_payment_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member record;
  v_transaction_number text;
begin
  select transaction_number into v_transaction_number
  from public.transactions
  where id = new.transaction_id;

  for v_member in
    select user_id from public.store_members
    where store_id = new.store_id and is_active
  loop
    insert into public.notifications (user_id, type, title, message, data)
    values (
      v_member.user_id,
      'payment',
      'Pembayaran Diterima',
      'Pembayaran ' || new.amount || ' untuk transaksi ' || coalesce(v_transaction_number, '-') || ' berhasil dicatat',
      jsonb_build_object(
        'payment_id', new.id,
        'transaction_id', new.transaction_id,
        'amount', new.amount,
        'payment_method', new.payment_method
      )
    );
  end loop;

  return new;
end;
$$;

create or replace function public.create_return_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member record;
  v_transaction_number text;
begin
  select transaction_number into v_transaction_number
  from public.transactions
  where id = new.transaction_id;

  for v_member in
    select user_id from public.store_members
    where store_id = new.store_id and is_active
  loop
    insert into public.notifications (user_id, type, title, message, data)
    values (
      v_member.user_id,
      'return',
      'Retur Produk',
      'Retur ' || new.return_number || ' untuk transaksi ' || coalesce(v_transaction_number, '-') || ' berhasil diproses',
      jsonb_build_object(
        'return_id', new.id,
        'return_number', new.return_number,
        'transaction_id', new.transaction_id,
        'total_refund', new.total_refund
      )
    );
  end loop;

  return new;
end;
$$;

create or replace function public.create_low_stock_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_minimum_stock integer;
  v_member record;
begin
  select minimum_stock into v_minimum_stock
  from public.stock_alerts
  where product_id = new.id and store_id = new.store_id and alert_enabled = true;

  if v_minimum_stock is null then
    v_minimum_stock := new.minimum_stock;
  end if;

  if v_minimum_stock is null then
    v_minimum_stock := 10;
  end if;

  if new.stock <= v_minimum_stock and (old.stock is null or old.stock > v_minimum_stock) then
    for v_member in
      select user_id from public.store_members
      where store_id = new.store_id and is_active
    loop
      insert into public.notifications (user_id, type, title, message, data)
      values (
        v_member.user_id,
        'stock_alert',
        'Stok Produk Menipis',
        'Produk "' || new.name || '" memiliki stok ' || new.stock
          || ' (minimum: ' || v_minimum_stock || ')',
        jsonb_build_object(
          'product_id', new.id,
          'product_name', new.name,
          'current_stock', new.stock,
          'minimum_stock', v_minimum_stock
        )
      );
    end loop;
  end if;

  return new;
end;
$$;

-- ============================================================================
-- record_stock_movement: catat mutasi stok + reference dari session setting.
-- Fungsi trigger -> TIDAK diberi guard permission.
-- ============================================================================
create or replace function public.record_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ref_type text := nullif(current_setting('app.stock_ref_type', true), '');
  v_ref_id   uuid := nullif(current_setting('app.stock_ref_id', true), '')::uuid;
begin
  if new.stock is distinct from old.stock then
    insert into public.stock_movements (
      store_id, product_id, movement_type, quantity,
      quantity_before, quantity_after,
      reference_type, reference_id, notes
    ) values (
      new.store_id,
      new.id,
      case when new.stock > old.stock then 'in' else 'out' end,
      abs(new.stock - old.stock),
      old.stock,
      new.stock,
      v_ref_type,
      v_ref_id,
      case when v_ref_type is null then 'Automatic stock movement' else 'Stock adjustment' end
    );
  end if;
  return new;
end;
$$;

-- ============================================================================
-- create_stock_adjustment: 3-3000 (Modal Pemilik) + tanpa movement ganda.
-- Versi live memakai 3-1000 (tidak di-seed lagi) dan meng-insert
-- stock_movements manual padahal trigger record_stock_movement sudah mencatat.
-- ============================================================================
create or replace function public.create_stock_adjustment(
  p_product_id uuid,
  p_adjustment_type text,
  p_quantity_before integer,
  p_quantity_after integer,
  p_quantity_change integer,
  p_reason text,
  p_notes text default null::text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_adjustment_id uuid;
  v_product public.products%rowtype;
  v_account_persediaan uuid;
  v_account_modal uuid;
  v_journal_id uuid;
  v_amount numeric;
begin
  if not public.has_permission('stock.write') then
    raise exception 'Akses ditolak: butuh permission stock.write' using errcode = '42501';
  end if;

  select * into v_product
  from public.products
  where id = p_product_id and store_id = public.current_store_id();

  if not found then
    raise exception 'Produk tidak ditemukan';
  end if;

  insert into public.stock_adjustments (
    store_id, product_id, adjustment_type,
    quantity_before, quantity_after, quantity_change,
    reason, notes, created_at
  ) values (
    public.current_store_id(), p_product_id, p_adjustment_type,
    p_quantity_before, p_quantity_after, p_quantity_change,
    p_reason, p_notes, now()
  )
  returning id into v_adjustment_id;

  -- stock_movements dicatat oleh trigger (jangan insert manual -> dobel).
  perform set_config('app.stock_ref_type', 'adjustment', true);
  perform set_config('app.stock_ref_id', v_adjustment_id::text, true);

  update public.products
  set stock = p_quantity_after, updated_at = now()
  where id = p_product_id and store_id = public.current_store_id();

  perform set_config('app.stock_ref_type', '', true);
  perform set_config('app.stock_ref_id', '', true);

  v_amount := abs(p_quantity_change) * coalesce(v_product.price_buy, 0);

  if v_amount > 0 then
    select id into v_account_persediaan
    from public.chart_of_accounts
    where store_id = public.current_store_id() and code = '1-1200';

    select id into v_account_modal
    from public.chart_of_accounts
    where store_id = public.current_store_id() and code = '3-3000';

    if v_account_persediaan is not null and v_account_modal is not null then
      insert into public.journal_entries
        (store_id, entry_date, description, reference_type, reference_id)
      values (
        public.current_store_id(), now(),
        'Adjustment Stok: ' || v_product.name || ' (' || p_reason || ')',
        'stock_adjustment', v_adjustment_id
      )
      returning id into v_journal_id;

      if p_quantity_change > 0 then
        insert into public.journal_lines
          (store_id, journal_id, account_id, account_code, account_name, debit, credit)
        values
          (public.current_store_id(), v_journal_id, v_account_persediaan, '1-1200', 'Persediaan Barang Dagangan', v_amount, 0),
          (public.current_store_id(), v_journal_id, v_account_modal, '3-3000', 'Modal Pemilik', 0, v_amount);
      else
        insert into public.journal_lines
          (store_id, journal_id, account_id, account_code, account_name, debit, credit)
        values
          (public.current_store_id(), v_journal_id, v_account_modal, '3-3000', 'Modal Pemilik', v_amount, 0),
          (public.current_store_id(), v_journal_id, v_account_persediaan, '1-1200', 'Persediaan Barang Dagangan', 0, v_amount);
      end if;
    end if;
  end if;

  return v_adjustment_id;
end;
$$;

comment on function public.create_stock_adjustment(uuid, text, integer, integer, integer, text, text) is
  'Adjustment stok + auto-jurnal Dr/Cr Persediaan (1-1200) vs Modal Pemilik (3-3000).';

-- ============================================================================
-- trigger_init_coa_on_first_transaction: pastikan COA ada per toko.
-- (Trigger ensure_coa_exists di baseline tetap memakai fungsi ini.)
-- ============================================================================
create or replace function public.trigger_init_coa_on_first_transaction()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.init_default_coa_for_store(new.store_id);
  return new;
end;
$$;

-- ============================================================================
-- B. KONVERSI MEKANIS: user_id -> store_id, auth.uid() -> current_store_id()
-- ============================================================================

-- >>> add_pi_payment
CREATE OR REPLACE FUNCTION public.add_pi_payment(p_pi_id uuid, p_amount numeric, p_payment_method text, p_notes text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_payment_id uuid;
  v_paid numeric;
  v_remaining numeric;
  v_total numeric;
  v_pi_number text;
  v_account_kas uuid;
  v_account_utang uuid;
  v_journal_id uuid;
BEGIN
  if not public.has_permission('purchasing.write') then
    raise exception 'Akses ditolak: butuh permission purchasing.write' using errcode = '42501';
  end if;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Jumlah pembayaran tidak valid';
  END IF;

  SELECT total, paid_amount, remaining_amount, pi_number
    INTO v_total, v_paid, v_remaining, v_pi_number
  FROM purchase_invoices
  WHERE id = p_pi_id AND store_id = public.current_store_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice tidak ditemukan';
  END IF;

  IF p_amount > v_remaining THEN
    RAISE EXCEPTION 'Pembayaran melebihi sisa tagihan (sisa %)', v_remaining;
  END IF;

  INSERT INTO pi_payments (store_id, pi_id, amount, payment_method, notes)
  VALUES (public.current_store_id(), p_pi_id, p_amount, COALESCE(p_payment_method, 'tunai'), p_notes)
  RETURNING id INTO v_payment_id;

  v_paid := v_paid + p_amount;
  v_remaining := v_remaining - p_amount;

  UPDATE purchase_invoices
  SET paid_amount = v_paid,
      remaining_amount = v_remaining,
      payment_status = CASE
        WHEN v_remaining <= 0 THEN 'lunas'
        WHEN v_paid > 0 THEN 'sebagian'
        ELSE 'belum_lunas'
      END,
      updated_at = now()
  WHERE id = p_pi_id AND store_id = public.current_store_id();

  -- AUTO-JURNAL: Utang Usaha (Debit) → Kas (Kredit)
  SELECT id INTO v_account_kas
  FROM chart_of_accounts WHERE store_id = public.current_store_id() AND code = '1-1000';
  SELECT id INTO v_account_utang
  FROM chart_of_accounts WHERE store_id = public.current_store_id() AND code = '2-2000';

  IF v_account_kas IS NOT NULL AND v_account_utang IS NOT NULL THEN
    INSERT INTO journal_entries (store_id, entry_date, description, reference_type, reference_id)
    VALUES (public.current_store_id(), now(), 'Pembayaran ' || v_pi_number, 'purchase_payment', p_pi_id)
    RETURNING id INTO v_journal_id;

    INSERT INTO journal_lines (store_id, journal_id, account_id, account_code, account_name, debit, credit)
    SELECT public.current_store_id(), v_journal_id, v_account_utang, '2-2000', 'Utang Usaha', p_amount, 0;

    INSERT INTO journal_lines (store_id, journal_id, account_id, account_code, account_name, debit, credit)
    SELECT public.current_store_id(), v_journal_id, v_account_kas, '1-1000', 'Kas', 0, p_amount;
  END IF;

  RETURN v_payment_id;
END;
$function$;

-- >>> add_transaction_payment
CREATE OR REPLACE FUNCTION public.add_transaction_payment(p_transaction_id uuid, p_amount numeric, p_payment_method text, p_notes text, p_payment_date date DEFAULT CURRENT_DATE)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_payment_id uuid;
  v_total numeric;
  v_paid numeric;
  v_remaining numeric;
BEGIN
  if not (public.has_permission('transaction.write') or public.has_permission('invoice.payment.write')) then
    raise exception 'Akses ditolak: butuh permission transaction.write atau invoice.payment.write' using errcode = '42501';
  end if;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Jumlah pembayaran tidak valid';
  END IF;

  SELECT total, paid_amount, remaining_amount
    INTO v_total, v_paid, v_remaining
  FROM transactions
  WHERE id = p_transaction_id AND store_id = public.current_store_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaksi tidak ditemukan';
  END IF;

  IF p_amount > v_remaining THEN
    RAISE EXCEPTION 'Pembayaran melebihi sisa cicilan (sisa %)', v_remaining;
  END IF;

  -- Catat pembayaran dengan tanggal kustom
  INSERT INTO transaction_payments (
    store_id, transaction_id, amount, payment_method, notes, payment_date
  ) VALUES (
    public.current_store_id(), p_transaction_id, p_amount,
    COALESCE(p_payment_method, 'tunai'), p_notes, p_payment_date
  )
  RETURNING id INTO v_payment_id;

  -- Update status transaksi
  v_paid := v_paid + p_amount;
  v_remaining := v_remaining - p_amount;

  UPDATE transactions
  SET paid_amount = v_paid,
      remaining_amount = v_remaining,
      payment_status = CASE WHEN v_remaining <= 0 THEN 'lunas' ELSE 'belum_lunas' END,
      updated_at = now()
  WHERE id = p_transaction_id;

  RETURN v_payment_id;
END;
$function$;

-- >>> allocate_payment_to_items
CREATE OR REPLACE FUNCTION public.allocate_payment_to_items(p_transaction_id uuid, p_payment_id uuid, p_payment_amount numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_item RECORD;
  v_remaining_payment numeric := p_payment_amount;
  v_item_remaining numeric;
  v_allocated numeric;
BEGIN
  if not (public.has_permission('transaction.write') or public.has_permission('invoice.payment.write')) then
    raise exception 'Akses ditolak: butuh permission transaction.write atau invoice.payment.write' using errcode = '42501';
  end if;

  -- Loop items dalam transaksi (FIFO: by created_at)
  FOR v_item IN
    SELECT 
      ti.id as item_id,
      ti.subtotal,
      COALESCE(SUM(tip.allocated_amount), 0) as already_paid
    FROM transaction_items ti
    LEFT JOIN transaction_item_payments tip ON tip.item_id = ti.id
    WHERE ti.transaction_id = p_transaction_id
      AND ti.store_id = public.current_store_id()
    GROUP BY ti.id, ti.subtotal, ti.created_at
    ORDER BY ti.created_at ASC
  LOOP
    -- Skip item yang sudah lunas
    v_item_remaining := v_item.subtotal - v_item.already_paid;
    IF v_item_remaining <= 0 THEN
      CONTINUE;
    END IF;
    
    -- Hitung alokasi untuk item ini
    v_allocated := LEAST(v_remaining_payment, v_item_remaining);
    
    -- Insert alokasi
    INSERT INTO transaction_item_payments (
      store_id, transaction_id, item_id, payment_id, allocated_amount
    ) VALUES (
      public.current_store_id(), p_transaction_id, v_item.item_id, p_payment_id, v_allocated
    );
    
    -- Kurangi sisa pembayaran
    v_remaining_payment := v_remaining_payment - v_allocated;
    
    -- Berhenti jika pembayaran habis
    EXIT WHEN v_remaining_payment <= 0;
  END LOOP;
  
  -- Validasi: pastikan semua payment teralokasi
  IF v_remaining_payment > 0.01 THEN
    RAISE WARNING 'Sisa pembayaran % tidak teralokasi untuk transaction %', 
      v_remaining_payment, p_transaction_id;
  END IF;
END;
$function$;

-- >>> auto_delete_payment_allocations
CREATE OR REPLACE FUNCTION public.auto_delete_payment_allocations()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  -- Hapus semua alokasi pembayaran ini ke items
  DELETE FROM transaction_item_payments
  WHERE payment_id = OLD.id;

  RETURN OLD;
END;
$function$;

-- >>> auto_journal_payment
CREATE OR REPLACE FUNCTION public.auto_journal_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_transaction transactions%ROWTYPE;
  v_cash_account chart_of_accounts%ROWTYPE;
  v_receivables_account chart_of_accounts%ROWTYPE;
  v_journal_id uuid;
  v_journal_number text;
BEGIN
  -- Ambil data transaksi
  SELECT * INTO v_transaction
  FROM transactions
  WHERE id = NEW.transaction_id;

  -- Skip jika transaksi tidak ditemukan
  IF v_transaction IS NULL THEN
    RETURN NEW;
  END IF;

  -- Ambil account untuk Kas atau Bank (berdasarkan payment_method)
  SELECT * INTO v_cash_account
  FROM chart_of_accounts
  WHERE code = CASE
    WHEN NEW.payment_method IN ('transfer', 'qris') THEN '1-1010'  -- Bank
    ELSE '1-1000'  -- Kas (tunai)
  END
  AND store_id = NEW.store_id
  AND is_active = true
  LIMIT 1;

  -- Ambil account untuk Piutang Usaha
  SELECT * INTO v_receivables_account
  FROM chart_of_accounts
  WHERE code = '1-1100'  -- Piutang Usaha
  AND store_id = NEW.store_id
  AND is_active = true
  LIMIT 1;

  -- Skip jika akun tidak ditemukan (user belum setup COA)
  IF v_cash_account IS NULL OR v_receivables_account IS NULL THEN
    RAISE NOTICE 'Akun Kas/Bank atau Piutang tidak ditemukan untuk user %. Auto-jurnal pembayaran tidak dibuat.', NEW.store_id;
    RETURN NEW;
  END IF;

  -- Generate journal number
  v_journal_number := 'PAY-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(NEW.id::text, 1, 8);

  -- Buat jurnal otomatis
  INSERT INTO journal_entries (
    store_id,
    journal_number,
    entry_date,
    description,
    reference_type,
    reference_id,
    status,
    created_at,
    updated_at
  ) VALUES (
    NEW.store_id,
    v_journal_number,
    COALESCE(NEW.payment_date, CURRENT_DATE),
    'Pembayaran cicilan ' || v_transaction.transaction_number ||
    CASE WHEN v_transaction.customer_name IS NOT NULL
         THEN ' - ' || v_transaction.customer_name
         ELSE ''
    END,
    'payment',
    NEW.transaction_id,
    'posted',
    NOW(),
    NOW()
  ) RETURNING id INTO v_journal_id;

  -- Jurnal lines: Debit Kas/Bank, Kredit Piutang
  INSERT INTO journal_lines (
    store_id,
    journal_id,
    account_id,
    account_code,
    account_name,
    debit,
    credit,
    created_at
  ) VALUES
    -- Debit Kas/Bank (uang masuk)
    (
      NEW.store_id,
      v_journal_id,
      v_cash_account.id,
      v_cash_account.code,
      v_cash_account.name,
      NEW.amount,
      0,
      NOW()
    ),
    -- Kredit Piutang (mengurangi piutang)
    (
      NEW.store_id,
      v_journal_id,
      v_receivables_account.id,
      v_receivables_account.code,
      v_receivables_account.name,
      0,
      NEW.amount,
      NOW()
    );

  RETURN NEW;
END;
$function$;

-- >>> auto_update_realized_profit
CREATE OR REPLACE FUNCTION public.auto_update_realized_profit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_store_id uuid;
  v_journal_id uuid;
  v_journal_number text;
  v_laba_piutang_id uuid;
  v_laba_direalisasi_id uuid;
  v_payment_profit numeric := 0;
  v_available numeric := 0;
  v_tx record;
BEGIN
  SELECT store_id, total, created_at
  INTO v_tx
  FROM transactions
  WHERE id = NEW.transaction_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_store_id := v_tx.store_id;

  IF NOT check_period_closed(v_tx.created_at::date, v_store_id) THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_laba_piutang_id
  FROM chart_of_accounts
  WHERE store_id = v_store_id AND code = '3-3100' AND is_active = true
  LIMIT 1;

  SELECT id INTO v_laba_direalisasi_id
  FROM chart_of_accounts
  WHERE store_id = v_store_id AND code = '3-3200' AND is_active = true
  LIMIT 1;

  IF v_laba_piutang_id IS NULL OR v_laba_direalisasi_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    (NEW.amount / NULLIF(v_tx.total, 0)) *
    (v_tx.total - COALESCE(SUM(ti.quantity * COALESCE(p.price_buy, 0)), 0))
  INTO v_payment_profit
  FROM transaction_items ti
  LEFT JOIN products p ON p.id = ti.product_id
  WHERE ti.transaction_id = NEW.transaction_id;

  v_payment_profit := COALESCE(v_payment_profit, 0);

  IF v_payment_profit <= 0.01 THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(jl.credit - jl.debit), 0)
  INTO v_available
  FROM journal_lines jl
  INNER JOIN journal_entries je ON je.id = jl.journal_id
  WHERE jl.store_id = v_store_id
    AND jl.account_id = v_laba_piutang_id
    AND je.status = 'posted';

  IF v_available <= 0.01 THEN
    RETURN NEW;
  END IF;

  IF v_payment_profit > v_available THEN
    v_payment_profit := v_available;
  END IF;

  v_journal_number := 'REALIZE-' || TO_CHAR(now(), 'YYYYMMDD-HH24MISS') || '-' || SUBSTRING(gen_random_uuid()::text, 1, 6);
  v_journal_id := gen_random_uuid();

  INSERT INTO journal_entries (
    id, store_id, journal_number, entry_date, description,
    reference_type, reference_id, status, created_at, updated_at
  ) VALUES (
    v_journal_id, v_store_id, v_journal_number, CURRENT_DATE,
    'Realisasi Laba: Pembayaran Piutang',
    'reclassify', NEW.id, 'posted', now(), now()
  );

  INSERT INTO journal_lines (id, store_id, journal_id, account_id, account_code, account_name, debit, credit, created_at)
  VALUES (gen_random_uuid(), v_store_id, v_journal_id, v_laba_piutang_id,
          '3-3100', 'Laba Piutang', v_payment_profit, 0, now());

  INSERT INTO journal_lines (id, store_id, journal_id, account_id, account_code, account_name, debit, credit, created_at)
  VALUES (gen_random_uuid(), v_store_id, v_journal_id, v_laba_direalisasi_id,
          '3-3200', 'Laba Direalisasi', 0, v_payment_profit, now());

  RETURN NEW;
END;
$function$;

-- >>> auto_update_transaction_on_payment_delete
CREATE OR REPLACE FUNCTION public.auto_update_transaction_on_payment_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_transaction transactions%ROWTYPE;
  v_new_paid numeric;
  v_new_remaining numeric;
  v_new_status text;
BEGIN
  -- Ambil data transaksi
  SELECT * INTO v_transaction
  FROM transactions
  WHERE id = OLD.transaction_id;

  -- Skip jika transaksi tidak ditemukan
  IF v_transaction IS NULL THEN
    RETURN OLD;
  END IF;

  -- Hitung ulang paid_amount dan remaining_amount
  v_new_paid := GREATEST(0, v_transaction.paid_amount - OLD.amount);
  v_new_remaining := v_transaction.total - v_new_paid;
  v_new_status := CASE WHEN v_new_remaining > 0 THEN 'belum_lunas' ELSE 'lunas' END;

  -- Update transaksi
  UPDATE transactions
  SET paid_amount = v_new_paid,
      remaining_amount = v_new_remaining,
      payment_status = v_new_status,
      updated_at = NOW()
  WHERE id = OLD.transaction_id;

  RETURN OLD;
END;
$function$;

-- >>> auto_void_journal_payment
CREATE OR REPLACE FUNCTION public.auto_void_journal_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_journal_id uuid;
BEGIN
  -- Cari jurnal yang reference ke payment ini
  SELECT id INTO v_journal_id
  FROM journal_entries
  WHERE reference_type = 'payment'
  AND reference_id = OLD.transaction_id
  AND store_id = OLD.store_id
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

-- >>> close_period
CREATE OR REPLACE FUNCTION public.close_period(p_period_start date, p_period_end date, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_store_id uuid := public.current_store_id();
  v_closing_id uuid := gen_random_uuid();
  v_journal_id uuid := gen_random_uuid();
  v_journal_number text;
  v_balances jsonb;

  v_laba_piutang_id uuid;
  v_laba_direalisasi_id uuid;

  v_total_pendapatan numeric := 0;
  v_total_beban numeric := 0;
  v_plug numeric := 0;
  v_realised numeric := 0;
  v_total_profit numeric := 0;
  v_ratio numeric := 0;
  v_realised_part numeric := 0;
  v_unrealised_part numeric := 0;
  v_profit record;
  v_has_lines boolean := false;
BEGIN
  if not public.has_permission('finance.write') then
    raise exception 'Akses ditolak: butuh permission finance.write' using errcode = '42501';
  end if;

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'Tidak ada sesi pengguna';
  END IF;

  IF p_period_end < p_period_start THEN
    RAISE EXCEPTION 'Tanggal akhir periode harus >= tanggal mulai.';
  END IF;

  IF EXISTS(
    SELECT 1 FROM closing_periods
    WHERE store_id = v_store_id
      AND status = 'closed'
      AND (
        (p_period_start >= period_start AND p_period_start <= period_end) OR
        (p_period_end >= period_start AND p_period_end <= period_end) OR
        (p_period_start <= period_start AND p_period_end >= period_end)
      )
  ) THEN
    RAISE EXCEPTION 'Periode ini overlap dengan periode yang sudah ditutup.';
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN coa.type = 'pendapatan' THEN jl.credit - jl.debit ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN coa.type = 'beban'      THEN jl.debit - jl.credit ELSE 0 END), 0)
  INTO v_total_pendapatan, v_total_beban
  FROM journal_lines jl
  INNER JOIN journal_entries je ON je.id = jl.journal_id
  INNER JOIN chart_of_accounts coa ON coa.id = jl.account_id
  WHERE je.store_id = v_store_id
    AND je.status = 'posted'
    AND COALESCE(je.reference_type, '') <> 'closing'
    AND je.entry_date::date >= p_period_start
    AND je.entry_date::date <= p_period_end
    AND coa.type IN ('pendapatan', 'beban');

  SELECT id INTO v_laba_piutang_id
  FROM chart_of_accounts
  WHERE store_id = v_store_id AND code = '3-3100' AND is_active = true
  LIMIT 1;

  SELECT id INTO v_laba_direalisasi_id
  FROM chart_of_accounts
  WHERE store_id = v_store_id AND code = '3-3200' AND is_active = true
  LIMIT 1;

  IF v_laba_piutang_id IS NULL OR v_laba_direalisasi_id IS NULL THEN
    RAISE EXCEPTION 'Akun Laba Piutang/Direalisasi tidak ditemukan. Seed COA terlebih dahulu.';
  END IF;

  IF ABS(v_total_pendapatan) > 0.01 OR ABS(v_total_beban) > 0.01 THEN
    v_journal_number := 'CLOSING-' || TO_CHAR(p_period_end, 'YYYYMMDD') || '-' || SUBSTRING(gen_random_uuid()::text, 1, 8);

    INSERT INTO journal_entries (
      id, store_id, journal_number, entry_date, description,
      reference_type, reference_id, status, created_at, updated_at
    ) VALUES (
      v_journal_id, v_store_id, v_journal_number, p_period_end,
      'Jurnal Penutup Periode ' || p_period_start || ' s/d ' || p_period_end,
      'closing', v_closing_id, 'posted', now(), now()
    );

    INSERT INTO journal_lines (id, store_id, journal_id, account_id, account_code, account_name, debit, credit, created_at)
    SELECT gen_random_uuid(), v_store_id, v_journal_id, coa.id, coa.code, coa.name,
           COALESCE(SUM(jl.credit - jl.debit), 0), 0, now()
    FROM chart_of_accounts coa
    LEFT JOIN journal_lines jl ON jl.account_id = coa.id
    LEFT JOIN journal_entries je ON je.id = jl.journal_id
    WHERE coa.store_id = v_store_id
      AND coa.type = 'pendapatan'
      AND coa.is_active = true
      AND je.status = 'posted'
      AND COALESCE(je.reference_type, '') <> 'closing'
      AND je.entry_date::date >= p_period_start
      AND je.entry_date::date <= p_period_end
    GROUP BY coa.id, coa.code, coa.name
    HAVING SUM(jl.credit - jl.debit) > 0;

    INSERT INTO journal_lines (id, store_id, journal_id, account_id, account_code, account_name, debit, credit, created_at)
    SELECT gen_random_uuid(), v_store_id, v_journal_id, coa.id, coa.code, coa.name,
           0, COALESCE(SUM(jl.debit - jl.credit), 0), now()
    FROM chart_of_accounts coa
    LEFT JOIN journal_lines jl ON jl.account_id = coa.id
    LEFT JOIN journal_entries je ON je.id = jl.journal_id
    WHERE coa.store_id = v_store_id
      AND coa.type = 'beban'
      AND coa.is_active = true
      AND je.status = 'posted'
      AND COALESCE(je.reference_type, '') <> 'closing'
      AND je.entry_date::date >= p_period_start
      AND je.entry_date::date <= p_period_end
    GROUP BY coa.id, coa.code, coa.name
    HAVING SUM(jl.debit - jl.credit) > 0;

    SELECT EXISTS (SELECT 1 FROM journal_lines WHERE journal_id = v_journal_id)
    INTO v_has_lines;

    SELECT COALESCE(SUM(debit) - SUM(credit), 0)
    INTO v_plug
    FROM journal_lines
    WHERE journal_id = v_journal_id;

    IF v_has_lines AND ABS(v_plug) > 0.01 THEN
      SELECT * INTO v_profit
      FROM get_profit_summary(v_store_id, p_period_start, p_period_end);

      v_realised := COALESCE(v_profit.realized_profit, 0);
      v_total_profit := COALESCE(v_profit.total_profit, 0);

      IF v_total_profit > 0.01 THEN
        v_ratio := v_realised / v_total_profit;
        IF v_ratio < 0 THEN v_ratio := 0; END IF;
        IF v_ratio > 1 THEN v_ratio := 1; END IF;
      ELSE
        v_ratio := 0;
      END IF;

      v_realised_part := ROUND(v_plug * v_ratio, 2);
      v_unrealised_part := v_plug - v_realised_part;

      IF v_plug >= 0 THEN
        IF ABS(v_realised_part) > 0.01 THEN
          INSERT INTO journal_lines (id, store_id, journal_id, account_id, account_code, account_name, debit, credit, created_at)
          VALUES (gen_random_uuid(), v_store_id, v_journal_id, v_laba_direalisasi_id,
                  '3-3200', 'Laba Direalisasi', 0, v_realised_part, now());
        END IF;
        IF ABS(v_unrealised_part) > 0.01 THEN
          INSERT INTO journal_lines (id, store_id, journal_id, account_id, account_code, account_name, debit, credit, created_at)
          VALUES (gen_random_uuid(), v_store_id, v_journal_id, v_laba_piutang_id,
                  '3-3100', 'Laba Piutang', 0, v_unrealised_part, now());
        END IF;
      ELSE
        INSERT INTO journal_lines (id, store_id, journal_id, account_id, account_code, account_name, debit, credit, created_at)
        VALUES (gen_random_uuid(), v_store_id, v_journal_id, v_laba_piutang_id,
                '3-3100', 'Laba Piutang', ABS(v_plug), 0, now());
      END IF;
    END IF;

    IF (
      SELECT ABS(COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0))
      FROM journal_lines jl WHERE jl.journal_id = v_journal_id
    ) > 0.01 THEN
      RAISE EXCEPTION 'Jurnal penutup tidak balance — proses dibatalkan.';
    END IF;

    IF NOT v_has_lines THEN
      DELETE FROM journal_entries WHERE id = v_journal_id;
    END IF;
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'account_id', account_id,
      'account_code', account_code,
      'account_name', account_name,
      'account_type', account_type,
      'normal_balance', normal_balance,
      'balance', balance
    )
  )
  INTO v_balances
  FROM (
    SELECT
      coa.id as account_id,
      coa.code as account_code,
      coa.name as account_name,
      coa.type as account_type,
      coa.normal_balance as normal_balance,
      COALESCE(SUM(
        CASE
          WHEN coa.normal_balance = 'debit' THEN jl.debit - jl.credit
          ELSE jl.credit - jl.debit
        END
      ), 0) as balance
    FROM chart_of_accounts coa
    LEFT JOIN journal_lines jl ON jl.account_id = coa.id
    LEFT JOIN journal_entries je ON je.id = jl.journal_id
    WHERE coa.store_id = v_store_id
      AND coa.is_active = true
      AND (je.id IS NULL OR (
        je.status = 'posted'
        AND je.entry_date::date <= p_period_end
      ))
    GROUP BY coa.id, coa.code, coa.name, coa.type, coa.normal_balance
  ) balances;

  DELETE FROM closing_periods
  WHERE store_id = v_store_id
    AND period_start = p_period_start
    AND period_end = p_period_end
    AND status = 'reopened';

  INSERT INTO closing_periods (
    id, store_id, period_start, period_end, closed_by, notes, snapshot_balances, status
  ) VALUES (
    v_closing_id, v_store_id, p_period_start, p_period_end, auth.uid(), p_notes, v_balances, 'closed'
  );

  RETURN v_closing_id;
END;
$function$;

-- >>> create_goods_receipt
CREATE OR REPLACE FUNCTION public.create_goods_receipt(p_po_id uuid, p_supplier_id uuid, p_supplier_name text, p_receipt_date timestamp with time zone, p_notes text, p_items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_grn_id uuid;
  v_item jsonb;
  v_subtotal numeric := 0;
  v_grn_subtotal numeric := 0;
  v_po_item po_items%ROWTYPE;
  v_qty_received numeric;
  v_qty_rejected numeric;
  v_total_received numeric;
  v_total_ordered numeric;
  v_account_persediaan uuid;
  v_account_utang uuid;
  v_journal_id uuid;
BEGIN
  if not public.has_permission('purchasing.write') then
    raise exception 'Akses ditolak: butuh permission purchasing.write' using errcode = '42501';
  end if;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'GRN harus memiliki minimal 1 item';
  END IF;

  v_grn_id := gen_random_uuid();
  p_receipt_date := COALESCE(p_receipt_date, now());

  INSERT INTO goods_receipts (id, store_id, grn_number, po_id, supplier_id, supplier_name,
                               receipt_date, notes, status)
  VALUES (v_grn_id, public.current_store_id(),
          'GRN-' || to_char(p_receipt_date, 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 6)),
          p_po_id, p_supplier_id, p_supplier_name, p_receipt_date, p_notes, 'completed');

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty_received := COALESCE((v_item->>'quantity_received')::numeric, 0);
    v_qty_rejected := COALESCE((v_item->>'quantity_rejected')::numeric, 0);
    v_subtotal := (v_qty_received + v_qty_rejected) * COALESCE((v_item->>'price')::numeric, 0);
    v_grn_subtotal := v_grn_subtotal + v_subtotal;

    INSERT INTO grn_items (store_id, grn_id, po_item_id, product_id, product_name,
                           quantity_received, quantity_rejected, price, subtotal)
    VALUES (public.current_store_id(), v_grn_id,
            (v_item->>'po_item_id')::uuid,
            (v_item->>'product_id')::uuid,
            (v_item->>'product_name')::text,
            v_qty_received, v_qty_rejected,
            COALESCE((v_item->>'price')::numeric, 0),
            v_subtotal);

    IF v_qty_received > 0 THEN
      UPDATE products
      SET stock = stock + v_qty_received,
          updated_at = now()
      WHERE id = (v_item->>'product_id')::uuid AND store_id = public.current_store_id();
    END IF;

    IF (v_item->>'po_item_id') IS NOT NULL THEN
      SELECT * INTO v_po_item FROM po_items WHERE id = (v_item->>'po_item_id')::uuid;
      IF FOUND THEN
        v_total_received := COALESCE(v_po_item.received_quantity, 0) + v_qty_received + v_qty_rejected;
        UPDATE po_items
        SET received_quantity = v_total_received
        WHERE id = v_po_item.id;
      END IF;
    END IF;
  END LOOP;

  UPDATE goods_receipts SET total = v_grn_subtotal WHERE id = v_grn_id;

  IF p_po_id IS NOT NULL THEN
    SELECT COALESCE(SUM(quantity), 0), COALESCE(SUM(received_quantity), 0)
      INTO v_total_ordered, v_total_received
    FROM po_items WHERE po_id = p_po_id;

    IF v_total_received >= v_total_ordered THEN
      UPDATE purchase_orders SET status = 'completed', updated_at = now() WHERE id = p_po_id;
    ELSE
      UPDATE purchase_orders SET status = 'partial', updated_at = now() WHERE id = p_po_id;
    END IF;
  END IF;

  -- AUTO-JURNAL: Persediaan (Debit) → Utang Usaha (Kredit)
  SELECT id INTO v_account_persediaan
  FROM chart_of_accounts WHERE store_id = public.current_store_id() AND code = '1-1200';
  SELECT id INTO v_account_utang
  FROM chart_of_accounts WHERE store_id = public.current_store_id() AND code = '2-2000';

  IF v_account_persediaan IS NOT NULL AND v_account_utang IS NOT NULL THEN
    INSERT INTO journal_entries (store_id, entry_date, description, reference_type, reference_id)
    VALUES (public.current_store_id(), p_receipt_date, 'Penerimaan barang ' || COALESCE(p_supplier_name, ''),
            'purchase', v_grn_id)
    RETURNING id INTO v_journal_id;

    INSERT INTO journal_lines (store_id, journal_id, account_id, account_code, account_name, debit, credit)
    SELECT public.current_store_id(), v_journal_id, v_account_persediaan, '1-1200', 'Persediaan Barang', v_grn_subtotal, 0;

    INSERT INTO journal_lines (store_id, journal_id, account_id, account_code, account_name, debit, credit)
    SELECT public.current_store_id(), v_journal_id, v_account_utang, '2-2000', 'Utang Usaha', 0, v_grn_subtotal;
  END IF;

  RETURN v_grn_id;
END;
$function$;

-- >>> create_purchase_invoice
CREATE OR REPLACE FUNCTION public.create_purchase_invoice(p_grn_id uuid, p_supplier_id uuid, p_supplier_name text, p_invoice_date timestamp with time zone, p_due_date timestamp with time zone, p_discount numeric, p_tax numeric, p_shipping_cost numeric, p_notes text, p_items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_pi_id uuid;
  v_item jsonb;
  v_subtotal numeric := 0;
  v_total numeric;
  v_po_id uuid;
BEGIN
  if not public.has_permission('purchasing.write') then
    raise exception 'Akses ditolak: butuh permission purchasing.write' using errcode = '42501';
  end if;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'PI harus memiliki minimal 1 item';
  END IF;

  v_pi_id := gen_random_uuid();
  p_invoice_date := COALESCE(p_invoice_date, now());

  SELECT po_id INTO v_po_id FROM goods_receipts WHERE id = p_grn_id;

  INSERT INTO purchase_invoices (id, store_id, pi_number, grn_id, po_id, supplier_id, supplier_name,
                                  invoice_date, due_date, discount, tax, shipping_cost, notes)
  VALUES (v_pi_id, public.current_store_id(),
          'PI-' || to_char(p_invoice_date, 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 6)),
          p_grn_id, v_po_id, p_supplier_id, p_supplier_name,
          p_invoice_date, p_due_date,
          COALESCE(p_discount, 0), COALESCE(p_tax, 0), COALESCE(p_shipping_cost, 0),
          p_notes);

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO pi_items (store_id, pi_id, grn_item_id, product_id, product_name, quantity, price, subtotal)
    VALUES (public.current_store_id(), v_pi_id,
            (v_item->>'grn_item_id')::uuid,
            (v_item->>'product_id')::uuid,
            (v_item->>'product_name')::text,
            COALESCE((v_item->>'quantity')::numeric, 0),
            COALESCE((v_item->>'price')::numeric, 0),
            COALESCE((v_item->>'quantity')::numeric, 0) * COALESCE((v_item->>'price')::numeric, 0));
  END LOOP;

  SELECT COALESCE(SUM(subtotal), 0) INTO v_subtotal FROM pi_items WHERE pi_id = v_pi_id;
  v_total := v_subtotal - COALESCE(p_discount, 0) + COALESCE(p_tax, 0) + COALESCE(p_shipping_cost, 0);

  UPDATE purchase_invoices
  SET subtotal = v_subtotal, total = v_total,
      remaining_amount = v_total
  WHERE id = v_pi_id;

  RETURN v_pi_id;
END;
$function$;

-- >>> create_purchase_order
CREATE OR REPLACE FUNCTION public.create_purchase_order(p_supplier_id uuid, p_supplier_name text, p_po_date timestamp with time zone, p_expected_date timestamp with time zone, p_notes text, p_items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_po_id uuid;
  v_item jsonb;
  v_product products%ROWTYPE;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_subtotal_item numeric;
  v_total numeric;
  v_po_date timestamptz;
BEGIN
  if not public.has_permission('purchasing.write') then
    raise exception 'Akses ditolak: butuh permission purchasing.write' using errcode = '42501';
  end if;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'PO harus memiliki minimal 1 item';
  END IF;

  v_po_id := gen_random_uuid();
  v_po_date := COALESCE(p_po_date, now());

  INSERT INTO purchase_orders (id, store_id, po_number, supplier_id, supplier_name,
                                po_date, expected_date, notes, status)
  VALUES (v_po_id, public.current_store_id(),
          'PO-' || to_char(v_po_date, 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 6)),
          p_supplier_id, p_supplier_name, v_po_date, p_expected_date, p_notes, 'draft');

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_product
    FROM products
    WHERE id = (v_item->>'product_id')::uuid AND store_id = public.current_store_id();

    v_subtotal_item := COALESCE((v_item->>'quantity')::numeric, 0) * COALESCE((v_item->>'price')::numeric, 0);
    v_discount := COALESCE((v_item->>'discount')::numeric, 0);
    v_subtotal := v_subtotal + v_subtotal_item;

    INSERT INTO po_items (store_id, po_id, product_id, product_name,
                          quantity, price, discount, subtotal)
    VALUES (public.current_store_id(), v_po_id, (v_item->>'product_id')::uuid,
            COALESCE(v_product.name, (v_item->>'product_name')::text),
            COALESCE((v_item->>'quantity')::numeric, 0),
            COALESCE((v_item->>'price')::numeric, 0),
            v_discount,
            v_subtotal_item - v_discount);
  END LOOP;

  v_total := v_subtotal;
  UPDATE purchase_orders
  SET subtotal = v_subtotal, total = v_total
  WHERE id = v_po_id;

  RETURN v_po_id;
END;
$function$;

-- >>> create_purchase_return
CREATE OR REPLACE FUNCTION public.create_purchase_return(p_grn_id uuid, p_pi_id uuid, p_supplier_id uuid, p_supplier_name text, p_return_date timestamp with time zone, p_reason text, p_notes text, p_items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_pr_id uuid;
  v_item jsonb;
  v_total_refund numeric := 0;
  v_prod_id uuid;
  v_qty numeric;
  v_price numeric;
  v_price_buy numeric;
  v_account_persediaan uuid;
  v_account_utang uuid;
  v_journal_id uuid;
BEGIN
  if not public.has_permission('purchasing.write') then
    raise exception 'Akses ditolak: butuh permission purchasing.write' using errcode = '42501';
  end if;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Retur harus memiliki minimal 1 item';
  END IF;

  v_pr_id := gen_random_uuid();
  p_return_date := COALESCE(p_return_date, now());

  INSERT INTO purchase_returns (id, store_id, pr_number, grn_id, pi_id, supplier_id, supplier_name,
                                return_date, reason, notes, status)
  VALUES (v_pr_id, public.current_store_id(),
          'PR-' || to_char(p_return_date, 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 6)),
          p_grn_id, p_pi_id, p_supplier_id, p_supplier_name,
          p_return_date, p_reason, p_notes, 'completed');

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_prod_id := (v_item->>'product_id')::uuid;
    v_qty := COALESCE((v_item->>'quantity')::numeric, 0);
    v_price := COALESCE((v_item->>'price')::numeric, 0);
    v_price_buy := COALESCE((v_item->>'price_buy')::numeric, 0);
    v_total_refund := v_total_refund + (v_qty * v_price);

    INSERT INTO purchase_return_items (store_id, pr_id, product_id, product_name,
                                        quantity, price, price_buy, subtotal)
    VALUES (public.current_store_id(), v_pr_id, v_prod_id,
            COALESCE((SELECT name FROM products WHERE id = v_prod_id), (v_item->>'product_name')::text),
            v_qty, v_price, v_price_buy, v_qty * v_price);

    UPDATE products
    SET stock = GREATEST(stock - v_qty, 0), updated_at = now()
    WHERE id = v_prod_id AND store_id = public.current_store_id();
  END LOOP;

  UPDATE purchase_returns SET total_refund = v_total_refund WHERE id = v_pr_id;

  -- AUTO-JURNAL: Utang Usaha (Debit) → Persediaan (Kredit)
  SELECT id INTO v_account_persediaan
  FROM chart_of_accounts WHERE store_id = public.current_store_id() AND code = '1-1200';
  SELECT id INTO v_account_utang
  FROM chart_of_accounts WHERE store_id = public.current_store_id() AND code = '2-2000';

  IF v_account_persediaan IS NOT NULL AND v_account_utang IS NOT NULL THEN
    INSERT INTO journal_entries (store_id, entry_date, description, reference_type, reference_id)
    VALUES (public.current_store_id(), p_return_date, 'Retur pembelian ke ' || COALESCE(p_supplier_name, ''),
            'purchase_return', v_pr_id)
    RETURNING id INTO v_journal_id;

    INSERT INTO journal_lines (store_id, journal_id, account_id, account_code, account_name, debit, credit)
    SELECT public.current_store_id(), v_journal_id, v_account_utang, '2-2000', 'Utang Usaha', v_total_refund, 0;

    INSERT INTO journal_lines (store_id, journal_id, account_id, account_code, account_name, debit, credit)
    SELECT public.current_store_id(), v_journal_id, v_account_persediaan, '1-1200', 'Persediaan Barang', 0, v_total_refund;
  END IF;

  RETURN v_pr_id;
END;
$function$;

-- >>> create_return
CREATE OR REPLACE FUNCTION public.create_return(p_transaction_id uuid, p_items jsonb, p_notes text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_return_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_qty integer;
  v_product_name text;
  v_price numeric;
  v_price_buy numeric;
  v_subtotal numeric;
  v_total_refund numeric := 0;
  v_bought integer;
  v_returned integer;
  v_status text;
  v_transaction_number text;
  v_paid_amount numeric;
  v_remaining_amount numeric;
  v_account_kas uuid;
  v_account_piutang uuid;
  v_account_pendapatan uuid;
  v_account_hpp uuid;
  v_account_persediaan uuid;
  v_journal_id uuid;
  v_total_cogs_returned numeric := 0;
  v_cogs numeric;
BEGIN
  if not public.has_permission('transaction.write') then
    raise exception 'Akses ditolak: butuh permission transaction.write' using errcode = '42501';
  end if;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Tidak ada item yang diretur';
  END IF;

  SELECT status, transaction_number, paid_amount, remaining_amount
    INTO v_status, v_transaction_number, v_paid_amount, v_remaining_amount
  FROM transactions
  WHERE id = p_transaction_id AND store_id = public.current_store_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaksi tidak ditemukan';
  END IF;

  IF v_status = 'batal' THEN
    RAISE EXCEPTION 'Transaksi batal tidak dapat diretur';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::int;

    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Jumlah retur harus lebih dari 0';
    END IF;

    SELECT quantity INTO v_bought
    FROM transaction_items
    WHERE transaction_id = p_transaction_id AND product_id = v_product_id AND store_id = public.current_store_id();

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produk tidak ada di transaksi ini';
    END IF;

    SELECT COALESCE(SUM(ri.quantity), 0) INTO v_returned
    FROM return_items ri
    JOIN returns r ON r.id = ri.return_id
    WHERE r.transaction_id = p_transaction_id AND ri.product_id = v_product_id AND r.store_id = public.current_store_id();

    IF v_qty > v_bought - v_returned THEN
      RAISE EXCEPTION 'Jumlah retur melebihi sisa produk (maks %)', v_bought - v_returned;
    END IF;
  END LOOP;

  INSERT INTO returns (store_id, transaction_id, notes, total_refund)
  VALUES (public.current_store_id(), p_transaction_id, p_notes, 0)
  RETURNING id INTO v_return_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::int;

    SELECT product_name, price INTO v_product_name, v_price
    FROM transaction_items
    WHERE transaction_id = p_transaction_id AND product_id = v_product_id;

    SELECT price_buy INTO v_price_buy
    FROM products
    WHERE id = v_product_id AND store_id = public.current_store_id();

    v_subtotal := v_price * v_qty;
    v_total_refund := v_total_refund + v_subtotal;

    v_cogs := COALESCE(v_price_buy, 0) * v_qty;
    v_total_cogs_returned := v_total_cogs_returned + v_cogs;

    INSERT INTO return_items (store_id, return_id, product_id, product_name, price, price_buy, quantity, subtotal)
    VALUES (public.current_store_id(), v_return_id, v_product_id, v_product_name, v_price, COALESCE(v_price_buy, 0), v_qty, v_subtotal);

    UPDATE products SET stock = stock + v_qty, updated_at = now()
    WHERE id = v_product_id AND store_id = public.current_store_id();
  END LOOP;

  UPDATE returns SET total_refund = v_total_refund WHERE id = v_return_id;

  UPDATE transactions
  SET subtotal = GREATEST(subtotal - v_total_refund, 0),
      total = GREATEST(total - v_total_refund, 0),
      remaining_amount = GREATEST(GREATEST(total - v_total_refund, 0) - paid_amount, 0),
      payment_status = CASE WHEN paid_amount >= GREATEST(total - v_total_refund, 0)
                            THEN 'lunas' ELSE 'belum_lunas' END,
      updated_at = now()
  WHERE id = p_transaction_id AND store_id = public.current_store_id();

  SELECT id INTO v_account_kas FROM chart_of_accounts WHERE store_id = public.current_store_id() AND code = '1-1000';
  SELECT id INTO v_account_piutang FROM chart_of_accounts WHERE store_id = public.current_store_id() AND code = '1-1100';
  SELECT id INTO v_account_pendapatan FROM chart_of_accounts WHERE store_id = public.current_store_id() AND code = '4-4000';
  SELECT id INTO v_account_hpp FROM chart_of_accounts WHERE store_id = public.current_store_id() AND code = '5-5000';
  SELECT id INTO v_account_persediaan FROM chart_of_accounts WHERE store_id = public.current_store_id() AND code = '1-1200';

  IF v_account_pendapatan IS NOT NULL THEN
    INSERT INTO journal_entries (store_id, entry_date, description, reference_type, reference_id)
    VALUES (public.current_store_id(), now(), 'Retur ' || v_transaction_number, 'return', v_return_id)
    RETURNING id INTO v_journal_id;

    INSERT INTO journal_lines (store_id, journal_id, account_id, account_code, account_name, debit, credit)
    SELECT public.current_store_id(), v_journal_id, v_account_pendapatan, '4-4000', 'Pendapatan Penjualan', v_total_refund, 0;

    IF v_paid_amount > 0 AND v_account_kas IS NOT NULL THEN
      INSERT INTO journal_lines (store_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT public.current_store_id(), v_journal_id, v_account_kas, '1-1000', 'Kas', 0, LEAST(v_total_refund, v_paid_amount);
    END IF;

    IF v_remaining_amount > 0 AND v_account_piutang IS NOT NULL THEN
      INSERT INTO journal_lines (store_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT public.current_store_id(), v_journal_id, v_account_piutang, '1-1100', 'Piutang Usaha', 0, LEAST(v_total_refund, v_remaining_amount);
    END IF;

    IF v_total_cogs_returned > 0 AND v_account_hpp IS NOT NULL AND v_account_persediaan IS NOT NULL THEN
      INSERT INTO journal_lines (store_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT public.current_store_id(), v_journal_id, v_account_persediaan, '1-1200', 'Persediaan Barang', v_total_cogs_returned, 0;
      INSERT INTO journal_lines (store_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT public.current_store_id(), v_journal_id, v_account_hpp, '5-5000', 'Harga Pokok Penjualan (HPP)', 0, v_total_cogs_returned;
    END IF;
  END IF;

  RETURN v_return_id;
END;
$function$;

-- >>> create_stock_opname
CREATE OR REPLACE FUNCTION public.create_stock_opname(p_opname_number text, p_opname_date date, p_notes text DEFAULT NULL::text, p_items jsonb DEFAULT '[]'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_opname_id uuid;
  v_opname_number text;
  v_item jsonb;
  v_product_id uuid;
  v_system_quantity integer;
  v_actual_quantity integer;
  v_difference integer;
  v_item_notes text;
  v_product products%ROWTYPE;
BEGIN
  if not public.has_permission('stock.write') then
    raise exception 'Akses ditolak: butuh permission stock.write' using errcode = '42501';
  end if;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Tidak ada item untuk opname';
  END IF;

  -- Nomor opname: pakai yang dikirim, atau generate bila kosong
  v_opname_number := COALESCE(NULLIF(p_opname_number, ''), 'OPN-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 6)));

  -- Validasi semua item dulu sebelum menulis apa pun
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_actual_quantity := (v_item->>'actual_quantity')::int;

    SELECT * INTO v_product
    FROM products
    WHERE id = v_product_id AND store_id = public.current_store_id();

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produk tidak ditemukan';
    END IF;

    IF v_actual_quantity < 0 THEN
      RAISE EXCEPTION 'Jumlah fisik tidak boleh negatif';
    END IF;
  END LOOP;

  -- Simpan header opname (status = 'completed')
  INSERT INTO stock_opnames (
    store_id, opname_number, opname_date, status, notes,
    completed_at, created_by
  ) VALUES (
    public.current_store_id(), v_opname_number, p_opname_date, 'completed', p_notes,
    now(), auth.uid()
  )
  RETURNING id INTO v_opname_id;

  -- Simpan items + update stok (trigger mencatat stock_movement)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_system_quantity := (v_item->>'system_quantity')::int;
    v_actual_quantity := (v_item->>'actual_quantity')::int;
    v_difference := (v_item->>'difference')::int;
    v_item_notes := v_item->>'notes';

    INSERT INTO stock_opname_items (
      store_id, opname_id, product_id, system_quantity,
      actual_quantity, difference, notes
    ) VALUES (
      public.current_store_id(), v_opname_id, v_product_id, v_system_quantity,
      v_actual_quantity, v_difference, NULLIF(v_item_notes, '')
    );

    IF v_difference <> 0 THEN
      UPDATE products
      SET stock = v_actual_quantity,
          updated_at = now()
      WHERE id = v_product_id AND store_id = public.current_store_id();
    END IF;
  END LOOP;

  RETURN v_opname_id;
END;
$function$;

-- >>> create_transaction
CREATE OR REPLACE FUNCTION public.create_transaction(p_customer_id uuid, p_customer_name text, p_payment_method text, p_paid_amount numeric, p_discount numeric, p_notes text, p_items jsonb, p_return_amount numeric DEFAULT 0, p_transaction_date timestamp with time zone DEFAULT now())
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_transaction_id uuid;
  v_payment_id uuid;
  v_total numeric := 0;
  v_total_cogs numeric := 0;
  v_paid numeric;
  v_remaining numeric;
  v_payment_status text;
  v_item jsonb;
  v_product products%ROWTYPE;
  v_price numeric;
  v_subtotal numeric;
  v_quantity integer;
  v_cogs numeric;
  -- Penegakan limit kredit
  v_credit_limit numeric;
  v_current_debt numeric;
  -- Akun untuk auto-jurnal
  v_account_kas uuid;
  v_account_piutang uuid;
  v_account_pendapatan uuid;
  v_account_hpp uuid;
  v_account_persediaan uuid;
  v_journal_id uuid;
BEGIN
  if not public.has_permission('transaction.write') then
    raise exception 'Akses ditolak: butuh permission transaction.write' using errcode = '42501';
  end if;

  -- Validasi & hitung total dari tiap item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_product
    FROM products
    WHERE id = (v_item->>'product_id')::uuid
      AND store_id = public.current_store_id();

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produk tidak ditemukan';
    END IF;

    v_quantity := (v_item->>'quantity')::integer;
    IF v_quantity <= 0 THEN
      RAISE EXCEPTION 'Jumlah tidak valid';
    END IF;

    IF v_product.stock < v_quantity THEN
      RAISE EXCEPTION 'Stok % tidak mencukupi (sisa %)', v_product.name, v_product.stock;
    END IF;

    v_price := COALESCE(NULLIF((v_item->>'price')::numeric, 0), v_product.price_sell);
    v_subtotal := v_price * v_quantity;
    v_total := v_total + v_subtotal;

    -- Hitung HPP (Harga Pokok Penjualan)
    v_cogs := COALESCE(v_product.price_buy, 0) * v_quantity;
    v_total_cogs := v_total_cogs + v_cogs;
  END LOOP;

  -- Hitung total setelah diskon dan retur
  v_total := GREATEST(v_total - COALESCE(p_discount, 0) - COALESCE(p_return_amount, 0), 0);
  v_paid := COALESCE(p_paid_amount, 0);
  v_remaining := GREATEST(v_total - v_paid, 0);
  v_payment_status := CASE WHEN v_paid >= v_total THEN 'lunas' ELSE 'belum_lunas' END;

  -- ============================================================
  -- PENEGAKAN LIMIT KREDIT (hard stop)
  -- ============================================================
  IF p_customer_id IS NOT NULL AND v_remaining > 0 THEN
    SELECT credit_limit INTO v_credit_limit
    FROM customers
    WHERE id = p_customer_id AND store_id = public.current_store_id();

    -- 0 / tidak ada → pakai default global
    IF COALESCE(v_credit_limit, 0) = 0 THEN
      SELECT default_credit_limit INTO v_credit_limit
      FROM public.stores
      WHERE id = public.current_store_id()
      LIMIT 1;
    END IF;

    -- 0 lagi → unlimited, tidak ada batasan
    IF COALESCE(v_credit_limit, 0) > 0 THEN
      SELECT COALESCE(SUM(remaining_amount), 0) INTO v_current_debt
      FROM transactions
      WHERE customer_id = p_customer_id
        AND store_id = public.current_store_id()
        AND remaining_amount > 0
        AND status <> 'batal';

      IF v_current_debt + v_remaining > v_credit_limit THEN
        RAISE EXCEPTION
          'Limit kredit terlampaui. Limit: Rp %, Hutang saat ini: Rp %, Sisa transaksi ini: Rp %',
          replace(to_char(v_credit_limit, 'FM999G999G999G999'), ',', '.'),
          replace(to_char(v_current_debt, 'FM999G999G999G999'), ',', '.'),
          replace(to_char(v_remaining, 'FM999G999G999G999'), ',', '.');
      END IF;
    END IF;
  END IF;

  -- Simpan header transaksi dengan custom date
  INSERT INTO transactions (
    store_id, customer_id, customer_name, subtotal, discount, total,
    payment_method, paid_amount, change_amount, remaining_amount, payment_status, notes,
    created_at, updated_at
  ) VALUES (
    public.current_store_id(), p_customer_id, p_customer_name,
    v_total + COALESCE(p_discount, 0) + COALESCE(p_return_amount, 0),
    COALESCE(p_discount, 0) + COALESCE(p_return_amount, 0), v_total,
    COALESCE(p_payment_method, 'tunai'), v_paid,
    GREATEST(v_paid - v_total, 0),
    v_remaining, v_payment_status,
    p_notes,
    p_transaction_date, p_transaction_date
  )
  RETURNING id INTO v_transaction_id;

  -- Simpan rincian item + kurangi stok
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_product
    FROM products
    WHERE id = (v_item->>'product_id')::uuid
      AND store_id = public.current_store_id();

    v_quantity := (v_item->>'quantity')::integer;
    v_price := COALESCE(NULLIF((v_item->>'price')::numeric, 0), v_product.price_sell);
    v_subtotal := v_price * v_quantity;

    INSERT INTO transaction_items (
      store_id, transaction_id, product_id, product_name, price, quantity, subtotal,
      created_at
    ) VALUES (
      public.current_store_id(), v_transaction_id, v_product.id, v_product.name,
      v_price, v_quantity, v_subtotal,
      p_transaction_date
    );

    UPDATE products
    SET stock = stock - v_quantity,
        updated_at = now()
    WHERE id = v_product.id AND store_id = public.current_store_id();
  END LOOP;

  -- Catat pembayaran awal ke riwayat pembayaran (jika ada bayaran)
  IF v_paid > 0 THEN
    INSERT INTO transaction_payments (
      store_id, transaction_id, amount, payment_method, notes,
      payment_date, created_at
    ) VALUES (
      public.current_store_id(), v_transaction_id, v_paid,
      COALESCE(p_payment_method, 'tunai'), NULL,
      DATE(p_transaction_date), p_transaction_date
    )
    RETURNING id INTO v_payment_id;

    -- ✅ AUTO-ALLOCATE: Alokasikan pembayaran ke items (FIFO)
    PERFORM allocate_payment_to_items(v_transaction_id, v_payment_id, v_paid);
  END IF;

  -- ============================================================
  -- AUTO-JURNAL
  -- ============================================================
  SELECT id INTO v_account_kas FROM chart_of_accounts WHERE store_id = public.current_store_id() AND code = '1-1000';
  SELECT id INTO v_account_piutang FROM chart_of_accounts WHERE store_id = public.current_store_id() AND code = '1-1100';
  SELECT id INTO v_account_pendapatan FROM chart_of_accounts WHERE store_id = public.current_store_id() AND code = '4-4000';
  SELECT id INTO v_account_hpp FROM chart_of_accounts WHERE store_id = public.current_store_id() AND code = '5-5000';
  SELECT id INTO v_account_persediaan FROM chart_of_accounts WHERE store_id = public.current_store_id() AND code = '1-1200';

  IF v_account_kas IS NOT NULL AND v_account_pendapatan IS NOT NULL THEN
    INSERT INTO journal_entries (store_id, entry_date, description, reference_type, reference_id)
    VALUES (public.current_store_id(), p_transaction_date, 'Penjualan ' || COALESCE(p_customer_name, 'eceran'), 'transaction', v_transaction_id)
    RETURNING id INTO v_journal_id;

    IF v_paid > 0 THEN
      INSERT INTO journal_lines (store_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT public.current_store_id(), v_journal_id, v_account_kas, '1-1000', 'Kas', v_paid, 0;
    END IF;

    IF v_remaining > 0 THEN
      INSERT INTO journal_lines (store_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT public.current_store_id(), v_journal_id, v_account_piutang, '1-1100', 'Piutang Usaha', v_remaining, 0;
    END IF;

    INSERT INTO journal_lines (store_id, journal_id, account_id, account_code, account_name, debit, credit)
    SELECT public.current_store_id(), v_journal_id, v_account_pendapatan, '4-4000', 'Pendapatan Penjualan', 0, v_total;

    IF v_total_cogs > 0 AND v_account_hpp IS NOT NULL AND v_account_persediaan IS NOT NULL THEN
      INSERT INTO journal_lines (store_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT public.current_store_id(), v_journal_id, v_account_hpp, '5-5000', 'Harga Pokok Penjualan (HPP)', v_total_cogs, 0;
      INSERT INTO journal_lines (store_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT public.current_store_id(), v_journal_id, v_account_persediaan, '1-1200', 'Persediaan Barang', 0, v_total_cogs;
    END IF;
  END IF;

  RETURN v_transaction_id;
END;
$function$;

-- >>> deallocate_payment
CREATE OR REPLACE FUNCTION public.deallocate_payment(p_payment_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  if not (public.has_permission('transaction.write') or public.has_permission('invoice.payment.write')) then
    raise exception 'Akses ditolak: butuh permission transaction.write atau invoice.payment.write' using errcode = '42501';
  end if;

  DELETE FROM transaction_item_payments
  WHERE payment_id = p_payment_id AND store_id = public.current_store_id();
END;
$function$;

-- >>> delete_closing_period
CREATE OR REPLACE FUNCTION public.delete_closing_period(p_closing_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_store_id uuid := public.current_store_id();
  v_period_end date;
BEGIN
  if not public.has_permission('finance.write') then
    raise exception 'Akses ditolak: butuh permission finance.write' using errcode = '42501';
  end if;

  SELECT period_end INTO v_period_end
  FROM closing_periods
  WHERE id = p_closing_id AND store_id = v_store_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Periode tidak ditemukan atau bukan milik Anda.';
  END IF;

  UPDATE journal_entries
  SET status = 'void', updated_at = now()
  WHERE store_id = v_store_id
    AND reference_type = 'closing'
    AND status <> 'void'
    AND (
      reference_id = p_closing_id
      OR (reference_id IS NULL AND entry_date::date = v_period_end)
    );

  DELETE FROM closing_periods WHERE id = p_closing_id;
END;
$function$;

-- >>> delete_payroll
CREATE OR REPLACE FUNCTION public.delete_payroll(p_payroll_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_store_id uuid;
  v_journal_id uuid;
BEGIN
  if not public.has_permission('hr.write') then
    raise exception 'Akses ditolak: butuh permission hr.write' using errcode = '42501';
  end if;

  v_store_id := public.current_store_id();

  SELECT journal_entry_id INTO v_journal_id
  FROM payrolls
  WHERE id = p_payroll_id AND store_id = v_store_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Slip gaji tidak ditemukan';
  END IF;

  IF v_journal_id IS NOT NULL THEN
    DELETE FROM journal_lines WHERE journal_id = v_journal_id;
    DELETE FROM journal_entries WHERE id = v_journal_id;
  END IF;

  DELETE FROM payrolls WHERE id = p_payroll_id AND store_id = v_store_id;

  RETURN true;
END;
$function$;

-- >>> delete_return
CREATE OR REPLACE FUNCTION public.delete_return(p_return_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_item RECORD;
BEGIN
  if not public.has_permission('transaction.write') then
    raise exception 'Akses ditolak: butuh permission transaction.write' using errcode = '42501';
  end if;

  -- Hapus jurnal retur terkait (reversal) agar tidak orphan
  DELETE FROM journal_lines
  WHERE journal_id IN (
    SELECT id FROM journal_entries
    WHERE reference_type = 'return' AND reference_id = p_return_id AND store_id = public.current_store_id()
  );
  DELETE FROM journal_entries
  WHERE reference_type = 'return' AND reference_id = p_return_id AND store_id = public.current_store_id();

  -- Kurangi kembali stok produk
  FOR v_item IN
    SELECT ri.product_id, ri.quantity
    FROM return_items ri
    WHERE ri.return_id = p_return_id AND ri.store_id = public.current_store_id()
  LOOP
    IF v_item.product_id IS NOT NULL THEN
      UPDATE products
      SET stock = stock - v_item.quantity,
          updated_at = now()
      WHERE id = v_item.product_id AND store_id = public.current_store_id();
    END IF;
  END LOOP;

  DELETE FROM returns
  WHERE id = p_return_id AND store_id = public.current_store_id();
END;
$function$;

-- >>> delete_transaction
CREATE OR REPLACE FUNCTION public.delete_transaction(p_transaction_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_item RECORD;
BEGIN
  if not public.has_permission('transaction.void') then
    raise exception 'Akses ditolak: butuh permission transaction.void' using errcode = '42501';
  end if;

  -- Kembalikan stok produk dari tiap item
  FOR v_item IN
    SELECT ti.product_id, ti.quantity
    FROM transaction_items ti
    WHERE ti.transaction_id = p_transaction_id
      AND ti.store_id = public.current_store_id()
  LOOP
    IF v_item.product_id IS NOT NULL THEN
      UPDATE products
      SET stock = stock + v_item.quantity,
          updated_at = now()
      WHERE id = v_item.product_id AND store_id = public.current_store_id();
    END IF;
  END LOOP;

  -- Hapus alokasi pembayaran (optional karena CASCADE, tapi explicit lebih clear)
  DELETE FROM transaction_item_payments
  WHERE transaction_id = p_transaction_id AND store_id = public.current_store_id();

  -- Hapus transaksi (items & payments ikut terhapus via ON DELETE CASCADE)
  DELETE FROM transactions
  WHERE id = p_transaction_id AND store_id = public.current_store_id();
END;
$function$;

-- >>> delete_transaction_payment
CREATE OR REPLACE FUNCTION public.delete_transaction_payment(p_payment_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_payment RECORD;
BEGIN
  if not (public.has_permission('transaction.write') or public.has_permission('invoice.payment.write')) then
    raise exception 'Akses ditolak: butuh permission transaction.write atau invoice.payment.write' using errcode = '42501';
  end if;

  -- Get payment info
  SELECT tp.id, tp.transaction_id, tp.amount
    INTO v_payment
  FROM transaction_payments tp
  WHERE tp.id = p_payment_id AND tp.store_id = public.current_store_id();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pembayaran tidak ditemukan';
  END IF;
  
  -- Deallocate payment dari items
  PERFORM deallocate_payment(p_payment_id);
  
  -- Delete payment record
  DELETE FROM transaction_payments
  WHERE id = p_payment_id AND store_id = public.current_store_id();
  
  -- Update transaction totals
  UPDATE transactions t
  SET 
    paid_amount = (
      SELECT COALESCE(SUM(amount), 0)
      FROM transaction_payments
      WHERE transaction_id = t.id
    ),
    remaining_amount = t.total - (
      SELECT COALESCE(SUM(amount), 0)
      FROM transaction_payments
      WHERE transaction_id = t.id
    ),
    payment_status = CASE
      WHEN t.total <= (
        SELECT COALESCE(SUM(amount), 0)
        FROM transaction_payments
        WHERE transaction_id = t.id
      ) THEN 'lunas'
      ELSE 'belum_lunas'
    END,
    updated_at = now()
  WHERE id = v_payment.transaction_id AND store_id = public.current_store_id();
END;
$function$;

-- >>> generate_delivery_number
CREATE OR REPLACE FUNCTION public.generate_delivery_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_year TEXT;
  v_count INTEGER;
  v_number TEXT;
BEGIN
  if not public.has_permission('shipping.write') then
    raise exception 'Akses ditolak: butuh permission shipping.write' using errcode = '42501';
  end if;

  v_year := to_char(now(), 'YYYY');
  SELECT COUNT(*) INTO v_count
  FROM delivery_orders
  WHERE store_id = public.current_store_id();

  v_number := 'SJ-' || v_year || '-' || LPAD(COALESCE(v_count + 1, 1)::TEXT, 4, '0');
  RETURN v_number;
END;
$function$;

-- >>> generate_employee_code
CREATE OR REPLACE FUNCTION public.generate_employee_code()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_count INTEGER;
  v_code TEXT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM employees
  WHERE store_id = public.current_store_id();

  v_code := 'EMP-' || to_char(now(), 'YYYYMM') || '-' || LPAD(COALESCE(v_count + 1, 1)::TEXT, 4, '0');
  RETURN v_code;
END;
$function$;

-- >>> generate_payroll_code
CREATE OR REPLACE FUNCTION public.generate_payroll_code()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_count INTEGER;
  v_code TEXT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM payrolls
  WHERE store_id = public.current_store_id()
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM now())
    AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM now());

  v_code := 'PAY-' || to_char(now(), 'YYYYMM') || '-' || LPAD((v_count + 1)::TEXT, 4, '0');
  RETURN v_code;
END;
$function$;

-- >>> generate_payroll_for_employee
CREATE OR REPLACE FUNCTION public.generate_payroll_for_employee(p_employee_id uuid, p_period_start date, p_period_end date, p_kasbon_deduction numeric DEFAULT 0)
 RETURNS payrolls
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_store_id uuid;
  v_employee RECORD;
  v_payroll_id uuid;
  v_period_code TEXT;
  v_base_salary numeric;
  v_incentive numeric;
  v_net numeric;
  v_do RECORD;
  v_incentive_details jsonb;
  v_detail jsonb;
  v_item RECORD;
  v_item_desc text;
  v_bagian_loader numeric;
  v_result payrolls;
BEGIN
  if not public.has_permission('hr.write') then
    raise exception 'Akses ditolak: butuh permission hr.write' using errcode = '42501';
  end if;

  v_store_id := public.current_store_id();

  -- Validasi karyawan
  SELECT e.* INTO v_employee
  FROM employees e
  WHERE e.id = p_employee_id AND e.store_id = v_store_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Karyawan tidak ditemukan';
  END IF;

  IF v_employee.status != 'aktif' OR v_employee.is_active = false THEN
    RAISE EXCEPTION 'Karyawan tidak aktif';
  END IF;

  -- Validasi tanggal
  IF p_period_start > p_period_end THEN
    RAISE EXCEPTION 'Tanggal mulai tidak boleh lebih besar dari tanggal selesai';
  END IF;

  -- Generate kode slip gaji
  v_period_code := generate_payroll_code();
  v_payroll_id := gen_random_uuid();

  -- Gaji pokok
  v_base_salary := COALESCE(NULLIF(v_employee.base_salary, 0), 0);

  v_incentive := 0;
  v_incentive_details := '[]'::jsonb;

  -- ============================================================
  -- Insentif LOADER: bagi rata nilai muatan per orang
  -- ============================================================
  IF EXISTS (
    SELECT 1 FROM delivery_loaders l WHERE l.employee_id = p_employee_id
  ) THEN
    FOR v_do IN
      SELECT dor.id,
             dor.do_number,
             dor.do_date,
             COALESCE((
               SELECT SUM(li.quantity * li.unit_price)
               FROM delivery_load_items li
               WHERE li.delivery_order_id = dor.id
             ), 0) AS nilai_muatan,
             (
               SELECT COUNT(*)
               FROM delivery_loaders l
               WHERE l.delivery_order_id = dor.id
             ) AS jumlah_loader
      FROM delivery_orders dor
      WHERE dor.store_id = v_store_id
        AND dor.status = 'selesai'
        AND dor.do_date BETWEEN p_period_start AND p_period_end
        AND EXISTS (
          SELECT 1
          FROM delivery_loaders l
          WHERE l.delivery_order_id = dor.id
            AND l.employee_id = p_employee_id
        )
    LOOP
      IF v_do.jumlah_loader > 0 AND v_do.nilai_muatan > 0 THEN
        v_bagian_loader := CEIL(v_do.nilai_muatan / v_do.jumlah_loader);
        v_incentive := v_incentive + v_bagian_loader;
        
        -- Buat deskripsi dari items
        v_item_desc := '';
        FOR v_item IN
          SELECT product_name, quantity, unit_price
          FROM delivery_load_items
          WHERE delivery_order_id = v_do.id
        LOOP
          IF v_item_desc != '' THEN
            v_item_desc := v_item_desc || ', ';
          END IF;
          v_item_desc := v_item_desc || v_item.product_name || ' (' || 
                         v_item.quantity || ' x ' || 
                         to_char(v_item.unit_price, 'FM999G999G999G999') || ')';
        END LOOP;
        
        -- Tambahkan detail ke array
        v_detail := jsonb_build_object(
          'type', 'loader',
          'date', v_do.do_date,
          'do_number', COALESCE(v_do.do_number, substring(v_do.id::text, 1, 8)),
          'description', 'Bongkar muat: ' || v_item_desc || ' — Dibagi ' || v_do.jumlah_loader || ' orang',
          'amount', v_bagian_loader
        );
        v_incentive_details := v_incentive_details || v_detail;
      END IF;
    END LOOP;
  END IF;

  -- ============================================================
  -- Insentif DRIVER: total driver_fee
  -- ============================================================
  FOR v_do IN
    SELECT dor.id,
           dor.do_number,
           dor.do_date,
           dor.driver_fee
    FROM delivery_orders dor
    WHERE dor.store_id = v_store_id
      AND dor.status = 'selesai'
      AND dor.do_date BETWEEN p_period_start AND p_period_end
      AND dor.driver_id = p_employee_id
      AND dor.driver_fee IS NOT NULL
      AND dor.driver_fee > 0
  LOOP
    v_incentive := v_incentive + v_do.driver_fee;
    
    -- Tambahkan detail ke array
    v_detail := jsonb_build_object(
      'type', 'driver',
      'date', v_do.do_date,
      'do_number', COALESCE(v_do.do_number, substring(v_do.id::text, 1, 8)),
      'description', 'Ongkos supir',
      'amount', v_do.driver_fee
    );
    v_incentive_details := v_incentive_details || v_detail;
  END LOOP;

  -- Hitung gaji bersih
  v_net := v_base_salary + v_incentive - COALESCE(p_kasbon_deduction, 0);

  -- Insert slip gaji dengan detail insentif
  INSERT INTO payrolls (
    id, store_id, employee_id,
    period_code, period_start, period_end,
    base_salary, incentive_amount, kasbon_deduction, total_net,
    incentive_details,
    status, created_at, updated_at
  ) VALUES (
    v_payroll_id, v_store_id, p_employee_id,
    v_period_code, p_period_start, p_period_end,
    v_base_salary, v_incentive, COALESCE(p_kasbon_deduction, 0), v_net,
    v_incentive_details,
    'draft', now(), now()
  )
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$function$;

-- >>> generate_trip_number
CREATE OR REPLACE FUNCTION public.generate_trip_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_count INTEGER;
BEGIN
  if not public.has_permission('shipping.write') then
    raise exception 'Akses ditolak: butuh permission shipping.write' using errcode = '42501';
  end if;

  SELECT COUNT(*) INTO v_count FROM trips WHERE store_id = public.current_store_id();
  RETURN 'TRP-' || to_char(now(), 'YYYYMMDD') || '-' || LPAD(COALESCE(v_count + 1, 1)::TEXT, 4, '0');
END;
$function$;

-- >>> get_applicable_price
CREATE OR REPLACE FUNCTION public.get_applicable_price(p_product_id uuid, p_customer_id uuid DEFAULT NULL::uuid, p_quantity integer DEFAULT 1, p_date date DEFAULT CURRENT_DATE)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_price numeric;
  v_default_price numeric;
BEGIN
  SELECT price_sell INTO v_default_price
  FROM products
  WHERE id = p_product_id AND store_id = public.current_store_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produk tidak ditemukan';
  END IF;

  -- 1. Harga khusus per pelanggan (prioritas tertinggi)
  IF p_customer_id IS NOT NULL THEN
    SELECT custom_price INTO v_price
    FROM customer_price_matrix
    WHERE store_id = public.current_store_id()
      AND customer_id = p_customer_id
      AND product_id = p_product_id
      AND is_active = true
      AND p_quantity >= min_quantity
      AND (start_date IS NULL OR start_date <= p_date)
      AND (end_date IS NULL OR end_date >= p_date)
    ORDER BY min_quantity DESC
    LIMIT 1;

    IF FOUND THEN
      RETURN v_price;
    END IF;

    -- 2. Harga khusus per grup (pelanggan jadi anggota grup mana pun)
    --    Bila beberapa grup cocok, ambil yang termurah.
    SELECT MIN(cpm.custom_price) INTO v_price
    FROM customer_price_matrix cpm
    JOIN customer_group_members cgm ON cgm.group_id = cpm.group_id
    WHERE cpm.store_id = public.current_store_id()
      AND cgm.customer_id = p_customer_id
      AND cpm.product_id = p_product_id
      AND cpm.is_active = true
      AND p_quantity >= cpm.min_quantity
      AND (cpm.start_date IS NULL OR cpm.start_date <= p_date)
      AND (cpm.end_date IS NULL OR cpm.end_date >= p_date);

    IF v_price IS NOT NULL THEN
      RETURN v_price;
    END IF;
  END IF;

  -- 3. Harga tier berdasarkan kuantitas
  SELECT tier_price INTO v_price
  FROM price_tiers
  WHERE store_id = public.current_store_id()
    AND product_id = p_product_id
    AND is_active = true
    AND p_quantity >= min_quantity
    AND (max_quantity IS NULL OR p_quantity <= max_quantity)
    AND (start_date IS NULL OR start_date <= p_date)
    AND (end_date IS NULL OR end_date >= p_date)
  ORDER BY min_quantity DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN v_price;
  END IF;

  -- 4. Harga default
  RETURN v_default_price;
END;
$function$;

-- >>> post_adjusting_journal
CREATE OR REPLACE FUNCTION public.post_adjusting_journal(p_entry_date date, p_description text, p_lines jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_journal_id uuid;
  v_line jsonb;
  v_total_debit numeric := 0;
  v_total_credit numeric := 0;
  v_account chart_of_accounts%ROWTYPE;
  v_store_id uuid;
  v_entry_timestamp timestamptz;
BEGIN
  if not public.has_permission('finance.write') then
    raise exception 'Akses ditolak: butuh permission finance.write' using errcode = '42501';
  end if;

  v_store_id := public.current_store_id();

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'Tidak ada sesi pengguna';
  END IF;

  IF check_period_closed(p_entry_date, v_store_id) THEN
    RAISE EXCEPTION 'Periode % sudah ditutup. Buka kembali periode tersebut sebelum mencatat jurnal penyesuaian.',
      p_entry_date;
  END IF;

  IF p_lines IS NULL OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'Jurnal penyesuaian harus memiliki minimal 1 baris';
  END IF;

  IF p_description IS NULL OR trim(p_description) = '' THEN
    RAISE EXCEPTION 'Keterangan jurnal penyesuaian wajib diisi';
  END IF;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    SELECT * INTO v_account
    FROM chart_of_accounts
    WHERE id = (v_line->>'account_id')::uuid
      AND store_id = v_store_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Akun tidak ditemukan';
    END IF;

    IF NOT v_account.is_active THEN
      RAISE EXCEPTION 'Akun % tidak aktif', v_account.name;
    END IF;

    v_total_debit := v_total_debit + COALESCE((v_line->>'debit')::numeric, 0);
    v_total_credit := v_total_credit + COALESCE((v_line->>'credit')::numeric, 0);
  END LOOP;

  IF v_total_debit <= 0 AND v_total_credit <= 0 THEN
    RAISE EXCEPTION 'Jurnal penyesuaian harus memiliki nilai debit atau kredit';
  END IF;

  IF round(v_total_debit, 2) <> round(v_total_credit, 2) THEN
    RAISE EXCEPTION 'Total debit (%) tidak sama dengan total kredit (%)',
      v_total_debit, v_total_credit;
  END IF;

  v_entry_timestamp := p_entry_date::date + CURRENT_TIME;

  INSERT INTO journal_entries (store_id, entry_date, description, reference_type)
  VALUES (v_store_id, v_entry_timestamp, p_description, 'adjusting')
  RETURNING id INTO v_journal_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    SELECT * INTO v_account
    FROM chart_of_accounts
    WHERE id = (v_line->>'account_id')::uuid
      AND store_id = v_store_id;

    INSERT INTO journal_lines (store_id, journal_id, account_id, account_code, account_name,
                                debit, credit)
    VALUES (v_store_id, v_journal_id, v_account.id, v_account.code, v_account.name,
            COALESCE((v_line->>'debit')::numeric, 0),
            COALESCE((v_line->>'credit')::numeric, 0));
  END LOOP;

  RETURN v_journal_id;
END;
$function$;

-- >>> post_journal
CREATE OR REPLACE FUNCTION public.post_journal(p_entry_date date, p_description text, p_lines jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_journal_id uuid;
  v_line jsonb;
  v_total_debit numeric := 0;
  v_total_credit numeric := 0;
  v_account chart_of_accounts%ROWTYPE;
  v_store_id uuid;
  v_entry_timestamp timestamptz;
BEGIN
  if not public.has_permission('finance.write') then
    raise exception 'Akses ditolak: butuh permission finance.write' using errcode = '42501';
  end if;

  v_store_id := public.current_store_id();

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'Tidak ada sesi pengguna';
  END IF;

  IF check_period_closed(p_entry_date, v_store_id) THEN
    RAISE EXCEPTION 'Periode % sudah ditutup. Buka kembali periode tersebut sebelum mencatat jurnal.',
      p_entry_date;
  END IF;

  IF p_lines IS NULL OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'Jurnal harus memiliki minimal 1 baris';
  END IF;

  IF p_description IS NULL OR trim(p_description) = '' THEN
    RAISE EXCEPTION 'Deskripsi jurnal wajib diisi';
  END IF;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    SELECT * INTO v_account
    FROM chart_of_accounts
    WHERE id = (v_line->>'account_id')::uuid
      AND store_id = v_store_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Akun tidak ditemukan';
    END IF;

    IF NOT v_account.is_active THEN
      RAISE EXCEPTION 'Akun % tidak aktif', v_account.name;
    END IF;

    v_total_debit := v_total_debit + COALESCE((v_line->>'debit')::numeric, 0);
    v_total_credit := v_total_credit + COALESCE((v_line->>'credit')::numeric, 0);
  END LOOP;

  IF v_total_debit <= 0 AND v_total_credit <= 0 THEN
    RAISE EXCEPTION 'Jurnal harus memiliki nilai debit atau kredit';
  END IF;

  IF round(v_total_debit, 2) <> round(v_total_credit, 2) THEN
    RAISE EXCEPTION 'Total debit (%) tidak sama dengan total kredit (%)',
      v_total_debit, v_total_credit;
  END IF;

  v_entry_timestamp := p_entry_date::date + CURRENT_TIME;

  INSERT INTO journal_entries (store_id, entry_date, description, reference_type)
  VALUES (v_store_id, v_entry_timestamp, p_description, 'manual')
  RETURNING id INTO v_journal_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    SELECT * INTO v_account
    FROM chart_of_accounts
    WHERE id = (v_line->>'account_id')::uuid
      AND store_id = v_store_id;

    INSERT INTO journal_lines (store_id, journal_id, account_id, account_code, account_name,
                                debit, credit)
    VALUES (v_store_id, v_journal_id, v_account.id, v_account.code, v_account.name,
            COALESCE((v_line->>'debit')::numeric, 0),
            COALESCE((v_line->>'credit')::numeric, 0));
  END LOOP;

  RETURN v_journal_id;
END;
$function$;

-- >>> post_payroll_journal
CREATE OR REPLACE FUNCTION public.post_payroll_journal(p_payroll_id uuid)
 RETURNS payrolls
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_store_id uuid;
  v_payroll RECORD;
  v_journal_id uuid;
  v_journal_number TEXT;
  v_expense_account uuid;
  v_liability_account uuid;
  v_result payrolls;
BEGIN
  if not public.has_permission('hr.write') then
    raise exception 'Akses ditolak: butuh permission hr.write' using errcode = '42501';
  end if;

  v_store_id := public.current_store_id();

  -- Ambil data payroll
  SELECT p.*, e.name as employee_name
  INTO v_payroll
  FROM payrolls p
  JOIN employees e ON e.id = p.employee_id
  WHERE p.id = p_payroll_id AND p.store_id = v_store_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Slip gaji tidak ditemukan';
  END IF;

  IF v_payroll.status = 'paid' THEN
    RAISE EXCEPTION 'Slip gaji sudah dibayar';
  END IF;

  IF v_payroll.total_net <= 0 THEN
    RAISE EXCEPTION 'Gaji bersih harus lebih dari 0';
  END IF;

  -- Cari akun biaya gaji (beban)
  SELECT id INTO v_expense_account
  FROM chart_of_accounts
  WHERE store_id = v_store_id
    AND type = 'beban'
    AND (LOWER(name) LIKE '%gaji%' OR LOWER(name) LIKE '%salary%')
  ORDER BY created_at
  LIMIT 1;

  IF v_expense_account IS NULL THEN
    RAISE EXCEPTION 'Akun biaya gaji tidak ditemukan. Buat dulu akun dengan tipe Beban dan nama mengandung "Gaji"';
  END IF;

  -- Cari akun hutang gaji (kewajiban)
  SELECT id INTO v_liability_account
  FROM chart_of_accounts
  WHERE store_id = v_store_id
    AND type = 'kewajiban'
    AND (LOWER(name) LIKE '%hutang%' AND LOWER(name) LIKE '%gaji%')
  ORDER BY created_at
  LIMIT 1;

  IF v_liability_account IS NULL THEN
    RAISE EXCEPTION 'Akun hutang gaji tidak ditemukan. Buat dulu akun dengan tipe Kewajiban dan nama mengandung "Hutang Gaji"';
  END IF;

  -- Generate nomor jurnal
  v_journal_number := 'JV-' || to_char(now(), 'YYYYMMDD') || '-' || LPAD(
    (SELECT COUNT(*) + 1 FROM journal_entries WHERE store_id = v_store_id)::TEXT,
    4, '0'
  );

  v_journal_id := gen_random_uuid();

  -- Insert jurnal entry
  INSERT INTO journal_entries (
    id, store_id, journal_number, entry_date,
    description, reference_type, reference_id,
    created_at, updated_at
  ) VALUES (
    v_journal_id, v_store_id, v_journal_number, CURRENT_DATE,
    'Pembayaran gaji ' || v_payroll.employee_name || ' periode ' ||
      v_payroll.period_start || ' s/d ' || v_payroll.period_end,
    'payroll', p_payroll_id,
    now(), now()
  );

  -- Insert journal lines
  -- Debit: Biaya Gaji (TANPA field description)
  INSERT INTO journal_lines (
    id, store_id, journal_id, account_id, 
    account_code, account_name,
    debit, credit, created_at
  ) 
  SELECT
    gen_random_uuid(), v_store_id, v_journal_id, v_expense_account,
    coa.code, coa.name,
    v_payroll.total_net, 0, now()
  FROM chart_of_accounts coa
  WHERE coa.id = v_expense_account;

  -- Credit: Hutang Gaji (TANPA field description)
  INSERT INTO journal_lines (
    id, store_id, journal_id, account_id,
    account_code, account_name,
    debit, credit, created_at
  )
  SELECT
    gen_random_uuid(), v_store_id, v_journal_id, v_liability_account,
    coa.code, coa.name,
    0, v_payroll.total_net, now()
  FROM chart_of_accounts coa
  WHERE coa.id = v_liability_account;

  -- Update payroll
  UPDATE payrolls
  SET status = 'paid',
      journal_entry_id = v_journal_id,
      paid_at = now(),
      updated_at = now()
  WHERE id = p_payroll_id
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$function$;

-- >>> prevent_closed_period_delivery
CREATE OR REPLACE FUNCTION public.prevent_closed_period_delivery()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  IF check_period_closed(NEW.do_date::date, NEW.store_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah surat jalan di periode yang sudah ditutup (%).',
      NEW.do_date::date;
  END IF;
  RETURN NEW;
END;
$function$;

-- >>> prevent_closed_period_grn
CREATE OR REPLACE FUNCTION public.prevent_closed_period_grn()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, pg_temp
AS $function$
BEGIN
  IF check_period_closed(NEW.receipt_date::date, NEW.store_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah penerimaan barang di periode yang sudah ditutup (%).',
      NEW.receipt_date::date;
  END IF;
  RETURN NEW;
END;
$function$;

-- >>> prevent_closed_period_journal
CREATE OR REPLACE FUNCTION public.prevent_closed_period_journal()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, pg_temp
AS $function$
BEGIN
  -- Skip untuk operasi void (status = 'void')
  IF TG_OP = 'UPDATE' AND NEW.status = 'void' THEN
    RETURN NEW;
  END IF;

  -- Jurnal penutup bertanggal period_end — izinkan bila terhubung ke
  -- closing_periods milik user dan tanggalnya memang period_end periode itu.
  IF NEW.reference_type = 'closing' THEN
    IF NEW.reference_id IS NULL THEN
      RETURN NEW;
    END IF;
    IF EXISTS (
      SELECT 1 FROM closing_periods cp
      WHERE cp.id = NEW.reference_id
        AND cp.store_id = NEW.store_id
        AND cp.period_end = NEW.entry_date::date
    ) THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Cek periode tertutup
  IF check_period_closed(NEW.entry_date::date, NEW.store_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah jurnal di periode yang sudah ditutup (%).',
      NEW.entry_date::date;
  END IF;

  RETURN NEW;
END;
$function$;

-- >>> prevent_closed_period_journal_delete
CREATE OR REPLACE FUNCTION public.prevent_closed_period_journal_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  IF check_period_closed(OLD.entry_date::date, OLD.store_id) THEN
    RAISE EXCEPTION 'Tidak dapat menghapus jurnal di periode yang sudah ditutup (%).',
      OLD.entry_date::date;
  END IF;
  RETURN OLD;
END;
$function$;

-- >>> prevent_closed_period_payment
CREATE OR REPLACE FUNCTION public.prevent_closed_period_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, pg_temp
AS $function$
BEGIN
  IF check_period_closed(NEW.created_at::date, NEW.store_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah pembayaran di periode yang sudah ditutup (%).',
      NEW.created_at::date;
  END IF;
  RETURN NEW;
END;
$function$;

-- >>> prevent_closed_period_payroll
CREATE OR REPLACE FUNCTION public.prevent_closed_period_payroll()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, pg_temp
AS $function$
BEGIN
  IF check_period_closed(NEW.period_start::date, NEW.store_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah slip gaji di periode yang sudah ditutup (%).',
      NEW.period_start::date;
  END IF;
  RETURN NEW;
END;
$function$;

-- >>> prevent_closed_period_po
CREATE OR REPLACE FUNCTION public.prevent_closed_period_po()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, pg_temp
AS $function$
BEGIN
  IF check_period_closed(NEW.po_date::date, NEW.store_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah purchase order di periode yang sudah ditutup (%).',
      NEW.po_date::date;
  END IF;
  RETURN NEW;
END;
$function$;

-- >>> prevent_closed_period_purchase_invoice
CREATE OR REPLACE FUNCTION public.prevent_closed_period_purchase_invoice()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, pg_temp
AS $function$
BEGIN
  IF check_period_closed(NEW.invoice_date::date, NEW.store_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah invoice pembelian di periode yang sudah ditutup (%).',
      NEW.invoice_date::date;
  END IF;
  RETURN NEW;
END;
$function$;

-- >>> prevent_closed_period_return
CREATE OR REPLACE FUNCTION public.prevent_closed_period_return()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, pg_temp
AS $function$
BEGIN
  IF check_period_closed(NEW.created_at::date, NEW.store_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah retur di periode yang sudah ditutup (%).',
      NEW.created_at::date;
  END IF;

  RETURN NEW;
END;
$function$;

-- >>> prevent_closed_period_stock_movement
CREATE OR REPLACE FUNCTION public.prevent_closed_period_stock_movement()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, pg_temp
AS $function$
BEGIN
  IF check_period_closed(NEW.created_at::date, NEW.store_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah mutasi stok di periode yang sudah ditutup (%).',
      NEW.created_at::date;
  END IF;
  RETURN NEW;
END;
$function$;

-- >>> prevent_closed_period_transaction
CREATE OR REPLACE FUNCTION public.prevent_closed_period_transaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, pg_temp
AS $function$
BEGIN
  IF check_period_closed(NEW.created_at::date, NEW.store_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah transaksi di periode yang sudah ditutup (%).',
      NEW.created_at::date;
  END IF;
  RETURN NEW;
END;
$function$;

-- >>> reallocate_payment
CREATE OR REPLACE FUNCTION public.reallocate_payment(p_payment_id uuid, p_allocations jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_payment RECORD;
  v_alloc jsonb;
  v_total_allocated numeric := 0;
  v_transaction_id uuid;
BEGIN
  if not (public.has_permission('transaction.write') or public.has_permission('invoice.payment.write')) then
    raise exception 'Akses ditolak: butuh permission transaction.write atau invoice.payment.write' using errcode = '42501';
  end if;

  -- Get payment info
  SELECT tp.id, tp.amount, tp.transaction_id 
    INTO v_payment
  FROM transaction_payments tp
  WHERE tp.id = p_payment_id AND tp.store_id = public.current_store_id();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment tidak ditemukan';
  END IF;
  
  v_transaction_id := v_payment.transaction_id;
  
  -- Validate total allocation
  FOR v_alloc IN SELECT * FROM jsonb_array_elements(p_allocations)
  LOOP
    v_total_allocated := v_total_allocated + (v_alloc->>'amount')::numeric;
  END LOOP;
  
  IF v_total_allocated > v_payment.amount THEN
    RAISE EXCEPTION 'Total alokasi (%) melebihi amount payment (%)', 
      v_total_allocated, v_payment.amount;
  END IF;
  
  -- Delete existing allocations
  PERFORM deallocate_payment(p_payment_id);
  
  -- Insert new allocations
  FOR v_alloc IN SELECT * FROM jsonb_array_elements(p_allocations)
  LOOP
    INSERT INTO transaction_item_payments (
      store_id, transaction_id, item_id, payment_id, allocated_amount
    ) VALUES (
      public.current_store_id(), 
      v_transaction_id, 
      (v_alloc->>'item_id')::uuid, 
      p_payment_id, 
      (v_alloc->>'amount')::numeric
    );
  END LOOP;
END;
$function$;

-- >>> reopen_period
CREATE OR REPLACE FUNCTION public.reopen_period(p_closing_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_store_id uuid := public.current_store_id();
  v_period_end date;
BEGIN
  if not public.has_permission('finance.write') then
    raise exception 'Akses ditolak: butuh permission finance.write' using errcode = '42501';
  end if;

  SELECT period_end INTO v_period_end
  FROM closing_periods
  WHERE id = p_closing_id AND store_id = v_store_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Periode tidak ditemukan atau bukan milik Anda.';
  END IF;

  UPDATE journal_entries
  SET status = 'void', updated_at = now()
  WHERE store_id = v_store_id
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

-- >>> revert_loan_payments_on_payroll_delete
CREATE OR REPLACE FUNCTION public.revert_loan_payments_on_payroll_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
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

-- >>> trg_delivery_orders_set_number
CREATE OR REPLACE FUNCTION public.trg_delivery_orders_set_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.do_number IS NULL OR NEW.do_number = '' THEN
    NEW.do_number := generate_delivery_number();
  END IF;
  RETURN NEW;
END;
$function$;

-- >>> trg_employees_set_code
CREATE OR REPLACE FUNCTION public.trg_employees_set_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.employee_code IS NULL OR NEW.employee_code = '' THEN
    NEW.employee_code := generate_employee_code();
  END IF;
  RETURN NEW;
END;
$function$;

-- >>> trg_trips_set_number
CREATE OR REPLACE FUNCTION public.trg_trips_set_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.trip_number IS NULL OR NEW.trip_number = '' THEN
    NEW.trip_number := generate_trip_number();
  END IF;
  RETURN NEW;
END;
$function$;

-- >>> update_customer_groups_updated_at
CREATE OR REPLACE FUNCTION public.update_customer_groups_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, pg_temp
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- >>> update_customer_price_matrix_updated_at
CREATE OR REPLACE FUNCTION public.update_customer_price_matrix_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, pg_temp
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- >>> update_employee_loans_updated_at
CREATE OR REPLACE FUNCTION public.update_employee_loans_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, pg_temp
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- >>> update_loan_after_payment
CREATE OR REPLACE FUNCTION public.update_loan_after_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, pg_temp
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

-- >>> update_price_tiers_updated_at
CREATE OR REPLACE FUNCTION public.update_price_tiers_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, pg_temp
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- >>> update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, pg_temp
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- >>> validate_item_payment_allocation
CREATE OR REPLACE FUNCTION public.validate_item_payment_allocation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_payment_amount numeric;
  v_payment_allocated numeric;
  v_item_subtotal numeric;
  v_item_allocated numeric;
BEGIN
  -- Check: total alokasi ke payment_id tidak boleh > payment amount
  SELECT tp.amount INTO v_payment_amount
  FROM transaction_payments tp
  WHERE tp.id = NEW.payment_id AND tp.store_id = NEW.store_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment tidak ditemukan';
  END IF;
  
  SELECT COALESCE(SUM(allocated_amount), 0) INTO v_payment_allocated
  FROM transaction_item_payments
  WHERE payment_id = NEW.payment_id 
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  
  IF (v_payment_allocated + NEW.allocated_amount) > v_payment_amount THEN
    RAISE EXCEPTION 'Total alokasi (%) melebihi jumlah payment (%) untuk payment_id=%', 
      v_payment_allocated + NEW.allocated_amount, v_payment_amount, NEW.payment_id;
  END IF;
  
  -- Check: total alokasi ke item_id tidak boleh > item subtotal
  SELECT ti.subtotal INTO v_item_subtotal
  FROM transaction_items ti
  WHERE ti.id = NEW.item_id AND ti.store_id = NEW.store_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item tidak ditemukan';
  END IF;
  
  SELECT COALESCE(SUM(allocated_amount), 0) INTO v_item_allocated
  FROM transaction_item_payments
  WHERE item_id = NEW.item_id 
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  
  IF (v_item_allocated + NEW.allocated_amount) > v_item_subtotal THEN
    RAISE EXCEPTION 'Total alokasi (%) melebihi subtotal item (%) untuk item_id=%', 
      v_item_allocated + NEW.allocated_amount, v_item_subtotal, NEW.item_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- >>> validate_price_tier_range
CREATE OR REPLACE FUNCTION public.validate_price_tier_range()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_overlap_count integer;
BEGIN
  -- Cek apakah ada overlap range untuk produk yang sama di periode yang sama
  SELECT COUNT(*) INTO v_overlap_count
  FROM price_tiers
  WHERE store_id = NEW.store_id
    AND product_id = NEW.product_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND is_active = true
    AND (
      (NEW.min_quantity BETWEEN min_quantity AND COALESCE(max_quantity, 999999))
      OR (COALESCE(NEW.max_quantity, 999999) BETWEEN min_quantity AND COALESCE(max_quantity, 999999))
      OR (min_quantity BETWEEN NEW.min_quantity AND COALESCE(NEW.max_quantity, 999999))
    )
    AND (
      (NEW.start_date IS NULL AND start_date IS NULL)
      OR (NEW.start_date IS NOT NULL AND start_date IS NOT NULL AND
          (NEW.start_date, COALESCE(NEW.end_date, '9999-12-31'::date))
          OVERLAPS
          (start_date, COALESCE(end_date, '9999-12-31'::date)))
    );

  IF v_overlap_count > 0 THEN
    RAISE EXCEPTION 'Range kuantitas atau periode bertumpuk dengan tier harga lain untuk produk ini';
  END IF;

  RETURN NEW;
END;
$function$;

-- >>> void_journal
CREATE OR REPLACE FUNCTION public.void_journal(p_journal_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_status text;
BEGIN
  if not public.has_permission('finance.write') then
    raise exception 'Akses ditolak: butuh permission finance.write' using errcode = '42501';
  end if;

  SELECT status INTO v_status
  FROM journal_entries
  WHERE id = p_journal_id AND store_id = public.current_store_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jurnal tidak ditemukan';
  END IF;

  IF v_status = 'void' THEN
    RAISE EXCEPTION 'Jurnal sudah dibatalkan sebelumnya';
  END IF;

  UPDATE journal_entries
  SET status = 'void', updated_at = now()
  WHERE id = p_journal_id AND store_id = public.current_store_id();
END;
$function$;

-- >>> void_transaction
CREATE OR REPLACE FUNCTION public.void_transaction(p_transaction_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_item RECORD;
  v_status text;
  v_transaction_number text;
  v_total numeric;
  v_paid_amount numeric;
  v_remaining_amount numeric;
  v_total_cogs numeric := 0;
  v_account_kas uuid;
  v_account_piutang uuid;
  v_account_pendapatan uuid;
  v_account_hpp uuid;
  v_account_persediaan uuid;
  v_journal_id uuid;
BEGIN
  if not public.has_permission('transaction.void') then
    raise exception 'Akses ditolak: butuh permission transaction.void' using errcode = '42501';
  end if;

  SELECT status, transaction_number, total, paid_amount, remaining_amount
    INTO v_status, v_transaction_number, v_total, v_paid_amount, v_remaining_amount
  FROM transactions
  WHERE id = p_transaction_id AND store_id = public.current_store_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaksi tidak ditemukan';
  END IF;

  IF v_status = 'batal' THEN
    RAISE EXCEPTION 'Transaksi sudah dibatalkan sebelumnya';
  END IF;

  FOR v_item IN
    SELECT ti.product_id, ti.quantity, p.price_buy
    FROM transaction_items ti
    LEFT JOIN products p ON p.id = ti.product_id
    WHERE ti.transaction_id = p_transaction_id AND ti.store_id = public.current_store_id()
  LOOP
    v_total_cogs := v_total_cogs + (COALESCE(v_item.price_buy, 0) * v_item.quantity);
  END LOOP;

  FOR v_item IN
    SELECT ti.product_id, ti.quantity
    FROM transaction_items ti
    WHERE ti.transaction_id = p_transaction_id AND ti.store_id = public.current_store_id()
  LOOP
    IF v_item.product_id IS NOT NULL THEN
      UPDATE products SET stock = stock + v_item.quantity, updated_at = now()
      WHERE id = v_item.product_id AND store_id = public.current_store_id();
    END IF;
  END LOOP;

  UPDATE transactions SET status = 'batal', updated_at = now()
  WHERE id = p_transaction_id AND store_id = public.current_store_id();

  UPDATE journal_entries
  SET status = 'void', updated_at = now()
  WHERE reference_type = 'transaction' AND reference_id = p_transaction_id AND store_id = public.current_store_id();

  SELECT id INTO v_account_kas FROM chart_of_accounts WHERE store_id = public.current_store_id() AND code = '1-1000';
  SELECT id INTO v_account_piutang FROM chart_of_accounts WHERE store_id = public.current_store_id() AND code = '1-1100';
  SELECT id INTO v_account_pendapatan FROM chart_of_accounts WHERE store_id = public.current_store_id() AND code = '4-4000';
  SELECT id INTO v_account_hpp FROM chart_of_accounts WHERE store_id = public.current_store_id() AND code = '5-5000';
  SELECT id INTO v_account_persediaan FROM chart_of_accounts WHERE store_id = public.current_store_id() AND code = '1-1200';

  IF v_account_pendapatan IS NOT NULL THEN
    INSERT INTO journal_entries (store_id, entry_date, description, reference_type, reference_id)
    VALUES (public.current_store_id(), now(), 'Pembatalan ' || v_transaction_number, 'void', p_transaction_id)
    RETURNING id INTO v_journal_id;

    INSERT INTO journal_lines (store_id, journal_id, account_id, account_code, account_name, debit, credit)
    SELECT public.current_store_id(), v_journal_id, v_account_pendapatan, '4-4000', 'Pendapatan Penjualan', v_total, 0;

    IF v_paid_amount > 0 AND v_account_kas IS NOT NULL THEN
      INSERT INTO journal_lines (store_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT public.current_store_id(), v_journal_id, v_account_kas, '1-1000', 'Kas', 0, v_paid_amount;
    END IF;

    IF v_remaining_amount > 0 AND v_account_piutang IS NOT NULL THEN
      INSERT INTO journal_lines (store_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT public.current_store_id(), v_journal_id, v_account_piutang, '1-1100', 'Piutang Usaha', 0, v_remaining_amount;
    END IF;

    IF v_total_cogs > 0 AND v_account_hpp IS NOT NULL AND v_account_persediaan IS NOT NULL THEN
      INSERT INTO journal_lines (store_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT public.current_store_id(), v_journal_id, v_account_persediaan, '1-1200', 'Persediaan Barang', v_total_cogs, 0;
      INSERT INTO journal_lines (store_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT public.current_store_id(), v_journal_id, v_account_hpp, '5-5000', 'Harga Pokok Penjualan (HPP)', 0, v_total_cogs;
    END IF;
  END IF;
END;
$function$;

-- ============================================================================
-- C. VIEW: fix S1 + masking HPP
-- ============================================================================

-- ============================================================================
-- FIX S1: transaction_items_payment_summary tanpa security_invoker.
--
-- View lama berjalan sebagai owner -> melewati RLS sehingga user mana pun bisa
-- membaca item & pembayaran SEMUA toko. Selain itu ia masih memilih
-- `ti.user_id` (kolom sudah di-rename menjadi store_id di 0002) sehingga view
-- INVALID. Dibuat ulang dengan security_invoker = true.
--
-- Kolom `user_id` dipertahankan sebagai alias store_id agar interface frontend
-- (ItemPaymentSummary.user_id) tidak pecah; Fase 3 me-rename-nya.
-- ============================================================================
create or replace view public.transaction_items_payment_summary
with (security_invoker = true) as
select
  ti.id as item_id,
  ti.transaction_id,
  ti.store_id as user_id,
  ti.product_id,
  ti.product_name,
  ti.subtotal as item_total,
  coalesce(sum(tip.allocated_amount), 0) as paid_amount,
  ti.subtotal - coalesce(sum(tip.allocated_amount), 0) as remaining_amount,
  case
    when coalesce(sum(tip.allocated_amount), 0) >= ti.subtotal then 'lunas'
    when coalesce(sum(tip.allocated_amount), 0) > 0 then 'sebagian'
    else 'belum_bayar'
  end as payment_status
from public.transaction_items ti
left join public.transaction_item_payments tip on tip.item_id = ti.id
group by ti.id, ti.transaction_id, ti.store_id, ti.product_id, ti.product_name, ti.subtotal;

-- CREATE OR REPLACE tidak selalu menimpa reloption view; pastikan eksplisit.
alter view public.transaction_items_payment_summary set (security_invoker = true);

comment on view public.transaction_items_payment_summary is
  'Ringkasan pembayaran per item. security_invoker=true -> RLS tabel dasar berlaku (fix S1).';

revoke all on public.transaction_items_payment_summary from anon;
grant select on public.transaction_items_payment_summary to authenticated;

-- ============================================================================
-- v_products: masking HPP (price_buy & price_modal) untuk role tanpa hpp.read.
--
-- Keputusan (RBAC_PLAN §6): security_invoker = true. RLS `products_select`
-- tetap berlaku (isolasi tenant); `has_permission()` SECURITY DEFINER sehingga
-- CASE masking tetap bisa dievaluasi walau invoker tidak punya akses khusus.
--
-- RESIDUAL RISK (dicatat, ditutup di Fase 3): `authenticated` masih memegang
-- SELECT penuh pada tabel `public.products`, jadi user bertoken kasir masih
-- bisa membaca price_buy lewat query langsung ke tabel. Penutupnya: service
-- layer membaca v_products DAN grant kolom price_buy/price_modal dicabut dari
-- authenticated (butuh perubahan semua `select('*')` frontend).
-- ============================================================================
create or replace view public.v_products
with (security_invoker = true) as
select
  p.id,
  p.store_id,
  p.name,
  p.description,
  p.category_id,
  p.sku,
  p.barcode,
  p.image_url,
  p.is_active,
  p.price_sell,
  p.stock,
  p.minimum_stock,
  p.created_by,
  p.created_at,
  p.updated_at,
  case when (select public.has_permission('hpp.read')) then p.price_buy end as price_buy,
  case when (select public.has_permission('hpp.read')) then p.price_modal end as price_modal
from public.products p;

alter view public.v_products set (security_invoker = true);

comment on view public.v_products is
  'Produk dengan masking HPP: price_buy/price_modal hanya terisi bila user punya hpp.read.';

revoke all on public.v_products from anon;
grant select on public.v_products to authenticated;

-- ============================================================================
-- D. FK store_id -> stores(id) (cascade yang hilang di Fase 1)
-- ============================================================================

-- ============================================================================
-- E. FK store_id -> stores(id) ON DELETE CASCADE (celah Fase 1)
--
-- 0002 hanya menulis ulang FK yang sudah ada di baseline. 37 tabel bisnis
-- tidak pernah punya FK ke auth.users, jadi setelah rename juga tidak punya
-- FK ke stores. Akibatnya menghapus toko meninggalkan data yatim, padahal
-- plan §3.3 mewajibkan cascade untuk setiap tabel bisnis.
--
-- Idempoten: hanya menambah bila belum ada constraint-nya.
-- ============================================================================

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.attendance'::regclass
      and conname = 'attendance_store_id_fkey'
  ) then
    alter table public.attendance add constraint attendance_store_id_fkey
      foreign key (store_id) references public.stores(id) on delete cascade;
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.categories'::regclass
      and conname = 'categories_store_id_fkey'
  ) then
    alter table public.categories add constraint categories_store_id_fkey
      foreign key (store_id) references public.stores(id) on delete cascade;
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.chart_of_accounts'::regclass
      and conname = 'chart_of_accounts_store_id_fkey'
  ) then
    alter table public.chart_of_accounts add constraint chart_of_accounts_store_id_fkey
      foreign key (store_id) references public.stores(id) on delete cascade;
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.closing_periods'::regclass
      and conname = 'closing_periods_store_id_fkey'
  ) then
    alter table public.closing_periods add constraint closing_periods_store_id_fkey
      foreign key (store_id) references public.stores(id) on delete cascade;
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.customers'::regclass
      and conname = 'customers_store_id_fkey'
  ) then
    alter table public.customers add constraint customers_store_id_fkey
      foreign key (store_id) references public.stores(id) on delete cascade;
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.delivery_items'::regclass
      and conname = 'delivery_items_store_id_fkey'
  ) then
    alter table public.delivery_items add constraint delivery_items_store_id_fkey
      foreign key (store_id) references public.stores(id) on delete cascade;
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.delivery_orders'::regclass
      and conname = 'delivery_orders_store_id_fkey'
  ) then
    alter table public.delivery_orders add constraint delivery_orders_store_id_fkey
      foreign key (store_id) references public.stores(id) on delete cascade;
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.delivery_tracking'::regclass
      and conname = 'delivery_tracking_store_id_fkey'
  ) then
    alter table public.delivery_tracking add constraint delivery_tracking_store_id_fkey
      foreign key (store_id) references public.stores(id) on delete cascade;
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.employees'::regclass
      and conname = 'employees_store_id_fkey'
  ) then
    alter table public.employees add constraint employees_store_id_fkey
      foreign key (store_id) references public.stores(id) on delete cascade;
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.goods_receipts'::regclass
      and conname = 'goods_receipts_store_id_fkey'
  ) then
    alter table public.goods_receipts add constraint goods_receipts_store_id_fkey
      foreign key (store_id) references public.stores(id) on delete cascade;
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.grn_items'::regclass
      and conname = 'grn_items_store_id_fkey'
  ) then
    alter table public.grn_items add constraint grn_items_store_id_fkey
      foreign key (store_id) references public.stores(id) on delete cascade;
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.journal_entries'::regclass
      and conname = 'journal_entries_store_id_fkey'
  ) then
    alter table public.journal_entries add constraint journal_entries_store_id_fkey
      foreign key (store_id) references public.stores(id) on delete cascade;
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.journal_lines'::regclass
      and conname = 'journal_lines_store_id_fkey'
  ) then
    alter table public.journal_lines add constraint journal_lines_store_id_fkey
      foreign key (store_id) references public.stores(id) on delete cascade;
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.payrolls'::regclass
      and conname = 'payrolls_store_id_fkey'
  ) then
    alter table public.payrolls add constraint payrolls_store_id_fkey
      foreign key (store_id) references public.stores(id) on delete cascade;
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.pi_items'::regclass
      and conname = 'pi_items_store_id_fkey'
  ) then
    alter table public.pi_items add constraint pi_items_store_id_fkey
      foreign key (store_id) references public.stores(id) on delete cascade;
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.pi_payments'::regclass
      and conname = 'pi_payments_store_id_fkey'
  ) then
    alter table public.pi_payments add constraint pi_payments_store_id_fkey
      foreign key (store_id) references public.stores(id) on delete cascade;
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.po_items'::regclass
      and conname = 'po_items_store_id_fkey'
  ) then
    alter table public.po_items add constraint po_items_store_id_fkey
      foreign key (store_id) references public.stores(id) on delete cascade;
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.products'::regclass
      and conname = 'products_store_id_fkey'
  ) then
    alter table public.products add constraint products_store_id_fkey
      foreign key (store_id) references public.stores(id) on delete cascade;
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.purchase_invoices'::regclass
      and conname = 'purchase_invoices_store_id_fkey'
  ) then
    alter table public.purchase_invoices add constraint purchase_invoices_store_id_fkey
      foreign key (store_id) references public.stores(id) on delete cascade;
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.purchase_orders'::regclass
      and conname = 'purchase_orders_store_id_fkey'
  ) then
    alter table public.purchase_orders add constraint purchase_orders_store_id_fkey
      foreign key (store_id) references public.stores(id) on delete cascade;
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.purchase_return_items'::regclass
      and conname = 'purchase_return_items_store_id_fkey'
  ) then
    alter table public.purchase_return_items add constraint purchase_return_items_store_id_fkey
      foreign key (store_id) references public.stores(id) on delete cascade;
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.purchase_returns'::regclass
      and conname = 'purchase_returns_store_id_fkey'
  ) then
    alter table public.purchase_returns add constraint purchase_returns_store_id_fkey
      foreign key (store_id) references public.stores(id) on delete cascade;
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.return_items'::regclass
      and conname = 'return_items_store_id_fkey'
  ) then
    alter table public.return_items add constraint return_items_store_id_fkey
      foreign key (store_id) references public.stores(id) on delete cascade;
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.returns'::regclass
      and conname = 'returns_store_id_fkey'
  ) then
    alter table public.returns add constraint returns_store_id_fkey
      foreign key (store_id) references public.stores(id) on delete cascade;
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.stock_adjustments'::regclass
      and conname = 'stock_adjustments_store_id_fkey'
  ) then
    alter table public.stock_adjustments add constraint stock_adjustments_store_id_fkey
      foreign key (store_id) references public.stores(id) on delete cascade;
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.stock_alerts'::regclass
      and conname = 'stock_alerts_store_id_fkey'
  ) then
    alter table public.stock_alerts add constraint stock_alerts_store_id_fkey
      foreign key (store_id) references public.stores(id) on delete cascade;
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.stock_movements'::regclass
      and conname = 'stock_movements_store_id_fkey'
  ) then
    alter table public.stock_movements add constraint stock_movements_store_id_fkey
      foreign key (store_id) references public.stores(id) on delete cascade;
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.stock_opname_items'::regclass
      and conname = 'stock_opname_items_store_id_fkey'
  ) then
    alter table public.stock_opname_items add constraint stock_opname_items_store_id_fkey
      foreign key (store_id) references public.stores(id) on delete cascade;
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.stock_opnames'::regclass
      and conname = 'stock_opnames_store_id_fkey'
  ) then
    alter table public.stock_opnames add constraint stock_opnames_store_id_fkey
      foreign key (store_id) references public.stores(id) on delete cascade;
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.suppliers'::regclass
      and conname = 'suppliers_store_id_fkey'
  ) then
    alter table public.suppliers add constraint suppliers_store_id_fkey
      foreign key (store_id) references public.stores(id) on delete cascade;
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.transaction_item_payments'::regclass
      and conname = 'transaction_item_payments_store_id_fkey'
  ) then
    alter table public.transaction_item_payments add constraint transaction_item_payments_store_id_fkey
      foreign key (store_id) references public.stores(id) on delete cascade;
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.transaction_items'::regclass
      and conname = 'transaction_items_store_id_fkey'
  ) then
    alter table public.transaction_items add constraint transaction_items_store_id_fkey
      foreign key (store_id) references public.stores(id) on delete cascade;
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.transaction_payments'::regclass
      and conname = 'transaction_payments_store_id_fkey'
  ) then
    alter table public.transaction_payments add constraint transaction_payments_store_id_fkey
      foreign key (store_id) references public.stores(id) on delete cascade;
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.transactions'::regclass
      and conname = 'transactions_store_id_fkey'
  ) then
    alter table public.transactions add constraint transactions_store_id_fkey
      foreign key (store_id) references public.stores(id) on delete cascade;
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.trip_loaders'::regclass
      and conname = 'trip_loaders_store_id_fkey'
  ) then
    alter table public.trip_loaders add constraint trip_loaders_store_id_fkey
      foreign key (store_id) references public.stores(id) on delete cascade;
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.trips'::regclass
      and conname = 'trips_store_id_fkey'
  ) then
    alter table public.trips add constraint trips_store_id_fkey
      foreign key (store_id) references public.stores(id) on delete cascade;
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.vehicles'::regclass
      and conname = 'vehicles_store_id_fkey'
  ) then
    alter table public.vehicles add constraint vehicles_store_id_fkey
      foreign key (store_id) references public.stores(id) on delete cascade;
  end if;
end $$;

-- ============================================================================
-- E. GRANT / REVOKE
--
-- PENTING: fungsi yang baru dibuat otomatis mendapat EXECUTE untuk PUBLIC.
-- 0002 sudah mencabutnya; kalau tidak dicabut ulang di sini, anon bisa
-- memanggil semua RPC.
-- ============================================================================

revoke all on all functions in schema public from public;
revoke all on all functions in schema public from anon;
grant execute on all functions in schema public to authenticated;
grant execute on all functions in schema public to service_role;

-- Fungsi internal: hanya dipakai trigger SECURITY DEFINER, bukan RPC user.
revoke execute on function public.init_default_coa_for_store(uuid) from authenticated;
revoke execute on function public.handle_new_user() from authenticated;
