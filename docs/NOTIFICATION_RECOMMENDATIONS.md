# Rekomendasi Fitur Notifikasi

## Status Saat Ini

### ✅ Yang Sudah Ada
1. **Tabel notifications** di Supabase dengan tipe:
   - `stock_alert` — Stok menipis
   - `transaction` — Transaksi penjualan
   - `return` — Retur produk
   - `payment` — Pembayaran piutang
   - `system` — Notifikasi sistem

2. **NotificationMenu component** di header (bell icon dengan badge)
   - Dropdown fullscreen di mobile, popup di desktop
   - Menampilkan 8 notifikasi terbaru
   - Mark as read per item
   - Mark all as read

3. **Store & Service Layer**
   - CRUD notifikasi
   - Unread count
   - Subscription placeholder (realtime belum aktif)

### ❌ Yang Belum Ada
1. **Tidak ada trigger otomatis** untuk membuat notifikasi
   - Stok menipis tidak otomatis bikin notifikasi
   - Transaksi baru tidak bikin notifikasi
   - Semua masih manual via `createNotification()`

2. **Halaman list notifikasi** tidak lengkap
   - `Notifications.vue` ada tapi tidak digunakan
   - "Lihat Semua" button belum berfungsi

3. **Realtime subscription** tidak aktif
   - Function `subscribeToNotifications()` return empty
   - User harus refresh manual untuk dapat notifikasi baru

4. **Push notification** tidak ada
   - Tidak ada Capacitor Local Notifications
   - Tidak ada Firebase Cloud Messaging (FCM)

---

## 🎯 Rekomendasi Prioritas

### Priority 1: Trigger Otomatis (HIGH)

**Masalah:** Notifikasi tidak pernah dibuat otomatis, harus manual.

**Solusi:**

#### 1.1 Trigger Stok Menipis via Database Trigger

```sql
-- File: supabase/migrations/YYYYMMDD_notification_triggers.sql

-- Function: Cek stok menipis setelah transaksi
CREATE OR REPLACE FUNCTION check_low_stock_and_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_product RECORD;
  v_alert_exists BOOLEAN;
BEGIN
  -- Ambil produk yang baru saja dikurangi stoknya
  SELECT id, name, stock, minimum_stock, user_id
  INTO v_product
  FROM products
  WHERE id = NEW.product_id;

  -- Cek apakah stok di bawah minimum
  IF v_product.stock <= v_product.minimum_stock THEN
    -- Cek apakah sudah ada notifikasi stok menipis untuk produk ini (unread)
    SELECT EXISTS(
      SELECT 1 FROM notifications
      WHERE user_id = v_product.user_id
        AND type = 'stock_alert'
        AND is_read = false
        AND data::jsonb->>'product_id' = v_product.id::text
    ) INTO v_alert_exists;

    -- Jika belum ada, buat notifikasi baru
    IF NOT v_alert_exists THEN
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES (
        v_product.user_id,
        'stock_alert',
        'Stok Menipis',
        v_product.name || ' tersisa ' || v_product.stock || ' unit (minimum: ' || v_product.minimum_stock || ')',
        jsonb_build_object('product_id', v_product.id, 'product_name', v_product.name, 'stock', v_product.stock)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger setelah stock movements (transaksi, retur, adjustment)
CREATE TRIGGER trigger_low_stock_alert
AFTER INSERT ON stock_movements
FOR EACH ROW
WHEN (NEW.movement_type IN ('sale', 'adjustment_out'))
EXECUTE FUNCTION check_low_stock_and_notify();
```

**Keuntungan:**
- Otomatis tanpa kode frontend
- Realtime, langsung saat stok berkurang
- Mencegah duplikasi (cek `v_alert_exists`)

#### 1.2 Notifikasi Transaksi Baru (Optional)

Jika ingin notif setiap transaksi baru dibuat:

```sql
CREATE OR REPLACE FUNCTION notify_new_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    NEW.user_id,
    'transaction',
    'Transaksi Baru',
    'Transaksi ' || NEW.transaction_number || ' berhasil dibuat',
    jsonb_build_object('transaction_id', NEW.id, 'transaction_number', NEW.transaction_number)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_new_transaction_notify
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION notify_new_transaction();
```

