import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './HrSupport.module.scss';
import { IHrSupportProps } from './IHrSupportProps';
import { defaultTheme, getThemeCssVariables } from '../../rapidCityHomepage/theme/ThemeTokens';
import { Navigation } from '../../rapidCityHomepage/components/Navigation/Navigation';
import { Footer } from '../../rapidCityHomepage/components/Footer/Footer';
import { usePerkPosters } from '../hooks/usePerkPosters';
import { IPerkPoster, PERKS_FOLDER_URL } from '../services/perksService';

const HR_EMAIL = 'hr@rapidcitytransport.com';

interface IGuide {
  /** Stable key, and the URL hash that opens the guide (HRSupport.aspx#benefits). */
  id: string;
  label: string;
  icon: string;
  /** Posters read from the Benefits and Perks folder: one viewer for all of them. */
  perks?: boolean;
  /** SharePoint embed URL: renders inline in the viewer. */
  docUrl?: string;
  /** The document's own URL, for "Open full". Given explicitly rather than
   *  derived: PDFs embed through embed.aspx, which carries no embed-only
   *  parameter to strip back off. */
  fullUrl?: string;
  /** Third-party page: opens in a new tab instead, since outside sites refuse
   *  to be framed and should not be dressed up as our own content. */
  externalUrl?: string;
}

// Documents live in the HR Support folder of the Compass Documents library.
// They are addressed by UniqueId, so renaming or moving a file does not break
// the embed; only deleting it would.
const DOC_BASE =
  'https://rapidcitytransport.sharepoint.com/sites/compass/_layouts/15/embed.aspx?UniqueId=';
const LIBRARY = 'https://rapidcitytransport.sharepoint.com/sites/compass/Shared%20Documents/HR%20Support';

// Alphabetical.
const GUIDES: IGuide[] = [
  {
    id: 'benefits',
    label: 'Benefits & Perks',
    icon: 'Giftbox',
    perks: true,
  },
  {
    id: 'handbook',
    label: 'Employee Handbook',
    icon: 'ReadingMode',
    docUrl: `${DOC_BASE}35be75e7-110e-485a-aeea-b53fd61fc5e3`,
    fullUrl: `${LIBRARY}/RCT-HR-2021-0004-Office%20Employee%20Handbook-V4.pdf`,
  },
  {
    id: 'ergonomics',
    label: 'Ergonomics (WorkSMART)',
    icon: 'Health',
    docUrl: `${DOC_BASE}5dd55dd3-4442-44eb-95e9-06c51a33f7b2`,
    fullUrl: `${LIBRARY}/Workstation-Posture-Checklist-Self-Assessment.pdf`,
  },
  {
    id: 'job-postings',
    label: 'Internal Job Postings',
    icon: 'RecruitmentManagement',
    // ADP Career Center. A hash route with no category parameter, so driver
    // vs office cannot be split into separate links; the page's own search
    // does the filtering. Requires the employee's ADP login.
    externalUrl: 'https://workforcenow.adp.com/theme/index.html#/Myself/MyselfTabTalentCategoryCareerCenter',
  },
  {
    id: 'holidays',
    label: 'Statutory Holidays',
    icon: 'Calendar',
    // Year-agnostic on purpose: the site tracks the current year, so the tile
    // never needs an annual edit.
    externalUrl: 'https://canada-holidays.ca/provinces/ON',
  },
];

/** Purpose-routed HR addresses. Most exist for people the reader may need to
 *  point elsewhere (candidates, agencies), not for the reader themselves. */
const CONTACTS: { purpose: string; email: string; note?: string }[] = [
  { purpose: 'Driver candidates', email: 'Driverrecruitment@rapidcitytransport.com' },
  { purpose: 'Office candidates', email: 'Careers@rapidcitytransport.com' },
  {
    purpose: 'Recruitment agencies, Service Canada, and CRA employee inquiries',
    email: HR_EMAIL,
  },
];

interface IPerksViewerProps {
  posters: IPerkPoster[];
  loading: boolean;
  error: boolean;
  active?: IPerkPoster;
  onSelect: (label: string) => void;
}

/** One viewer for every poster in the Benefits and Perks folder: a row of
 *  poster names to switch between, then the chosen poster inline. */
