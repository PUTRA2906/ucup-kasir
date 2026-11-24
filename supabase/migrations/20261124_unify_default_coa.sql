-- ============================================================
-- Migration: Unifikasi Chart of Accounts Default
-- Tanggal: 2026-11-24
--
-- Masalah yang diperbaiki:
--   1. Signup tidak membuat COA sama sekali (trigger hanya insert
--      store_settings). COA baru muncul saat transaksi pertama.
--   2. init_default_coa_for_user() hanya membuat 7 akun, dan langsung
--      RETURN jika user sudah punya akun apa pun → tidak pernah
--      melengkapi akun yang kurang.
--   3. seed_default_accounts() membuat 16 akun dengan daftar berbeda
--      (3-3000) dibanding init_default_coa_for_user (3-1000).
--   4. Akibatnya: 2-2000, 2-2100, 3-3200, 5-5200 sering tidak ada →
--      jurnal purchasing/payroll/tutup buku hilang tanpa error.
--   5. Jurnal adjustment stok selalu gagal tersimpan karena
--      reference_type 'stock_adjustment' tidak ada di CHECK constraint.
--   6. create_stock_adjustment() mencatat stock_movements DUA KALI
--      (satu oleh trigger record_stock_movement, satu oleh RPC).
--   7. post_payroll_journal() mencari akun lewat nama, sehingga akun
--      custom yang salah tipe bisa terpilih lebih dulu.
--   8. Nama akun laba tidak seragam: backend menulis 'Laba Piutang' /
--      'Laba Direalisasi', sementara akun sistem lama ada yang bernama
--      'Laba Ditahan' / 'Laba Aktual'.
--   9. Masih ada fungsi mati init_default_coa_for_current_user() yang
--      memakai tipe akun tidak valid ('asset'/'revenue'/'expense').
--
-- Solusi:
--   1. Satu daftar 18 akun, dipakai oleh SEMUA jalur (signup,
--      transaksi pertama, modul Finance).
--   2. Idempotent via ON CONFLICT (user_id, code) DO NOTHING →
--      bisa melengkapi akun yang kurang, tidak menimpa yang ada.
--   3. Trigger signup memanggil init_default_coa_for_user().
--   4. Satukan kode modal: 3-1000 → 3-3000 (Modal Pemilik).
--   5. Backfill akun untuk seluruh user existing.
--   6. Tambah 'stock_adjustment' ke CHECK reference_type.
--   7. Hapus insert stock_movements ganda; trigger yang mencatat,
--      dengan reference_type/reference_id dari session setting.
--   8. Payroll: utamakan kode 5-5200 / 2-2100, fallback ke nama.
--   9. Perketat grant: fungsi init tidak lagi bisa dipanggil anon.
--  10. Hapus init_default_coa_for_current_user() yang sudah mati.
--
-- Daftar 18 akun (kode selaras dengan src/services/sqlite/finance.ts):
--   1-1000 Kas                          aset        debit
--   1-1010 Bank                         aset        debit
--   1-1100 Piutang Usaha                aset        debit
--   1-1200 Persediaan Barang Dagangan   aset        debit
--   2-2000 Utang Usaha                  kewajiban   kredit
--   2-2100 Hutang Gaji                  kewajiban   kredit
--   3-3000 Modal Pemilik                ekuitas     kredit
--   3-3100 Laba Piutang                 ekuitas     kredit
--   3-3200 Laba Direalisasi             ekuitas     kredit
--   4-4000 Pendapatan Penjualan         pendapatan  kredit
--   4-4100 Pendapatan Lainnya           pendapatan  kredit
--   5-5000 Harga Pokok Penjualan (HPP)  beban       debit
--   5-5100 Beban Operasional            beban       debit
--   5-5200 Beban Gaji                   beban       debit
--   5-5300 Beban Sewa                   beban       debit
--   5-5400 Beban Utilitas               beban       debit
--   5-5500 Beban Transportasi           beban       debit
--   5-5600 Beban Lainnya                beban       debit
--
-- Catatan: migrasi ini idempotent — aman dijalankan ulang.
-- ============================================================

