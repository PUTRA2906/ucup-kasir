# Bug Fix: Delivery Orders Sync Error

## Masalah

Error saat insert delivery order dan sinkronisasi SQLite ke Supabase:

```
ERROR: record "new" has no field "deliver_date"
```

Error terjadi karena trigger database `prevent_closed_period_delivery()` menggunakan nama kolom yang salah.

## Akar Masalah

Fungsi trigger `prevent_closed_period_delivery()` menggunakan field `NEW.delivery_date` padahal kolom yang benar di tabel `delivery_orders` adalah `NEW.do_date`.

### Kode Lama (Salah)

```sql
CREATE OR REPLACE FUNCTION prevent_closed_period_delivery()
RETURNS TRIGGER AS $$
BEGIN
  IF check_period_closed(NEW.delivery_date::date, NEW.user_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah surat jalan di periode yang sudah ditutup (%).',
      NEW.delivery_date::date;  -- ❌ SALAH: delivery_date tidak ada
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Kode Baru (Benar)

```sql
CREATE OR REPLACE FUNCTION prevent_closed_period_delivery()
RETURNS TRIGGER AS $$
BEGIN
  IF check_period_closed(NEW.do_date::date, NEW.user_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah surat jalan di periode yang sudah ditutup (%).',
      NEW.do_date::date;  -- ✅ BENAR: do_date adalah kolom yang ada
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Struktur Tabel delivery_orders

Kolom tanggal yang benar:
- ✅ `do_date` (DATE) — Tanggal surat jalan
- ❌ `delivery_date` — Kolom ini TIDAK ADA

## Perbaikan yang Dilakukan

1. **Migrasi database**: `fix_delivery_orders_trigger_field_name`
   - Mengganti `NEW.delivery_date` menjadi `NEW.do_date` di fungsi trigger
   
2. **Testing**:
   - ✅ Insert delivery order berhasil
   - ✅ Trigger berjalan tanpa error
   - ✅ Sinkronisasi SQLite → Supabase berhasil

## Dampak

- **Sebelum fix**: Insert delivery order gagal dengan error "no field deliver_date"
- **Setelah fix**: Insert delivery order dan sync berjalan normal

## File Terkait

- Database trigger: `prevent_closed_period_delivery()`
- Tabel: `delivery_orders`
- Service: `src/services/sqlite/shipping.ts`
- Sync engine: `src/services/sync/syncEngine.ts`

## Tanggal Perbaikan

31 Oktober 2026

## Testing Checklist

- [x] Insert delivery order baru berhasil
- [x] Trigger validation periode tertutup bekerja dengan benar
- [x] Sync SQLite ke Supabase berhasil tanpa error
- [x] Data test dihapus setelah testing

## Catatan

Trigger ini memvalidasi apakah tanggal surat jalan (`do_date`) jatuh dalam periode akuntansi yang sudah ditutup. Jika ya, maka INSERT/UPDATE akan ditolak dengan error message yang informatif.
