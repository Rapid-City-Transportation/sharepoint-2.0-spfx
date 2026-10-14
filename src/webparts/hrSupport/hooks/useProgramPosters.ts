import * as React from 'react';
import { fetchProgramPosters, IProgramPoster } from '../services/programsService';

/** Posters in the Government Programs folder. No built-in fallback: an empty
 *  or unreadable folder shows as such, with a pointer to the folder. */
export function useProgramPosters(): { posters: IProgramPoster[]; loading: boolean; error: boolean } {
  const [posters, setPosters] = React.useState<IProgramPoster[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    fetchProgramPosters()
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
