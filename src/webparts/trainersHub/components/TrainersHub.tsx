import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './TrainersHub.module.scss';
import { ITrainersHubProps } from './ITrainersHubProps';
import {
  defaultTheme,
  getThemeCssVariables,
} from '../../rapidCityHomepage/theme/ThemeTokens';
import { Footer } from '../../rapidCityHomepage/components/Footer/Footer';
import { Navigation } from '../../rapidCityHomepage/components/Navigation/Navigation';

interface ITool {
  label: string;
  icon: string;
  /** Optional iframe URL — loads inline in the Tool Viewer. */
  embedUrl?: string;
  /** Optional external URL — opens in a popup (forms that block iframes). */
  href?: string;
}

const CALL_MONITORING_URL =
  'https://rapidcitytransport.sharepoint.com/sites/Management' +
  '/Lists/Call%20Monitoring/AllItems.aspx?env=Embedded';

const TRAINING_MATRIX_URL =
  'https://rapidcitytransport.sharepoint.com/sites/CSQCLeads' +
  '/Lists/Trainee%20Progress/AllItems.aspx' +
  '?viewid=63695170-c212-4942-82c5-351532a7b552' +
  '&TeamsCID=8195e8e5-7b8f-4f1e-bcd6-8482c285f27b' +
  '&env=Embedded';

const TRAINING_PLANNER_URL =
  'https://planner.cloud.microsoft/webui/plan/5-zSDZl3pEK06OI7cklDr2UAHaz3' +
  '/view/board?tid=34bc8c97-72c3-45ec-8ae9-cd59696bf22b';

const TOOLS: ITool[] = [
  { label: 'Training Calendar',  icon: 'Calendar'        },
  { label: 'Training Matrix',    icon: 'TableGroup',     embedUrl: TRAINING_MATRIX_URL },
  { label: 'Call Monitoring',    icon: 'Headset',        embedUrl: CALL_MONITORING_URL },
  { label: 'Training Planner',   icon: 'ReadingMode',    href:     TRAINING_PLANNER_URL },
  { label: 'Quizzes',            icon: 'TestSuite'       },
  { label: 'Quiz Results',       icon: 'AnalyticsReport' },
];

const WEEKLY_UPDATES: string[] = [
  'Trainer huddle Tuesday at 10 AM in the training room.',
  'Quiz reviews are due Friday by end of day.',
  'New-hire cohort kickoff next Monday. Please confirm room booking.',
  'Refresh your training matrix bookmarks this week.',
];

const WEEKLY_PILLS: Array<{ label: string; tone: 'amber' | 'red' | 'blue' }> = [
  { label: '3 quizzes pending review', tone: 'amber' },
  { label: '1 matrix update overdue',  tone: 'red'   },
  { label: 'Trainer sync Tue 10 AM',   tone: 'blue'  },
];

