import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './IncidentReview.module.scss';
import { IIncidentReviewProps } from './IIncidentReviewProps';
import { defaultTheme, getThemeCssVariables } from '../../rapidCityHomepage/theme/ThemeTokens';
import { Navigation } from '../../rapidCityHomepage/components/Navigation/Navigation';
import { Footer } from '../../rapidCityHomepage/components/Footer/Footer';
import { useIncidentReports } from '../hooks/useIncidentReports';
import {
  IIncidentReport,
  ReviewDecision,
  statusOf,
} from '../services/incidentReviewService';
import ReportCard from './ReportCard';

type FilterKey = 'awaiting' | 'reviewed' | 'all';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'awaiting', label: 'Awaiting review' },
  { key: 'reviewed', label: 'Reviewed' },
  { key: 'all', label: 'All' },
];

/**
 * HR's incident review page. Reviewers (anyone holding Override List
 * Behaviors on the Incident Reports list, the permission that lifts its
 * item-level restrictions) get the whole queue with release and keep-with-HR
 * decisions; every other visitor gets a read-only view of the reports they
 * submitted, and their read is scoped to their own user id as well.
 * The page is deliberately absent from the nav: it is reached from the HR
 * notification email or a bookmark.
 */
const IncidentReview: React.FC<IIncidentReviewProps> = () => {
  const themeVars = React.useMemo(
    () => getThemeCssVariables(defaultTheme) as React.CSSProperties,
    []
  );

  const { reports, canReview, loading, error, decide, reload } = useIncidentReports();
  const [filter, setFilter] = React.useState<FilterKey>('awaiting');
  // The id re-keys the live region's text node: two identical decisions in
  // a row produce identical words, and an unchanged node is never announced.
  const [announcement, setAnnouncement] = React.useState<{ id: number; text: string }>({
    id: 0,
    text: '',
  });
  const resultsHeadingRef = React.useRef<HTMLHeadingElement>(null);

  const awaiting = reports.filter(r => statusOf(r) === 'awaiting');
  const released = reports.filter(r => statusOf(r) === 'released');
  const hrOnly = reports.filter(r => statusOf(r) === 'hrOnly');

  const visible: IIncidentReport[] = !canReview
    ? reports
    : filter === 'awaiting'
      ? awaiting
      : filter === 'reviewed'
        ? reports.filter(r => statusOf(r) !== 'awaiting')
        : reports;

  const filterCount = (key: FilterKey): number =>
    key === 'awaiting'
      ? awaiting.length
      : key === 'reviewed'
        ? released.length + hrOnly.length
        : reports.length;

  // In the Awaiting filter a saved decision removes the acted-on card, so
  // focus moves to the results heading; in the other filters the card stays
  // and keeps focus itself. Either way the outcome is announced in words.
  const handleDecision = React.useCallback(
    async (report: IIncidentReport, decision: ReviewDecision): Promise<void> => {
      await decide(report, decision);
      const subject = `${report.incidentType} report from ${report.authorName || report.reporterName}`;
      setAnnouncement(prev => ({
        id: prev.id + 1,
        text:
          decision === 'release'
            ? `${subject} released. The Health & Safety committee will be emailed shortly.`
            : `${subject} marked as reviewed and kept with HR.`,
      }));
      if (filter === 'awaiting') {
        resultsHeadingRef.current?.focus();
      }
    },
    [decide, filter]
  );

  // Naming the filter keeps the text changing (and therefore announced) when
  // two filters happen to hold the same number of reports.
  const activeFilterLabel = FILTERS.filter(f => f.key === filter)[0].label;
  const countText = canReview
    ? `${activeFilterLabel}: ${visible.length} ${visible.length === 1 ? 'report' : 'reports'}.`
    : `${visible.length} ${visible.length === 1 ? 'report' : 'reports'} shown.`;
  const statusMessage = loading
    ? 'Loading incident reports…'
    : error
      ? ''
      : announcement.text || countText;

  return (
    <div className={styles.page} style={themeVars}>
      <a href="#ir-main" className={styles.skipLink}>Skip to main content</a>
      <Navigation activePage="incidentReview" />

      <main id="ir-main" className={styles.main} role="main" tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="ir-title">
          <div className={styles.heroText}>
            <h1 id="ir-title" className={styles.heroTitle}>Incident Review</h1>
            <p className={styles.heroIntro}>
              {canReview
                ? 'Review each new incident report, then release it to the Health & Safety committee or keep it with HR.'
                : 'The incident reports you have submitted, and where each one stands.'}
            </p>
          </div>
        </section>

        {!loading && !error && (
          <p className={styles.infoNote}>
            <Icon iconName="Info" className={styles.infoIcon} aria-hidden="true" />
            <span>
              {canReview
                ? 'Releasing a report emails the Health & Safety committee. Reports about harassment or bullying are confidential: they stay with HR and can never be released.'
                : 'Only you and HR can see the reports you submit. HR reviews every report first.'}
            </span>
          </p>
        )}

        {!loading && !error && canReview && (
          <ul className={styles.statsRow} role="list">
            <li className={styles.statTile}>
              <span className={styles.statValue}>{awaiting.length}</span>
              <span className={styles.statLabel}>Awaiting review</span>
            </li>
            <li className={styles.statTile}>
              <span className={styles.statValue}>{released.length}</span>
              <span className={styles.statLabel}>Released to Health &amp; Safety</span>
            </li>
            <li className={styles.statTile}>
              <span className={styles.statValue}>{hrOnly.length}</span>
              <span className={styles.statLabel}>Kept with HR</span>
            </li>
          </ul>
        )}

        <section className={styles.section} aria-labelledby="ir-results-title">
          <div className={styles.sectionHead}>
            <h2
              id="ir-results-title"
              ref={resultsHeadingRef}
              className={styles.sectionTitle}
              tabIndex={-1}
            >
              <Icon iconName="ReportDocument" className={styles.sectionIcon} aria-hidden="true" />
              {canReview ? 'Reports' : 'Your submitted reports'}
            </h2>

            <div className={styles.toolbar}>
              {canReview && !loading && !error && (
                <div className={styles.filterGroup} role="group" aria-label="Filter reports">
                  {FILTERS.map(f => (
                    <button
                      key={f.key}
                      type="button"
                      className={`${styles.filterButton} ${filter === f.key ? styles.filterButtonActive : ''}`}
                      aria-pressed={filter === f.key}
                      onClick={() => {
                        setFilter(f.key);
                        setAnnouncement(prev => ({ id: prev.id + 1, text: '' }));
                      }}
                    >
                      {f.label} ({filterCount(f.key)})
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                className={styles.refreshButton}
                onClick={() => {
                  setAnnouncement(prev => ({ id: prev.id + 1, text: '' }));
                  reload();
                }}
              >
                <Icon iconName="Refresh" aria-hidden="true" />
                Refresh
              </button>
            </div>
          </div>

          {/* Always mounted: a live region inserted or removed mid-flight is
              not reliably announced, so one element narrates every state. */}
          <p className={styles.statusLine} role="status" aria-live="polite">
            <span key={announcement.id}>{statusMessage}</span>
          </p>

          {error && !loading && (
            <p className={styles.errorCard} role="alert">
              <Icon iconName="Warning" aria-hidden="true" />
              <span>
                Incident reports could not be loaded. You may not have access to the
                list, or it has not been set up yet.
              </span>
            </p>
          )}

          {!loading && !error && visible.length === 0 && (
            <div className={styles.emptyState}>
              <Icon iconName="CheckMark" className={styles.emptyIcon} aria-hidden="true" />
              <p className={styles.emptyText}>
                {!canReview
                  ? 'You have not submitted any incident reports.'
                  : filter === 'awaiting'
                    ? 'Nothing is waiting for review.'
                    : 'No reports match this filter.'}
              </p>
            </div>
          )}

          {!loading && !error && visible.length > 0 && (
            <ul className={styles.reportList} role="list">
              {visible.map(report => (
                <ReportCard
                  key={report.id}
                  report={report}
                  canReview={canReview}
                  onDecision={handleDecision}
                />
              ))}
            </ul>
          )}
        </section>
      </main>

      <Footer pageIdentifier="Incident Review Page" />
    </div>
  );
};

export default IncidentReview;
