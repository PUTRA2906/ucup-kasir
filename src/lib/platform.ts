import { Capacitor } from '@capacitor/core'

// ============================================================
// Deteksi platform runtime.
//
// Android (native) → pakai SQLite offline-first.
// Web (mobile browser & desktop) → pakai Supabase langsung.
//
// Catatan: @capacitor-community/sqlite hanya tersedia di native
// (Android/iOS). Di web, initSQLite() akan gagal karena plugin
// memakai web component <jeep-sqlite> yang tidak tersedia.
// ============================================================

/** Apakah ini aplikasi native (Android/iOS)? */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

/** Apakah ini web (browser, mobile maupun desktop)? */
export function isWebPlatform(): boolean {
  return !isNativeApp()
}