const TrainersHub: React.FC<ITrainersHubProps> = ({ weekTitle, weekDateRange }) => {
  const themeVars = React.useMemo(
    () => getThemeCssVariables(defaultTheme) as React.CSSProperties,
    []
  );

  const [activeTool, setActiveTool] = React.useState<ITool | null>(null);

  /** Full URL for the active tool — same as the embedded view minus the
   *  iframe-only query params (env=Embedded, action=embedview). Used by
   *  the "Open full" button to launch the natural full experience. */
  const activeToolFullUrl = React.useMemo<string | undefined>(() => {
    if (!activeTool) return undefined;
    const raw = activeTool.embedUrl || activeTool.href;
    if (!raw) return undefined;
    try {
      const u = new URL(raw);
      u.searchParams.delete('env');
      u.searchParams.delete('action');
      return u.toString();
    } catch {
      return raw;
    }
  }, [activeTool]);

  const handleOpenFull = React.useCallback((): void => {
    if (!activeToolFullUrl) return;
    window.open(activeToolFullUrl, '_blank', 'noopener,noreferrer');
  }, [activeToolFullUrl]);

  const handleNavSearch = React.useCallback((query: string): void => {
    const q = (query || '').trim();
    const url = q
      ? `/SitePages/ContactCards.aspx?q=${encodeURIComponent(q)}`
      : '/SitePages/ContactCards.aspx';
    window.location.assign(url);
  }, []);

  const pageId = activeTool
    ? `Trainers Hub — ${activeTool.label}`
    : 'Trainers Hub Page';

  return (
    <div className={styles.hub} style={themeVars}>
      <Navigation onSearch={handleNavSearch} activePage="departmentHub" />

      <div className={styles.layout}>
        <main className={styles.mainColumn}>

          <div className={styles.weeklyRow}>
            <article className={styles.weeklyFocusCard} aria-labelledby="trh-focus-title">
              <span className={styles.weeklyFocusEyebrow}>Weekly Focus</span>
              <h2 id="trh-focus-title" className={styles.weeklyFocusTitle}>
                {weekTitle}
              </h2>
              <p className={styles.weeklyFocusDate}>{weekDateRange}</p>
            </article>

            <section className={styles.weeklyUpdatesCard} aria-labelledby="trh-updates-title">
              <h3 id="trh-updates-title" className={styles.weeklyUpdatesTitle}>
                Weekly updates
              </h3>
              <ul className={styles.weeklyUpdatesList}>
                {WEEKLY_UPDATES.map((u, i) => (
                  <li key={i}>{u}</li>
                ))}
              </ul>
              <div className={styles.weeklyPillsRow}>
                {WEEKLY_PILLS.map((p) => (
                  <span
                    key={p.label}
                    className={`${styles.weeklyPill} ${styles[`weeklyPill_${p.tone}`]}`}
                  >
                    {p.label}
                  </span>
                ))}
              </div>
            </section>
          </div>

          <section className={styles.toolViewerCard} aria-labelledby="trh-viewer-title">
            <header className={styles.toolViewerHeader}>
              <div className={styles.toolViewerHeaderLeft}>
                <Icon iconName="ViewListGroup" className={styles.toolViewerHeaderIcon} aria-hidden="true" />
                <div>
                  <p className={styles.toolViewerEyebrow}>Tool Viewer</p>
                  <h3 id="trh-viewer-title" className={styles.toolViewerTitle}>
                    Select a tool from the right
                  </h3>
                </div>
              </div>
            </header>

            <div
              className={`${styles.toolViewerBody} ${activeTool ? styles.toolViewerBodyActive : ''}`}
              aria-live="polite"
            >
              {!activeTool && (
                <span className={styles.placeholderHint}>
                  Pick a tool from the right to view it here.
                </span>
              )}

              {activeTool && (
                <div className={styles.toolContent}>
                  <header className={styles.toolContentHeader}>
                    <div className={styles.toolContentTitleGroup}>
                      <span className={styles.toolContentEyebrow}>Now viewing</span>
                      <h4 className={styles.toolContentTitle}>{activeTool.label}</h4>
                    </div>
                    <div className={styles.toolContentActions}>
                      {activeToolFullUrl && (
                        <button
                          type="button"
                          onClick={handleOpenFull}
                          className={styles.toolViewerOpenFull}
                          aria-label={`Open ${activeTool.label} in a new tab`}
                        >
                          Open full <Icon iconName="OpenInNewTab" aria-hidden="true" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveTool(null)}
                        className={styles.toolContentClose}
                        aria-label="Close tool"
                      >
                        <Icon iconName="Cancel" />
                      </button>
                    </div>
                  </header>

                  {activeTool.embedUrl ? (
                    <iframe
                      title={`${activeTool.label} — embedded view`}
                      src={activeTool.embedUrl}
                      className={styles.toolContentFrame}
                      loading="lazy"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allow="clipboard-read; clipboard-write"
                    />
                  ) : (
                    <div className={styles.toolContentComingSoon}>
                      <Icon iconName="ConstructionCone" className={styles.comingSoonIcon} aria-hidden="true" />
                      <p className={styles.comingSoonText}>
                        <strong>{activeTool.label}</strong> isn’t wired up yet.
                        Once it is, its content will load right here in the viewer.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </main>

        <aside className={styles.sidebar} aria-label="Trainer tools">
          <section className={styles.toolsPanel} aria-labelledby="trh-tools-title">
            <div className={styles.panelHeader}>
              <h3 id="trh-tools-title" className={styles.panelTitle}>Tools</h3>
              <button type="button" className={styles.panelMore} aria-label="Tool panel options">
                ⋯
              </button>
            </div>
            <ul className={styles.toolsGrid} role="list">
              {TOOLS.map((tool) => {
                const isActive = activeTool?.label === tool.label;
                return (
                  <li key={tool.label}>
                    <button
                      type="button"
                      onClick={() => {
                        if (tool.href) {
                          window.open(
                            tool.href,
                            '_blank',
                            'popup,width=900,height=900,scrollbars=yes,resizable=yes'
                          );
                        } else {
                          setActiveTool(tool);
                        }
                      }}
                      className={`${styles.toolTile} ${isActive ? styles.toolTileActive : ''}`}
                      aria-pressed={isActive}
                    >
                      <span className={styles.toolIcon} aria-hidden="true">
                        <Icon iconName={tool.icon} />
                      </span>
                      <span className={styles.toolLabel}>{tool.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </aside>
      </div>

      <Footer pageIdentifier={pageId} />
    </div>
  );
};

export default TrainersHub;
