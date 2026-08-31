import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './BusinessDevelopmentHub.module.scss';
import { IBusinessDevelopmentHubProps } from './IBusinessDevelopmentHubProps';
import {
  defaultTheme,
  getThemeCssVariables,
} from '../../rapidCityHomepage/theme/ThemeTokens';
import { Footer } from '../../rapidCityHomepage/components/Footer/Footer';
import { Navigation } from '../../rapidCityHomepage/components/Navigation/Navigation';
import { useAnnouncements } from '../../rapidCityHomepage/hooks/useAnnouncements';
import { getDepartmentMatchNames } from '../../departmentPublicPage/services/DepartmentConfig';
import { useEmployees } from '../../employeeDirectory/hooks/useEmployees';
import { IEmployee } from '../../employeeDirectory/components/types';
import {
  getEmployeeInitials,
  pickAccentFromString,
} from '../../employeeDirectory/utils/employeeFormatting';

const DEPARTMENT_NAME = 'Business Development';

// Public Business Development page on compass; must be created with exactly this name.
const PUBLIC_PAGE_URL = 'https://rapidcitytransport.sharepoint.com/sites/compass/SitePages/BusinessDevelopment.aspx';

/** A Tools panel tile. href bypasses the viewer (new tab); otherwise the
 *  viewer renders links, then embedUrl, then the coming-soon state. */
interface ITool {
  label: string;
  icon: string;
  /** Optional iframe URL: loads inline in the Tool Viewer. */
  embedUrl?: string;
  /** Optional external URL: opens in a new tab (docs, lists, folders, forms). */
  href?: string;
  /** Optional list of links rendered inline in the Tool Viewer. */
  links?: { label: string; url: string }[];
}

// Placeholder tiles: none are wired yet, so each opens the viewer's
// coming-soon state. Swap in real embeds/links as the team decides them.
const TOOLS: ITool[] = [
  { label: 'Team Documents', icon: 'DocLibrary' },
  { label: 'Team Notebook',  icon: 'OneNoteLogo' },
  { label: 'Useful Links',   icon: 'Link' },
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

/** Private Business Development hub page: updates from the 'Business Development Private' announcements
 *  list, a Tool Viewer with placeholder tiles, and the curated team grid.
 *  One of five dept hub clones of the sprqHub skeleton; the five differ only
 *  in department strings, so edit them in lockstep. */
const BusinessDevelopmentHub: React.FC<IBusinessDevelopmentHubProps> = ({ bannerEyebrow, bannerTitle }) => {
  const themeVars = React.useMemo(
    () => getThemeCssVariables(defaultTheme) as React.CSSProperties,
    []
  );

  const { announcements: updates } = useAnnouncements('Business Development Private');

  const [activeTool, setActiveTool] = React.useState<ITool | null>(null);

  /** Full URL for the active tool: the embedded view minus the iframe-only
   *  query params. Used by "Open full" to launch the natural experience. */
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

  const { employees, gridLoading: teamLoading } = useEmployees();
  const members = React.useMemo<IEmployee[]>(() => {
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

  const pageId = activeTool
    ? `${DEPARTMENT_NAME} Hub: ${activeTool.label}`
    : `${DEPARTMENT_NAME} Hub Page`;

  /** Rendered twice (desktop sidebar + mobile stack); suffix keeps the
   *  heading ids unique so aria-labelledby stays valid. */
  const renderToolsPanel = (suffix: string, panelClass: string): React.ReactNode => (
    <section
      className={`${styles.toolsPanel} ${panelClass}`}
      aria-labelledby={`bizdev-tools-title${suffix}`}
    >
      <div className={styles.panelHeader}>
        <h3 id={`bizdev-tools-title${suffix}`} className={styles.panelTitle}>
          <Icon iconName="Toolbox" aria-hidden="true" />Tools
        </h3>
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
  );

  return (
    <div className={styles.hub} style={themeVars}>
      <Navigation onSearch={handleNavSearch} activePage="departmentHub" />

      <div className={styles.layout}>
        <a href={PUBLIC_PAGE_URL} className={styles.backLink}>
          ← Back to the public Business Development page
        </a>

        <main className={styles.mainColumn}>

          <section className={styles.updatesCard} aria-labelledby="bizdev-updates-title">
            <div className={styles.updatesHeader}>
              <div className={styles.updatesHeaderText}>
                <span className={styles.updatesKicker}>
                  <span className={styles.updatesKickerDot} aria-hidden="true" />
                  {bannerEyebrow}
                </span>
                <h2 id="bizdev-updates-title" className={styles.updatesTitle}>
                  {bannerTitle}
                </h2>
              </div>
            </div>

            {updates.length === 0 ? (
              <p className={styles.updatesEmpty}>
                No updates yet. Announcements for Business Development will appear here.
              </p>
            ) : (
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
            )}
          </section>

          {/* Mobile copy: sits above the viewer once the sidebar stacks. */}
          {renderToolsPanel('-m', styles.toolsPanelMobile)}

          <section className={styles.toolViewerCard} aria-labelledby="bizdev-viewer-title">
            <header className={styles.toolViewerHeader}>
              <div className={styles.toolViewerHeaderLeft}>
                <Icon iconName="ViewListGroup" className={styles.toolViewerHeaderIcon} aria-hidden="true" />
                <div>
                  <p className={styles.toolViewerEyebrow}>Tool Viewer</p>
                  <h3 id="bizdev-viewer-title" className={styles.toolViewerTitle}>
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

                  {activeTool.links ? (
                    <ul className={styles.toolContentList}>
                      {activeTool.links.map((link, i) => (
                        <li key={i}>
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

          <section className={styles.teamCard} aria-labelledby="bizdev-team">
            <div className={styles.teamHeader}>
              <div>
                <h2 id="bizdev-team" className={styles.teamTitle}>Senior &amp; Support Team</h2>
              </div>
            </div>
            {teamLoading && members.length === 0 && (
              <p className={styles.teamMemberRole} role="status" aria-live="polite">
                Loading team…
              </p>
            )}
            {!teamLoading && members.length === 0 && (
              <p className={styles.teamMemberRole}>
                No members listed yet. In the Employee Highlight list, turn on
                Show In Dept Team for the Business Development people you want here.
              </p>
            )}
            {members.length > 0 && (
              <ul className={styles.teamGrid} role="list">
                {members.map((member) => {
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

        <aside className={styles.sidebar} aria-label="Tools">
          {renderToolsPanel('', styles.toolsPanelDesktop)}
        </aside>
      </div>

      <Footer pageIdentifier={pageId} />
    </div>
  );
};

export default BusinessDevelopmentHub;
