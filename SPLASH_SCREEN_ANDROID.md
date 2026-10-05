# Splash Screen Android - Ucup Kasir

## Overview

Splash screen yang telah dikonfigurasi untuk aplikasi Android **Tagih Kios** (Ucup Kasir).

## File yang Dibuat/Diupdate

### 1. **Konfigurasi Capacitor** (`capacitor.config.ts`)
```typescript
plugins: {
  SplashScreen: {
    launchShowDuration: 2000,        // Tampil 2 detik
    launchAutoHide: true,             // Auto hide setelah app ready
    launchFadeOutDuration: 500,       // Fade out 0.5 detik
    backgroundColor: '#FFFFFF',       // Background putih
    androidSplashResourceName: 'splash_background',
    androidScaleType: 'CENTER_CROP',
    showSpinner: false,               // Tanpa loading spinner
    splashFullScreen: true,
    splashImmersive: true
  }
}
```

### 2. **Android Resources**

#### `android/app/src/main/res/values/colors.xml` (NEW)
- `colorPrimary`: #3B82F6 (Blue)
- `colorPrimaryDark`: #2563EB (Dark Blue)
- `colorAccent`: #10B981 (Green)
- `splashBackground`: #FFFFFF (White)

#### `android/app/src/main/res/drawable/splash_icon.xml` (NEW)
Vector drawable dengan:
- Circle background dengan opacity gradient (blue)
- Icon receipt/struk dengan garis-garis
- Circle green dengan teks "Rp" di tengah
- Desain modern dan clean

#### `android/app/src/main/res/drawable/splash_background.xml` (UPDATED)
Layer-list dengan:
- Background putih solid
- Icon centered di tengah layar

#### `android/app/src/main/res/values/styles.xml` (UPDATED)
Dua theme:
1. `AppTheme.NoActionBarLaunch` - untuk Android < 12
2. `SplashScreenTheme` - untuk Android 12+ (dengan animated icon)

## Desain Splash Screen

### Visual Elements
- **Background**: Putih bersih (#FFFFFF)
- **Icon**: 
  - Circle gradient blue sebagai latar
  - Icon receipt/struk (simbol transaksi/penjualan)
  - Badge green dengan "Rp" (simbol mata uang)
- **Ukuran**: 512x512dp (scalable vector)
- **Posisi**: Center screen

### Branding Colors
- **Primary Blue**: #3B82F6 (warna utama aplikasi)
- **Green Accent**: #10B981 (warna aksen untuk success/money)
- **Text Gray**: #1F2937 (dark), #6B7280 (light)

## Build & Deploy

### Build untuk Testing
```bash
# 1. Build web assets
npm run build

# 2. Sync ke Android project
npx cap sync

# 3. Build APK debug
cd android && ./gradlew assembleDebug

# 4. Install ke device/emulator
adb install app/build/outputs/apk/debug/app-debug.apk
```

### Build untuk Release
```bash
npm run build
npx cap sync
cd android && ./gradlew assembleRelease
```

## Durasi & Behavior

- **Show Duration**: 2000ms (2 detik)
- **Fade Out**: 500ms (0.5 detik)
- **Auto Hide**: Yes (otomatis hilang setelah app ready)
- **Full Screen**: Yes (immersive mode tanpa status/nav bar)

## Compatibility

- **Android 5.0 (API 21)** - 11: Menggunakan `AppTheme.NoActionBarLaunch` dengan drawable biasa
- **Android 12 (API 31)+**: Menggunakan `SplashScreenTheme` dengan animated icon (SplashScreen API baru)

## Customization

### Mengubah Durasi
Edit `capacitor.config.ts`:
```typescript
launchShowDuration: 3000  // 3 detik
```

### Mengubah Warna Background
Edit `android/app/src/main/res/values/colors.xml`:
```xml
<color name="splashBackground">#F3F4F6</color>
```

### Menambahkan Loading Spinner
Edit `capacitor.config.ts`:
```typescript
showSpinner: true,
spinnerColor: '#3B82F6'
```

## Testing Checklist

- [ ] Build APK debug dan install ke device
- [ ] Test splash screen saat app pertama kali dibuka
- [ ] Verifikasi durasi 2 detik
- [ ] Verifikasi fade out smooth
- [ ] Test di berbagai ukuran layar (phone, tablet)
- [ ] Test di Android versi berbeda (5.0, 8.0, 12.0+)
- [ ] Verifikasi status bar dan navigation bar transparan/putih

## Notes

- File `splash.png` lama (480x320) masih ada tapi tidak digunakan lagi
- Splash screen menggunakan vector drawable (SVG) sehingga scalable untuk semua ukuran layar
- Icon receipt melambangkan fungsi utama app: transaksi penjualan
- Badge "Rp" melambangkan pengelolaan kas/keuangan toko
- Warna blue & green konsisten dengan branding modern POS app

## Troubleshooting

### Splash screen tidak muncul
```bash
# Re-sync Capacitor
npx cap sync android

# Clean & rebuild
cd android && ./gradlew clean && ./gradlew assembleDebug
```

### Icon tidak centered
Check `splash_background.xml` - pastikan `android:gravity="center"`

### Warna tidak sesuai
Check `colors.xml` dan `styles.xml` - pastikan reference color benar
