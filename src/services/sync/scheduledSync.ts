import { uploadChangesToSupabase } from '@/services/sync/syncEngine'
import { isOnlineNow } from '@/lib/network'
import { isNativeApp } from '@/lib/platform'
import { logEvent, logError } from '@/lib/eventLog'

// ============================================================
// Scheduled Sync — Auto-upload data setiap hari jam 12 malam
// ============================================================

const STORAGE_KEY = 'scheduled_sync_config'
const DEFAULT_SCHEDULE_TIME = '00:00' // 12 malam

export interface ScheduledSyncConfig {
  enabled: boolean
  scheduleTime: string // Format: "HH:mm"
  lastRun: string | null // ISO timestamp
  retryOnFail: boolean
  uploadOnlyWhenCharging: boolean // Optional: hanya upload saat charging
}

const DEFAULT_CONFIG: ScheduledSyncConfig = {
  enabled: false,
  scheduleTime: DEFAULT_SCHEDULE_TIME,
  lastRun: null,
  retryOnFail: true,
  uploadOnlyWhenCharging: false,
}

// ============================================================
// Config Management
// ============================================================

/** Load config dari storage */
export async function getScheduledSyncConfig(): Promise<ScheduledSyncConfig> {
  if (!isNativeApp()) return DEFAULT_CONFIG

  try {
    const { Preferences } = await import('@capacitor/preferences')
    const { value } = await Preferences.get({ key: STORAGE_KEY })
    if (!value) return DEFAULT_CONFIG
    return { ...DEFAULT_CONFIG, ...JSON.parse(value) }
  } catch (e) {
    logError('scheduled_sync', 'config_load_failed', e, 'Gagal load config')
    return DEFAULT_CONFIG
  }
}

/** Save config ke storage */
export async function saveScheduledSyncConfig(config: ScheduledSyncConfig): Promise<void> {
  if (!isNativeApp()) {
    logError('scheduled_sync', 'config_save_failed', new Error('Not native app'), 'Save config only available on native app')
    return
  }

  try {
    const { Preferences } = await import('@capacitor/preferences')
    await Preferences.set({
      key: STORAGE_KEY,
      value: JSON.stringify(config),
    })
  } catch (e) {
    logError('scheduled_sync', 'config_save_failed', e, 'Gagal save config')
    throw e
  }
}

/** Enable scheduled sync */
export async function enableScheduledSync(scheduleTime: string = DEFAULT_SCHEDULE_TIME): Promise<void> {
  const config = await getScheduledSyncConfig()
  config.enabled = true
  config.scheduleTime = scheduleTime
  await saveScheduledSyncConfig(config)

  // Start scheduler
  await startScheduler()

  logEvent({
    level: 'info',
    source: 'scheduled_sync',
    event: 'enabled',
    message: `Scheduled sync enabled at ${scheduleTime}`,
  })
}

/** Disable scheduled sync */
export async function disableScheduledSync(): Promise<void> {
  const config = await getScheduledSyncConfig()
  config.enabled = false
  await saveScheduledSyncConfig(config)

  // Stop scheduler
  stopScheduler()

  logEvent({
    level: 'info',
    source: 'scheduled_sync',
    event: 'disabled',
    message: 'Scheduled sync disabled',
  })
}

// ============================================================
// Scheduler Engine
// ============================================================

let schedulerInterval: ReturnType<typeof setInterval> | null = null
let retryTimeout: ReturnType<typeof setTimeout> | null = null

/** Start scheduler (cek setiap 1 menit) */
export async function startScheduler(): Promise<void> {
  // Stop existing scheduler dulu
  stopScheduler()

  if (!isNativeApp()) {
    logEvent({
      level: 'warn',
      source: 'scheduled_sync',
      event: 'start_failed',
      message: 'Scheduled sync only available on native app',
    })
    return
  }

  const config = await getScheduledSyncConfig()
  if (!config.enabled) return

  logEvent({
    level: 'info',
    source: 'scheduled_sync',
    event: 'scheduler_started',
    message: `Scheduler started, next run at ${config.scheduleTime}`,
  })

  // Cek setiap 1 menit apakah sudah waktunya upload
  schedulerInterval = setInterval(async () => {
    await checkAndRunScheduledSync()
  }, 60 * 1000) // 1 menit

  // Cek langsung saat start (untuk testing)
  await checkAndRunScheduledSync()
}

/** Stop scheduler */
export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval)
    schedulerInterval = null
  }
  if (retryTimeout) {
    clearTimeout(retryTimeout)
    retryTimeout = null
  }

  logEvent({
    level: 'info',
    source: 'scheduled_sync',
    event: 'scheduler_stopped',
    message: 'Scheduler stopped',
  })
}

/** Cek apakah sudah waktunya upload */
async function checkAndRunScheduledSync(): Promise<void> {
  const config = await getScheduledSyncConfig()

  if (!config.enabled) {
    stopScheduler()
    return
  }

  const now = new Date()
  const [targetHour, targetMinute] = config.scheduleTime.split(':').map(Number)

  // Cek apakah sekarang adalah waktu yang dijadwalkan
  const isScheduledTime = now.getHours() === targetHour && now.getMinutes() === targetMinute

  if (!isScheduledTime) return

  // Cek apakah sudah run hari ini
  if (config.lastRun) {
    const lastRun = new Date(config.lastRun)
    const isSameDay = lastRun.toDateString() === now.toDateString()
    if (isSameDay) {
      // Sudah run hari ini, skip
      return
    }
  }

  logEvent({
    level: 'info',
    source: 'scheduled_sync',
    event: 'scheduled_run_triggered',
    message: `Scheduled sync triggered at ${now.toISOString()}`,
  })

  // Run upload
  await runScheduledUpload()
}

