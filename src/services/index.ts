import { getActiveBackend } from '@/lib/connectionMode'
import { scheduleCacheRefresh } from '@/lib/cacheRefresh'
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
import { priceMatrixService } from './priceMatrixService'
import { sqlitePriceMatrixService } from './sqlite/priceMatrix'
import { itemPaymentService } from './itemPaymentService'
import { sqliteItemPaymentService } from './sqlite/itemPaymentService'
import { dailyCashService } from './dailyCash'
import { sqliteDailyCashService } from './sqlite/dailyCash'
import { dailyBankService } from './dailyBank'
import { sqliteDailyBankService } from './sqlite/dailyBank'
import { agingReceivablesService } from './agingReceivables'
import { sqliteAgingReceivablesService } from './sqlite/agingReceivables'

// ============================================================
// Service router — HYBRID online/offline.
//
// Dulu: pilihan statis `isNativeApp() ? sqlite : supabase`, dievaluasi
// sekali saat import (Android selalu SQLite).
//
// Sekarang: router per-domain yang memilih implementasi SETIAP KALI
// method dipanggil, berdasarkan konektivitas (lihat getActiveBackend):
//   - Online (Android & web) → service Supabase.
//   - Offline (Android)      → service SQLite (cache lokal + sync_queue).
//
// Kedua implementasi punya API identik (paritas method 1:1), jadi tipe
// publik cukup memakai tipe implementasi online.
// ============================================================

/**
 * Nama method yang menandakan operasi TULIS (memicu refresh cache).
 * Sengaja tidak menyertakan prefiks baca (get/fetch/list/calculate/search)
 * agar refresh tidak terpicu oleh setiap pembacaan.
 */
const MUTATION_RE =
  /^(create|update|delete|void|add|remove|import|save|set|post|reopen|close|generate|reclassify|bulk|allocate|deallocate|reallocate|adjust|replace|merge|mark|seedDefault)/i

function routeDomain<SB, SQ>(online: SB, local: SQ): SB {
  return new Proxy({} as any, {
    get(_target, prop) {
      const impl: any = getActiveBackend() === 'local' ? local : online
      const value = impl[prop as keyof typeof impl]

      if (typeof value !== 'function') return value

      return function (this: unknown, ...args: unknown[]) {
        // Bind `this` ke implementasi terpilih — service memakai this.mapRow,
        // this.updateStatus, this.getById, dsb.
        const result = value.apply(impl, args)

        // Setelah mutasi online di Android, segarkan cache SQLite (debounced)
        // supaya siap bila koneksi putus. Refresh sendiri mengecek status.
        if (
          isNativeApp() &&
          getActiveBackend() === 'online' &&
          typeof prop === 'string' &&
          MUTATION_RE.test(prop) &&
          result &&
          typeof (result as any).then === 'function'
        ) {
          ;(result as Promise<unknown>).then(
            () => scheduleCacheRefresh(),
            () => {
              /* error sudah ditangani pemanggil; jangan refresh */
            }
          )
        }

        return result
      }
    },
  })
}

export const productsServiceAdapter = routeDomain(productsService, sqliteProductsService)
export const categoriesServiceAdapter = routeDomain(categoriesService, sqliteCategoriesService)
export const storeSettingsServiceAdapter = routeDomain(storeSettingsService, sqliteStoreSettingsService)
export const customersServiceAdapter = routeDomain(customersService, sqliteCustomersService)
export const notificationsServiceAdapter = routeDomain(notificationsService, sqliteNotificationsService)
export const transactionsServiceAdapter = routeDomain(transactionsService, sqliteTransactionsService)
export const returnsServiceAdapter = routeDomain(returnsService, sqliteReturnsService)
export const stockServiceAdapter = routeDomain(stockService, sqliteStockService)
export const salesReportServiceAdapter = routeDomain(salesReportService, sqliteSalesReportService)
export const salesReportEnhancedServiceAdapter = routeDomain(salesReportEnhancedService, sqliteSalesReportEnhancedService)
export const financeServiceAdapter = routeDomain(financeService, sqliteFinanceService)
export const purchasingServiceAdapter = routeDomain(purchasingService, sqlitePurchasingService)
export const hrServiceAdapter = routeDomain(hrService, sqliteHrService)
export const shippingServiceAdapter = routeDomain(shippingService, sqliteShippingService)
export const priceMatrixServiceAdapter = routeDomain(priceMatrixService, sqlitePriceMatrixService)
export const itemPaymentServiceAdapter = routeDomain(itemPaymentService, sqliteItemPaymentService)
export const dailyCashServiceAdapter = routeDomain(dailyCashService, sqliteDailyCashService)
export const dailyBankServiceAdapter = routeDomain(dailyBankService, sqliteDailyBankService)
export const agingReceivablesServiceAdapter = routeDomain(agingReceivablesService, sqliteAgingReceivablesService)
export type { StockMovement, StockAdjustment, StockOpname, StockAlert }
