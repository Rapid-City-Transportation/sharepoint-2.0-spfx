import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './HealthSafety.module.scss';
import { IHealthSafetyProps } from './IHealthSafetyProps';
import { defaultTheme, getThemeCssVariables } from '../../rapidCityHomepage/theme/ThemeTokens';
import { Navigation } from '../../rapidCityHomepage/components/Navigation/Navigation';
import { Footer } from '../../rapidCityHomepage/components/Footer/Footer';
import { useJhscMembers } from '../hooks/useJhscMembers';
import IncidentReportForm from './IncidentReportForm';
import {
  getEmployeeInitials,
  pickAccentFromString,
} from '../../employeeDirectory/utils/employeeFormatting';

interface ITool {
  label: string;
  icon: string;
  /** SharePoint embed URL: renders inline in the viewer. */
  docUrl?: string;
  /** The document's own URL, for "Open full". */
  fullUrl?: string;
  /** Outside site: opens in a new tab instead of the viewer. */
  externalUrl?: string;
}

// Documents live in the "Health & Safety" folder of the compass Documents
// library, addressed by UniqueId so renames and moves cannot break them.
// External references are the URLs from the previous H&S page.
const TOOLS: ITool[] = [
  {
    label: 'Health and Safety Policy',
    icon: 'Shield',
    docUrl: 'https://rapidcitytransport.sharepoint.com/sites/compass/_layouts/15/embed.aspx?UniqueId=9bd6b7c8-d005-4883-98ec-3e6a2425e192',
    fullUrl: 'https://rapidcitytransport.sharepoint.com/sites/compass/Shared%20Documents/Health%20%26%20Safety/RCT-HS-2018-0003-Health%20and%20Safety%20Policy-V2.pdf',
  },
  {
    label: 'Workplace Harassment and Discrimination Policy',
    icon: 'People',
    docUrl: 'https://rapidcitytransport.sharepoint.com/sites/compass/_layouts/15/embed.aspx?UniqueId=51ccd5c2-9d50-49ef-b571-27f3de93f801',
    fullUrl: 'https://rapidcitytransport.sharepoint.com/sites/compass/Shared%20Documents/Health%20%26%20Safety/RCT-HS-2019-0004-Workplace%20Harassment%20and%20Discrimination%20Policy-V2.pdf',
  },
  {
    label: 'Workplace Violence Policy',
    icon: 'ReportWarning',
    docUrl: 'https://rapidcitytransport.sharepoint.com/sites/compass/_layouts/15/embed.aspx?UniqueId=827b60a4-f56f-49ee-ba29-f1710545fe06',
    fullUrl: 'https://rapidcitytransport.sharepoint.com/sites/compass/Shared%20Documents/Health%20%26%20Safety/RCT-HS-2020-0005-Workplace%20Violence%20Policy-V2.pdf',
  },
  {
    // Embeds the library view of the JHSC folder, so new minutes and
    // walk-throughs appear without a deploy.
    label: 'JHSC Documents',
    icon: 'DocLibrary',
    docUrl: 'https://rapidcitytransport.sharepoint.com/sites/compass/Shared%20Documents/Forms/AllItems.aspx?id=%2Fsites%2Fcompass%2FShared%20Documents%2FHealth%20%26%20Safety%2FJHSC&env=Embedded',
    fullUrl: 'https://rapidcitytransport.sharepoint.com/sites/compass/Shared%20Documents/Forms/AllItems.aspx?id=%2Fsites%2Fcompass%2FShared%20Documents%2FHealth%20%26%20Safety%2FJHSC',
  },
  {
    label: 'Occupational Health and Safety Act (OHSA)',
    icon: 'Library',
    externalUrl: 'https://www.ontario.ca/laws/statute/90o01',
  },
  {
    label: 'Ministry of Labour (MOL)',
    icon: 'Bank',
    externalUrl: 'https://www.ontario.ca/page/workplace-health-and-safety',
  },
  {
    label: 'Ministry of Labour, Training and Skills Development',
    icon: 'Globe',
    externalUrl: 'https://www.ontario.ca/page/ministry-labour-immigration-training-skills-development',
  },
  {
    label: 'Workplace Safety and Insurance Board (WSIB)',
    icon: 'Medical',
    externalUrl: 'https://www.wsib.ca/en',
  },
];

