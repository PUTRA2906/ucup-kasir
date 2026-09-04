import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    return savedPosition || { left: 0, top: 0 }
  },
  routes: [
    {
      path: '/',
      name: 'Ecommerce',
      component: () => import('../views/Ecommerce.vue'),
      meta: {
        title: 'eCommerce Dashboard',
      },
    },
    {
      path: '/calendar',
      name: 'Calendar',
      component: () => import('../views/Others/Calendar.vue'),
      meta: {
        title: 'Calendar',
      },
    },
    {
      path: '/profile',
      name: 'Profile',
      component: () => import('../views/Others/UserProfile.vue'),
      meta: {
        title: 'Profile',
      },
    },
    {
      path: '/settings',
      name: 'Store Settings',
      component: () => import('../views/Settings/StoreSettings.vue'),
      meta: {
        title: 'Pengaturan Toko',
      },
    },
    {
      path: '/notifications',
      name: 'Notifications',
      component: () => import('../views/Notifications.vue'),
      meta: {
        title: 'Notifikasi',
      },
    },
    {
      path: '/form-elements',
      name: 'Form Elements',
      component: () => import('../views/Forms/FormElements.vue'),
      meta: {
        title: 'Form Elements',
      },
    },
    {
      path: '/basic-tables',
      name: 'Basic Tables',
      component: () => import('../views/Tables/BasicTables.vue'),
      meta: {
        title: 'Basic Tables',
      },
    },
    {
      path: '/data-table',
      name: 'Data Table',
      component: () => import('../views/Tables/DataTableExample.vue'),
      meta: {
        title: 'Data Table',
      },
    },
    {
      path: '/data-table-advanced',
      name: 'Data Table Advanced',
      component: () => import('../views/Tables/DataTableAdvanced.vue'),
      meta: {
        title: 'Data Table Advanced',
      },
    },
    {
      path: '/data-table-composable',
      name: 'Data Table Composable',
      component: () => import('../views/Tables/DataTableComposable.vue'),
      meta: {
        title: 'Data Table Composable',
      },
    },
    {
      path: '/products',
      name: 'Product List',
      component: () => import('../views/Products/ProductList.vue'),
      meta: {
        title: 'Daftar Produk',
      },
    },
    {
      path: '/products/add',
      name: 'Add Product',
      component: () => import('../views/Products/AddProduct.vue'),
      meta: {
        title: 'Tambah Produk',
      },
    },
    {
      path: '/products/:id',
      name: 'Product Detail',
      component: () => import('../views/Products/ProductDetail.vue'),
      meta: {
        title: 'Detail Produk',
      },
    },
    {
      path: '/products/edit/:id',
      name: 'Edit Product',
      component: () => import('../views/Products/EditProduct.vue'),
      meta: {
        title: 'Edit Produk',
      },
    },
    {
      path: '/categories',
      name: 'Category List',
      component: () => import('../views/Categories/CategoryList.vue'),
      meta: {
        title: 'Daftar Kategori',
      },
    },
    {
      path: '/categories/add',
      name: 'Add Category',
      component: () => import('../views/Categories/AddCategory.vue'),
      meta: {
        title: 'Tambah Kategori',
      },
    },
    {
      path: '/categories/:id',
      name: 'Category Detail',
      component: () => import('../views/Categories/CategoryDetail.vue'),
      meta: {
        title: 'Detail Kategori',
      },
    },
    {
      path: '/categories/edit/:id',
      name: 'Edit Category',
      component: () => import('../views/Categories/EditCategory.vue'),
      meta: {
        title: 'Edit Kategori',
      },
    },
    {
      path: '/customers',
      name: 'Customer List',
      component: () => import('../views/Customers/CustomerList.vue'),
      meta: {
        title: 'Daftar Customer',
      },
    },
    {
      path: '/customers/add',
      name: 'Add Customer',
      component: () => import('../views/Customers/AddCustomer.vue'),
      meta: {
        title: 'Tambah Customer',
      },
    },
    {
      path: '/customers/:id',
      name: 'Customer Detail',
      component: () => import('../views/Customers/CustomerDetail.vue'),
      meta: {
        title: 'Detail Customer',
      },
    },
    {
      path: '/customers/edit/:id',
      name: 'Edit Customer',
      component: () => import('../views/Customers/EditCustomer.vue'),
      meta: {
        title: 'Edit Customer',
      },
    },
    {
      path: '/transactions',
      name: 'Transaction List',
      component: () => import('../views/Transactions/TransactionList.vue'),
      meta: {
        title: 'Daftar Transaksi',
      },
    },
    {
      path: '/transactions/add',
      name: 'Add Transaction',
      component: () => import('../views/Transactions/AddTransaction.vue'),
      meta: {
        title: 'Transaksi Baru',
      },
    },
    {
      path: '/transactions/add-from-home',
      name: 'Add Transaction From Home',
      component: () => import('../views/Transactions/AddTransactionFromHome.vue'),
      meta: {
        title: 'Transaksi Baru',
      },
    },
    {
      path: '/returns',
      name: 'Return List',
      component: () => import('../views/Returns/ReturnList.vue'),
      meta: {
        title: 'Daftar Retur',
      },
    },
    {
      path: '/transactions/:id',
      name: 'Transaction Detail',
      component: () => import('../views/Transactions/TransactionDetail.vue'),
      meta: {
        title: 'Detail Transaksi',
      },
    },
    {
      path: '/transactions/:id/invoice',
      name: 'Transaction Invoice',
      component: () => import('../views/Transactions/InvoicePage.vue'),
      meta: {
        title: 'Cetak Invoice',
      },
    },
    {
      path: '/reports/sales',
      name: 'Sales Report',
      component: () => import('../views/Reports/SalesReport.vue'),
      meta: {
        title: 'Laporan Penjualan',
      },
    },
    {
      path: '/reports/profit-loss',
      name: 'Profit Loss Report',
      component: () => import('../views/Reports/ProfitLossReport.vue'),
      meta: {
        title: 'Laporan Laba Rugi',
      },
    },
    {
      path: '/reports/transaction-profit',
      name: 'Transaction Profit Report',
      component: () => import('../views/Reports/TransactionProfitReport.vue'),
      meta: {
        title: 'Laba Per Transaksi',
      },
    },
    {
      path: '/reports/transaction-profit/:id',
      name: 'Transaction Profit Detail',
      component: () => import('../views/Reports/TransactionProfitDetail.vue'),
      meta: {
        title: 'Detail Laba Transaksi',
      },
    },
    {
      path: '/stock',
      name: 'Stock Management',
      component: () => import('../views/Stock/StockManagement.vue'),
      meta: {
        title: 'Stok Gudang',
      },
    },
    {
      path: '/stock/:id',
      name: 'Stock Detail',
      component: () => import('../views/Stock/StockDetail.vue'),
      meta: {
        title: 'Detail Stok',
      },
    },
    {
      path: '/stock/movements',
      name: 'Stock Movements',
      component: () => import('../views/Stock/StockMovements.vue'),
      meta: {
        title: 'Riwayat Mutasi Stok',
      },
    },
    {
      path: '/customer-invoices',
      name: 'Customer Invoices',
      component: () => import('../views/Invoices/InvoiceKecamatanList.vue'),
      meta: {
        title: 'Invoice Pelanggan',
      },
    },
    {
      path: '/customer-invoices/:kecamatan',
      name: 'Customer Invoices By Kecamatan',
      component: () => import('../views/Invoices/InvoiceCustomerList.vue'),
      meta: {
        title: 'Pilih Customer',
      },
    },
    {
      path: '/customer-invoices/:kecamatan/:customerId',
      name: 'Customer Invoice List',
      component: () => import('../views/Invoices/CustomerInvoiceList.vue'),
      meta: {
        title: 'Daftar Invoice Pelanggan',
      },
    },
    {
      path: '/customer-invoices/:kecamatan/:customerId/add-transaction',
      name: 'Add Customer Transaction',
      component: () => import('../views/Invoices/AddCustomerTransaction.vue'),
      meta: {
        title: 'Transaksi Baru',
      },
    },
    {
      path: '/customer-invoices/:kecamatan/:customerId/:invoiceId',
      name: 'Customer Invoice Detail',
      component: () => import('../views/Invoices/InvoiceDetail.vue'),
      meta: {
        title: 'Detail Invoice',
      },
    },
    {
      path: '/customer-invoices/:kecamatan/:customerId/:invoiceId/cetak',
      name: 'Customer Invoice Print',
      component: () => import('../views/Invoices/InvoicePrint.vue'),
      meta: {
        title: 'Cetak Invoice',
      },
    },
    {
      path: '/line-chart',
      name: 'Line Chart',
      component: () => import('../views/Chart/LineChart/LineChart.vue'),
    },
    {
      path: '/bar-chart',
      name: 'Bar Chart',
      component: () => import('../views/Chart/BarChart/BarChart.vue'),
    },
    {
      path: '/alerts',
      name: 'Alerts',
      component: () => import('../views/UiElements/Alerts.vue'),
      meta: {
        title: 'Alerts',
      },
    },
    {
      path: '/avatars',
      name: 'Avatars',
      component: () => import('../views/UiElements/Avatars.vue'),
      meta: {
        title: 'Avatars',
      },
    },
    {
      path: '/badge',
      name: 'Badge',
      component: () => import('../views/UiElements/Badges.vue'),
      meta: {
        title: 'Badge',
      },
    },

    {
      path: '/buttons',
      name: 'Buttons',
      component: () => import('../views/UiElements/Buttons.vue'),
      meta: {
        title: 'Buttons',
      },
    },

    {
      path: '/images',
      name: 'Images',
      component: () => import('../views/UiElements/Images.vue'),
      meta: {
        title: 'Images',
      },
    },
    {
      path: '/videos',
      name: 'Videos',
      component: () => import('../views/UiElements/Videos.vue'),
      meta: {
        title: 'Videos',
      },
    },
    {
      path: '/blank',
      name: 'Blank',
      component: () => import('../views/Pages/BlankPage.vue'),
      meta: {
        title: 'Blank',
      },
    },

    {
      path: '/error-404',
      name: '404 Error',
      component: () => import('../views/Errors/FourZeroFour.vue'),
      meta: {
        title: '404 Error',
      },
    },

    {
      path: '/signin',
      name: 'Signin',
      component: () => import('../views/Auth/Signin.vue'),
      meta: {
        title: 'Signin',
      },
    },
    {
      path: '/signup',
      name: 'Signup',
      component: () => import('../views/Auth/Signup.vue'),
      meta: {
        title: 'Signup',
      },
    },
    {
      path: '/sync/download',
      name: 'Sync Download',
      component: () => import('../views/Sync/DownloadScreen.vue'),
      meta: {
        title: 'Mengunduh Data',
      },
    },
    // ============================================================
    // Modul Finance
    // ============================================================
    {
      path: '/finance',
      name: 'Finance Dashboard',
      component: () => import('../views/Finance/FinanceDashboard.vue'),
      meta: { title: 'Dashboard Keuangan' },
    },
    {
      path: '/finance/accounts',
      name: 'Chart of Accounts',
      component: () => import('../views/Finance/ChartOfAccounts.vue'),
      meta: { title: 'Chart of Accounts' },
    },
    {
      path: '/finance/journal',
      name: 'Journal List',
      component: () => import('../views/Finance/JournalList.vue'),
      meta: { title: 'Jurnal Umum' },
    },
    {
      path: '/finance/journal/new',
      name: 'Journal Form',
      component: () => import('../views/Finance/JournalForm.vue'),
      meta: { title: 'Buat Jurnal' },
    },
    {
      path: '/finance/journal/:id',
      name: 'Journal Detail',
      component: () => import('../views/Finance/JournalDetail.vue'),
      meta: { title: 'Detail Jurnal' },
    },
    {
      path: '/finance/ledger',
      name: 'General Ledger',
      component: () => import('../views/Finance/GeneralLedger.vue'),
      meta: { title: 'Buku Besar' },
    },
    {
      path: '/finance/trial-balance',
      name: 'Trial Balance',
      component: () => import('../views/Finance/TrialBalance.vue'),
      meta: { title: 'Neraca Saldo' },
    },
    {
      path: '/finance/balance-sheet',
      name: 'Balance Sheet',
      component: () => import('../views/Finance/BalanceSheet.vue'),
      meta: { title: 'Neraca' },
    },
    {
      path: '/finance/cash-flow',
      name: 'Cash Flow',
      component: () => import('../views/Finance/CashFlow.vue'),
      meta: { title: 'Arus Kas' },
    },
    // ============================================================
    // Modul Pembelian Barang (Purchasing / Procurement)
    // ============================================================
    {
      path: '/purchasing',
      name: 'Purchasing Dashboard',
      component: () => import('../views/Purchasing/PurchaseDashboard.vue'),
      meta: { title: 'Dashboard Pembelian' },
    },
    {
      path: '/purchasing/suppliers',
      name: 'Supplier List',
      component: () => import('../views/Purchasing/SupplierList.vue'),
      meta: { title: 'Daftar Supplier' },
    },
    {
      path: '/purchasing/pos',
      name: 'Purchase Order List',
      component: () => import('../views/Purchasing/PurchaseOrderList.vue'),
      meta: { title: 'Purchase Order' },
    },
    {
      path: '/purchasing/pos/add',
      name: 'Purchase Order Form',
      component: () => import('../views/Purchasing/PurchaseOrderForm.vue'),
      meta: { title: 'Buat Purchase Order' },
    },
    {
      path: '/purchasing/pos/:id',
      name: 'Purchase Order Detail',
      component: () => import('../views/Purchasing/PurchaseOrderDetail.vue'),
      meta: { title: 'Detail Purchase Order' },
    },
    {
      path: '/purchasing/grns',
      name: 'Goods Receipt List',
      component: () => import('../views/Purchasing/GoodsReceiptList.vue'),
      meta: { title: 'Goods Receipt' },
    },
    {
      path: '/purchasing/grns/add',
      name: 'Goods Receipt Form',
      component: () => import('../views/Purchasing/GoodsReceiptForm.vue'),
      meta: { title: 'Terima Barang' },
    },
    {
      path: '/purchasing/grns/:id',
      name: 'Goods Receipt Detail',
      component: () => import('../views/Purchasing/GoodsReceiptDetail.vue'),
      meta: { title: 'Detail Goods Receipt' },
    },
    {
      path: '/purchasing/pis',
      name: 'Purchase Invoice List',
      component: () => import('../views/Purchasing/PurchaseInvoiceList.vue'),
      meta: { title: 'Faktur Pembelian' },
    },
    {
      path: '/purchasing/pis/add',
      name: 'Purchase Invoice Form',
      component: () => import('../views/Purchasing/PurchaseInvoiceForm.vue'),
      meta: { title: 'Buat Faktur Pembelian' },
    },
    {
      path: '/purchasing/pis/:id',
      name: 'Purchase Invoice Detail',
      component: () => import('../views/Purchasing/PurchaseInvoiceDetail.vue'),
      meta: { title: 'Detail Faktur Pembelian' },
    },
    {
      path: '/purchasing/returns',
      name: 'Purchase Return List',
      component: () => import('../views/Purchasing/PurchaseReturnList.vue'),
      meta: { title: 'Retur Pembelian' },
    },
    {
      path: '/purchasing/returns/add',
      name: 'Purchase Return Form',
      component: () => import('../views/Purchasing/PurchaseReturnForm.vue'),
      meta: { title: 'Buat Retur Pembelian' },
    },
    {
      path: '/purchasing/returns/:id',
      name: 'Purchase Return Detail',
      component: () => import('../views/Purchasing/PurchaseReturnDetail.vue'),
      meta: { title: 'Detail Retur Pembelian' },
    },
    // ============================================================
    // Modul HR & Payroll — Manajemen Karyawan
    // ============================================================
    {
      path: '/hr',
      name: 'HR Dashboard',
      component: () => import('../views/Hr/HrDashboard.vue'),
      meta: { title: 'Dashboard HR' },
    },
    {
      path: '/hr/employees',
      name: 'Employee List',
      component: () => import('../views/Hr/EmployeeList.vue'),
      meta: { title: 'Daftar Karyawan' },
    },
    {
      path: '/hr/employees/add',
      name: 'Add Employee',
      component: () => import('../views/Hr/EmployeeForm.vue'),
      meta: { title: 'Tambah Karyawan' },
    },
    {
      path: '/hr/employees/:id',
      name: 'Employee Detail',
      component: () => import('../views/Hr/EmployeeDetail.vue'),
      meta: { title: 'Detail Karyawan' },
    },
    {
      path: '/hr/employees/edit/:id',
      name: 'Edit Employee',
      component: () => import('../views/Hr/EmployeeForm.vue'),
      meta: { title: 'Edit Karyawan' },
    },
    {
      path: '/hr/departments',
      name: 'Department List',
      component: () => import('../views/Hr/DepartmentList.vue'),
      meta: { title: 'Departemen' },
    },
    {
      path: '/hr/positions',
      name: 'Position List',
      component: () => import('../views/Hr/PositionList.vue'),
      meta: { title: 'Jabatan' },
    },
    {
      path: '/hr/attendance',
      name: 'Attendance List',
      component: () => import('../views/Hr/AttendanceList.vue'),
      meta: { title: 'Absensi' },
    },
    {
      path: '/hr/payroll',
      name: 'Payroll List',
      component: () => import('../views/Hr/PayrollList.vue'),
      meta: { title: 'Payroll' },
    },
    {
      path: '/hr/payroll/:id',
      name: 'Payroll Detail',
      component: () => import('../views/Hr/PayrollDetail.vue'),
      meta: { title: 'Detail Payroll' },
    },
    {
      path: '/hr/payroll/period/new',
      name: 'Payroll Period New',
      component: () => import('../views/Hr/PayrollPeriodForm.vue'),
      meta: { title: 'Buat Periode Payroll' },
    },
    {
      path: '/hr/payroll/components',
      name: 'Payroll Component List',
      component: () => import('../views/Hr/PayrollComponentList.vue'),
      meta: { title: 'Komponen Gaji' },
    },

    // ============================================================
    // Modul Pengiriman / Shipping — Surat Jalan
    // ============================================================
    {
      path: '/shipping',
      name: 'Shipping Dashboard',
      component: () => import('../views/Shipping/ShippingDashboard.vue'),
      meta: { title: 'Dashboard Pengiriman' },
    },
    {
      path: '/shipping/deliveries',
      name: 'Delivery Order List',
      component: () => import('../views/Shipping/DeliveryOrderList.vue'),
      meta: { title: 'Surat Jalan' },
    },
    {
      path: '/shipping/deliveries/add',
      name: 'Add Delivery Order',
      component: () => import('../views/Shipping/DeliveryOrderForm.vue'),
      meta: { title: 'Buat Surat Jalan' },
    },
    {
      path: '/shipping/deliveries/:id',
      name: 'Delivery Order Detail',
      component: () => import('../views/Shipping/DeliveryOrderDetail.vue'),
      meta: { title: 'Detail Surat Jalan' },
    },
    {
      path: '/shipping/deliveries/edit/:id',
      name: 'Edit Delivery Order',
      component: () => import('../views/Shipping/DeliveryOrderForm.vue'),
      meta: { title: 'Edit Surat Jalan' },
    },
    {
      path: '/shipping/vehicles',
      name: 'Vehicle List',
      component: () => import('../views/Shipping/VehicleList.vue'),
      meta: { title: 'Kendaraan' },
    },
    // ============================================================
    // Halaman "Lihat Semua" Menu Cepat (mobile dashboard)
    // ============================================================
    {
      path: '/quick-menu/:slug',
      name: 'Quick Menu Group',
      component: () => import('../views/QuickMenu/QuickMenuGroup.vue'),
      meta: { title: 'Semua Menu' },
    },
  ],
})

