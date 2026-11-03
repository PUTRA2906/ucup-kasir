# Feature: Scheduled Sync (Backup Otomatis)

## 🎯 Objektif

Memberikan fitur backup otomatis terjadwal yang mengirim perubahan data ke server secara otomatis setiap hari tanpa perlu intervensi manual dari user.

## ✨ Fitur Utama

### 1. **Upload Otomatis Terjadwal**
- Backup otomatis setiap hari pada jam yang dijadwalkan (default: 00:00 / 12 malam)
- User bisa mengatur waktu sesuai kebutuhan (misal: 02:00, 23:00, dll)
- Hanya upload changes (dari sync_queue), bukan full backup

### 2. **Offline Handling**
- **Jika device offline saat scheduled time**: Tunggu sampai online, baru upload
- **Retry mechanism**: Coba ulang setiap 5 menit jika masih offline (maksimal 3x)
- Tidak akan skip backup, hanya ditunda sampai online

### 3. **Retry on Failure**
- Jika upload gagal (network error, server error, dll): Retry otomatis
- Interval retry: 5 menit, 10 menit, 15 menit (eksponensial backoff)
- Maksimal 3x retry, setelah itu berhenti dan kirim notifikasi gagal

### 4. **Local Notification**
- Notifikasi sukses: "Backup Otomatis Berhasil - X data berhasil dibackup"
- Notifikasi gagal: "Backup Otomatis Gagal - Silakan backup manual di Settings"
- Notifikasi hanya muncul jika ada perubahan yang di-upload

### 5. **Battery-Aware (Optional)**
- Config `uploadOnlyWhenCharging`: Upload hanya saat device charging
- Default: `false` (upload kapan saja)
- Berguna untuk hemat battery pada device lama

## 🏗️ Arsitektur

```
┌─────────────────────────────────────────────────────┐
│         scheduledSync.ts (Core Logic)               │
├─────────────────────────────────────────────────────┤
│  - Config management (Preferences storage)          │
│  - Scheduler engine (setInterval + cron-like check) │
│  - Upload execution with retry                      │
│  - Battery check (optional)                         │
│  - Notification sender                              │
└─────────────────────────────────────────────────────┘
                          ▲
                          │ calls
                          │
┌─────────────────────────────────────────────────────┐
│         syncEngine.ts                               │
├─────────────────────────────────────────────────────┤
│  - uploadChangesToSupabase()                        │
│  - Process sync_queue                               │
│  - Batch upload (50 items/batch)                    │
└─────────────────────────────────────────────────────┘
                          ▲
                          │ writes to
                          │
┌─────────────────────────────────────────────────────┐
│         Supabase (Backend)                          │
├─────────────────────────────────────────────────────┤
│  - Receive data from sync_queue                     │
│  - Store to tables                                  │
└─────────────────────────────────────────────────────┘
```

## 📁 File Structure

```
src/
├── services/
│   └── sync/
│       ├── syncEngine.ts           # Core sync logic (existing)
│       └── scheduledSync.ts        # ✅ NEW - Scheduled sync logic
└── views/
    └── Settings/
        └── StoreSettings.vue       # ✅ UPDATED - UI for config
```

## 🔧 Implementation Details

### 1. Config Storage

Config disimpan di **Capacitor Preferences** (localStorage di web):

```typescript
interface ScheduledSyncConfig {
  enabled: boolean                    // true = aktif
  scheduleTime: string                // "HH:mm" format (e.g. "00:00")
  lastRun: string | null              // ISO timestamp run terakhir
  retryOnFail: boolean                // true = retry jika gagal
  uploadOnlyWhenCharging: boolean     // true = hanya saat charging
}
```

**Storage Key:** `scheduled_sync_config`

### 2. Scheduler Logic

**Check Interval:** 1 menit (cek setiap menit apakah sudah waktunya)

**Cron-like Check:**
```typescript
const now = new Date()
const [targetHour, targetMinute] = scheduleTime.split(':').map(Number)

const isScheduledTime = 
  now.getHours() === targetHour && 
  now.getMinutes() === targetMinute
```

**Daily Check:**
- Jika sudah run hari ini (`lastRun` = today), skip
- Jika belum run hari ini, execute upload

### 3. Upload Flow

```
1. Check online
   ├─ YES → Continue
   └─ NO  → Retry in 5 minutes (max 3x)

2. Check battery (if uploadOnlyWhenCharging = true)
   ├─ Charging    → Continue
   └─ Not charging → Skip upload

3. Execute uploadChangesToSupabase()
   ├─ Success → Update lastRun, send notification
   └─ Fail    → Retry with backoff (5m, 10m, 15m)

4. After max retry
   └─ Send failure notification
```

### 4. Retry Mechanism

**Retry Delay:**
- Retry 1: 5 menit
- Retry 2: 10 menit
- Retry 3: 15 menit

**Max Retry:** 3x

**Retry Trigger:**
- Network offline
- Upload failed (server error, timeout, dll)

### 5. Notification

**Required Plugin:** `@capacitor/local-notifications`

**Permission:** Request on first notification

