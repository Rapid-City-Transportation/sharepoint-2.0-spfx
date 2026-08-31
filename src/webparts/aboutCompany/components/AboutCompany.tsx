import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import { Dialog, DialogType } from '@fluentui/react/lib/Dialog';
import styles from './AboutCompany.module.scss';
import { IAboutCompanyProps } from './IAboutCompanyProps';
import { defaultTheme, getThemeCssVariables } from '../../rapidCityHomepage/theme/ThemeTokens';
import { Navigation } from '../../rapidCityHomepage/components/Navigation/Navigation';
import { Footer } from '../../rapidCityHomepage/components/Footer/Footer';
import { useLeadership } from '../hooks/useLeadership';
import { useAnnouncements } from '../../rapidCityHomepage/hooks/useAnnouncements';
import { sanitizeHtml } from '../../customerContactCards/utils/sanitize';

// Wording comes from the approved MVV branding toolkit poster (Management
// site, "MVV Branding Toolkit - FINAL"). Update here if HR revises it.
const MISSION_LINES: string[] = [
  'We manage journeys for vulnerable individuals with reliability and dignity, on behalf of the organizations that entrust them to us.',
  'We own the logistics, so our customers don\'t have to.',
];

const VISION_TEXT =
  'To be, and to be known as, Canada\'s most trusted technology-enabled care-logistics platform.';

const TAGLINE = 'Care is at the heart of what we do.';

interface IValue {
  num: string;
  name: string;
  icon: string;
  text: string;
}

const VALUES: IValue[] = [
  {
    num: '01',
    name: 'Safety and Dignity First',
    icon: 'Heart',
    text: 'We prioritize the safety and well-being of every individual in our care. We treat everyone with respect, compassion, and dignity.',
  },
  {
    num: '02',
    name: 'Reliability Earns Trust',
    icon: 'CheckList',
    text: 'We do what we say we\'ll do. We show up, follow through, and deliver with consistency and accountability.',
  },
  {
    num: '03',
    name: 'Own the Handoff',
    icon: 'Teamwork',
    text: 'We take full ownership from start to finish, ensuring seamless transitions and a smooth experience every time.',
  },
  {
    num: '04',
    name: 'Build It Better. Be Better.',
    icon: 'Lightbulb',
    text: 'We embrace innovation and continuous improvement to solve problems, simplify processes, and exceed expectations.',
  },
];


/** Carried over from the original QMS page. "Rapid City Transportation"
 *  replaces the legacy company name that page still displayed; confirm the
 *  wording against the controlled Quality Policy document if it changes. */
const QUALITY_POLICY: string[] = [
  'Rapid City Transportation is committed to providing the highest quality services to our customers. Our success depends on customer satisfaction.',
  'Our overall goal is to achieve full customer satisfaction. To achieve this goal, we must strive for excellence and continual improvement in all our activities and encourage a team attitude among employees.',
  'We are dedicated and committed to this quality policy. We will implement and maintain the ISO 9001:2015 quality standard and ensure that all applicable elements of the standard are complied with.',
];

const QUALITY_OBJECTIVES: string[] = [
  'High Passenger Satisfaction',
  'High Driver Performance',
  'Low Passenger Complaints',
  'Low No Shows',
];

const WHY_UNIQUE: string[] = [
  'We are the premier provider in Ontario of non-emergency medical assistance.',
  'We provide a personalized concierge door to door service for individuals going to and from different appointments, including medical and social.',
  'Many of our passengers require additional care before, during and after their ride, because they are physically, cognitively or psychologically impaired.',
  'We support individuals who are already working with an insurance company, clinic, treatment facility, etc. in their rehabilitation.',
  'Our regionally stationed drivers can get to know individuals personally and provide an extra level of care.',
];

interface IQmsDoc {
  label: string;
  icon: string;
  /** SharePoint embed URL, addressed by UniqueId so renames cannot break it. */
  docUrl: string;
  /** The document itself, for "Open full". */
  fullUrl: string;
}

/** The three current QMS documents in the compass "Quality Management
 *  System" folder (certificate, process map, manual). */
