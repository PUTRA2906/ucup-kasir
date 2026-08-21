#!/bin/bash

# Script untuk generate keystore Android
# Jalankan: bash generate-keystore.sh

echo "========================================="
echo "Generate Android Keystore untuk Ucup Kasir"
echo "========================================="
echo ""

KEYSTORE_NAME="ucup-kasir-release.keystore"
KEY_ALIAS="ucupkasir"
VALIDITY_DAYS=10000

echo "Keystore akan disimpan di: android/$KEYSTORE_NAME"
echo "Key Alias: $KEY_ALIAS"
echo "Validity: $VALIDITY_DAYS hari (sekitar 27 tahun)"
echo ""

# Cek apakah keystore sudah ada
if [ -f "android/$KEYSTORE_NAME" ]; then
    echo "⚠️  WARNING: Keystore sudah ada!"
    echo "Jika Anda generate keystore baru, aplikasi yang sudah terinstall TIDAK BISA diupdate!"
    echo ""
    read -p "Apakah Anda yakin ingin generate keystore baru? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Dibatalkan."
        exit 0
    fi
    echo ""
fi

# Generate keystore
echo "Silakan isi informasi berikut:"
echo ""

keytool -genkey -v \
    -keystore android/$KEYSTORE_NAME \
    -alias $KEY_ALIAS \
    -keyalg RSA \
    -keysize 2048 \
    -validity $VALIDITY_DAYS

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Keystore berhasil dibuat!"
    echo ""
    echo "Langkah selanjutnya:"
    echo "1. Copy file keystore.properties.example ke keystore.properties"
    echo "   cp android/keystore.properties.example android/keystore.properties"
    echo ""
    echo "2. Edit android/keystore.properties dan isi password yang Anda masukkan tadi"
    echo ""
    echo "3. Build release APK:"
    echo "   npm run build"
    echo "   npx cap sync"
    echo "   cd android && ./gradlew assembleRelease"
    echo ""
    echo "⚠️  PENTING:"
    echo "- SIMPAN keystore file dan password dengan AMAN!"
    echo "- Jika keystore hilang, Anda TIDAK BISA update aplikasi yang sudah terinstall"
    echo "- Jangan commit keystore file dan keystore.properties ke git"
    echo ""
else
    echo ""
    echo "❌ Gagal membuat keystore"
    exit 1
fi
