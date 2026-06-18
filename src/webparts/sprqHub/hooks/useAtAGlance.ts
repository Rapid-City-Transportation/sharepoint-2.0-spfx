import * as React from 'react';
import { getAtAGlanceCounts, IAtAGlanceCounts } from '../services/atAGlanceService';

const EMPTY: IAtAGlanceCounts = { routes: 0, flight: 0, bookings: 0 };

export function useAtAGlance(): { counts: IAtAGlanceCounts; loading: boolean } {
  const [counts, setCounts] = React.useState<IAtAGlanceCounts>(EMPTY);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    getAtAGlanceCounts()
      .then(c => {
        if (!active) return;
        setCounts(c);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { counts, loading };
}
