/**
 * Directive `v-can` — sembunyikan elemen bila pengguna tidak punya permission.
 *
 * Pemakaian:
 *   <button v-can="'product.write'">Tambah</button>
 *   <div v-can="['finance.read', 'finance.write']">...</div>   <!-- salah satu -->
 *
 * Perilaku: elemen dihapus dari DOM (bukan sekadar `display:none`) supaya
 * tidak bisa diaktifkan lewat keyboard/tab. Bila keanggotaan belum termuat,
 * elemen ditahan dulu (display:none) dan dievaluasi ulang begitu permission
 * tersedia — menghindari "berkedip lalu hilang".
 *
 * ⚠️ Ini hanya lapisan UI. Penegakan sebenarnya di database (RLS + RPC).
 */
import type { Directive, DirectiveBinding } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { isPermission, type Permission } from '@/constants/permissions'

interface CanElement extends HTMLElement {
  __canUnwatch?: () => void
  __canOriginalDisplay?: string
}

function normalize(value: unknown): Permission[] {
  const raw = Array.isArray(value) ? value : [value]
  return raw.filter(isPermission)
}

function evaluate(el: CanElement, required: Permission[]): void {
  const authStore = useAuthStore()
  if (!authStore.membershipLoaded) {
    // Belum tahu haknya — sembunyikan sementara, jangan hapus.
    if (el.__canOriginalDisplay === undefined) el.__canOriginalDisplay = el.style.display
    el.style.display = 'none'
    return
  }
  const allowed = required.length === 0 || authStore.can(required)
  if (allowed) {
    el.style.display = el.__canOriginalDisplay ?? ''
  } else {
    el.remove()
  }
}

export const vCan: Directive<CanElement, Permission | Permission[]> = {
  mounted(el, binding: DirectiveBinding) {
    const required = normalize(binding.value)
    const authStore = useAuthStore()
    evaluate(el, required)
    // Reaksi saat membership selesai dimuat / akun berganti.
    el.__canUnwatch = authStore.$subscribe(() => {
      if (el.isConnected) evaluate(el, required)
    })
  },
  updated(el, binding: DirectiveBinding) {
    if (!el.isConnected) return
    evaluate(el, normalize(binding.value))
  },
  unmounted(el) {
    el.__canUnwatch?.()
    el.__canUnwatch = undefined
  },
}

export default vCan
