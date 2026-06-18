import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './SprqHub.module.scss';
import { ISprqHubProps } from './ISprqHubProps';
import {
  defaultTheme,
  getThemeCssVariables,
} from '../../rapidCityHomepage/theme/ThemeTokens';
import { Footer } from '../../rapidCityHomepage/components/Footer/Footer';
import { Navigation } from '../../rapidCityHomepage/components/Navigation/Navigation';
import { useAnnouncements } from '../../rapidCityHomepage/hooks/useAnnouncements';
import { useAtAGlance } from '../hooks/useAtAGlance';

interface ITool {
  label: string;
  icon: string;
  /** Optional iframe URL: loads inline in the Tool Viewer. */
  embedUrl?: string;
  /** Optional external URL: opens in a new tab (docs, lists, folders, forms). */
  href?: string;
  /** Optional list of links rendered inline in the Tool Viewer. */
  links?: { label: string; url: string }[];
  /** Optional list of text items rendered inline in the Tool Viewer. */
  items?: string[];
  /** When true, links open as a popup window instead of a new tab (forms). */
  linksAsPopup?: boolean;
}

// ── SPRQ client accounts (names list shown inline) ──────────────────────────
const CLIENT_ACCOUNTS: string[] = [
  'Trillium Health Partners (THP)',
  'William Osler Health Systems (WOHS)',
  'Medcan (Corporate VIP)',
  'Guelph Community Health Centre - Guelph CHC',
  'SickKids Customer & Referral',
  "Children's Transportation Centre (CTC)",
  "Catholic Children's Aid Society of Toronto (CCAS)-NorthWest Branch as a Customer",
  "Children's Aid Society of London & Middlesex aka (CASLM)",
  'Long Term Care (Region of Peel- Davis Centre, Region of Peel- Malton Village, Region of Peel-Peel Manor, Region of Peel-Tall Pines, Region of Peel-Sheridan Villa)',
  'Conestoga College',
  'Georgian College',
  'Thames Valley District School Board - TVDSB',
  'Blue Water District School Board - BWDSB',
  'Grand Erie District School Board - GEDSB',
  'Halton District School Board - HDSB',
  'Halton Catholic District School Board - HCDSB',
  'London District Catholic School Board - LDCSB',
  'York Region District School Board - YRDSB',
  'York Catholic District School Board - YCDSB',
  'Upper Grand District School Board - UGDSB',
  'Ramudeen Global',
  'West Park - TEMPORARY',
  'Trillium Lakes District School Board - TLDSB',
  'Fanshawe College',
  'Bruce Grey Catholic District School Board - BGCDSB',
];

// ── Master lists (live on the Protocol Book landing page) ───────────────────
const MASTER_LISTS: { label: string; url: string }[] = [
  { label: 'Georgian College Masterlist', url: 'https://rapidcitytransport.sharepoint.com/Lists/Georgian%20College%20Masterlist/AllItems.aspx?ct=1780947317771&or=OWA%2DNT%2DMail&cid=eead8a97%2Dbc8d%2D379c%2Dbfe1%2D49280ddca38f' },
  { label: 'Conestoga College Masterlist', url: 'https://rapidcitytransport.sharepoint.com/:l:/g/JACuB5EpoWjsQpUxaFNjiPrgAQ_wImsGsp7eFpsWoukSqMc?e=LV0bzh' },
  { label: 'Fanshawe Masterlist', url: 'https://rapidcitytransport.sharepoint.com/:l:/g/JAAUbfCNs1QFTbn4pyfKuM6XASR7OtqyypX_Yfmgk9CTbxM?e=Scpbro' },
  { label: 'BWDSB Masterlist', url: 'https://rapidcitytransport.sharepoint.com/:l:/g/JABvn1_P3yqzT4OlhA5PAHdYAbvsbQDWYstCXowGtwJhSLk?e=7qTSKS' },
];

// ── Booking forms (Office Forms share a common base; new-course forms differ) ─
const FORM_BASE =
  'https://forms.office.com/pages/responsepage.aspx?id=l4y8NMNy7EWK6c1ZaWvyKz85tpnjwg9PsmL0mLznWPZU';
const formUrl = (suffix: string): string => `${FORM_BASE}${suffix}&route=shorturl`;