const PerksViewer: React.FC<IPerksViewerProps> = ({ posters, loading, error, active, onSelect }) => {
  if (loading) {
    return <p className={styles.perkNote}>Loading posters...</p>;
  }
  if (error || !active) {
    return (
      <p className={styles.perkNote}>
        {error
          ? 'The posters could not be loaded. Check that you have access to the HR Support folder. '
          : 'No posters yet. HR adds a PDF to the Benefits and Perks folder and it appears here. '}
        <a href={PERKS_FOLDER_URL} target="_blank" rel="noopener noreferrer">
          Open the folder <Icon iconName="OpenInNewTab" aria-hidden="true" />
        </a>
      </p>
    );
  }
  return (
    <>
      {posters.length > 1 && (
        <div className={styles.perkPills} role="group" aria-label="Choose a poster">
          {posters.map(poster => (
            <button
              key={poster.label}
              type="button"
              className={`${styles.perkPill} ${poster.label === active.label ? styles.perkPillActive : ''}`}
              aria-pressed={poster.label === active.label}
              onClick={() => onSelect(poster.label)}
            >
              {poster.label}
            </button>
          ))}
        </div>
      )}
      <iframe
        key={active.docUrl}
        title={`${active.label} poster`}
        src={active.docUrl}
        className={styles.toolDocFrame}
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </>
  );
};

/** Public HR Support page: email-HR hero, self-help guide toolbox (SharePoint
 *  docs embed inline, external sites open in a new tab), and purpose-routed
 *  contact addresses. The guides are hardcoded above; only the Benefits &
 *  Perks posters come from SharePoint, read from a folder HR maintains. */
