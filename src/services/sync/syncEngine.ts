import { supabase } from '@/lib/supabase'
import {
  initSQLite,
  run,
  query,
  setMetadata,
  getMetadata,
  getSyncQueue,
  addToSyncQueue,
  removeFromSyncQueue,
  markSyncQueueFailed,
  disableForeignKeys,
  enableForeignKeys,
} from '@/lib/sqlite'
import { getCurrentUserId } from '@/services/sqlite/db'
import { isOnlineNow } from '@/lib/network'
import { isNativeApp } from '@/lib/platform'
import { logEvent, logError } from '@/lib/eventLog'
import { sqliteCategoriesService } from '@/services/sqlite/categories'
import { sqliteProductsService } from '@/services/sqlite/products'
import { sqliteCustomersService } from '@/services/sqlite/customers'
import { sqliteTransactionsService } from '@/services/sqlite/transactions'
import { sqliteReturnsService } from '@/services/sqlite/returns'
import { sqliteStockService } from '@/services/sqlite/stock'
import { sqliteNotificationsService } from '@/services/sqlite/notifications'
import { sqliteStoreSettingsService } from '@/services/sqlite/storeSettings'
import { sqliteFinanceService } from '@/services/sqlite/finance'
import { sqlitePurchasingService } from '@/services/sqlite/purchasing'
import { sqliteHrService } from '@/services/sqlite/hr'
import { sqliteShippingService } from '@/services/sqlite/shipping'
import { sqlitePriceMatrixService } from '@/services/sqlite/priceMatrix'
import type { SyncQueueItem } from '@/lib/sqlite'

// ============================================================
// Sync Engine — Offline-first backup ke Supabase
//
// 2 alur:
//   downloadAllFromSupabase()  — saat login: truncate SQLite, isi dari Supabase
//   uploadChangesToSupabase()  — saat buka app + tombol manual: proses sync_queue
//   uploadAllToSupabase()      — backup full (opsional)
//
// 1 device + last-write-wins → tidak perlu conflict resolution.
// ============================================================

const DOWNLOAD_TABLES = [
  'categories',
  'products',
  'customers',
  'transactions',
  'transaction_items',
  'transaction_payments',
  'returns',
  'return_items',
  'store_settings',
  'stock_movements',
  'stock_adjustments',
  'stock_opnames',
  'stock_opname_items',
  'stock_alerts',
  'notifications',
  'chart_of_accounts',
  'journal_entries',
  'journal_lines',
  'suppliers',
  'purchase_orders',
  'po_items',
  'goods_receipts',
  'grn_items',
  'purchase_invoices',
  'pi_items',
  'pi_payments',
  'purchase_returns',
  'purchase_return_items',
  'employees',
  'attendance',
  'payrolls',
  'employee_loans',
  'employee_loan_payments',
  'vehicles',
  'delivery_orders',
  'delivery_items',
  'delivery_tracking',
  'delivery_order_transactions',
  'delivery_loaders',
  'delivery_load_items',
  'price_tiers',
  'customer_groups',
  'customer_group_members',
  'customer_price_matrix',
] as const

export interface SyncResult {
  success: boolean
  downloaded?: number
  uploaded?: number
  failed?: number
  dropped?: number
  message?: string
}

// ============================================================
// DOWNLOAD: Supabase → SQLite (saat login / manual refresh)
// ============================================================

