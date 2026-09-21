import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './IncidentReview.module.scss';
import {
  IIncidentReport,
  ReviewDecision,
  statusOf,
} from '../services/incidentReviewService';

interface IReportCardProps {
  report: IIncidentReport;
  /** Review controls render only for reviewers; submitters get a read-only card. */
  canReview: boolean;
  /** Resolves once the decision is saved; rejects so the card can show the
   *  failure in place instead of losing the reviewer's context. */
  onDecision: (report: IIncidentReport, decision: ReviewDecision) => Promise<void>;
}

function formatDate(iso?: string): string {
  if (!iso) return 'Not specified';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
}

/** ReporterEmail is free text. Anything that is not a bare address (for
 *  example one carrying ?bcc= or &subject=) is shown as text, never linked,
 *  so a reply from HR cannot be steered to hidden recipients. */
function isPlainEmail(value?: string): value is string {
  return !!value && /^[^\s@?&<>"']+@[^\s@?&<>"']+\.[^\s@?&<>"']+$/.test(value);
}

function statusText(report: IIncidentReport): string {
  const status = statusOf(report);
  if (status === 'awaiting') return 'Awaiting HR review';
  if (status === 'released') {
    // hsNotified is the release flow's own sent-marker; false means the
    // email has not gone out yet, undefined means the list does not track it.
    return report.hsNotified === false
      ? 'Released: committee email pending'
      : 'Released to Health & Safety';
  }
  return report.confidential ? 'Reviewed: confidential, HR only' : 'Reviewed: HR only';
}

/**
 * One incident report. For reviewers it turns the list's raw review
 * checkboxes into two decisions: release to the Health & Safety committee
 * (confirmed first, because it sends an email that cannot be recalled) or
 * keep with HR. Confidential reports never offer release at all, so the rule
 * cannot be broken from this page.
 */
