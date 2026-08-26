import { ref, computed, onMounted, onUnmounted } from 'vue'

// ============================================================
// Composable: Deteksi status jaringan secara reactive.
// Menggunakan navigator.onLine + event listener online/offline.
// ============================================================

const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)

function updateOnlineStatus() {
  isOnline.value = typeof navigator !== 'undefined' ? navigator.onLine : true
}

let listenersAttached = false

function attachListeners() {
  if (listenersAttached || typeof window === 'undefined') return
  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)
  listenersAttached = true
}

function detachListeners() {
  if (typeof window === 'undefined') return
  window.removeEventListener('online', updateOnlineStatus)
  window.removeEventListener('offline', updateOnlineStatus)
  listenersAttached = false
}

/** Return reactive status online. */
export function useNetwork() {
  attachListeners()

  onMounted(attachListeners)
  onUnmounted(detachListeners)

  return {
    isOnline: computed(() => isOnline.value),
  }
}

/** Getter non-reactive untuk dipakai di luar component (service, engine). */
export function isOnlineNow(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}
