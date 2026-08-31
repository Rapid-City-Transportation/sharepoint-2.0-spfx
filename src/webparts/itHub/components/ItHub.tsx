import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './ItHub.module.scss';
import { IItHubProps } from './IItHubProps';
import { defaultTheme, getThemeCssVariables } from '../../rapidCityHomepage/theme/ThemeTokens';
import { Navigation } from '../../rapidCityHomepage/components/Navigation/Navigation';
import { Footer } from '../../rapidCityHomepage/components/Footer/Footer';
import { useEmployees } from '../../employeeDirectory/hooks/useEmployees';
import { IEmployee } from '../../employeeDirectory/components/types';
import {
  getEmployeeInitials,
  pickAccentFromString,
} from '../../employeeDirectory/utils/employeeFormatting';
import { useItHub } from '../hooks/useItHub';
import { buildStaticTools, folderTool, IItTool, PUBLIC_IT_PAGE_URL } from '../services/itHubConfig';
import { RecentDocuments } from './RecentDocuments';

// Same banner as the public IT page, mirroring how the CX hub reuses its own.
const HEADER_BACKDROP = require('../../departmentPublicPage/assets/it-external-banner.png');

const IT_SUPPORT_EMAIL = 'support@rapidcitytransport.com';

function inIT(emp: IEmployee): boolean {
  return emp.departments.some(d => {
    const lower = d.toLowerCase();
    return lower.indexOf('information technology') !== -1 || lower === 'it';
  });
}

function isManagement(emp: IEmployee): boolean {
  return emp.departments.some(d => d.toLowerCase() === 'management');
}

function isITManagement(emp: IEmployee): boolean {
  return inIT(emp) && isManagement(emp);
}

function isLevelTeamLead(emp: IEmployee): boolean {
  return !!emp.level && emp.level.trim().toLowerCase() === 'team lead';
}

function isLevelTrainer(emp: IEmployee): boolean {
  return !!emp.level && emp.level.trim().toLowerCase() === 'trainer';
}

/** The Show In Dept Team flag is shared across hubs, so scope it to IT. */
function isItTeamMember(emp: IEmployee): boolean {
  return !!emp.showInDeptTeam && inIT(emp);
}

function teamSortRank(emp: IEmployee): number {
  if (isITManagement(emp)) return 1;
  if (isLevelTeamLead(emp)) return 2;
  if (isLevelTrainer(emp)) return 3;
  return 4;
}

/** Role label for the team card: Level wins when set, then a Management tag
 *  maps to the generic 'Manager', then a fallback so no card is left blank.
 *  Same labelling as the CX and dept hubs. */
function getTeamRoleLabel(emp: IEmployee): string {
  if (emp.level) return emp.level;
  if (isITManagement(emp)) return 'Manager';
  return 'Team member';
}

