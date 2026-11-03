# Alur Penutupan Keuangan (Financial Closing Process)

## Overview

Penutupan keuangan adalah proses untuk mengakhiri periode akuntansi dan memindahkan saldo akun-akun nominal (revenue & expense) ke akun laba rugi, kemudian ke retained earnings.

## Konsep Dasar

### Jenis Akun

1. **Akun Permanen (Real Accounts)**
   - Asset (1xxx)
   - Liability (2xxx)
   - Equity (3xxx)
   - Saldo dibawa ke periode berikutnya

2. **Akun Nominal (Temporary Accounts)**
   - Revenue (4xxx)
   - Expense (5xxx)
   - Saldo direset ke nol setiap penutupan periode

## Alur Penutupan Periode

### 1. Pre-Closing Checklist

**Validasi sebelum penutupan:**
- [ ] Semua transaksi sudah dijurnal untuk periode tersebut
- [ ] Tidak ada jurnal dengan status 'draft' (hanya yang 'posted')
- [ ] Neraca saldo balance (total debit = total kredit)
- [ ] Stock opname sudah dilakukan
- [ ] Rekonsiliasi bank selesai
- [ ] Piutang dan hutang sudah diverifikasi

### 2. Closing Entries (Jurnal Penutup)

**Step 1: Tutup Revenue ke Income Summary**
```
Debit: Revenue Accounts (4xxx)
Credit: Income Summary (3900)
```

**Step 2: Tutup Expense ke Income Summary**
```
Debit: Income Summary (3900)
Credit: Expense Accounts (5xxx)
```

**Step 3: Tutup Income Summary ke Retained Earnings**
```
Jika Laba:
  Debit: Income Summary (3900)
  Credit: Retained Earnings (3100)

Jika Rugi:
  Debit: Retained Earnings (3100)
  Credit: Income Summary (3900)
```

### 3. Post-Closing

**Hasil setelah penutupan:**
- Semua akun revenue & expense bersaldo nol
- Laba/rugi dipindahkan ke Retained Earnings
- Saldo akun permanen (asset, liability, equity) tetap
- Periode dinyatakan 'closed' dan tidak bisa diedit lagi

### 4. Opening Balance Periode Berikutnya

**Saldo awal periode baru:**
- Asset, Liability, Equity: menggunakan saldo akhir periode lalu
- Revenue & Expense: mulai dari nol

## Tabel Database

### `finance_periods`

```sql
CREATE TABLE finance_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  period_name VARCHAR(50) NOT NULL, -- misal: "Jan 2026"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open', -- 'open', 'closing', 'closed'
  closed_at TIMESTAMPTZ,
  closed_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, start_date, end_date)
);
```

### `finance_closing_entries`

```sql
CREATE TABLE finance_closing_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  period_id UUID NOT NULL REFERENCES finance_periods(id),
  journal_id UUID NOT NULL REFERENCES finance_journals(id),
  entry_type VARCHAR(20) NOT NULL, -- 'close_revenue', 'close_expense', 'close_income_summary'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Business Rules

### Validasi Periode

1. **Periode Overlap**
   - Tidak boleh ada periode yang overlap (start/end date tumpang tindih)
   - Periode harus berurutan tanpa gap

2. **Periode Closure**
   - Periode hanya bisa ditutup sekali
   - Periode yang sudah ditutup tidak bisa diedit
   - Periode baru hanya bisa dibuat setelah periode sebelumnya ditutup

3. **Jurnal di Periode Tertutup**
   - Tidak bisa menambah jurnal baru di periode tertutup
   - Tidak bisa mengedit/hapus jurnal di periode tertutup
   - Jika perlu koreksi, buat jurnal koreksi di periode aktif

### Akun Khusus

- **Income Summary (3900)**: Akun transit untuk penutupan
- **Retained Earnings (3100)**: Akun penyimpan laba/rugi akumulasi
- Kedua akun ini harus ada di Chart of Accounts sebelum closing

## UI Flow

### Halaman Finance Periods

```
[Open Period] [Closed Period]

