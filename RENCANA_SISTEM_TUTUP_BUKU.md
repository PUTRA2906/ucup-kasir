# Rencana Sistem Tutup Buku (Closing Period)

**Proyek:** Ucup Kasir  
**Tanggal:** 16 September 2026  
**Status:** Rencana Draft

---

## 1. Ringkasan Eksekutif

Sistem tutup buku adalah fitur untuk **mengunci periode akuntansi** agar tidak ada transaksi yang bisa diubah atau dihapus setelah periode tersebut ditutup. Fitur ini penting untuk menjaga integritas laporan keuangan, audit trail, dan kepatuhan terhadap praktik akuntansi yang baik.

### Manfaat Utama
- ✅ **Integritas Data Keuangan** — Mencegah manipulasi laporan yang sudah final
- ✅ **Audit Trail Jelas** — Laporan periode lalu tidak akan berubah
- ✅ **Kepatuhan Akuntansi** — Sesuai praktik akuntansi standar (periode harus ditutup sebelum laporan diserahkan)
- ✅ **Performa Lebih Cepat** — Laporan periode tertutup menggunakan snapshot (tidak perlu hitung ulang)
- ✅ **Fleksibilitas** — Bisa dibuka kembali (reopen) jika ada kesalahan

---

## 2. Arsitektur Sistem

### 2.1 Database Schema

#### Tabel Baru: `closing_periods`

Tabel ini menyimpan informasi periode yang sudah ditutup beserta snapshot saldo akun.

```sql
CREATE TABLE closing_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  
  -- Periode waktu
  period_start date NOT NULL,           -- Tanggal awal periode (misal: 2026-09-01)
  period_end date NOT NULL,             -- Tanggal akhir periode (misal: 2026-09-30)
  
  -- Metadata penutupan
  closed_at timestamptz NOT NULL DEFAULT now(),  -- Waktu penutupan
  closed_by uuid NOT NULL DEFAULT auth.uid(),    -- User yang menutup
  notes text,                           -- Catatan penutupan (opsional)
  status text NOT NULL DEFAULT 'closed' CHECK (status IN ('closed', 'reopened')),
  
  -- Snapshot data
  snapshot_balances jsonb,              -- Array saldo semua akun saat ditutup
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT unique_period UNIQUE(user_id, period_start, period_end),
  CONSTRAINT valid_period CHECK (period_end >= period_start)
);

CREATE INDEX idx_closing_periods_user ON closing_periods(user_id, period_end DESC);
CREATE INDEX idx_closing_periods_status ON closing_periods(status);
```

**Kolom Penting:**
- `period_start` & `period_end` — Range tanggal periode yang dikunci
- `status` — 'closed' (aktif dikunci) atau 'reopened' (dibuka kembali)
- `snapshot_balances` — JSONB berisi array saldo semua akun per akhir periode (untuk performa)

### 2.2 Fungsi SQL

#### Fungsi Helper: `check_period_closed()`

Fungsi untuk mengecek apakah tanggal transaksi masuk dalam periode yang sudah ditutup.

```sql
CREATE OR REPLACE FUNCTION check_period_closed(p_date date, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;
```

#### Fungsi Utama: `close_period()`

Fungsi untuk menutup periode dengan validasi dan snapshot saldo.

