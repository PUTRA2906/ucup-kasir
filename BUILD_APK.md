# Build APK dengan GitHub Actions

Panduan lengkap untuk build APK aplikasi Ucup Kasir menggunakan GitHub Actions tanpa perlu install Android Studio di lokal.

## Setup yang Sudah Dilakukan

### 1. Capacitor Terinstall
- ✅ `@capacitor/core`, `@capacitor/cli`, `@capacitor/android` sudah terinstall
- ✅ Platform Android sudah ditambahkan
- ✅ Konfigurasi Capacitor sudah dibuat di `capacitor.config.ts`

### 2. GitHub Actions Workflow
File workflow sudah dibuat di `.github/workflows/build-apk.yml`

## Langkah Setup di GitHub

### 1. Push Project ke GitHub

Jika belum ada repository:
```bash
git add .
git commit -m "Setup Capacitor untuk build APK"
git remote add origin https://github.com/username/ucup-kasir.git
git push -u origin master
```

### 2. Tambahkan Secrets di GitHub

Buka repository di GitHub → Settings → Secrets and variables → Actions → New repository secret

**Secrets yang Wajib:**
1. `VITE_SUPABASE_URL` - URL Supabase Anda
2. `VITE_SUPABASE_ANON_KEY` - Anon key Supabase Anda

**Secrets untuk Signed APK (Opsional):**
Jika ingin APK yang di-sign (untuk production):
1. `ANDROID_KEYSTORE_PASSWORD` - Password keystore
2. `ANDROID_KEY_ALIAS` - Alias key
3. `ANDROID_KEY_PASSWORD` - Password key alias

### 3. Build APK Otomatis

GitHub Actions akan otomatis build APK saat:
- Push ke branch `main` atau `master`
- Membuat Pull Request
- Manual trigger dari tab Actions

## Download APK Hasil Build

1. Buka repository di GitHub
2. Klik tab **Actions**
3. Pilih workflow run yang sudah selesai
4. Scroll ke bawah ke bagian **Artifacts**
5. Download `app-debug` (untuk testing)

## Build APK Secara Manual (Lokal)

Jika ingin build di lokal tanpa GitHub Actions:

### Persiapan
1. Install Android Studio
2. Install Java JDK 17
3. Setup Android SDK

### Perintah Build
```bash
# Build Vue app
npm run build

# Sync Capacitor
npx cap sync android

# Build APK
cd android
./gradlew assembleDebug

# APK hasil build ada di:
# android/app/build/outputs/apk/debug/app-debug.apk
```

## Struktur File Capacitor

```
ucup-kasir/
├── android/                    # Platform Android
│   ├── app/
│   │   └── src/main/assets/   # Web assets (dari dist/)
│   └── build.gradle
├── capacitor.config.ts         # Konfigurasi Capacitor
├── .github/
│   └── workflows/
│       └── build-apk.yml       # GitHub Actions workflow
└── dist/                       # Build output Vue (web-dir)
```

## Konfigurasi Capacitor

File `capacitor.config.ts`:
- `appId`: com.ucupkasir.app (unique identifier)
- `appName`: Ucup Kasir (nama yang muncul di Android)
- `webDir`: dist (folder hasil build Vue)
- `androidScheme`: https (untuk HTTPS di WebView)

## Testing APK

### Install APK di Android
1. Download APK dari GitHub Actions artifacts
2. Kirim file APK ke HP Android
3. Buka file APK dan install
4. Jika ada warning "Install blocked", aktifkan "Install from unknown sources"

### Debug di Android Studio (Opsional)
```bash
npx cap open android
```
Ini akan membuka project Android di Android Studio untuk debugging lebih lanjut.

## Membuat Signed APK (Production)

### 1. Generate Keystore (sekali saja)
```bash
keytool -genkey -v -keystore ucup-kasir.keystore -alias ucupkasir -keyalg RSA -keysize 2048 -validity 10000
```

Simpan keystore file dengan aman!

### 2. Konfigurasi di GitHub Secrets
Tambahkan secrets:
- `ANDROID_KEYSTORE_PASSWORD`: password keystore
- `ANDROID_KEY_ALIAS`: ucupkasir
- `ANDROID_KEY_PASSWORD`: password key alias

### 3. Upload Keystore ke GitHub
Encode keystore ke base64 dan simpan sebagai secret:
```bash
base64 ucup-kasir.keystore > keystore.txt
```
Copy isi `keystore.txt` dan simpan sebagai GitHub secret `ANDROID_KEYSTORE_BASE64`

### 4. Update Workflow
Uncomment bagian signing di `.github/workflows/build-apk.yml`

## Fitur yang Bisa Digunakan di APK

Aplikasi web akan berjalan di WebView Android dengan semua fitur:
- ✅ Manajemen produk dan kategori
- ✅ Transaksi penjualan
- ✅ Retur produk
- ✅ Manajemen customer
- ✅ Laporan penjualan
- ✅ Stok gudang
- ✅ Notifikasi real-time
- ✅ Invoice pelanggan

## Menambahkan Fitur Native (Opsional)

Untuk fitur native seperti barcode scanner, camera, printer:

```bash
# Camera
npm install @capacitor/camera
npx cap sync

# Barcode Scanner
npm install @capacitor-community/barcode-scanner
npx cap sync
```

Kemudian gunakan di Vue component:
```typescript
import { Camera } from '@capacitor/camera'

const takePicture = async () => {
  const image = await Camera.getPhoto({
    quality: 90,
    allowEditing: true,
    resultType: 'uri'
  })
}
```

## Troubleshooting

### Build Gagal di GitHub Actions
- Cek apakah secrets sudah ditambahkan dengan benar
- Lihat error log di tab Actions
- Pastikan `npm run build` berhasil di lokal

### APK Tidak Bisa Install
- Pastikan Android version minimal 7.0 (API 24)
- Aktifkan "Install from unknown sources"
- Uninstall APK lama jika ada

### WebView Tidak Load
- Cek URL Supabase di secrets
- Pastikan koneksi internet aktif
- Cek console error di Chrome DevTools (chrome://inspect)

### Ukuran APK Besar
APK debug biasanya 50-80MB. Untuk memperkecil:
- Build release APK (signed)
- Aktifkan ProGuard di `android/app/build.gradle`
- Gunakan App Bundle (.aab) untuk Google Play

## Next Steps

1. **Push ke GitHub** dan cek apakah workflow berjalan
2. **Download APK** dari Artifacts dan test di HP
3. **Setup Signed APK** untuk production
4. **Tambah icon dan splash screen** di `android/app/src/main/res/`
5. **Publish ke Google Play Store** (opsional)

## Resources

- Capacitor Docs: https://capacitorjs.com/docs
- GitHub Actions Docs: https://docs.github.com/actions
- Android Developer: https://developer.android.com/
