# Setup GitHub Actions untuk Build APK Signed

## 📋 Yang Sudah Dikonfigurasi

✅ GitHub Actions workflow sudah diupdate untuk:
- Build debug APK (untuk testing)
- Build release APK dengan signing (untuk distribusi)
- Auto-create GitHub Release dengan APK

## 🔐 Setup GitHub Secrets

Anda perlu menambahkan **4 secrets** ke GitHub repository:

### 1. Buka GitHub Repository Settings

1. Buka repo: `https://github.com/USERNAME/REPO_NAME`
2. Klik **Settings** (tab paling kanan)
3. Sidebar kiri: klik **Secrets and variables** → **Actions**
4. Klik **New repository secret**

---

### 2. Tambahkan Secret: ANDROID_KEYSTORE_BASE64

**Apa ini?** File keystore dalam format base64 (agar bisa disimpan sebagai text di GitHub)

**Cara dapat valuenya:**

```bash
cd /home/putra/ucup-kasir
base64 android/ucup-kasir-release.keystore | tr -d '\n'
```

Copy semua output (string panjang), lalu:
- **Name:** `ANDROID_KEYSTORE_BASE64`
- **Secret:** [Paste output base64 tadi]
- Klik **Add secret**

---

### 3. Tambahkan Secret: ANDROID_KEYSTORE_PASSWORD

**Apa ini?** Password yang Anda input saat generate keystore (storePassword)

Lihat di file `android/keystore.properties`, baris:
```
storePassword=PASSWORD_ANDA
```

- **Name:** `ANDROID_KEYSTORE_PASSWORD`
- **Secret:** [Password storePassword Anda]
- Klik **Add secret**

---

### 4. Tambahkan Secret: ANDROID_KEY_ALIAS

**Apa ini?** Alias key di keystore (default: `ucupkasir`)

Lihat di file `android/keystore.properties`, baris:
```
keyAlias=ucupkasir
```

- **Name:** `ANDROID_KEY_ALIAS`
- **Secret:** `ucupkasir`
- Klik **Add secret**

---

### 5. Tambahkan Secret: ANDROID_KEY_PASSWORD

**Apa ini?** Password key yang Anda input saat generate keystore (keyPassword)

Lihat di file `android/keystore.properties`, baris:
```
keyPassword=PASSWORD_ANDA
```

- **Name:** `ANDROID_KEY_PASSWORD`
- **Secret:** [Password keyPassword Anda]
- Klik **Add secret**

---

### 6. (Optional) VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY

Jika belum ada, tambahkan juga environment variables untuk Supabase:

- **Name:** `VITE_SUPABASE_URL`
- **Secret:** URL Supabase Anda

- **Name:** `VITE_SUPABASE_ANON_KEY`
- **Secret:** Anon key Supabase Anda

---

## ✅ Verifikasi Secrets

Setelah semua ditambahkan, di halaman **Secrets** seharusnya ada:

- ✅ ANDROID_KEYSTORE_BASE64
- ✅ ANDROID_KEYSTORE_PASSWORD
- ✅ ANDROID_KEY_ALIAS
- ✅ ANDROID_KEY_PASSWORD
- ✅ VITE_SUPABASE_URL
- ✅ VITE_SUPABASE_ANON_KEY

---

## 🚀 Cara Trigger Build

### Method 1: Push ke Branch Main

```bash
git add .
git commit -m "Update version to 1.1"
git push origin main
```

GitHub Actions akan otomatis:
1. Build Vue.js production
2. Build debug APK
3. Build release APK (signed)
4. Upload kedua APK sebagai artifacts
5. Create GitHub Release dengan APK

---

### Method 2: Manual Dispatch

1. Buka repo di GitHub
2. Tab **Actions**
3. Pilih workflow **Build Android APK**
4. Klik **Run workflow** dropdown
5. Pilih branch `main`
6. Klik **Run workflow**

---

## 📦 Download APK Hasil Build

### Dari Artifacts (Temporary)

1. Buka tab **Actions**
2. Klik workflow run yang sukses (✅ hijau)
3. Scroll ke bawah bagian **Artifacts**
4. Download:
   - **ucup-kasir-debug** (untuk testing)
   - **ucup-kasir-release** (untuk distribusi) ← **Gunakan ini!**

### Dari Releases (Permanent)

1. Buka tab **Releases** (sidebar kanan di homepage repo)
2. Pilih release terbaru
3. Download **app-release.apk**

---

## 🎯 Update Version untuk Build Baru

**PENTING:** Sebelum push/build, update version di `android/app/build.gradle`:

```gradle
defaultConfig {
    versionCode 3      // Naikkan +1
    versionName "1.2"  // Update sesuai changelog
    ...
}
```

Lalu commit dan push:

```bash
git add android/app/build.gradle
git commit -m "Bump version to 1.2"
git push origin main
```

---

## 🐛 Troubleshooting

### Build Failed: "Keystore not found"

**Penyebab:** Secret `ANDROID_KEYSTORE_BASE64` tidak ada atau salah

**Solusi:**
1. Generate ulang base64: `base64 android/ucup-kasir-release.keystore | tr -d '\n'`
2. Update secret di GitHub
3. Re-run workflow

### Build Failed: "Incorrect password"

**Penyebab:** Password di secrets tidak match dengan keystore

**Solusi:**
1. Cek password di `android/keystore.properties` lokal Anda
2. Update secrets `ANDROID_KEYSTORE_PASSWORD` dan `ANDROID_KEY_PASSWORD`
3. Re-run workflow

### Release APK Tidak Ter-upload

**Penyebab:** File path salah atau build gagal

**Solusi:**
1. Cek logs build di GitHub Actions
2. Pastikan build release berhasil (lihat bagian "Build APK (Release)")
3. Verifikasi path file: `android/app/build/outputs/apk/release/app-release.apk`

### Workflow Tidak Jalan

**Penyebab:** Workflow file tidak ter-commit atau branch bukan main

**Solusi:**
1. Pastikan file `.github/workflows/build-apk.yml` ada di repo
2. Push ke branch `main` atau `master`
3. Atau gunakan manual dispatch dari tab Actions

---

## 📱 Install APK di Device

### Via ADB (Jika device terhubung ke komputer)

```bash
# Download APK dari GitHub releases dulu
adb install -r app-release.apk
```

### Via Transfer File

1. Download `app-release.apk` dari GitHub releases
2. Transfer ke HP via USB / email / cloud
3. Buka file manager di HP
4. Tap APK
5. Allow "Install from unknown sources" jika diminta
6. Install

---

## 🎉 Selesai!

Sekarang setiap kali Anda push ke `main`, GitHub Actions akan otomatis:
- Build APK signed
- Create release baru
- APK siap didownload dan distribusikan

**APK release** yang di-build oleh GitHub Actions akan konsisten signed, sehingga:
✅ User bisa update aplikasi tanpa uninstall
✅ Tidak ada package conflict lagi!