**Catatan:** Ini bisa jadi **terlalu noisy** jika transaksi banyak. Lebih baik notif hanya untuk event penting:
- Pembayaran piutang lunas
- Retur besar (> Rp 500.000)
- Transaksi kredit melebihi limit

---

### Priority 2: Realtime Subscription (MEDIUM)

**Masalah:** User tidak tahu ada notifikasi baru sampai refresh.

**Solusi:** Aktifkan Supabase Realtime untuk tabel `notifications`.

#### 2.1 Enable Realtime di Supabase Dashboard

```sql
-- Di Supabase Dashboard → Database → Replication
-- Aktifkan realtime untuk tabel notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

#### 2.2 Update Store Subscription

```typescript
// src/stores/notifications.ts

const subscribeToNotifications = () => {
  const channel = supabase
    .channel('notifications-changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${getCurrentUserId()}`
      },
      (payload) => {
        const newNotif = notificationsServiceAdapter.mapRow(payload.new)
        notifications.value.unshift(newNotif)
        updateUnreadCount()

        // Optional: Show browser notification (jika user allow)
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(newNotif.title, {
            body: newNotif.message,
            icon: '/icon-192.png',
            tag: newNotif.id
          })
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
```

**Keuntungan:**
- Notifikasi muncul langsung tanpa refresh
- User experience lebih baik
- Bisa trigger browser notification

---

### Priority 3: Push Notification Android (MEDIUM)

**Masalah:** User tidak tahu ada notifikasi baru jika app tidak dibuka.

**Solusi:** Gunakan Capacitor Local Notifications untuk native Android notifications.

#### 3.1 Install Plugin

```bash
npm install @capacitor/local-notifications
npx cap sync
```

#### 3.2 Request Permission & Send Notification

```typescript
// src/utils/pushNotification.ts

import { LocalNotifications } from '@capacitor/local-notifications'
import { isNativeApp } from '@/lib/platform'

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNativeApp()) return false

  const permission = await LocalNotifications.requestPermissions()
  return permission.display === 'granted'
}

export async function sendLocalNotification(
  title: string,
  body: string,
  data?: any
) {
  if (!isNativeApp()) return

  const permission = await LocalNotifications.checkPermissions()
  if (permission.display !== 'granted') return

  await LocalNotifications.schedule({
    notifications: [
      {
        title,
        body,
        id: Math.floor(Math.random() * 100000),
        schedule: { at: new Date(Date.now() + 1000) }, // 1 detik dari sekarang
        sound: undefined,
        attachments: undefined,
        actionTypeId: '',
        extra: data
      }
    ]
  })
}
```

#### 3.3 Trigger dari Realtime Subscription

```typescript
// src/stores/notifications.ts

const subscribeToNotifications = () => {
  const channel = supabase
    .channel('notifications-changes')
    .on('postgres_changes', { ... }, async (payload) => {
      const newNotif = notificationsServiceAdapter.mapRow(payload.new)
      notifications.value.unshift(newNotif)
      updateUnreadCount()

      // Send push notification (Android)
      if (isNativeApp()) {
        await sendLocalNotification(newNotif.title, newNotif.message, { notificationId: newNotif.id })
      }

      // Browser notification (web)
      if (!isNativeApp() && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(newNotif.title, { body: newNotif.message })
      }
    })
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
```

**Keuntungan:**
- User dapat notifikasi meski app di background
- Native Android experience
- Tidak perlu Firebase (local notifications saja cukup)

---

### Priority 4: Halaman List Notifikasi (LOW)

**Masalah:** "Lihat Semua" button tidak ada tujuan halaman.

**Solusi:** Lengkapi halaman `Notifications.vue` untuk menampilkan semua notifikasi dengan pagination dan filter.

#### 4.1 UI Halaman Notifications

```vue
<!-- src/views/Notifications.vue -->
<template>
  <AdminLayout>
    <MobilePageHeader title="Notifikasi" subtitle="Riwayat Notifikasi" @back="$router.back()" />

    <!-- Filter Tabs -->
    <div class="mb-4 flex gap-2">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        @click="activeTab = tab.value"
        :class="[
          'rounded-lg px-4 py-2 text-sm font-medium',
          activeTab === tab.value
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-700 border border-gray-300 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700'
        ]"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Notifikasi List -->
    <div class="space-y-2">
      <div
        v-for="notif in filteredNotifications"
        :key="notif.id"
        @click="handleClick(notif)"
        class="rounded-xl border p-3 cursor-pointer"
        :class="notif.is_read ? 'border-gray-200 bg-white' : 'border-blue-200 bg-blue-50'"
      >
        <div class="flex items-start gap-3">
          <span class="text-2xl">{{ getIcon(notif.type) }}</span>
          <div class="flex-1">
            <p class="font-bold text-sm">{{ notif.title }}</p>
            <p class="text-xs text-gray-600">{{ notif.message }}</p>
            <p class="text-[10px] text-gray-500 mt-1">{{ formatDate(notif.created_at) }}</p>
          </div>
          <button @click.stop="handleDelete(notif.id)" class="text-red-500">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="mt-4 flex gap-2">
      <button @click="handleMarkAllRead" class="flex-1 btn-secondary">Tandai Semua Dibaca</button>
      <button @click="handleDeleteAllRead" class="flex-1 btn-danger">Hapus Yang Sudah Dibaca</button>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationsStore } from '@/stores/notifications'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'