const BOOKING_FORMS: { label: string; url: string }[] = [
  { label: 'CASLM - Rapid City Transportation Request', url: formUrl('MjQ4SjRZNUQwOVIxT0IzWEwzUFYyVzFYSC4u') },
  { label: 'Guelph CHC - Quote Request', url: formUrl('RVFXMlJaM0U3RExZR0syVUY1UFlWTlROTi4u') },
  { label: 'HCDSB - Transportation Request', url: formUrl('NUtMSUxGQ0FXRFFHNEVMVTNUUkpVMDRVRS4u') },
  { label: 'HDSB - Transportation Request', url: formUrl('ODY0S0lZVFFET1g5VFNKSjAyVVA5NEU0Ty4u') },
  { label: 'Medcan - MEDCAN Request', url: formUrl('N1Q3MjlZMjZER1pKWThaNzhQUk1CVzVLQi4u') },
  { label: 'SickKids - Rapid City Transportation Request', url: formUrl('NjdGWkg5MkpFSTJPQkpHUFRFQzNNVkNGVi4u') },
  { label: 'Trillium Health Partners (THP) - Wheelchair Request', url: formUrl('ODZaM1k1STZGVE1UU1FEMTJMQlRSQk9WNi4u') },
  { label: 'William Osler Health System (WOHS) - Wheelchair Request', url: formUrl('NktCSldEUUtYU0RSQVkwUUlLV09SVUNDUi4u') },
  { label: 'YCDSB - Transportation Request', url: formUrl('QjdUOUozREJBVjI0MTJQQzEwWTY2S0FHRC4u') },
  { label: 'YRDSB - Transportation Request', url: formUrl('RVdZQjNKVkk1OUtaMDREOU9SWVBJTENVSS4u') },
  { label: 'Accommodations Form - Flight, Accommodations, Train Request', url: formUrl('N1lWT0g2NkdGMU5aNDNCQjJPQTNIQU9PVi4u') },
  { label: 'Georgian College New Course', url: 'https://rapidcitytransport.sharepoint.com/_layouts/15/listforms.aspx?cid=NTE0ZGNlYTktY2VhZC00N2UzLTliZDItYzRmZDRkMjhlNzY4&nav=YzNlYjA0ZTYtOTgyNS00MzQ0LTlmMDktNTJmYzQ3Y2EyYTJi' },
  { label: 'Conestoga College New Course', url: 'https://rapidcitytransport.sharepoint.com/_layouts/15/listforms.aspx?cid=Mjk5MTA3YWUtNjhhMS00MmVjLTk1MzEtNjg1MzYzODhmYWUw&nav=YWMxYWE4NmQtZjQ0Ni00MjYzLTljZDYtZThiNjZhZjRhN2Nk' },
  { label: 'Fanshawe College New Course', url: 'https://rapidcitytransport.sharepoint.com/_layouts/15/listforms.aspx?cid=OGRmMDZkMTQtNTRiMy00ZDA1LWI5ZjgtYTcyN2NhYjhjZTk3&nav=NDRhYTQ2MDYtZjlhMS00M2RjLTk3MmEtNjE1ODFmMTc1MWE0' },
];

// ── Single-resource tools (embedded inline in the Tool Viewer) ──────────────
const FLIGHT_HOTEL_TRACKER_URL  = 'https://rapidcitytransport.sharepoint.com/:l:/g/JADoa71-RjIuTaWuovfx7LMfAb6iRf_K_HkvYLu11qE6gXU?e=eJUB2i';
const HOTEL_FINDER_URL          = 'https://rapidcitytransport.sharepoint.com/:l:/g/JAA93C9vu0jeRJwwaoC_mwnaAUkGCPkyEgU5RIXG3yC1lO4?e=Itczty';
const SCHOOL_BOOKINGS_URL       = 'https://rapidcitytransport.sharepoint.com/:l:/g/JADYJPEv6T67RbdTCSOh9GfIAcRaMwDd_Faz5fL_vy_e-sw?e=TJtXN1';
const YRDSB_TRIP_PLANNER_URL    = 'https://rapidcitytransport.sharepoint.com/:x:/s/SpecialtyRequestGroup/IQBBm-2BMtaaTaJhx_pea6ipAV_0YZ2FFGSUslJWv6BCLhE?e=3zvn4I';
const QUOTE_CALCULATORS_URL     = 'https://rapidcitytransport.sharepoint.com/:f:/r/Customer%20Service/Reference/Calculators?csf=1&web=1&e=IO0jQY';
const DAILY_TASK_URL            = 'https://rapidcitytransport.sharepoint.com/:x:/g/IQAND0sL3jcOQ4p5_0uUs8-lAWYyeQ2EIb1hJx1eERkaRxc?e=GiVrv7';
const REGULARS_LIST_URL         = 'https://rapidcitytransport.sharepoint.com/:x:/g/IQAK7S4W235HT5QFgAoxya6fAX8P4kI6biknm0ecwdcjWVY?e=c7XB5L';