const ReportCard: React.FC<IReportCardProps> = ({ report, canReview, onDecision }) => {
  const [confirming, setConfirming] = React.useState(false);
  const [pending, setPending] = React.useState<ReviewDecision | null>(null);
  const [failed, setFailed] = React.useState(false);
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const confirmRef = React.useRef<HTMLButtonElement>(null);
  const releaseRef = React.useRef<HTMLButtonElement>(null);
  const restoreFocus = React.useRef(false);
  const mounted = React.useRef(true);

  React.useEffect(() => () => { mounted.current = false; }, []);

  // Opening the confirmation swaps the buttons under the reviewer's cursor,
  // so focus follows into it, and comes back to Release when they cancel.
  React.useEffect(() => {
    if (confirming) {
      confirmRef.current?.focus();
    } else if (restoreFocus.current) {
      restoreFocus.current = false;
      releaseRef.current?.focus();
    }
  }, [confirming]);

  const run = async (decision: ReviewDecision): Promise<void> => {
    if (pending) return;
    setFailed(false);
    setPending(decision);
    try {
      await onDecision(report, decision);
      // Still mounted means the active filter kept this card on screen. The
      // button that was pressed is gone now, so focus lands on the card's
      // own title instead of dropping to the page body.
      if (mounted.current) {
        setPending(null);
        setConfirming(false);
        titleRef.current?.focus();
      }
    } catch {
      if (mounted.current) {
        setPending(null);
        setFailed(true);
      }
    }
  };

  const status = statusOf(report);
  const titleId = `ir-report-${report.id}`;
  const confirmTextId = `ir-confirm-${report.id}`;
  const showSeverity = !!report.severity && report.severity !== 'N/A';
  const canRelease = canReview && !report.confidential && status !== 'released';
  const canKeep = canReview && status === 'awaiting';
  // aria-disabled instead of disabled: a disabled button drops keyboard focus
  // to the page body while the save is in flight.
  const busyAttr = pending ? ({ 'aria-disabled': 'true' as const }) : {};

  // The account that created the row is the identity HR can trust; the name
  // typed on the form is shown beside it only when the two disagree.
  const submittedBy = report.authorName || report.reporterName;
  const nameDiffers =
    !!report.authorName &&
    report.reporterName.toLowerCase() !== report.authorName.toLowerCase();
  const contactEmail = isPlainEmail(report.reporterEmail)
    ? report.reporterEmail
    : isPlainEmail(report.authorEmail)
      ? report.authorEmail
      : undefined;

  const statusPillClass =
    status === 'awaiting'
      ? styles.pillAwaiting
      : status === 'released'
        ? styles.pillReleased
        : styles.pillHrOnly;

  return (
    <li className={`${styles.card} ${report.confidential ? styles.cardConfidential : ''}`}>
      <article aria-labelledby={titleId}>
        <header className={styles.cardHeader}>
          <div className={styles.cardHeading}>
            <h3 id={titleId} ref={titleRef} className={styles.cardTitle} tabIndex={-1}>
              {report.incidentType}
            </h3>
            <p className={styles.cardSubmitted}>
              Submitted {formatDate(report.submitted)} by {submittedBy}
              {nameDiffers ? ` (name on report: ${report.reporterName})` : ''}
            </p>
          </div>
          <div className={styles.pillRow}>
            {showSeverity && (
              <span
                className={`${styles.pill} ${
                  report.severity === 'Critical' ? styles.pillCritical : styles.pillSeverity
                }`}
              >
                Severity: {report.severity}
              </span>
            )}
            {report.confidential && (
              <span className={`${styles.pill} ${styles.pillConfidential}`}>
                <Icon iconName="Lock" aria-hidden="true" />
                Confidential
              </span>
            )}
            <span className={`${styles.pill} ${statusPillClass}`}>
              <Icon iconName={status === 'awaiting' ? 'Clock' : 'CheckMark'} aria-hidden="true" />
              {statusText(report)}
            </span>
          </div>
        </header>

        <dl className={styles.metaGrid}>
          <div>
            <dt className={styles.metaTerm}>Incident date</dt>
            <dd className={styles.metaValue}>{formatDate(report.incidentDate)}</dd>
          </div>
          <div>
            <dt className={styles.metaTerm}>Location</dt>
            <dd className={styles.metaValue}>{report.location || 'Not specified'}</dd>
          </div>
          <div>
            <dt className={styles.metaTerm}>Reporter email</dt>
            <dd className={styles.metaValue}>
              {contactEmail ? (
                <a className={styles.metaLink} href={`mailto:${contactEmail}`}>
                  {contactEmail}
                </a>
              ) : (
                report.reporterEmail || 'Not provided'
              )}
            </dd>
          </div>
        </dl>

        <div className={styles.bodyBlock}>
          <h4 className={styles.bodyLabel}>What happened</h4>
          <p className={styles.bodyText}>{report.description || 'No description provided.'}</p>
        </div>
        <div className={styles.bodyColumns}>
          <div className={styles.bodyBlock}>
            <h4 className={styles.bodyLabel}>Witnesses</h4>
            <p className={styles.bodyText}>{report.witnesses || 'None reported'}</p>
          </div>
          <div className={styles.bodyBlock}>
            <h4 className={styles.bodyLabel}>Immediate action taken</h4>
            <p className={styles.bodyText}>{report.immediateAction || 'None reported'}</p>
          </div>
        </div>

        {canReview && status !== 'awaiting' && report.lastChangedBy && (
          <p className={styles.lastChanged}>
            Last changed by {report.lastChangedBy} on {formatDate(report.modified)}
          </p>
        )}

        {canReview && report.confidential && status === 'awaiting' && (
          <p className={styles.confidentialNote}>
            <Icon iconName="Lock" aria-hidden="true" />
            <span>
              Harassment and bullying reports stay with HR. This report is never sent
              to the Health &amp; Safety committee.
            </span>
          </p>
        )}

        {failed && (
          <p className={styles.cardError} role="alert">
            <Icon iconName="Warning" aria-hidden="true" />
            <span>This change could not be saved. Check your connection and try again.</span>
          </p>
        )}

        {(canRelease || canKeep) && !confirming && (
          <div className={styles.actions}>
            {canRelease && (
              <button
                ref={releaseRef}
                type="button"
                className={styles.primaryButton}
                onClick={() => { if (!pending) setConfirming(true); }}
                {...busyAttr}
              >
                Release to Health &amp; Safety
              </button>
            )}
            {canKeep && (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => run('hrOnly')}
                {...busyAttr}
              >
                {pending === 'hrOnly'
                  ? 'Saving…'
                  : report.confidential
                    ? 'Mark as reviewed'
                    : 'Keep with HR only'}
              </button>
            )}
          </div>
        )}

        {canRelease && confirming && (
          <div className={styles.confirmRow} role="group" aria-label="Release confirmation">
            <p id={confirmTextId} className={styles.confirmText}>
              Releasing emails this report to the Health &amp; Safety committee. This
              cannot be undone.
            </p>
            <div className={styles.actions}>
              {/* Focus jumps straight to this button, past the warning above,
                  so the warning is attached to it as its description. */}
              <button
                ref={confirmRef}
                type="button"
                className={styles.primaryButton}
                onClick={() => run('release')}
                aria-describedby={confirmTextId}
                {...busyAttr}
              >
                {pending === 'release' ? 'Releasing…' : 'Confirm release'}
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  if (pending) return;
                  restoreFocus.current = true;
                  setConfirming(false);
                }}
                {...busyAttr}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </article>
    </li>
  );
};

export default ReportCard;
