import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './DispatchHub.module.scss';
import { IDispatchHubProps } from './IDispatchHubProps';
import {
  defaultTheme,
  getThemeCssVariables,
} from '../../rapidCityHomepage/theme/ThemeTokens';
import { Footer } from '../../rapidCityHomepage/components/Footer/Footer';
import { Navigation } from '../../rapidCityHomepage/components/Navigation/Navigation';
import { getDepartmentMatchNames } from '../../departmentPublicPage/services/DepartmentConfig';
import { useEmployees } from '../../employeeDirectory/hooks/useEmployees';
import { IEmployee } from '../../employeeDirectory/components/types';
import {
  getEmployeeInitials,
  pickAccentFromString,
} from '../../employeeDirectory/utils/employeeFormatting';

// Same backdrop as the public Dispatch page, the way the CX hub reuses its own.
const HEADER_BACKDROP = require('../../departmentPublicPage/assets/dept-header-backdrop.png');

const DEPARTMENT_NAME = 'Dispatch';

const ROOT = 'https://rapidcitytransport.sharepoint.com';
const COMPASS = `${ROOT}/sites/compass`;
const DISPATCH_SITE_URL = `${ROOT}/sites/Dispatch`;

/** Back-link target. The compass page must be named Dispatch. */
const PUBLIC_PAGE_URL = `${COMPASS}/SitePages/Dispatch.aspx`;

// Dispatch's procedure pages still live on the root site, where the legacy
// Dispatch department page linked them; compass hosts only the hub.
const ROOT_PAGES = `${ROOT}/SitePages`;

const OUTSOURCE_CARDS_URL = `${COMPASS}/SitePages/OutsourceContactCards.aspx`;
// The live vendor data. The legacy "Driver Directory" list on the same site
// has not been edited since this list replaced it (2026-08-25) and holds
// vendor account passwords, so it is not embedded anywhere.
const COVERAGE_LIST_URL = `${DISPATCH_SITE_URL}/Lists/Outsource%20Vendor%20Coverage/AllItems.aspx?sortField=Zone&isAscending=true`;

// Root-site files, addressed by UniqueId so renames and moves cannot break
// them. The PDF embeds through embed.aspx, which carries no embed-only
// params, so its full view is the same URL; the workbook follows the CX
// hub's Doc.aspx pattern (action=embedview for the iframe only).
const EXTENSION_LIST_URL = `${ROOT}/_layouts/15/embed.aspx?UniqueId=dc8d7342-14ca-420a-b9b4-52a61e8a6ba8`;
const WEEKEND_SIGN_UP_URL = `${ROOT}/_layouts/15/Doc.aspx?sourcedoc=%7B43C35DE2-5987-4F62-90E6-F6D8EC0B63B6%7D`;

/** embedUrl renders inline in the Tool Viewer, links render there as a
 *  list, and externalUrl opens a new tab. A tile with none of them shows
 *  the coming-soon state. */
interface ITool {
  label: string;
  icon: string;
  embedUrl?: string;
  /** "Open full" target, kept apart from embedUrl so the iframe-only params
   *  (env=Embedded, action=embedview) never reach the full view. */
  fullUrl?: string;
  externalUrl?: string;
  links?: { label: string; url: string }[];
}

// Named as Albert asked. SharePoint pages open in a new tab, as the CX hub
// does for its Procedure Guides; lists and documents embed in the viewer.
const TOOLS: ITool[] = [
  { label: 'Accidents & Emergencies', icon: 'Warning',      externalUrl: `${ROOT_PAGES}/Motor-Vehicle-Accidents.aspx` },
  { label: 'Daily Checklists',        icon: 'CheckList' },
  { label: 'Dispatch Alerts',         icon: 'Ringer',       externalUrl: `${ROOT_PAGES}/Dispatch-Alerts.aspx` },
  { label: 'Driver Directory',        icon: 'ContactCard',  externalUrl: OUTSOURCE_CARDS_URL },
  { label: 'Hotels & Meals',          icon: 'Hotel',        externalUrl: `${ROOT_PAGES}/Hotel-Meal-Business-Expenses-for-Drivers.aspx` },
  {
    label: 'Procedure Guides',
    icon: 'ReadingMode',
    // Dispatch has no Procedure Guides index page the way CS does, so the
    // hub lists the procedure pages itself until one exists.
    links: [
      { label: 'Delays and Interruptions', url: `${ROOT_PAGES}/Delays-and-Interruptions.aspx` },
      { label: 'Driver Transfers', url: `${ROOT_PAGES}/Driver-Transfers.aspx` },
      { label: 'Driver Phone Fixes', url: `${ROOT_PAGES}/Driver-Phone-Fixes.aspx` },
      { label: 'Wheelchair & Oversized Wheelchair Vehicles', url: `${ROOT_PAGES}/Oversize-Wheelchair-Dimensions.aspx` },
      { label: 'Pearson Airport: pre-arranged pickups', url: 'https://www.torontopearson.com/en/operators-at-pearson/drivers-prearranged' },
    ],
  },
  { label: 'Rebills',                 icon: 'Money',        externalUrl: `${ROOT_PAGES}/Rebills.aspx` },
  { label: 'Roster & Extensions',     icon: 'Phone',        embedUrl: EXTENSION_LIST_URL, fullUrl: EXTENSION_LIST_URL },
  // Albert wants Dispatch's own processes for SPRQ accounts here; as of
  // 2026-10-28 that content has not been written, so the tile stays unwired.
  { label: 'SPRQ Dispatch',           icon: 'Headset' },
  { label: 'Vehicle Service',         icon: 'Repair',       externalUrl: `${ROOT_PAGES}/Garage-Directory.aspx` },
  { label: 'Weekend Sign-Up',         icon: 'CalendarWeek', embedUrl: `${WEEKEND_SIGN_UP_URL}&action=embedview`, fullUrl: WEEKEND_SIGN_UP_URL },
  { label: 'Zones & Coverage',        icon: 'MapPin',       embedUrl: `${COVERAGE_LIST_URL}&env=Embedded`, fullUrl: COVERAGE_LIST_URL },
].sort((a, b) => a.label.localeCompare(b.label));

