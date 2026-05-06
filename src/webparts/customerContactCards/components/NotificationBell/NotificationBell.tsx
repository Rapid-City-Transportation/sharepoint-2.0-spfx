import * as React from 'react';
import { IconButton, PrimaryButton, DefaultButton } from '@fluentui/react/lib/Button';
import { Callout, DirectionalHint } from '@fluentui/react/lib/Callout';
import { Dialog, DialogType, DialogFooter } from '@fluentui/react/lib/Dialog';
import { FocusZone, FocusZoneTabbableElements } from '@fluentui/react/lib/FocusZone';
import styles from './NotificationBell.module.scss';
import { useNotifications } from '../../hooks/useNotifications';
import { INotificationItem } from '../../services/notificationsService';

export interface INotificationBellProps {
  /** Called when a ProtocolBook notification is clicked. Receives the customer ID as string. */
  onNavigateToCustomer?: (customerId: string) => void;
}

export const NotificationBell: React.FC<INotificationBellProps> = ({ onNavigateToCustomer }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<INotificationItem | null>(null);
  const bellRef = React.useRef<HTMLDivElement>(null);

  const { notifications, unreadCount, loading, error, markAsRead, markAllAsRead } =
    useNotifications(true);

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
          {selectedItem.newValueSnapshot ? (
            <div className={styles.snapshotContent}>
              {htmlToPlainText(selectedItem.newValueSnapshot)}
            </div>
          ) : (
            <div className={styles.snapshotEmpty}>
              No detailed snapshot available for this notification.
            </div>
          )}
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

function htmlToPlainText(html: string): string {
  if (!html) return '';
  // Convert paragraph and line-break tags to newlines BEFORE stripping,
  // so structure is preserved when we extract textContent.
  const withNewlines = html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<\s*li\s*[^>]*>/gi, '• ');
  // Use a temporary element to decode entities and strip remaining tags.
  // innerHTML does not execute scripts, so this is safe even for untrusted input.
  const el = document.createElement('div');
  el.innerHTML = withNewlines;
  const text = el.textContent || el.innerText || '';
  // Collapse runs of 3+ newlines to 2 for tighter spacing.
  return text.replace(/\n{3,}/g, '\n\n').trim();
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
