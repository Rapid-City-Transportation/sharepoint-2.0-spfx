import * as React from 'react';
import { IconButton, PrimaryButton, DefaultButton } from '@fluentui/react/lib/Button';
import { Callout, DirectionalHint } from '@fluentui/react/lib/Callout';
import { Dialog, DialogType, DialogFooter } from '@fluentui/react/lib/Dialog';
import { FocusZone, FocusZoneTabbableElements } from '@fluentui/react/lib/FocusZone';
import styles from './NotificationBell.module.scss';
import { useNotifications } from '../../hooks/useNotifications';
import { INotificationItem } from '../../services/notificationsService';
import { fetchPreviousVersion } from '../../services/versionsService';
import { PB, IB } from '../../services/fieldNames';
import {
  parseSnapshotSections,
  getOldValueForSection,
  ISnapshotSection,
} from '../../services/snapshotUtils';
import { diffSmart, IDiffPart } from './diffUtils';

export interface INotificationBellProps {
  /** Called when a ProtocolBook notification is clicked. Receives the customer ID as string. */
  onNavigateToCustomer?: (customerId: string) => void;
}

export const NotificationBell: React.FC<INotificationBellProps> = ({ onNavigateToCustomer }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<INotificationItem | null>(null);
  const [previousVersion, setPreviousVersion] = React.useState<Record<string, unknown> | null>(null);
  const [diffLoading, setDiffLoading] = React.useState(false);
  const bellRef = React.useRef<HTMLDivElement>(null);

  const { notifications, unreadCount, loading, error, markAsRead, markAllAsRead } =
    useNotifications(true);

  // When the modal opens for a notification, fetch the previous version of the
  // source row so we can show a diff against the latest snapshot. Falls back
  // to showing just the new value if versioning is off or the fetch fails.
  React.useEffect(() => {
    if (!selectedItem || selectedItem.sourceItemId <= 0) {
      setPreviousVersion(null);
      return;
    }
    const listTitle =
      selectedItem.sourceList === 'ProtocolBook' ? PB.LIST_TITLE : IB.LIST_TITLE;
    let cancelled = false;
    setDiffLoading(true);
    setPreviousVersion(null);
    fetchPreviousVersion(listTitle, selectedItem.sourceItemId)
      .then(prev => {
        if (!cancelled) setPreviousVersion(prev);
      })
      .catch(() => {
        if (!cancelled) setPreviousVersion(null);
      })
      .then(() => {
        if (!cancelled) setDiffLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedItem]);

  const toggle = React.useCallback(() => setIsOpen(prev => !prev), []);
  const close = React.useCallback(() => setIsOpen(false), []);

  const handleItemClick = React.useCallback(
    (item: INotificationItem) => {
      markAsRead(item.id).catch(() => {});
      setSelectedItem(item);
      setIsOpen(false);
    },
    [markAsRead]
  );

  const closeDialog = React.useCallback(() => setSelectedItem(null), []);

  const handleOpenCustomer = React.useCallback(() => {
    if (selectedItem && selectedItem.sourceItemId && onNavigateToCustomer) {
      onNavigateToCustomer(String(selectedItem.sourceItemId));
    }
    setSelectedItem(null);
  }, [selectedItem, onNavigateToCustomer]);

  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);
  const ariaLabel =
    unreadCount === 0
      ? 'Notifications, none unread'
      : `Notifications, ${unreadCount} unread`;

  return (
    <div ref={bellRef} className={styles.bellWrapper}>
      <IconButton
        iconProps={{ iconName: 'Ringer' }}
        ariaLabel={ariaLabel}
        title="Notifications"
        className={styles.bellButton}
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      />
      {unreadCount > 0 && (
        <span className={styles.badge} aria-hidden="true">
          {badgeLabel}
        </span>
      )}

      {isOpen && (
        <Callout
          target={bellRef.current}
          onDismiss={close}
          directionalHint={DirectionalHint.bottomRightEdge}
          isBeakVisible={false}
          gapSpace={6}
          setInitialFocus
          className={styles.callout}
          role="dialog"
          ariaLabel="Notifications"
        >
          <FocusZone
            handleTabKey={FocusZoneTabbableElements.all}
            isCircularNavigation
            className={styles.calloutInner}
          >
            <div className={styles.header}>
              <h2 className={styles.headerTitle}>Notifications</h2>
              <button
                type="button"
                className={styles.markAllBtn}
                onClick={() => markAllAsRead().catch(() => {})}
                disabled={unreadCount === 0}
                aria-label="Mark all notifications as read"
              >
                Mark all read
              </button>
            </div>

            {loading && notifications.length === 0 && (
              <div className={styles.loadingState} role="status" aria-live="polite">
                Loading notifications…
              </div>
            )}

            {error && notifications.length === 0 && (
              <div className={styles.errorState} role="alert">
                {error}
              </div>
            )}

            {!loading && !error && notifications.length === 0 && (
              <div className={styles.empty}>You're all caught up.</div>
            )}

            {notifications.length > 0 && (
              <ul className={styles.list} role="list">
                {notifications.map(n => (
                  <li key={n.id} role="listitem">
                    <button
                      type="button"
                      className={`${styles.itemButton} ${!n.isRead ? styles.itemUnread : ''}`}
                      onClick={() => handleItemClick(n)}
                    >
                      {!n.isRead ? (
                        <span className={styles.unreadDot} aria-label="Unread" />
                      ) : (
                        <span className={styles.unreadDotSpacer} aria-hidden="true" />
                      )}
                      <div className={styles.itemBody}>
                        <div className={styles.itemTitle}>
                          <span
                            className={`${styles.sourceTag} ${
                              n.sourceList === 'ProtocolBook'
                                ? styles.sourceTagProtocolBook
                                : styles.sourceTagInstructionBlock
                            }`}
                          >
                            {n.sourceList === 'ProtocolBook' ? 'Contact Card' : 'Instruction'}
                          </span>
                          {n.sourceList === 'ProtocolBook'
                            ? n.companyName || n.title || 'Unknown customer'
                            : n.title || 'Instruction block'}
                        </div>
                        <div className={styles.itemFields}>
                          {n.changedFields || 'Updated'}
                        </div>
                        <div className={styles.itemMetaRow}>
                          <span className={styles.itemMeta}>{formatRelative(n.changedAt)}</span>
                          <span className={styles.viewDetailsHint} aria-hidden="true">
                            View details ›
                          </span>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </FocusZone>
        </Callout>
      )}

      {selectedItem && (
        <Dialog
          hidden={false}
          onDismiss={closeDialog}
          minWidth={620}
          maxWidth={900}
          dialogContentProps={{
            type: DialogType.normal,
            title: dialogTitle(selectedItem),
          }}
          modalProps={{ isBlocking: false }}
        >
          <div className={styles.detailMeta}>
            <span
              className={`${styles.sourceTag} ${
                selectedItem.sourceList === 'ProtocolBook'
                  ? styles.sourceTagProtocolBook
                  : styles.sourceTagInstructionBlock
              }`}
            >
              {selectedItem.sourceList === 'ProtocolBook' ? 'Contact Card' : 'Instruction'}
            </span>
            <span className={styles.detailMetaSeparator} aria-hidden="true">·</span>
            <span>{selectedItem.changeType} {formatRelative(selectedItem.changedAt)}</span>
          </div>
          {(() => {
            if (diffLoading) {
              return (
                <div className={styles.snapshotContent}>
                  <div className={styles.diffLoadingHint} role="status" aria-live="polite">
                    Loading change history…
                  </div>
                </div>
              );
            }

            // Iterate over the changedFields labels (already filtered to drop
            // phantoms in fetchNotifications) so the modal lists every field
            // the user sees in the dropdown row. Text fields get a diff
            // section; fields without snapshot content (lookups) get a
            // placeholder pointing at the customer page.
            const labels = (selectedItem.changedFields || '')
              .split(', ')
              .map(s => s.trim())
              .filter(Boolean);

            if (labels.length === 0 && !selectedItem.newValueSnapshot) {
              return (
                <div className={styles.snapshotEmpty}>
                  No detailed snapshot available for this notification.
                </div>
              );
            }

            const sectionMap = new Map<string, ISnapshotSection>(
              selectedItem.newValueSnapshot
                ? parseSnapshotSections(
                    selectedItem.newValueSnapshot,
                    selectedItem.sourceList
                  )
                    .filter(s => s.label)
                    .map(s => [s.label, s] as [string, ISnapshotSection])
                : []
            );

            return (
              <div className={styles.snapshotContent}>
                {labels.map((label, i) => {
                  const section = sectionMap.get(label);
                  if (!section) {
                    // Lookup field or field without snapshot content: can't
                    // diff a numeric lookup ID into anything meaningful, so
                    // tell the user where to find the new value.
                    return (
                      <div
                        key={i}
                        className={`${styles.snapshotSection} ${styles.snapshotSectionLabeled}`}
                      >
                        <div className={styles.snapshotLabel}>{label}</div>
                        <div className={styles.snapshotPlaceholder}>
                          This selection changed. Open the customer to see the current value.
                        </div>
                      </div>
                    );
                  }
                  const oldValue = getOldValueForSection(
                    label,
                    selectedItem.sourceList,
                    previousVersion
                  );
                  return (
                    <div
                      key={i}
                      className={`${styles.snapshotSection} ${styles.snapshotSectionLabeled}`}
                    >
                      <div className={styles.snapshotLabel}>{label}</div>
                      {oldValue !== null && oldValue !== section.value ? (
                        <div className={styles.snapshotValue}>
                          {renderDiff(diffSmart(oldValue, section.value))}
                        </div>
                      ) : (
                        <div className={styles.snapshotValue}>{section.value}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
          <DialogFooter>
            {selectedItem.sourceList === 'ProtocolBook' &&
              selectedItem.sourceItemId > 0 &&
              onNavigateToCustomer && (
                <PrimaryButton onClick={handleOpenCustomer} text="Open customer" />
              )}
            <DefaultButton onClick={closeDialog} text="Close" />
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
};

function dialogTitle(item: INotificationItem): string {
  if (item.sourceList === 'ProtocolBook') {
    return item.companyName || item.title || 'Customer updated';
  }
  return item.title ? `Instruction block: ${item.title}` : 'Instruction block updated';
}

/** Render a diff as two stacked lines: "Was" (old value with removed parts
 *  highlighted in red strikethrough) and "Now" (new value with added parts
 *  highlighted in green). Easier to scan than inline word-mixing. */
function renderDiff(parts: IDiffPart[]): JSX.Element {
  // "Was" line = unchanged + removed parts (i.e. what the value used to be)
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

  // "Now" line = unchanged + added parts (i.e. what the value is now)
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

function formatRelative(iso: string): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d} day${d === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString();
}

export default NotificationBell;
