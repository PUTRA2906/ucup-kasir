# Perbaikan Status Pengiriman & Checkbox Barang Dikirim

**Tanggal:** 31 Oktober 2026

## Ringkasan

Dua masalah terkait status pengiriman telah diperbaiki:
1. **Inkonsistensi status** - Status di daftar transaksi menunjukkan "Selesai/Dikirim" tapi di surat jalan masih "Perlu Dikirim"
2. **Fitur baru** - Checkbox "Barang Sudah Dikirim" di form transaksi baru untuk langsung set status 'selesai'

---

## 1. Fix Inkonsistensi Status Pengiriman

### Masalah

Status transaksi di daftar transaksi menunjukkan "Selesai/Dikirim" (`transaction_status = 'dikirim'` atau `'selesai'`), tetapi saat cek di surat jalan, transaksi tersebut masih muncul di "Perlu Dikirim".

### Root Cause

Saat status delivery order diubah menjadi 'dikirim' atau 'selesai', **status transaksi yang terkait tidak ikut terupdate**. Fungsi `updateDeliveryStatus` hanya mengupdate:
- Status `delivery_orders`
- Status `vehicles` (tersedia/dipakai)
- Tracking history

Tapi **tidak** mengupdate `transactions.transaction_status`.

### Solusi

Menambahkan logika untuk update `transaction_status` saat `delivery_order.status` berubah.

**Mapping status:**
- delivery_order: `'disiapkan'` → transaction: `'disiapkan'`
- delivery_order: `'dikirim'` → transaction: `'dikirim'`
- delivery_order: `'selesai'` → transaction: `'selesai'`

### File yang Diubah

#### 1. `src/services/shipping.ts` (Supabase/Web)

**Fungsi:** `updateDeliveryStatus()`

**Perubahan:**
```typescript
async updateDeliveryStatus(id: string, status: DeliveryOrder['status'], note?: string): Promise<DeliveryOrder> {
  // ... existing code untuk update delivery_orders dan tracking ...

  // ✅ TAMBAHAN BARU: Update status transaksi yang terkait
  if (status === 'disiapkan' || status === 'dikirim' || status === 'selesai') {
    // Ambil daftar transaction_id yang terkait dengan DO ini
    const { data: links } = await supabase
      .from('delivery_order_transactions')
      .select('transaction_id')
      .eq('delivery_order_id', id)

    const transactionIds = (links || []).map(l => l.transaction_id)

    if (transactionIds.length > 0) {
      // Update transaction_status untuk semua transaksi terkait
      await supabase
        .from('transactions')
        .update({ transaction_status: status })
        .in('id', transactionIds)
    }
  }

  return data as DeliveryOrder
}
```

#### 2. `src/services/sqlite/shipping.ts` (SQLite/Android)

**Fungsi:** `updateDeliveryStatus()`

**Perubahan:**
```typescript
await transaction(async (tx) => {
  // ... existing code untuk update delivery_orders, tracking, vehicles ...

  // ✅ TAMBAHAN BARU: Update status transaksi
  if (status === 'disiapkan' || status === 'dikirim' || status === 'selesai') {
    const txRows = await tx.query<any>(
      `SELECT transaction_id FROM delivery_order_transactions WHERE delivery_order_id = ?`,
      [id]
    )

    for (const txRow of txRows) {
      await tx.run(
        `UPDATE transactions SET transaction_status = ?, updated_at = ?, sync_status = 'pending', updated_at_local = ?
         WHERE id = ? AND user_id = ?`,
        [status, now, now, txRow.transaction_id, userId]
      )

      // Tambahkan ke sync queue
      const txPayload = JSON.stringify({ id: txRow.transaction_id, transaction_status: status, updated_at: now })
      await tx.run(
        `INSERT INTO sync_queue (operation, table_name, record_id, payload, created_at)
         VALUES ('UPDATE', 'transactions', ?, ?, ?)`,
        [txRow.transaction_id, txPayload, now]
      )
    }
  }
})
```

---

## 2. Fitur Checkbox "Barang Sudah Dikirim"

### Fitur Baru

Menambahkan checkbox di form transaksi baru untuk menandai barang sudah dikirim/diserahkan langsung. Jika dicentang, transaksi otomatis dibuat dengan `transaction_status = 'selesai'`.

### Use Case

- Transaksi **cash & carry** (ambil langsung) → centang checkbox
- Transaksi **perlu disiapkan/dikirim** → tidak centang (default)

### File yang Diubah

#### 1. `src/views/Transactions/AddTransaction.vue`

**UI - Checkbox di Card Pembayaran (Mobile):**
```vue
<!-- Checkbox Barang Sudah Dikirim -->
<div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
  <label class="flex items-center gap-2.5 cursor-pointer">
    <input
      v-model="isDelivered"
      type="checkbox"
      class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
    />
    <div>
      <span class="text-xs font-semibold text-gray-900 dark:text-white">
        Barang Sudah Dikirim
      </span>
      <p class="text-[10px] text-gray-500 dark:text-gray-400">
        Centang jika pesanan sudah dikirim/diserahkan
      </p>
    </div>
  </label>
</div>
```

**Script - Variable:**
```typescript
const isDelivered = ref(false) // Checkbox barang sudah dikirim
```

