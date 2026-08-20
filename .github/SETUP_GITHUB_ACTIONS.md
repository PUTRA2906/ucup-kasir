# Setup GitHub Actions untuk Build Android APK

Dokumen ini menjelaskan cara mengatur GitHub Actions untuk otomatis build Android APK setiap kali ada push ke branch `main` atau `master`.

## Prerequisites

1. Project sudah di-push ke GitHub
2. Capacitor sudah dikonfigurasi dengan benar
3. Android project sudah ada di folder `android/`

## GitHub Secrets yang Diperlukan

Anda perlu menambahkan secrets berikut ke repository GitHub Anda:

### 1. Supabase Credentials (WAJIB)

Buka **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

- **VITE_SUPABASE_URL**: URL Supabase project Anda
  ```
  Contoh: https://xxxxxxxxxxxxx.supabase.co
  ```

- **VITE_SUPABASE_ANON_KEY**: Anon key dari Supabase project
  ```
  Bisa didapat dari: Supabase Dashboard → Project Settings → API → anon public
  ```

### 2. Android Signing (OPSIONAL - untuk Release APK)

Untuk membuat signed release APK, tambahkan secrets berikut:

- **ANDROID_KEYSTORE_PASSWORD**: Password keystore
- **ANDROID_KEY_ALIAS**: Alias key
- **ANDROID_KEY_PASSWORD**: Password key

> **Note**: Jika secrets signing tidak ada, GitHub Actions akan tetap membuat **Debug APK** yang bisa langsung diinstall untuk testing.

## Cara Membuat Keystore untuk Signed APK

Jika Anda ingin membuat signed release APK, jalankan command berikut:

```bash
# Generate keystore
keytool -genkey -v -keystore ucup-kasir.keystore -alias ucup-kasir -keyalg RSA -keysize 2048 -validity 10000

# Convert keystore ke base64 (untuk disimpan di GitHub Secrets)
base64 ucup-kasir.keystore > keystore.base64.txt
```

Kemudian tambahkan ke `android/app/build.gradle`:

```gradle
android {
    signingConfigs {
        release {
            storeFile file(System.getenv("KEYSTORE_FILE") ?: "release.keystore")
            storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
            keyAlias System.getenv("ANDROID_KEY_ALIAS")
            keyPassword System.getenv("ANDROID_KEY_PASSWORD")
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

## Cara Menggunakan GitHub Actions

### 1. Push ke GitHub

```bash
git add .
git commit -m "Setup GitHub Actions for Android build"
git push origin main
```

### 2. Workflow Otomatis Berjalan

Setelah push, GitHub Actions akan otomatis:
1. Install dependencies (npm ci)
2. Build Vue app (npm run build)
3. Sync Capacitor (npx cap sync android)
4. Build Debug APK
5. Build Release APK (jika secrets signing tersedia)
6. Upload APK sebagai artifacts
7. Membuat GitHub Release dengan APK file

### 3. Download APK

Setelah workflow selesai:

#### Cara 1: Download dari Artifacts
1. Buka **Actions** tab di GitHub repository
2. Klik workflow run yang berhasil
3. Scroll ke bawah ke section **Artifacts**
4. Download `ucup-kasir-debug` atau `ucup-kasir-release`

#### Cara 2: Download dari Releases (Push ke main)
1. Buka **Releases** tab di GitHub repository
2. Klik release terbaru (contoh: `v123`)
3. Download APK dari **Assets**

## Manual Trigger

Anda juga bisa trigger build manual:

1. Buka **Actions** tab di GitHub repository
2. Klik workflow "Build Android APK"
3. Klik tombol **Run workflow**
4. Pilih branch (main/master)
5. Klik **Run workflow**

## Troubleshooting

### Build Gagal: "VITE_SUPABASE_URL not found"

**Solusi**: Pastikan sudah menambahkan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` di GitHub Secrets.

### Build Gagal: Gradle error

**Solusi**: 
1. Pastikan `android/gradlew` executable: `chmod +x android/gradlew`
2. Commit dan push kembali
3. Re-run workflow

### Release APK tidak ter-generate

**Solusi**: Ini normal jika secrets signing tidak tersedia. Debug APK sudah cukup untuk testing. Untuk production, tambahkan secrets signing.

### APK tidak bisa diinstall

**Solusi**: 
1. Aktifkan **Install from Unknown Sources** di Android
2. Pastikan menggunakan Debug APK untuk testing
3. Untuk production, gunakan signed Release APK

## Monitoring Build

Anda bisa monitoring build progress di:
- **Actions** tab → Pilih workflow run → Lihat logs detail setiap step

## Retention Policy

- **Debug APK**: Disimpan 30 hari
- **Release APK**: Disimpan 90 hari
- **GitHub Releases**: Permanent

## Next Steps

Setelah setup selesai:

1. ✅ Test workflow dengan push commit ke main
2. ✅ Download dan install Debug APK di device Android
3. ✅ Test semua fitur aplikasi
4. ✅ Jika sudah production-ready, setup keystore dan signed release
5. ✅ Publish ke Google Play Store (opsional)

## Links

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Android App Signing](https://developer.android.com/studio/publish/app-signing)