const QMS_DOCS: IQmsDoc[] = [
  {
    label: 'DNV ISO Certificate (2025 to 2028)',
    icon: 'Certificate',
    docUrl: 'https://rapidcitytransport.sharepoint.com/sites/compass/_layouts/15/embed.aspx?UniqueId=eb687654-577d-4d65-b517-f36424988183',
    fullUrl: 'https://rapidcitytransport.sharepoint.com/sites/compass/Shared%20Documents/Quality%20Management%20System/DNV%20ISO%20Certificate%20-%20June%202025%20-%20June%202028%20(Updated%20Scope).pdf',
  },
  {
    label: 'Overall Process Map Flowchart',
    icon: 'Flow',
    docUrl: 'https://rapidcitytransport.sharepoint.com/sites/compass/_layouts/15/embed.aspx?UniqueId=2b0e3fa1-fa26-4f76-ad51-c2be88929cb4',
    fullUrl: 'https://rapidcitytransport.sharepoint.com/sites/compass/Shared%20Documents/Quality%20Management%20System/RCT-QMS-2012-0008-Overall%20Process%20Map%20Flowchart-V8%20DRAFT.pdf',
  },
  {
    label: 'Quality Management System Manual',
    icon: 'BookAnswers',
    docUrl: 'https://rapidcitytransport.sharepoint.com/sites/compass/_layouts/15/embed.aspx?UniqueId=140cfda3-a58c-41e2-960b-cdcac149b1a2',
    fullUrl: 'https://rapidcitytransport.sharepoint.com/sites/compass/Shared%20Documents/Quality%20Management%20System/RCT-QMS-2019-0006-Quality%20Management%20System%20Manual-V14%20-%20FINAL.pdf',
  },
];

/** Leadership Updates page tag in the Announcements list. */
const UPDATES_PAGE = 'Leadership';
const UPDATES_SHOWN = 6;

interface IOpenUpdate {
  title: string;
  author: string;
  time: string;
  bodyHtml: string;
}

/** Public "All About the Company" page: MVV compass, history placeholder,
 *  senior leadership roster, Leadership Updates feed, and the QMS document
 *  viewer. Static copy lives in the constants above; the roster and updates
 *  are list-driven. */