const ItHub: React.FC<IItHubProps> = (props) => {
  const themeVars = React.useMemo(
    () => getThemeCssVariables(defaultTheme) as React.CSSProperties,
    []
  );

  const { state, folders, recent, retry } = useItHub(props.context, props.allowedGroupId);

  // Folders live in the viewer's idle state instead: a tile each would grow
  // the panel every time someone adds a folder.
  const tools = React.useMemo<IItTool[]>(
    () =>
      buildStaticTools(props.notebookUrl)
        .sort((a, b) => a.label.localeCompare(b.label)),
    [props.notebookUrl]
  );

  const [activeTool, setActiveTool] = React.useState<IItTool | null>(null);

  // Config builds this alongside embedUrl to preserve percent-encoding.
  const activeToolFullUrl = activeTool?.fullUrl;

  const handleOpenFull = React.useCallback((): void => {
    if (!activeToolFullUrl) return;
    window.open(activeToolFullUrl, '_blank', 'noopener,noreferrer');
  }, [activeToolFullUrl]);

  const handleToolClick = React.useCallback((tool: IItTool): void => {
    if (tool.externalUrl) {
      window.open(tool.externalUrl, '_blank', 'noopener,noreferrer');
    } else {
      setActiveTool(tool);
    }
  }, []);

  const { employees, gridLoading: teamLoading } = useEmployees();

  const teamMembers = React.useMemo<IEmployee[]>(() => {
    return employees
      .filter(isItTeamMember)
      .sort((a, b) => {
        // Public-page members lead, so they share the top row of the grid.
        const aFeat = a.featureOnPublicPage ? 0 : 1;
        const bFeat = b.featureOnPublicPage ? 0 : 1;
        if (aFeat !== bFeat) return aFeat - bFeat;
        const diff = teamSortRank(a) - teamSortRank(b);
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      });
  }, [employees]);

  // Retry unmounts the button, so move focus rather than dropping to <body>.
  const handleRetry = React.useCallback((): void => {
    retry();
    document.getElementById('it-hub-main')?.focus();
  }, [retry]);

  const handleSearch = React.useCallback((query: string): void => {
    const q = (query || '').trim();
    const url = q
      ? `/SitePages/ContactCards.aspx?q=${encodeURIComponent(q)}`
      : '/SitePages/ContactCards.aspx';
    window.location.assign(url);
  }, []);

  const renderToolsPanel = (idSuffix: string, panelClass: string): React.ReactNode => (
    <section className={`${styles.toolsPanel} ${panelClass}`} aria-labelledby={`it-tools-${idSuffix}`}>
      <div className={styles.panelHeader}>
        <h2 id={`it-tools-${idSuffix}`} className={styles.panelTitle}>
          <Icon iconName="Toolbox" aria-hidden="true" />Tools
        </h2>
      </div>
      <ul className={styles.toolsGrid} role="list">
        {tools.map((tool) => {
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
      <a href="#it-hub-main" className={styles.skipLink}>Skip to main content</a>
      <Navigation onSearch={handleSearch} activePage="departmentHub" />

      {state !== 'ready' && (
        <main id="it-hub-main" className={styles.stateMain} role="main" tabIndex={-1}>
          {/* One mounted live region: swapping its content announces reliably,
              mounting a new region with text already in it often does not. */}
          {(state === 'checking' || state === 'denied') && (
            <div className={styles.stateBlock} role="status" aria-live="polite">
              {state === 'checking' ? (
                <>
                  <Icon iconName="Lock" className={styles.stateIcon} aria-hidden="true" />
                  <h1 className={styles.stateTitle}>Checking access…</h1>
                </>
              ) : (
                <>
                  <Icon iconName="BlockedSite" className={styles.stateIcon} aria-hidden="true" />
                  <h1 className={styles.stateTitle}>This page is for the IT team.</h1>
                  <p className={styles.stateText}>
                    You need to be a member of the IT department to view this workspace. If you
                    believe you should have access, contact{' '}
                    <a className={styles.stateLink} href={`mailto:${IT_SUPPORT_EMAIL}`}>
                      {IT_SUPPORT_EMAIL}
                    </a>.
                  </p>
                </>
              )}
            </div>
          )}

          {state === 'error' && (
            <div className={styles.stateBlock} role="alert">
              <Icon iconName="Error" className={styles.stateIcon} aria-hidden="true" />
              <h1 className={styles.stateTitle}>Something went wrong loading the workspace.</h1>
              <button type="button" className={styles.retryBtn} onClick={handleRetry}>
                Try again
              </button>
            </div>
          )}
        </main>
      )}

      {state === 'ready' && (
        <div className={styles.layout}>
          <a href={PUBLIC_IT_PAGE_URL} className={styles.backLink}>
            ← Back to the public IT page
          </a>

          <main id="it-hub-main" className={styles.mainColumn} role="main" tabIndex={-1}>
            <header className={styles.newsCard} style={{ backgroundImage: `url(${HEADER_BACKDROP})` }}>
              <div className={styles.newsBody}>
                <h1 className={styles.newsTitle}>Information Technology Department Hub</h1>
              </div>
            </header>

            {/* Mobile copy: sits above the viewer once the sidebar stacks. */}
            {renderToolsPanel('m', styles.toolsPanelMobile)}

            <section className={styles.welcomeCard} aria-labelledby="it-welcome">
              <div className={styles.welcomeHeader}>
                <div className={styles.welcomeHeaderLeft}>
                  <Icon iconName="Clock" className={styles.welcomeHeaderIcon} aria-hidden="true" />
                  <div>
                    <p className={styles.welcomeEyebrow}>Welcome back</p>
                    <h2 id="it-welcome" className={styles.welcomeTitle}>{props.welcomeTitle}</h2>
                    <p className={styles.welcomeSubtitle}>{props.welcomeSubtitle}</p>
                  </div>
                </div>
              </div>
              <div
                className={`${styles.welcomePlaceholder} ${activeTool ? styles.welcomePlaceholderActive : ''}`}
                aria-live="polite"
              >
                {!activeTool && folders.length === 0 && (
                  <span className={styles.placeholderHint}>
                    Pick a tool to view it here.
                  </span>
                )}

                {/* Idle state doubles as the folder launcher. */}
                {!activeTool && folders.length > 0 && (
                  <div className={styles.placeholderIdle}>
                    <span className={styles.idleHint}>
                      Pick a tool, or open a document folder:
                    </span>
                    <ul className={styles.folderChips} role="list">
                      {folders.map((folder) => {
                        const tool = folderTool(folder);
                        return (
                          <li key={folder.serverRelativeUrl}>
                            <button
                              type="button"
                              className={styles.folderChip}
                              onClick={() => setActiveTool(tool)}
                            >
                              <Icon iconName={tool.icon} aria-hidden="true" />
                              {folder.name}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
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
                            aria-label={`Open full ${activeTool.label} in a new tab`}
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
                        title={`${activeTool.label} - embedded view`}
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
                          its content will load right here in the placeholder.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            <section className={styles.recentCard} aria-labelledby="it-recent">
              <div className={styles.teamHeader}>
                <div>
                  <span className={styles.teamEyebrow}>Documents</span>
                  <h2 id="it-recent" className={styles.teamTitle}>Recently updated</h2>
                </div>
              </div>
              <RecentDocuments docs={recent} />
            </section>

            <section className={styles.teamCard} aria-labelledby="it-team">
              <div className={styles.teamHeader}>
                <div>
                  <span className={styles.teamEyebrow}>Information Technology</span>
                  <h2 id="it-team" className={styles.teamTitle}>Senior &amp; Support Team</h2>
                </div>
              </div>
              {teamLoading && teamMembers.length === 0 && (
                <p className={styles.teamMemberRole} role="status" aria-live="polite">
                  Loading team…
                </p>
              )}

              {!teamLoading && teamMembers.length === 0 && (
                <p className={styles.teamMemberRole}>
                  No team members found yet. In the Employee Highlight list, set Show In Dept Team to Yes for the IT people you want here.
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

          <aside className={styles.sidebar} aria-label="IT tools">
            {renderToolsPanel('d', styles.toolsPanelDesktop)}
          </aside>
        </div>
      )}

      <Footer pageIdentifier="IT Team Hub" />
    </div>
  );
};

export default ItHub;
