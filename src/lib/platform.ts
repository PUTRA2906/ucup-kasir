import { Capacitor } from '@capacitor/core'

// ============================================================
// Deteksi platform runtime.
//
// Android (native) & web sama-sama memakai Supabase langsung; perbedaan
// hanya pada fitur native (share, filesystem, back button, dsb).
// Mode offline SQLite sudah dihapus — lihat docs/RBAC_PLAN.md §7.3.
// ============================================================

/** Apakah ini aplikasi native (Android/iOS)? */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

/** Apakah ini web (browser, mobile maupun desktop)? */
export function isWebPlatform(): boolean {
  return !isNativeApp()
}