```sql
CREATE OR REPLACE FUNCTION close_period(
  p_period_start date,
  p_period_end date,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_closing_id uuid;
  v_balances jsonb;
BEGIN
  -- 1. Validasi: Periode tidak boleh overlap dengan periode tertutup lainnya
  IF EXISTS(
    SELECT 1 FROM closing_periods
    WHERE user_id = v_user_id
      AND status = 'closed'
      AND (
        (p_period_start >= period_start AND p_period_start <= period_end) OR
        (p_period_end >= period_start AND p_period_end <= period_end) OR
        (p_period_start <= period_start AND p_period_end >= period_end)
      )
  ) THEN
    RAISE EXCEPTION 'Periode ini overlap dengan periode yang sudah ditutup.';
  END IF;
  
  -- 2. Hitung saldo semua akun sampai akhir periode (snapshot)
  SELECT jsonb_agg(
    jsonb_build_object(
      'account_id', account_id,
      'account_code', account_code,
      'account_name', account_name,
      'account_type', account_type,
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
      COALESCE(SUM(
        CASE 
          WHEN coa.normal_balance = 'debit' THEN jl.debit - jl.credit
          ELSE jl.credit - jl.debit
        END
      ), 0) as balance
    FROM chart_of_accounts coa
    LEFT JOIN journal_lines jl ON jl.account_id = coa.id
    LEFT JOIN journal_entries je ON je.id = jl.journal_id
    WHERE coa.user_id = v_user_id
      AND coa.is_active = true
      AND (je.id IS NULL OR (
        je.status = 'posted' 
        AND je.entry_date::date <= p_period_end
      ))
    GROUP BY coa.id, coa.code, coa.name, coa.type, coa.normal_balance
  ) balances;
  
  -- 3. Insert closing period
  INSERT INTO closing_periods (
    user_id,
    period_start,
    period_end,
    closed_by,
    notes,
    snapshot_balances,
    status
  ) VALUES (
    v_user_id,
    p_period_start,
    p_period_end,
    v_user_id,
    p_notes,
    v_balances,
    'closed'
  )
  RETURNING id INTO v_closing_id;
  
  RETURN v_closing_id;
END;
$$;
```

#### Fungsi: `reopen_period()`

Fungsi untuk membuka kembali periode yang sudah ditutup.

```sql
CREATE OR REPLACE FUNCTION reopen_period(p_closing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  -- Validasi: Hanya bisa reopen milik sendiri
  IF NOT EXISTS(
    SELECT 1 FROM closing_periods
    WHERE id = p_closing_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Periode tidak ditemukan atau bukan milik Anda.';
  END IF;
  
  -- Update status jadi reopened
  UPDATE closing_periods
  SET status = 'reopened',
      updated_at = now()
  WHERE id = p_closing_id;
END;
$$;
```

### 2.3 Trigger: Blokir Transaksi di Periode Tertutup

Trigger ini akan mencegah INSERT/UPDATE/DELETE pada tabel transaksi jika tanggal masuk dalam periode tertutup.

#### Tabel yang Perlu Dilindungi

1. **`journal_entries`** — Jurnal umum (manual & otomatis)
2. **`transactions`** — Transaksi penjualan
3. **`transaction_payments`** — Pembayaran cicilan
4. **`returns`** — Retur produk
5. **`stock_movements`** — Mutasi stok manual
6. **`purchasing_orders`** — Purchase order
7. **`goods_receipt_notes`** — Penerimaan barang (GRN)
8. **`purchase_invoices`** — Invoice pembelian
9. **`hr_payroll_slips`** — Slip gaji
10. **`delivery_orders`** — Surat jalan

#### Contoh Trigger untuk `journal_entries`

```sql
CREATE OR REPLACE FUNCTION prevent_closed_period_journal()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Skip untuk operasi void (status = 'void')
  IF TG_OP = 'UPDATE' AND NEW.status = 'void' THEN
    RETURN NEW;
  END IF;
  
  -- Cek periode tertutup
  IF check_period_closed(NEW.entry_date::date, NEW.user_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah jurnal di periode yang sudah ditutup (%).',
      NEW.entry_date::date;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_closed_period_journal
BEFORE INSERT OR UPDATE ON journal_entries
FOR EACH ROW EXECUTE FUNCTION prevent_closed_period_journal();
```

**Catatan:** Trigger serupa perlu dibuat untuk semua 10 tabel di atas. Untuk tabel yang menggunakan `created_at` sebagai timestamp transaksi (bukan kolom tanggal eksplisit), gunakan `created_at::date` untuk pengecekan.

---

## 3. Backend: Service Layer

### 3.1 TypeScript Types

Tambahkan di `src/types/database.ts`:

```typescript
// Closing Period Types
export interface ClosingPeriod {
  id: string
  user_id?: string
  period_start: string  // 'YYYY-MM-DD'
  period_end: string    // 'YYYY-MM-DD'
  closed_at: string     // ISO timestamp
  closed_by: string     // user_id
  notes?: string
  status: 'closed' | 'reopened'
  snapshot_balances?: AccountBalance[]  // JSON parsed
  created_at: string
  updated_at: string
}

export interface ClosePeriodInput {
  period_start: string  // 'YYYY-MM-DD'
  period_end: string    // 'YYYY-MM-DD'
  notes?: string
}

export interface ReopenPeriodInput {
  closing_id: string
}
```

