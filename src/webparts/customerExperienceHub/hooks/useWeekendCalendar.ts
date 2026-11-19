import * as React from 'react';
import { fetchWeekendShifts, IWeekendShift } from '../services/weekendCalendarService';

/** The loader must be a stable (module-level) function: it is an effect
 *  dependency, so a new function on every render would refetch forever.
 *  `refresh` re-reads in place, keeping the current rows on screen. */
export function useWeekendCalendar(
  loadShifts: () => Promise<IWeekendShift[]> = fetchWeekendShifts
): {
  shifts: IWeekendShift[];
  loading: boolean;
  error: boolean;
  refresh: () => void;
} {
  const [shifts, setShifts] = React.useState<IWeekendShift[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [reloads, setReloads] = React.useState(0);

  const refresh = React.useCallback((): void => {
    setReloads(n => n + 1);
  }, []);

  React.useEffect(() => {
    let active = true;
    loadShifts()
      .then(s => {
        if (!active) return;
        setShifts(s);
        setError(false);
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
  }, [loadShifts, reloads]);

  return { shifts, loading, error, refresh };
}
