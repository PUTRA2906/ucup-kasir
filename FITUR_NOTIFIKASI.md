# Fitur Notifikasi Real-Time

Fitur notifikasi yang terintegrasi dengan sistem kasir untuk memberikan update real-time tentang aktivitas penting.

## Fitur yang Tersedia

### 1. Tipe Notifikasi

**Stok Alert (stock_alert):**
- Notifikasi otomatis saat stok produk mencapai atau di bawah batas minimum
- Menampilkan nama produk, jumlah stok saat ini, dan batas minimum
- Icon: 📦
- Warna: Warning (kuning)

**Transaksi (transaction):**
- Notifikasi saat transaksi baru berhasil dibuat
- Menampilkan nomor transaksi dan total
- Icon: 🛒
- Warna: Success (hijau)

**Pembayaran (payment):**
- Notifikasi saat pembayaran hutang diterima
- Menampilkan jumlah pembayaran dan nomor transaksi
- Icon: 💰
- Warna: Brand (biru)

**Retur (return):**
- Notifikasi saat retur produk diproses
- Menampilkan nomor retur dan total refund
- Icon: ↩️
- Warna: Error (merah)

**Sistem (system):**
- Notifikasi sistem umum
- Icon: ℹ️
- Warna: Gray

### 2. Fitur Komponen Notifikasi

**Badge Unread Count:**
- Menampilkan jumlah notifikasi yang belum dibaca
- Animasi ping untuk menarik perhatian
- Badge hilang saat semua notifikasi sudah dibaca

**Dropdown Menu:**
- Tampilan responsive (fullscreen mobile, dropdown desktop)
- Menampilkan 8 notifikasi terbaru
- Notifikasi yang belum dibaca ditandai dengan:
  - Background highlight
  - Dot indicator biru

**Fitur per Notifikasi:**
- Klik notifikasi untuk navigasi ke halaman terkait:
  - Stok Alert → `/stock`
  - Transaksi → `/transactions/:id`
  - Retur → `/returns`
  - Pembayaran → `/transactions/:id`
- Auto mark as read saat diklik
- Timestamp relatif (baru saja, X menit lalu, dll)
- Badge tipe notifikasi dengan warna berbeda

**Tombol Aksi:**
- "Tandai Semua Dibaca" - muncul saat ada unread
- "Lihat Semua" - untuk melihat semua notifikasi

### 3. Real-Time Updates

**Supabase Realtime:**
- Subscribe ke perubahan tabel notifications
- Notifikasi baru muncul otomatis tanpa refresh
- Update badge count secara real-time

## Database Schema

### Tabel notifications

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT CHECK (type IN ('stock_alert', 'transaction', 'return', 'system', 'payment')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  read_at TIMESTAMPTZ
);
```

### Trigger Otomatis

**1. Stok Menipis (create_low_stock_notification)**
- Trigger: AFTER UPDATE pada tabel products
- Kondisi: Saat stok mencapai atau di bawah minimum stock
- Data yang disimpan: product_id, product_name, current_stock, minimum_stock

**2. Transaksi Baru (create_transaction_notification)**
- Trigger: AFTER INSERT pada tabel transactions
- Otomatis membuat notifikasi saat transaksi baru dibuat
- Data: transaction_id, transaction_number, total, customer_name

**3. Pembayaran (create_payment_notification)**
- Trigger: AFTER INSERT pada tabel transaction_payments
- Notifikasi saat pembayaran hutang diterima
- Data: payment_id, transaction_id, amount, payment_method

**4. Retur (create_return_notification)**
- Trigger: AFTER INSERT pada tabel returns
- Notifikasi saat retur diproses
- Data: return_id, return_number, transaction_id, total_refund

## Store API (useNotificationsStore)

### State
- `notifications` - Array notifikasi
- `unreadCount` - Jumlah notifikasi belum dibaca
- `loading` - Status loading
- `error` - Error message

### Methods

**fetchNotifications(limit = 50)**
```typescript
await notificationsStore.fetchNotifications()
```
Mengambil notifikasi dari database (default 50 terbaru)

**fetchUnreadNotifications()**
```typescript
const unread = await notificationsStore.fetchUnreadNotifications()
```
Mengambil hanya notifikasi yang belum dibaca

**markAsRead(notificationId)**
```typescript
await notificationsStore.markAsRead('uuid-here')
```
Tandai satu notifikasi sebagai sudah dibaca

**markAllAsRead()**
```typescript
await notificationsStore.markAllAsRead()
```
Tandai semua notifikasi sebagai sudah dibaca

**deleteNotification(notificationId)**
```typescript
await notificationsStore.deleteNotification('uuid-here')
```
Hapus satu notifikasi

**deleteAllRead()**
```typescript
await notificationsStore.deleteAllRead()
```
Hapus semua notifikasi yang sudah dibaca

**createNotification(data)**
```typescript
await notificationsStore.createNotification({
  type: 'system',
  title: 'Judul Notifikasi',
  message: 'Pesan notifikasi',
  data: { custom_data: 'value' }
})
```
Buat notifikasi manual

**subscribeToNotifications()**
```typescript
const unsubscribe = notificationsStore.subscribeToNotifications()
// Cleanup saat component unmount
onUnmounted(() => unsubscribe())
```
Subscribe ke real-time updates

## Cara Menggunakan

### 1. Di Komponen Vue

```vue
<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useNotificationsStore } from '@/stores/notifications'