### 3.2 Service: `financeService`

Tambahkan fungsi di `src/services/finance.ts`:

```typescript
// Di dalam export const financeService = { ... }

// ============================================================
// Tutup Buku (Closing Period)
// ============================================================

async getClosingPeriods(): Promise<ClosingPeriod[]> {
  const { data, error } = await supabase
    .from('closing_periods')
    .select('*')
    .order('period_end', { ascending: false })
  
  if (error) throw error
  
  // Parse snapshot_balances dari JSONB ke array
  return (data || []).map(cp => ({
    ...cp,
    snapshot_balances: cp.snapshot_balances 
      ? (Array.isArray(cp.snapshot_balances) 
          ? cp.snapshot_balances 
          : [])
      : []
  }))
}

async getClosingPeriod(id: string): Promise<ClosingPeriod | null> {
  const { data, error } = await supabase
    .from('closing_periods')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  
  return data ? {
    ...data,
    snapshot_balances: data.snapshot_balances 
      ? (Array.isArray(data.snapshot_balances) 
          ? data.snapshot_balances 
          : [])
      : []
  } : null
}

async closePeriod(input: ClosePeriodInput): Promise<string> {
  const { data, error } = await supabase.rpc('close_period', {
    p_period_start: input.period_start,
    p_period_end: input.period_end,
    p_notes: input.notes || null
  })
  
  if (error) throw error
  return data as string  // closing_id
}

async reopenPeriod(closingId: string): Promise<void> {
  const { error } = await supabase.rpc('reopen_period', {
    p_closing_id: closingId
  })
  
  if (error) throw error
}

async checkPeriodClosed(date: string): Promise<boolean> {
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) return false
  
  const { data, error } = await supabase.rpc('check_period_closed', {
    p_date: date,
    p_user_id: user.user.id
  })
  
  if (error) throw error
  return data as boolean
}
```

---

## 4. Frontend: UI Components

### 4.1 Halaman: Daftar Tutup Buku

**Path:** `src/views/Finance/ClosingPeriods.vue`

**Fitur:**
- List semua periode yang pernah ditutup (tabel responsif)
- Badge status: `Closed` (hijau) atau `Reopened` (abu-abu)
- Button **"Tutup Periode Baru"** (floating action button di mobile)
- Filter per status (Closed / Reopened / Semua)
- Aksi per baris:
  - **Lihat Snapshot** — Modal menampilkan saldo akun saat ditutup
  - **Reopen** — Buka kembali periode (dengan konfirmasi)
  - **Cetak Laporan** — Cetak neraca/laba rugi periode tertutup (dari snapshot)

**Layout Mobile:**
- Card layout (bukan tabel) untuk mobile
- 2 kolom grid untuk statistik ringkasan
- Dropdown filter di header

### 4.2 Modal: Form Tutup Periode

**Komponen:** `src/components/finance/ClosePeriodModal.vue`

**Field Input:**
1. **Periode Mulai** — DateField (date-only, gunakan custom DateField)
2. **Periode Akhir** — DateField (date-only, gunakan custom DateField)
3. **Catatan** — Textarea (opsional, placeholder: "Tutup buku bulan Agustus 2026")

**Validasi:**
- Periode akhir harus >= periode mulai
- Tidak boleh overlap dengan periode tertutup lainnya (validasi di backend)
- Tidak boleh ada periode reopened di range yang sama

**Preview Saldo:**
- Setelah user pilih tanggal, tampilkan preview saldo akun (query dari `getAccountBalances(period_end)`)
- Tabel dengan kolom: Kode Akun, Nama Akun, Tipe, Saldo
- Highlight akun dengan saldo besar (aset, kewajiban, ekuitas)

**Button Aksi:**
- **Tutup Periode** (primary, dengan konfirmasi useConfirm)
- **Batal** (secondary)

### 4.3 Modal: Lihat Snapshot Saldo

