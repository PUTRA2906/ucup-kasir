# Android App Signing & Versioning

## Masalah: Package Conflict saat Install Update

Jika Anda mengalami error "Package conflict" atau "App not installed" saat mencoba install update aplikasi, ini disebabkan oleh **signature key yang berbeda** antara versi lama dan versi baru.

### Penyebab
- Setiap build APK ditandatangani dengan signature/certificate
- Android memverifikasi signature saat install update
- Jika signature berbeda, Android menolak update (security feature)

### Solusi

#### 1. Setup Keystore (SEKALI SAJA)

Generate keystore untuk signing APK Anda:

```bash
bash generate-keystore.sh
```

Anda akan diminta mengisi:
- **Password keystore** (minimal 6 karakter)
- **Password key** (bisa sama dengan password keystore)
- **Nama & Organisasi** (contoh: "Ucup Kasir", "PT. Your Company")
- **Lokasi** (contoh: "Jakarta, DKI Jakarta, ID")

**⚠️ PENTING:**
- Simpan password dengan AMAN (gunakan password manager)
- Backup keystore file (`android/ucup-kasir-release.keystore`)
- Jika keystore hilang, Anda TIDAK BISA update aplikasi yang sudah terinstall
- User harus uninstall dulu, lalu install versi baru (data hilang)

#### 2. Konfigurasi Keystore

Copy template dan edit dengan password Anda:

```bash
cp android/keystore.properties.example android/keystore.properties
```

Edit `android/keystore.properties`:
```properties
storeFile=ucup-kasir-release.keystore
storePassword=PASSWORD_KEYSTORE_ANDA
keyAlias=ucupkasir
keyPassword=PASSWORD_KEY_ANDA
```

#### 3. Update Version Sebelum Build

**PENTING:** Setiap kali build versi baru untuk distribution, update version di `android/app/build.gradle`:

```gradle
defaultConfig {
    applicationId "com.ucupkasir.app"
    versionCode 2      // Naikkan +1 setiap update (2, 3, 4, ...)
    versionName "1.1"  // Versi yang terlihat user (1.1, 1.2, 2.0, ...)
    ...
}
```

**Version Rules:**
- `versionCode`: Integer, harus selalu naik (Android requirement)
- `versionName`: String, untuk ditampilkan ke user (bebas format)

Contoh:
```
Release 1: versionCode 1, versionName "1.0"
Update 1:  versionCode 2, versionName "1.1"
Update 2:  versionCode 3, versionName "1.2"
Major:     versionCode 4, versionName "2.0"
```

#### 4. Build Release APK

```bash
# 1. Build Vue.js project
npm run build

# 2. Sync ke Capacitor
npx cap sync

# 3. Build APK
cd android
./gradlew assembleRelease

# APK tersimpan di:
# android/app/build/outputs/apk/release/app-release.apk
```

#### 5. Install/Update di Device

```bash
# Install via ADB
adb install -r android/app/build/outputs/apk/release/app-release.apk

# Flag -r = reinstall/update (keep data)
```

## Workflow Update Aplikasi

### Development (Testing Internal)
Untuk testing, Anda bisa menggunakan debug build:

```bash
npm run build
npx cap sync
npx cap open android
# Build dari Android Studio (debug APK)
```

Debug APK selalu menggunakan debug keystore yang sama, jadi update berjalan lancar.

### Production (Distribusi ke User)

1. **Update version** di `android/app/build.gradle`
2. **Build release APK** dengan keystore
3. **Test install update** di device yang sudah ada versi lama
4. **Distribusikan** APK ke user

## Troubleshooting

### Error: "Package conflict" atau "App not installed"

**Penyebab:** Signature berbeda

**Solusi:**
1. Uninstall aplikasi lama
2. Install versi baru
3. (Data akan hilang - ini hanya terjadi sekali)
4. Update selanjutnya akan berjalan lancar

### Lupa Password Keystore

**Tidak ada cara recover password keystore!**

**Solusi:**
1. Generate keystore baru
2. Ganti `applicationId` di build.gradle (contoh: `com.ucupkasir.app.v2`)
3. Ini akan dianggap aplikasi berbeda di Play Store
4. User harus uninstall dan install baru

**Atau:**
1. Uninstall aplikasi lama dari semua device
2. Install dengan APK signed dengan keystore baru

### Keystore Hilang

Sama seperti lupa password. **Backup keystore file sangat penting!**

Lokasi backup yang direkomendasikan:
- Cloud storage (Google Drive, Dropbox) - ENCRYPTED
- Password manager dengan file attachment
- USB drive di tempat aman
- Server backup pribadi

## Debug vs Release Build

### Debug Build
- **Keystore:** Debug keystore default (sama untuk semua developer)
- **Signature:** Konsisten, update selalu berhasil
- **Gunakan untuk:** Development, testing internal
- **Build command:** `./gradlew assembleDebug` atau via Android Studio

### Release Build
- **Keystore:** Your custom keystore (unique)
- **Signature:** Berdasarkan keystore Anda
- **Gunakan untuk:** Distribusi ke user, production
- **Build command:** `./gradlew assembleRelease`

## Checklist Release

- [ ] Update `versionCode` dan `versionName`
- [ ] Keystore dan keystore.properties sudah ada
- [ ] Test build release APK berhasil
- [ ] Test install di device clean (belum ada app)
- [ ] Test update di device yang sudah ada versi lama
- [ ] Backup keystore file dan password
- [ ] Commit perubahan version (jangan commit keystore!)
- [ ] Tag git release (optional): `git tag v1.1`

## Resources

- [Android App Signing](https://developer.android.com/studio/publish/app-signing)
- [Capacitor Android Build](https://capacitorjs.com/docs/android)
- [Gradle Versioning](https://developer.android.com/studio/publish/versioning)