const TOOLS: ITool[] = [
  { label: 'SPRQ Client Accounts',    icon: 'ContactList',   items: CLIENT_ACCOUNTS },
  { label: 'Master Lists',            icon: 'BulletedList2', links: MASTER_LISTS },
  { label: 'Flight & Hotel Tracker',  icon: 'Airplane',      embedUrl: FLIGHT_HOTEL_TRACKER_URL },
  { label: 'Hotel Finder',            icon: 'POI',           embedUrl: HOTEL_FINDER_URL },
  { label: 'School Bookings Tracker', icon: 'Bus',           embedUrl: SCHOOL_BOOKINGS_URL },
  { label: 'YRDSB Trip Planner',      icon: 'MapDirections', embedUrl: YRDSB_TRIP_PLANNER_URL },
  { label: 'Quote Calculators',       icon: 'Calculator',    embedUrl: QUOTE_CALCULATORS_URL },
  { label: 'Booking Forms',           icon: 'TextDocument',  links: BOOKING_FORMS, linksAsPopup: true },
  { label: 'Daily Task',              icon: 'TaskGroup',     embedUrl: DAILY_TASK_URL },
  { label: 'Regulars List',           icon: 'People',        embedUrl: REGULARS_LIST_URL },
];

type UpdateTone = 'pause' | 'school' | 'change' | 'info';

interface IUpdate {
  tag: string;
  tone: UpdateTone;
  title: string;
  body: string;
  time: string;
}

const UPDATES: IUpdate[] = [
  {
    tag: 'PAUSE',
    tone: 'pause',
    title: 'New bookings paused: Lincoln Elementary',
    body: 'Building works through Jun 6. Do not accept new pickups; existing runs continue as scheduled.',
    time: 'Today · 8:10 AM',
  },
  {
    tag: 'SCHOOL',
    tone: 'school',
    title: 'Early dismissal: Westview High',
    body: 'Half day Wed Jun 4. All afternoon runs move up by 2 hours. Confirm with drivers.',
    time: 'Today · 7:45 AM',
  },
  {
    tag: 'CHANGE',
    tone: 'change',
    title: 'Calling schools: verify June schedules',
    body: 'CX team calling all districts this week to confirm end of year bell times. Log results in School Schedules.',
    time: 'Yesterday · 4:20 PM',
  },
  {
    tag: 'INFO',
    tone: 'info',
    title: 'Hotel block confirmed: Field trip, Roosevelt Middle',
    body: '12 rooms held at Cedar Inn for Jun 12 to 13. See Hotel & Flight Tracker for confirmation #s.',
    time: 'Mon · 2:05 PM',
  },
];

type TaskStatus = 'inprogress' | 'duesoon' | 'pending' | 'done' | 'blocked';

interface ITask {
  initials: string;
  /** Avatar background: each value clears 4.5:1 against white initials. */
  accent: string;
  title: string;
  meta: string;
  status: TaskStatus;
  statusLabel: string;
}