**Komponen:** `src/components/finance/SnapshotBalanceModal.vue`

**Konten:**
- Header: Periode (misal: "1 Sep 2026 - 30 Sep 2026")
- Tabel saldo akun dari `snapshot_balances` (sudah tersimpan di JSONB)
- Kolom: Kode Akun, Nama Akun, Tipe, Saldo
- Grouping per tipe akun (Aset, Kewajiban, Ekuitas, Pendapatan, Beban)
- Total per grup
- Button **Cetak PDF** (export ke PDF menggunakan `usePdfExport`)

### 4.4 Notifikasi di Finance Dashboard

**Update:** `src/views/Finance/FinanceDashboard.vue`

Tambahkan indikator di bagian atas dashboard:

```vue
<!-- Indikator Periode Tertutup -->
<div v-if="lastClosedPeriod" class="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-500/30 dark:bg-blue-500/10">
  <div class="flex items-center gap-2">
    <svg class="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <div>
      <p class="text-sm font-semibold text-blue-900 dark:text-blue-100">
        Periode Terakhir Ditutup: {{ formatPeriod(lastClosedPeriod) }}
      </p>
      <p class="text-xs text-blue-700 dark:text-blue-300">
        Transaksi dalam periode ini tidak dapat diubah.
      </p>
    </div>
  </div>
</div>

<!-- Warning: Transaksi Lama Belum Masuk Periode Tertutup -->
<div v-if="hasOldTransactions" class="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
  <div class="flex items-center gap-2">
    <svg class="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
    <div>
      <p class="text-sm font-semibold text-amber-900 dark:text-amber-100">
        Ada transaksi > 30 hari yang belum masuk periode tertutup
      </p>
      <router-link 
        to="/finance/closing-periods"
        class="text-xs text-amber-700 underline dark:text-amber-300"
      >
        Tutup periode sekarang →
      </router-link>
    </div>
  </div>
</div>
```

### 4.5 Routing

Tambahkan di `src/router/index.ts`:

```typescript
{
  path: '/finance/closing-periods',
  name: 'ClosingPeriods',
  component: () => import('@/views/Finance/ClosingPeriods.vue'),
  meta: { requiresAuth: true, title: 'Tutup Buku' }
}
```

### 4.6 Quick Menu

Tambahkan item di `src/data/quickMenu.ts`:

```typescript
// Di dalam grup "Keuangan"
{
  id: 'closing-periods',
  title: 'Tutup Buku',
  description: 'Kunci periode akuntansi',
  icon: 'lock',
  path: '/finance/closing-periods',
  color: 'purple'
}
```

---

## 5. Flow Kerja User (User Journey)

### Skenario 1: Tutup Periode Normal (Akhir Bulan)

**Tanggal:** 30 September 2026 (akhir bulan)

1. User masuk ke **Finance → Tutup Buku**
2. Klik button **"Tutup Periode Baru"** (floating button di kanan bawah)
3. Modal form muncul:
   - Pilih **Periode Mulai:** 1 September 2026
   - Pilih **Periode Akhir:** 30 September 2026
   - (Opsional) Isi **Catatan:** "Tutup buku bulan September 2026"
4. Sistem menampilkan **Preview Saldo Akun** per 30 September 2026:
   ```
   Aset
   - 1-1000 Kas         Rp 50.000.000
   - 1-1010 Bank BCA    Rp 120.000.000
   - 1-2000 Piutang     Rp 30.000.000
   
   Kewajiban
   - 2-1000 Utang Usaha Rp 15.000.000
   
   ... dst
   ```
5. User review preview, lalu klik **"Tutup Periode"**
6. Konfirmasi muncul (useConfirm):
   ```
   Tutup periode 1 Sep - 30 Sep 2026?
   
   Setelah ditutup, semua transaksi dalam periode ini
   tidak dapat diubah atau dihapus.
   
   [Batal] [Ya, Tutup Periode]
   ```
7. User klik **"Ya, Tutup Periode"**
8. Sistem:
   - Panggil `financeService.closePeriod()`
   - Simpan snapshot saldo ke `closing_periods.snapshot_balances`
   - Set status = 'closed'
