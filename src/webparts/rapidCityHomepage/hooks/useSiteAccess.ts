import * as React from 'react';
import { fetchSiteAccess } from '../services/managementAccessService';

export type SiteAccessState = 'checking' | 'allowed' | 'denied';

/** Whether the viewer can open the given site. 'checking' until the probe
 *  answers, so gated content never flashes for everyone; no site means no
 *  gate. The probe runs through the Contact Cards SPFI, so the host web part
 *  must initialize it (every Navigation host already does). */
export function useSiteAccess(siteUrl: string | undefined): {
  state: SiteAccessState;
  retry: () => void;
} {
  const [state, setState] = React.useState<SiteAccessState>(siteUrl ? 'checking' : 'allowed');
  const [attempt, setAttempt] = React.useState(0);

  const retry = React.useCallback((): void => {
    setState('checking');
    setAttempt(a => a + 1);
  }, []);

  React.useEffect(() => {
    if (!siteUrl) {
      setState('allowed');
      return;
    }
    let cancelled = false;
    fetchSiteAccess(siteUrl)
      .then(ok => {
        if (!cancelled) setState(ok ? 'allowed' : 'denied');
      })
      .catch(() => {
        if (!cancelled) setState('denied');
      });
    return () => {
      cancelled = true;
    };
  }, [siteUrl, attempt]);

  return { state, retry };
}
