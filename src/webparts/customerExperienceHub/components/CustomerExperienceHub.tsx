import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './CustomerExperienceHub.module.scss';
import { ICustomerExperienceHubProps } from './ICustomerExperienceHubProps';
import {
  defaultTheme,
  getThemeCssVariables,
} from '../../rapidCityHomepage/theme/ThemeTokens';
import { Footer } from '../../rapidCityHomepage/components/Footer/Footer';
import { Navigation } from '../../rapidCityHomepage/components/Navigation/Navigation';
import { useEmployees } from '../../employeeDirectory/hooks/useEmployees';
import { IEmployee } from '../../employeeDirectory/components/types';
import {
  getEmployeeInitials,
  pickAccentFromString,
} from '../../employeeDirectory/utils/employeeFormatting';

interface ITool {
  label: string;
  icon: string;
  /** External URL that opens in a popup window. Renders a landing card with an "Open" button. */
  href?: string;
  /** URL that opens directly in a new browser tab (no popup, no inline view). */
  externalUrl?: string;
  /** Short one-line description shown on the landing card. */
  description?: string;
  /** Optional iframe URL: when set, clicking the tile loads this inline in the welcome card. */
  embedUrl?: string;
  /** Hint that this tool's embedded view is short enough to render
   *  shorter than the default. The QC Error Log PowerApp, for instance,
   *  doesn't need the full placeholder height. */
  compactEmbed?: boolean;
}

const PASSENGER_FEEDBACK_FORM_URL =
  'https://forms.office.com/pages/responsepage.aspx' +
  '?id=l4y8NMNy7EWK6c1ZaWvyKz85tpnjwg9PsmL0mLznWPZUMTY1NkQ1R01KWVpNUUxKSTQ0SVdNQVJHRy4u' +
  '&route=shorturl';

// SharePoint list view for "Left in Monitor Log". Lives on the root site
// (not /sites/...), so the iframe is cross-site within the same tenant.
// `?env=Embedded` strips SharePoint chrome so only the list content renders.
const LEFT_IN_MONITOR_LOG_URL =
  'https://rapidcitytransport.sharepoint.com' +
  '/Lists/Left%20in%20Monitor%20Log/AllItems.aspx?env=Embedded';

const ERRORS_POWER_APP_URL =
  'https://apps.powerapps.com/play/e/default-34bc8c97-72c3-45ec-8ae9-cd59696bf22b' +
  '/a/7ce7a212-522d-4f92-ae07-0dfde439fa86' +
  '?tenantId=34bc8c97-72c3-45ec-8ae9-cd59696bf22b&sourcetime=1778691409982';

// Agent Dashboard: canvas Power App on the same environment as the Errors
// app, embedded via its play URL in the Tool Viewer iframe.
const AGENT_DASHBOARD_URL =
  'https://apps.powerapps.com/play/e/default-34bc8c97-72c3-45ec-8ae9-cd59696bf22b' +
  '/a/b80bc816-7cc6-4dbb-9025-5e62cdf0ae10' +
  '?tenantId=34bc8c97-72c3-45ec-8ae9-cd59696bf22b&sourcetime=1781712887150';

// Lunch schedule document (Word Online) on the CSQCLeads site. Same approach as
// the weekend workbook: Teams-only params dropped, action=embedview embeds it.
const LUNCH_SCHEDULE_URL =
  'https://rapidcitytransport.sharepoint.com/sites/CSQCLeads/_layouts/15/Doc.aspx' +
  '?sourcedoc=%7B08870003-5f40-4cb5-9cb0-86e248de022b%7D&action=embedview';

// Weekend schedule workbook (Excel Online) on the CSQCLeads site. action=embedview
// renders an interactive embed in the Tool Viewer; the Teams-only params
// (wdExp, TeamsCID) are dropped. "Open full" opens the editable workbook.
const WEEKEND_SCHEDULE_URL =
  'https://rapidcitytransport.sharepoint.com/sites/CSQCLeads/_layouts/15/Doc.aspx' +
  '?sourcedoc=%7B8dcbaa54-16b7-43e6-837b-6c7b56fc3614%7D&action=embedview';