9. Toast sukses muncul: "Periode 1 Sep - 30 Sep 2026 berhasil ditutup"
10. List periode di-refresh, periode baru muncul dengan badge **"Closed"** (hijau)

**Setelah Ditutup:**
- Semua transaksi dengan tanggal **1-30 September 2026** tidak bisa diubah/dihapus
- Jika user coba edit transaksi September, trigger akan blokir dengan error:
  ```
  Error: Tidak dapat mengubah jurnal di periode yang sudah ditutup (2026-09-15).
  ```
- User masih bisa buat transaksi **Oktober 2026** (periode terbuka)

### Skenario 2: Reopen Periode (Ada Kesalahan)

**Situasi:** User lupa input transaksi tanggal 25 September 2026 sebelum tutup buku.

1. User masuk ke **Finance → Tutup Buku**
2. Cari periode **1 Sep - 30 Sep 2026** dengan status **"Closed"**
3. Klik icon **⋮** (menu aksi) → **"Buka Kembali"**
4. Konfirmasi muncul:
   ```
   Buka kembali periode 1 Sep - 30 Sep 2026?
   
   Transaksi dalam periode ini akan bisa diubah kembali.
   Anda perlu tutup ulang periode ini setelah selesai.
   
   [Batal] [Ya, Buka Kembali]
   ```
5. User klik **"Ya, Buka Kembali"**
6. Sistem:
   - Panggil `financeService.reopenPeriod(closing_id)`
   - Update status = 'reopened'
7. Toast sukses: "Periode berhasil dibuka kembali"
8. Badge berubah jadi **"Reopened"** (abu-abu)
9. User sekarang bisa input/edit transaksi September:
   - Input transaksi yang terlupa (tanggal 25 September)
   - Edit transaksi lain jika ada kesalahan
10. Setelah selesai, user **tutup ulang** periode September:
    - Klik **"Tutup Periode Baru"** lagi
    - Pilih periode yang sama (1-30 September)
    - Sistem hitung ulang snapshot saldo (sudah termasuk transaksi baru)
    - Status kembali jadi 'closed'

### Skenario 3: Lihat Snapshot Saldo Periode Tertutup

**Situasi:** User ingin cek saldo akun bulan September yang sudah ditutup.

1. User masuk ke **Finance → Tutup Buku**
2. Cari periode **1 Sep - 30 Sep 2026** dengan status **"Closed"**
3. Klik icon **👁️** (lihat) atau button **"Lihat Snapshot"**
4. Modal muncul dengan tabel saldo akun:
   ```
   Periode: 1 September - 30 September 2026
   Ditutup: 30 September 2026, 23:45 WIB
   
   === ASET ===
   1-1000 Kas                 Rp 50.000.000
   1-1010 Bank BCA            Rp 120.000.000
   1-2000 Piutang Usaha       Rp 30.000.000
   Total Aset                 Rp 200.000.000
   
   === KEWAJIBAN ===
   2-1000 Utang Usaha         Rp 15.000.000
   Total Kewajiban            Rp 15.000.000
   
   === EKUITAS ===
   3-1000 Modal Pemilik       Rp 185.000.000
   Total Ekuitas              Rp 185.000.000
   
   ... dst
   ```
5. User bisa:
   - Scroll untuk lihat semua akun
   - Klik **"Cetak PDF"** untuk download laporan
   - Klik **"Tutup"** untuk keluar modal

**Keuntungan Snapshot:**
- Saldo akun **tidak perlu dihitung ulang** (sudah tersimpan di JSONB)
- Laporan periode tertutup **lebih cepat** ditampilkan
- Meskipun ada transaksi baru di bulan berikutnya, **saldo September tetap sama** (immutable)

---

## 6. Implementasi: Task Breakdown

### Phase 1: Database Migration (Prioritas Tertinggi)

**File:** `supabase/migrations/20260916_closing_periods.sql`

**Task:**
1. ✅ Buat tabel `closing_periods` dengan schema lengkap
2. ✅ Buat fungsi `check_period_closed()`
3. ✅ Buat fungsi `close_period()` dengan validasi & snapshot
4. ✅ Buat fungsi `reopen_period()`
5. ✅ Buat trigger `prevent_closed_period_journal()` untuk `journal_entries`
6. ✅ Buat trigger serupa untuk 9 tabel lainnya:
   - `transactions`
   - `transaction_payments`
   - `returns`
   - `stock_movements`
   - `purchasing_orders`
   - `goods_receipt_notes`
   - `purchase_invoices`
   - `hr_payroll_slips`
   - `delivery_orders`