Periode Aktif: Jan 2026 (01 Jan - 31 Jan)
Status: Open
[Close Period]

Riwayat Periode:
┌────────────────────────────────────────────────┐
│ Periode      │ Status  │ Closed Date │ Action │
├────────────────────────────────────────────────┤
│ Dec 2025     │ Closed  │ 01 Jan 2026 │ View   │
│ Nov 2025     │ Closed  │ 01 Dec 2025 │ View   │
└────────────────────────────────────────────────┘
```

### Dialog Close Period

```
Tutup Periode: Jan 2026

Pre-closing Checklist:
✓ Neraca saldo balance
✓ Tidak ada jurnal draft
✗ Warning: Ada 3 invoice belum lunas
  (Piutang Rp 1.500.000)

Ringkasan Penutupan:
- Total Revenue: Rp 50.000.000
- Total Expense: Rp 35.000.000
- Net Income: Rp 15.000.000

Jurnal Penutup yang akan dibuat:
1. Close Revenue → Income Summary
2. Close Expense → Income Summary
3. Close Income Summary → Retained Earnings

[Cancel] [Proceed Close]
```

## API Endpoints (Service Functions)

### `financePeriodsService.ts`

```typescript
// Create period baru
createPeriod(data: {
  period_name: string
  start_date: string
  end_date: string
})

// Get periode aktif
getActivePeriod()

// Get semua periode
listPeriods()

// Close periode
closePeriod(periodId: string)