/** Management = a department tag literally "Management", set in the source
 *  list alongside the member's primary department to mark leadership. */
function isManagement(emp: IEmployee): boolean {
  return emp.departments.some(d => d.toLowerCase() === 'management');
}

function isLevelTeamLead(emp: IEmployee): boolean {
  return !!emp.level && emp.level.trim().toLowerCase() === 'team lead';
}

function isLevelTrainer(emp: IEmployee): boolean {
  return !!emp.level && emp.level.trim().toLowerCase() === 'trainer';
}

/** Sort hierarchy, matching the CX hub: Management first, then Team Leads,
 *  then Trainers. */
function teamSortRank(emp: IEmployee): number {
  if (isManagement(emp)) return 1;
  if (isLevelTeamLead(emp)) return 2;
  if (isLevelTrainer(emp)) return 3;
  return 4;
}

/** Same labelling as the CX and IT hubs: Level wins, then the Management
 *  department tag, then a generic fallback so no card is left blank. */
function getTeamRoleLabel(emp: IEmployee): string {
  if (emp.level) return emp.level;
  if (isManagement(emp)) return 'Manager';
  return 'Team member';
}

/** Curated via the Employee Highlight "Show In Dept Team" toggle, scoped to
 *  this department so the shared flag never pulls other hubs' people in. */
function isDeptMember(emp: IEmployee): boolean {
  const names = getDepartmentMatchNames(DEPARTMENT_NAME).map(n => n.toLowerCase());
  return !!emp.showInDeptTeam &&
    emp.departments.some(d => names.indexOf(d.toLowerCase()) !== -1);
}

/** Private Dispatch hub: the CX hub's layout (banner, Tool Viewer, team
 *  card, Tools + Breaks & Sick Calls sidebar) with Dispatch's tools and
 *  without the CX-only hub tiles and Rise Hub feed. */
