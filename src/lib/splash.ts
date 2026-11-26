// ============================================================
// Kontrol splash screen HTML yang ada di index.html.
//
// Splash sengaja ditulis inline di index.html (bukan komponen Vue) agar
// langsung tampil sebelum bundle JS selesai dimuat — ini yang menutup
// celah layar kosong/putih saat cold start di Android.
//
// Animasi berjalan ±2,6 detik. Splash baru ditutup setelah aplikasi
// benar-benar siap (router + auth), tetapi tidak lebih cepat dari durasi
// animasi supaya tidak terpotong di tengah jalan.
// ============================================================

/** Durasi animasi splash (samakan dengan .sp-bar di index.html). */
const MIN_VISIBLE_MS = 2600

/** Jeda transisi fade-out (samakan dengan transisi #app-splash). */
const FADE_MS = 600

const startedAt = performance.now()
let hidden = false

/** Tutup splash dengan menghormati durasi minimum animasi. */
export function hideAppSplash(): void {
  if (hidden) return
  hidden = true

  const el = document.getElementById('app-splash')
  if (!el) return

  const remaining = Math.max(0, MIN_VISIBLE_MS - (performance.now() - startedAt))

  window.setTimeout(() => {
    el.classList.add('is-out')
    window.setTimeout(() => el.remove(), FADE_MS)
  }, remaining)
}
