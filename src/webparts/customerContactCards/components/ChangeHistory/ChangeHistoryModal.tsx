import * as React from 'react';
import { Dialog, DialogType, DialogFooter } from '@fluentui/react/lib/Dialog';
import { DefaultButton } from '@fluentui/react/lib/Button';
import styles from './ChangeHistoryModal.module.scss';
import { fetchAllVersions } from '../../services/versionsService';
import { PB, IB } from '../../services/fieldNames';
import {
  computeChangesBetweenVersions,
  IVersionDiff,
  NotificationSourceList,
} from '../../services/snapshotUtils';
import { diffSmart, IDiffPart } from '../NotificationBell/diffUtils';

export interface IChangeHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  sourceItemId: number;
  sourceList: NotificationSourceList;
}

interface ITimelineEntry {
  versionLabel: string;
  createdAt: string;
  changes: IVersionDiff[];
}

const MAX_VERSIONS = 20;

/**
 * Cutoff date for the visible change history. Anything edited before this
 * date is hidden from users — those entries are leftover testing-phase
 * activity and aren't real change history they care about.
 *
 * If you ever need to widen the history window, lower this date.
 * Date constructor uses local time (month is 0-indexed: 4 = May).
 */
const HISTORY_CUTOFF = new Date(2026, 4, 1).getTime();

export const ChangeHistoryModal: React.FC<IChangeHistoryModalProps> = ({
  isOpen,
  onClose,
  customerName,
  sourceItemId,
  sourceList,
}) => {
  const [versions, setVersions] = React.useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const mountedRef = React.useRef(true);
  React.useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  // Fetch versions only when modal opens. Re-fetch if the item or list changes.
  React.useEffect(() => {
    if (!isOpen || sourceItemId <= 0) {
      setVersions([]);
      return;
    }
    const listTitle = sourceList === 'ProtocolBook' ? PB.LIST_TITLE : IB.LIST_TITLE;
    setLoading(true);
    setError(null);
    fetchAllVersions(listTitle, sourceItemId, MAX_VERSIONS)
      .then(v => {
        if (mountedRef.current) setVersions(v);
      })
      .catch(() => {
        if (mountedRef.current) {
          setVersions([]);
          setError('Could not load change history. Please try again.');
        }
      })
      .then(() => {
        if (mountedRef.current) setLoading(false);
      });
  }, [isOpen, sourceItemId, sourceList]);

  // Build the timeline by walking adjacent version pairs. Skip:
  //   - Pairs with no visible changes (phantom saves where SP fired events
  //     but nothing actually changed in plain text or lookup IDs)
  //   - Entries from before the HISTORY_CUTOFF (pre-launch testing noise)
  const timeline = React.useMemo<ITimelineEntry[]>(() => {
    const entries: ITimelineEntry[] = [];
    for (let i = 0; i < versions.length - 1; i++) {
      const newer = versions[i];
      const older = versions[i + 1];
      const createdAt = String(newer.Created || '');
      const ts = new Date(createdAt).getTime();
      if (isNaN(ts) || ts < HISTORY_CUTOFF) continue;
      const changes = computeChangesBetweenVersions(newer, older, sourceList);
      if (changes.length === 0) continue;
      entries.push({
        versionLabel: String(newer.VersionLabel || ''),
        createdAt,
        changes,
      });
    }
    return entries;
  }, [versions, sourceList]);

  if (!isOpen) return null;

  return (
    <Dialog
      hidden={false}
      onDismiss={onClose}
      minWidth={680}
      maxWidth={920}
      dialogContentProps={{
        type: DialogType.normal,
        title: `Change history: ${customerName}`,
      }}
      modalProps={{ isBlocking: false }}
    >
      {loading && versions.length === 0 && (
        <div className={styles.loading} role="status" aria-live="polite">
          Loading change history…
        </div>
      )}

      {!loading && error && (
        <div className={styles.errorBanner} role="alert">
          {error}
        </div>
      )}

      {!loading && !error && timeline.length === 0 && (
        <div className={styles.empty}>
          No change history available.
        </div>
      )}

      {!loading && !error && timeline.length > 0 && (
        <div className={styles.timelineRoot}>
          {timeline.map((entry, i) => (
            <div key={i} className={styles.entry}>
              <div className={styles.entryHeader}>
                <span className={styles.entryDate}>
                  {formatTimestamp(entry.createdAt)}
                </span>
                <span className={styles.entryFieldCount}>
                  {entry.changes.length} field
                  {entry.changes.length === 1 ? '' : 's'} changed
                </span>
              </div>
              {entry.changes.map((change, j) => (
                <div key={j} className={styles.field}>
                  <div className={styles.fieldLabel}>{change.field}</div>
                  {change.type === 'text' ? (
                    renderDiff(diffSmart(change.oldText || '', change.newText || ''))
                  ) : (
                    <div className={styles.fieldPlaceholder}>
                      Reference selection changed.
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <DialogFooter>
        <DefaultButton onClick={onClose} text="Close" />
      </DialogFooter>
    </Dialog>
  );
};

/** Render a diff array as the two-line WAS / NOW layout, with red removals
 *  and green additions. Mirrors the styling used in the notification modal. */
function renderDiff(parts: IDiffPart[]): JSX.Element {
  const wasLine = parts
    .filter(p => p.type !== 'added')
    .map((part, i) =>
      part.type === 'removed' ? (
        <span key={i} className={styles.diffRemoved}>
          {part.text}
        </span>
      ) : (
        <span key={i}>{part.text}</span>
      )
    );

  const nowLine = parts
    .filter(p => p.type !== 'removed')
    .map((part, i) =>
      part.type === 'added' ? (
        <span key={i} className={styles.diffAdded}>
          {part.text}
        </span>
      ) : (
        <span key={i}>{part.text}</span>
      )
    );

  return (
    <div className={styles.diffWrapper}>
      <div className={styles.diffWasLine}>
        <span className={styles.diffLineLabel}>Was:</span>
        <span className={styles.diffLineContent}>{wasLine}</span>
      </div>
      <div className={styles.diffNowLine}>
        <span className={styles.diffLineLabel}>Now:</span>
        <span className={styles.diffLineContent}>{nowLine}</span>
      </div>
    </div>
  );
}

/** Format an ISO timestamp as something readable like "May 7, 2026 at 2:30 PM". */
function formatTimestamp(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${date} at ${time}`;
}

export default ChangeHistoryModal;
