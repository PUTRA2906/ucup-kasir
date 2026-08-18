import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

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

  const fetchNotifications = async (limit: number = 50) => {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (fetchError) throw fetchError
      notifications.value = data || []
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
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('is_read', false)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      return data || []
    } catch (e: any) {
      console.error('Error fetching unread notifications:', e)
      return []
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId)

      if (updateError) throw updateError

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
      const { error: updateError } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('is_read', false)

      if (updateError) throw updateError

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
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (deleteError) throw deleteError

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
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('is_read', true)

      if (deleteError) throw deleteError

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
      const { data, error: insertError } = await supabase
        .from('notifications')
        .insert(notification)
        .select()
        .single()

      if (insertError) throw insertError

      // Add to local state
      notifications.value.unshift(data)
      updateUnreadCount()
      return data
    } catch (e: any) {
      console.error('Error creating notification:', e)
      throw e
    }
  }

  const updateUnreadCount = () => {
    unreadCount.value = notifications.value.filter(n => !n.is_read).length
  }

  const subscribeToNotifications = () => {
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          const newNotification = payload.new as Notification
          notifications.value.unshift(newNotification)
          updateUnreadCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
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
