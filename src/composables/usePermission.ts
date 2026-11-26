/**
 * Helper permission untuk UI (menu, tombol, tab).
 *
 * ⚠️ Ini BUKAN kontrol keamanan. Pengguna tetap bisa memanggil API langsung;
 * penolakan sebenarnya terjadi di database (RLS + `has_permission()` di RPC).
 * Gunakan hanya untuk menyembunyikan hal yang pasti akan gagal.
 */
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { Permission } from '@/constants/permissions'

export function usePermission() {
  const authStore = useAuthStore()

  /** `can('product.write')` atau `can(['a','b'])` (salah satu cukup). */
  function can(permission: Permission | Permission[]): boolean {
    return authStore.can(permission)
  }

  /** Semua permission wajib terpenuhi. */
  function canAll(...required: Permission[]): boolean {
    return authStore.canAll(...required)
  }

  /** Reactive: berubah saat keanggotaan dimuat / akun berganti. */
  const permissions = computed(() => authStore.permissions)
  const role = computed(() => authStore.role)
  const storeId = computed(() => authStore.storeId)

  return { can, canAll, permissions, role, storeId }
}