/** Ambil semua data user dari Supabase dan isi ke SQLite (truncate dulu). */
export async function downloadAllFromSupabase(): Promise<SyncResult> {
  // Di web tidak ada SQLite — data dibaca langsung dari Supabase.
  if (!isNativeApp()) {
    throw new Error('Mode web tidak memerlukan sinkronisasi offline')
  }

  // Pastikan SQLite siap (buat tabel skema jika belum ada) sebelum operasi apa pun.
  // Tidak bergantung pada timing initSQLite di main.ts.
  await initSQLite()

  if (!isOnlineNow()) {
    throw new Error('Tidak ada koneksi internet')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Tidak ada user yang login')

  // --- Guard (Isu #2): jangan timpa data lokal jika masih ada perubahan yang
  // belum ter-upload. Download di bawah men-truncate semua tabel + clearSyncQueue;
  // bila masih ada item di sync_queue, baris tersebut BELUM ada di server dan
  // akan hilang permanen saat truncate. Pemanggil (login/full-sync) wajib upload
  // dulu sehingga queue kosong sebelum sampai di sini.
  try {
    const pending = await getSyncQueue()
    if (pending.length > 0) {
      throw new Error(
        `${pending.length} perubahan lokal belum tersinkron. Sinkronkan terlebih dahulu sebelum mengunduh data.`
      )
    }
  } catch (e: any) {
    const msg = String(e?.message || '')
    // Sengaja tolak download → propagasikan apa adanya.
    if (/belum tersinkron/.test(msg)) throw e
    // Gagal baca queue (mis. tabel belum ada) → jangan blokir login.
    // Perubahan diasumsikan sudah dikirim lebih dulu oleh pemanggil.
    logError('sync', 'queue_guard_check_failed', e, 'Gagal cek sync_queue sebelum download')
  }

  try {
    // --- 1. Download semua tabel dari Supabase (berurutan sesuai dependensi) ---
    const [categories, products, customers, transactions, transactionItems, transactionPayments,
           returns, returnItems, storeSettings, stockMovements, stockAdjustments,
           stockOpnames, stockOpnameItems, stockAlerts, notifications,
           chartOfAccounts, journalEntries, journalLines,
           suppliers, purchaseOrders, poItems, goodsReceipts, grnItems,
           purchaseInvoices, piItems, piPayments, purchaseReturns, purchaseReturnItems,
           employees, attendance, payrolls,
           employeeLoans, employeeLoanPayments,
           vehicles, deliveryOrders, deliveryItems, deliveryTracking,
           doTransactions, deliveryLoaders, deliveryLoadItems,
           customerGroups, groupMembers, priceTiers, customerPrices] = await Promise.all([
      fetchAllFromTable('categories'),
      fetchAllFromTable('products'),
      fetchAllFromTable('customers'),
      fetchAllFromTable('transactions'),
      fetchAllFromTable('transaction_items'),
      fetchAllFromTable('transaction_payments'),
      fetchAllFromTable('returns'),
      fetchAllFromTable('return_items'),
      fetchAllFromTable('store_settings'),
      fetchAllFromTable('stock_movements'),
      fetchAllFromTable('stock_adjustments'),
      fetchAllFromTable('stock_opnames'),
      fetchAllFromTable('stock_opname_items'),
      fetchAllFromTable('stock_alerts'),
      fetchAllFromTable('notifications'),
      fetchAllFromTable('chart_of_accounts'),
      fetchAllFromTable('journal_entries'),
      fetchAllFromTable('journal_lines'),
      fetchAllFromTable('suppliers'),
      fetchAllFromTable('purchase_orders'),
      fetchAllFromTable('po_items'),
      fetchAllFromTable('goods_receipts'),
      fetchAllFromTable('grn_items'),
      fetchAllFromTable('purchase_invoices'),
      fetchAllFromTable('pi_items'),
      fetchAllFromTable('pi_payments'),
      fetchAllFromTable('purchase_returns'),
      fetchAllFromTable('purchase_return_items'),
      fetchAllFromTable('employees'),
      fetchAllFromTable('attendance'),
      fetchAllFromTable('payrolls'),
      fetchAllFromTable('employee_loans'),
      fetchAllFromTable('employee_loan_payments'),
      fetchAllFromTable('vehicles'),
      fetchAllFromTable('delivery_orders'),
      fetchAllFromTable('delivery_items'),
      fetchAllFromTable('delivery_tracking'),
      fetchAllFromTable('delivery_order_transactions'),
      fetchAllFromTable('delivery_loaders'),
      fetchAllFromTable('delivery_load_items'),
      fetchAllFromTable('customer_groups'),
      fetchAllFromTable('customer_group_members'),
      fetchAllFromTable('price_tiers'),
      fetchAllFromTable('customer_price_matrix'),
    ])

    // --- 3. Tulis ke SQLite (truncate + insert fresh, dalam urutan dependensi FK) ---
    // Matikan FK sementara: urutan DELETE (anak dulu) dan INSERT (induk dulu)
    // tidak bisa dipenuhi dalam satu urutan. Diaktifkan lagi di finally.
    await disableForeignKeys()
    try {
      await sqliteCategoriesService.replaceAll(categories)
      await sqliteProductsService.replaceAll(products)
      await sqliteCustomersService.replaceAll(customers)

      // transactions: gabungkan items + payments agar replaceAll menulis semuanya
      const txnMap = new Map<string, any>()
      for (const t of transactions) {
        txnMap.set(t.id, { ...t, items: [], payments: [] })
      }
      for (const it of transactionItems) {
        const t = txnMap.get(it.transaction_id)
        if (t) t.items.push(it)
      }
      for (const p of transactionPayments) {
        const t = txnMap.get(p.transaction_id)
        if (t) t.payments.push(p)
      }
      await sqliteTransactionsService.replaceAll([...txnMap.values()])

      // returns: gabungkan items
      const retMap = new Map<string, any>()
      for (const r of returns) {
        retMap.set(r.id, { ...r, items: [] })
      }
      for (const ri of returnItems) {
        const r = retMap.get(ri.return_id)
        if (r) r.items.push(ri)
      }
      await sqliteReturnsService.replaceAll([...retMap.values()])

      // stock opnames: gabungkan items
      const opMap = new Map<string, any>()
      for (const o of stockOpnames) {
        opMap.set(o.id, { ...o, items: [] })
      }
      for (const oi of stockOpnameItems) {
        const o = opMap.get(oi.opname_id)
        if (o) o.items.push(oi)
      }
      await sqliteStockService.replaceAllOpnames([...opMap.values()])

      await sqliteStockService.replaceAllMovements(stockMovements)
      await sqliteStockService.replaceAllAdjustments(stockAdjustments)
      await sqliteStockService.replaceAllAlerts(stockAlerts)
      await sqliteNotificationsService.replaceAll(notifications)
      await sqliteStoreSettingsService.replaceAll(storeSettings)

      // finance: COA + jurnal (gabungkan lines ke entries)
      await sqliteFinanceService.replaceAllAccounts(chartOfAccounts)
      const jrnMap = new Map<string, any>()
      for (const j of journalEntries) {
        jrnMap.set(j.id, { ...j, lines: [] })
      }
      for (const l of journalLines) {
        const j = jrnMap.get(l.journal_id)
        if (j) j.lines.push(l)
      }
      await sqliteFinanceService.replaceAllJournals([...jrnMap.values()])

      // purchasing: suppliers + PO (gabungkan items) + GRN (gabungkan items) + PI (gabungkan items+payments) + PR (gabungkan items)
      await sqlitePurchasingService.replaceAllSuppliers(suppliers)

      const poMap = new Map<string, any>()
      for (const p of purchaseOrders) poMap.set(p.id, { ...p, items: [] })
      for (const it of poItems) {
        const po = poMap.get(it.po_id)
        if (po) po.items.push(it)
      }
      await sqlitePurchasingService.replaceAllPurchaseOrders([...poMap.values()])

      const grnMap = new Map<string, any>()
      for (const g of goodsReceipts) grnMap.set(g.id, { ...g, items: [] })
      for (const it of grnItems) {
        const grn = grnMap.get(it.grn_id)
        if (grn) grn.items.push(it)
      }
      await sqlitePurchasingService.replaceAllGoodsReceipts([...grnMap.values()])

      const piMap = new Map<string, any>()
      for (const p of purchaseInvoices) piMap.set(p.id, { ...p, items: [], payments: [] })
      for (const it of piItems) {
        const pi = piMap.get(it.pi_id)
        if (pi) pi.items.push(it)
      }
      for (const p of piPayments) {
        const pi = piMap.get(p.pi_id)
        if (pi) pi.payments.push(p)
      }
      await sqlitePurchasingService.replaceAllPurchaseInvoices([...piMap.values()])

      const prMap = new Map<string, any>()
      for (const r of purchaseReturns) prMap.set(r.id, { ...r, items: [] })
      for (const it of purchaseReturnItems) {
        const pr = prMap.get(it.pr_id)
        if (pr) pr.items.push(it)
      }
      await sqlitePurchasingService.replaceAllPurchaseReturns([...prMap.values()])

      // HR: employees, attendance, payrolls (slip per karyawan), kasbon
      await sqliteHrService.replaceAllEmployees(employees)
      await sqliteHrService.replaceAllAttendance(attendance)
      await sqliteHrService.replaceAllPayrolls(payrolls)

      const loanMap = new Map<string, any>()
      for (const loan of employeeLoans) loanMap.set(loan.id, { ...loan, payments: [] })
      for (const payment of employeeLoanPayments) {
        const loan = loanMap.get(payment.loan_id)
        if (loan) loan.payments.push(payment)
      }
      await sqliteHrService.replaceAllEmployeeLoans([...loanMap.values()])

      // shipping: vehicles + delivery orders (gabungkan items + tracking)
      await sqliteShippingService.replaceAllVehicles(vehicles)

      const doMap = new Map<string, any>()
      for (const d of deliveryOrders) doMap.set(d.id, { ...d, items: [], tracking: [] })
      for (const it of deliveryItems) {
        const d = doMap.get(it.delivery_order_id)
        if (d) d.items.push(it)
      }
      for (const tr of deliveryTracking) {
        const d = doMap.get(tr.delivery_order_id)
        if (d) d.tracking.push(tr)
      }
      await sqliteShippingService.replaceAllDeliveryOrders([...doMap.values()])

      // anak DO: transaksi, tim muat, barang dimuat
      await sqliteShippingService.replaceAllDeliveryOrderTransactions(doTransactions)
      await sqliteShippingService.replaceAllDeliveryLoaders(deliveryLoaders)
      await sqliteShippingService.replaceAllDeliveryLoadItems(deliveryLoadItems)

      // price matrix: grup → anggota → tier → harga khusus (FK children kemudian)
      await sqlitePriceMatrixService.replaceAllGroups(customerGroups)
      await sqlitePriceMatrixService.replaceAllGroupMembers(groupMembers)
      await sqlitePriceMatrixService.replaceAllPriceTiers(priceTiers)
      await sqlitePriceMatrixService.replaceAllCustomerPrices(customerPrices)
    } finally {
      await enableForeignKeys()
    }

    // --- 4. Bersihkan sync_queue HANYA setelah semua write berhasil ---
    // Semua item queue mewakili perubahan lokal yang sudah ada di Supabase
    // (sudah didownload ke snapshot di atas). Jika salah satu replaceAll gagal,
    // queue tetap utuh agar perubahan lokal tidak hilang.
    await clearSyncQueue()

    // --- 5. Simpan metadata ---
    await setMetadata('last_download_at', new Date().toISOString())
    await setMetadata('downloaded_user_id', user.id)

    logEvent({ level: 'info', source: 'sync', event: 'download_ok', message: `Download dari Supabase selesai (${transactions.length} transaksi)` })

    return {
      success: true,
      downloaded: categories.length + products.length + customers.length + transactions.length,
    }
  } catch (e: any) {
    logError('sync', 'download_failed', e, 'Gagal mengunduh data dari Supabase')
    return { success: false, message: e.message || 'Gagal mengunduh data' }
  }
}

/** Fetch semua row dari satu tabel Supabase (tanpa relasi). */
async function fetchAllFromTable(table: string): Promise<any[]> {
  const limit = 1000
  let all: any[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, from + limit - 1)
      .order('created_at')

    if (error) throw error
    if (!data || data.length === 0) break

    all = all.concat(data)
    if (data.length < limit) break
    from += limit
  }

  return all
}

