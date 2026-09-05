// ============================================================
// Data Menu Cepat — satu sumber kebenaran (single source of truth)
// Dipakai bersama oleh:
//   - Dashboard mobile (src/views/Ecommerce.vue)
//   - Halaman "Lihat Semua" per grup (src/views/QuickMenu/QuickMenuGroup.vue)
// ============================================================

export interface QuickMenuItem {
  id: string
  to: string
  label: string
  description: string
  iconClass: string
  iconPath: string
}

export interface QuickMenuGroup {
  title: string
  slug: string
  color: string
  items: QuickMenuItem[]
}

export const QUICK_MENU_STORAGE_KEY = 'quick_menu_order'

export const DEFAULT_QUICK_MENU: QuickMenuItem[] = [
  {
    id: 'stock',
    to: '/stock',
    label: 'Stok',
    description: 'Kelola stok gudang & mutasi barang',
    iconClass: 'border-blue-500/20 bg-blue-500/10 text-blue-500',
    iconPath: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  },
  
  {
    id: 'returns',
    to: '/returns',
    label: 'Retur',
    description: 'Pengajuan & daftar retur penjualan',
    iconClass: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-500',
    iconPath: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  },
  {
    id: 'categories',
    to: '/categories',
    label: 'Kategori',
    description: 'Kelola kategori & pengelompokan produk',
    iconClass: 'border-blue-500/20 bg-blue-500/10 text-blue-500',
    iconPath: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
  },
  {
    id: 'products',
    to: '/products',
    label: 'Produk',
    description: 'Daftar produk, harga & stok',
    iconClass: 'border-blue-500/20 bg-blue-500/10 text-blue-500',
    iconPath: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  },
  {
    id: 'transactions',
    to: '/transactions',
    label: 'Transaksi',
    description: 'Riwayat penjualan & detail transaksi',
    iconClass: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-500',
    iconPath: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  },
  {
    id: 'stock-movements',
    to: '/stock/movements',
    label: 'Mutasi',
    description: 'Riwayat perpindahan stok barang',
    iconClass: 'border-blue-500/20 bg-blue-500/10 text-blue-500',
    iconPath: 'M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4',
  },
  {
    id: 'transaction-profit',
    to: '/reports/transaction-profit',
    label: 'Laba/Tx',
    description: 'Rincian laba per transaksi penjualan',
    iconClass: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-500',
    iconPath: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
  {
    id: 'customers',
    to: '/customers',
    label: 'Master Pelanggan',
    description: 'Data Toko, limit kredit & histori',
    iconClass: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-500',
    iconPath:
      'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  },
  {
    id: 'finance-dashboard',
    to: '/finance',
    label: 'Keuangan',
    description: 'Ringkasan keuangan & posisi kas',
    iconClass: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500',
    iconPath: 'M19 7V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-2m-6-10h6v6h-6a3 3 0 010-6zm0 0a3 3 0 00-3 3v6',
  },
  {
    id: 'chart-of-accounts',
    to: '/finance/accounts',
    label: 'Akun',
    description: 'Chart of accounts / daftar akun',
    iconClass: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500',
    iconPath: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  },
  {
    id: 'journal',
    to: '/finance/journal',
    label: 'Jurnal',
    description: 'Jurnal umum seluruh transaksi',
    iconClass: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500',
    iconPath: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  },
  {
    id: 'ledger',
    to: '/finance/ledger',
    label: 'Buku Besar',
    description: 'Rekap transaksi per akun',
    iconClass: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500',
    iconPath: 'M9 17h6m-6-4h6m-6-4h6M5 7h.01M5 11h.01M5 15h.01M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5z',
  },
  {
    id: 'trial-balance',
    to: '/finance/trial-balance',
    label: 'Neraca Saldo',
    description: 'Keseimbangan debit & kredit',
    iconClass: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500',
    iconPath: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3',
  },
  {
    id: 'balance-sheet',
    to: '/finance/balance-sheet',
    label: 'Neraca',
    description: 'Laporan posisi aset, utang & modal',
    iconClass: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500',
    iconPath: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
  {
    id: 'cash-flow',
    to: '/finance/cash-flow',
    label: 'Arus Kas',
    description: 'Laporan pemasukan & pengeluaran kas',
    iconClass: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500',
    iconPath: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
  },
  {
    id: 'purchasing',
    to: '/purchasing',
    label: 'Pembelian',
    description: 'Dashboard pembelian & overview',
    iconClass: 'border-orange-500/20 bg-orange-500/10 text-orange-500',
    iconPath: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',
  },
  {
    id: 'shipping',
    to: '/shipping',
    label: 'Pengiriman',
    description: 'Dashboard pengiriman & overview',
    iconClass: 'border-sky-500/20 bg-sky-500/10 text-sky-500',
    iconPath: 'M3 7h11v10H3V7zm0 0V5a2 2 0 012-2h4v4m4 8h2a3 3 0 003-3v-2h-5m-2 0V8a2 2 0 012-2h3l4 4v5a2 2 0 01-2 2h-3',
  },
  {
    id: 'hr',
    to: '/hr',
    label: 'Dashboard Karyawan',
    description: 'Ringkasan Data Karyawan',
    iconClass: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500',
    iconPath: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  },
  {
    id: 'purchasing-suppliers',
    to: '/purchasing/suppliers',
    label: 'Supplier',
    description: 'Data supplier & pemasok barang',
    iconClass: 'border-orange-500/20 bg-orange-500/10 text-orange-500',
    iconPath: 'M3 5h18M3 5v14a1 1 0 001 1h16a1 1 0 001-1V5M3 5l2-2h14l2 2m-7 4h2m-2 4h2M8 7a2 2 0 014 0v6a2 2 0 01-4 0V7z',
  },
  {
    id: 'purchasing-pos',
    to: '/purchasing/pos',
    label: 'PO',
    description: 'Purchase order ke supplier',
    iconClass: 'border-orange-500/20 bg-orange-500/10 text-orange-500',
    iconPath: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  },
  {
    id: 'purchasing-grns',
    to: '/purchasing/grns',
    label: 'Terima',
    description: 'Penerimaan barang dari supplier',
    iconClass: 'border-orange-500/20 bg-orange-500/10 text-orange-500',
    iconPath: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4m6-12l-4 4m-4-4l4 4',
  },
  {
    id: 'purchasing-pis',
    to: '/purchasing/pis',
    label: 'Faktur',
    description: 'Faktur pembelian dari supplier',
    iconClass: 'border-orange-500/20 bg-orange-500/10 text-orange-500',
    iconPath: 'M9 14l6 0M9 10l6 0M9 18l6 0M12 3v4m0 0H8m4 0h4M5 5a2 2 0 012-2h7.586a1 1 0 01.707.293l4.414 4.414A1 1 0 0120 8.414V19a2 2 0 01-2 2H7a2 2 0 01-2-2V5z',
  },
  {
    id: 'purchasing-returns',
    to: '/purchasing/returns',
    label: 'Retur Beli',
    description: 'Retur pembelian ke supplier',
    iconClass: 'border-orange-500/20 bg-orange-500/10 text-orange-500',
    iconPath: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  },
  {
    id: 'shipping-deliveries',
    to: '/shipping/deliveries',
    label: 'Surat Jalan',
    description: 'Pengelolaan surat jalan pengiriman',
    iconClass: 'border-sky-500/20 bg-sky-500/10 text-sky-500',
    iconPath: 'M3 7h11v10H3V7zm0 0V5a2 2 0 012-2h4v4m4 8h2a3 3 0 003-3v-2h-5m-2 0V8a2 2 0 012-2h3l4 4v5a2 2 0 01-2 2h-3',
  },
  {
    id: 'shipping-vehicles',
    to: '/shipping/vehicles',
    label: 'Kendaraan',
    description: 'Data kendaraan & armada pengiriman',
    iconClass: 'border-sky-500/20 bg-sky-500/10 text-sky-500',
    iconPath: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0zM3 3h3l2 6h9l3-5h2v5h-2m-12 0l2 6h9m0 0h1a2 2 0 012 2v4h-2',
  },
  {
    id: 'hr-employees',
    to: '/hr/employees',
    label: 'Master Karyawan',
    description: 'Data karyawan & profil karyawan',
    iconClass: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500',
    iconPath: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  },
  {
    id: 'hr-departments',
    to: '/hr/departments',
    label: 'Departemen',
    description: 'Struktur departemen perusahaan',
    iconClass: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500',
    iconPath: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  },
  {
    id: 'hr-positions',
    to: '/hr/positions',
    label: 'Jabatan',
    description: 'Data jabatan & level organisasi',
    iconClass: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500',
    iconPath: 'M12 4.5a3.5 3.5 0 00-3.5 3.5c0 1.414.583 2.743 1.607 3.682A6 6 0 006 16h12a6 6 0 00-4.107-4.318c1.024-.939 1.607-2.268 1.607-3.682A3.5 3.5 0 0012 4.5zM8 19h8',
  },
  {
    id: 'hr-attendance',
    to: '/hr/attendance',
    label: 'Absensi',
    description: 'Rekap kehadiran & izin karyawan',
    iconClass: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500',
    iconPath: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2zm6-8l2 2 4-4',
  },
  {
    id: 'hr-payroll',
    to: '/hr/payroll',
    label: 'Payroll',
    description: 'Penggajian & slip gaji karyawan',
    iconClass: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500',
    iconPath: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    id: 'hr-payroll-components',
    to: '/hr/payroll/components',
    label: 'Komponen',
    description: 'Komponen tunjangan & potongan gaji',
    iconClass: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500',
    iconPath: 'M4 6h16M4 10h16M4 14h16M4 18h16',
  },
]

/** Grup menu (urutan tampilan di dashboard) */
export const QUICK_MENU_GROUPS: Omit<QuickMenuGroup, 'items'>[] = [
  {
    title: 'Penjualan',
    slug: 'penjualan',
    color: 'bg-cyan-400',
  },
  {
    title: 'Gudang & Stok',
    slug: 'gudang-stok',
    color: 'bg-blue-400',
  },
  {
    title: 'Keuangan',
    slug: 'keuangan',
    color: 'bg-emerald-400',
  },
  {
    title: 'Pembelian',
    slug: 'pembelian',
    color: 'bg-orange-400',
  },
  {
    title: 'Pengiriman',
    slug: 'pengiriman',
    color: 'bg-sky-400',
  },
  {
    title: 'Karyawan & Payroll',
    slug: 'karyawan',
    color: 'bg-emerald-400',
  },
]

/** Mapping id menu → judul grup */
export const GROUP_MAP: Record<string, string> = {
  // Gudang & Stok
  stock: 'Gudang & Stok',
  products: 'Gudang & Stok',
  categories: 'Gudang & Stok',
  'stock-movements': 'Gudang & Stok',
  // Penjualan
  customers: 'Penjualan',
  transactions: 'Penjualan',
  returns: 'Penjualan',
  'transaction-profit': 'Penjualan',
  // Keuangan
  'finance-dashboard': 'Keuangan',
  'chart-of-accounts': 'Keuangan',
  journal: 'Keuangan',
  ledger: 'Keuangan',
  'trial-balance': 'Keuangan',
  'balance-sheet': 'Keuangan',
  'cash-flow': 'Keuangan',
  // Pembelian
  purchasing: 'Pembelian',
  'purchasing-suppliers': 'Pembelian',
  'purchasing-pos': 'Pembelian',
  'purchasing-grns': 'Pembelian',
  'purchasing-pis': 'Pembelian',
  'purchasing-returns': 'Pembelian',
  // Pengiriman
  shipping: 'Pengiriman',
  'shipping-deliveries': 'Pengiriman',
  'shipping-vehicles': 'Pengiriman',
  // Karyawan & Payroll
  hr: 'Karyawan & Payroll',
  'hr-employees': 'Karyawan & Payroll',
  'hr-departments': 'Karyawan & Payroll',
  'hr-positions': 'Karyawan & Payroll',
  'hr-attendance': 'Karyawan & Payroll',
  'hr-payroll': 'Karyawan & Payroll',
  'hr-payroll-components': 'Karyawan & Payroll',
}

/** Mapping id menu → subgrup (dipakai di halaman "Lihat Semua") */
export const SUBGROUP_MAP: Record<string, string> = {
  // Gudang & Stok
  products: 'Master Produk',
  categories: 'Master Produk',
  stock: 'Gudang',
  'stock-movements': 'Gudang',
  // Penjualan
  customers: 'Pelanggan',
  transactions: 'Transaksi',
  returns: 'Transaksi',
  'transaction-profit': 'Transaksi',
  // Keuangan
  'finance-dashboard': 'Ringkasan',
  'chart-of-accounts': 'Pencatatan',
  journal: 'Pencatatan',
  ledger: 'Pencatatan',
  'trial-balance': 'Laporan Keuangan',
  'balance-sheet': 'Laporan Keuangan',
  'cash-flow': 'Laporan Keuangan',
  // Pembelian
  purchasing: 'Ringkasan',
  'purchasing-suppliers': 'Master Supplier',
  'purchasing-pos': 'Transaksi Pembelian',
  'purchasing-grns': 'Transaksi Pembelian',
  'purchasing-pis': 'Transaksi Pembelian',
  'purchasing-returns': 'Transaksi Pembelian',
  // Pengiriman
  shipping: 'Ringkasan',
  'shipping-deliveries': 'Operasional',
  'shipping-vehicles': 'Operasional',
  // Karyawan & Payroll
  hr: 'Ringkasan',
  'hr-employees': 'Master Data',
  'hr-departments': 'Master Data',
  'hr-positions': 'Master Data',
  'hr-attendance': 'Absensi & Payroll',
  'hr-payroll': 'Absensi & Payroll',
  'hr-payroll-components': 'Absensi & Payroll',
}

/** Urutan tampil subgrup per grup di halaman "Lihat Semua" */
export const SUBGROUP_ORDER: Record<string, string[]> = {
  penjualan: ['Transaksi', 'Pelanggan'],
  'gudang-stok': ['Master Produk', 'Gudang'],
  keuangan: ['Ringkasan', 'Pencatatan', 'Laporan Keuangan'],
  pembelian: ['Ringkasan', 'Master Supplier', 'Transaksi Pembelian'],
  pengiriman: ['Ringkasan', 'Operasional'],
  karyawan: ['Ringkasan', 'Master Data', 'Absensi & Payroll'],
}

/** Muat urutan menu dari localStorage; fallback ke default. */
export function loadQuickMenuFromStorage(): QuickMenuItem[] {
  try {
    const saved = localStorage.getItem(QUICK_MENU_STORAGE_KEY)
    if (saved) {
      const ids = JSON.parse(saved) as string[]
      const byId = new Map(DEFAULT_QUICK_MENU.map((item) => [item.id, item]))
      const ordered = ids.map((id) => byId.get(id)).filter((i): i is QuickMenuItem => !!i)
      // Tambahkan item yang belum ada di urutan tersimpan (mis. menu baru)
      for (const item of DEFAULT_QUICK_MENU) {
        if (!ordered.some((o) => o.id === item.id)) ordered.push(item)
      }
      return ordered
    }
  } catch (e) {
    console.error('Gagal memuat urutan menu cepat:', e)
  }
  return [...DEFAULT_QUICK_MENU]
}

/** Ambil semua item milik sebuah grup (urut sesuai urutan tersimpan). */
export function getGroupItems(groupSlug: string): QuickMenuItem[] {
  const group = QUICK_MENU_GROUPS.find((g) => g.slug === groupSlug)
  if (!group) return []
  return loadQuickMenuFromStorage().filter(
    (item) => GROUP_MAP[item.id] === group.title
  )
}
