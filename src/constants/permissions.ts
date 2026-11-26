/**
 * Daftar permission & role — cermin dari tabel `public.role_permissions`
 * di `supabase/migrations/0002_rbac.sql`.
 *
 * ATURAN: file ini HANYA untuk UI (menyembunyikan menu/tombol). Penegakan
 * sebenarnya ada di database (RLS + `has_permission()` di dalam RPC). Jangan
 * pernah menganggap `can()` di sini sebagai kontrol keamanan — user tetap bisa
 * memanggil API langsung, dan di situlah RLS yang menolak.
 *
 * Bila seed `role_permissions` berubah, ubah file ini juga dan naikkan
 * `MEMBERSHIP_CACHE_VERSION` supaya cache lama di perangkat terbuang.
 */

export const PERMISSIONS = [
  'dashboard.read',
  'product.read',
  'product.write',
  'stock.read',
  'stock.write',
  'transaction.read',
  'transaction.write',
  'transaction.void',
  'customer.read',
  'customer.write',
  'invoice.payment.write',
  'price.read',
  'price.write',
  'report.sales.read',
  'hpp.read',
  'finance.read',
  'finance.write',
  'purchasing.read',
  'purchasing.write',
  'hr.read',
  'hr.write',
  'shipping.read',
  'shipping.write',
  'settings.read',
  'settings.write',
  'user.manage',
] as const

export type Permission = (typeof PERMISSIONS)[number]

export const ROLES = ['owner', 'admin', 'kasir', 'gudang', 'keuangan'] as const

export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Pemilik',
  admin: 'Admin',
  kasir: 'Kasir',
  gudang: 'Gudang',
  keuangan: 'Keuangan',
}

export const PERMISSION_LABELS: Record<Permission, string> = {
  'dashboard.read': 'Lihat dashboard',
  'product.read': 'Lihat produk',
  'product.write': 'Tambah/ubah produk',
  'stock.read': 'Lihat stok',
  'stock.write': 'Ubah stok & opname',
  'transaction.read': 'Lihat transaksi',
  'transaction.write': 'Buat transaksi',
  'transaction.void': 'Batalkan transaksi',
  'customer.read': 'Lihat pelanggan',
  'customer.write': 'Tambah/ubah pelanggan',
  'invoice.payment.write': 'Catat pembayaran piutang',
  'price.read': 'Lihat matriks harga',
  'price.write': 'Ubah matriks harga',
  'report.sales.read': 'Lihat laporan',
  'hpp.read': 'Lihat harga beli (HPP)',
  'finance.read': 'Lihat akuntansi',
  'finance.write': 'Posting jurnal',
  'purchasing.read': 'Lihat pembelian',
  'purchasing.write': 'Kelola pembelian',
  'hr.read': 'Lihat karyawan & payroll',
  'hr.write': 'Kelola karyawan & payroll',
  'shipping.read': 'Lihat surat jalan',
  'shipping.write': 'Kelola surat jalan',
  'settings.read': 'Lihat pengaturan',
  'settings.write': 'Ubah pengaturan',
  'user.manage': 'Kelola pengguna toko',
}

/**
 * Naikkan angka ini setiap kali `PERMISSIONS` atau `role_permissions` berubah,
 * agar cache keanggotaan lama di perangkat tidak dipakai lagi.
 */
export const MEMBERSHIP_CACHE_VERSION = 1

export function isPermission(value: unknown): value is Permission {
  return typeof value === 'string' && (PERMISSIONS as readonly string[]).includes(value)
}

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}
