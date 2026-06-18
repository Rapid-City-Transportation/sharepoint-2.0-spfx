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
import { useAnnouncements } from '../../rapidCityHomepage/hooks/useAnnouncements';
import { getCurrentWeek } from '../../rapidCityHomepage/services/weekUtils';

interface ITool {
  label: string;
  icon: string;
  /** Optional iframe URL: when set, clicking the tile loads the URL
   *  inline in the Tool Viewer instead of the "coming soon" message. */
  embedUrl?: string;
  /** Optional external URL: when set, clicking the tile opens this URL
   *  in a popup window instead of loading it inline. Used for forms
   *  hosted outside SharePoint (e.g. Microsoft Forms) that don't iframe
   *  well due to X-Frame-Options. */
  href?: string;
}

// Existing SharePoint list views wired into the Team Lead Hub.

// Complaints reviewed by department managers: lives under /sites/Management.
const COMPLAINTS_DEPT_MANAGERS_URL =
  'https://rapidcitytransport.sharepoint.com/sites/Management' +
  '/Lists/Complaints%20%20Department%20Managers/AllItems1.aspx' +
  '?viewid=814acf08-9639-490f-abe2-b1592e304aa6&env=Embedded';

// QC Error Log: lives on the root site.
const QC_ERROR_LOG_URL =
  'https://rapidcitytransport.sharepoint.com' +
  '/Lists/QC%20Error%20Log/AllItems.aspx?env=Embedded';

// Attendance Tracker: lives on the root site.
const ATTENDANCE_TRACKER_URL =
  'https://rapidcitytransport.sharepoint.com' +
  '/Lists/Attendance%20Tracker/AllItems.aspx?env=Embedded';

// Call Monitoring: lives under /sites/Management.
const CALL_MONITORING_URL =
  'https://rapidcitytransport.sharepoint.com/sites/Management' +
  '/Lists/Call%20Monitoring/AllItems.aspx?env=Embedded';

// CX Calendar: workbook (Excel Online) on the CSQCLeads site. action=embedview
// renders it inline in the Tool Viewer; the Teams-only params (wdExp, TeamsCID)
// are dropped. NOTE: currently the same workbook as the SPRQ Weekend Schedule.
const CX_CALENDAR_URL =
  'https://rapidcitytransport.sharepoint.com/sites/CSQCLeads/_layouts/15/Doc.aspx' +
  '?sourcedoc=%7B8dcbaa54-16b7-43e6-837b-6c7b56fc3614%7D&action=embedview';

// One on One Form: Microsoft Forms link, opens in a popup window
// since MS Forms blocks iframe embedding via X-Frame-Options.
const ONE_ON_ONE_FORM_URL =
  'https://forms.cloud.microsoft/Pages/ResponsePage.aspx' +
  '?id=l4y8NMNy7EWK6c1ZaWvyK4pA91Pih8lBtEvq1awi_ZxUNVdRRjhMVkVSRTk2RzdYUzJVWTc4TUFJOCQlQCN0PWcu';

// Weekly Efficiency dashboard: Excel file on /sites/CSQCLeads.
// Same SharePoint site as TL Assignment, so `&action=embedview` is
// sufficient to make Office Online serve it inside our iframe.
const WEEKLY_EFFICIENCY_URL =
  'https://rapidcitytransport.sharepoint.com/:x:/s/CSQCLeads' +
  '/IQDGIMKKaZq2RIQvJ5DpsajfAZyCq0zTf7VjBBlNlmEbl3I' +
  '?wdExp=TEAMS-TREATMENT&web=1' +
  '&TeamsCID=c8bca27e-2e99-443f-9b0c-39f5a79b4f4b&action=embedview';

// TL Assignments: Excel file on /sites/CSQCLeads. Same embedview trick
// so the Office Online viewer serves it inside our iframe.
const TL_ASSIGNMENTS_URL =
  'https://rapidcitytransport.sharepoint.com/:x:/s/CSQCLeads' +
  '/IQBiSeuvzoYaSraMo_isZfW0AW3jhqvVqVTkbObFya2EEnc' +
  '?e=nJ9NTS&CID=9e17441f-b50b-cf0f-c80f-03cd7bdebcd3&action=embedview';

const TOOLS: ITool[] = [
  { label: 'TL Assignment',        icon: 'AccountManagement', embedUrl: TL_ASSIGNMENTS_URL       },
  { label: 'CX Calendar',          icon: 'Calendar',       embedUrl: CX_CALENDAR_URL          },
  { label: 'Complaints Log',       icon: 'Warning',        embedUrl: COMPLAINTS_DEPT_MANAGERS_URL },
  { label: 'Error Log',            icon: 'ErrorBadge',     embedUrl: QC_ERROR_LOG_URL            },
  { label: 'Productivity Report',  icon: 'ReportDocument' },
  { label: 'Call Monitoring Form', icon: 'Headset',        embedUrl: CALL_MONITORING_URL         },
  { label: 'One on One Form',      icon: 'Group',          href: ONE_ON_ONE_FORM_URL             },
  { label: 'Weekly Efficiency',    icon: 'AreaChart',      embedUrl: WEEKLY_EFFICIENCY_URL       },
  { label: 'Attendance Log',       icon: 'CalendarAgenda', embedUrl: ATTENDANCE_TRACKER_URL     },
];

