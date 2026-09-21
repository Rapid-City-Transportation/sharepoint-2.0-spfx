import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './IncidentReview.module.scss';
import { IIncidentReport } from '../services/incidentReviewService';
import { exportReportPdf } from '../utils/exportReportPdf';

interface IReportCardProps {
  report: IIncidentReport;
  /** Filing controls render only for reviewers; submitters get a read-only card. */
  canReview: boolean;
  /** Printed on the exported PDF as the person who exported it. */
  viewerName?: string;
  /** Resolves once the change is saved; rejects so the card can show the
   *  failure in place instead of losing the reviewer's context. */
  onFile: (report: IIncidentReport, filed: boolean) => Promise<void>;
}

type CardError = 'save' | 'popup' | null;

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

/**
 * One incident report. Reviewers mark it filed once handled (and can reopen
 * it, since filing sends nothing anywhere); everyone who can see it can
 * export it as a PDF, which is how a single report goes to WSIB or the
 * safety committee.
 */
const ReportCard: React.FC<IReportCardProps> = ({ report, canReview, viewerName, onFile }) => {
  const [pending, setPending] = React.useState(false);
  const [cardError, setCardError] = React.useState<CardError>(null);
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const mounted = React.useRef(true);

  React.useEffect(() => () => { mounted.current = false; }, []);

  const toggleFiled = async (): Promise<void> => {
    if (pending) return;
    setCardError(null);
    setPending(true);
    try {
      await onFile(report, !report.filed);
      // Still mounted means the active filter kept this card on screen. The
      // button that was pressed changed label under the cursor, so focus
      // lands on the card's own title instead of dropping to the page body.
      if (mounted.current) {
        setPending(false);
        titleRef.current?.focus();
      }
    } catch {
      if (mounted.current) {
        setPending(false);
        setCardError('save');
      }
    }
  };

  const handleExport = (): void => {
    setCardError(exportReportPdf(report, viewerName) ? null : 'popup');
  };

  const titleId = `ir-report-${report.id}`;
  const showSeverity = !!report.severity && report.severity !== 'N/A';
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

  return (
    <li className={`${styles.card} ${report.confidential ? styles.cardConfidential : ''}`}>
      <article aria-labelledby={titleId}>
        <header className={styles.cardHeader}>
          <div className={styles.cardHeading}>
            <h3 id={titleId} ref={titleRef} className={styles.cardTitle} tabIndex={-1}>
              {report.incidentType}
            </h3>
            <p className={styles.cardSubmitted}>
              Report #{report.id}, submitted {formatDate(report.submitted)} by {submittedBy}
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
                Injury: {report.severity}
              </span>
            )}
            {report.confidential && (
              <span className={`${styles.pill} ${styles.pillConfidential}`}>
                <Icon iconName="Lock" aria-hidden="true" />
                Confidential
              </span>
            )}
            <span className={`${styles.pill} ${report.filed ? styles.pillFiled : styles.pillAwaiting}`}>
              <Icon iconName={report.filed ? 'CheckMark' : 'Clock'} aria-hidden="true" />
              {report.filed ? 'Filed' : 'New: awaiting review'}
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

        {canReview && report.filed && report.lastChangedBy && (
          <p className={styles.lastChanged}>
            Last changed by {report.lastChangedBy} on {formatDate(report.modified)}
          </p>
        )}

        {canReview && report.confidential && (
          <p className={styles.confidentialNote}>
            <Icon iconName="Lock" aria-hidden="true" />
            <span>
              Harassment and bullying reports are confidential. Share an exported copy
              only with the people who need it.
            </span>
          </p>
        )}

        {cardError && (
          <p className={styles.cardError} role="alert">
            <Icon iconName="Warning" aria-hidden="true" />
            <span>
              {cardError === 'save'
                ? 'This change could not be saved. Check your connection and try again.'
                : 'Your browser blocked the export. Allow pop-ups for this site, then try again.'}
            </span>
          </p>
        )}

        <div className={styles.actions}>
          {canReview && (
            <button
              type="button"
              className={report.filed ? styles.secondaryButton : styles.primaryButton}
              onClick={toggleFiled}
              {...busyAttr}
            >
              {pending ? 'Saving…' : report.filed ? 'Reopen' : 'Mark as filed'}
            </button>
          )}
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={handleExport}
            aria-label={`Export PDF of report ${report.id}`}
          >
            <Icon iconName="PDF" aria-hidden="true" />
            Export PDF
          </button>
        </div>
      </article>
    </li>
  );
};

export default ReportCard;
