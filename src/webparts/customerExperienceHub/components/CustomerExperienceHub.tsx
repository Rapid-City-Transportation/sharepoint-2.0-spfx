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

// Placeholder data: Everything in this file is placeholder content
// for visual review. Real data will be migrated in from the existing
// SharePoint site once the layout is approved.

interface ITool {
  label: string;
  icon: string;
  /** External URL that opens in a new tab. Renders a landing card with an "Open" button. */
  href?: string;
  /** Short one-line description shown on the landing card. */
  description?: string;
  /** Optional iframe URL — when set, clicking the tile loads this inline in the welcome card. */
  embedUrl?: string;
  /** Hint that this tool's embedded view is short enough to render
   *  shorter than the default — the QC Error Log PowerApp, for instance,
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

const TOOLS: ITool[] = [
  {
    label: 'Passenger Feedback Form',
    icon: 'FeedbackRequestSolid',
    href: PASSENGER_FEEDBACK_FORM_URL,
    description: 'Submit feedback about passenger experience or service issues.',
  },
  { label: 'Agent Dashboard',  icon: 'BIDashboard' },
  { label: 'Errors',           icon: 'ErrorBadge',  embedUrl: ERRORS_POWER_APP_URL, compactEmbed: true },
  { label: 'Left in Monitor',  icon: 'ViewList',    embedUrl: LEFT_IN_MONITOR_LOG_URL },
  { label: 'Procedure Guides', icon: 'ReadingMode' },
  { label: 'Lunch Schedule',   icon: 'Calendar' },
  { label: 'Weekend Schedule', icon: 'DateTime' },
];

// Hardcoded content for the Lunch Schedule tool. Demoed for now to show
// the click-tile-swap behavior in the Welcome card placeholder. Real
// content for the other tools will plug in via the same pattern later.
const LUNCH_SCHEDULE_RULES = [
  'Before you take a break, ensure (via Teams chats or the bell app) that no additional agents are on break at the same time.',
  'If someone is on lunch, only ONE additional person should be on break at the same time. That break should NOT exceed 5–8 minutes.',
  'If you work within the same department, you are NOT authorized to take a break together.',
  'Take your lunch break as scheduled, but do not disconnect or transfer a call to start your break. Complete the call first, then start your break.',
  'For a short/smoke break, there must not be a queue, and agents may not take breaks together. We must always have people available for incoming calls.',
  'Breaks may not be taken in the first or last 1.5 hours of your shift. (e.g. if you start at 9:00 AM, your first break cannot be taken until 10:30 AM. If you finish at 5:00 PM, your last break is at 3:30 PM.)',
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
    href: '#sprq-hub',
    description: 'Scripts, processes, resources and quality tools. Everything you need on the floor.',
  },
  {
    label: 'Teams Lead Hub',
    icon: 'PartyLeader',
    accent: '#187389',
    href: 'https://rapidcitytransport.sharepoint.com/SitePages/TeamLeadHub.aspx',
    description: 'Coaching templates, KPIs, escalation playbooks and L&D resources.',
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

/** Always render the team-card scope as "<department> · Management" so
 *  every card reads in the same order regardless of how SharePoint stored
 *  the multi-choice values. */
function orderTeamScope(departments: string[]): string[] {
  const nonMgmt = departments.filter(d => d.toLowerCase() !== 'management');
  const mgmt    = departments.filter(d => d.toLowerCase() === 'management');
  return [...nonMgmt, ...mgmt];
}

/** Sort hierarchy: CX Management first, then IT Management, alphabetical within. */
function teamSortRank(emp: IEmployee): number {
  if (isCXManagement(emp)) return 1;
  if (isITManagement(emp)) return 2;
  return 3;
}

/** Best-effort role label for the team card. The Highlight list doesn't
 *  carry a Level column, so we lean on departments as the role hint. */
function getTeamRoleLabel(emp: IEmployee): string {
  if (emp.level) return emp.level;
  if (isCXManagement(emp)) return 'Customer Experience Management';
  if (isITManagement(emp)) return 'IT Management';
  return 'Team member';
}

interface IEvent {
  month: string;
  day: string;
  title: string;
  time: string;
  location: string;
}

const EVENTS: IEvent[] = [
  { month: 'MAY', day: '15', title: 'Spring pizza day',           time: '12:00 PM',         location: 'Lunch room' },
  { month: 'MAY', day: '21', title: 'Notification rollout',       time: 'All day',          location: 'CX Section' },
  { month: 'MAY', day: '23', title: 'Team outing · axe throwing', time: '5:00 PM onwards',  location: 'Off-site' },
  { month: 'MAY', day: '28', title: 'Social committee mixer',     time: '4:00 – 5:30 PM',  location: 'Lounge' },
];

// Viva Engage embed config — RISE Hub community feed
const VIVA_ENGAGE_NETWORK = 'rapidcitytransport.com';
const RISE_HUB_GROUP_ID = '2281731358872';
// header=false / footer=false suppress Viva Engage's network-name chrome so
// the iframe shows only the feed itself — avoids redundant labelling with our
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