const AboutCompany: React.FC<IAboutCompanyProps> = (props) => {
  const themeVars = React.useMemo(
    () => getThemeCssVariables(defaultTheme) as React.CSSProperties,
    []
  );

  const { leaders, loading: leadersLoading } = useLeadership();
  const { announcements, loading: updatesLoading } = useAnnouncements(UPDATES_PAGE);
  // fetchAnnouncements returns oldest-first (ascending Created); newest
  // posts must win the cut, so reverse before slicing.
  const updates = announcements.slice().reverse().slice(0, UPDATES_SHOWN);
  const [openUpdate, setOpenUpdate] = React.useState<IOpenUpdate | null>(null);
  const [activeDoc, setActiveDoc] = React.useState<IQmsDoc | null>(null);

  const handleDocClick = React.useCallback((doc: IQmsDoc): void => {
    setActiveDoc(prev => (prev && prev.label === doc.label ? null : doc));
  }, []);

  const handleNavSearch = React.useCallback((query: string): void => {
    const q = (query || '').trim();
    const url = q
      ? `/SitePages/ContactCards.aspx?q=${encodeURIComponent(q)}`
      : '/SitePages/ContactCards.aspx';
    window.location.assign(url);
  }, []);

  const videoUrl = (props.videoUrl || '').trim();

  return (
    <div className={styles.page} style={themeVars}>
      <a href="#ac-main" className={styles.skipLink}>Skip to main content</a>
      <Navigation onSearch={handleNavSearch} activePage="aboutCompany" />

      <main id="ac-main" className={styles.main} role="main" tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="ac-title">
          <div className={styles.heroText}>
            <h1 id="ac-title" className={styles.heroTitle}>All About the Company</h1>
            <p className={styles.heroIntro}>
              Our mission, our story, and the people leading the way.
            </p>
          </div>
        </section>

        <section className={styles.compassSection} aria-labelledby="ac-compass-title">
          <h2 id="ac-compass-title" className={styles.sectionTitle}>
            <Icon iconName="CompassNW" className={styles.sectionIcon} aria-hidden="true" />
            Our Compass
          </h2>
          <p className={styles.sectionKicker}>What we do, every day, today.</p>

          <div className={styles.mvvGrid}>
            <div className={styles.mvvCard}>
              <h3 className={styles.mvvTitle}>Our Mission</h3>
              {MISSION_LINES.map((line, i) => (
                <p key={i} className={styles.mvvText}>{line}</p>
              ))}
            </div>
            <div className={styles.mvvCard}>
              <h3 className={styles.mvvTitle}>Our Vision</h3>
              <p className={styles.mvvText}>{VISION_TEXT}</p>
            </div>
          </div>

          <h3 className={styles.valuesHeading}>Our Values</h3>
          <ul className={styles.valuesGrid} role="list">
            {VALUES.map((v) => (
              <li key={v.num} className={styles.valueCard}>
                <div className={styles.valueTop}>
                  <span className={styles.valueNum} aria-hidden="true">{v.num}</span>
                  <span className={styles.valueIcon} aria-hidden="true">
                    <Icon iconName={v.icon} />
                  </span>
                </div>
                <h4 className={styles.valueName}>{v.name}</h4>
                <p className={styles.valueText}>{v.text}</p>
              </li>
            ))}
          </ul>

          <p className={styles.taglineBand}>{TAGLINE}</p>

          {videoUrl ? (
            <div className={styles.videoPanel}>
              <iframe
                title="Mission, Vision and Values video"
                src={videoUrl}
                className={styles.videoFrame}
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          ) : (
            <div className={styles.pendingPanel}>
              <Icon iconName="Video" className={styles.pendingIcon} aria-hidden="true" />
              <p className={styles.pendingText}>
                Our Mission, Vision and Values video is in production and premieres
                here on September 14.
              </p>
            </div>
          )}
        </section>

        <section className={styles.section} aria-labelledby="ac-history-title">
          <h2 id="ac-history-title" className={styles.sectionTitle}>
            <Icon iconName="History" className={styles.sectionIcon} aria-hidden="true" />
            Our History
          </h2>
          <div className={styles.pendingPanel}>
            <Icon iconName="Clock" className={styles.pendingIcon} aria-hidden="true" />
            <p className={styles.pendingText}>
              The RCT story is being put together. Check back soon.
            </p>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="ac-leadership-title">
          <h2 id="ac-leadership-title" className={styles.sectionTitle}>
            <Icon iconName="People" className={styles.sectionIcon} aria-hidden="true" />
            Meet Your Senior Leadership Team
          </h2>
          {/* Always mounted: a live region inserted or removed mid-flight is
              not reliably announced, so one element narrates every state. */}
          <p
            role="status"
            aria-live="polite"
            className={leaders.length > 0 ? styles.srOnly : styles.sectionStatus}
          >
            {leadersLoading && leaders.length === 0
              ? 'Loading profiles…'
              : leaders.length === 0
                ? 'No profiles listed yet. Anyone tagged with the Management department in the Employee Highlight list appears here automatically.'
                : `${leaders.length} profiles listed.`}
          </p>
          {leaders.length > 0 && (
            <div className={styles.leadersGrid} role="list">
              {leaders.map((l) => (
                <article key={l.id} className={styles.leaderCard} role="listitem">
                  <div
                    className={styles.leaderImageWrap}
                    style={
                      l.photoUrl
                        ? ({ ['--leader-photo']: `url("${l.photoUrl}")` } as React.CSSProperties)
                        : undefined
                    }
                  >
                    {l.photoUrl ? (
                      <img src={l.photoUrl} alt={l.name} className={styles.leaderPhoto} />
                    ) : (
                      <span className={styles.leaderImagePlaceholder} aria-hidden="true">
                        Photo Placeholder
                      </span>
                    )}
                  </div>
                  <div className={styles.leaderBody}>
                    <p className={styles.leaderName}>
                      <span className={styles.leaderNameLabel}>Name:</span>{' '}
                      {l.name}
                    </p>
                    {l.role && (
                      <p className={styles.leaderRole}>
                        <span className={styles.leaderRoleLabel}>Role:</span>{' '}
                        {l.role}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className={styles.section} aria-labelledby="ac-updates-title">
          <h2 id="ac-updates-title" className={styles.sectionTitle}>
            <Icon iconName="Megaphone" className={styles.sectionIcon} aria-hidden="true" />
            Leadership Updates
          </h2>
          <p className={styles.sectionKicker}>News and notes straight from the leadership team.</p>
          <p
            role="status"
            aria-live="polite"
            className={updates.length > 0 ? styles.srOnly : styles.sectionStatus}
          >
            {updatesLoading && updates.length === 0
              ? 'Loading updates…'
              : updates.length === 0
                ? 'No updates posted yet. New posts appear here as soon as leadership publishes them.'
                : `${updates.length} updates listed.`}
          </p>
          {updates.length > 0 && (
            <ul className={styles.updatesList} role="list">
              {updates.map((u, i) => (
                <li key={i} className={styles.updateCard}>
                  <p className={styles.updateTitle}>{u.title}</p>
                  <p className={styles.updateMeta}>
                    {u.author ? `${u.author} \u00b7 ${u.time}` : u.time}
                  </p>
                  {u.body && <p className={styles.updateBody}>{u.body}</p>}
                  <div className={styles.updateActions}>
                    {u.bodyHtml.trim() && (
                      <button
                        type="button"
                        className={styles.updateReadMore}
                        aria-label={`Read more: ${u.title}`}
                        onClick={() =>
                          setOpenUpdate({
                            title: u.title,
                            author: u.author || '',
                            time: u.time,
                            bodyHtml: u.bodyHtml,
                          })
                        }
                      >
                        Read more
                      </button>
                    )}
                    {u.linkUrl && (
                      <a
                        className={styles.updateLink}
                        href={u.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open link for ${u.title} (opens in new window)`}
                      >
                        Open link <Icon iconName="OpenInNewWindow" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.section} aria-labelledby="ac-qms-title">
          <h2 id="ac-qms-title" className={styles.sectionTitle}>
            <Icon iconName="Ribbon" className={styles.sectionIcon} aria-hidden="true" />
            Quality Management System
          </h2>
          <p className={styles.sectionKicker}>
            How we document, measure, and improve the way we work.
          </p>

          <p className={styles.certBanner}>
            <Icon iconName="Certificate" aria-hidden="true" />
            RCT is ISO 9001:2015 certified.
          </p>

          <div className={styles.qmsGrid}>
            <div className={styles.qmsMain}>
              <h3 className={styles.qmsHeading}>Quality Policy</h3>
              {QUALITY_POLICY.map((line, i) => (
                <p key={i} className={styles.qmsText}>{line}</p>
              ))}

              <h3 className={styles.qmsHeading}>Why we are unique</h3>
              <ul className={styles.qmsList}>
                {WHY_UNIQUE.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
              <p className={styles.qmsClosing}>
                We provide understanding, empathy, and patience.
              </p>
            </div>

            <div className={styles.qmsAside}>
              <h3 className={styles.qmsHeading}>Quality Objectives</h3>
              <ul className={styles.qmsList}>
                {QUALITY_OBJECTIVES.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className={styles.toolboxLayout}>
            <section className={styles.toolsPanel} aria-labelledby="ac-qms-tools-title">
              <div className={styles.panelHeader}>
                <h3 id="ac-qms-tools-title" className={styles.panelTitle}>
                  <Icon iconName="Toolbox" aria-hidden="true" />Tools
                </h3>
              </div>
              <ul className={styles.toolsGrid} role="list">
                {QMS_DOCS.map((doc) => {
                  const isActive = !!activeDoc && activeDoc.label === doc.label;
                  return (
                    <li key={doc.label}>
                      <button
                        type="button"
                        className={`${styles.toolTile} ${isActive ? styles.toolTileActive : ''}`}
                        onClick={() => handleDocClick(doc)}
                        aria-pressed={isActive}
                      >
                        <span className={styles.toolIcon} aria-hidden="true">
                          <Icon iconName={doc.icon} />
                        </span>
                        <span className={styles.toolLabel}>{doc.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            <div className={styles.toolViewer} aria-live="polite">
              {!activeDoc && (
                <div className={styles.toolViewerEmpty}>
                  <Icon
                    iconName="ViewList"
                    className={styles.toolViewerEmptyIcon}
                    aria-hidden="true"
                  />
                  <p className={styles.toolViewerEmptyText}>
                    Select a document to view it here.
                  </p>
                </div>
              )}
              {activeDoc && (
                <div className={styles.toolViewerContent}>
                  <header className={styles.toolViewerHeader}>
                    <div>
                      <p className={styles.toolViewerEyebrow}>Now viewing</p>
                      <h3 className={styles.toolViewerTitle}>{activeDoc.label}</h3>
                    </div>
                    <div className={styles.toolViewerActions}>
                      <button
                        type="button"
                        className={styles.toolViewerOpen}
                        onClick={() => window.open(activeDoc.fullUrl, '_blank', 'noopener,noreferrer')}
                        aria-label={`Open full ${activeDoc.label} in a new tab`}
                      >
                        Open full <Icon iconName="OpenInNewTab" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className={styles.toolViewerClose}
                        onClick={() => setActiveDoc(null)}
                        aria-label="Close"
                      >
                        <Icon iconName="Cancel" />
                      </button>
                    </div>
                  </header>
                  <iframe
                    title={activeDoc.label}
                    src={activeDoc.docUrl}
                    className={styles.toolDocFrame}
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <Dialog
        hidden={!openUpdate}
        onDismiss={() => setOpenUpdate(null)}
        dialogContentProps={{
          type: DialogType.close,
          title: openUpdate ? openUpdate.title : '',
        }}
        minWidth={340}
        maxWidth={640}
      >
        {openUpdate && (
          <>
            <p className={styles.updateMeta}>
              {openUpdate.author
                ? `${openUpdate.author} \u00b7 ${openUpdate.time}`
                : openUpdate.time}
            </p>
            <div
              className={styles.updateModalBody}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(openUpdate.bodyHtml) }}
            />
          </>
        )}
      </Dialog>

      <Footer pageIdentifier="All About the Company Page" />
    </div>
  );
};

export default AboutCompany;
