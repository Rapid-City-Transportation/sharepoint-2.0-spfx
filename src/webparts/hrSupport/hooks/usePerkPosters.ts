import * as React from 'react';
import { fetchPerkPosters, IPerkPoster } from '../services/perksService';

/** Posters in the Benefits and Perks folder. No built-in fallback: an empty
 *  or unreadable folder shows as such, with a pointer to the folder. */
export function usePerkPosters(): { posters: IPerkPoster[]; loading: boolean; error: boolean } {
  const [posters, setPosters] = React.useState<IPerkPoster[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    fetchPerkPosters()
      .then(rows => {
        if (!active) return;
        setPosters(rows);
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

  return { posters, loading, error };
}
