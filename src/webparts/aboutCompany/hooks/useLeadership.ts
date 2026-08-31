import * as React from 'react';
import { fetchLeadership, ILeader } from '../services/leadershipService';

/** Loads the senior leadership roster. Any error (column missing, no access)
 *  resolves to an empty roster so the page renders its hint instead of dying. */
export function useLeadership(): { leaders: ILeader[]; loading: boolean } {
  const [leaders, setLeaders] = React.useState<ILeader[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    fetchLeadership()
      .then(items => {
        if (!cancelled) setLeaders(items);
      })
      .catch(() => {
        if (!cancelled) setLeaders([]);
      })
      .then(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { leaders, loading };
}
