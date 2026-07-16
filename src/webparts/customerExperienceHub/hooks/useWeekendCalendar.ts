import * as React from 'react';
import { fetchWeekendShifts, IWeekendShift } from '../services/weekendCalendarService';

export function useWeekendCalendar(): {
  shifts: IWeekendShift[];
  loading: boolean;
  error: boolean;
} {
  const [shifts, setShifts] = React.useState<IWeekendShift[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    fetchWeekendShifts()
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
  }, []);

  return { shifts, loading, error };
}