/** Hapus semua isi sync_queue (dipakai setelah download penuh). */
async function clearSyncQueue(): Promise<void> {
  await run('DELETE FROM sync_queue')
}

// ============================================================
// UPLOAD: SQLite → Supabase (proses sync_queue)
// ============================================================

/**
 * Proses semua item di sync_queue ke Supabase.
 * Setiap item: INSERT/UPDATE/DELETE sesuai operation.
 * Sukses → hapus dari queue. Gagal → retry_count++ + last_error.
 */
export async function uploadChangesToSupabase(): Promise<SyncResult> {
  // Pastikan SQLite siap (buat tabel skema jika belum ada).
  await initSQLite()

  if (!isOnlineNow()) {
    return { success: false, message: 'Tidak ada koneksi internet' }
  }

  const queue = await getSyncQueue()
  if (queue.length === 0) {
    return { success: true, uploaded: 0 }
  }

  let uploaded = 0
  let failed = 0
  let dropped = 0
  let firstError: string | null = null

  // Ronde tambahan: item yang di-defer (FK) dicoba ulang setelah induknya
  // naik, dan item baru yang di-enqueue selama ronde (recovery payload,
  // anak embedded, induk hasil heal FK) ikut diproses pada sync yang sama.
  let pending = queue
  let maxSeenId = queue.reduce((m, i) => Math.max(m, i.id), 0)
  let round = 0
  const MAX_DEFER_ROUNDS = 3

  while (pending.length > 0 && round <= MAX_DEFER_ROUNDS) {
    const deferredNextRound: SyncQueueItem[] = []
    for (const item of pending) {
      try {
        await processQueueItem(item)
        await removeFromSyncQueue(item.id)
        uploaded++
        await markLocalRowSynced(item.table_name, item.record_id)
        // Self-heal: parent naik — queue anak yang menumpang di payload
        // (mis. jurnal lama yang menyimpan `lines`, dsb.) agar ikut ke Supabase.
        try {
          await queueEmbeddedChildren(item, JSON.parse(item.payload))
        } catch {
          /* payload rusak sudah ditangani di processQueueItem */
        }
      } catch (e: any) {
        const handled = await handleQueueFailure(item, e, deferredNextRound)
        if (handled === 'deferred' || handled === 'dropped') {
          if (handled === 'dropped') dropped++
          continue
        }
        failed++
        if (!firstError) firstError = e?.message
        await markSyncQueueFailed(item.id, e?.message || 'Gagal upload')
        logError('sync', 'queue_item_failed', e, `${item.operation} ${item.table_name} (${item.record_id})`)
      }
    }
    // Ambil item yang baru masuk queue selama ronde ini (di luar snapshot awal).
    let fresh: SyncQueueItem[] = []
    try {
      fresh = (await getSyncQueue()).filter((i) => i.id > maxSeenId)
    } catch {
      fresh = []
    }
    if (fresh.length > 0) {
      maxSeenId = fresh.reduce((m, i) => Math.max(m, i.id), maxSeenId)
    }
    const next = [...fresh, ...deferredNextRound]
    if (next.length === 0) break
    pending = next
    round++
  }
  // Item defer yang masih tersisa tetap di queue DB (retry_count sudah naik)
  // → dicoba lagi sync berikutnya sampai batas MAX_FK_DEFER_ATTEMPTS.

  if (uploaded > 0) {
    await setMetadata('last_sync_at', new Date().toISOString())
  }

  if (uploaded > 0 || failed > 0 || dropped > 0) {
    logEvent({
      level: failed > 0 || dropped > 0 ? 'warn' : 'info',
      source: 'sync',
      event: 'upload_done',
      message: `Upload queue selesai: ${uploaded} sukses, ${failed} gagal, ${dropped} dibuang`,
    })
  }

  return {
    success: failed === 0,
    uploaded,
    failed,
    dropped,
    message: firstError || undefined,
  }
}