-- ============================================================
-- 1. SATUKAN KODE MODAL: 3-1000 → 3-3000
-- ============================================================
-- Kondisi live (2026-11-24): 12 user punya 3-1000 (0 jurnal line),
-- 8 user punya 3-3000 (8 jurnal line), 7 user punya keduanya.
-- Jadi 3-3000 adalah akun yang benar-benar dipakai; 3-1000 mati.

-- 1a. Pindahkan jurnal yang masih memakai 3-1000 ke 3-3000
--     (aman: saat ini 0 baris, hanya jaga-jaga untuk data lain).
UPDATE journal_lines jl
SET account_id   = target.id,
    account_code = '3-3000',
    account_name = target.name
FROM chart_of_accounts src
JOIN chart_of_accounts target
  ON target.user_id = src.user_id
 AND target.code    = '3-3000'
WHERE jl.account_id = src.id
  AND src.code      = '3-1000';

-- 1b. Hapus 3-1000 untuk user yang sudah punya 3-3000
--     (hanya jika tidak dipakai jurnal maupun sebagai parent akun).
DELETE FROM chart_of_accounts c
WHERE c.code = '3-1000'
  AND EXISTS (
    SELECT 1 FROM chart_of_accounts d
    WHERE d.user_id = c.user_id AND d.code = '3-3000'
  )
  AND NOT EXISTS (SELECT 1 FROM journal_lines jl WHERE jl.account_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM chart_of_accounts ch WHERE ch.parent_id = c.id);

-- 1c. Rename 3-1000 → 3-3000 untuk user yang hanya punya 3-1000.
--     Nama custom user dipertahankan; hanya 'Modal' yang dirapikan.
UPDATE chart_of_accounts c
SET code       = '3-3000',
    name       = CASE WHEN c.name = 'Modal' THEN 'Modal Pemilik' ELSE c.name END,
    updated_at = now()
WHERE c.code = '3-1000'
  AND NOT EXISTS (
    SELECT 1 FROM chart_of_accounts d
    WHERE d.user_id = c.user_id AND d.code = '3-3000'
  );

-- Catatan: nama akun laba TIDAK diubah di sini. Backend live memakai
-- 3-3100 = 'Laba Piutang' (laba akrual, ditulis close_period) dan
-- 3-3200 = 'Laba Direalisasi' (ditulis auto_update_realized_profit).
-- Mirror SQLite masih memakai istilah "Laba Ditahan (Terealisasi/Belum)"
-- dengan pemetaan kode yang TERBALIK — itu bug terpisah (lihat bagian 11
-- dokumen PETA_AKUNTANSI), bukan bagian migrasi seed ini.

-- ============================================================
-- 2. FUNGSI UTAMA: init_default_coa_for_user() — 18 akun, idempotent
-- ============================================================
CREATE OR REPLACE FUNCTION init_default_coa_for_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Idempotent: hanya menambah yang belum ada, tidak menimpa yang ada.
  -- Tidak ada early-return agar akun yang kurang bisa dilengkapi.
  INSERT INTO chart_of_accounts
    (user_id, code, name, type, normal_balance, is_active, is_system)
  VALUES
    -- ASET
    (p_user_id, '1-1000', 'Kas',                         'aset',       'debit',  true, true),
    (p_user_id, '1-1010', 'Bank',                        'aset',       'debit',  true, true),
    (p_user_id, '1-1100', 'Piutang Usaha',               'aset',       'debit',  true, true),
    (p_user_id, '1-1200', 'Persediaan Barang Dagangan',  'aset',       'debit',  true, true),
    -- KEWAJIBAN
    (p_user_id, '2-2000', 'Utang Usaha',                 'kewajiban',  'kredit', true, true),
    (p_user_id, '2-2100', 'Hutang Gaji',                 'kewajiban',  'kredit', true, true),
    -- EKUITAS
    (p_user_id, '3-3000', 'Modal Pemilik',               'ekuitas',    'kredit', true, true),
    (p_user_id, '3-3100', 'Laba Piutang',                'ekuitas',    'kredit', true, true),
    (p_user_id, '3-3200', 'Laba Direalisasi',            'ekuitas',    'kredit', true, true),
    -- PENDAPATAN
    (p_user_id, '4-4000', 'Pendapatan Penjualan',        'pendapatan', 'kredit', true, true),
    (p_user_id, '4-4100', 'Pendapatan Lainnya',          'pendapatan', 'kredit', true, true),
    -- BEBAN
    (p_user_id, '5-5000', 'Harga Pokok Penjualan (HPP)', 'beban',      'debit',  true, true),
    (p_user_id, '5-5100', 'Beban Operasional',           'beban',      'debit',  true, true),
    (p_user_id, '5-5200', 'Beban Gaji',                  'beban',      'debit',  true, true),
    (p_user_id, '5-5300', 'Beban Sewa',                  'beban',      'debit',  true, true),
    (p_user_id, '5-5400', 'Beban Utilitas',              'beban',      'debit',  true, true),
    (p_user_id, '5-5500', 'Beban Transportasi',          'beban',      'debit',  true, true),
    (p_user_id, '5-5600', 'Beban Lainnya',               'beban',      'debit',  true, true)
  ON CONFLICT (user_id, code) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION init_default_coa_for_user(uuid) IS
