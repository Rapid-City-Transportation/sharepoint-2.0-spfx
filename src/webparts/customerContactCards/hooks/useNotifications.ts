import * as React from 'react';
import {
  fetchNotifications,
  markNotificationRead,
  markNotificationsRead,
  INotificationItem,
} from '../services/notificationsService';

const POLL_INTERVAL_MS = 90 * 1000;

export interface IUseNotificationsResult {
  notifications: INotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

/** Loads recent notifications, polls every 90s while the tab is visible,
 *  and exposes mark-as-read mutations with optimistic updates.
 *  Pass enabled=false to keep the hook inert (no fetch, no polling). */
export function useNotifications(enabled: boolean): IUseNotificationsResult {
  const [notifications, setNotifications] = React.useState<INotificationItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const mountedRef = React.useRef(true);
  React.useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const refresh = React.useCallback(async (): Promise<void> => {
    if (!enabled) return;
    try {
      setLoading(true);
      setError(null);
      const items = await fetchNotifications();
      if (mountedRef.current) setNotifications(items);
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load notifications');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [enabled]);

  // Initial fetch + polling. Polling pauses when the tab is hidden and resumes on visibility.
  React.useEffect(() => {
    if (!enabled) {
      setNotifications([]);
      setError(null);
      return;
    }

    refresh().catch(() => {});

    let intervalId: number | undefined;

    const start = (): void => {
      if (intervalId !== undefined) return;
      intervalId = window.setInterval(() => {
        if (document.visibilityState === 'visible') {
          refresh().catch(() => {});
        }
      }, POLL_INTERVAL_MS);
    };

    const stop = (): void => {
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    const handleVisibility = (): void => {
      if (document.visibilityState === 'visible') {
        refresh().catch(() => {});
        start();
      } else {
        stop();
      }
    };

    start();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [enabled, refresh]);

  const markAsRead = React.useCallback(async (id: number): Promise<void> => {
    // Optimistic: flip local state first, persist after.
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)));
    try {
      await markNotificationRead(id);
    } catch {
      // Revert on failure so the badge count stays honest.
      if (mountedRef.current) {
        setNotifications(prev => prev.map(n => (n.id === id ? { ...n, isRead: false } : n)));
      }
    }
  }, []);

  const markAllAsRead = React.useCallback(async (): Promise<void> => {
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
    if (unreadIds.length === 0) return;

    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try {
      await markNotificationsRead(unreadIds);
    } catch {
      if (mountedRef.current) refresh().catch(() => {});
    }
  }, [notifications, refresh]);

  const unreadCount = React.useMemo(
    () => notifications.reduce((acc, n) => (n.isRead ? acc : acc + 1), 0),
    [notifications]
  );

  return { notifications, unreadCount, loading, error, markAsRead, markAllAsRead, refresh };
}
