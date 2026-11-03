// Type declarations untuk Capacitor plugins yang digunakan

declare module '@capacitor/preferences' {
  export interface Preferences {
    get(options: { key: string }): Promise<{ value: string | null }>
    set(options: { key: string; value: string }): Promise<void>
    remove(options: { key: string }): Promise<void>
    clear(): Promise<void>
  }

  export const Preferences: Preferences
}

declare module '@capacitor/device' {
  export interface DeviceInfo {
    model: string
    platform: 'ios' | 'android' | 'web'
    operatingSystem: string
    osVersion: string
    manufacturer: string
    isVirtual: boolean
    webViewVersion: string
  }

  export interface BatteryInfo {
    batteryLevel: number
    isCharging: boolean
  }

  export interface Device {
    getInfo(): Promise<DeviceInfo>
    getBatteryInfo(): Promise<BatteryInfo>
  }

  export const Device: Device
}

declare module '@capacitor/local-notifications' {
  export interface LocalNotificationSchema {
    id: number
    title: string
    body: string
    schedule?: {
      at: Date
      repeats?: boolean
      every?: 'year' | 'month' | 'two-weeks' | 'week' | 'day' | 'hour' | 'minute' | 'second'
    }
    sound?: string
    attachments?: any[]
    actionTypeId?: string
    extra?: any
  }

  export interface LocalNotifications {
    schedule(options: { notifications: LocalNotificationSchema[] }): Promise<void>
    cancel(options: { notifications: Array<{ id: number }> }): Promise<void>
    requestPermissions(): Promise<{ display: 'granted' | 'denied' }>
  }

  export const LocalNotifications: LocalNotifications
}