// Procedure Guides (CS) page: opens directly in a new tab, not the Tool Viewer.
const PROCEDURE_GUIDES_URL =
  'https://rapidcitytransport.sharepoint.com/SitePages/Procedure-Guides(CS).aspx';

const TOOLS: ITool[] = [
  {
    label: 'Passenger Feedback Form',
    icon: 'FeedbackRequestSolid',
    href: PASSENGER_FEEDBACK_FORM_URL,
    description: 'Submit feedback about passenger experience or service issues.',
  },
  { label: 'Agent Dashboard',  icon: 'BIDashboard', embedUrl: AGENT_DASHBOARD_URL },
  { label: 'Errors',           icon: 'ErrorBadge',  embedUrl: ERRORS_POWER_APP_URL, compactEmbed: true },
  { label: 'Left in Monitor',  icon: 'ViewList',    embedUrl: LEFT_IN_MONITOR_LOG_URL },
  { label: 'Procedure Guides', icon: 'ReadingMode', externalUrl: PROCEDURE_GUIDES_URL },
  { label: 'Lunch Schedule',   icon: 'Calendar',   embedUrl: LUNCH_SCHEDULE_URL },
  { label: 'Weekend Schedule', icon: 'DateTime', embedUrl: WEEKEND_SCHEDULE_URL },
];

interface IHub {
  label: string;
  icon: string;
  accent: string;
  href: string;
  description: string;
}

const HUBS: IHub[] = [
  {
    label: 'SPRQ Hub',
    icon: 'Headset',
    accent: '#1F4C7F',
    href: 'https://rapidcitytransport.sharepoint.com/sites/CustomerService576/SitePages/SPRQ-Hub.aspx',
    description: 'Client lists, trackers, booking forms, and quote calculators. Everything you need on the floor.',
  },
  {
    label: 'Team Lead Hub',
    icon: 'PartyLeader',
    accent: '#187389',
    href: 'https://rapidcitytransport.sharepoint.com/sites/CSQCLeads/SitePages/Team-Lead-Hub.aspx',
    description: 'Assignments, call monitoring, one on ones, QC logs, and efficiency reports.',
  },
];

/** Predicates that classify an employee for the CX hub team section. */
function inCustomerExperience(emp: IEmployee): boolean {
  return emp.departments.some(d => d.toLowerCase().indexOf('customer') !== -1);
}

function inIT(emp: IEmployee): boolean {
  return emp.departments.some(d => {
    const lower = d.toLowerCase();
    return lower.indexOf('information technology') !== -1 || lower === 'it';
  });
}

/** A row counts as management when one of its department tags is
 *  literally "Management". In the source list this is set alongside the
 *  member's primary department (e.g. ["Customer Experience", "Management"])
 *  to distinguish leadership from line agents. */
function isManagement(emp: IEmployee): boolean {
  return emp.departments.some(d => d.toLowerCase() === 'management');
}

