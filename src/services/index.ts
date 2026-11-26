import { invalidateDomain } from '@/lib/queryCache'
import { logEvent } from '@/lib/eventLog'
import { productsService } from './products'
import { categoriesService } from './categories'
import { storeSettingsService } from './storeSettings'
import { customersService } from './customers'
import { notificationsService } from './notifications'
import { transactionsService } from './transactions'
import { returnsService } from './returns'
import { stockService, type StockMovement, type StockAdjustment, type StockOpname, type StockAlert } from './stock'
import { salesReportService } from './salesReport'
import { salesReportEnhancedService } from './salesReportEnhanced'
import { financeService } from './finance'
import { purchasingService } from './purchasing'
import { hrService } from './hr'
import { shippingService } from './shipping'
import { priceMatrixService } from './priceMatrixService'
import { itemPaymentService } from './itemPaymentService'
import { dailyCashService } from './dailyCash'
import { dailyBankService } from './dailyBank'
import { agingReceivablesService } from './agingReceivables'

// ============================================================
// Service adapters.
//
// Dulu berkas ini adalah router hybrid online/offline: setiap method dipilih
// antara service Supabase dan service SQLite tergantung konektivitas. Mode
// offline sudah dihapus (lihat docs/RBAC_PLAN.md §7.3) — sekarang SEMUA
// operasi langsung ke Supabase, dan yang dipasang di sini hanyalah:
//   - binding `this` (service memakai this.mapRow, this.getById, dst.),
//   - invalidasi cache baca setelah operasi TULIS berhasil.
// ============================================================

/**
 * Nama method yang menandakan operasi TULIS. Sengaja tidak menyertakan
 * prefiks baca (get/fetch/list/calculate/search) agar cache tidak dibuang
 * oleh setiap pembacaan.
 */
const MUTATION_RE =
  /^(create|update|delete|void|add|remove|import|save|set|post|reopen|close|generate|reclassify|bulk|allocate|deallocate|reallocate|adjust|replace|merge|mark|seedDefault)/i

function withInvalidation<T extends object>(service: T, domain: string): T {
  return new Proxy(service, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)
      if (typeof value !== 'function') return value

      return function (this: unknown, ...args: unknown[]) {
        // Bind ke target agar `this.mapRow` / `this.getById` tetap bekerja.
        const result = value.apply(target, args)

        if (
          typeof prop === 'string' &&
          MUTATION_RE.test(prop) &&
          result &&
          typeof (result as Promise<unknown>).then === 'function'
        ) {
          ;(result as Promise<unknown>).then(
            () => {
              try {
                invalidateDomain(domain)
              } catch (e) {
                logEvent({
                  level: 'warn',
                  source: 'app',
                  event: 'cache_invalidate_failed',
                  message: `Gagal invalidasi cache domain "${domain}": ${(e as Error)?.message || String(e)}`,
                })
              }
            },
            () => {
              /* error ditangani pemanggil; jangan buang cache */
            },
          )
        }

        return result
      }
    },
  })
}

export const productsServiceAdapter = withInvalidation(productsService, 'products')
export const categoriesServiceAdapter = withInvalidation(categoriesService, 'categories')
export const storeSettingsServiceAdapter = withInvalidation(storeSettingsService, 'storeSettings')
export const customersServiceAdapter = withInvalidation(customersService, 'customers')
export const notificationsServiceAdapter = withInvalidation(notificationsService, 'notifications')
export const transactionsServiceAdapter = withInvalidation(transactionsService, 'transactions')
export const returnsServiceAdapter = withInvalidation(returnsService, 'returns')
export const stockServiceAdapter = withInvalidation(stockService, 'stock')
export const salesReportServiceAdapter = withInvalidation(salesReportService, 'salesReport')
export const salesReportEnhancedServiceAdapter = withInvalidation(salesReportEnhancedService, 'salesReportEnhanced')
export const financeServiceAdapter = withInvalidation(financeService, 'finance')
export const purchasingServiceAdapter = withInvalidation(purchasingService, 'purchasing')
export const hrServiceAdapter = withInvalidation(hrService, 'hr')
export const shippingServiceAdapter = withInvalidation(shippingService, 'shipping')
export const priceMatrixServiceAdapter = withInvalidation(priceMatrixService, 'priceMatrix')
export const itemPaymentServiceAdapter = withInvalidation(itemPaymentService, 'itemPayment')
export const dailyCashServiceAdapter = withInvalidation(dailyCashService, 'dailyCash')
export const dailyBankServiceAdapter = withInvalidation(dailyBankService, 'dailyBank')
export const agingReceivablesServiceAdapter = withInvalidation(agingReceivablesService, 'agingReceivables')
export type { StockMovement, StockAdjustment, StockOpname, StockAlert }
