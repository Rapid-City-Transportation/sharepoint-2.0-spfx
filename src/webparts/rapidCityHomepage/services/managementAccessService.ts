import { Web } from '@pnp/sp/webs';
import '@pnp/sp/security/web';
import { PermissionKind } from '@pnp/sp/security';
import { getSP } from '../../customerContactCards/services/spConfig';

export const MANAGEMENT_SITE_URL = 'https://rapidcitytransport.sharepoint.com/sites/Management';

const CACHE_PREFIX = 'rct-site-access:';

/** 401/403 is SharePoint's real "no". Anything else (throttling, a network
 *  drop, a page that never initialized the SPFI) says nothing about the user. */
function isDenied(err: unknown): boolean {
  const status = (err as { status?: number } | null)?.status;
  return status === 401 || status === 403;
}

/**
 * True when the signed-in user can open the given site. The site's own
 * permissions decide who belongs, so no page keeps a second roster that could
 * drift. This only controls what is shown; the site itself still enforces
 * access. Only definitive answers are cached for the browser session (the
 * cache is shared by every site on the tenant), so a failed check hides the
 * link on this page but is retried on the next.
 */
export async function fetchSiteAccess(siteUrl: string): Promise<boolean> {
  const cacheKey = CACHE_PREFIX + siteUrl;
  try {
    const cached = window.sessionStorage.getItem(cacheKey);
    if (cached === 'yes') return true;
    if (cached === 'no') return false;
  } catch {
    // Storage can be blocked; fall through to the live check.
  }

  let allowed: boolean;
  try {
    allowed = await Web([getSP().web, siteUrl]).currentUserHasPermissions(
      PermissionKind.ViewPages
    );
  } catch (err) {
    if (!isDenied(err)) return false;
    allowed = false;
  }

  try {
    window.sessionStorage.setItem(cacheKey, allowed ? 'yes' : 'no');
  } catch {
    // Not caching is fine.
  }
  return allowed;
}

/** Whether the viewer counts as a manager: they can open the Management site. */
export function fetchManagementAccess(): Promise<boolean> {
  return fetchSiteAccess(MANAGEMENT_SITE_URL);
}