interface IPoster {
  label: string;
  /** Bundled PNG of the poster. An image cannot grow scrollbars, toolbars,
   *  or permission banners the way the PDF viewer does. */
  imageUrl?: string;
  /** Concise reading of the poster for screen readers; the PDF behind
   *  "Open full" carries the complete text. */
  alt: string;
  /** The real PDF, for reading and printing. */
  fullUrl?: string;
}

// Required on this page at all times, by H&S request: rendered directly,
// never behind a tool tile.
const POSTERS: IPoster[] = [
  {
    label: 'In Case of Injury or Illness at Work (WSIB)',
    imageUrl: require('../assets/in-case-of-injury-poster.png'),
    alt:
      'Poster: in case of injury or illness at work. 1, get medical help; your '
      + 'employer provides first aid and pays for transportation on the day of '
      + 'injury. 2, document; tell your employer about the injury or illness. '
      + '3, report to the WSIB at wsib.ca/reporting within three business days. '
      + '4, work together on recovery and safe return to work. Questions: '
      + '1-800-387-0750 or TTY 711.',
    fullUrl:
      'https://rapidcitytransport.sharepoint.com/sites/compass/Shared%20Documents/Health%20%26%20Safety/In_Case_of_Injury.pdf',
  },
  {
    label: 'Health & Safety at Work: Prevention Starts Here (Ontario)',
    imageUrl: require('../assets/prevention-starts-here-poster.png'),
    alt:
      'Poster: health and safety at work, prevention starts here. The '
      + 'Occupational Health and Safety Act gives workers the right to know '
      + 'about hazards, participate in solving problems, and refuse unsafe '
      + 'work, and sets duties for workers, employers, and supervisors. '
      + 'Employers must not take action against workers for raising concerns. '
      + 'Ministry of Labour: 1-877-202-0008. Emergency: always call 911.',
    fullUrl:
      'https://rapidcitytransport.sharepoint.com/sites/compass/Shared%20Documents/Health%20%26%20Safety/mltsd-prevention-poster-en-2020-07-22.pdf',
  },
];

/** Public Health & Safety page: emergency and hazard steps, always-visible
 *  safety posters, a policies/resources toolbox, and the JHSC roster (the
 *  page's only live data, read from the Employee Highlight list). */
