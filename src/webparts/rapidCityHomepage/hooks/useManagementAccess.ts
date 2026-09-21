import * as React from 'react';
import { fetchManagementAccess } from '../services/managementAccessService';

/** Whether the viewer may see the managers-only Management link. False until
 *  the check proves otherwise, so the link never flashes for everyone. */
export function useManagementAccess(): boolean {
  const [allowed, setAllowed] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    fetchManagementAccess()
      .then(ok => {
        if (!cancelled) setAllowed(ok);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  return allowed;
}
