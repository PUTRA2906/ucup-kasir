#!/usr/bin/env bash
#
# Setup Android signing secrets untuk GitHub Actions.
# Jalankan: bash scripts/setup-android-secrets.sh [nama-repo]
#
# Membutuhkan: gh (GitHub CLI) yang sudah login.

set -euo pipefail

REPO="${1:-}"
if [ -z "$REPO" ]; then
  echo "Usage: $0 <owner/repo>" >&2
  echo "Contoh: $0 putra/ucup-kasir" >&2
  exit 1
fi

KEYSTORE="android/ucup-kasir-release.keystore"
KEYSTORE_PROP="android/keystore.properties"

if [ ! -f "$KEYSTORE" ]; then
  echo "ERROR: $KEYSTORE tidak ditemukan." >&2
  exit 1
fi
if [ ! -f "$KEYSTORE_PROP" ]; then
  echo "ERROR: $KEYSTORE_PROP tidak ditemukan." >&2
  exit 1
fi

# Ambil password/alias dari keystore.properties (jangan di-echo ke layar)
STORE_PASSWORD=$(grep -E '^storePassword=' "$KEYSTORE_PROP" | cut -d= -f2-)
KEY_ALIAS=$(grep -E '^keyAlias=' "$KEYSTORE_PROP" | cut -d= -f2-)
KEY_PASSWORD=$(grep -E '^keyPassword=' "$KEYSTORE_PROP" | cut -d= -f2-)

# Fallback: jika alias tidak terisi, cari alias asli dari keystore itu sendiri
if [ -z "$KEY_ALIAS" ]; then
  KEY_ALIAS=$(keytool -list -keystore "$KEYSTORE" -storepass "$STORE_PASSWORD" 2>/dev/null \
    | awk '/PrivateKeyEntry/ {print $1}')
  echo "Mengambil alias otomatis dari keystore: $KEY_ALIAS"
fi

if [ -z "$STORE_PASSWORD" ] || [ -z "$KEY_ALIAS" ] || [ -z "$KEY_PASSWORD" ]; then
  echo "ERROR: keystore.properties tidak lengkap (butuh storePassword, keyAlias, keyPassword)." >&2
  exit 1
fi

echo "Mengatur secrets untuk repo: $REPO"

gh secret set ANDROID_KEYSTORE_BASE64 < <(base64 -w0 "$KEYSTORE") --repo "$REPO"
echo "  ✔ ANDROID_KEYSTORE_BASE64"

gh secret set KEYSTORE_PASSWORD --body "$STORE_PASSWORD" --repo "$REPO"
echo "  ✔ KEYSTORE_PASSWORD"

gh secret set KEY_ALIAS --body "$KEY_ALIAS" --repo "$REPO"
echo "  ✔ KEY_ALIAS"

gh secret set KEY_PASSWORD --body "$KEY_PASSWORD" --repo "$REPO"
echo "  ✔ KEY_PASSWORD"

echo ""
echo "Selesai! Semua secret sudah tersimpan di $REPO."
echo "Jangan lupa: naikkan versionCode di android/app/build.gradle tiap rilis baru."