// ============================================================
// Penanganan kegagalan item queue (self-healing)
//
// Tiga kelas error dari Supabase (PostgREST/PG):
//   1. NOT NULL (23502) — payload tidak lengkap (bug versi lama, mis.
//      journal_entries tanpa description). Payload-{id} seperti ini akan
//      gagal selamanya → "poison item". Aksi: coba recovery dengan menarik
//      baris terbaru dari SQLite; kalau masih tidak bisa → drop dari queue
//      + tandai sync_status baris lokal 'failed' + catat ke event log.
//   2. FOREIGN KEY (23503) — baris induk belum sampai ke server (mis.
//      grn_items sebelum po_items ada). Aksi: defer — pindah ke ekor queue,
//      beri kesempatan item induk naik dulu di ronde ini.
//   3. Lainnya (network, auth, dll) — biarkan retry_count++ seperti biasa.
// ============================================================

/** Relasi FK tabel anak → induk (satu anak bisa punya >1 FK induk). */
const CHILD_FK_RELS: Record<string, Array<{ col: string; parent: string }>> = {
  journal_lines: [{ col: 'journal_id', parent: 'journal_entries' }],
  transaction_items: [{ col: 'transaction_id', parent: 'transactions' }],
  transaction_payments: [{ col: 'transaction_id', parent: 'transactions' }],
  return_items: [{ col: 'return_id', parent: 'returns' }],
  stock_opname_items: [{ col: 'opname_id', parent: 'stock_opnames' }],
  grn_items: [
    { col: 'grn_id', parent: 'goods_receipts' },
    { col: 'po_item_id', parent: 'po_items' },
  ],
  pi_items: [
    { col: 'pi_id', parent: 'purchase_invoices' },
    { col: 'grn_item_id', parent: 'grn_items' },
  ],
  pi_payments: [{ col: 'pi_id', parent: 'purchase_invoices' }],
  purchase_return_items: [{ col: 'pr_id', parent: 'purchase_returns' }],
  employee_loan_payments: [
    { col: 'loan_id', parent: 'employee_loans' },
    { col: 'payroll_id', parent: 'payrolls' },
  ],
  delivery_items: [{ col: 'delivery_order_id', parent: 'delivery_orders' }],
  delivery_tracking: [{ col: 'delivery_order_id', parent: 'delivery_orders' }],
  delivery_order_transactions: [{ col: 'delivery_order_id', parent: 'delivery_orders' }],
  delivery_load_items: [{ col: 'delivery_order_id', parent: 'delivery_orders' }],
  customer_group_members: [
    { col: 'group_id', parent: 'customer_groups' },
    { col: 'customer_id', parent: 'customers' },
  ],
}