'Inisialisasi/melengkapi COA default (18 akun) untuk user.
Idempotent via ON CONFLICT (user_id, code) DO NOTHING — aman dipanggil
berulang dan bisa melengkapi akun yang kurang tanpa menimpa yang ada.
Dipanggil saat signup, saat transaksi pertama, dan saat backfill.';

-- ============================================================
-- 3. seed_default_accounts() — delegasi ke satu sumber daftar
-- ============================================================
CREATE OR REPLACE FUNCTION seed_default_accounts()
RETURNS SETOF chart_of_accounts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Tidak ada sesi login';
  END IF;

  PERFORM init_default_coa_for_user(v_user_id);

  RETURN QUERY
  SELECT * FROM chart_of_accounts
  WHERE user_id = v_user_id
  ORDER BY code;
END;
$$;

COMMENT ON FUNCTION seed_default_accounts() IS
'Seed akun default untuk user yang sedang login.
Delegasi ke init_default_coa_for_user() agar daftar akun hanya ada satu sumber.';

-- ============================================================
-- 4. Trigger signup: buat store_settings + COA sekaligus
-- ============================================================
CREATE OR REPLACE FUNCTION create_default_store_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO store_settings (user_id, store_name, store_subtitle)
  VALUES (NEW.id, 'Ucup Kasir', 'Toko Berkat Jaya Makmur')
  ON CONFLICT (user_id) DO NOTHING;

  PERFORM init_default_coa_for_user(NEW.id);

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION create_default_store_settings() IS
'Auto-create store_settings dan COA default (18 akun) saat user baru signup.';

-- ============================================================
-- 5. record_stock_movement(): dukung reference dari pemanggil
-- ============================================================
-- Sebelumnya selalu menulis reference_type/reference_id NULL sehingga
-- 775/776 baris live tidak bisa ditelusuri ke dokumen sumber.
-- Sekarang pemanggil bisa men-set session variable app.stock_ref_type /
-- app.stock_ref_id sebelum UPDATE products. Saat ini baru
-- create_stock_adjustment yang memakainya; penjualan/GRN belum
-- (perlu migrasi lanjutan bila ingin ditelusuri penuh).
--
-- Nilai reference_type untuk stock_movements memakai 'adjustment'
-- (bukan 'stock_adjustment') agar konsisten dengan SQLite
-- (src/services/sqlite/stock.ts) dan label di StockMovements.vue.
-- Jurnal tetap memakai 'stock_adjustment' (lihat bagian 7).
CREATE OR REPLACE FUNCTION record_stock_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref_type text := NULLIF(current_setting('app.stock_ref_type', true), '');
  v_ref_id   uuid := NULLIF(current_setting('app.stock_ref_id',   true), '')::uuid;
