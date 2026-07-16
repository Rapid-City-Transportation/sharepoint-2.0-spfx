import * as React from 'react';
import { fetchDailyTasks, IDailyTask } from '../services/dailyTaskService';

export function useDailyTasks(): { tasks: IDailyTask[]; loading: boolean; error: boolean } {
  const [tasks, setTasks] = React.useState<IDailyTask[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    fetchDailyTasks()
      .then(t => {
        if (!active) return;
        setTasks(t);
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

  return { tasks, loading, error };
}