/** Run upload dengan retry mechanism */
async function runScheduledUpload(retryCount: number = 0): Promise<void> {
  const config = await getScheduledSyncConfig()
  const MAX_RETRY = 3

  // Cek internet
  if (!isOnlineNow()) {
    logEvent({
      level: 'warn',
      source: 'scheduled_sync',
      event: 'offline',
      message: 'Device offline, will retry in 5 minutes',
    })

    // Retry setelah 5 menit
    if (config.retryOnFail && retryCount < MAX_RETRY) {
      retryTimeout = setTimeout(() => {
        runScheduledUpload(retryCount + 1)
      }, 5 * 60 * 1000) // 5 menit
    }
    return
  }

  // Cek battery (optional)
  if (config.uploadOnlyWhenCharging) {
    const isCharging = await checkIfCharging()
    if (!isCharging) {
      logEvent({
        level: 'info',
        source: 'scheduled_sync',
        event: 'not_charging',
        message: 'Device not charging, upload skipped (config: uploadOnlyWhenCharging)',
      })
      return
    }
  }

  try {
    logEvent({
      level: 'info',
      source: 'scheduled_sync',
      event: 'upload_started',
      message: `Upload started (retry: ${retryCount})`,
    })

    // Upload changes
    const result = await uploadChangesToSupabase()

    if (!result.success) {
      throw new Error(result.message || 'Upload gagal')
    }

    // Update lastRun
    config.lastRun = new Date().toISOString()
    await saveScheduledSyncConfig(config)

    logEvent({
      level: 'info',
      source: 'scheduled_sync',
      event: 'upload_success',
      message: `Upload berhasil: ${result.uploaded || 0} data, ${result.failed || 0} gagal`,
    })

    // Send notification (optional)
    if (result.uploaded && result.uploaded > 0) {
      await sendNotification('Backup Otomatis Berhasil', `${result.uploaded} data berhasil dibackup`)
    }
  } catch (e: any) {
    logError('scheduled_sync', 'upload_failed', e, `Upload gagal (retry: ${retryCount})`)

    // Retry jika enabled
    if (config.retryOnFail && retryCount < MAX_RETRY) {
      const retryDelay = Math.min(5 * (retryCount + 1), 15) // 5, 10, 15 menit

      logEvent({
        level: 'warn',
        source: 'scheduled_sync',
        event: 'retry_scheduled',
        message: `Upload failed, will retry in ${retryDelay} minutes`,
      })

      retryTimeout = setTimeout(() => {
        runScheduledUpload(retryCount + 1)
      }, retryDelay * 60 * 1000)
    } else {
      // Max retry tercapai atau retry disabled
      logEvent({
        level: 'error',
        source: 'scheduled_sync',
        event: 'upload_failed_final',
        message: 'Upload failed after max retries',
      })

      // Send notification (optional)
      await sendNotification('Backup Otomatis Gagal', 'Silakan backup manual di Settings')
    }
  }
}

/** Cek apakah device sedang charging (requires @capacitor/device plugin) */
async function checkIfCharging(): Promise<boolean> {
  try {
    // Import dynamic untuk avoid error jika plugin tidak installed
    const { Device } = await import('@capacitor/device')
    const info = await Device.getBatteryInfo()
    return info.isCharging || false
  } catch (e) {
    // Plugin tidak tersedia atau error, assume charging
    logError('scheduled_sync', 'battery_check_failed', e, 'Gagal cek battery status')
    return true
  }
}

/** Send local notification (requires @capacitor/local-notifications plugin) */
async function sendNotification(title: string, body: string): Promise<void> {
  try {
    // Import dynamic untuk avoid error jika plugin tidak installed
    const { LocalNotifications } = await import('@capacitor/local-notifications')

    // Request permission dulu
    const permission = await LocalNotifications.requestPermissions()
    if (permission.display !== 'granted') return

    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id: Math.floor(Math.random() * 100000),
          schedule: { at: new Date(Date.now() + 1000) }, // 1 detik dari sekarang
          sound: undefined,
          attachments: undefined,
          actionTypeId: '',
          extra: null,
        },
      ],
    })
  } catch (e) {
    // Plugin tidak tersedia atau error, skip notification
    logError('scheduled_sync', 'notification_failed', e, 'Gagal send notification')
  }
}

// ============================================================
// Manual Trigger (untuk testing)
// ============================================================

/** Trigger upload manual (untuk testing scheduler) */
export async function triggerScheduledUploadNow(): Promise<void> {
  logEvent({
    level: 'info',
    source: 'scheduled_sync',
    event: 'manual_trigger',
    message: 'Scheduled upload triggered manually',
  })

  await runScheduledUpload()
}

// ============================================================
// Status & Info
// ============================================================

export interface ScheduledSyncStatus {
  enabled: boolean
  scheduleTime: string
  lastRun: string | null
  nextRun: string | null
  isRunning: boolean
}

/** Get status scheduler */
export async function getScheduledSyncStatus(): Promise<ScheduledSyncStatus> {
  const config = await getScheduledSyncConfig()

  // Hitung next run
  let nextRun: string | null = null
  if (config.enabled) {
    const now = new Date()
    const [hour, minute] = config.scheduleTime.split(':').map(Number)

    const nextRunDate = new Date(now)
    nextRunDate.setHours(hour, minute, 0, 0)

    // Jika waktu hari ini sudah lewat, set ke besok
    if (nextRunDate <= now) {
      nextRunDate.setDate(nextRunDate.getDate() + 1)
    }

    nextRun = nextRunDate.toISOString()
  }

  return {
    enabled: config.enabled,
    scheduleTime: config.scheduleTime,
    lastRun: config.lastRun,
    nextRun,
    isRunning: schedulerInterval !== null,
  }
}
