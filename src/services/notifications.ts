import { supabase } from '@/lib/supabase'

// ============================================================
// Supabase Service: Notifications
// Untuk web (mobile browser & desktop) — akses Supabase langsung.
// ============================================================

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

export const notificationsService = {
  async fetchNotifications(limit: number = 50): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return (data || []).map((r: any) => this.mapRow(r))
  },

  async fetchUnreadNotifications(): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('is_read', false)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []).map((r: any) => this.mapRow(r))
  },

  async fetchUnreadCount(): Promise<number> {
    const { data, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact' })
      .eq('is_read', false)

    if (error) throw error
    return data?.length ?? 0
  },

  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId)

    if (error) throw error
  },

  async markAllAsRead(): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('is_read', false)

    if (error) throw error
  },

  async deleteNotification(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)

    if (error) throw error
  },

  async deleteAllRead(): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('is_read', true)

    if (error) throw error
  },

  async createNotification(notification: {
    type: 'stock_alert' | 'transaction' | 'return' | 'system' | 'payment'
    title: string
    message: string
    data?: any
  }): Promise<Notification> {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data ? JSON.stringify(notification.data) : null,
      })
      .select()
      .single()

    if (error) throw error
    return this.mapRow(data)
  },

  mapRow(r: any): Notification {
    let data: any
    if (r.data) {
      try { data = JSON.parse(r.data) } catch { data = r.data }
    }
    return {
      id: r.id,
      user_id: r.user_id,
      type: r.type,
      title: r.title,
      message: r.message,
      data,
      is_read: !!r.is_read,
      created_at: r.created_at,
      read_at: r.read_at ?? undefined,
    }
  },
}