const router = useRouter()
const store = useNotificationsStore()

const activeTab = ref<'all' | 'unread'>('all')
const tabs = [
  { value: 'all', label: 'Semua' },
  { value: 'unread', label: 'Belum Dibaca' }
]

const filteredNotifications = computed(() => {
  if (activeTab.value === 'unread') {
    return store.notifications.filter(n => !n.is_read)
  }
  return store.notifications
})

const getIcon = (type: string) => {
  const icons = { stock_alert: '📦', transaction: '🛒', return: '↩️', payment: '💰', system: 'ℹ️' }
  return icons[type] || 'ℹ️'
}

const formatDate = (d: string) => new Date(d).toLocaleString('id-ID')

const handleClick = async (notif: any) => {
  await store.markAsRead(notif.id)
  // Navigate berdasarkan tipe
  if (notif.type === 'stock_alert') router.push('/stock')
  if (notif.type === 'transaction' && notif.data?.transaction_id) {
    router.push(`/transactions/${notif.data.transaction_id}`)
  }
}

const handleDelete = async (id: string) => {
  await store.deleteNotification(id)
}

const handleMarkAllRead = async () => {
  await store.markAllAsRead()
}

const handleDeleteAllRead = async () => {
  await store.deleteAllRead()
}

onMounted(() => {
  store.fetchNotifications()
})
</script>
```

#### 4.2 Update Router

```typescript
// src/router/index.ts

