import * as React from 'react';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { MSGraphClientV3 } from '@microsoft/sp-http';
import { fetchFolders, fetchRecentDocuments } from '../services/documentsService';
import { IItFolder, IItRecentDoc, ItHubState } from '../models/IItHubModels';

interface IItHubResult {
  state: ItHubState;
  folders: IItFolder[];
  recent: IItRecentDoc[];
  retry: () => void;
}

/** An all-zero GUID means the group isn't provisioned yet, so the Graph check
 *  is skipped and the site's own permissions remain the gate. */
function isRealGroupId(groupId: string): boolean {
  return !!groupId && groupId.indexOf('00000000') !== 0;
}

function httpStatus(err: unknown): number | undefined {
  return (err as { status?: number })?.status;
}

/**
 * Access check and data load in one flow, so nothing renders before access is
 * proven. Graph membership failures and 401/403/404 from the library both fail
 * safe to 'denied'; anything else is 'error' with a retry.
 */
export function useItHub(context: WebPartContext, groupId: string): IItHubResult {
  const [state, setState] = React.useState<ItHubState>('checking');
  const [folders, setFolders] = React.useState<IItFolder[]>([]);
  const [recent, setRecent] = React.useState<IItRecentDoc[]>([]);
  const [attempt, setAttempt] = React.useState(0);

  const retry = React.useCallback((): void => {
    setState('checking');
    setAttempt(a => a + 1);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    // Graph returns lowercase ids and the GUID comes from a free-text field,
    // so an uppercase or padded paste would otherwise lock everyone out.
    const gid = groupId.trim().toLowerCase();

    (async (): Promise<void> => {
      if (isRealGroupId(gid)) {
        try {
          const client: MSGraphClientV3 = await context.msGraphClientFactory.getClient('3');
          const response: { value?: string[] } = await client
            .api('/me/checkMemberGroups')
            .post({ groupIds: [gid] });
          const isMember = (response.value || []).some(v => v.toLowerCase() === gid);
          if (!isMember) {
            if (!cancelled) setState('denied');
            return;
          }
        } catch {
          if (!cancelled) setState('denied');
          return;
        }
      }

      try {
        const [libFolders, docs] = await Promise.all([fetchFolders(), fetchRecentDocuments()]);
        if (cancelled) return;
        setFolders(libFolders);
        setRecent(docs);
        setState('ready');
      } catch (err) {
        if (cancelled) return;
        const status = httpStatus(err);
        setState(status === 401 || status === 403 || status === 404 ? 'denied' : 'error');
      }
    })().catch(() => {
      if (!cancelled) setState('error');
    });

    return () => { cancelled = true; };
  }, [context, groupId, attempt]);

  return { state, folders, recent, retry };
}
