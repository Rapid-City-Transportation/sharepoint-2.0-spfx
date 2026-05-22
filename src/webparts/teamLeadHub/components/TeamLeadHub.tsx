import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './TeamLeadHub.module.scss';
import { ITeamLeadHubProps } from './ITeamLeadHubProps';
import {
  defaultTheme,
  getThemeCssVariables,
} from '../../rapidCityHomepage/theme/ThemeTokens';
import { Footer } from '../../rapidCityHomepage/components/Footer/Footer';
import { Navigation } from '../../rapidCityHomepage/components/Navigation/Navigation';

// ────────────────────────────────────────────────────────────────
// Static content
// ────────────────────────────────────────────────────────────────

interface ITool {
  label: string;
  icon: string;
  /** Optional iframe URL — when set, clicking the tile loads the URL
   *  inline in the Tool Viewer instead of the "coming soon" message. */
  embedUrl?: string;
}

// ── Existing SharePoint list views wired into the Team Lead Hub ──

// Complaints reviewed by department managers — lives under /sites/Management.
const COMPLAINTS_DEPT_MANAGERS_URL =
  'https://rapidcitytransport.sharepoint.com/sites/Management' +
  '/Lists/Complaints%20%20Department%20Managers/AllItems1.aspx' +
  '?viewid=814acf08-9639-490f-abe2-b1592e304aa6&env=Embedded';

// QC Error Log — lives on the root site.
const QC_ERROR_LOG_URL =
  'https://rapidcitytransport.sharepoint.com' +
  '/Lists/QC%20Error%20Log/AllItems.aspx?env=Embedded';

// Attendance Tracker — lives on the root site.
const ATTENDANCE_TRACKER_URL =
  'https://rapidcitytransport.sharepoint.com' +
  '/Lists/Attendance%20Tracker/AllItems.aspx?env=Embedded';

const TOOLS: ITool[] = [
  { label: 'TL Assignment',        icon: 'AccountManagement' },
  { label: 'CX Calendar',          icon: 'Calendar'       },
  { label: 'Complaints Log',       icon: 'Warning',        embedUrl: COMPLAINTS_DEPT_MANAGERS_URL },
  { label: 'Error Log',            icon: 'ErrorBadge',     embedUrl: QC_ERROR_LOG_URL            },
  { label: 'Productivity Report',  icon: 'ReportDocument' },
  { label: 'Call Monitoring Form', icon: 'Headset'        },
  { label: 'One on One Form',      icon: 'Group'          },
  { label: 'Weekly Efficiency',    icon: 'AreaChart'      },
  { label: 'Attendance Log',       icon: 'CalendarAgenda', embedUrl: ATTENDANCE_TRACKER_URL     },
];

// Weekly updates — deliberately hyphen-free phrasing per the brief.
const WEEKLY_UPDATES: string[] = [
  'Team huddle Tuesday at 9 AM in the lounge.',
  'Attendance reports are due Friday by end of day.',
  'Coaching one on ones start next week. Please confirm your slots.',
  'Refresh your knowledge base bookmarks this week.',
];

// Pills sit below the bullet list. Keep them short and scannable.
const WEEKLY_PILLS: Array<{ label: string; tone: 'amber' | 'red' | 'blue' }> = [
  { label: '4 pending one on ones', tone: 'amber' },
  { label: '2 reports outstanding', tone: 'red'   },
  { label: 'Team sync Tue 9 AM',    tone: 'blue'  },
];

// ────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────

const TeamLeadHub: React.FC<ITeamLeadHubProps> = ({ weekTitle, weekDateRange }) => {
  const themeVars = React.useMemo(
    () => getThemeCssVariables(defaultTheme) as React.CSSProperties,
    []
  );

  const [activeTool, setActiveTool] = React.useState<ITool | null>(null);

  const handleNavSearch = React.useCallback((query: string): void => {
    const q = (query || '').trim();
    const url = q
      ? `/SitePages/ContactCards.aspx?q=${encodeURIComponent(q)}`
      : '/SitePages/ContactCards.aspx';
    window.location.assign(url);
  }, []);

  const pageId = activeTool
    ? `Team Lead Hub — ${activeTool.label}`
    : 'Team Lead Hub Page';

  return (
    <div className={styles.hub} style={themeVars}>
      <Navigation onSearch={handleNavSearch} activePage="departmentHub" />

      <div className={styles.layout}>
        {/* ─────────────────────────── Main column ─────────────────────────── */}
        <main className={styles.mainColumn}>

          {/* ── Weekly Focus + Weekly Updates row ── */}
          <div className={styles.weeklyRow}>
            <article className={styles.weeklyFocusCard} aria-labelledby="tlh-focus-title">
              <span className={styles.weeklyFocusEyebrow}>Weekly Focus</span>
              <h2 id="tlh-focus-title" className={styles.weeklyFocusTitle}>
                {weekTitle}
              </h2>
              <p className={styles.weeklyFocusDate}>{weekDateRange}</p>
            </article>

            <section className={styles.weeklyUpdatesCard} aria-labelledby="tlh-updates-title">
              <h3 id="tlh-updates-title" className={styles.weeklyUpdatesTitle}>
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

          {/* ── Tool Viewer ── */}
          <section className={styles.toolViewerCard} aria-labelledby="tlh-viewer-title">
            <header className={styles.toolViewerHeader}>
              <div className={styles.toolViewerHeaderLeft}>
                <Icon iconName="ViewListGroup" className={styles.toolViewerHeaderIcon} aria-hidden="true" />
                <div>
                  <p className={styles.toolViewerEyebrow}>Tool Viewer</p>
                  <h3 id="tlh-viewer-title" className={styles.toolViewerTitle}>
                    {activeTool ? activeTool.label : 'Select a tool from the right'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                className={styles.toolViewerOpenFull}
                disabled={!activeTool}
                aria-label="Open the active tool in a new tab"
              >
                Open full <Icon iconName="OpenInNewTab" aria-hidden="true" />
              </button>
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
                    <button
                      type="button"
                      onClick={() => setActiveTool(null)}
                      className={styles.toolContentClose}
                      aria-label="Close tool"
                    >
                      <Icon iconName="Cancel" />
                    </button>
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

        {/* ─────────────────────────── Sidebar ─────────────────────────── */}
        <aside className={styles.sidebar} aria-label="Team lead tools">
          <section className={styles.toolsPanel} aria-labelledby="tlh-tools-title">
            <div className={styles.panelHeader}>
              <h3 id="tlh-tools-title" className={styles.panelTitle}>Tools</h3>
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
                      onClick={() => setActiveTool(tool)}
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

export default TeamLeadHub;
