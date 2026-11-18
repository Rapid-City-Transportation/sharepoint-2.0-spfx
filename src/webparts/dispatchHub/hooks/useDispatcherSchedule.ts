import * as React from 'react';
import { fetchDispatcherSchedule, IDispatcherShift } from '../services/dispatcherScheduleService';

export function useDispatcherSchedule(): {
  rows: IDispatcherShift[];
  loading: boolean;
  error: boolean;
} {
  const [rows, setRows] = React.useState<IDispatcherShift[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    fetchDispatcherSchedule()
      .then(r => {
        if (!active) return;
        setRows(r);
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

  return { rows, loading, error };
}
