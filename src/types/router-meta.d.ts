import type { Permission } from '@/constants/permissions'

/**
 * Tipe tambahan untuk `meta` rute.
 *
 * `permission` diperiksa oleh guard kedua di `router/index.ts`. Nilainya hanya
 * untuk UI/navigasi — penegakan sebenarnya tetap di database (RLS + RPC).
 */
declare module 'vue-router' {
  interface RouteMeta {
    /** Judul halaman (dipakai `document.title`). */
    title?: string
    /** Permission yang dibutuhkan untuk membuka rute ini. */
    permission?: Permission
  }
}

export {}