function classifyQueueError(e: any): 'notnull' | 'foreignkey' | 'unknown' | 'other' {
  const code = String(e?.code || '')
  const msg = String(e?.message || '')
  if (code === '23502' || /null value in column/i.test(msg)) return 'notnull'
  if (code === '23503' || /foreign key/i.test(msg)) return 'foreignkey'
  // Payload tidak bisa di-parse / tabel tak dikenal → mustahil pernah sukses.
  if (e instanceof SyntaxError || /Tabel tidak dikenal|Unexpected (token|end)|JSON/i.test(msg)) return 'unknown'
  return 'other'
}

/** Nama kolom yang jadi penyebab error not-null (dari pesan PostgREST). */
function notNullColumn(e: any): string | null {
  const m = /null value in column "([^"]+)"/i.exec(String(e?.message || ''))
  return m ? m[1] : null
}

/** Berhasil naik ke server → sinkronkan status baris lokal. */
async function markLocalRowSynced(table: string, recordId: string): Promise<void> {
  try {
    await run(
      `UPDATE "${table}" SET sync_status = 'synced' WHERE id = ?`,
      [recordId]
    )
  } catch {
    /* tabel mungkin tidak ada di skema lokal — abaikan */
  }
}

/**
 * Recovery payload not-null: tarik baris terbaru dari SQLite sebagai INSERT
 * penuh (upsert by id di server → aman menimpa baris setengah jadi).
 */
async function recoverQueueItemPayload(item: SyncQueueItem): Promise<boolean> {
  const { table_name, record_id } = item
  if (!/^[\w-]+$/.test(record_id)) return false
  if (!/^[\w-]+$/.test(table_name)) return false
  try {
    const rows = await query<Record<string, any>>(
      `SELECT * FROM "${table_name}" WHERE id = ?`,
      [record_id]
    )
    if (rows.length === 0) return false
    await addToSyncQueue('INSERT', table_name, record_id, rows[0])
    return true
  } catch {
    return false
  }
}

/** Drop item permanen dari queue + tandai baris lokal + catat event. */
async function dropQueueItem(item: SyncQueueItem, reason: string): Promise<void> {
  try {
    await removeFromSyncQueue(item.id)
  } catch {
    /* sudah hilang */
  }
  try {
    if (/^[\w-]+$/.test(item.table_name)) {
      await run(
        `UPDATE "${item.table_name}" SET sync_status = 'failed' WHERE id = ?`,
        [item.record_id]
      )
    }
  } catch {
    /* baris lokal mungkin sudah terhapus */
  }
  logEvent({
    level: 'warn',
    source: 'sync',
    event: 'queue_item_dropped',
    message: `Item queue dibuang (${item.operation} ${item.table_name} ${item.record_id}): ${reason}`,
  })
}

/**
 * Handler kegagalan satu item. Return:
 *   'deferred' → sudah dipindah ke deferredNextRound (coba lagi ronde berikutnya)
 *   'dropped'  → sudah dibuang permanen
 *   'retry'    → biarkan jalur kegagalan biasa (retry_count++)
 */
async function handleQueueFailure(
  item: SyncQueueItem,
  e: any,
  deferredNextRound: SyncQueueItem[]
): Promise<'deferred' | 'dropped' | 'retry'> {
  const kind = classifyQueueError(e)

  if (kind === 'unknown') {
    // Tabel tidak dikenal oleh engine → mustahil pernah sukses.
    await dropQueueItem(item, e?.message || 'tabel tidak dikenal')
    return 'dropped'
  }

  if (kind === 'notnull') {
    // Payload cacat (warisan versi lama). Kalau operasi DELETE, tidak ada
    // kolom wajib → kemungkinan besar baris lokal sudah hilang; drop saja.
    if (item.operation === 'DELETE') {
      await dropQueueItem(item, e?.message || 'not-null')
      return 'dropped'
    }
    const recovered = await recoverQueueItemPayload(item)
    await removeFromSyncQueue(item.id)
    if (recovered) {
      logEvent({
        level: 'info',
        source: 'sync',
        event: 'queue_item_recovered',
        message: `Payload ${item.table_name} ${item.record_id} dipulihkan dari data lokal (upload ulang di sync berikutnya)`,
      })
    } else {
      await dropQueueItem(item, `${e?.message || 'not-null'} — data lokal tidak ditemukan`)
      return 'dropped'
    }
    return 'dropped'
  }

  if (kind === 'foreignkey') {
    // Induk belum ada di server (data warisan sebelum tabel induk di-queue).
    // Batasi percobaan lintas-sync (retry_count) agar tidak defer selamanya.
    const attempts = (item.retry_count || 0) + 1
    if (attempts > MAX_FK_DEFER_ATTEMPTS) {
      await dropQueueItem(item, `foreign key: ${e?.message || ''}`.trim())
      return 'dropped'
    }
    const healed = await healForeignKey(item, attempts)
    if (healed === 'dropped') return 'dropped'
    if (healed === 'requeued') {
      // Item versi utuh sudah di-queue ulang di ekor DB (retry_count ikut
      // dipindahkan) → akan tertangkap oleh "fresh fetch" ronde berikutnya.
      return 'deferred'
    }
    // Recovery tidak mungkin (baris/tabel lokal tak ada) — fallback lama:
    // naikkan retry_count di DB + coba lagi di memori ronde ini.
    await markSyncQueueFailed(item.id, e?.message || 'foreign key')
    deferredNextRound.push({ ...item, retry_count: attempts })
    return 'deferred'
  }

  return 'retry'
}

