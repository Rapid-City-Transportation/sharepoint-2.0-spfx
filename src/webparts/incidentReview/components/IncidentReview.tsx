import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './IncidentReview.module.scss';
import { IIncidentReviewProps } from './IIncidentReviewProps';
import { defaultTheme, getThemeCssVariables } from '../../rapidCityHomepage/theme/ThemeTokens';
import { Navigation } from '../../rapidCityHomepage/components/Navigation/Navigation';
import { Footer } from '../../rapidCityHomepage/components/Footer/Footer';
import { useIncidentReports } from '../hooks/useIncidentReports';
import { IIncidentReport } from '../services/incidentReviewService';
import ReportCard from './ReportCard';

type FilterKey = 'awaiting' | 'filed' | 'all';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'awaiting', label: 'New' },
  { key: 'filed', label: 'Filed' },
  { key: 'all', label: 'All' },
];

/** The whole workflow in three steps, shown to HR on the page itself so
 *  nobody has to remember how it works. */
const STEPS: { title: string; text: string }[] = [
  {
    title: 'A report comes in',
    text: 'Anyone can submit one from the Health & Safety page. HR gets an email, and the report shows up here as New.',
  },
  {
    title: 'Review it',
    text: 'Read the details and follow up with the person if you need more. Nothing is sent anywhere else automatically.',
  },
  {
    title: 'Export and file',
    text: 'If WSIB or the safety committee needs a copy, use Export PDF. Then mark the report as filed.',
  },
];

/**
 * HR's incident review page. Reviewers (anyone holding Override List
 * Behaviors on the Incident Reports list, the permission that lifts its
 * item-level restrictions) get the whole queue with filing controls; every
 * other visitor gets a read-only view of the reports they submitted, and
 * their read is scoped to their own user id as well. The page is deliberately
 * absent from the nav: it is reached from the HR notification email or a
 * bookmark.
 */
const IncidentReview: React.FC<IIncidentReviewProps> = () => {
  const themeVars = React.useMemo(
    () => getThemeCssVariables(defaultTheme) as React.CSSProperties,
    []
  );

  const { reports, canReview, viewerName, loading, error, file, reload } = useIncidentReports();
  const [filter, setFilter] = React.useState<FilterKey>('awaiting');
  // The id re-keys the live region's text node: two identical outcomes in a
  // row produce identical words, and an unchanged node is never announced.
  const [announcement, setAnnouncement] = React.useState<{ id: number; text: string }>({
    id: 0,
    text: '',
  });
  const resultsHeadingRef = React.useRef<HTMLHeadingElement>(null);

  const awaiting = reports.filter(r => !r.filed);
  const filed = reports.filter(r => r.filed);

  const visible: IIncidentReport[] = !canReview
    ? reports
    : filter === 'awaiting'
      ? awaiting
      : filter === 'filed'
        ? filed
        : reports;

  const filterCount = (key: FilterKey): number =>
    key === 'awaiting' ? awaiting.length : key === 'filed' ? filed.length : reports.length;

  // A change that moves the card out of the active filter unmounts it, so
  // focus goes to the results heading; otherwise the card keeps focus itself.
  const handleFile = React.useCallback(
    async (report: IIncidentReport, nowFiled: boolean): Promise<void> => {
      await file(report, nowFiled);
      const subject = `Report ${report.id} (${report.incidentType})`;
      setAnnouncement(prev => ({
        id: prev.id + 1,
        text: nowFiled ? `${subject} marked as filed.` : `${subject} reopened.`,
      }));
      const leavesFilter =
        (filter === 'awaiting' && nowFiled) || (filter === 'filed' && !nowFiled);
      if (leavesFilter) {
        resultsHeadingRef.current?.focus();
      }
    },
    [file, filter]
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
            <h1 id="ir-title" className={styles.heroTitle}>Incident Reports</h1>
            <p className={styles.heroIntro}>
              {canReview
                ? 'Every incident report submitted on Compass comes to HR and lands here.'
                : 'The incident reports you have submitted, and where each one stands.'}
            </p>
          </div>
        </section>

        {!loading && !error && canReview && (
          <section className={styles.stepsSection} aria-labelledby="ir-steps-title">
            <h2 id="ir-steps-title" className={styles.stepsTitle}>How this works</h2>
            <ol className={styles.steps} role="list">
              {STEPS.map((step, i) => (
                <li key={step.title} className={styles.step}>
                  <span className={styles.stepNumber} aria-hidden="true">{i + 1}</span>
                  <div>
                    <h3 className={styles.stepTitle}>{step.title}</h3>
                    <p className={styles.stepText}>{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {!loading && !error && !canReview && (
          <p className={styles.infoNote}>
            <Icon iconName="Info" className={styles.infoIcon} aria-hidden="true" />
            <span>Only you and HR can see the reports you submit.</span>
          </p>
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
                    ? 'No new reports. Everything has been filed.'
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
                  viewerName={viewerName}
                  onFile={handleFile}
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
