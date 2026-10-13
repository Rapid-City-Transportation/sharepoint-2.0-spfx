import * as React from 'react';
import { fetchSprqTools, ISprqToolEntry } from '../services/sprqToolsService';

/**
 * Rows of the SPRQ Tools list. There is deliberately no built-in fallback:
 * an empty or unreadable list shows as such, so nobody mistakes placeholder
 * content for something they can edit.
 */
export function useSprqTools(): { entries: ISprqToolEntry[]; loading: boolean; error: boolean } {
  const [entries, setEntries] = React.useState<ISprqToolEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    fetchSprqTools()
      .then(rows => {
        if (!active) return;
        setEntries(rows);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError(true);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { entries, loading, error };
}