const notificationsStore = useNotificationsStore()
let unsubscribe = null

onMounted(async () => {
  await notificationsStore.fetchNotifications()
  unsubscribe = notificationsStore.subscribeToNotifications()
})

onUnmounted(() => {
  if (unsubscribe) unsubscribe()
})
</script>

<template>
  <div>
    <p>Unread: {{ notificationsStore.unreadCount }}</p>
    <div v-for="notif in notificationsStore.notifications" :key="notif.id">
      <p>{{ notif.title }}</p>
      <button @click="notificationsStore.markAsRead(notif.id)">
        Tandai Dibaca
      </button>
    </div>
  </div>
</template>
```

### 2. Membuat Notifikasi Manual

```typescript
import { useNotificationsStore } from '@/stores/notifications'

const notificationsStore = useNotificationsStore()

// Notifikasi custom
await notificationsStore.createNotification({
  type: 'system',
  title: 'Backup Selesai',
  message: 'Backup database berhasil diselesaikan',
  data: {
    backup_size: '150MB',
    timestamp: new Date().toISOString()
  }
})
```

## File yang Dibuat

### Migration:
- `/supabase/migrations/20260818_notifications.sql` - Schema dan triggers

### Store:
- `/src/stores/notifications.ts` - Pinia store untuk notifikasi

### Komponen:
- `/src/components/layout/header/NotificationMenu.vue` - Diupdate untuk data real

## Integrasi dengan Sistem

**Otomatis Terintegrasi:**
1. Stok Menipis - Trigger otomatis saat update produk
2. Transaksi Baru - Trigger saat insert transaksi
3. Pembayaran - Trigger saat insert payment
4. Retur - Trigger saat insert retur

**Manual via Store:**
- Bisa membuat notifikasi custom untuk kebutuhan khusus

## Security

- Row Level Security (RLS) enabled
- User hanya bisa lihat/edit notifikasi mereka sendiri
- Semua trigger menggunakan SECURITY DEFINER

## Performance

- Index pada user_id, created_at, is_read, type
- Limit default 50 notifikasi per fetch
- Real-time subscription untuk instant updates
- Badge count di-cache di local state

## Tips Penggunaan

1. **Subscribe di Layout/App.vue** untuk notifikasi global
2. **Unsubscribe saat unmount** untuk menghindari memory leak
3. **Fetch saat dropdown dibuka** untuk data terbaru
4. **Mark as read saat navigasi** untuk UX yang baik
5. **Cleanup notifikasi lama** secara berkala dengan deleteAllRead()

## Contoh Notifikasi yang Muncul

**Stok Menipis:**
> 📦 **Stok Produk Menipis**
> Produk "Indomie Goreng" memiliki stok 5 (minimum: 10)

**Transaksi Baru:**
> 🛒 **Transaksi Baru**
> Transaksi TRX-20260818-ABC123 berhasil dibuat dengan total Rp 150.000

**Pembayaran:**
> 💰 **Pembayaran Diterima**
> Pembayaran Rp 100.000 untuk transaksi TRX-20260818-ABC123 berhasil dicatat

**Retur:**
> ↩️ **Retur Produk**
> Retur RTR-20260818-XYZ789 untuk transaksi TRX-20260818-ABC123 berhasil diproses