const DispatchHub: React.FC<IDispatchHubProps> = ({ title, subtitle }) => {
  const themeVars = React.useMemo(
    () => getThemeCssVariables(defaultTheme) as React.CSSProperties,
    []
  );

  const [activeTool, setActiveTool] = React.useState<ITool | null>(null);

  const activeToolFullUrl = activeTool?.fullUrl;

  const handleOpenFull = React.useCallback((): void => {
    if (!activeToolFullUrl) return;
    window.open(activeToolFullUrl, '_blank', 'noopener,noreferrer');
  }, [activeToolFullUrl]);

  const handleToolClick = React.useCallback((tool: ITool): void => {
    if (tool.externalUrl) {
      window.open(tool.externalUrl, '_blank', 'noopener,noreferrer');
    } else {
      setActiveTool(tool);
    }
  }, []);

  const { employees, gridLoading: teamLoading } = useEmployees();

  const teamMembers = React.useMemo<IEmployee[]>(() => {
    return employees
      .filter(isDeptMember)
      .sort((a, b) => {
        // Members featured on the public page lead the list, so they sit
        // together in the top row of the team grid.
        const aFeat = a.featureOnPublicPage ? 0 : 1;
        const bFeat = b.featureOnPublicPage ? 0 : 1;
        if (aFeat !== bFeat) return aFeat - bFeat;
        const diff = teamSortRank(a) - teamSortRank(b);
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      });
  }, [employees]);

  const handleSearch = React.useCallback((query: string): void => {
    const q = (query || '').trim();
    const url = q
      ? `/SitePages/ContactCards.aspx?q=${encodeURIComponent(q)}`
      : '/SitePages/ContactCards.aspx';
    window.location.assign(url);
  }, []);

  /** Rendered twice (desktop sidebar + mobile stack); the suffix keeps the
   *  heading ids unique so aria-labelledby stays valid. */
  const renderToolsPanel = (idSuffix: string, panelClass: string): React.ReactNode => (
    <section className={`${styles.toolsPanel} ${panelClass}`} aria-labelledby={`dispatch-tools-${idSuffix}`}>
      <div className={styles.panelHeader}>
        <h2 id={`dispatch-tools-${idSuffix}`} className={styles.panelTitle}>
          <Icon iconName="Toolbox" aria-hidden="true" />Tools
        </h2>
      </div>
      <ul className={styles.toolsGrid} role="list">
        {TOOLS.map((tool) => {
          const isActive = activeTool?.label === tool.label;
          return (
            <li key={tool.label}>
              <button
                type="button"
                onClick={() => handleToolClick(tool)}
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
  );

  return (
    <div className={styles.hub} style={themeVars}>
      <Navigation onSearch={handleSearch} activePage="departmentHub" />
      <div className={styles.layout}>
        <a href={PUBLIC_PAGE_URL} className={styles.backLink}>
          ← Back to the public Dispatch page
        </a>

        <main className={styles.mainColumn}>
          <header className={styles.newsCard} style={{ backgroundImage: `url(${HEADER_BACKDROP})` }}>
            <div className={styles.newsBody}>
              <h1 className={styles.newsTitle}>Dispatch Department Hub</h1>
            </div>
          </header>

          {/* Mobile copy: sits above the viewer once the sidebar stacks. */}
          {renderToolsPanel('m', styles.toolsPanelMobile)}

          <section className={styles.welcomeCard} aria-labelledby="dispatch-welcome">
            <div className={styles.welcomeHeader}>
              <div className={styles.welcomeHeaderLeft}>
                <Icon iconName="Clock" className={styles.welcomeHeaderIcon} aria-hidden="true" />
                <div>
                  <p className={styles.welcomeEyebrow}>Welcome back</p>
                  <h2 id="dispatch-welcome" className={styles.welcomeTitle}>{title}</h2>
                  <p className={styles.welcomeSubtitle}>{subtitle}</p>
                </div>
              </div>
            </div>
            <div
              className={`${styles.welcomePlaceholder} ${activeTool ? styles.welcomePlaceholderActive : ''}`}
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
                      <h3 className={styles.toolContentTitle}>{activeTool.label}</h3>
                    </div>
                    <div className={styles.toolContentActions}>
                      {activeToolFullUrl && (
                        <button
                          type="button"
                          onClick={handleOpenFull}
                          className={styles.toolContentOpenFull}
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

                  {activeTool.links ? (
                    <ul className={styles.toolContentList}>
                      {activeTool.links.map((link) => (
                        <li key={link.url}>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.toolContentLink}
                          >
                            {link.label}
                            <Icon iconName="OpenInNewTab" aria-hidden="true" />
                          </a>
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
                        <strong>{activeTool.label}</strong> isn&apos;t wired up yet. Once it is,
                        its content will load right here in the viewer.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          <section className={styles.teamCard} aria-labelledby="dispatch-team">
            <div className={styles.teamHeader}>
              <div>
                <span className={styles.teamEyebrow}>{DEPARTMENT_NAME}</span>
                <h2 id="dispatch-team" className={styles.teamTitle}>Senior &amp; Support Team</h2>
              </div>
            </div>
            {teamLoading && teamMembers.length === 0 && (
              <p className={styles.teamMemberRole} role="status" aria-live="polite">
                Loading team…
              </p>
            )}

            {!teamLoading && teamMembers.length === 0 && (
              <p className={styles.teamMemberRole}>
                No team members found yet. In the Employee Highlight list, set Show In Dept Team to Yes for the Dispatch people you want here.
              </p>
            )}

            {teamMembers.length > 0 && (
              <ul className={styles.teamGrid} role="list">
                {teamMembers.map((member) => {
                  const accent = pickAccentFromString(member.name);
                  const initials = getEmployeeInitials(member.name);
                  const role = getTeamRoleLabel(member);

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
                          <span className={styles.teamMemberRole}>{role}</span>
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

        <aside className={styles.sidebar} aria-label="Tools and policies">
          {renderToolsPanel('d', styles.toolsPanelDesktop)}

          <section className={styles.policyCard} aria-labelledby="dispatch-policy-title">
            <h2 id="dispatch-policy-title" className={styles.policyTitle}>Breaks &amp; Sick Calls</h2>

            <div className={`${styles.policyBlock} ${styles.policyBlockBreaks}`}>
              <h3 className={styles.policyBlockTitle}>Breaks</h3>
              <ul className={styles.policyList}>
                <li>Employees working 5 hours or more are entitled to one unpaid lunch break (30 minutes).</li>
                <li>Lunches must be taken at the scheduled time to maintain operational coverage.</li>
              </ul>
            </div>

            <div className={`${styles.policyBlock} ${styles.policyBlockSick}`}>
              <h3 className={styles.policyBlockTitle}>Sick Calls</h3>
              <ul className={styles.policyList}>
                <li>Sick calls must be made by phone. Emails for absences will not be accepted.</li>
              </ul>
              <p className={styles.policyContacts}>
                <a href="tel:9056216844">Albert: 905-621-6844</a> (primary contact)
              </p>
            </div>
          </section>
        </aside>
      </div>

      <Footer pageIdentifier="Dispatch Hub" />
    </div>
  );
};

export default DispatchHub;
