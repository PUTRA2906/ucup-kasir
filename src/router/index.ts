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
      path: '/settings',
      name: 'Store Settings',
      component: () => import('../views/Settings/StoreSettings.vue'),
      meta: {
        title: 'Pengaturan Toko',
      },
    },
    {
      path: '/settings/sync-debugger',
      name: 'Sync Debugger',
      component: () => import('../views/Settings/SyncDebugger.vue'),
      meta: {
        title: 'Sync Debugger',
      },
    },
    {
      path: '/settings/event-log',
      name: 'Event Log',
      component: () => import('../views/Settings/EventLog.vue'),
      meta: {
        title: 'Log Event',
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
      path: '/price-matrix',
      name: 'Price Matrix',
      component: () => import('../views/PriceMatrix/PriceMatrixMenu.vue'),
      meta: {
        title: 'Matriks Harga',
      },
    },
    {
      path: '/price-matrix/tiers',
      name: 'Price Tier List',
      component: () => import('../views/PriceMatrix/tiers/TierListPage.vue'),
      meta: { title: 'Harga Tier' },
    },
    {
      path: '/price-matrix/tiers/add',
      name: 'Add Price Tier',
      component: () => import('../views/PriceMatrix/tiers/TierFormPage.vue'),
      meta: { title: 'Tambah Harga Tier' },
    },
    {
      path: '/price-matrix/tiers/:id/edit',
      name: 'Edit Price Tier',
      component: () => import('../views/PriceMatrix/tiers/TierFormPage.vue'),
      meta: { title: 'Edit Harga Tier' },
    },
    {
      path: '/price-matrix/groups',
      name: 'Customer Group List',
      component: () => import('../views/PriceMatrix/groups/GroupListPage.vue'),
      meta: { title: 'Grup Pelanggan' },
    },
    {
      path: '/price-matrix/groups/add',
      name: 'Add Customer Group',
      component: () => import('../views/PriceMatrix/groups/GroupFormPage.vue'),
      meta: { title: 'Tambah Grup' },
    },
    {
      path: '/price-matrix/groups/:id/edit',
      name: 'Edit Customer Group',
      component: () => import('../views/PriceMatrix/groups/GroupFormPage.vue'),
      meta: { title: 'Edit Grup' },
    },
    {
      path: '/price-matrix/group-prices',
      name: 'Group Price List',
      component: () => import('../views/PriceMatrix/groupPrices/GroupPriceListPage.vue'),
      meta: { title: 'Harga Grup' },
    },
    {
      path: '/price-matrix/group-prices/add',
      name: 'Add Group Price',
      component: () => import('../views/PriceMatrix/groupPrices/GroupPriceFormPage.vue'),
      meta: { title: 'Tambah Harga Grup' },
    },
    {
      path: '/price-matrix/group-prices/:id/edit',
      name: 'Edit Group Price',
      component: () => import('../views/PriceMatrix/groupPrices/GroupPriceFormPage.vue'),
      meta: { title: 'Edit Harga Grup' },
    },
    {
      path: '/price-matrix/customers',
      name: 'Customer Price List',
      component: () => import('../views/PriceMatrix/customers/CustomerPriceListPage.vue'),
      meta: { title: 'Harga Khusus' },
    },
    {
      path: '/price-matrix/customers/add',
      name: 'Add Customer Price',
      component: () => import('../views/PriceMatrix/customers/CustomerPriceFormPage.vue'),
      meta: { title: 'Tambah Harga Khusus' },
    },
    {
      path: '/price-matrix/customers/:id/edit',
      name: 'Edit Customer Price',
      component: () => import('../views/PriceMatrix/customers/CustomerPriceFormPage.vue'),
      meta: { title: 'Edit Harga Khusus' },
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
      path: '/hr/loans',
      name: 'Employee Loan List',
      component: () => import('../views/Hr/EmployeeLoanList.vue'),
      meta: { title: 'Kasbon Karyawan' },
    },
    {
      path: '/hr/payroll',
      name: 'Payroll List',
      component: () => import('../views/Hr/PayrollListNew.vue'),
      meta: { title: 'Slip Gaji' },
    },
    {
      path: '/hr/payroll/print/:id',
      name: 'Print Payroll Slip',
      component: () => import('../views/Hr/PayrollSlipPrint.vue'),
      meta: { title: 'Cetak Slip Gaji' },
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
      path: '/shipping/pending-shipments',
      name: 'Pending Shipment List',
      component: () => import('../views/Shipping/PendingShipmentList.vue'),
      meta: { title: 'Transaksi Belum Dikirim' },
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
      path: '/shipping/deliveries/print/:id',
      name: 'Print Delivery Order',
      component: () => import('../views/Shipping/DeliveryOrderPrint.vue'),
      meta: { title: 'Cetak Surat Jalan' },
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
