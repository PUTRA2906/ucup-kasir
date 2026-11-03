# Bug Fix: Validasi Tanggal Jurnal Manual & Urutan Tampilan

## Masalah 1: Tanggal Tidak Valid

Saat membuat jurnal manual, tanggal yang dipilih user tidak valid di SQLite maupun Supabase karena ada konversi timezone yang salah.

**Root cause:**
```typescript
// Di JournalForm.vue (SALAH)
const entryDate = new Date(form.value.entry_date + 'T00:00:00').toISOString()
// Hasil: "2026-11-02T17:00:00.000Z" (kemarin di UTC jika user pilih "2026-11-03" di WIB)
```

Konversi `toISOString()` menghasilkan timestamp UTC yang berbeda dari tanggal lokal yang dipilih user.

## Masalah 2: Jurnal Manual Tidak Muncul Paling Atas

Ketika membuat jurnal manual dengan tanggal hari ini, jurnal tersebut muncul di bawah transaksi pembayaran/penjualan yang dibuat hari yang sama.

**Root cause:**
- Pembayaran/Penjualan: `entry_date = 2026-11-03 13:37:12` (waktu sekarang)
- Jurnal Manual: `entry_date = 2026-11-03 00:00:00` (midnight)
- Ketika diurutkan, pembayaran lebih baru → jurnal manual di bawah ❌

## Solusi

### 1. Migration: Ubah Tipe Parameter + Tambah Waktu NOW()

**File:** `supabase/migrations/20261103_fix_journal_date_type.sql`

**Perubahan:**
1. Parameter `p_entry_date` dari `timestamptz` → `DATE` (hindari timezone conversion)
2. Simpan `entry_date` dengan waktu NOW(): `DATE yang dipilih + CURRENT_TIME`

```sql
-- Buat timestamp: DATE yang dipilih user + waktu NOW()
v_entry_timestamp := p_entry_date::date + CURRENT_TIME;

-- Simpan dengan timestamp gabungan
INSERT INTO journal_entries (user_id, entry_date, description, reference_type)
VALUES (v_user_id, v_entry_timestamp, p_description, 'manual')
```

**Hasil:**
- User pilih: `2026-11-03`
- Waktu buat: `13:37:12`
- Tersimpan: `2026-11-03 13:37:12` ✅

### 2. Frontend: Kirim String DATE Langsung

**File:** `src/views/Finance/JournalForm.vue`

```typescript
// SEBELUM (SALAH)
const entryDate = new Date(form.value.entry_date + 'T00:00:00').toISOString()
const id = await store.createJournal({
  entry_date: entryDate,  // "2026-11-02T17:00:00.000Z" ❌
  ...
})

// SESUDAH (BENAR)
const id = await store.createJournal({
  entry_date: form.value.entry_date,  // "2026-11-03" ✅
  ...
})
```

### 3. SQLite: Tambah Waktu NOW() ke entry_date

**File:** `src/services/sqlite/finance.ts`

```typescript
// SEBELUM (SALAH)
[journalId, userId, journalNumber, input.entry_date, ...]
// Hasil: "2026-11-03" → midnight di SQLite

// SESUDAH (BENAR)
const entryDateTime = `${input.entry_date} ${new Date().toTimeString().slice(0, 8)}`
[journalId, userId, journalNumber, entryDateTime, ...]
// Hasil: "2026-11-03 13:37:12" ✅
```

### 4. Frontend List: Secondary Sort by created_at

**File:** `src/views/Finance/JournalList.vue`

Tambah secondary sort agar jurnal dengan tanggal sama diurutkan berdasarkan waktu pembuatan:

```typescript
return [...journals].sort((a, b) => {
  // Primary sort: entry_date (terbaru dulu)
  const dateA = new Date(a.entry_date).getTime()
  const dateB = new Date(b.entry_date).getTime()
  if (dateB !== dateA) {
    return dateB - dateA
  }

  // Secondary sort: created_at (terbaru dulu) untuk jurnal dengan tanggal sama
  const createdA = new Date(a.created_at).getTime()
  const createdB = new Date(b.created_at).getTime()
  return createdB - createdA
})
```

## Hasil Akhir

**Skenario:** User buat jurnal manual hari ini (2026-11-03) jam 13:37, sudah ada pembayaran hari ini jam 10:00

**Sebelum fix:**
```
1. Pembayaran (2026-11-03 10:00:00)  ← lebih baru
2. Jurnal Manual (2026-11-03 00:00:00)  ← midnight, di bawah ❌
```

**Setelah fix:**
```
1. Jurnal Manual (2026-11-03 13:37:12)  ← paling baru, paling atas ✅
2. Pembayaran (2026-11-03 10:00:00)
```

## File yang Diubah

1. `src/views/Finance/JournalForm.vue` — Hapus konversi `toISOString()`, kirim DATE string langsung
2. `supabase/migrations/20261103_fix_journal_date_type.sql` — Ubah parameter fungsi SQL + tambah waktu NOW()
3. `src/services/sqlite/finance.ts` — Tambah waktu NOW() ke entry_date
4. `src/views/Finance/JournalList.vue` — Tambah secondary sort by `created_at`

## Testing

1. **Buat jurnal manual hari ini:**
   - Entry date harus hari ini dengan waktu sekarang (bukan midnight)
   - Jurnal muncul paling atas di list

2. **Buat pembayaran, lalu jurnal manual:**
   - Jurnal manual tetap muncul paling atas

3. **Test offline mode (SQLite):**
   - Entry date harus sama dengan Supabase (ada waktu, bukan midnight)

## Deployment

1. **Jalankan migration di Supabase Dashboard:**
   ```sql
   -- Copy isi file supabase/migrations/20261103_fix_journal_date_type.sql
   -- Execute di SQL Editor
   ```

2. **Deploy frontend:**
   ```bash
   npm run build
   npx cap sync
   ```