// Weekly updates: deliberately hyphen-free phrasing per the brief.
const WEEKLY_UPDATES: string[] = [
  'Team huddle Tuesday at 9 AM in the lounge.',
  'Attendance reports are due Friday by end of day.',
  'Coaching one on ones start next week. Please confirm your slots.',
  'Refresh your knowledge base bookmarks this week.',
];

const TeamLeadHub: React.FC<ITeamLeadHubProps> = () => {
  const themeVars = React.useMemo(
    () => getThemeCssVariables(defaultTheme) as React.CSSProperties,
    []
  );

  const [activeTool, setActiveTool] = React.useState<ITool | null>(null);

  const { announcements } = useAnnouncements('Team Lead');
  const weeklyUpdates = announcements.length > 0 ? announcements.map(a => a.title) : WEEKLY_UPDATES;

  // Weekly Focus always shows the current week (Monday to Sunday).
  const week = React.useMemo(() => getCurrentWeek(), []);

  /** "Full" URL for the active tool: the same URL we embed, minus the
   *  iframe-only query params (env=Embedded, action=embedview). Opening
   *  with those stripped gives the normal SharePoint/Office experience
   *  (full chrome, editable Excel) instead of the embed-restricted view. */
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
    ? `Team Lead Hub — ${activeTool.label}`
    : 'Team Lead Hub Page';

  return (
    <div className={styles.hub} style={themeVars}>
      <Navigation onSearch={handleNavSearch} activePage="departmentHub" />

      <div className={styles.layout}>
        <a
          href="https://rapidcitytransport.sharepoint.com/sites/CustomerService576/SitePages/Customer-Experience-Private-Hub.aspx"
          className={styles.backLink}
        >
          ← Back to CX Hub
        </a>

        <main className={styles.mainColumn}>

          <div className={styles.weeklyRow}>
            <article className={styles.weeklyFocusCard} aria-labelledby="tlh-focus-title">
              <span className={styles.weeklyFocusEyebrow}>Weekly Focus</span>
              <h2 id="tlh-focus-title" className={styles.weeklyFocusTitle}>
                {week.title}
              </h2>
              <p className={styles.weeklyFocusDate}>{week.range}</p>
            </article>

            <section className={styles.weeklyUpdatesCard} aria-labelledby="tlh-updates-title">
              <h3 id="tlh-updates-title" className={styles.weeklyUpdatesTitle}>
                Weekly updates
              </h3>
              <ul className={styles.weeklyUpdatesList}>
                {weeklyUpdates.map((u, i) => (
                  <li key={i}>{u}</li>
                ))}
              </ul>
            </section>
          </div>

          {/* Tools panel, mobile only. Hidden above 1100px; shown here so
              that when the layout collapses to one column the dark Tools
              panel sits directly above the Tool Viewer instead of being
              stranded at the bottom where the sidebar stacks. */}
          <section className={`${styles.toolsPanel} ${styles.toolsPanelMobile}`} aria-labelledby="tlh-tools-title-m">
            <div className={styles.panelHeader}>
              <h3 id="tlh-tools-title-m" className={styles.panelTitle}><Icon iconName="Toolbox" aria-hidden="true" />Tools</h3>
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
                          // Forms hosted outside SharePoint (e.g. MS Forms)
                          // block iframe embedding via X-Frame-Options, so
                          // open them in a popup window instead.
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

          <section className={styles.toolViewerCard} aria-labelledby="tlh-viewer-title">
            <header className={styles.toolViewerHeader}>
              <div className={styles.toolViewerHeaderLeft}>
                <Icon iconName="ViewListGroup" className={styles.toolViewerHeaderIcon} aria-hidden="true" />
                <div>
                  <p className={styles.toolViewerEyebrow}>Tool Viewer</p>
                  <h3 id="tlh-viewer-title" className={styles.toolViewerTitle}>
                    Select a tool
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
                  Pick a tool to view it here.
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

        <aside className={styles.sidebar} aria-label="Team lead tools">
          <section className={`${styles.toolsPanel} ${styles.toolsPanelDesktop}`} aria-labelledby="tlh-tools-title">
            <div className={styles.panelHeader}>
              <h3 id="tlh-tools-title" className={styles.panelTitle}><Icon iconName="Toolbox" aria-hidden="true" />Tools</h3>
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
                          // Forms hosted outside SharePoint (e.g. MS Forms)
                          // block iframe embedding via X-Frame-Options, so
                          // open them in a popup window instead.
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

export default TeamLeadHub;