export default router

const publicRoutes = ['/signin', '/signup']

// Rute yang butuh auth tapi tidak redirect (download screen)
const authenticatedRoutes = ['/sync/download']

router.beforeEach((to, from, next) => {
  document.title = `${to.meta.title} | Ucup Kasir - Aplikasi Kasir`
  next()
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // Muat session sekali saja (dari localStorage) sebelum cek auth
  if (!authStore.initialized) {
    await authStore.initialize()
  }

  // Terakhir kali dicek tidak login, coba ambil session segar dulu.
  // Supabase bisa sesaat melaporkan session null (mis. refresh token gagal
  // di background) padahal token masih valid — hindari redirect ke /signin
  // tanpa konfirmasi nyata.
  if (!authStore.isAuthenticated) {
    const { data } = await supabase.auth.getSession()
    if (data.session) {
      authStore.session = data.session
      authStore.user = data.session.user
    }
  }

  const isPublic = publicRoutes.includes(to.path)
  const isAuthRoute = authenticatedRoutes.includes(to.path)

  if (!isPublic && !authStore.isAuthenticated) {
    // Belum login -> arahkan ke halaman masuk, simpan tujuan awal
    next({ path: '/signin', query: { redirect: to.fullPath } })
  } else if (isPublic && authStore.isAuthenticated) {
    // Sudah login -> jangan biarkan mengakses halaman signin/signup.
    // Hormati query redirect bila ada (dipakai saat user dikirim ke signin lalu login kembali).
    const redirect = typeof to.query.redirect === 'string' ? to.query.redirect : ''
    next({ path: redirect || '/' })
  } else if (isAuthRoute && !authStore.isAuthenticated) {
    // Rute auth tanpa login -> signin
    next({ path: '/signin', query: { redirect: to.fullPath } })
  } else {
    next()
  }
})
