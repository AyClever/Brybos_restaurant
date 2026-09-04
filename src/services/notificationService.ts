import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Notification } from '../types';

export const notificationService = {
  async getNotifications(options?: { role?: string; userId?: string }): Promise<{ data: Notification[] | null; error: string | null }> {
    if (!isSupabaseConfigured) return { data: null, error: null };
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (options?.userId) {
        query = query.or(`user_id.eq.${options.userId},target_role.in.(all,${options.role || 'customer'})`);
      } else if (options?.role) {
        query = query.or(`target_role.in.(all,${options.role})`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const mapped: Notification[] = (data || []).map((n: any) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        timestamp: n.created_at,
        read: Boolean(n.read),
        userId: n.user_id,
        targetRole: n.target_role,
      }));

      return { data: mapped, error: null };
    } catch (err: any) {
      console.warn('Supabase notifications fetch error:', err.message);
      return { data: null, error: err.message };
    }
  },

  async createNotification(notification: {
    type: 'success' | 'info' | 'warning' | 'error';
    title: string;
    message: string;
    targetRole?: string;
    userId?: string;
  }): Promise<{ error: string | null }> {
    if (!isSupabaseConfigured) return { error: null };
    try {
      const { error } = await supabase.from('notifications').insert({
        type: notification.type,
        title: notification.title,
        message: notification.message,
        target_role: notification.targetRole || 'all',
        user_id: notification.userId || null,
      });
      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      console.error('Error creating notification:', err);
      return { error: err.message };
    }
  },

  async markAsRead(id: string): Promise<{ error: string | null }> {
    if (!isSupabaseConfigured) return { error: null };
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);
      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      console.error('Error marking notification read:', err);
      return { error: err.message };
    }
  },

  async markAllAsRead(userId?: string): Promise<{ error: string | null }> {
    if (!isSupabaseConfigured) return { error: null };
    try {
      let query = supabase.from('notifications').update({ read: true }).eq('read', false);
      if (userId) query = query.eq('user_id', userId);
      const { error } = await query;
      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      console.error('Error marking all notifications read:', err);
      return { error: err.message };
    }
  },

  subscribeToNotifications(callback: (payload: any) => void) {
    if (!isSupabaseConfigured) return () => {};
    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => callback(payload)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
