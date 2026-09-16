# Migration Guide: Detail Insentif di Slip Gaji

## Overview
Fitur ini menambahkan detail breakdown insentif di slip gaji yang menampilkan dari mana saja komponen gaji berasal (tanggal, surat jalan, deskripsi barang, upah).

## Migration Files

### Supabase (Web)
Jalankan migration berikut di Supabase Dashboard → SQL Editor:

1. **20260916_add_incentive_details_to_payrolls.sql**
   - Menambahkan kolom `incentive_details JSONB`
   - Menambahkan GIN index untuk performa query

2. **20260916_add_incentive_details_to_generate_payroll.sql**
   - Update RPC function `generate_payroll_for_employee`
   - Menambahkan logic untuk collect detail dari setiap surat jalan
   - Menyimpan detail ke kolom `incentive_details`

### SQLite (Android)
Migration berjalan **otomatis** saat app dibuka:
- File: `src/db/migrations.ts`
- Function: `migrateIncentiveDetails()`
- Menambahkan kolom `incentive_details TEXT`
- Idempotent (aman dijalankan berkali-kali)

## Cara Deploy

### 1. Supabase (Web)
```bash
# Di Supabase Dashboard → SQL Editor
# Copy paste isi file migration dan run secara berurutan:

# 1. Tambah kolom
-- Jalankan: 20260916_add_incentive_details_to_payrolls.sql

# 2. Update RPC function  
-- Jalankan: 20260916_add_incentive_details_to_generate_payroll.sql
```

### 2. Android (SQLite)
Tidak perlu action manual. Migration berjalan otomatis saat app pertama kali dibuka setelah update.

## Testing

### Generate Payroll Baru
1. Buka HR → Payroll
2. Generate slip gaji untuk karyawan (loader atau driver)
3. Pilih periode yang ada surat jalan selesai

### Lihat Detail di Slip Gaji
1. Klik slip gaji yang baru di-generate
2. Lihat section "Detail Insentif"
3. Setiap baris menampilkan:
   - Tanggal
   - Nomor DO
   - Deskripsi (nama barang x qty x upah untuk loader, atau "Ongkos supir" untuk driver)
   - Jumlah

### Export PDF
1. Klik tombol "Cetak" atau "Bagikan"
2. PDF akan include detail breakdown insentif

## Format Data

### JSON Structure (incentive_details)
```json
[
  {
    "type": "loader",
    "date": "2026-09-07",
    "do_number": "SJ-20260907-001",
    "description": "Bongkar muat: Beras 50kg (100 x 1.000), Gula (50 x 800) — Dibagi 3 orang",
    "amount": 50000
  },
  {
    "type": "driver",
    "date": "2026-09-10",
    "do_number": "SJ-20260910-003",
    "description": "Ongkos supir",
    "amount": 150000
  }
]
```

## Rollback (Jika Diperlukan)

### Supabase
```sql
-- Hapus kolom (akan hapus data di kolom tersebut)
ALTER TABLE payrolls DROP COLUMN IF EXISTS incentive_details;

-- Rollback RPC ke versi sebelumnya
-- (Copy paste RPC function dari migration 20260916_fix_payroll_driver_fee.sql)
```

### SQLite
Tidak bisa rollback column (SQLite limitation). Tapi kolom kosong tidak akan mengganggu fungsi existing.

## Notes

- ✅ Backward compatible: Slip gaji lama tanpa detail tetap bisa dibuka
- ✅ Data existing tidak terpengaruh
- ✅ Migration idempotent (aman dijalankan ulang)
- ✅ Detail hanya muncul untuk payroll yang di-generate setelah migration

## Support

Jika ada error saat migration:
1. Cek log console browser (web)
2. Cek Android logcat (mobile)
3. Pastikan user memiliki permission untuk ALTER TABLE