const MAX_FK_DEFER_ATTEMPTS = 8

/**
 * Saat FK gagal: pastikan rantai induk ikut di-queue (INSERT dari data lokal,
 * idempoten) sehingga ronde berikutnya menemukan induk yang sudah naik.
 * Item anak itu sendiri TIDAK di-queue ulang — ia tetap di queue (dipindah
 * ke ekor oleh defer) agar tidak terjadi amplifikasi item.
 */
async function healForeignKey(
  item: SyncQueueItem,
  attempts: number
): Promise<'requeued' | 'dropped' | 'none'> {
  const rels = CHILD_FK_RELS[item.table_name]
  if (!rels || !/^[\w-]+$/.test(item.table_name)) return 'none'
  try {
    const rows = await query<Record<string, any>>(
      `SELECT * FROM "${item.table_name}" WHERE id = ?`,
      [item.record_id]
    )
    if (rows.length === 0) {
      // Baris lokal sudah hilang → operasi ini tidak akan pernah sukses.
      if (item.operation === 'DELETE') await dropQueueItem(item, 'baris lokal tidak ada lagi')
      return item.operation === 'DELETE' ? 'dropped' : 'none'
    }
    const child = rows[0]
    for (const rel of rels) {
      const parentId = child[rel.col]
      if (!parentId) continue
      await ensureParentQueued(rel.parent, String(parentId))
    }
    // Hapus versi lama (payload cacat) dari queue lalu sisipkan ulang dengan
    // payload utuh di ekor — SETELAH item induk di-queue, agar urutan INSERT
    // benar saat fresh-fetch ronde berikutnya. retry_count ikut dipindahkan
    // supaya batas MAX_FK_DEFER_ATTEMPTS lintas-sync tetap terhitung.
    await removeFromSyncQueue(item.id)
    await addToSyncQueue('INSERT', item.table_name, item.record_id, child)
    const maxRows = await query<{ mid: number | null }>(
      `SELECT MAX(id) AS mid FROM sync_queue WHERE table_name = ? AND record_id = ?`,
      [item.table_name, item.record_id]
    )
    const newId = maxRows[0]?.mid
    if (newId != null) {
      await run(`UPDATE sync_queue SET retry_count = ? WHERE id = ?`, [attempts, newId])
    }
    if (attempts > MAX_FK_DEFER_ATTEMPTS / 2) {
      logEvent({
        level: 'warn',
        source: 'sync',
        event: 'fk_defer',
        message: `Menunggu induk untuk ${item.table_name} ${item.record_id} (percobaan ${attempts}/${MAX_FK_DEFER_ATTEMPTS})`,
      })
    }
    return 'requeued'
  } catch {
    /* tabel lokal tidak ada — biarkan retry biasa */
    return 'none'
  }
}

/** Queue INSERT induk dari SQLite bila ada di lokal (idempotent). */
async function ensureParentQueued(parentTable: string, parentId: string): Promise<void> {
  if (!/^[\w-]+$/.test(parentTable)) return
  try {
    const rows = await query<Record<string, any>>(
      `SELECT * FROM "${parentTable}" WHERE id = ?`,
      [parentId]
    )
    if (rows.length > 0) {
      await addToSyncQueue('INSERT', parentTable, parentId, rows[0])
    }
  } catch {
    /* induk tidak ada di lokal — anak akan di-drop setelah batas percobaan */
  }
}

/**
 * Self-heal pasca-sukses: payload parent kadang menyimpan array anak
 * (`lines` jurnal, `items` PO/GRN/opname/transaksi/retur) yang dibuang
 * sanitizeForSupabase. Queue anak-anak itu sekarang agar benar-benar naik.
 */
async function queueEmbeddedChildren(item: SyncQueueItem, data: any): Promise<void> {
  if (!data || typeof data !== 'object' || item.operation === 'DELETE') return
  const childTables = CHILD_EMBEDDED_KEYS[item.table_name]
  if (!childTables) return
  for (const { key, table, parentCol } of childTables) {
    const arr = data[key]
    if (!Array.isArray(arr)) continue
    for (const row of arr) {
      if (!row || typeof row !== 'object') continue
      if (!row.id || typeof row.id !== 'string') continue
      try {
        // Lengkapi FK induk bila baris anak hasil JOIN tidak membawanya.
        const child = { ...row }
        if (!(parentCol in child) && data.id) child[parentCol] = data.id
        await addToSyncQueue('INSERT', table, String(row.id), child)
      } catch {
        /* satu anak gagal jangan hentikan sisanya */
      }
    }
  }
}