const HrSupport: React.FC<IHrSupportProps> = () => {
  const themeVars = React.useMemo(
    () => getThemeCssVariables(defaultTheme) as React.CSSProperties,
    []
  );

  const [activeGuide, setActiveGuide] = React.useState<IGuide | null>(null);

  const { posters, loading: postersLoading, error: postersError } = usePerkPosters();
  const [activePosterLabel, setActivePosterLabel] = React.useState<string | null>(null);
  // The first poster shows as soon as the folder loads; a pick sticks after that.
  const activePoster: IPerkPoster | undefined =
    posters.filter(poster => poster.label === activePosterLabel)[0] || posters[0];

  const activeDocFullUrl = activeGuide?.perks ? activePoster?.fullUrl : activeGuide?.fullUrl;
  const openFullLabel = activeGuide?.perks
    ? `Open the full ${activePoster ? activePoster.label : ''} poster in a new tab`
    : `Open full ${activeGuide ? activeGuide.label : ''} guide in a new tab`;

  // A "Learn more" link anywhere on Compass can land straight on a guide
  // (HRSupport.aspx#benefits) instead of asking people to find the tile.
  React.useEffect(() => {
    const id = window.location.hash.replace(/^#/, '');
    const guide = id ? GUIDES.filter(g => g.id === id && !g.externalUrl)[0] : undefined;
    if (!guide) return;
    setActiveGuide(guide);
    window.setTimeout(() => {
      document.getElementById('hr-tools')?.scrollIntoView({ block: 'start' });
    }, 0);
  }, []);

  // Closing unmounts the focused button, so put focus back on the heading.
  const handleCloseGuide = React.useCallback((): void => {
    setActiveGuide(null);
    document.getElementById('hr-guides-heading')?.focus();
  }, []);

  const handleGuideClick = React.useCallback((guide: IGuide): void => {
    if (guide.externalUrl) {
      window.open(guide.externalUrl, '_blank', 'noopener,noreferrer');
    } else {
      setActiveGuide(guide);
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

  return (
    <div className={styles.page} style={themeVars}>
      <a href="#hr-support-main" className={styles.skipLink}>Skip to main content</a>
      <Navigation onSearch={handleNavSearch} activePage="hrSupport" />

      <main id="hr-support-main" className={styles.main} role="main" tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="hr-support-title">
          <div className={styles.heroText}>
            <h1 id="hr-support-title" className={styles.heroTitle}>HR Support</h1>
            <p className={styles.heroIntro}>
              Questions about payroll, policies, training, or employee programs?
              <br />
              Start with the guides below, or send HR a request and a member of the team
              will follow up within 2 to 5 days.
            </p>
          </div>
          <div className={styles.heroActions}>
            <a
              href={`mailto:${HR_EMAIL}`}
              className={styles.heroPrimaryBtn}
              aria-label={`Email HR at ${HR_EMAIL}`}
            >
              Email HR
            </a>
          </div>
        </section>

        <section id="hr-tools" className={styles.toolboxSection} aria-labelledby="hr-guides-heading">
          <h2 id="hr-guides-heading" className={styles.sectionTitle} tabIndex={-1}>
            <Icon iconName="ReadingMode" className={styles.sectionIcon} aria-hidden="true" />
            Self-help guides
          </h2>
          <p className={styles.toolboxIntro}>
            Guides and reference material for common HR topics.
          </p>

          <div className={styles.toolboxLayout}>
            <section className={styles.toolsPanel} aria-labelledby="hr-guides-title">
              <div className={styles.panelHeader}>
                <h3 id="hr-guides-title" className={styles.panelTitle}>
                  <Icon iconName="Toolbox" aria-hidden="true" />Tools
                </h3>
              </div>
              <ul className={styles.toolsGrid} role="list">
                {GUIDES.map((guide) => {
                  const isActive = activeGuide?.label === guide.label;
                  const isExternal = !!guide.externalUrl;
                  return (
                    <li key={guide.label}>
                      <button
                        type="button"
                        className={`${styles.toolTile} ${isActive ? styles.toolTileActive : ''}`}
                        onClick={() => handleGuideClick(guide)}
                        aria-pressed={isExternal ? undefined : isActive}
                        aria-label={isExternal ? `${guide.label}, opens in a new tab` : undefined}
                      >
                        {isExternal && (
                          <span className={styles.toolTileExternal} aria-hidden="true">
                            <Icon iconName="OpenInNewTab" />
                          </span>
                        )}
                        <span className={styles.toolIcon} aria-hidden="true">
                          <Icon iconName={guide.icon} />
                        </span>
                        <span className={styles.toolLabel}>{guide.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            <div className={styles.toolViewer} aria-live="polite">
              {!activeGuide && (
                <div className={styles.toolViewerEmpty}>
                  <Icon
                    iconName="ViewList"
                    className={styles.toolViewerEmptyIcon}
                    aria-hidden="true"
                  />
                  <p className={styles.toolViewerEmptyText}>
                    Select a guide to view it here.
                  </p>
                </div>
              )}

              {activeGuide && (
                <div className={styles.toolViewerContent}>
                  <header className={styles.toolViewerHeader}>
                    <div>
                      <p className={styles.toolViewerEyebrow}>Now viewing</p>
                      <h3 className={styles.toolViewerTitle}>{activeGuide.label}</h3>
                    </div>
                    <div className={styles.toolViewerActions}>
                      {activeDocFullUrl && (
                        <button
                          type="button"
                          className={styles.toolViewerOpen}
                          onClick={() => window.open(activeDocFullUrl, '_blank', 'noopener,noreferrer')}
                          aria-label={openFullLabel}
                        >
                          Open full <Icon iconName="OpenInNewTab" aria-hidden="true" />
                        </button>
                      )}
                      <button
                        type="button"
                        className={styles.toolViewerClose}
                        onClick={handleCloseGuide}
                        aria-label="Close guide"
                      >
                        <Icon iconName="Cancel" />
                      </button>
                    </div>
                  </header>

                  {activeGuide.perks ? (
                    <PerksViewer
                      posters={posters}
                      loading={postersLoading}
                      error={postersError}
                      active={activePoster}
                      onSelect={setActivePosterLabel}
                    />
                  ) : activeGuide.docUrl ? (
                    <iframe
                      title={`${activeGuide.label} guide`}
                      src={activeGuide.docUrl}
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
                        The guide for <strong>{activeGuide.label}</strong> is being
                        prepared and will appear here once it is uploaded.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className={styles.contactsSection} aria-labelledby="hr-contacts-heading">
          <div className={styles.contactsCard}>
            <h2 id="hr-contacts-heading" className={styles.sectionTitle}>
              <Icon iconName="Contact" className={styles.sectionIcon} aria-hidden="true" />
              Other HR contacts
            </h2>
            <p className={styles.contactsIntro}>
              General questions go to {HR_EMAIL}. These addresses route specific enquiries
              straight to the right place.
            </p>
            <dl className={styles.contactsList}>
              {CONTACTS.map((c) => (
                <div key={c.purpose} className={styles.contactRow}>
                  <dt className={styles.contactPurpose}>{c.purpose}</dt>
                  <dd className={styles.contactValue}>
                    <a href={`mailto:${c.email}`} className={styles.contactLink}>{c.email}</a>
                    {c.note && <span className={styles.contactNote}>{c.note}</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>

      <Footer pageIdentifier={activeGuide ? `HR Support - ${activeGuide.label}` : 'HR Support Page'} />
    </div>
  );
};

export default HrSupport;