7. ✅ Setup RLS policies untuk `closing_periods`

**Estimasi:** 3-4 jam

### Phase 2: Backend Service Layer

**File:** `src/services/finance.ts` & `src/types/database.ts`

**Task:**
1. ✅ Tambahkan TypeScript types di `database.ts`:
   - `ClosingPeriod`
   - `ClosePeriodInput`
   - `ReopenPeriodInput`
2. ✅ Tambahkan fungsi service di `finance.ts`:
   - `getClosingPeriods()`
   - `getClosingPeriod(id)`
   - `closePeriod(input)`
   - `reopenPeriod(closingId)`
   - `checkPeriodClosed(date)`

**Estimasi:** 1-2 jam

### Phase 3: Frontend Components

#### 3.1 Halaman Utama

**File:** `src/views/Finance/ClosingPeriods.vue`

**Task:**
1. ✅ Buat layout halaman dengan header & breadcrumb
2. ✅ Buat tabel list periode (desktop) dan card (mobile)
3. ✅ Implementasi filter per status (Closed/Reopened/Semua)
4. ✅ Implementasi badge status dengan warna (hijau/abu-abu)
5. ✅ Buat dropdown aksi per baris:
   - Lihat Snapshot
   - Reopen (dengan konfirmasi)
   - Cetak Laporan (PDF)
6. ✅ Buat floating action button "Tutup Periode Baru" (mobile)

**Estimasi:** 4-5 jam

#### 3.2 Modal Form Tutup Periode

**File:** `src/components/finance/ClosePeriodModal.vue`

**Task:**
1. ✅ Buat form dengan field:
   - DateField untuk periode mulai & akhir
   - Textarea untuk catatan
2. ✅ Validasi client-side (tanggal akhir >= mulai)
3. ✅ Preview saldo akun (query `getAccountBalances`)
4. ✅ Implementasi submit dengan konfirmasi (useConfirm)
5. ✅ Handle error dari backend (overlap periode, dll)
6. ✅ Toast notifikasi sukses/gagal (useToast)

**Estimasi:** 3-4 jam

#### 3.3 Modal Lihat Snapshot

**File:** `src/components/finance/SnapshotBalanceModal.vue`

**Task:**
1. ✅ Tampilkan header periode & tanggal tutup
2. ✅ Tampilkan tabel saldo akun dari snapshot JSONB
3. ✅ Grouping per tipe akun dengan subtotal
4. ✅ Button cetak PDF (gunakan `usePdfExport`)

**Estimasi:** 2-3 jam

#### 3.4 Update Finance Dashboard

**File:** `src/views/Finance/FinanceDashboard.vue`

**Task:**
1. ✅ Tambahkan indikator periode terakhir yang ditutup
2. ✅ Tambahkan warning jika ada transaksi > 30 hari yang belum masuk periode tertutup
3. ✅ Link ke halaman Tutup Buku dari warning

**Estimasi:** 1-2 jam

### Phase 4: Routing & Navigation

**File:** `src/router/index.ts` & `src/data/quickMenu.ts`

**Task:**
1. ✅ Tambahkan route `/finance/closing-periods`
2. ✅ Tambahkan menu "Tutup Buku" di Quick Menu grup Keuangan
3. ✅ Tambahkan link di sidebar Finance (jika ada)

**Estimasi:** 30 menit

### Phase 5: Testing & Bug Fixing

**Task:**
1. ✅ Test tutup periode normal (golden path)
2. ✅ Test validasi overlap periode
3. ✅ Test trigger blokir transaksi di periode tertutup
4. ✅ Test reopen periode
5. ✅ Test snapshot saldo (hitung ulang saat tutup ulang)
6. ✅ Test cetak PDF snapshot
7. ✅ Test responsiveness mobile (card layout, dropdown filter)
8. ✅ Test edge cases:
   - Periode 1 hari (start = end)
   - Tutup periode tanpa transaksi (saldo semua 0)
   - Reopen → edit transaksi → tutup ulang (snapshot berubah)