/** Petakan key array di payload parent → tabel anak + kolom induknya. */
const CHILD_EMBEDDED_KEYS: Record<string, Array<{ key: string; table: string; parentCol: string }>> = {
  journal_entries: [{ key: 'lines', table: 'journal_lines', parentCol: 'journal_id' }],
  purchase_orders: [{ key: 'items', table: 'po_items', parentCol: 'po_id' }],
  goods_receipts: [{ key: 'items', table: 'grn_items', parentCol: 'grn_id' }],
  purchase_invoices: [
    { key: 'items', table: 'pi_items', parentCol: 'pi_id' },
    { key: 'payments', table: 'pi_payments', parentCol: 'pi_id' },
  ],
  purchase_returns: [{ key: 'items', table: 'purchase_return_items', parentCol: 'pr_id' }],
  transactions: [
    { key: 'items', table: 'transaction_items', parentCol: 'transaction_id' },
    { key: 'payments', table: 'transaction_payments', parentCol: 'transaction_id' },
  ],
  returns: [{ key: 'items', table: 'return_items', parentCol: 'return_id' }],
  stock_opnames: [{ key: 'items', table: 'stock_opname_items', parentCol: 'opname_id' }],
  delivery_orders: [{ key: 'items', table: 'delivery_items', parentCol: 'delivery_order_id' }],
}

/**
 * Proses satu item queue: jalankan operasi ke Supabase.
 */
async function processQueueItem(item: SyncQueueItem): Promise<void> {
  const { table_name, operation, record_id, payload } = item
  const data = JSON.parse(payload)

  // Non-relational / simpel: pakai generic upsert/delete
  switch (table_name) {
    case 'categories':
      await genericUpsert('categories', operation, record_id, data)
      break
    case 'products':
      await genericUpsert('products', operation, record_id, data)
      break
    case 'customers':
      await genericUpsert('customers', operation, record_id, data)
      break
    case 'transactions':
      await genericUpsert('transactions', operation, record_id, data)
      break
    case 'transaction_items':
      await genericUpsert('transaction_items', operation, record_id, data)
      break
    case 'transaction_payments':
      await genericUpsert('transaction_payments', operation, record_id, data)
      break
    case 'returns':
      await genericUpsert('returns', operation, record_id, data)
      break
    case 'return_items':
      await genericUpsert('return_items', operation, record_id, data)
      break
    case 'store_settings':
      await genericUpsert('store_settings', operation, record_id, data)
      break
    case 'stock_movements':
      await genericUpsert('stock_movements', operation, record_id, data)
      break
    case 'stock_adjustments':
      await genericUpsert('stock_adjustments', operation, record_id, data)
      break
    case 'stock_opnames':
      await genericUpsert('stock_opnames', operation, record_id, data)
      break
    case 'stock_opname_items':
      await genericUpsert('stock_opname_items', operation, record_id, data)
      break
    case 'stock_alerts':
      await genericUpsert('stock_alerts', operation, record_id, data)
      break
    case 'notifications':
      await genericUpsert('notifications', operation, record_id, data)
      break
    case 'chart_of_accounts':
      await genericUpsert('chart_of_accounts', operation, record_id, data)
      break
    case 'journal_entries':
      await genericUpsert('journal_entries', operation, record_id, data)
      break
    case 'journal_lines':
      await genericUpsert('journal_lines', operation, record_id, data)
      break
    case 'suppliers':
      await genericUpsert('suppliers', operation, record_id, data)
      break
    case 'purchase_orders':
      await genericUpsert('purchase_orders', operation, record_id, data)
      break
    case 'po_items':
      await genericUpsert('po_items', operation, record_id, data)
      break
    case 'goods_receipts':
      await genericUpsert('goods_receipts', operation, record_id, data)
      break
    case 'grn_items':
      await genericUpsert('grn_items', operation, record_id, data)
      break
    case 'purchase_invoices':
      await genericUpsert('purchase_invoices', operation, record_id, data)
      break
    case 'pi_items':
      await genericUpsert('pi_items', operation, record_id, data)
      break
    case 'pi_payments':
      await genericUpsert('pi_payments', operation, record_id, data)
      break
    case 'purchase_returns':
      await genericUpsert('purchase_returns', operation, record_id, data)
      break
    case 'purchase_return_items':
      await genericUpsert('purchase_return_items', operation, record_id, data)
      break
    case 'employees':
      await genericUpsert('employees', operation, record_id, data)
      break
    case 'attendance':
      await genericUpsert('attendance', operation, record_id, data)
      break
    case 'payrolls':
      await genericUpsert('payrolls', operation, record_id, data)
      break
    case 'employee_loans':
      await genericUpsert('employee_loans', operation, record_id, data)
      break
    case 'employee_loan_payments':
      await genericUpsert('employee_loan_payments', operation, record_id, data)
      break
    case 'vehicles':
      await genericUpsert('vehicles', operation, record_id, data)
      break
    case 'delivery_orders':
      await genericUpsert('delivery_orders', operation, record_id, data)
      break
    case 'delivery_items':
      await genericUpsert('delivery_items', operation, record_id, data)
      break
    case 'delivery_tracking':
      await genericUpsert('delivery_tracking', operation, record_id, data)
      break
    case 'delivery_order_transactions':
      await genericUpsert('delivery_order_transactions', operation, record_id, data)
      break
    case 'delivery_loaders':
      await genericUpsert('delivery_loaders', operation, record_id, data)
      break
    case 'delivery_load_items':
      await genericUpsert('delivery_load_items', operation, record_id, data)
      break
    case 'customer_groups':
      await genericUpsert('customer_groups', operation, record_id, data)
      break
    case 'customer_group_members':
      await genericUpsert('customer_group_members', operation, record_id, data)
      break
    case 'price_tiers':
      await genericUpsert('price_tiers', operation, record_id, data)
      break
    case 'customer_price_matrix':
      await genericUpsert('customer_price_matrix', operation, record_id, data)
      break
    default:
      throw new Error(`Tabel tidak dikenal: ${table_name}`)
  }
}