**Notification Content:**
```typescript
// Success
{
  title: "Backup Otomatis Berhasil",
  body: "50 data berhasil dibackup"
}

// Failure
{
  title: "Backup Otomatis Gagal",
  body: "Silakan backup manual di Settings"
}
```

## 🎨 UI/UX

### Settings Page

**Button:** "Backup Otomatis"
- **Status OFF**: "Tidak aktif" (abu-abu)
- **Status ON**: "Aktif - 00:00" (hijau + checkmark)

**Klik button** → Open dialog konfigurasi

### Dialog Konfigurasi

**Title:**
- Jika OFF: "Aktifkan Backup Otomatis"
- Jika ON: "Pengaturan Backup Otomatis"

**Fields:**
- Time picker (input type="time")
- Default: 00:00
- Rekomendasi: Tengah malam (aktivitas rendah)

**Info Card (jika sudah aktif):**
- Status: "Backup Otomatis Aktif" (hijau)
- Last run: "3 Nov, 00:00 (2 jam lalu)"
- Next run: "4 Nov, 00:00 (22 jam lagi)"

**Features List:**
- ✅ Upload otomatis setiap hari
- ✅ Menunggu koneksi internet jika offline
- ✅ Retry otomatis jika gagal (3x)
- ✅ Notifikasi setelah backup

**Buttons:**
- **Cancel** (abu-abu)
- **Aktifkan** (hijau) / **Simpan** (biru)
- **Nonaktifkan** (merah, kecil, di bawah)

## 📊 User Flow

### Flow 1: Enable Scheduled Sync

```
User buka Settings
  ↓
Klik "Backup Otomatis"
  ↓
Dialog muncul (status: OFF)
  ↓
Set waktu (misal: 02:00)
  ↓
Klik "Aktifkan"
  ↓
Scheduler started
  ↓
Toast: "Backup otomatis diaktifkan pada jam 02:00"
```

### Flow 2: Scheduled Upload (Happy Path)

```
Jam 02:00 (sesuai jadwal)
  ↓
Scheduler check: isScheduledTime = true
  ↓
Check online: YES
  ↓
Execute upload
  ↓
Upload success: 50 data
  ↓
Update lastRun
  ↓
Send notification: "Backup Otomatis Berhasil - 50 data"
```

### Flow 3: Scheduled Upload (Offline Scenario)

```
Jam 02:00 (sesuai jadwal)
  ↓
Scheduler check: isScheduledTime = true
  ↓
Check online: NO
  ↓
Log: "Device offline, will retry in 5 minutes"
  ↓
Wait 5 minutes
  ↓
Check online: YES
  ↓
Execute upload
  ↓
Success
```

### Flow 4: Scheduled Upload (Failure + Retry)

```
Jam 02:00 (sesuai jadwal)
  ↓
Execute upload
  ↓
Upload failed (server timeout)
  ↓
Log: "Upload failed, will retry in 5 minutes"
  ↓
Wait 5 minutes → Retry 1
  ↓
Failed again
  ↓
Wait 10 minutes → Retry 2
  ↓
Failed again
  ↓
Wait 15 minutes → Retry 3
  ↓
Failed (max retry reached)
  ↓
Send notification: "Backup Otomatis Gagal - Silakan backup manual"
```

## 🔒 Security & Privacy

### Data Security
- Config disimpan lokal (Preferences), tidak dikirim ke server
- Tidak ada data sensitif di config
- Upload tetap melalui Supabase Auth (RLS berlaku)

### Permission
- **Local Notifications**: Request on first use
- **Battery Info** (optional): Requires `@capacitor/device` plugin

## 🧪 Testing

### Test Case 1: Enable Scheduled Sync
1. Buka Settings
2. Klik "Backup Otomatis"
3. Set waktu: 00:00
4. Klik "Aktifkan"
5. **Expected:** Toast success, status jadi "Aktif - 00:00"

### Test Case 2: Upload on Schedule (Manual Trigger)
1. Enable scheduled sync
2. Buat perubahan data (tambah produk)
3. Panggil `triggerScheduledUploadNow()` (untuk testing)
4. **Expected:** Upload berhasil, notifikasi muncul

### Test Case 3: Offline Handling
1. Enable scheduled sync
2. Matikan internet
3. Trigger upload (atau tunggu scheduled time)
4. **Expected:** Log "Device offline, will retry"
5. Nyalakan internet
6. **Expected:** Upload otomatis setelah 5 menit

### Test Case 4: Retry on Failure
1. Enable scheduled sync
2. Simulasi server error (disconnect Supabase)
3. Trigger upload
4. **Expected:** Retry 3x dengan interval 5, 10, 15 menit
5. Setelah max retry, notifikasi gagal muncul

### Test Case 5: Change Schedule Time
1. Scheduled sync sudah aktif (00:00)
2. Buka dialog, ubah jadi 02:00
3. Klik "Simpan"
4. **Expected:** Scheduler restart dengan waktu baru

### Test Case 6: Disable Scheduled Sync
1. Scheduled sync sudah aktif
2. Buka dialog
3. Klik "Nonaktifkan"
4. **Expected:** Scheduler stop, status jadi "Tidak aktif"