**Estimasi:** 3-4 jam

---

## 7. Total Estimasi Waktu

| Phase | Task | Estimasi |
|-------|------|----------|
| 1 | Database Migration | 3-4 jam |
| 2 | Backend Service Layer | 1-2 jam |
| 3.1 | Halaman Utama | 4-5 jam |
| 3.2 | Modal Form | 3-4 jam |
| 3.3 | Modal Snapshot | 2-3 jam |
| 3.4 | Update Dashboard | 1-2 jam |
| 4 | Routing & Navigation | 30 menit |
| 5 | Testing & Bug Fixing | 3-4 jam |
| **TOTAL** | | **18-25 jam** |

**Estimasi real (dengan buffer):** 3-4 hari kerja (8 jam/hari)

---

## 8. Risiko & Mitigasi

### Risiko 1: Trigger Memblokir Operasi Valid

**Deskripsi:** Trigger terlalu ketat dan memblokir operasi yang seharusnya diperbolehkan (misal: void transaksi).

**Mitigasi:**
- Tambahkan exception di trigger untuk operasi `void` (status = 'void')
- Tambahkan parameter bypass untuk admin (jika diperlukan di masa depan)
- Testing menyeluruh untuk semua operasi CRUD

### Risiko 2: Snapshot Saldo Tidak Akurat

**Deskripsi:** Saldo snapshot tidak match dengan saldo real saat ditutup.

**Mitigasi:**
- Query snapshot menggunakan logika yang sama dengan `getAccountBalances()`
- Testing: bandingkan saldo snapshot dengan saldo dari laporan manual
- Validasi: hitung ulang saldo saat reopen dan bandingkan dengan snapshot lama

### Risiko 3: Performa Lambat untuk User dengan Data Banyak

**Deskripsi:** Query snapshot saldo lambat jika ada ribuan transaksi.

**Mitigasi:**
- Gunakan index pada `journal_entries.entry_date` dan `journal_lines.account_id`
- Batasi periode yang bisa ditutup sekaligus (maksimal 1 tahun)
- Background job untuk pre-compute snapshot (future enhancement)

### Risiko 4: User Lupa Tutup Periode Lama

**Deskripsi:** User tidak aware harus tutup periode, sehingga ada gap data.

**Mitigasi:**
- Notifikasi otomatis di dashboard jika ada transaksi > 30 hari yang belum masuk periode tertutup
- Reminder di Finance Dashboard dengan link langsung ke halaman Tutup Buku
- Tutorial/guide saat pertama kali akses fitur

---

## 9. Future Enhancements (Post-MVP)

### 9.1 Auto-Close Periode (Scheduled Task)

**Deskripsi:** Otomatis tutup periode setiap akhir bulan menggunakan cron job.

**Implementasi:**
- Gunakan Supabase Edge Functions atau pg_cron
- Trigger setiap tanggal 1 jam 00:01 (tutup bulan lalu)
- Kirim notifikasi ke user setelah berhasil

### 9.2 Approval Workflow

**Deskripsi:** Butuh persetujuan admin/manajer sebelum periode bisa ditutup.

**Implementasi:**
- Tabel `closing_period_approvals` untuk tracking approval
- Status periode: 'draft' → 'pending_approval' → 'approved' → 'closed'
- Notifikasi email ke approver

### 9.3 Export Snapshot ke Excel

**Deskripsi:** User bisa download snapshot saldo dalam format Excel (.xlsx).

**Implementasi:**
- Gunakan library `xlsx` atau `exceljs`
- Button "Export Excel" di modal snapshot
- Format: sheet per tipe akun (Aset, Kewajiban, dll)

### 9.4 History Log Perubahan Status

**Deskripsi:** Tracking siapa saja yang pernah reopen/close periode dan kapan.

**Implementasi:**
- Tabel `closing_period_logs` dengan kolom:
  - `closing_id`
  - `action` ('closed' / 'reopened')
  - `user_id`
  - `timestamp`
  - `notes`
- Tampilkan timeline di modal detail periode