/**
 * Generic upsert ke Supabase.
 * - INSERT  → insert (skip jika sudah ada, pakai ignoreDuplicates=false agar error jelas)
 * - UPDATE  → update by id
 * - DELETE  → delete by id
 */
async function genericUpsert(
  table: string,
  operation: SyncQueueItem['operation'],
  recordId: string,
  data: Record<string, any>
): Promise<void> {
  // Hapus field internal SQLite yang tidak ada di Supabase
  const clean = sanitizeForSupabase(data)

  if (operation === 'DELETE') {
    const { error } = await supabase.from(table).delete().eq('id', recordId)
    if (error) throw error
    return
  }

  if (operation === 'INSERT') {
    // Insert; jika conflict id → ubah jadi update (idempotent)
    const { error } = await supabase.from(table).upsert(clean, { onConflict: 'id' })
    if (error) throw error
    return
  }

  // UPDATE
  const { error } = await supabase.from(table).update(clean).eq('id', recordId)
  if (error) throw error
}

/**
 * Buang field internal SQLite (sync_status, updated_at_local) dan field
 * hasil JOIN/komputasi yang bukan kolom Supabase (vehicle, driver, items,
 * tracking, loaders, delivery_orders, total_sacks, dst.).
 * Pengecualian: `data` pada notifications = kolom jsonb asli → dipertahankan.
 */
const COMPUTED_KEYS = new Set(['total_sacks'])
function sanitizeForSupabase(data: Record<string, any>): Record<string, any> {
  const { sync_status, updated_at_local, ...rest } = data
  const clean: Record<string, any> = {}
  for (const [key, value] of Object.entries(rest)) {
    if (COMPUTED_KEYS.has(key)) continue
    if (value !== null && typeof value === 'object' && key !== 'data') continue
    clean[key] = value
  }
  return clean
}

// ============================================================
// UPLOAD FULL: backup seluruh data lokal ke Supabase
// ============================================================

/**
 * Backup full: upload semua data dari SQLite ke Supabase.
 * Dipakai untuk tombol "Backup Sekarang" di pengaturan.
 * Memakai INSERT ... ON CONFLICT (id) DO UPDATE agar idempotent.
 */
export async function uploadAllToSupabase(): Promise<SyncResult> {
  // Pastikan SQLite siap (buat tabel skema jika belum ada).
  await initSQLite()

  if (!isOnlineNow()) {
    return { success: false, message: 'Tidak ada koneksi internet' }
  }

  const userId = getCurrentUserId()
  const { query } = await import('@/lib/sqlite')

  const tables = [
    'categories', 'products', 'customers', 'transactions', 'transaction_items',
    'transaction_payments', 'returns', 'return_items', 'store_settings',
    'stock_movements', 'stock_adjustments', 'stock_opnames', 'stock_opname_items',
    'stock_alerts', 'notifications',
    'chart_of_accounts', 'journal_entries', 'journal_lines',
    'suppliers', 'purchase_orders', 'po_items',
    'goods_receipts', 'grn_items',
    'purchase_invoices', 'pi_items', 'pi_payments',
    'purchase_returns', 'purchase_return_items',
    'employees', 'attendance',
    'payrolls',
    'employee_loans', 'employee_loan_payments',
    'vehicles', 'delivery_orders', 'delivery_items', 'delivery_tracking',
    'customer_groups', 'customer_group_members', 'price_tiers', 'customer_price_matrix',
  ]

  let uploaded = 0
  try {
    for (const table of tables) {
      const rows = await query<any>(`SELECT * FROM ${table} WHERE user_id = ?`, [userId])
      if (rows.length === 0) continue

      const clean = rows.map(sanitizeForSupabase)
      const { error } = await supabase.from(table).upsert(clean, { onConflict: 'id' })
      if (error) throw error
      uploaded += clean.length
    }

    // Tandai semua data sebagai synced
    await markAllSynced(tables)

    await setMetadata('last_sync_at', new Date().toISOString())
    logEvent({ level: 'info', source: 'sync', event: 'backup_full_ok', message: `Backup full selesai: ${uploaded} baris diupload` })
    return { success: true, uploaded }
  } catch (e: any) {
    logError('sync', 'backup_full_failed', e, 'Backup full gagal')
    return { success: false, message: e.message || 'Gagal backup' }
  }
}

/** Set sync_status = 'synced' untuk semua data user di tabel tertentu. */
async function markAllSynced(tables: string[]): Promise<void> {
  const userId = getCurrentUserId()
  const { run } = await import('@/lib/sqlite')
  for (const table of tables) {
    await run(`UPDATE ${table} SET sync_status = 'synced', updated_at_local = NULL WHERE user_id = ?`, [userId])
  }
  // Bersihkan queue yang sudah terproses
  await clearSyncQueue()
}

// ============================================================
// Helper status
// ============================================================

/** Kapan terakhir sync (untuk ditampilkan di UI). */
export async function getLastSyncInfo(): Promise<{ lastSyncAt: string | null; lastDownloadAt: string | null }> {
  const [lastSyncAt, lastDownloadAt] = await Promise.all([
    getMetadata('last_sync_at'),
    getMetadata('last_download_at'),
  ])
  return { lastSyncAt, lastDownloadAt }
}
