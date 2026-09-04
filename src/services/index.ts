import { isNativeApp } from '@/lib/platform'
import { productsService } from './products'
import { sqliteProductsService } from './sqlite/products'
import { categoriesService } from './categories'
import { sqliteCategoriesService } from './sqlite/categories'
import { storeSettingsService } from './storeSettings'
import { sqliteStoreSettingsService } from './sqlite/storeSettings'
import { customersService } from './customers'
import { sqliteCustomersService } from './sqlite/customers'
import { notificationsService } from './notifications'
import { sqliteNotificationsService } from './sqlite/notifications'
import { transactionsService } from './transactions'
import { sqliteTransactionsService } from './sqlite/transactions'
import { returnsService } from './returns'
import { sqliteReturnsService } from './sqlite/returns'
import { stockService, type StockMovement, type StockAdjustment, type StockOpname, type StockAlert } from './stock'
import { sqliteStockService } from './sqlite/stock'
import { salesReportService } from './salesReport'
import { sqliteSalesReportService } from './sqlite/salesReport'
import { salesReportEnhancedService } from './salesReportEnhanced'
import { sqliteSalesReportEnhancedService } from './sqlite/salesReportEnhanced'
import { financeService } from './finance'
import { sqliteFinanceService } from './sqlite/finance'
import { purchasingService } from './purchasing'
import { sqlitePurchasingService } from './sqlite/purchasing'
import { hrService } from './hr'
import { sqliteHrService } from './sqlite/hr'
import { shippingService } from './shipping'
import { sqliteShippingService } from './sqlite/shipping'

// ============================================================
// Service factory — pilih implementasi berdasarkan platform.
//
// Android (native) → SQLite lokal (offline-first).
// Web (mobile/desktop) → Supabase langsung.
//
// Store Pinia memanggil service dari sini, bukan langsung ke
// implementasi SQLite/Supabase, supaya logika pemilihan platform
// terpusat di satu tempat.
// ============================================================

export const productsServiceAdapter = isNativeApp() ? sqliteProductsService : productsService
export const categoriesServiceAdapter = isNativeApp() ? sqliteCategoriesService : categoriesService
export const storeSettingsServiceAdapter = isNativeApp() ? sqliteStoreSettingsService : storeSettingsService
export const customersServiceAdapter = isNativeApp() ? sqliteCustomersService : customersService
export const notificationsServiceAdapter = isNativeApp() ? sqliteNotificationsService : notificationsService
export const transactionsServiceAdapter = isNativeApp() ? sqliteTransactionsService : transactionsService
export const returnsServiceAdapter = isNativeApp() ? sqliteReturnsService : returnsService
export const stockServiceAdapter = isNativeApp() ? sqliteStockService : stockService
export const salesReportServiceAdapter = isNativeApp() ? sqliteSalesReportService : salesReportService
export const salesReportEnhancedServiceAdapter = isNativeApp() ? sqliteSalesReportEnhancedService : salesReportEnhancedService
export const financeServiceAdapter = isNativeApp() ? sqliteFinanceService : financeService
export const purchasingServiceAdapter = isNativeApp() ? sqlitePurchasingService : purchasingService
export const hrServiceAdapter = isNativeApp() ? sqliteHrService : hrService
export const shippingServiceAdapter = isNativeApp() ? sqliteShippingService : shippingService
export type { StockMovement, StockAdjustment, StockOpname, StockAlert }
