#!/bin/bash

# Script untuk mendapatkan base64 keystore untuk GitHub Secret
# Jalankan: bash get-keystore-base64.sh

echo "========================================="
echo "Generate Base64 Keystore untuk GitHub"
echo "========================================="
echo ""

KEYSTORE_FILE="android/ucup-kasir-release.keystore"

if [ ! -f "$KEYSTORE_FILE" ]; then
    echo "❌ ERROR: Keystore file tidak ditemukan!"
    echo "Lokasi: $KEYSTORE_FILE"
    echo ""
    echo "Jalankan dulu: bash generate-keystore.sh"
    exit 1
fi

echo "✅ Keystore ditemukan: $KEYSTORE_FILE"
echo ""
echo "Generating base64..."
echo ""
echo "========================================="
echo "ANDROID_KEYSTORE_BASE64"
echo "========================================="

base64 "$KEYSTORE_FILE" | tr -d '\n'

echo ""
echo ""
echo "========================================="
echo "✅ Selesai!"
echo "========================================="
echo ""
echo "Langkah selanjutnya:"
echo ""
echo "1. Copy text base64 di atas (yang sangat panjang)"
echo "2. Buka GitHub repo → Settings → Secrets and variables → Actions"
echo "3. New repository secret"
echo "4. Name: ANDROID_KEYSTORE_BASE64"
echo "5. Secret: Paste base64 yang sudah di-copy"
echo ""
echo "Lihat panduan lengkap di: GITHUB_ACTIONS_SETUP.md"
echo ""
