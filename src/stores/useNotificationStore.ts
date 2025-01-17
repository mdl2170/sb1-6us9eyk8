import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Notification } from '../types';

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  subscribeToNotifications: () => void;
  unsubscribeFromNotifications: () => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => {
  let subscription: ReturnType<typeof supabase.channel> | null = null;

  return {
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    error: null,

    fetchNotifications: async () => {
      try {
        set({ isLoading: true, error: null });
        
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const notifications = data.map(notification => ({
          ...notification,
          userId: notification.user_id,
          createdAt: notification.created_at,
        }));

        set({
          notifications,
          unreadCount: notifications.filter(n => !n.read).length,
        });
      } catch (error) {
        set({ error: 'Failed to fetch notifications' });
        console.error('Error fetching notifications:', error);
      } finally {
        set({ isLoading: false });
      }
    },

    markAsRead: async (id: string) => {
      try {
        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', id);

        if (error) throw error;

        set(state => ({
          notifications: state.notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
          ),
          unreadCount: state.unreadCount - 1,
        }));
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    },

    markAllAsRead: async () => {
      try {
        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('read', false);

        if (error) throw error;

        set(state => ({
          notifications: state.notifications.map(n => ({ ...n, read: true })),
          unreadCount: 0,
        }));
      } catch (error) {
        console.error('Error marking all notifications as read:', error);
      }
    },

    subscribeToNotifications: () => {
      const { fetchNotifications } = get();
      
      subscription = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
          },
          () => {
            fetchNotifications();
          }
        )
        .subscribe();
    },

    unsubscribeFromNotifications: () => {
      if (subscription) {
        supabase.removeChannel(subscription);
        subscription = null;
      }
    },
  };
});