### 9.5 Integrasi dengan Laporan Pajak

**Deskripsi:** Generate laporan pajak (SPT) dari snapshot periode tertutup.

**Implementasi:**
- Mapping akun ke kategori pajak
- Export format sesuai standar DJP (CSV/PDF)
- Preview perhitungan pajak sebelum export

---

## 10. Referensi & Dokumentasi

### 10.1 File Terkait

- `supabase/migrations/20260901_finance_module.sql` — Migrasi modul finance (COA & jurnal)
- `src/services/finance.ts` — Service layer untuk finance
- `src/types/database.ts` — TypeScript types untuk database
- `src/views/Finance/FinanceDashboard.vue` — Dashboard keuangan
- `src/views/Finance/JournalList.vue` — List jurnal umum
- `CLAUDE.md` — Dokumentasi proyek Ucup Kasir

### 10.2 Standar Akuntansi

- **Periode Akuntansi:** Biasanya bulanan atau tahunan
- **Cut-off Date:** Tanggal penutupan buku (end of period)
- **Closing Entries:** Jurnal penutup untuk transfer saldo laba/rugi ke ekuitas (belum diimplementasikan)
- **Immutable Ledger:** Prinsip bahwa buku besar periode tertutup tidak boleh diubah

### 10.3 Best Practices

1. **Tutup Periode Secara Teratur** — Jangan biarkan periode terbuka terlalu lama (maksimal 1-2 bulan)
2. **Backup Sebelum Reopen** — Jika harus reopen, backup database terlebih dahulu
3. **Review Sebelum Tutup** — Cek laporan neraca & laba rugi sebelum tutup periode
4. **Dokumentasi Alasan Reopen** — Selalu isi catatan saat reopen periode (untuk audit trail)

---

## 11. Catatan Implementasi

### 11.1 Konvensi Kode

- Gunakan **custom form controls** (DateField, bukan `<input type="date">`)
- Gunakan **useConfirm + ConfirmDialog** untuk konfirmasi (bukan `window.confirm()`)
- Gunakan **useToast** untuk notifikasi (bukan `alert()`)
- Layout mobile: **2 kolom grid** untuk statistik, **dropdown filter** untuk mobile
- Trigger SQL: Gunakan **`BEFORE INSERT OR UPDATE`** agar validasi terjadi sebelum data masuk

### 11.2 Error Handling

**Frontend:**
- Tangkap error dari backend dan tampilkan pesan user-friendly
- Error overlay/banner di form jika ada validasi gagal
- Toast error dengan detail (jangan hanya "Terjadi kesalahan")

**Backend:**
- `RAISE EXCEPTION` dengan pesan deskriptif di fungsi SQL
- Logging error ke `event_log` (jika ada)
- Return error code yang bisa di-handle frontend (misal: `PERIOD_OVERLAP`, `PERIOD_NOT_FOUND`)

### 11.3 Testing Checklist

- [ ] Tutup periode normal (1 bulan penuh)
- [ ] Tutup periode 1 hari (start = end)
- [ ] Validasi overlap periode (error expected)
- [ ] Trigger blokir insert jurnal di periode tertutup
- [ ] Trigger blokir update transaksi di periode tertutup
- [ ] Trigger blokir delete retur di periode tertutup
- [ ] Reopen periode berhasil mengubah status
- [ ] Snapshot saldo akurat (bandingkan dengan laporan manual)
- [ ] Tutup ulang periode setelah reopen (snapshot berubah)
- [ ] Cetak PDF snapshot berhasil
- [ ] Notifikasi di dashboard muncul jika ada transaksi > 30 hari
- [ ] Responsiveness mobile (card layout, dropdown filter)

---

## 12. Approval & Sign-off

**Dokumen ini menunggu approval dari:**
- [ ] Product Owner / User (putra)
- [ ] Developer (Claude AI)

**Status:** Draft — Menunggu Persetujuan

**Next Steps:**
1. Review dokumen ini bersama user
2. Konfirmasi scope & estimasi waktu
3. Kick-off Phase 1 (Database Migration)

---

**Dokumen dibuat:** 16 September 2026  
**Versi:** 1.0 Draft  
**Author:** Claude AI (Kiro)