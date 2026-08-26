import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  sqliteNotificationsService,
  type SqliteNotification,
} from '@/services/sqlite/notifications'

export interface Notification {
  id: string
  user_id: string
  type: 'stock_alert' | 'transaction' | 'return' | 'system' | 'payment'
  title: string
  message: string
  data?: any
  is_read: boolean
  created_at: string
  read_at?: string
}

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = ref<Notification[]>([])
  const unreadCount = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const updateUnreadCount = () => {
    unreadCount.value = notifications.value.filter(n => !n.is_read).length
  }

  const fetchNotifications = async (limit: number = 50) => {
    loading.value = true
    error.value = null
    try {
      notifications.value = await sqliteNotificationsService.fetchNotifications(limit)
      updateUnreadCount()
    } catch (e: any) {
      error.value = e.message
      console.error('Error fetching notifications:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  const fetchUnreadNotifications = async () => {
    try {
      return await sqliteNotificationsService.fetchUnreadNotifications()
    } catch (e: any) {
      console.error('Error fetching unread notifications:', e)
      return []
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await sqliteNotificationsService.markAsRead(notificationId)

      // Update local state
      const notification = notifications.value.find(n => n.id === notificationId)
      if (notification) {
        notification.is_read = true
        notification.read_at = new Date().toISOString()
      }
      updateUnreadCount()
    } catch (e: any) {
      console.error('Error marking notification as read:', e)
      throw e
    }
  }

  const markAllAsRead = async () => {
    try {
      await sqliteNotificationsService.markAllAsRead()

      // Update local state
      notifications.value.forEach(n => {
        n.is_read = true
        n.read_at = new Date().toISOString()
      })
      updateUnreadCount()
    } catch (e: any) {
      console.error('Error marking all notifications as read:', e)
      throw e
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      await sqliteNotificationsService.deleteNotification(notificationId)

      // Remove from local state
      notifications.value = notifications.value.filter(n => n.id !== notificationId)
      updateUnreadCount()
    } catch (e: any) {
      console.error('Error deleting notification:', e)
      throw e
    }
  }

  const deleteAllRead = async () => {
    try {
      await sqliteNotificationsService.deleteAllRead()

      // Remove from local state
      notifications.value = notifications.value.filter(n => !n.is_read)
      updateUnreadCount()
    } catch (e: any) {
      console.error('Error deleting read notifications:', e)
      throw e
    }
  }

  const createNotification = async (notification: {
    type: 'stock_alert' | 'transaction' | 'return' | 'system' | 'payment'
    title: string
    message: string
    data?: any
  }) => {
    try {
      const data = await sqliteNotificationsService.createNotification(notification)

      // Add to local state
      notifications.value.unshift(data)
      updateUnreadCount()
      return data
    } catch (e: any) {
      console.error('Error creating notification:', e)
      throw e
    }
  }

  const subscribeToNotifications = () => {
    // Realtime Supabase tidak berlaku untuk SQLite lokal.
    // Notifikasi di-refetch saat app aktif.
    return () => {}
  }

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    fetchUnreadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    createNotification,
    subscribeToNotifications
  }
})