// Pre-closing validation
validatePeriodForClosing(periodId: string)
```

### Fungsi SQL: `close_financial_period()`

```sql
CREATE OR REPLACE FUNCTION close_financial_period(
  p_period_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_start_date DATE;
  v_end_date DATE;
  v_income_summary_account UUID;
  v_retained_earnings_account UUID;
  v_total_revenue DECIMAL(15,2);
  v_total_expense DECIMAL(15,2);
  v_net_income DECIMAL(15,2);
  v_journal_close_revenue UUID;
  v_journal_close_expense UUID;
  v_journal_close_income UUID;
BEGIN
  -- Get user_id & period dates
  SELECT user_id, start_date, end_date
  INTO v_user_id, v_start_date, v_end_date
  FROM finance_periods
  WHERE id = p_period_id;

  -- Validasi periode sudah closed
  IF EXISTS (
    SELECT 1 FROM finance_periods
    WHERE id = p_period_id AND status = 'closed'
  ) THEN
    RAISE EXCEPTION 'Period already closed';
  END IF;

  -- Get Income Summary & Retained Earnings accounts
  SELECT id INTO v_income_summary_account
  FROM finance_accounts
  WHERE user_id = v_user_id AND code = '3900';

  SELECT id INTO v_retained_earnings_account
  FROM finance_accounts
  WHERE user_id = v_user_id AND code = '3100';

  IF v_income_summary_account IS NULL OR v_retained_earnings_account IS NULL THEN
    RAISE EXCEPTION 'Missing required accounts: Income Summary (3900) or Retained Earnings (3100)';
  END IF;

  -- Update period status
  UPDATE finance_periods
  SET status = 'closing'
  WHERE id = p_period_id;

  -- Calculate total revenue (kredit - debit)
  SELECT COALESCE(SUM(jd.credit - jd.debit), 0)
  INTO v_total_revenue
  FROM finance_journal_details jd
  JOIN finance_journals j ON j.id = jd.journal_id
  JOIN finance_accounts a ON a.id = jd.account_id
  WHERE j.user_id = v_user_id
    AND j.status = 'posted'
    AND j.transaction_date >= v_start_date
    AND j.transaction_date <= v_end_date
    AND a.category = 'revenue';

  -- Calculate total expense (debit - kredit)
  SELECT COALESCE(SUM(jd.debit - jd.credit), 0)
  INTO v_total_expense
  FROM finance_journal_details jd
  JOIN finance_journals j ON j.id = jd.journal_id
  JOIN finance_accounts a ON a.id = jd.account_id
  WHERE j.user_id = v_user_id
    AND j.status = 'posted'
    AND j.transaction_date >= v_start_date
    AND j.transaction_date <= v_end_date
    AND a.category = 'expense';

  v_net_income := v_total_revenue - v_total_expense;

  -- 1. Close Revenue to Income Summary
  v_journal_close_revenue := uuid_generate_v4();
  INSERT INTO finance_journals (id, user_id, journal_number, transaction_date, description, status)
  VALUES (
    v_journal_close_revenue,
    v_user_id,
    'CLS-REV-' || TO_CHAR(v_end_date, 'YYYYMMDD'),
    v_end_date,
    'Close Revenue to Income Summary',
    'posted'
  );

  -- Debit all revenue accounts
  INSERT INTO finance_journal_details (journal_id, account_id, debit, credit)
  SELECT
    v_journal_close_revenue,
    a.id,
    COALESCE(SUM(jd.credit - jd.debit), 0),
    0
  FROM finance_accounts a
  LEFT JOIN finance_journal_details jd ON jd.account_id = a.id
  LEFT JOIN finance_journals j ON j.id = jd.journal_id
  WHERE a.user_id = v_user_id
    AND a.category = 'revenue'
    AND j.status = 'posted'
    AND j.transaction_date >= v_start_date
    AND j.transaction_date <= v_end_date
  GROUP BY a.id
  HAVING SUM(jd.credit - jd.debit) > 0;

  -- Credit Income Summary
  INSERT INTO finance_journal_details (journal_id, account_id, debit, credit)
  VALUES (v_journal_close_revenue, v_income_summary_account, 0, v_total_revenue);

  -- 2. Close Expense to Income Summary
  v_journal_close_expense := uuid_generate_v4();
  INSERT INTO finance_journals (id, user_id, journal_number, transaction_date, description, status)
  VALUES (
    v_journal_close_expense,
    v_user_id,
    'CLS-EXP-' || TO_CHAR(v_end_date, 'YYYYMMDD'),
    v_end_date,
    'Close Expense to Income Summary',
    'posted'
  );

  -- Debit Income Summary
  INSERT INTO finance_journal_details (journal_id, account_id, debit, credit)
  VALUES (v_journal_close_expense, v_income_summary_account, v_total_expense, 0);

  -- Credit all expense accounts
  INSERT INTO finance_journal_details (journal_id, account_id, debit, credit)
  SELECT
    v_journal_close_expense,
    a.id,
    0,
    COALESCE(SUM(jd.debit - jd.credit), 0)
  FROM finance_accounts a
  LEFT JOIN finance_journal_details jd ON jd.account_id = a.id
  LEFT JOIN finance_journals j ON j.id = jd.journal_id
  WHERE a.user_id = v_user_id
    AND a.category = 'expense'
    AND j.status = 'posted'
    AND j.transaction_date >= v_start_date
    AND j.transaction_date <= v_end_date
  GROUP BY a.id
  HAVING SUM(jd.debit - jd.credit) > 0;

  -- 3. Close Income Summary to Retained Earnings
  v_journal_close_income := uuid_generate_v4();
  INSERT INTO finance_journals (id, user_id, journal_number, transaction_date, description, status)
  VALUES (
    v_journal_close_income,
    v_user_id,
    'CLS-INC-' || TO_CHAR(v_end_date, 'YYYYMMDD'),
    v_end_date,
    'Close Income Summary to Retained Earnings',
    'posted'
  );

  IF v_net_income > 0 THEN
    -- Profit: Debit Income Summary, Credit Retained Earnings
    INSERT INTO finance_journal_details (journal_id, account_id, debit, credit)
    VALUES
      (v_journal_close_income, v_income_summary_account, v_net_income, 0),
      (v_journal_close_income, v_retained_earnings_account, 0, v_net_income);
  ELSIF v_net_income < 0 THEN
    -- Loss: Debit Retained Earnings, Credit Income Summary
    INSERT INTO finance_journal_details (journal_id, account_id, debit, credit)
    VALUES
      (v_journal_close_income, v_retained_earnings_account, ABS(v_net_income), 0),
      (v_journal_close_income, v_income_summary_account, 0, ABS(v_net_income));
  END IF;

  -- Record closing entries
  INSERT INTO finance_closing_entries (user_id, period_id, journal_id, entry_type)
  VALUES
    (v_user_id, p_period_id, v_journal_close_revenue, 'close_revenue'),
    (v_user_id, p_period_id, v_journal_close_expense, 'close_expense'),
    (v_user_id, p_period_id, v_journal_close_income, 'close_income_summary');

  -- Update period status to closed
  UPDATE finance_periods
  SET
    status = 'closed',
    closed_at = NOW(),
    closed_by_user_id = v_user_id
  WHERE id = p_period_id;

  RETURN json_build_object(
    'success', true,
    'total_revenue', v_total_revenue,
    'total_expense', v_total_expense,
    'net_income', v_net_income,
    'closing_journals', json_build_array(
      v_journal_close_revenue,
      v_journal_close_expense,
      v_journal_close_income
    )
  );
END;
$$;
```

## Testing Scenarios

### Happy Path

1. Create periode baru (Jan 2026)
2. Post beberapa jurnal revenue & expense
3. Validasi neraca saldo balance
4. Close periode
5. Verify:
   - Revenue accounts bersaldo nol
   - Expense accounts bersaldo nol
   - Retained Earnings bertambah sesuai net income

### Edge Cases

1. **Close periode dengan Net Loss**
   - Retained Earnings berkurang

2. **Close periode kosong (tanpa transaksi)**
   - Tidak ada jurnal penutup dibuat

3. **Close periode dengan jurnal draft**
   - Validasi gagal, user diminta post semua jurnal draft

4. **Attempt close periode yang sudah closed**
   - Error: "Period already closed"

## Migration SQL

File: `supabase/migrations/YYYYMMDDHHMMSS_add_financial_closing.sql`

```sql
-- Create finance_periods table
CREATE TABLE finance_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  period_name VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  closed_at TIMESTAMPTZ,
  closed_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create finance_closing_entries table
CREATE TABLE finance_closing_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  period_id UUID NOT NULL REFERENCES finance_periods(id),
  journal_id UUID NOT NULL REFERENCES finance_journals(id),
  entry_type VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE finance_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_closing_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own periods"
ON finance_periods FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own closing entries"
ON finance_closing_entries FOR ALL
USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_finance_periods_user_id ON finance_periods(user_id);
CREATE INDEX idx_finance_periods_status ON finance_periods(status);
CREATE INDEX idx_finance_closing_entries_period_id ON finance_closing_entries(period_id);

-- Unique constraint untuk periode
CREATE UNIQUE INDEX idx_finance_periods_unique
ON finance_periods(user_id, start_date, end_date);

-- Function close_financial_period()
-- (paste fungsi SQL dari section sebelumnya)
```

## Best Practices

1. **Backup sebelum closing**
   - Export semua laporan keuangan
   - Simpan snapshot neraca saldo

2. **Periode review**
   - Review semua jurnal sebelum close
   - Cek piutang & hutang outstanding

3. **Dokumentasi**
   - Catat alasan adjusting entries
   - Simpan rekonsiliasi bank

4. **Audit trail**
   - Semua closing entries tercatat di `finance_closing_entries`
   - User dan timestamp closing tersimpan di `finance_periods`

## Roadmap

- [ ] Implementasi UI halaman Finance Periods
- [ ] Pre-closing validation checklist
- [ ] Auto-create Income Summary & Retained Earnings jika belum ada
- [ ] Export laporan keuangan post-closing
- [ ] Re-open period (opsional, untuk koreksi)
- [ ] Multi-period comparison report