## 📈 Performance

### Resource Usage
- **CPU**: Minimal (cek 1x/menit, hanya 1 conditional check)
- **Memory**: ~1-2 KB (hanya state scheduler)
- **Battery**: Negligible (tidak ada wake lock)

### Network Usage
- **Per upload**: Tergantung jumlah data di sync_queue
- **Typical**: 50-500 KB (untuk 50-100 changes)
- **Bandwidth friendly**: Hanya upload delta, bukan full backup

## 🐛 Known Limitations

### 1. Time Precision
- **Cek interval:** 1 menit
- **Precision:** ±1 menit dari scheduled time
- **Misal:** Set 00:00, bisa run di 00:00 atau 00:01

**Workaround:** Acceptable untuk use case backup (tidak perlu detik-presisi)

### 2. Background Restrictions (Android)
- **Android 9+**: Background process bisa di-kill oleh OS
- **Battery optimization**: Scheduler bisa tertunda jika app di-kill

**Workaround:**
- Recommend user disable battery optimization untuk app
- Add foreground service untuk Android 12+ (future improvement)

### 3. No Wake Lock
- Scheduler **tidak** wake device dari sleep
- Hanya run saat app foreground atau device awake

**Workaround:**
- Assume device awake di scheduled time (00:00 = tengah malam, biasanya sleep)
- User bisa set waktu di pagi hari (misal: 06:00 saat bangun)

### 4. Single Schedule Only
- Hanya 1 scheduled time per hari
- Tidak support multiple schedules (misal: 06:00 dan 18:00)

**Workaround:** Pilih waktu terbaik (rekomendasi: tengah malam)

## 🔮 Future Improvements

### Priority 1 (Next Sprint)
- [ ] Foreground Service untuk Android 12+ (prevent kill)
- [ ] Battery optimization detection + prompt
- [ ] Upload summary di notifikasi (X data uploaded, Y failed)

### Priority 2 (Future)
- [ ] Multiple schedules (2-3x per hari)
- [ ] Weekly schedule (hanya hari tertentu)
- [ ] Configurable retry interval
- [ ] Upload progress notification

### Priority 3 (Nice to Have)
- [ ] Sync statistics (total uploaded, success rate)
- [ ] Auto-pause saat roaming
- [ ] Compress data sebelum upload (gzip)

## 📚 API Reference

### Public Functions

#### `enableScheduledSync(scheduleTime: string)`
Enable scheduled sync dengan waktu tertentu.

**Params:**
- `scheduleTime`: Format "HH:mm" (e.g. "00:00")

**Returns:** `Promise<void>`

**Example:**
```typescript
await enableScheduledSync('02:00')
```

#### `disableScheduledSync()`
Disable scheduled sync.

**Returns:** `Promise<void>`

#### `getScheduledSyncStatus()`
Get status scheduler saat ini.

**Returns:** `Promise<ScheduledSyncStatus>`

**Response:**
```typescript
{
  enabled: true,
  scheduleTime: "00:00",
  lastRun: "2026-11-03T00:00:00.000Z",
  nextRun: "2026-11-04T00:00:00.000Z",
  isRunning: true
}
```

#### `startScheduler()`
Start scheduler (dipanggil otomatis saat enable).

**Returns:** `Promise<void>`

#### `stopScheduler()`
Stop scheduler (dipanggil otomatis saat disable).

**Returns:** `void`

#### `triggerScheduledUploadNow()`
Trigger upload manual (untuk testing).

**Returns:** `Promise<void>`

## 📝 Configuration

### Default Config

```typescript
{
  enabled: false,
  scheduleTime: "00:00",
  lastRun: null,
  retryOnFail: true,
  uploadOnlyWhenCharging: false
}
```

### Change Config

```typescript
import { getScheduledSyncConfig, saveScheduledSyncConfig } from '@/services/sync/scheduledSync'

// Get config
const config = await getScheduledSyncConfig()

// Modify
config.uploadOnlyWhenCharging = true

// Save
await saveScheduledSyncConfig(config)
```

## 🚀 Deployment

### Requirements

1. **Capacitor Plugins** (optional, graceful fallback jika tidak ada):
   - `@capacitor/preferences` (✅ sudah ada)
   - `@capacitor/local-notifications` (⚠️ optional, untuk notifikasi)
   - `@capacitor/device` (⚠️ optional, untuk battery check)

2. **Install Plugins:**
```bash
npm install @capacitor/local-notifications @capacitor/device
npx cap sync
```

3. **Android Permissions** (tambah di `AndroidManifest.xml`):
```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.BATTERY_STATS" />
```

### Enable Feature

Di `src/views/Settings/StoreSettings.vue`, scheduled sync sudah terintegrasi.

User bisa enable dari UI tanpa perlu config tambahan.

---

**Date:** 2026-11-03  
**Status:** ✅ Implementation Complete  
**Tested:** Pending (butuh device Android untuk test notifikasi)  
**Ready for:** Testing & Deployment