**Script - Submit Handler:**
```typescript
const transactionId = await transactionsStore.createTransaction({
  // ... existing fields ...
  transaction_status: isDelivered.value ? 'selesai' : 'disiapkan', // ✅ Set status berdasarkan checkbox
  // ...
})
```

#### 2. `src/types/database.ts`

**Interface TransactionInput:**
```typescript
export interface TransactionInput {
  customer_id?: string
  customer_name?: string
  payment_method: string
  paid_amount: number
  discount: number
  shipping_cost?: number
  return_amount?: number
  notes?: string
  transaction_date?: string
  transaction_status?: 'disiapkan' | 'dikirim' | 'selesai' // ✅ TAMBAHAN BARU
  items: TransactionItemInput[]
}
```

#### 3. `src/services/transactions.ts`

**Fungsi create():**
```typescript
async create(input: TransactionInput): Promise<string> {
  const { data, error } = await supabase.rpc('create_transaction', {
    // ... existing params ...
  })

  if (error) throw error

  const transactionId = data as string

  // ✅ TAMBAHAN BARU: Update transaction_status jika disediakan
  if (input.transaction_status && input.transaction_status !== 'disiapkan') {
    await this.updateStatus(transactionId, input.transaction_status)
  }

  return transactionId
}
```

---

## Flow Lengkap Setelah Perbaikan

### Scenario 1: Transaksi Cash & Carry (Ambil Langsung)

1. User buat transaksi baru
2. ✅ **Centang** "Barang Sudah Dikirim"
3. Simpan transaksi → `transaction_status = 'selesai'`
4. Transaksi **tidak** muncul di "Perlu Dikirim"
5. Transaksi langsung masuk kategori "Selesai"

### Scenario 2: Transaksi Perlu Dikirim

1. User buat transaksi baru
2. ❌ **Tidak centang** "Barang Sudah Dikirim"
3. Simpan transaksi → `transaction_status = 'disiapkan'`
4. Transaksi muncul di "Perlu Dikirim"
5. Staff buat surat jalan, masukkan transaksi ini
6. Ubah status surat jalan:
   - `'disiapkan'` → transaksi tetap `'disiapkan'`
   - `'dikirim'` → transaksi otomatis jadi `'dikirim'` ✅
   - `'selesai'` → transaksi otomatis jadi `'selesai'` ✅

---

## Testing Checklist

### Fix Status Pengiriman
- [x] Type check berhasil
- [x] Perbaikan service Supabase (`shipping.ts`)
- [x] Perbaikan service SQLite (`sqlite/shipping.ts`)
- [ ] Manual test: buat surat jalan, ubah status → cek status transaksi ikut berubah
- [ ] Manual test di Android: pastikan update status tersinkronisasi

### Checkbox Barang Dikirim
- [x] Type check berhasil
- [x] Checkbox tampil di form mobile
- [x] Logic set status di handleSubmit
- [x] Interface TransactionInput updated
- [x] Service create() handle transaction_status
- [ ] Manual test: centang checkbox → simpan → status transaksi = 'selesai'
- [ ] Manual test: tidak centang → simpan → status transaksi = 'disiapkan'

---

## Catatan Penting

### Backward Compatibility

✅ **Aman** - Perubahan ini backward compatible:
- Transaksi lama tanpa `transaction_status` akan default ke `'disiapkan'` (dari migrasi)
- Checkbox default `false` (tidak centang) → behavior sama dengan sebelumnya
- Field `transaction_status` optional di interface

### Sync Queue (Android)

✅ **Sudah ditangani** - Update `transaction_status` di SQLite service sudah:
- Update database lokal
- Tambah ke `sync_queue` dengan operation `UPDATE`
- Set `sync_status = 'pending'`

### RPC Function `create_transaction`

⚠️ **Catatan** - RPC function `create_transaction` tidak dimodifikasi. Alasannya:
- Modifikasi RPC perlu migrasi database baru
- Pendekatan sekarang (update setelah create) lebih fleksibel
- Tidak ada race condition karena dieksekusi dalam satu flow

Jika ingin optimize, bisa tambahkan parameter `p_transaction_status` di RPC function nanti.

---

## Files Modified

1. ✅ `src/services/shipping.ts` - Update status transaksi di web
2. ✅ `src/services/sqlite/shipping.ts` - Update status transaksi di Android
3. ✅ `src/views/Transactions/AddTransaction.vue` - Checkbox UI & logic
4. ✅ `src/types/database.ts` - Interface TransactionInput
5. ✅ `src/services/transactions.ts` - Handle transaction_status di create()

---

## Dampak

### Sebelum:
- ❌ Status tidak sinkron antara transaksi dan surat jalan
- ❌ Tidak ada cara untuk langsung tandai transaksi selesai
- ❌ Transaksi cash & carry tetap muncul di "Perlu Dikirim"

### Setelah:
- ✅ Status otomatis sinkron saat surat jalan di-update
- ✅ Checkbox untuk transaksi yang langsung selesai
- ✅ Transaksi cash & carry tidak muncul di "Perlu Dikirim"
- ✅ Flow lebih intuitif dan akurat
- ✅ Konsisten di web dan Android

---

## Next Steps

1. Build APK dan test di Android device
2. Test scenario lengkap:
   - Buat transaksi dengan checkbox centang
   - Buat transaksi tanpa checkbox
   - Buat surat jalan dan ubah statusnya
   - Verifikasi status transaksi ikut berubah
3. Monitor sync queue untuk memastikan tidak ada konflik