function isCXManagement(emp: IEmployee): boolean {
  return inCustomerExperience(emp) && isManagement(emp);
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

/** The CX hub "senior & support team" is curated through the Employee Highlight
 *  "Show In Dept Team" toggle: a person appears when they're explicitly flagged
 *  for a team panel and tagged Customer Experience. The department check stops
 *  the shared flag (every hub reuses it) from pulling another department's
 *  people into this hub. */
function isCxTeamMember(emp: IEmployee): boolean {
  return !!emp.showInDeptTeam && inCustomerExperience(emp);
}

/** Sort hierarchy: CX Management first, then Team Leads, then Trainers. */
function teamSortRank(emp: IEmployee): number {
  if (isCXManagement(emp)) return 1;
  if (isLevelTeamLead(emp)) return 2;
  if (isLevelTrainer(emp)) return 3;
  return 4;
}

/** Best-effort role label for the team card. The Highlight list doesn't
 *  carry a Level column, so we lean on departments as the role hint. */
function getTeamRoleLabel(emp: IEmployee): string {
  if (emp.level) return emp.level;
  if (isCXManagement(emp)) return 'Customer Experience Management';
  if (isITManagement(emp)) return 'IT Management';
  return 'Team member';
}

// Viva Engage embed config: RISE Hub community feed
const VIVA_ENGAGE_NETWORK = 'rapidcitytransport.com';
const RISE_HUB_GROUP_ID = '2281731358872';
// header=false / footer=false suppress Viva Engage's network-name chrome so
// the iframe shows only the feed itself: avoids redundant labelling with our
// own "Rise Hub" card title and removes the truncated "Rapid City Transport..."
// header inside the narrow sidebar column.
const RISE_HUB_EMBED_URL =
  `https://web.yammer.com/embed/groups?domain=${VIVA_ENGAGE_NETWORK}` +
  `&feedType=group&feedId=${RISE_HUB_GROUP_ID}` +
  `&theme=light&header=false&footer=false&useSso=true`;
const RISE_HUB_DEEP_LINK =
  `https://engage.cloud.microsoft/main/org/${VIVA_ENGAGE_NETWORK}` +
  `/groups/eyJfdHlwZSI6Ikdyb3VwIiwiaWQiOiIyMjgxNzMxMzU4NzIifQ/all`;

const CustomerExperienceHub: React.FC<ICustomerExperienceHubProps> = ({ title, subtitle }) => {
  const themeVars = React.useMemo(
    () => getThemeCssVariables(defaultTheme) as React.CSSProperties,
    []
  );

  const [activeTool, setActiveTool] = React.useState<ITool | null>(null);

  /** Full URL for the active tool: same as what we embed, minus the
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

  const handleToolClick = React.useCallback((tool: ITool): void => {
    if (tool.externalUrl) {
      window.open(tool.externalUrl, '_blank', 'noopener,noreferrer');
    } else if (tool.href) {
      window.open(tool.href, '_blank', 'popup,width=900,height=900,scrollbars=yes,resizable=yes');
    } else {
      setActiveTool(tool);
    }
  }, []);

  const { employees, gridLoading: teamLoading } = useEmployees();

  const teamMembers = React.useMemo<IEmployee[]>(() => {
    return employees
      .filter(isCxTeamMember)
      .sort((a, b) => {
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

  return (
    <div className={styles.hub} style={themeVars}>
      <Navigation onSearch={handleSearch} activePage="departmentHub" />
      <div className={styles.layout}>
        <a
          href="https://rapidcitytransport.sharepoint.com/sites/compass/SitePages/CustomerExperience.aspx"
          className={styles.backLink}
        >
          ← Back to the public CX page
        </a>

        <main className={styles.mainColumn}>
          {/* Page title banner: keeps the blue hero, no featured announcement */}
          <header className={styles.newsCard}>
            <div className={styles.newsBody}>
              <h1 className={styles.newsTitle}>Customer Experience Department Hub</h1>
            </div>
          </header>

          {/* Tools panel, mobile-only copy. On single-column widths this
              renders directly above the Tool Viewer card so the dark Tools
              panel isn't stranded at the bottom when the sidebar stacks.
              Hidden on desktop; the desktop copy lives in the sidebar. Both
              are wired to the same activeTool state/handlers. */}
          <section className={`${styles.toolsPanel} ${styles.toolsPanelMobile}`} aria-labelledby="cx-tools-m">
            <div className={styles.panelHeader}>
              <h2 id="cx-tools-m" className={styles.panelTitle}><Icon iconName="Toolbox" aria-hidden="true" />Tools</h2>
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

          <section className={styles.welcomeCard} aria-labelledby="cx-welcome">
            <div className={styles.welcomeHeader}>
              <div className={styles.welcomeHeaderLeft}>
                <Icon iconName="Clock" className={styles.welcomeHeaderIcon} aria-hidden="true" />
                <div>
                  <p className={styles.welcomeEyebrow}>Welcome back</p>
                  <h2 id="cx-welcome" className={styles.welcomeTitle}>{title}</h2>
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

                  {activeTool.embedUrl ? (
                    <iframe
                      title={`${activeTool.label} — embedded view`}
                      src={activeTool.embedUrl}
                      className={`${styles.toolContentFrame} ${activeTool.compactEmbed ? styles.toolContentFrameCompact : ''}`}
                      loading="lazy"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allow="clipboard-read; clipboard-write; geolocation; microphone; camera"
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

          <section className={styles.trainerHubCard} aria-labelledby="cx-hubs">
            <div className={styles.trainerHubHeader}>
              <div>
                <span className={styles.trainerHubEyebrow}>Quick Hubs</span>
                <h2 id="cx-hubs" className={styles.trainerHubTitle}>Hubs</h2>
              </div>
              <span className={styles.trainerHubSubtitle}>
                Specialized resources for the team. Pick a hub to dive in.
              </span>
            </div>
            <ul className={`${styles.trainerHubGrid} ${styles.hubsGrid}`} role="list">
              {HUBS.map((hub) => (
                <li key={hub.label}>
                  <a
                    href={hub.href}
                    className={`${styles.trainerDeptTile} ${styles.hubTile}`}
                    style={{ ['--dept-accent' as string]: hub.accent } as React.CSSProperties}
                    aria-label={`${hub.label} — ${hub.description}`}
                  >
                    <span className={styles.hubTileHead}>
                      <span className={styles.trainerDeptIcon} aria-hidden="true">
                        <Icon iconName={hub.icon} />
                      </span>
                      <span className={styles.trainerDeptLabel}>{hub.label}</span>
                    </span>
                    <span className={styles.hubTileBody}>
                      <span className={styles.hubDescription}>{hub.description}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.teamCard} aria-labelledby="cx-team">
            <div className={styles.teamHeader}>
              <div>
                <span className={styles.teamEyebrow}>Customer Experience</span>
                <h2 id="cx-team" className={styles.teamTitle}>Senior &amp; Support Team</h2>
              </div>
              <div className={styles.teamHeaderActions}>
                <a href="#team-all" className={styles.teamViewAll}>View all</a>
              </div>
            </div>
            {teamLoading && teamMembers.length === 0 && (
              <p className={styles.teamMemberRole} role="status" aria-live="polite">
                Loading team…
              </p>
            )}

            {!teamLoading && teamMembers.length === 0 && (
              <p className={styles.teamMemberRole}>
                No team members found yet. In the Employee Highlight list, set Show In Dept Team to Yes for the Customer Experience people you want here.
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

        <aside className={styles.sidebar} aria-label="Tools, feed, and events">
          <section className={`${styles.toolsPanel} ${styles.toolsPanelDesktop}`} aria-labelledby="cx-tools">
            <div className={styles.panelHeader}>
              <h2 id="cx-tools" className={styles.panelTitle}><Icon iconName="Toolbox" aria-hidden="true" />Tools</h2>
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

          <section className={styles.engageCard} aria-labelledby="cx-engage">
            <div className={styles.panelHeader}>
              <h2 id="cx-engage" className={styles.panelTitle}>
                <span className={styles.engageIcon} aria-hidden="true">
                  <Icon iconName="Chat" />
                </span>
                Rise Hub
              </h2>
              <a
                href={RISE_HUB_DEEP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.panelLink}
                aria-label="Open RISE Hub in Viva Engage in a new tab"
              >
                Open <Icon iconName="OpenInNewTab" aria-hidden="true" />
              </a>
            </div>
            <div className={styles.engageFrameClip}>
              <iframe
                title="RISE Hub community feed (Viva Engage)"
                src={RISE_HUB_EMBED_URL}
                className={styles.engageFrame}
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allow="clipboard-read; clipboard-write"
              />
            </div>
          </section>

          <section className={styles.policyCard} aria-labelledby="cx-policy-title">
            <h2 id="cx-policy-title" className={styles.policyTitle}>Breaks & Sick Calls</h2>

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
                <a href="tel:9056216844">Albert: 905-621-6844</a> (primary contact)<br />
                <a href="tel:9056227566">Shelly: 905-622-7566</a> (if Albert is unavailable)
              </p>
            </div>
          </section>

        </aside>
      </div>

      <Footer pageIdentifier="Customer Experience Hub" />
    </div>
  );
};

export default CustomerExperienceHub;
