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
import { useSprqTools } from '../hooks/useSprqTools';
import { ISprqToolEntry, SPRQ_TOOLS_LIST_URL, SprqToolKey } from '../services/sprqToolsService';
import { DailyTaskBoard } from '../../customerExperienceHub/components/DailyTaskBoard/DailyTaskBoard';
import { useEmployees } from '../../employeeDirectory/hooks/useEmployees';
import { IEmployee } from '../../employeeDirectory/components/types';
import {
  getEmployeeInitials,
  pickAccentFromString,
} from '../../employeeDirectory/utils/employeeFormatting';

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
  /** Optional custom React content rendered inline in the Tool Viewer body. */
  customRender?: () => React.ReactNode;
}

// ── Single-resource tools (embedded inline in the Tool Viewer) ──────────────
const FLIGHT_HOTEL_TRACKER_URL  = 'https://rapidcitytransport.sharepoint.com/:l:/g/JADoa71-RjIuTaWuovfx7LMfAb6iRf_K_HkvYLu11qE6gXU?e=eJUB2i';
const HOTEL_FINDER_URL          = 'https://rapidcitytransport.sharepoint.com/:l:/g/JAA93C9vu0jeRJwwaoC_mwnaAUkGCPkyEgU5RIXG3yC1lO4?e=Itczty';
const SCHOOL_BOOKINGS_URL       = 'https://rapidcitytransport.sharepoint.com/:l:/g/JADYJPEv6T67RbdTCSOh9GfIAcRaMwDd_Faz5fL_vy_e-sw?e=TJtXN1';
const YRDSB_TRIP_PLANNER_URL    = 'https://rapidcitytransport.sharepoint.com/:x:/s/SpecialtyRequestGroup/IQBBm-2BMtaaTaJhx_pea6ipAV_0YZ2FFGSUslJWv6BCLhE?e=3zvn4I';
const QUOTE_CALCULATORS_URL     = 'https://rapidcitytransport.sharepoint.com/:f:/r/Customer%20Service/Reference/Calculators?csf=1&web=1&e=IO0jQY';
// Customer Service > Reference > "Regular List - Kristyn.xlsx", by its UniqueId.
// A link follows the FILE, not the name: the previous link kept showing the
// old workbook after it was moved to Archive and a new one uploaded.
const REGULARS_LIST_URL         = 'https://rapidcitytransport.sharepoint.com/_layouts/15/Doc.aspx?sourcedoc=%7Bc04a703f-fd35-473a-9f8b-05609bc39576%7D&action=embedview';

// Client Accounts, Master Lists and Booking Forms are built from the SPRQ
// Tools list inside the component; only the fixed tools live here.
const STATIC_TOOLS: ITool[] = [
  { label: 'Flight & Hotel Tracker',  icon: 'Airplane',      embedUrl: FLIGHT_HOTEL_TRACKER_URL },
  { label: 'Hotel Finder',            icon: 'POI',           embedUrl: HOTEL_FINDER_URL },
  { label: 'School Bookings Tracker', icon: 'Bus',           embedUrl: SCHOOL_BOOKINGS_URL },
  { label: 'YRDSB Trip Planner',      icon: 'MapDirections', embedUrl: YRDSB_TRIP_PLANNER_URL },
  { label: 'Quote Calculators',       icon: 'Calculator',    embedUrl: QUOTE_CALCULATORS_URL },
  { label: 'Daily Task',              icon: 'TaskGroup',     customRender: () => <DailyTaskBoard scope="sprq" /> },
  { label: 'Regulars List',           icon: 'People',        embedUrl: REGULARS_LIST_URL },
];

function buildTools(entries: ISprqToolEntry[]): ITool[] {
  const rows = (key: SprqToolKey): ISprqToolEntry[] => entries.filter(e => e.tool === key);
  const links = (key: SprqToolKey): { label: string; url: string }[] =>
    rows(key).map(e => ({ label: e.label, url: e.url || '' }));
  return STATIC_TOOLS.concat([
    { label: 'SPRQ Client Accounts', icon: 'ContactList',   items: rows('Client Accounts').map(e => e.label) },
    { label: 'Master Lists',         icon: 'BulletedList2', links: links('Master Lists') },
    { label: 'Booking Forms',        icon: 'TextDocument',  links: links('Booking Forms'), linksAsPopup: true },
  ]).sort((a, b) => a.label.localeCompare(b.label));
}

