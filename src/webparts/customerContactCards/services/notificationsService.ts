import '@pnp/sp/site-users/web';
import { getSP } from './spConfig';
import { CCN, CCNR, PB, IB } from './fieldNames';
import { fetchVersionPair } from './versionsService';
import { hasVisibleChange, filterRealChangedFields } from './snapshotUtils';

export type NotificationSourceList = 'ProtocolBook' | 'InstructionBlock';

export interface INotificationItem {
  id: number;
  title: string;
  sourceList: NotificationSourceList;
  sourceItemId: number;
  companyName: string | null;
  changedFields: string;
  summary: string | null;
  newValueSnapshot: string | null;
  changeType: string;
  changedAt: string;
  isRead: boolean;
}

export interface IFetchNotificationsOptions {
  /** Only return notifications created within the last N days. Default 30. */
  days?: number;
  /** Maximum rows to return. Default 50. */
  top?: number;
}

const DEFAULT_DAYS = 30;
const DEFAULT_TOP = 50;

let cachedUserId: number | undefined;

/** Get the current user's site ID (cached for the session). */
export async function getCurrentUserId(): Promise<number> {
  if (cachedUserId !== undefined) return cachedUserId;
  const sp = getSP();
  const user = await sp.web.currentUser();
  cachedUserId = user.Id;
  return cachedUserId;
}

/** Fetch recent notifications, joined with the current user's read receipts. */
export async function fetchNotifications(
  opts: IFetchNotificationsOptions = {}
): Promise<INotificationItem[]> {
  const days = opts.days ?? DEFAULT_DAYS;
  const top = opts.top ?? DEFAULT_TOP;
  const sp = getSP();
  const userId = await getCurrentUserId();

  const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const [rawNotifs, readMap] = await Promise.all([
    sp.web.lists
      .getByTitle(CCN.LIST_TITLE)
      .items.select(
        CCN.Id,
        CCN.Title,
        CCN.Created,
        CCN.Modified,
        CCN.SourceList,
        CCN.SourceItemId,
        CCN.CompanyName,
        CCN.ChangedFields,
        CCN.Summary,
        CCN.NewValueSnapshot,
        CCN.ChangeType,
        CCN.ChangedAt
      )
      .filter(`${CCN.Created} ge datetime'${sinceIso}'`)
      .orderBy(CCN.Created, false)
      .top(top)(),
    fetchReadReceipts(userId),
  ]);

  const mapped: INotificationItem[] = rawNotifs.map((raw: Record<string, unknown>) => {
    const id = raw[CCN.Id] as number;
    const modifiedIso = (raw[CCN.Modified] as string) || (raw[CCN.Created] as string) || '';
    const readAtIso = readMap.get(id);
    // A notification is "read" only if the latest read receipt is at or after the
    // notification's last modification. If the row was updated by Power Automate
    // after the user marked it read (debounce upsert merging in new changes),
    // treat it as unread again — there's new content to see.
    const isRead = !!readAtIso && (!modifiedIso || readAtIso >= modifiedIso);
    return {
      id,
      title: (raw[CCN.Title] as string) || '',
      sourceList: ((raw[CCN.SourceList] as string) || 'ProtocolBook') as NotificationSourceList,
      sourceItemId: (raw[CCN.SourceItemId] as number) || 0,
      companyName: (raw[CCN.CompanyName] as string) || null,
      changedFields: (raw[CCN.ChangedFields] as string) || '',
      summary: (raw[CCN.Summary] as string) || null,
      newValueSnapshot: (raw[CCN.NewValueSnapshot] as string) || null,
      changeType: (raw[CCN.ChangeType] as string) || 'Updated',
      changedAt: modifiedIso,
      isRead,
    };
  });

  // Filter out "phantom" notifications: cases where SharePoint fired a change
  // event (so PA wrote the notification row) but the visible plain-text content
  // is identical to the previous version. Common with rich-text fields where
  // SP saves trigger HasColumnChanged for invisible HTML/encoding diffs.
  //
  // We check each notification in parallel by fetching its source row's
  // previous version and comparing snapshots. Notifications with no
  // sourceItemId, no snapshot, or no previous version are kept (we can't
  // prove they're phantoms).
  const filtered = await Promise.all(
    mapped.map(async item => {
      if (!item.newValueSnapshot || item.sourceItemId <= 0) return item;
      const listTitle = item.sourceList === 'ProtocolBook' ? PB.LIST_TITLE : IB.LIST_TITLE;
      const pair = await fetchVersionPair(listTitle, item.sourceItemId);
      const previous = pair ? pair.previous : null;
      const current = pair ? pair.current : null;
      if (!hasVisibleChange(item.newValueSnapshot, item.sourceList, previous)) {
        return null;
      }
      // Drop phantom labels from changedFields so the dropdown matches what
      // the modal actually renders. Catches both:
      //   - Text fields where SP fired but the visible text didn't differ
      //   - Lookup fields where SP fired but the lookup ID didn't change
      const realChangedFields = filterRealChangedFields(
        item.changedFields,
        item.newValueSnapshot,
        item.sourceList,
        previous,
        current
      );
      // If the entire changedFields list collapses to nothing after phantom
      // filtering, drop the notification — there's nothing meaningful left.
      if (!realChangedFields) return null;
      return { ...item, changedFields: realChangedFields };
    })
  );
  return filtered.filter((item): item is INotificationItem => item !== null);
}

/** Fetch this user's read receipts as a map of notificationId → latest ReadAt timestamp. */
async function fetchReadReceipts(userId: number): Promise<Map<number, string>> {
  const sp = getSP();
  const rows: Record<string, unknown>[] = await sp.web.lists
    .getByTitle(CCNR.LIST_TITLE)
    .items.select(CCNR.NotificationId, CCNR.ReadAt)
    .filter(`${CCNR.User}Id eq ${userId}`)
    .top(5000)();

  const map = new Map<number, string>();
  for (const row of rows) {
    const nid = row[CCNR.NotificationId];
    const readAt = row[CCNR.ReadAt];
    if (typeof nid !== 'number' || typeof readAt !== 'string') continue;
    // If multiple receipts exist for the same notification (re-reads after updates),
    // keep the latest one.
    const existing = map.get(nid);
    if (!existing || readAt > existing) {
      map.set(nid, readAt);
    }
  }
  return map;
}

/** Write a read receipt for one notification. Idempotent at the UX layer (no-op if already read). */
export async function markNotificationRead(notificationId: number): Promise<void> {
  const sp = getSP();
  const userId = await getCurrentUserId();
  await sp.web.lists.getByTitle(CCNR.LIST_TITLE).items.add({
    Title: `${userId}-${notificationId}`,
    [CCNR.NotificationId]: notificationId,
    [`${CCNR.User}Id`]: userId,
    [CCNR.ReadAt]: new Date().toISOString(),
  });
}

/** Mark a batch of notifications as read. Errors on individual rows are swallowed
 *  so a single duplicate-row failure doesn't abort the rest. */
export async function markNotificationsRead(notificationIds: number[]): Promise<void> {
  await Promise.all(
    notificationIds.map(id => markNotificationRead(id).catch(() => undefined))
  );
}