{
  path: '/notifications',
  name: 'notifications',
  component: () => import('@/views/Notifications.vue'),
  meta: { requiresAuth: true }
}
```

#### 4.3 Update NotificationMenu.vue

```typescript
const handleViewAllClick = () => {
  router.push('/notifications')
  closeDropdown()
}
```

---

## 🔔 Rekomendasi Notifikasi yang Berguna

### 1. **Stok Menipis** ⭐⭐⭐⭐⭐ (MUST HAVE)
- Trigger: Stok <= minimum_stock setelah transaksi
- Frekuensi: 1x per produk (sampai stok di-restock)
- Action: Link ke halaman stok

### 2. **Piutang Jatuh Tempo** ⭐⭐⭐⭐⭐ (MUST HAVE)
- Trigger: H-3 sebelum jatuh tempo, dan H+1 setelah jatuh tempo
- Frekuensi: Daily check via cron (scheduled sync)
- Action: Link ke invoice customer

### 3. **Pembayaran Piutang Lunas** ⭐⭐⭐⭐ (NICE TO HAVE)
- Trigger: Transaction `remaining_amount` = 0
- Frekuensi: Setiap pembayaran lunas
- Action: Link ke detail transaksi

### 4. **Retur Besar** ⭐⭐⭐ (NICE TO HAVE)
- Trigger: Retur > Rp 500.000
- Frekuensi: Setiap retur besar
- Action: Link ke detail retur

### 5. **Laporan Harian** ⭐⭐ (OPTIONAL)
- Trigger: Setiap hari jam 21:00 (end of day)
- Isi: Total penjualan hari ini, transaksi terbanyak
- Frekuensi: Daily
- Action: Link ke laporan penjualan

### 6. **Backup Berhasil** ⭐⭐ (OPTIONAL)
- Trigger: Scheduled sync berhasil upload data
- Frekuensi: Setiap backup berhasil (scheduled sync)
- Action: Tidak ada (info only)

---

## 🚀 Roadmap Implementasi

### Phase 1: Basic (1-2 hari)
- [ ] Database trigger untuk stok menipis
- [ ] Halaman list notifikasi lengkap
- [ ] "Lihat Semua" button berfungsi

### Phase 2: Realtime (1 hari)
- [ ] Enable Supabase Realtime
- [ ] Update subscription di store
- [ ] Browser notification (web)

### Phase 3: Push Notification (1-2 hari)
- [ ] Install Capacitor Local Notifications
- [ ] Request permission on app start
- [ ] Send local notification dari realtime subscription
- [ ] Handle tap notification (deep link)

### Phase 4: Advanced (2-3 hari)
- [ ] Database trigger piutang jatuh tempo (via cron check)
- [ ] Notifikasi pembayaran lunas
- [ ] Notifikasi retur besar
- [ ] Notifikasi laporan harian (optional)

---

## 💡 Tips & Best Practices

### 1. **Jangan Terlalu Banyak Notifikasi**
- Hanya event penting yang perlu notifikasi
- Transaksi biasa TIDAK perlu notifikasi (terlalu noisy)
- Gunakan filter (misal: retur > Rp 500k, bukan semua retur)

### 2. **Grouping Notifikasi**
- Jika ada 5 produk stok menipis → 1 notifikasi "5 Produk Stok Menipis"
- Jangan 5 notifikasi terpisah

### 3. **Auto-Delete Notifikasi Lama**
- Hapus notifikasi yang sudah dibaca > 30 hari
- Cron job untuk cleanup

### 4. **Deep Link**
- Setiap notifikasi harus bisa diklik dan navigate ke halaman terkait
- Gunakan `data` field untuk simpan `product_id`, `transaction_id`, dll

### 5. **Permission Request UX**
- Jangan request notification permission saat app pertama kali buka
- Request setelah user berinteraksi (misal: setelah transaksi pertama)
- Jelaskan manfaatnya: "Aktifkan notifikasi agar tidak ketinggalan stok menipis"

---

## 📊 Estimasi Effort

| Feature | Effort | Impact | Priority |
|---------|--------|--------|----------|
| Database trigger stok menipis | 2 jam | High | P1 |
| Halaman list notifikasi | 3 jam | Medium | P1 |
| Realtime subscription | 2 jam | High | P2 |
| Push notification Android | 4 jam | High | P2 |
| Notifikasi piutang jatuh tempo | 4 jam | High | P3 |
| Notifikasi pembayaran lunas | 1 jam | Low | P3 |
| Laporan harian | 3 jam | Low | P4 |

**Total Estimate:** ~19 jam (~2-3 hari kerja)

---

## ❓ FAQ

**Q: Apakah perlu Firebase Cloud Messaging (FCM)?**
A: Tidak perlu untuk sekarang. Capacitor Local Notifications cukup untuk notifikasi yang dipicu dari app. FCM hanya perlu jika ingin push notification dari server tanpa app dibuka sama sekali.

**Q: Bagaimana dengan mode offline (SQLite)?**
A: Notifikasi di mode offline bisa disimpan di tabel `notifications` SQLite, tapi push notification tidak bisa muncul karena butuh koneksi untuk trigger realtime. Solusi: saat app kembali online, cek notifikasi baru dan tampilkan sebagai badge.

**Q: Apakah Supabase Realtime gratis?**
A: Ya, Supabase Realtime termasuk dalam free tier. Limit: 200 concurrent connections, 2 juta messages/month. Untuk toko kelontong, ini lebih dari cukup.

**Q: Bagaimana cara testing push notification?**
A: 
1. Build APK debug: `npm run build && npx cap sync && cd android && ./gradlew assembleDebug`
2. Install di device: `adb install app-debug.apk`
3. Trigger notifikasi manual via Supabase Dashboard (insert row ke tabel notifications)
4. Notifikasi harus muncul di device

---

## 🎯 Kesimpulan

**Start dengan Priority 1 & 2:**
1. Database trigger untuk stok menipis (2 jam)
2. Halaman list notifikasi (3 jam)
3. Realtime subscription (2 jam)

Total: **~7 jam** untuk core notification system yang **sangat berguna**.

Push notification Android (Priority 3) bisa dilakukan setelah core system stabil.