const EditListLink: React.FC = () => (
  <p className={styles.toolContentNote}>
    <a href={SPRQ_TOOLS_LIST_URL} target="_blank" rel="noopener noreferrer">
      Edit this list in SharePoint
      <Icon iconName="OpenInNewTab" aria-hidden="true" />
    </a>
  </p>
);

/**
 * Body of a tool whose rows come from the SPRQ Tools list. The pointer to
 * the list is always on screen, because "where do I edit this?" was the
 * first question the team asked about the hardcoded version.
 */
const ListToolBody: React.FC<{ tool: ITool; loading: boolean; error: boolean }> = ({
  tool,
  loading,
  error,
}) => {
  const rowCount = tool.items ? tool.items.length : (tool.links || []).length;
  if (rowCount === 0) {
    return (
      <p className={styles.toolContentNote}>
        {loading
          ? 'Loading...'
          : error
            ? 'The SPRQ Tools list could not be loaded. Check that you have access to it. '
            : 'Nothing listed yet. Add rows to the SPRQ Tools list and they show up here. '}
        {!loading && (
          <a href={SPRQ_TOOLS_LIST_URL} target="_blank" rel="noopener noreferrer">
            Open the SPRQ Tools list
            <Icon iconName="OpenInNewTab" aria-hidden="true" />
          </a>
        )}
      </p>
    );
  }
  return (
    <>
      <ul className={styles.toolContentList}>
        {tool.items
          ? tool.items.map((item, i) => <li key={i}>{item}</li>)
          : (tool.links || []).map((link, i) => (
              <li key={i}>
                {!link.url ? (
                  <span className={styles.toolContentLinkMissing}>{link.label} (no link set)</span>
                ) : tool.linksAsPopup ? (
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
      <EditListLink />
    </>
  );
};

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

/** The SPRQ team lead is flagged by "Team Lead" in the Level column: they sort
 *  first and show a "Team Lead" role label. Everyone else shows name only. */
function isSprqLead(emp: IEmployee): boolean {
  return (emp.level || '').toLowerCase().indexOf('team lead') !== -1;
}

const SprqHub: React.FC<ISprqHubProps> = ({ bannerEyebrow, bannerTitle }) => {
  const themeVars = React.useMemo(
    () => getThemeCssVariables(defaultTheme) as React.CSSProperties,
    []
  );

  const { announcements } = useAnnouncements('SPRQ');
  const updates: IUpdate[] = announcements.length > 0 ? announcements : UPDATES;

  const { entries: toolEntries, loading: toolsLoading, error: toolsError } = useSprqTools();
  const tools = React.useMemo(() => buildTools(toolEntries), [toolEntries]);

  // Keyed by label rather than holding the ITool, so a tool opened before
  // the SPRQ Tools list finished loading fills in once the rows arrive.
  const [activeLabel, setActiveLabel] = React.useState<string | null>(null);
  const activeTool: ITool | null = tools.filter(t => t.label === activeLabel)[0] || null;

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

  const { employees, gridLoading: teamLoading } = useEmployees();
  // SPRQ team = anyone whose Agent Title contains "SPRQ"; the Team Lead sorts first.
  const sprqMembers = React.useMemo<IEmployee[]>(() => {
    return employees
      .filter(e => (e.agentTitle || '').toUpperCase().indexOf('SPRQ') !== -1)
      .sort((a, b) => {
        const aLead = isSprqLead(a) ? 0 : 1;
        const bLead = isSprqLead(b) ? 0 : 1;
        if (aLead !== bLead) return aLead - bLead;
        return a.name.localeCompare(b.name);
      });
  }, [employees]);

  const pageId = activeTool ? `SPRQ Hub: ${activeTool.label}` : 'SPRQ Hub Page';

  return (
    <div className={styles.hub} style={themeVars}>
      <Navigation onSearch={handleNavSearch} activePage="departmentHub" />

      <div className={styles.layout}>
        <a
          href="https://rapidcitytransport.sharepoint.com/sites/CustomerService576/SitePages/Home.aspx"
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
              {tools.map((tool) => {
                const isActive = activeTool?.label === tool.label;
                return (
                  <li key={tool.label}>
                    <button
                      type="button"
                      onClick={() => {
                        if (tool.href) {
                          window.open(tool.href, '_blank', 'noopener,noreferrer');
                        } else {
                          setActiveLabel(tool.label);
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
                      onClick={() => setActiveLabel(null)}
                      className={styles.toolContentClose}
                      aria-label="Close tool"
                    >
                      <Icon iconName="Cancel" />
                    </button>
                  </header>

                  {activeTool.customRender ? (
                    <div className={styles.toolContentCustom}>{activeTool.customRender()}</div>
                  ) : activeTool.items || activeTool.links ? (
                    <ListToolBody tool={activeTool} loading={toolsLoading} error={toolsError} />
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

          <section className={styles.teamCard} aria-labelledby="sprq-team">
            <div className={styles.teamHeader}>
              <div>
                <h2 id="sprq-team" className={styles.teamTitle}>SPRQ Team</h2>
              </div>
            </div>
            {teamLoading && sprqMembers.length === 0 && (
              <p className={styles.teamMemberRole} role="status" aria-live="polite">
                Loading team…
              </p>
            )}
            {!teamLoading && sprqMembers.length === 0 && (
              <p className={styles.teamMemberRole}>
                No SPRQ members found yet. In the Employee Highlight list, add SPRQ to the Agent Title of the people you want here.
              </p>
            )}
            {sprqMembers.length > 0 && (
              <ul className={styles.teamGrid} role="list">
                {sprqMembers.map((member) => {
                  const accent = pickAccentFromString(member.name);
                  const initials = getEmployeeInitials(member.name);
                  const role = isSprqLead(member) ? 'Team Lead' : '';

                  return (
                    <li key={member.id} className={styles.teamMember}>
                      <div className={styles.teamMemberTop}>
                        {member.photoUrl ? (
                          <img
                            src={member.photoUrl}
                            alt=""
                            className={styles.teamAvatar}
                          />
                        ) : (
                          <span
                            className={styles.teamAvatar}
                            style={{ background: accent }}
                            aria-hidden="true"
                          >
                            {initials}
                          </span>
                        )}
                        <div className={styles.teamMemberInfo}>
                          <span className={styles.teamMemberName}>{member.name}</span>
                          {role && <span className={styles.teamMemberRole}>{role}</span>}
                        </div>
                      </div>
                      <div className={styles.teamMemberFooter}>
                        {member.shift && (
                          <span className={styles.teamMemberShift}>{member.shift}</span>
                        )}
                        <div className={styles.teamMemberContact}>
                          {member.email ? (
                            <a
                              href={`mailto:${member.email}`}
                              className={styles.teamMemberContactLink}
                              aria-label={`Email ${member.name}`}
                            >
                              <Icon iconName="Mail" />
                            </a>
                          ) : (
                            <span aria-hidden="true"><Icon iconName="Mail" /></span>
                          )}
                          {member.email ? (
                            <a
                              href={`https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(member.email)}`}
                              className={styles.teamMemberContactLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Chat with ${member.name} in Teams`}
                            >
                              <Icon iconName="Chat" />
                            </a>
                          ) : (
                            <span aria-hidden="true"><Icon iconName="Chat" /></span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </main>

        <aside className={styles.sidebar} aria-label="Tools, tasks, and stats">

          <section className={`${styles.toolsPanel} ${styles.toolsPanelDesktop}`} aria-labelledby="sprq-tools-title">
            <div className={styles.panelHeader}>
              <h3 id="sprq-tools-title" className={styles.panelTitle}><Icon iconName="Toolbox" aria-hidden="true" />Tools</h3>
            </div>
            <ul className={styles.toolsGrid} role="list">
              {tools.map((tool) => {
                const isActive = activeTool?.label === tool.label;
                return (
                  <li key={tool.label}>
                    <button
                      type="button"
                      onClick={() => {
                        if (tool.href) {
                          window.open(tool.href, '_blank', 'noopener,noreferrer');
                        } else {
                          setActiveLabel(tool.label);
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