const HealthSafety: React.FC<IHealthSafetyProps> = () => {
  const themeVars = React.useMemo(
    () => getThemeCssVariables(defaultTheme) as React.CSSProperties,
    []
  );

  const [activeTool, setActiveTool] = React.useState<ITool | null>(null);
  const activeDocFullUrl = activeTool?.fullUrl;

  // Closing unmounts the focused button, so put focus back on the heading.
  const handleCloseTool = React.useCallback((): void => {
    setActiveTool(null);
    document.getElementById('hs-tools-heading')?.focus();
  }, []);

  const handleToolClick = React.useCallback((tool: ITool): void => {
    if (tool.externalUrl) {
      window.open(tool.externalUrl, '_blank', 'noopener,noreferrer');
    } else {
      setActiveTool(tool);
    }
  }, []);

  // Dormant: the nav renders its search box only on the card pages. If it
  // ever shows here, queries land on the Contact Cards search.
  const handleNavSearch = React.useCallback((query: string): void => {
    const q = (query || '').trim();
    const url = q
      ? `/SitePages/ContactCards.aspx?q=${encodeURIComponent(q)}`
      : '/SitePages/ContactCards.aspx';
    window.location.assign(url);
  }, []);

  const { members, loading: membersLoading } = useJhscMembers();
  const [incidentOpen, setIncidentOpen] = React.useState(false);

  const openIncidentForm = React.useCallback((): void => {
    setIncidentOpen(true);
    // The section may still be collapsed at click time; scroll after render,
    // hand focus to the form heading, and honor reduced-motion preferences.
    window.setTimeout(() => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      document
        .getElementById('hs-incident')
        ?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
      document
        .getElementById('hs-incident-title')
        ?.focus({ preventScroll: true });
    }, 60);
  }, []);

  return (
    <div className={styles.page} style={themeVars}>
      <a href="#hs-main" className={styles.skipLink}>Skip to main content</a>
      <Navigation onSearch={handleNavSearch} activePage="healthSafety" />

      <main id="hs-main" className={styles.main} role="main" tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="hs-title">
          <div className={styles.heroText}>
            <h1 id="hs-title" className={styles.heroTitle}>Health &amp; Safety</h1>
            <p className={styles.heroIntro}>
              What to do when someone is hurt, how to report an incident, and where to
              find the policies and the people who keep our workplace safe.
            </p>
          </div>
          <div className={styles.heroActions}>
            <button
              type="button"
              className={styles.heroCta}
              onClick={openIncidentForm}
              aria-controls="hs-incident"
            >
              Submit an Incident Report
            </button>
          </div>
        </section>

        <section className={styles.emergencySection} aria-labelledby="hs-emergency-title">
          <h2 id="hs-emergency-title" className={styles.srOnlyHeading}>Emergencies and hazards</h2>
          <div className={styles.emergencyGrid}>
            <div className={styles.emergencyCard}>
              <h3 className={styles.emergencyTitle}>
                <Icon iconName="Warning" className={styles.emergencyIcon} aria-hidden="true" />
                Someone is hurt
              </h3>
              <p className={styles.emergencyLead}>Always first:</p>
              <ol className={styles.emergencySteps}>
                <li>If it is serious, <strong>call 9-1-1</strong> for medical assistance.</li>
                <li>
                  Get the nearest first aid kit:
                  <ul className={styles.kitList}>
                    <li>1st floor: outside the lunch room</li>
                    <li>2nd floor: hallway at the top of the stairs, by the washrooms</li>
                  </ul>
                </li>
                <li>Call a First Aid Certified member (listed below).</li>
              </ol>
              <p className={styles.emergencyThen}>
                Then contact your direct manager; if they are not available, contact a member
                of the Joint Health and Safety Committee. Once everyone is safe, submit an
                incident report below so HR and the committee can follow up.
              </p>
            </div>

            <div className={styles.emergencyCard}>
              <h3 className={styles.hazardTitle}>
                <Icon iconName="RedEye" className={styles.hazardIcon} aria-hidden="true" />
                Did an incident occur?
              </h3>
              <p className={styles.emergencyThen}>
                Injuries, near misses, hazards, and confidential concerns can all be
                reported online. Tell your direct manager when you can, and file the
                report so nothing gets lost.
              </p>
              <button
                type="button"
                className={styles.incidentInlineButton}
                onClick={openIncidentForm}
                aria-controls="hs-incident"
              >
                File an incident report
              </button>
            </div>
          </div>
        </section>

        <IncidentReportForm open={incidentOpen} onToggle={setIncidentOpen} />

        {/* Required to stay on the page at all times: rendered directly, never
            behind a tool tile, by H&S request. */}
        <section className={styles.postersSection} aria-labelledby="hs-posters-title">
          <h2 id="hs-posters-title" className={styles.sectionTitle}>
            <Icon iconName="Pinned" className={styles.sectionIcon} aria-hidden="true" />
            Safety posters
          </h2>
          <div className={styles.postersGrid}>
            {POSTERS.map((poster) => (
              <div key={poster.label} className={styles.posterPanel}>
                <div className={styles.posterHeader}>
                  <h3 className={styles.posterTitle}>{poster.label}</h3>
                  {poster.fullUrl && (
                    <a
                      className={styles.posterOpen}
                      href={poster.fullUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${poster.label} in a new tab`}
                    >
                      Open full <Icon iconName="OpenInNewTab" aria-hidden="true" />
                    </a>
                  )}
                </div>
                {poster.imageUrl ? (
                  <img
                    src={poster.imageUrl}
                    alt={poster.alt}
                    className={styles.posterImage}
                    loading="lazy"
                  />
                ) : (
                  <div className={styles.posterPending}>
                    <Icon iconName="Pinned" className={styles.posterPendingIcon} aria-hidden="true" />
                    <p className={styles.posterPendingText}>
                      This poster displays here once its PDF is uploaded to the Health and
                      Safety folder in the compass Documents library.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className={styles.toolboxSection} aria-labelledby="hs-tools-heading">
          <h2 id="hs-tools-heading" className={styles.sectionTitle} tabIndex={-1}>
            <Icon iconName="ReadingMode" className={styles.sectionIcon} aria-hidden="true" />
            Policies &amp; resources
          </h2>
          <p className={styles.toolboxIntro}>
            Our workplace policies, JHSC documents, and the provincial references.
          </p>

          <div className={styles.toolboxLayout}>
            <section className={styles.toolsPanel} aria-labelledby="hs-tools-title">
              <div className={styles.panelHeader}>
                <h3 id="hs-tools-title" className={styles.panelTitle}>
                  <Icon iconName="Toolbox" aria-hidden="true" />Tools
                </h3>
              </div>
              <ul className={styles.toolsGrid} role="list">
                {TOOLS.map((tool) => {
                  const isActive = activeTool?.label === tool.label;
                  const isExternal = !!tool.externalUrl;
                  return (
                    <li key={tool.label}>
                      <button
                        type="button"
                        className={`${styles.toolTile} ${isActive ? styles.toolTileActive : ''}`}
                        onClick={() => handleToolClick(tool)}
                        aria-pressed={isExternal ? undefined : isActive}
                        aria-label={isExternal ? `${tool.label}, opens in a new tab` : undefined}
                      >
                        {isExternal && (
                          <span className={styles.toolTileExternal} aria-hidden="true">
                            <Icon iconName="OpenInNewTab" />
                          </span>
                        )}
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

            <div className={styles.toolViewer} aria-live="polite">
              {!activeTool && (
                <div className={styles.toolViewerEmpty}>
                  <Icon
                    iconName="ViewList"
                    className={styles.toolViewerEmptyIcon}
                    aria-hidden="true"
                  />
                  <p className={styles.toolViewerEmptyText}>
                    Select a policy or resource to view it here.
                  </p>
                </div>
              )}

              {activeTool && (
                <div className={styles.toolViewerContent}>
                  <header className={styles.toolViewerHeader}>
                    <div>
                      <p className={styles.toolViewerEyebrow}>Now viewing</p>
                      <h3 className={styles.toolViewerTitle}>{activeTool.label}</h3>
                    </div>
                    <div className={styles.toolViewerActions}>
                      {activeDocFullUrl && (
                        <button
                          type="button"
                          className={styles.toolViewerOpen}
                          onClick={() => window.open(activeDocFullUrl, '_blank', 'noopener,noreferrer')}
                          aria-label={`Open full ${activeTool.label} in a new tab`}
                        >
                          Open full <Icon iconName="OpenInNewTab" aria-hidden="true" />
                        </button>
                      )}
                      <button
                        type="button"
                        className={styles.toolViewerClose}
                        onClick={handleCloseTool}
                        aria-label="Close"
                      >
                        <Icon iconName="Cancel" />
                      </button>
                    </div>
                  </header>

                  {activeTool.docUrl ? (
                    <iframe
                      title={activeTool.label}
                      src={activeTool.docUrl}
                      className={styles.toolDocFrame}
                      loading="lazy"
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  ) : (
                    <div className={styles.toolComingSoon}>
                      <Icon
                        iconName="ConstructionCone"
                        className={styles.toolComingSoonIcon}
                        aria-hidden="true"
                      />
                      <p className={styles.toolComingSoonText}>
                        <strong>{activeTool.label}</strong> is being prepared and will appear
                        here once its document is uploaded.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className={styles.membersSection} aria-labelledby="hs-members-title">
          <h2 id="hs-members-title" className={styles.sectionTitle}>
            <Icon iconName="Group" className={styles.sectionIcon} aria-hidden="true" />
            Joint Health and Safety Committee
          </h2>
          {membersLoading && members.length === 0 && (
            <p className={styles.membersStatus} role="status" aria-live="polite">
              Loading committee members…
            </p>
          )}
          {!membersLoading && members.length === 0 && (
            <p className={styles.membersStatus}>
              No committee members listed yet. Members are marked in the Employee
              Highlight list (the JHSC Role column) and appear here automatically.
            </p>
          )}
          {members.length > 0 && (
            <ul className={styles.membersGrid} role="list">
              {members.map((m) => (
                <li key={m.id} className={styles.memberCard}>
                  <div className={styles.memberTop}>
                    {m.photoUrl ? (
                      <img src={m.photoUrl} alt="" className={styles.memberAvatar} />
                    ) : (
                      <span
                        className={styles.memberAvatar}
                        style={{ background: pickAccentFromString(m.name) }}
                        aria-hidden="true"
                      >
                        {getEmployeeInitials(m.name)}
                      </span>
                    )}
                    <div className={styles.memberInfo}>
                      <p className={styles.memberName}>{m.name}</p>
                      {m.jobTitle && <p className={styles.memberJob}>{m.jobTitle}</p>}
                    </div>
                  </div>
                  <div className={styles.memberFooter}>
                    {m.committeeRole && (
                      <p className={styles.memberCommittee}>{m.committeeRole}</p>
                    )}
                    {m.email && (
                      <a
                        className={styles.memberMail}
                        href={`mailto:${m.email}`}
                        aria-label={`Email ${m.name}`}
                      >
                        <Icon iconName="Mail" />
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <Footer pageIdentifier="Health & Safety Page" />
    </div>
  );
};

export default HealthSafety;
