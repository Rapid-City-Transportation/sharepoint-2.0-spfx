import * as React from 'react';
import { Navigation } from '../../rapidCityHomepage/components/Navigation/Navigation';
import { Footer } from '../../rapidCityHomepage/components/Footer/Footer';
import { defaultTheme, getThemeCssVariables } from '../../rapidCityHomepage/theme/ThemeTokens';
import { IDepartmentPublicPageProps } from '../models/IDepartmentPublicPageProps';
import { getDepartmentConfig } from '../services/DepartmentConfig';
import { useDepartmentLeaders } from '../hooks/useDepartmentLeaders';
import { useAnnouncements } from '../../rapidCityHomepage/hooks/useAnnouncements';
import styles from './DepartmentPublicPage.module.scss';

// ── Placeholder data (static until real data sources are wired up) ──────────

/** Neutral dark hero backdrop; tinted per-department by the accent scrim. */
const HEADER_BACKDROP = require('../assets/dept-header-backdrop.png');

const PLACEHOLDER_NEWS = [
  { title: 'Example Update Title', date: '[Date]', author: '[Name]' },
  { title: 'Example Update Title', date: '[Date]', author: '[Name]' },
  { title: 'Example Update Title', date: '[Date]', author: '[Name]' },
];


/** "#1F4C7F" -> "31, 76, 127", for use in rgba(var(--dept-accent-rgb), alpha). */
function hexToRgb(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '31, 76, 127';
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

// ── Group membership hook ───────────────────────────────────────────────────
/**
 * Checks whether the current user belongs to the given Azure AD group.
 * Returns `true` only when membership is confirmed; any error fails safe to `false`.
 *
 * Requires the `GroupMember.Read.All` Graph permission to be approved in
 * SharePoint Admin → API access.
 */
function useDepartmentMembership(
  context: IDepartmentPublicPageProps['context'],
  groupId: string
): boolean {
  const [isMember, setIsMember] = React.useState(false);

  React.useEffect(() => {
    // Skip check for empty / placeholder GUIDs
    if (!groupId || groupId.startsWith('00000000')) {
      setIsMember(false);
      return;
    }

    let cancelled = false;

    (async (): Promise<void> => {
      try {
        const client = await (context as any).msGraphClientFactory.getClient('3');
        const response = await client
          .api('/me/checkMemberGroups')
          .post({ groupIds: [groupId] });

        if (!cancelled && response?.value) {
          setIsMember((response.value as string[]).indexOf(groupId) !== -1);
        }
      } catch (err) {
        // Fail safe: hide the button if the check fails.
        if (!cancelled) {
          setIsMember(false);
        }
      }
    })();

    return (): void => { cancelled = true; };
  }, [context, groupId]);

  return isMember;
}

// ── Main component ──────────────────────────────────────────────────────────

export default function DepartmentPublicPage(props: IDepartmentPublicPageProps): React.ReactElement {
  const config = getDepartmentConfig(props.departmentKey);

  // Merge the global RCT theme with per-department accent overrides.
  // Department accents drive the hero tint, CTA button, and icon/link colors.
  const themeVars = React.useMemo(() => {
    const base = getThemeCssVariables(defaultTheme) as Record<string, string>;
    if (config) {
      base['--dept-accent']       = config.accentColor;
      base['--dept-accent-hover'] = config.accentColorHover;
      base['--dept-accent-tint']  = config.accentTint;
      base['--dept-accent-rgb']   = hexToRgb(config.accentColor);
    }
    return base;
  }, [config]);

  // Resolve values: property-pane overrides > config defaults > fallback
  const deptName  = config?.displayName || 'Department Name';
  const about     = config?.about       || '';
  const email     = props.contactEmail  || config?.contactEmail  || 'department@example.com';
  const phone     = props.contactPhone  || config?.contactPhone  || '123-456-7890';
  const hours     = props.contactHours  || config?.contactHours  || '8:00 AM - 5:00 PM';
  const resourceUrl = props.resourcePageUrl || config?.resourcePageUrl || '#';
  const groupId     = props.allowedGroupId  || config?.groupId        || '';

  // Richer contact emails + structured hours (CX); fall back to single values.
  const emailList = config?.contactEmails && config.contactEmails.length > 0
    ? config.contactEmails
    : (email ? [{ email, scope: '' }] : []);
  const officeHours = config?.hoursGroups && config.hoursGroups.length > 0
    ? config.hoursGroups
    : (hours ? [{ title: '', rows: [{ days: '', time: hours }] }] : []);
  const phoneNumbers = config?.phoneNumbers && config.phoneNumbers.length > 0
    ? config.phoneNumbers
    : (phone ? [{ label: '', number: phone }] : []);

  // Async group membership check. Show the button by default; only gate it once
  // a real AAD group is wired (placeholder GUIDs start with 0000...), so the CTA
  // can be demoed before group security is configured.
  const isMember = useDepartmentMembership(props.context, groupId);
  const isGroupGated = !!groupId && !groupId.startsWith('00000000');
  const showResourceButton = !isGroupGated || isMember;

  // "See all" toggle for the What's New section.
  const [showAllNews, setShowAllNews] = React.useState(false);

  const { leaders, loading: leadersLoading } = useDepartmentLeaders(config?.displayName);

  // ── What's New: live for Customer Experience, placeholder elsewhere ───────
  // This page renders for several departments; only the Customer Experience
  // department reads live items from the CX Announcements list.
  const isCX =
    props.departmentKey === 'customerExperience' ||
    config?.key === 'customerExperience';

  // CX gets the requested "CX" label; every other department on this shared
  // multi-tenant page uses its own name so the CTA is never mislabeled.
  const resourceCtaLabel = isCX
    ? 'View CX Department Hub'
    : `View ${deptName} Department Hub`;

  const { announcements } = useAnnouncements('Customer Experience Public');

  const allNews: Array<{ title: string; date: string; author: string; imageUrl?: string }> =
    isCX && announcements.length > 0
      ? announcements.map(a => ({
          title: a.title,
          date: a.time,
          author: a.author || '[Name]',
          imageUrl: a.imageUrl,
        }))
      : PLACEHOLDER_NEWS;
  const newsItems   = showAllNews ? allNews : allNews.slice(0, 3);
  const hasMoreNews = allNews.length > 3;

  const handleSearch = React.useCallback((query: string): void => {
    const q = (query || '').trim();
    const url = q
      ? `/SitePages/ContactCards.aspx?q=${encodeURIComponent(q)}`
      : '/SitePages/ContactCards.aspx';
    window.location.assign(url);
  }, []);

  // ── Unconfigured state ──────────────────────────────────────────────────
  if (!config) {
    return (
      <div className={styles.container} style={themeVars as React.CSSProperties}>
        <a href="#main-content" className={styles.skipLink}>
          Skip to main content
        </a>
        <Navigation onSearch={handleSearch} activePage="departmentHub" />
        <main id="main-content" className={styles.main} role="main" tabIndex={-1}>
          <div className={styles.configMessage}>
            <p>Please select a department in the web part property pane.</p>
          </div>
        </main>
        <Footer pageIdentifier={`${deptName} Department Page`} />
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className={styles.container} style={themeVars as React.CSSProperties}>
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>

      <Navigation onSearch={handleSearch} activePage="departmentHub" />

      <main id="main-content" className={styles.main} role="main" tabIndex={-1}>

        {/* ── A) Department Header / Hero ─────────────────────────────────── */}
        <section
          className={styles.heroSection}
          aria-labelledby="dept-title"
          style={{ backgroundImage: `url(${HEADER_BACKDROP})` }}
        >
          <div className={styles.heroInner}>
            <h1 id="dept-title" className={styles.heroTitle}>
              {deptName}
            </h1>
            {about && <p className={styles.heroAbout}>{about}</p>}

            {/* Contact + Office Hours: white text directly on the hero, no boxes */}
            <div className={styles.heroMeta}>
              <div className={styles.heroMetaCol}>
                <h2 className={styles.heroMetaTitle}>Contact</h2>
                {emailList.length > 0 && (
                  <ul className={styles.contactEmailList} aria-label={`${deptName} contact emails`}>
                    {emailList.map((e) => (
                      <li key={e.email} className={styles.contactEmailItem}>
                        <a href={`mailto:${e.email}`} className={styles.contactEmailLink}>
                          {e.email}
                        </a>
                        {e.scope && (
                          <span className={styles.contactBadge}>{e.scope}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {phoneNumbers.length > 0 && (
                  <ul className={styles.heroPhoneList} aria-label={`${deptName} phone numbers`}>
                    {phoneNumbers.map((p) => (
                      <li key={p.number} className={styles.heroPhoneItem}>
                        {p.label && <span className={styles.heroPhoneLabel}>{p.label}</span>}
                        <a
                          href={`tel:${p.number.replace(/[^+\d]/g, '')}`}
                          className={styles.contactPhoneLink}
                        >
                          {p.number}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className={styles.heroMetaCol}>
                <h2 className={styles.heroMetaTitle}>Standard Office Hours</h2>
                {officeHours.map((group, gi) => (
                  <div key={gi} className={styles.hoursGroup}>
                    {group.title && <p className={styles.hoursGroupTitle}>{group.title}</p>}
                    <ul className={styles.hoursList}>
                      {group.rows.map((r, ri) => (
                        <li key={ri} className={styles.hoursRow}>
                          {r.days && <span className={styles.hoursDays}>{r.days}</span>}
                          <span className={styles.hoursTime}>{r.time}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {showResourceButton && (
              <a
                href={resourceUrl}
                className={styles.resourceBtn}
                aria-label={resourceCtaLabel}
              >
                {resourceCtaLabel}
              </a>
            )}
          </div>
        </section>

        {/* ── B) What's New ──────────────────────────────────────────────── */}
        <section className={styles.whatsNewSection} aria-labelledby="whats-new-title">
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeader}>
              <h2 id="whats-new-title" className={styles.sectionTitle}>
                What&#39;s New
              </h2>
              {hasMoreNews && (
                <button
                  type="button"
                  className={styles.seeAllLink}
                  onClick={() => setShowAllNews((v) => !v)}
                  aria-expanded={showAllNews}
                >
                  {showAllNews ? 'Show less' : 'See all'}
                </button>
              )}
            </div>

            <div className={styles.newsGrid} role="list">
              {newsItems.map((item, i) => (
                <article
                  key={i}
                  className={styles.newsCard}
                  role="listitem"
                >
                  <div className={styles.newsImageWrap} aria-hidden="true">
                    {item.imageUrl ? (
                      <img className={styles.newsImage} src={item.imageUrl} alt="" />
                    ) : (
                      <span className={styles.newsImagePlaceholder}>
                        Photo Placeholder
                      </span>
                    )}
                  </div>
                  <div className={styles.newsBody}>
                    <h3 className={styles.newsTitle}>{item.title}</h3>
                    <p className={styles.newsMeta}>
                      Posted {item.date} by {item.author}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── C) Meet the Department Leaders ─────────────────────────────── */}
        <section className={styles.leadersSection} aria-labelledby="leaders-title">
          <div className={styles.sectionInner}>
            <h2 id="leaders-title" className={styles.sectionTitle}>
              Meet the Department Leaders
            </h2>

            {leadersLoading && (
              <p className={styles.leaderDescription}>Loading leaders...</p>
            )}

            {!leadersLoading && leaders.length === 0 && (
              <p className={styles.leaderDescription}>No department leaders found.</p>
            )}

            {!leadersLoading && leaders.length > 0 && (
              <div className={styles.leadersGrid} role="list">
                {leaders.map(leader => (
                  <article
                    key={leader.id}
                    className={styles.leaderCard}
                    role="listitem"
                  >
                    <div
                      className={styles.leaderImageWrap}
                      style={
                        leader.photoUrl
                          ? ({ ['--leader-photo']: `url("${leader.photoUrl}")` } as React.CSSProperties)
                          : undefined
                      }
                    >
                      {leader.photoUrl ? (
                        <img
                          src={leader.photoUrl}
                          alt={leader.name}
                          className={styles.leaderPhoto}
                        />
                      ) : (
                        <span className={styles.leaderImagePlaceholder} aria-hidden="true">
                          Photo Placeholder
                        </span>
                      )}
                    </div>
                    <div className={styles.leaderBody}>
                      <p className={styles.leaderName}>
                        <span className={styles.leaderNameLabel}>Name:</span>{' '}
                        {leader.name}
                      </p>
                      {leader.level && (
                        <p className={styles.leaderRole}>
                          <span className={styles.leaderRoleLabel}>Role:</span>{' '}
                          {leader.level}
                        </p>
                      )}
                      {leader.phone && (
                        <p className={styles.leaderDescription}>
                          Phone: {leader.phone}
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer pageIdentifier={`${deptName} Department Page`} />
    </div>
  );
}
