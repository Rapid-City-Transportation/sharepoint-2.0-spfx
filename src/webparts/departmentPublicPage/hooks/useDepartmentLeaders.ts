import * as React from 'react';
import {
  IDepartmentLeader,
  fetchDepartmentLeaders,
} from '../services/DepartmentLeadersService';

export interface IUseDepartmentLeadersResult {
  leaders: IDepartmentLeader[];
  loading: boolean;
  error: string | null;
}

/**
 * Fetches department leaders from the Employee Tracker list for a given
 * department display name. Returns leaders whose Department(s) field
 * includes both "Management" and the department name.
 */
export function useDepartmentLeaders(
  departmentDisplayName: string | undefined
): IUseDepartmentLeadersResult {
  const [leaders, setLeaders] = React.useState<IDepartmentLeader[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!departmentDisplayName) {
      setLeaders([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchDepartmentLeaders(departmentDisplayName)
      .then(result => {
        if (!cancelled) {
          setLeaders(result);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          console.error('Failed to fetch department leaders:', err);
          setError('Unable to load department leaders.');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [departmentDisplayName]);

  return { leaders, loading, error };
}
