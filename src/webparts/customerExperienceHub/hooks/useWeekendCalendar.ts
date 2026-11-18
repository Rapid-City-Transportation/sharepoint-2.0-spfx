import * as React from 'react';
import { fetchWeekendShifts, IWeekendShift } from '../services/weekendCalendarService';

/** The loader must be a stable (module-level) function: it is an effect
 *  dependency, so a new function on every render would refetch forever. */
export function useWeekendCalendar(
  loadShifts: () => Promise<IWeekendShift[]> = fetchWeekendShifts
): {
  shifts: IWeekendShift[];
  loading: boolean;
  error: boolean;
} {
  const [shifts, setShifts] = React.useState<IWeekendShift[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    loadShifts()
      .then(s => {
        if (!active) return;
        setShifts(s);
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
  }, [loadShifts]);

  return { shifts, loading, error };
}
