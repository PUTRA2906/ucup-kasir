# 🚀 Quick Reference: Build di GitHub Actions

## Setup Awal (Sekali Saja)

### 1. Generate Base64 Keystore
```bash
bash get-keystore-base64.sh
```
Copy output-nya.

### 2. Tambahkan GitHub Secrets

Buka: `https://github.com/USERNAME/REPO/settings/secrets/actions`

Tambahkan 4 secrets:

| Secret Name | Value | Cara Dapat |
|------------|-------|------------|
| `ANDROID_KEYSTORE_BASE64` | [Output dari script] | `bash get-keystore-base64.sh` |
| `ANDROID_KEYSTORE_PASSWORD` | [Password store] | Lihat `android/keystore.properties` |
| `ANDROID_KEY_ALIAS` | `ucupkasir` | Lihat `android/keystore.properties` |
| `ANDROID_KEY_PASSWORD` | [Password key] | Lihat `android/keystore.properties` |

---

## Build & Release Baru

### 1. Update Version
Edit `android/app/build.gradle`:
```gradle
versionCode 3      // +1 dari sebelumnya
versionName "1.2"  // Versi yang ditampilkan
```

### 2. Commit & Push
```bash
git add android/app/build.gradle
git commit -m "Bump version to 1.2"
git push origin main
```

### 3. Wait... ⏳
GitHub Actions otomatis build (3-5 menit)

### 4. Download APK
- **Artifacts:** Tab Actions → Workflow run → Download "ucup-kasir-release"
- **Releases:** Tab Releases → Download `app-release.apk`

---

## File Penting

| File | Fungsi | Commit? |
|------|--------|---------|
| `android/ucup-kasir-release.keystore` | Keystore file | ❌ NO (gitignore) |
| `android/keystore.properties` | Password keystore | ❌ NO (gitignore) |
| `android/app/build.gradle` | Version & config | ✅ YES |
| `.github/workflows/build-apk.yml` | CI/CD workflow | ✅ YES |

---

## Manual Trigger Build

1. GitHub repo → Tab **Actions**
2. Workflow: **Build Android APK**
3. **Run workflow** → pilih branch `main`
4. Klik **Run workflow**

---

## Troubleshooting Cepat

| Error | Solusi |
|-------|--------|
| "Keystore not found" | Re-generate base64: `bash get-keystore-base64.sh` dan update secret |
| "Incorrect password" | Cek password di `keystore.properties` dan update secrets |
| Build tidak jalan | Push ke branch `main` atau gunakan manual dispatch |
| APK tidak signed | Cek secrets sudah lengkap 4 buah |

---

## Version Management

| Build | versionCode | versionName |
|-------|-------------|-------------|
| Initial | 1 | 1.0 |
| Update 1 | 2 | 1.1 |
| Update 2 | 3 | 1.2 |
| Major Update | 4 | 2.0 |

**Rule:** `versionCode` HARUS naik +1 setiap build baru!

---

## 📱 Install APK

### Di Device (Via File)
1. Download `app-release.apk` dari GitHub
2. Transfer ke HP
3. Tap APK → Install

### Via ADB
```bash
adb install -r app-release.apk
```

---

📚 **Full Guide:** `GITHUB_ACTIONS_SETUP.md`