  /** Full URL for the active tool — same as what we embed, minus the
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

  // Pull the active employee roster from the shared Employee Directory
  // hook, then narrow to the people the CX hub team section actually
  // wants to surface: CX management + supervisors + CX team leads + IT.
  const { employees, gridLoading: teamLoading } = useEmployees();

  const teamMembers = React.useMemo<IEmployee[]>(() => {
    return employees
      .filter(emp => isCXManagement(emp) || isITManagement(emp))
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
        <main className={styles.mainColumn}>
          {/* News hero */}
          <article className={styles.newsCard} aria-labelledby="cx-news-title">
            <div className={styles.newsHeader}>
              <span className={styles.newsKicker}>NEWS</span>
              <div className={styles.newsHeaderActions}>
                <button type="button" className={styles.newsAdd}>
                  <span aria-hidden="true">+</span> Add post
                </button>
                <a href="#all-news" className={styles.newsSeeAll}>See all</a>
              </div>
            </div>
            <div className={styles.newsBody}>
              <span className={styles.featuredBadge}>
                <span className={styles.featuredDot} aria-hidden="true" />
                Featured · Announcement
              </span>
              <h2 id="cx-news-title" className={styles.newsTitle}>
                Introducing your department hub
              </h2>
              <p className={styles.newsExcerpt}>
                One home for the team’s tools, news, training, and people.
              </p>
              <a href="#article" className={styles.readArticleBtn}>
                Read more <span aria-hidden="true">→</span>
              </a>
            </div>
          </article>

          {/* Welcome back + placeholder area */}
          <section className={styles.welcomeCard} aria-labelledby="cx-welcome">
            <div className={styles.welcomeHeader}>
              <div className={styles.welcomeHeaderLeft}>
                <Icon iconName="Clock" className={styles.welcomeHeaderIcon} aria-hidden="true" />
                <div>
                  <p className={styles.welcomeEyebrow}>Welcome back</p>
                  <h3 id="cx-welcome" className={styles.welcomeTitle}>{title}</h3>
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

                  {activeTool.label === 'Lunch Schedule' ? (
                    <div className={styles.toolContentBody}>
                      <div className={styles.lunchSummary}>
                        <span className={styles.lunchPill}>Two 15-minute breaks</span>
                        <span className={styles.lunchPill}>One 30-minute lunch break</span>
                      </div>
                      <h5 className={styles.lunchSubheading}>Rules</h5>
                      <ol className={styles.lunchRules}>
                        {LUNCH_SCHEDULE_RULES.map((rule, i) => (
                          <li key={i}>{rule}</li>
                        ))}
                      </ol>
                    </div>
                  ) : activeTool.embedUrl ? (
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

          {/* Hubs (SPRQ Hub, Teams Lead Hub) */}
          <section className={styles.trainerHubCard} aria-labelledby="cx-hubs">
            <div className={styles.trainerHubHeader}>
              <div>
                <span className={styles.trainerHubEyebrow}>Quick Hubs</span>
                <h3 id="cx-hubs" className={styles.trainerHubTitle}>Hubs</h3>
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

          {/* Senior & Support Team */}
          <section className={styles.teamCard} aria-labelledby="cx-team">
            <div className={styles.teamHeader}>
              <div>
                <span className={styles.teamEyebrow}>Customer Experience</span>
                <h3 id="cx-team" className={styles.teamTitle}>Senior &amp; Support Team</h3>
              </div>
              <div className={styles.teamHeaderActions}>
                <button type="button" className={styles.teamAddBtn}>
                  <span aria-hidden="true">+</span> Add member
                </button>
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
                No team members found yet. Check the Employee Highlight list for entries tagged with Management.
              </p>
            )}

            {teamMembers.length > 0 && (
              <ul className={styles.teamGrid} role="list">
                {teamMembers.map((member) => {
                  const accent = pickAccentFromString(member.name);
                  const initials = getEmployeeInitials(member.name);
                  const role = getTeamRoleLabel(member);
                  const scope = orderTeamScope(member.departments).join(' · ') || '—';

                  return (
                    <li key={member.id} className={styles.teamMember}>
                      <div className={styles.teamMemberTop}>
                        <span
                          className={styles.teamAvatar}
                          style={{ background: accent }}
                          aria-hidden="true"
                        >
                          {initials}
                        </span>
                        <div className={styles.teamMemberInfo}>
                          <span className={styles.teamMemberName}>{member.name}</span>
                          <span className={styles.teamMemberRole}>{role}</span>
                        </div>
                      </div>
                      <div className={styles.teamMemberFooter}>
                        <span className={styles.teamMemberScope}>{scope}</span>
                        <div className={styles.teamMemberContact} aria-hidden="true">
                          <span><Icon iconName="Mail" /></span>
                          <span><Icon iconName="Chat" /></span>
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
          {/* Tools panel */}
          <section className={styles.toolsPanel} aria-labelledby="cx-tools">
            <div className={styles.panelHeader}>
              <h3 id="cx-tools" className={styles.panelTitle}>Tools</h3>
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

          {/* Rise Hub feed (Viva Engage embed) */}
          <section className={styles.engageCard} aria-labelledby="cx-engage">
            <div className={styles.panelHeader}>
              <h3 id="cx-engage" className={styles.panelTitle}>
                <span className={styles.engageIcon} aria-hidden="true">
                  <Icon iconName="Chat" />
                </span>
                Rise Hub
              </h3>
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

          {/* Upcoming events */}
          <section className={styles.eventsCard} aria-labelledby="cx-events">
            <div className={styles.panelHeader}>
              <h3 id="cx-events" className={styles.panelTitle}>
                <span className={styles.eventsIcon} aria-hidden="true">
                  <Icon iconName="Calendar" />
                </span>
                Upcoming events
              </h3>
              <a href="#calendar" className={styles.panelLink}>Calendar</a>
            </div>
            <ul className={styles.eventsList} role="list">
              {EVENTS.map((event, i) => (
                <li key={i} className={styles.eventRow}>
                  <div className={styles.eventDate}>
                    <span className={styles.eventMonth}>{event.month}</span>
                    <span className={styles.eventDay}>{event.day}</span>
                  </div>
                  <div className={styles.eventInfo}>
                    <span className={styles.eventTitle}>{event.title}</span>
                    <span className={styles.eventMeta}>
                      <span>{event.time}</span>
                      <span className={styles.eventLocationPill}>{event.location}</span>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <Footer pageIdentifier="Customer Experience Hub" />
    </div>
  );
};

export default CustomerExperienceHub;