BEGIN
  IF NEW.stock IS DISTINCT FROM OLD.stock THEN
    INSERT INTO stock_movements (
      user_id, product_id, movement_type, quantity,
      quantity_before, quantity_after,
      reference_type, reference_id, notes
    ) VALUES (
      NEW.user_id,
      NEW.id,
      CASE WHEN NEW.stock > OLD.stock THEN 'in' ELSE 'out' END,
      ABS(NEW.stock - OLD.stock),
      OLD.stock,
      NEW.stock,
      v_ref_type,
      v_ref_id,
      CASE WHEN v_ref_type IS NULL THEN 'Automatic stock movement' ELSE 'Stock adjustment' END
    );
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION record_stock_movement() IS
'Catat stock_movements saat products.stock berubah. Membaca reference
dari session setting app.stock_ref_type / app.stock_ref_id (opsional).
Nilai yang dipakai create_stock_adjustment: reference_type = ''adjustment''.';

-- ============================================================
-- 6. create_stock_adjustment(): 3-3000 + tanpa movement ganda
-- ============================================================
CREATE OR REPLACE FUNCTION create_stock_adjustment(
  p_product_id uuid,
  p_adjustment_type text,
  p_quantity_before integer,
  p_quantity_after integer,
  p_quantity_change integer,
  p_reason text,
  p_notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_adjustment_id uuid;
  v_product products%ROWTYPE;
  v_account_persediaan uuid;
  v_account_modal uuid;
  v_journal_id uuid;
  v_amount numeric;
BEGIN
  SELECT * INTO v_product
  FROM products
  WHERE id = p_product_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produk tidak ditemukan';
  END IF;

  INSERT INTO stock_adjustments (
    user_id, product_id, adjustment_type,
    quantity_before, quantity_after, quantity_change,
    reason, notes, created_at
  ) VALUES (
    auth.uid(), p_product_id, p_adjustment_type,
    p_quantity_before, p_quantity_after, p_quantity_change,
    p_reason, p_notes, now()
  )
  RETURNING id INTO v_adjustment_id;

  -- Trigger record_stock_movement yang mencatat stock_movements
  -- (JANGAN insert manual lagi — sebelumnya tercatat dua kali).
  PERFORM set_config('app.stock_ref_type', 'adjustment', true);
  PERFORM set_config('app.stock_ref_id',   v_adjustment_id::text, true);

  UPDATE products
  SET stock = p_quantity_after, updated_at = now()
  WHERE id = p_product_id AND user_id = auth.uid();

  PERFORM set_config('app.stock_ref_type', '', true);
  PERFORM set_config('app.stock_ref_id',   '', true);

  -- AUTO-JURNAL: kode modal terpadu 3-3000
  v_amount := ABS(p_quantity_change) * COALESCE(v_product.price_buy, 0);

  IF v_amount > 0 THEN
    SELECT id INTO v_account_persediaan
    FROM chart_of_accounts
    WHERE user_id = auth.uid() AND code = '1-1200';

    SELECT id INTO v_account_modal
    FROM chart_of_accounts
    WHERE user_id = auth.uid() AND code = '3-3000';

    IF v_account_persediaan IS NOT NULL AND v_account_modal IS NOT NULL THEN
      INSERT INTO journal_entries (user_id, entry_date, description, reference_type, reference_id)
      VALUES (
        auth.uid(), now(),
        'Adjustment Stok: ' || v_product.name || ' (' || p_reason || ')',
        'stock_adjustment', v_adjustment_id
      )
      RETURNING id INTO v_journal_id;

      IF p_quantity_change > 0 THEN
        INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
        VALUES
          (auth.uid(), v_journal_id, v_account_persediaan, '1-1200', 'Persediaan Barang Dagangan', v_amount, 0),
          (auth.uid(), v_journal_id, v_account_modal,      '3-3000', 'Modal Pemilik',              0, v_amount);
      ELSE
        INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
        VALUES
          (auth.uid(), v_journal_id, v_account_modal,      '3-3000', 'Modal Pemilik',              v_amount, 0),
          (auth.uid(), v_journal_id, v_account_persediaan, '1-1200', 'Persediaan Barang Dagangan', 0, v_amount);
      END IF;
    END IF;
  END IF;

  RETURN v_adjustment_id;
END;
$$;

COMMENT ON FUNCTION create_stock_adjustment IS
'Buat adjustment stok dengan auto-jurnal Dr/Cr Persediaan (1-1200) vs
Modal Pemilik (3-3000). Stock movement dicatat oleh trigger, bukan manual.';

-- ============================================================
-- 7. Izinkan reference_type = 'stock_adjustment'
-- ============================================================
ALTER TABLE journal_entries DROP CONSTRAINT IF EXISTS journal_entries_reference_type_check;
ALTER TABLE journal_entries ADD CONSTRAINT journal_entries_reference_type_check
  CHECK (reference_type = ANY (ARRAY[
    'manual', 'transaction', 'return', 'payment', 'void',
    'purchase', 'purchase_payment', 'purchase_return',
    'payroll', 'closing', 'reclassify', 'stock_adjustment'
  ]));

-- ============================================================
-- 8. post_payroll_journal(): utamakan kode akun, fallback nama
-- ============================================================
-- Versi lama mencari akun hanya lewat nama. User yang punya akun custom
-- "Hutang Gaji" bertipe salah (mis. 5-5700 tipe kewajiban/debit) bisa
-- terpilih lebih dulu karena ORDER BY created_at. Sekarang kode dulu.
CREATE OR REPLACE FUNCTION post_payroll_journal(
  p_payroll_id uuid
) RETURNS payrolls
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_payroll RECORD;
  v_journal_id uuid;
  v_journal_number TEXT;
  v_expense_account uuid;
  v_liability_account uuid;
  v_result payrolls;
BEGIN
  v_user_id := auth.uid();

  SELECT p.*, e.name AS employee_name
  INTO v_payroll
  FROM payrolls p
  JOIN employees e ON e.id = p.employee_id
  WHERE p.id = p_payroll_id AND p.user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Slip gaji tidak ditemukan';
  END IF;

  IF v_payroll.status = 'paid' THEN
    RAISE EXCEPTION 'Slip gaji sudah dibayar';
  END IF;

  IF v_payroll.total_net <= 0 THEN
    RAISE EXCEPTION 'Gaji bersih harus lebih dari 0';
  END IF;

  -- Akun beban gaji: utamakan 5-5200, fallback ke pencarian nama
  SELECT id INTO v_expense_account
  FROM chart_of_accounts
  WHERE user_id = v_user_id AND code = '5-5200';

  IF v_expense_account IS NULL THEN
    SELECT id INTO v_expense_account
    FROM chart_of_accounts
    WHERE user_id = v_user_id
      AND type = 'beban'
      AND COALESCE(is_active, true)
      AND (LOWER(name) LIKE '%gaji%' OR LOWER(name) LIKE '%salary%')
    ORDER BY created_at
    LIMIT 1;
  END IF;

  IF v_expense_account IS NULL THEN
    RAISE EXCEPTION 'Akun biaya gaji tidak ditemukan. Buat dulu akun dengan tipe Beban dan nama mengandung "Gaji"';
  END IF;

  -- Akun hutang gaji: utamakan 2-2100, fallback ke pencarian nama
  SELECT id INTO v_liability_account
  FROM chart_of_accounts
  WHERE user_id = v_user_id AND code = '2-2100';

  IF v_liability_account IS NULL THEN
    SELECT id INTO v_liability_account
    FROM chart_of_accounts
    WHERE user_id = v_user_id
      AND type = 'kewajiban'
      AND COALESCE(is_active, true)
      AND LOWER(name) LIKE '%hutang%'
      AND LOWER(name) LIKE '%gaji%'
    ORDER BY created_at
    LIMIT 1;
  END IF;

  IF v_liability_account IS NULL THEN
    RAISE EXCEPTION 'Akun hutang gaji tidak ditemukan. Buat dulu akun dengan tipe Kewajiban dan nama mengandung "Hutang Gaji"';
  END IF;

  v_journal_number := 'JV-' || to_char(now(), 'YYYYMMDD') || '-' || LPAD(
    (SELECT COUNT(*) + 1 FROM journal_entries WHERE user_id = v_user_id)::TEXT,
    4, '0'
  );

  v_journal_id := gen_random_uuid();

  INSERT INTO journal_entries (
    id, user_id, journal_number, entry_date,
    description, reference_type, reference_id,
    created_at, updated_at
  ) VALUES (
    v_journal_id, v_user_id, v_journal_number, CURRENT_DATE,
    'Pembayaran gaji ' || v_payroll.employee_name || ' periode ' ||
      v_payroll.period_start || ' s/d ' || v_payroll.period_end,
    'payroll', p_payroll_id,
    now(), now()
  );

  -- Debit: Beban Gaji
  INSERT INTO journal_lines (
    id, user_id, journal_id, account_id,
    account_code, account_name,
    debit, credit, created_at
  )
  SELECT
    gen_random_uuid(), v_user_id, v_journal_id, v_expense_account,
    coa.code, coa.name,
    v_payroll.total_net, 0, now()
  FROM chart_of_accounts coa
  WHERE coa.id = v_expense_account;

  -- Credit: Hutang Gaji
  INSERT INTO journal_lines (
    id, user_id, journal_id, account_id,
    account_code, account_name,
    debit, credit, created_at
  )
  SELECT
    gen_random_uuid(), v_user_id, v_journal_id, v_liability_account,
    coa.code, coa.name,
    0, v_payroll.total_net, now()
  FROM chart_of_accounts coa
  WHERE coa.id = v_liability_account;

  UPDATE payrolls
  SET status = 'paid',
      journal_entry_id = v_journal_id,
      paid_at = now(),
      updated_at = now()
  WHERE id = p_payroll_id
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION post_payroll_journal(uuid) IS
'Post jurnal slip gaji: Dr Beban Gaji (5-5200) / Cr Hutang Gaji (2-2100).
Fallback ke pencarian nama bila kode akun tidak ada.';

-- ============================================================
-- 9. BACKFILL: lengkapi COA seluruh user existing
-- ============================================================
DO $$
DECLARE
  v_user_id uuid;
  v_before integer;
  v_after integer;
  v_users integer := 0;
BEGIN
  FOR v_user_id IN SELECT id FROM auth.users LOOP
    SELECT COUNT(*) INTO v_before FROM chart_of_accounts WHERE user_id = v_user_id;

    PERFORM init_default_coa_for_user(v_user_id);

    SELECT COUNT(*) INTO v_after FROM chart_of_accounts WHERE user_id = v_user_id;

    IF v_after > v_before THEN
      v_users := v_users + 1;
      RAISE NOTICE 'User %: % -> % akun', v_user_id, v_before, v_after;
    END IF;
  END LOOP;

  RAISE NOTICE 'Backfill selesai: % user dilengkapi', v_users;
END;
$$;

-- ============================================================
-- 10. HAK AKSES
-- ============================================================
-- Default Postgres memberi EXECUTE ke PUBLIC (termasuk anon).
-- init_default_coa_for_user(uuid) menerima user_id sembarang, jadi
-- jangan biarkan anon/authenticated memanggilnya langsung.
-- Fungsi SECURITY DEFINER yang memanggilnya tetap bisa karena
-- berjalan sebagai owner (postgres).
REVOKE ALL ON FUNCTION init_default_coa_for_user(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION init_default_coa_for_user(uuid) TO service_role;

REVOKE ALL ON FUNCTION seed_default_accounts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION seed_default_accounts() TO authenticated, service_role;

REVOKE ALL ON FUNCTION create_stock_adjustment(uuid, text, integer, integer, integer, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_stock_adjustment(uuid, text, integer, integer, integer, text, text)
  TO authenticated, service_role;

-- ============================================================
-- 11. HAPUS FUNGSI COA LAMA YANG MATI
-- ============================================================
-- init_default_coa_for_current_user() tidak dipakai trigger maupun
-- aplikasi, dan isinya sudah tidak valid: memakai tipe 'asset'/'revenue'
-- /'expense' (melanggar CHECK chart_of_accounts_type_check) serta kode
-- 1-1020 / 1-1030 / 4-1000 / 5-1000 yang tidak dikenal modul lain.
-- Bila tidak sengaja dipanggil, fungsi ini hanya akan error.
DROP FUNCTION IF EXISTS init_default_coa_for_current_user();
