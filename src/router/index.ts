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
        permission: 'dashboard.read',
        title: 'eCommerce Dashboard',
      },
    },
    {
      path: '/signin',
      name: 'Signin',
      component: () => import('../views/Auth/Signin.vue'),
      meta: {
        title: 'Masuk',
      },
    },
    {
      path: '/signup',
      name: 'Signup',
      component: () => import('../views/Auth/Signup.vue'),
      meta: {
        title: 'Daftar',
      },
    },
    {
      path: '/settings',
      name: 'Store Settings',
      component: () => import('../views/Settings/StoreSettings.vue'),
      meta: {
        permission: 'settings.read',
        title: 'Pengaturan Toko',
      },
    },
    {
      path: '/settings/store-info',
      name: 'Store Info',
      component: () => import('../views/Settings/StoreInfo.vue'),
      meta: {
        permission: 'settings.read',
        title: 'Informasi Toko',
      },
    },
    {
      path: '/settings/global-variables',
      name: 'Global Variables',
      component: () => import('../views/Settings/GlobalVariables.vue'),
      meta: {
        permission: 'settings.read',
        title: 'Variabel Global',
      },
    },
    {
      path: '/settings/users',
      name: 'User Management',
      component: () => import('../views/Settings/Users.vue'),
      meta: {
        permission: 'user.manage',
        title: 'Kelola Pengguna',
      },
    },
    {
      path: '/settings/profile',
      name: 'Profile Settings',
      component: () => import('../views/Settings/ProfileSettings.vue'),
      meta: {
        title: 'Profil & Keamanan',
      },
    },
    {
      path: '/settings/sync-debugger',
      name: 'Sync Debugger',
      component: () => import('../views/Settings/SyncDebugger.vue'),
      meta: {
        permission: 'settings.read',
        title: 'Sync Debugger',
      },
    },
    {
      path: '/settings/event-log',
      name: 'Event Log',
      component: () => import('../views/Settings/EventLog.vue'),
      meta: {
        permission: 'settings.read',
        title: 'Log Event',
      },
    },
    {
      path: '/settings/fix-payment-allocation',
      name: 'Fix Payment Allocation',
      component: () => import('../views/Settings/FixPaymentAllocation.vue'),
      meta: {
        permission: 'settings.read',
        title: 'Perbaikan Laba Terealisasi',
      },
    },
    {
      path: '/dev-tools',
      name: 'DevTools',
      component: () => import('../views/DevTools.vue'),
      meta: {
        permission: 'settings.read',
        title: 'Developer Tools',
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
        permission: 'product.read',
        title: 'Daftar Produk',
      },
    },
    {
      path: '/products/add',
      name: 'Add Product',
      component: () => import('../views/Products/AddProduct.vue'),
      meta: {
        permission: 'product.write',
        title: 'Tambah Produk',
      },
    },
    {
      path: '/products/:id',
      name: 'Product Detail',
      component: () => import('../views/Products/ProductDetail.vue'),
      meta: {
        permission: 'product.read',
        title: 'Detail Produk',
      },
    },
    {
      path: '/products/edit/:id',
      name: 'Edit Product',
      component: () => import('../views/Products/EditProduct.vue'),
      meta: {
        permission: 'product.write',
        title: 'Edit Produk',
      },
    },
    {
      path: '/categories',
      name: 'Category List',
      component: () => import('../views/Categories/CategoryList.vue'),
      meta: {
        permission: 'product.read',
        title: 'Daftar Kategori',
      },
    },
    {
      path: '/categories/add',
      name: 'Add Category',
      component: () => import('../views/Categories/AddCategory.vue'),
      meta: {
        permission: 'product.write',
        title: 'Tambah Kategori',
      },
    },
    {
      path: '/categories/:id',
      name: 'Category Detail',
      component: () => import('../views/Categories/CategoryDetail.vue'),
      meta: {
        permission: 'product.read',
        title: 'Detail Kategori',
      },
    },
    {
      path: '/categories/edit/:id',
      name: 'Edit Category',
      component: () => import('../views/Categories/EditCategory.vue'),
      meta: {
        permission: 'product.write',
        title: 'Edit Kategori',
      },
    },
    {
      path: '/customers',
      name: 'Customer List',
      component: () => import('../views/Customers/CustomerList.vue'),
      meta: {
        permission: 'customer.read',
        title: 'Daftar Customer',
      },
    },
    {
      path: '/customers/add',
      name: 'Add Customer',
      component: () => import('../views/Customers/AddCustomer.vue'),
      meta: {
        permission: 'customer.write',
        title: 'Tambah Customer',
      },
    },
    {
      path: '/customers/:id',
      name: 'Customer Detail',
      component: () => import('../views/Customers/CustomerDetail.vue'),
      meta: {
        permission: 'customer.read',
        title: 'Detail Customer',
      },
    },
    {
      path: '/customers/edit/:id',
      name: 'Edit Customer',
      component: () => import('../views/Customers/EditCustomer.vue'),
      meta: {
        permission: 'customer.write',
        title: 'Edit Customer',
      },
    },
    {
      path: '/transactions',
      name: 'Transaction List',
      component: () => import('../views/Transactions/TransactionList.vue'),
      meta: {
        permission: 'transaction.read',
        title: 'Daftar Transaksi',
      },
    },
    {
      path: '/transactions/add',
      name: 'Add Transaction',
      component: () => import('../views/Transactions/AddTransaction.vue'),
      meta: {
        permission: 'transaction.write',
        title: 'Transaksi Baru',
      },
    },
    {
      path: '/transactions/add-from-home',
      name: 'Add Transaction From Home',
      component: () => import('../views/Transactions/AddTransactionFromHome.vue'),
      meta: {
        permission: 'transaction.write',
        title: 'Transaksi Baru',
      },
    },
    {
      path: '/returns',
      name: 'Return List',
      component: () => import('../views/Returns/ReturnList.vue'),
      meta: {
        permission: 'transaction.read',
        title: 'Daftar Retur',
      },
    },
    {
      path: '/transactions/:id',
      name: 'Transaction Detail',
      component: () => import('../views/Transactions/TransactionDetail.vue'),
      meta: {
        permission: 'transaction.read',
        title: 'Detail Transaksi',
      },
    },
    {
      path: '/transactions/:id/invoice',
      name: 'Transaction Invoice',
      component: () => import('../views/Transactions/InvoicePage.vue'),
      meta: {
        permission: 'transaction.read',
        title: 'Cetak Invoice',
      },
    },
    {
      path: '/price-matrix',
      name: 'Price Matrix',
      component: () => import('../views/PriceMatrix/PriceMatrixMenu.vue'),
      meta: {
        permission: 'price.read',
        title: 'Matriks Harga',
      },
    },
    {
      path: '/price-matrix/tiers',
      name: 'Price Tier List',
      component: () => import('../views/PriceMatrix/tiers/TierListPage.vue'),
      meta: { permission: 'price.read', title: 'Harga Tier' },
    },
    {
      path: '/price-matrix/tiers/add',
      name: 'Add Price Tier',
      component: () => import('../views/PriceMatrix/tiers/TierFormPage.vue'),
      meta: { permission: 'price.write', title: 'Tambah Harga Tier' },
    },
    {
      path: '/price-matrix/tiers/:id/edit',
      name: 'Edit Price Tier',
      component: () => import('../views/PriceMatrix/tiers/TierFormPage.vue'),
      meta: { permission: 'price.write', title: 'Edit Harga Tier' },
    },
    {
      path: '/price-matrix/groups',
      name: 'Customer Group List',
      component: () => import('../views/PriceMatrix/groups/GroupListPage.vue'),
      meta: { permission: 'price.read', title: 'Grup Pelanggan' },
    },
    {
      path: '/price-matrix/groups/add',
      name: 'Add Customer Group',
      component: () => import('../views/PriceMatrix/groups/GroupFormPage.vue'),
      meta: { permission: 'price.write', title: 'Tambah Grup' },
    },
    {
      path: '/price-matrix/groups/:id/edit',
      name: 'Edit Customer Group',
      component: () => import('../views/PriceMatrix/groups/GroupFormPage.vue'),
      meta: { permission: 'price.write', title: 'Edit Grup' },
    },
    {
      path: '/price-matrix/group-prices',
      name: 'Group Price List',
      component: () => import('../views/PriceMatrix/groupPrices/GroupPriceListPage.vue'),
      meta: { permission: 'price.read', title: 'Harga Grup' },
    },
    {
      path: '/price-matrix/group-prices/add',
      name: 'Add Group Price',
      component: () => import('../views/PriceMatrix/groupPrices/GroupPriceFormPage.vue'),
      meta: { permission: 'price.write', title: 'Tambah Harga Grup' },
    },
    {
      path: '/price-matrix/group-prices/:id/edit',
      name: 'Edit Group Price',
      component: () => import('../views/PriceMatrix/groupPrices/GroupPriceFormPage.vue'),
      meta: { permission: 'price.write', title: 'Edit Harga Grup' },
    },
    {
      path: '/price-matrix/customers',
      name: 'Customer Price List',
      component: () => import('../views/PriceMatrix/customers/CustomerPriceListPage.vue'),
      meta: { permission: 'price.read', title: 'Harga Khusus' },
    },
    {
      path: '/price-matrix/customers/add',
      name: 'Add Customer Price',
      component: () => import('../views/PriceMatrix/customers/CustomerPriceFormPage.vue'),
      meta: { permission: 'price.write', title: 'Tambah Harga Khusus' },
    },
    {
      path: '/price-matrix/customers/:id/edit',
      name: 'Edit Customer Price',
      component: () => import('../views/PriceMatrix/customers/CustomerPriceFormPage.vue'),
      meta: { permission: 'price.write', title: 'Edit Harga Khusus' },
    },
    {
      path: '/reports',
      name: 'Reports Index',
      component: () => import('../views/Reports/ReportsIndex.vue'),
      meta: {
        permission: 'report.sales.read',
        title: 'Laporan',
      },
    },
    {
      path: '/reports',
      name: 'Reports Menu',
      component: () => import('../views/Reports/ReportsIndex.vue'),
      meta: {
        permission: 'report.sales.read',
        title: 'Laporan',
      },
    },
    {
      path: '/reports/sales',
      name: 'Sales Report',
      component: () => import('../views/Reports/SalesReport.vue'),
      meta: {
        permission: 'report.sales.read',
        title: 'Laporan Penjualan',
      },
    },
    {
      path: '/reports/profit-loss',
      name: 'Profit Loss Report',
      component: () => import('../views/Reports/ProfitLossReport.vue'),
      meta: {
        permission: 'report.sales.read',
        title: 'Laporan Laba Rugi',
      },
    },
    {
      path: '/reports/daily-profit',
      name: 'Daily Profit Report',
      component: () => import('../views/Reports/DailyProfitReport.vue'),
      meta: {
        permission: 'report.sales.read',
        title: 'Laporan Keuntungan Harian',
      },
    },
    {
      path: '/stock',
      name: 'Stock Management',
      component: () => import('../views/Stock/StockManagement.vue'),
      meta: {
        permission: 'stock.read',
        title: 'Stok Gudang',
      },
    },
    {
      path: '/stock/:id',
      name: 'Stock Detail',
      component: () => import('../views/Stock/StockDetail.vue'),
      meta: {
        permission: 'stock.read',
        title: 'Detail Stok',
      },
    },
    {
      path: '/stock/movements',
      name: 'Stock Movements',
      component: () => import('../views/Stock/StockMovements.vue'),
      meta: {
        permission: 'stock.read',
        title: 'Riwayat Mutasi Stok',
      },
    },
    {
      path: '/customer-invoices',
      name: 'Customer Invoices',
      component: () => import('../views/Invoices/InvoiceKecamatanList.vue'),
      meta: {
        permission: 'transaction.read',
        title: 'Invoice Pelanggan',
      },
    },
    {
      path: '/customer-invoices/:kecamatan',
      name: 'Customer Invoices By Kecamatan',
      component: () => import('../views/Invoices/InvoiceCustomerList.vue'),
      meta: {
        permission: 'transaction.read',
        title: 'Pilih Customer',
      },
    },
    {
      path: '/customer-invoices/:kecamatan/:customerId',
      name: 'Customer Invoice List',
      component: () => import('../views/Invoices/CustomerInvoiceList.vue'),
      meta: {
        permission: 'transaction.read',
        title: 'Daftar Invoice Pelanggan',
      },
    },
    {
      path: '/customer-invoices/:kecamatan/:customerId/add-transaction',
      name: 'Add Customer Transaction',
      component: () => import('../views/Invoices/AddCustomerTransaction.vue'),
      meta: {
        permission: 'transaction.write',
        title: 'Transaksi Baru',
      },
    },
    {
      path: '/customer-invoices/:kecamatan/:customerId/:invoiceId',
      name: 'Customer Invoice Detail',
      component: () => import('../views/Invoices/InvoiceDetail.vue'),
      meta: {
        permission: 'transaction.read',
        title: 'Detail Invoice',
      },
    },
    {
      path: '/customer-invoices/:kecamatan/:customerId/:invoiceId/cetak',
      name: 'Customer Invoice Print',
      component: () => import('../views/Invoices/InvoicePrint.vue'),
      meta: {
        permission: 'transaction.read',
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
      meta: { permission: 'finance.read', title: 'Dashboard Keuangan' },
    },
    {
      path: '/finance/accounts',
      name: 'Chart of Accounts',
      component: () => import('../views/Finance/ChartOfAccounts.vue'),
      meta: { permission: 'finance.read', title: 'Chart of Accounts' },
    },
    {
      path: '/finance/journal',
      name: 'Journal List',
      component: () => import('../views/Finance/JournalList.vue'),
      meta: { permission: 'finance.read', title: 'Jurnal Umum' },
    },
    {
      path: '/finance/journal/new',
      name: 'Journal Form',
      component: () => import('../views/Finance/JournalForm.vue'),
      meta: { permission: 'finance.write', title: 'Buat Jurnal' },
    },
    {
      path: '/finance/ledger',
      name: 'General Ledger',
      component: () => import('../views/Finance/GeneralLedger.vue'),
      meta: { permission: 'finance.read', title: 'Buku Besar' },
    },
    {
      path: '/finance/trial-balance',
      name: 'Trial Balance',
      component: () => import('../views/Finance/TrialBalance.vue'),
      meta: { permission: 'finance.read', title: 'Neraca Saldo & Penyesuaian' },
    },
    {
      path: '/finance/balance-sheet',
      name: 'Balance Sheet',
      component: () => import('../views/Finance/BalanceSheet.vue'),
      meta: { permission: 'finance.read', title: 'Neraca' },
    },
    {
      path: '/finance/cash-flow',
      name: 'Cash Flow',
      component: () => import('../views/Finance/CashFlow.vue'),
      meta: { permission: 'finance.read', title: 'Arus Kas' },
    },
    {
      path: '/finance/statements',
      name: 'Financial Statements',
      component: () => import('../views/Finance/FinancialStatements.vue'),
      meta: { permission: 'finance.read', title: 'Laporan Keuangan' },
    },
    {
      path: '/finance/closing-periods',
      name: 'Closing Periods',
      component: () => import('../views/Finance/ClosingPeriods.vue'),
      meta: { permission: 'finance.read', title: 'Tutup Buku' },
    },
    {
      path: '/finance/closing-periods/:id',
      name: 'Closing Period Detail',
      component: () => import('../views/Finance/ClosingPeriodDetail.vue'),
      meta: { permission: 'finance.read', title: 'Detail Tutup Buku' },
    },
    {
      path: '/laporan/mutasi-kas',
      name: 'Daily Cash Report',
      component: () => import('../views/Reports/DailyCashReport.vue'),
      meta: { permission: 'finance.read', title: 'Mutasi Kas Hari Ini' },
    },
    {
      path: '/laporan/mutasi-bank',
      name: 'Daily Bank Report',
      component: () => import('../views/Reports/DailyBankReport.vue'),
      meta: { permission: 'finance.read', title: 'Mutasi Bank Hari Ini' },
    },
    {
      path: '/laporan/mutasi-kas-bulanan',
      name: 'Monthly Cash Report',
      component: () => import('../views/Reports/MonthlyCashReport.vue'),
      meta: { permission: 'finance.read', title: 'Mutasi Kas Bulanan' },
    },
    {
      path: '/reports/aging-receivables',
      name: 'Aging Receivables Report',
      component: () => import('../views/Reports/AgingReceivablesReport.vue'),
      meta: { permission: 'report.sales.read', title: 'Laporan Piutang Menua' },
    },
    {
      path: '/reports/aging-receivables',
      name: 'Aging Receivables Report',
      component: () => import('../views/Reports/AgingReceivablesReport.vue'),
      meta: { permission: 'report.sales.read', title: 'Laporan Piutang Menua' },
    },
    // ============================================================
    // Modul Pembelian Barang (Purchasing / Procurement)
    // ============================================================
    {
      path: '/purchasing',
      name: 'Purchasing Dashboard',
      component: () => import('../views/Purchasing/PurchaseDashboard.vue'),
      meta: { permission: 'purchasing.read', title: 'Dashboard Pembelian' },
    },
    {
      path: '/purchasing/suppliers',
      name: 'Supplier List',
      component: () => import('../views/Purchasing/SupplierList.vue'),
      meta: { permission: 'purchasing.read', title: 'Daftar Supplier' },
    },
    {
      path: '/purchasing/suppliers/add',
      name: 'Add Supplier',
      component: () => import('../views/Purchasing/AddSupplier.vue'),
      meta: { permission: 'purchasing.write', title: 'Tambah Supplier' },
    },
    {
      path: '/purchasing/suppliers/:id/edit',
      name: 'Edit Supplier',
      component: () => import('../views/Purchasing/EditSupplier.vue'),
      meta: { permission: 'purchasing.write', title: 'Edit Supplier' },
    },
    {
      path: '/purchasing/pos',
      name: 'Purchase Order List',
      component: () => import('../views/Purchasing/PurchaseOrderList.vue'),
      meta: { permission: 'purchasing.read', title: 'Purchase Order' },
    },
    {
      path: '/purchasing/pos/add',
      name: 'Purchase Order Form',
      component: () => import('../views/Purchasing/PurchaseOrderForm.vue'),
      meta: { permission: 'purchasing.write', title: 'Buat Purchase Order' },
    },
    {
      path: '/purchasing/pos/:id',
      name: 'Purchase Order Detail',
      component: () => import('../views/Purchasing/PurchaseOrderDetail.vue'),
      meta: { permission: 'purchasing.read', title: 'Detail Purchase Order' },
    },
    {
      path: '/purchasing/grns',
      name: 'Goods Receipt List',
      component: () => import('../views/Purchasing/GoodsReceiptList.vue'),
      meta: { permission: 'purchasing.read', title: 'Goods Receipt' },
    },
    {
      path: '/purchasing/grns/add',
      name: 'Goods Receipt Form',
      component: () => import('../views/Purchasing/GoodsReceiptForm.vue'),
      meta: { permission: 'purchasing.write', title: 'Terima Barang' },
    },
    {
      path: '/purchasing/grns/:id',
      name: 'Goods Receipt Detail',
      component: () => import('../views/Purchasing/GoodsReceiptDetail.vue'),
      meta: { permission: 'purchasing.read', title: 'Detail Goods Receipt' },
    },
    {
      path: '/purchasing/pis',
      name: 'Purchase Invoice List',
      component: () => import('../views/Purchasing/PurchaseInvoiceList.vue'),
      meta: { permission: 'purchasing.read', title: 'Faktur Pembelian' },
    },
    {
      path: '/purchasing/pis/add',
      name: 'Purchase Invoice Form',
      component: () => import('../views/Purchasing/PurchaseInvoiceForm.vue'),
      meta: { permission: 'purchasing.write', title: 'Buat Faktur Pembelian' },
    },
    {
      path: '/purchasing/pis/:id',
      name: 'Purchase Invoice Detail',
      component: () => import('../views/Purchasing/PurchaseInvoiceDetail.vue'),
      meta: { permission: 'purchasing.read', title: 'Detail Faktur Pembelian' },
    },
    {
      path: '/purchasing/returns',
      name: 'Purchase Return List',
      component: () => import('../views/Purchasing/PurchaseReturnList.vue'),
      meta: { permission: 'purchasing.read', title: 'Retur Pembelian' },
    },
    {
      path: '/purchasing/returns/add',
      name: 'Purchase Return Form',
      component: () => import('../views/Purchasing/PurchaseReturnForm.vue'),
      meta: { permission: 'purchasing.write', title: 'Buat Retur Pembelian' },
    },
    {
      path: '/purchasing/returns/:id',
      name: 'Purchase Return Detail',
      component: () => import('../views/Purchasing/PurchaseReturnDetail.vue'),
      meta: { permission: 'purchasing.read', title: 'Detail Retur Pembelian' },
    },
    // ============================================================
    // Modul HR & Payroll — Manajemen Karyawan
    // ============================================================
    {
      path: '/hr/employees',
      name: 'Employee List',
      component: () => import('../views/Hr/EmployeeList.vue'),
      meta: { permission: 'hr.read', title: 'Daftar Karyawan' },
    },
    {
      path: '/hr/employees/add',
      name: 'Add Employee',
      component: () => import('../views/Hr/EmployeeForm.vue'),
      meta: { permission: 'hr.read', title: 'Tambah Karyawan' },
    },
    {
      path: '/hr/employees/:id',
      name: 'Employee Detail',
      component: () => import('../views/Hr/EmployeeDetail.vue'),
      meta: { permission: 'hr.read', title: 'Detail Karyawan' },
    },
    {
      path: '/hr/employees/edit/:id',
      name: 'Edit Employee',
      component: () => import('../views/Hr/EmployeeForm.vue'),
      meta: { permission: 'hr.read', title: 'Edit Karyawan' },
    },
    {
      path: '/hr/loans',
      name: 'Employee Loan List',
      component: () => import('../views/Hr/EmployeeLoanList.vue'),
      meta: { permission: 'hr.read', title: 'Kasbon Karyawan' },
    },
    {
      path: '/hr/payroll',
      name: 'Payroll List',
      component: () => import('../views/Hr/PayrollListNew.vue'),
      meta: { permission: 'hr.read', title: 'Slip Gaji' },
    },
    {
      path: '/hr/payroll/print/:id',
      name: 'Print Payroll Slip',
      component: () => import('../views/Hr/PayrollSlipPrint.vue'),
      meta: { permission: 'hr.read', title: 'Cetak Slip Gaji' },
    },

    // ============================================================
    // Modul Pengiriman / Shipping — Surat Jalan
    // ============================================================
    {
      path: '/shipping/deliveries',
      name: 'Delivery Order List',
      component: () => import('../views/Shipping/DeliveryOrderList.vue'),
      meta: { permission: 'shipping.read', title: 'Surat Jalan' },
    },
    {
      path: '/shipping/pending-shipments',
      name: 'Pending Shipment List',
      component: () => import('../views/Shipping/PendingShipmentList.vue'),
      meta: { permission: 'shipping.read', title: 'Transaksi Belum Dikirim' },
    },
    {
      path: '/shipping/deliveries/add',
      name: 'Add Delivery Order',
      component: () => import('../views/Shipping/DeliveryOrderForm.vue'),
      meta: { permission: 'shipping.write', title: 'Buat Surat Jalan' },
    },
    {
      path: '/shipping/deliveries/:id',
      name: 'Delivery Order Detail',
      component: () => import('../views/Shipping/DeliveryOrderDetail.vue'),
      meta: { permission: 'shipping.read', title: 'Detail Surat Jalan' },
    },
    {
      path: '/shipping/deliveries/edit/:id',
      name: 'Edit Delivery Order',
      component: () => import('../views/Shipping/DeliveryOrderForm.vue'),
      meta: { permission: 'shipping.write', title: 'Edit Surat Jalan' },
    },
    {
      path: '/shipping/deliveries/print/:id',
      name: 'Print Delivery Order',
      component: () => import('../views/Shipping/DeliveryOrderPrint.vue'),
      meta: { permission: 'shipping.read', title: 'Cetak Surat Jalan' },
    },
    {
      path: '/shipping/vehicles',
      name: 'Vehicle List',
      component: () => import('../views/Shipping/VehicleList.vue'),
      meta: { permission: 'shipping.read', title: 'Kendaraan' },
    },
    // ============================================================
    // Halaman "Lihat Semua" Menu Cepat (mobile dashboard)
    // ============================================================
    {
      path: '/quick-menu/:slug',
      name: 'Quick Menu Group',
      component: () => import('../views/QuickMenu/QuickMenuGroup.vue'),
      meta: { permission: 'dashboard.read', title: 'Semua Menu' },
    },
    // ============================================================
    // Akses ditolak (guard permission)
    // ============================================================
    {
      path: '/403',
      name: 'Forbidden',
      component: () => import('../views/Pages/Forbidden.vue'),
      meta: { title: 'Akses Ditolak' },
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

/**
 * Guard permission (lapis UI).
 *
 * Dijalankan SETELAH guard auth, jadi `to` di sini sudah pasti rute yang
 * boleh diakses secara sesi. Nilai `permissions` berasal dari `store_members`
 * + `role_permissions`; bila belum termuat (mis. offline tanpa cache) kita
 * coba muat sekali, lalu **fail-closed** — rute ber-permission tanpa hak
 * diarahkan ke `/403`.
 *
 * Ini bukan kontrol keamanan: RLS/RPC tetap menolak akses data di server.
 * Guard ini hanya mencegah pengguna tersesat ke halaman yang pasti gagal.
 */
router.beforeEach(async (to, from, next) => {
  const required = to.meta.permission
  if (!required) return next()

  const authStore = useAuthStore()

  // Rute publik / belum login sudah ditangani guard sebelumnya.
  if (!authStore.isAuthenticated) return next()

  if (!authStore.membershipLoaded) {
    await authStore.loadMembership()
  }

  // `can()` membaca Set permission; kosong = tidak punya hak apa pun.
  if (authStore.can(required)) return next()

  next({ path: '/403', replace: true })
})