const TASKS: ITask[] = [
  { initials: 'YT', accent: '#1F4C7F', title: 'Calling schools: June bell times', meta: 'Yvette T. · District 51 & 7',  status: 'inprogress', statusLabel: 'In progress' },
  { initials: 'AV', accent: '#187389', title: 'Hotel block: Summit HS finals',    meta: 'Adele V. · deposit due Jun 17', status: 'duesoon',    statusLabel: 'Due soon'    },
  { initials: 'MR', accent: '#8A6A0C', title: 'Driver assign: Roosevelt trip',    meta: 'Marco R. · booking #B2041',    status: 'pending',    statusLabel: 'Pending'     },
  { initials: 'LC', accent: '#2E7D32', title: 'Update Regulars: holds & new',     meta: 'Lin C. · weekly',              status: 'done',       statusLabel: 'Done'        },
  { initials: 'DP', accent: '#9B2C2C', title: 'Robotics flights: get approval',   meta: 'Devon P. · RAP → ORD',         status: 'blocked',    statusLabel: 'Blocked'     },
];

type StatTone = 'blue' | 'gold' | 'green';
type StatKey = 'routes' | 'flight' | 'bookings';

interface IStat {
  key: StatKey;
  icon: string;
  label: string;
  tone: StatTone;
}

const STATS: IStat[] = [
  { key: 'routes',   icon: 'Bus',       label: 'Active school routes',  tone: 'blue'  },
  { key: 'flight',   icon: 'Airplane',  label: 'Flight & hotel quotes', tone: 'gold'  },
  { key: 'bookings', icon: 'Completed', label: 'School booking quotes', tone: 'green' },
];

