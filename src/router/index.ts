import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

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
  ],
})

export default router

const publicRoutes = ['/signin', '/signup']

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

  const isPublic = publicRoutes.includes(to.path)

  if (!isPublic && !authStore.isAuthenticated) {
    // Belum login -> arahkan ke halaman masuk, simpan tujuan awal
    next({ path: '/signin', query: { redirect: to.fullPath } })
  } else if (isPublic && authStore.isAuthenticated) {
    // Sudah login -> jangan biarkan mengakses halaman signin/signup
    next({ path: '/products' })
  } else {
    next()
  }
})
