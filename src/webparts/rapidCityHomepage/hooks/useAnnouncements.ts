import * as React from 'react';
import { fetchAnnouncements, IAnnouncement } from '../services/announcementsService';

/**
 * Loads announcements for a page from the CX Announcements list. On any error
 * (list missing, no access, wrong site) it returns an empty array so the caller
 * can fall back to its built-in defaults and never render a blank card.
 */
export function useAnnouncements(page: string): {
  announcements: IAnnouncement[];
  loading: boolean;
} {
  const [announcements, setAnnouncements] = React.useState<IAnnouncement[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchAnnouncements(page)
      .then(items => {
        if (!cancelled) setAnnouncements(items);
      })
      .catch(() => {
        if (!cancelled) setAnnouncements([]);
      })
      .then(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [page]);

  return { announcements, loading };
}