const SprqHub: React.FC<ISprqHubProps> = ({ bannerEyebrow, bannerTitle }) => {
  const themeVars = React.useMemo(
    () => getThemeCssVariables(defaultTheme) as React.CSSProperties,
    []
  );

  const { announcements } = useAnnouncements('SPRQ');
  const updates: IUpdate[] = announcements.length > 0 ? announcements : UPDATES;

  const [activeTool, setActiveTool] = React.useState<ITool | null>(null);

  /** Full URL for the active tool: the embedded view minus the iframe-only
   *  query params (env=Embedded, action=embedview). Used by "Open full" to
   *  launch the natural full experience. */
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

  const { counts, loading: statsLoading } = useAtAGlance();

  const pageId = activeTool ? `SPRQ Hub: ${activeTool.label}` : 'SPRQ Hub Page';

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

          <section className={styles.updatesCard} aria-labelledby="sprq-updates-title">
            <div className={styles.updatesHeader}>
              <div className={styles.updatesHeaderText}>
                <span className={styles.updatesKicker}>
                  <span className={styles.updatesKickerDot} aria-hidden="true" />
                  {bannerEyebrow}
                </span>
                <h2 id="sprq-updates-title" className={styles.updatesTitle}>
                  {bannerTitle}
                </h2>
              </div>
            </div>

            <ul className={styles.updatesList} role="list">
              {updates.map((u, i) => (
                <li key={i} className={styles.updateRow}>
                  {u.tag && (
                    <span className={`${styles.updateBadge} ${styles[`updateBadge_${u.tone}`]}`}>
                      {u.tag}
                    </span>
                  )}
                  <div className={styles.updateBody}>
                    <div className={styles.updateRowTop}>
                      <span className={styles.updateTitle}>{u.title}</span>
                      <span className={styles.updateTime}>{u.time}</span>
                    </div>
                    <p className={styles.updateDesc}>{u.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Tools panel (dark navy), mobile placement: shown above the Tool
              Viewer on single-column widths so it isn't stranded at the bottom.
              Hidden on desktop (>1100px); the sidebar copy is shown instead. */}
          <section className={`${styles.toolsPanel} ${styles.toolsPanelMobile}`} aria-labelledby="sprq-tools-title-m">
            <div className={styles.panelHeader}>
              <h3 id="sprq-tools-title-m" className={styles.panelTitle}><Icon iconName="Toolbox" aria-hidden="true" />Tools</h3>
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
                          window.open(tool.href, '_blank', 'noopener,noreferrer');
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

          <section className={styles.toolViewerCard} aria-labelledby="sprq-viewer-title">
            <header className={styles.toolViewerHeader}>
              <div className={styles.toolViewerHeaderLeft}>
                <Icon iconName="ViewListGroup" className={styles.toolViewerHeaderIcon} aria-hidden="true" />
                <div>
                  <p className={styles.toolViewerEyebrow}>Tool Viewer</p>
                  <h3 id="sprq-viewer-title" className={styles.toolViewerTitle}>
                    Select a tool
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={handleOpenFull}
                className={styles.toolViewerOpenFull}
                disabled={!activeToolFullUrl}
                aria-label={
                  activeTool
                    ? `Open ${activeTool.label} in a new tab`
                    : 'Open full: select a tool first'
                }
              >
                Open full <Icon iconName="OpenInNewTab" aria-hidden="true" />
              </button>
            </header>

            <div
              className={`${styles.toolViewerBody} ${activeTool ? styles.toolViewerBodyActive : ''}`}
              aria-live="polite"
            >
              {!activeTool && (
                <div className={styles.placeholder}>
                  <span className={styles.placeholderHint}>
                    Pick a tool to view it here.
                  </span>
                </div>
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

                  {activeTool.items ? (
                    <ul className={styles.toolContentList}>
                      {activeTool.items.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  ) : activeTool.links ? (
                    <ul className={styles.toolContentList}>
                      {activeTool.links.map((link, i) => (
                        <li key={i}>
                          {activeTool.linksAsPopup ? (
                            <button
                              type="button"
                              className={styles.toolContentLink}
                              onClick={() =>
                                window.open(
                                  link.url,
                                  '_blank',
                                  'popup,width=900,height=1000,scrollbars=yes,resizable=yes'
                                )
                              }
                            >
                              {link.label}
                              <Icon iconName="OpenInNewWindow" aria-hidden="true" />
                            </button>
                          ) : (
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.toolContentLink}
                            >
                              {link.label}
                              <Icon iconName="OpenInNewTab" aria-hidden="true" />
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : activeTool.embedUrl ? (
                    <iframe
                      title={`${activeTool.label}: embedded view`}
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
                        <strong>{activeTool.label}</strong> isn’t wired up yet. Once it is,
                        its content will load right here in the viewer.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </main>

        <aside className={styles.sidebar} aria-label="Tools, tasks, and stats">

          <section className={`${styles.toolsPanel} ${styles.toolsPanelDesktop}`} aria-labelledby="sprq-tools-title">
            <div className={styles.panelHeader}>
              <h3 id="sprq-tools-title" className={styles.panelTitle}><Icon iconName="Toolbox" aria-hidden="true" />Tools</h3>
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
                          window.open(tool.href, '_blank', 'noopener,noreferrer');
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

          <section className={styles.tasksCard} aria-labelledby="sprq-tasks-title">
            <div className={styles.panelHeader}>
              <h3 id="sprq-tasks-title" className={styles.panelTitle}>
                <span className={styles.panelTitleIcon} aria-hidden="true">
                  <Icon iconName="TaskManager" />
                </span>
                Task Schedule
              </h3>
            </div>
            <ul className={styles.tasksList} role="list">
              {TASKS.map((task, i) => (
                <li key={i} className={styles.taskRow}>
                  <span
                    className={styles.taskAvatar}
                    style={{ background: task.accent }}
                    aria-hidden="true"
                  >
                    {task.initials}
                  </span>
                  <div className={styles.taskInfo}>
                    <span className={styles.taskTitle}>{task.title}</span>
                    <span className={styles.taskMeta}>{task.meta}</span>
                  </div>
                  <span className={`${styles.statusBadge} ${styles[`statusBadge_${task.status}`]}`}>
                    <span className={styles.statusDot} aria-hidden="true" />
                    {task.statusLabel}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.statsCard} aria-labelledby="sprq-stats-title">
            <div className={styles.panelHeader}>
              <h3 id="sprq-stats-title" className={styles.panelTitle}>
                <span className={styles.panelTitleIcon} aria-hidden="true">
                  <Icon iconName="BarChartVertical" />
                </span>
                At a glance
              </h3>
            </div>
            <ul className={styles.statsList} role="list">
              {STATS.map((stat, i) => (
                <li key={i} className={styles.statRow}>
                  <span className={`${styles.statIcon} ${styles[`statIcon_${stat.tone}`]}`} aria-hidden="true">
                    <Icon iconName={stat.icon} />
                  </span>
                  <span className={styles.statLabel}>{stat.label}</span>
                  <span className={styles.statValue}>
                    {statsLoading ? '…' : counts[stat.key]}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <Footer pageIdentifier={pageId} />
    </div>
  );
};

export default SprqHub;
