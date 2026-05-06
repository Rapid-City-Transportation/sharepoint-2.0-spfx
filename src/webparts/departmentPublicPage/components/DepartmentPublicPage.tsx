import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import { Navigation } from '../../rapidCityHomepage/components/Navigation/Navigation';
import { Footer } from '../../rapidCityHomepage/components/Footer/Footer';
import { defaultTheme, getThemeCssVariables } from '../../rapidCityHomepage/theme/ThemeTokens';
import { IDepartmentPublicPageProps } from '../models/IDepartmentPublicPageProps';
import { getDepartmentConfig } from '../services/DepartmentConfig';
import { useDepartmentLeaders } from '../hooks/useDepartmentLeaders';
import styles from './DepartmentPublicPage.module.scss';

// ── Placeholder data (static until real data sources are wired up) ──────────

const PLACEHOLDER_NEWS = [
  { title: 'Example Update Title', date: '[Date]', author: '[Name]' },
  { title: 'Example Update Title', date: '[Date]', author: '[Name]' },
  { title: 'Example Update Title', date: '[Date]', author: '[Name]' },
];


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
        // Fail safe — hide the button if the check fails
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
    }
    return base;
  }, [config]);

  // Resolve values: property-pane overrides > config defaults > fallback
  const deptName  = config?.displayName || 'Department Name';
  const subtitle  = config?.subtitle    || 'About the Team';
  const email     = props.contactEmail  || config?.contactEmail  || 'department@example.com';
  const phone     = props.contactPhone  || config?.contactPhone  || '123-456-7890';
  const hours     = props.contactHours  || config?.contactHours  || '8:00 AM - 5:00 PM';
  const resourceUrl = props.resourcePageUrl || config?.resourcePageUrl || '#';
  const groupId     = props.allowedGroupId  || config?.groupId        || '';

  // Async group membership check — determines CTA button visibility
  const showResourceButton = useDepartmentMembership(props.context, groupId);

  // Fetch department leaders from Employee Tracker list
  const { leaders, loading: leadersLoading } = useDepartmentLeaders(config?.displayName);

  // Nav search redirects to Contact Cards page
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
        <Navigation onSearch={handleSearch} />
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

      <Navigation onSearch={handleSearch} />

      <main id="main-content" className={styles.main} role="main" tabIndex={-1}>

        {/* ── A) Department Header / Hero ─────────────────────────────────── */}
        <section className={styles.heroSection} aria-labelledby="dept-title">
          <div className={styles.heroInner}>
            <div className={styles.heroLeft}>
              <h1 id="dept-title" className={styles.heroTitle}>
                {deptName}
              </h1>
              <p className={styles.heroSubtitle}>{subtitle}</p>

              <ul
                className={styles.contactList}
                aria-label={`${deptName} contact information`}
              >
                <li className={styles.contactItem}>
                  <Icon iconName="Mail" className={styles.contactIcon} aria-hidden="true" />
                  <a
                    href={`mailto:${email}`}
                    className={styles.contactLink}
                    aria-label={`Email ${deptName} at ${email}`}
                  >
                    {email}
                  </a>
                </li>
                <li className={styles.contactItem}>
                  <Icon iconName="Phone" className={styles.contactIcon} aria-hidden="true" />
                  <a
                    href={`tel:${phone.replace(/[^+\d]/g, '')}`}
                    className={styles.contactLink}
                    aria-label={`Call ${deptName} at ${phone}`}
                  >
                    {phone}
                  </a>
                </li>
                <li className={styles.contactItem}>
                  <Icon iconName="Clock" className={styles.contactIcon} aria-hidden="true" />
                  <span>{hours}</span>
                </li>
              </ul>

              {showResourceButton && (
                <a
                  href={resourceUrl}
                  className={styles.resourceBtn}
                  aria-label={`View ${deptName} department resources`}
                >
                  View Department Resources
                </a>
              )}
            </div>

            <div className={styles.heroRight}>
              <div
                className={styles.heroImageWrap}
                role="img"
                aria-label={`${deptName} header image`}
              >
                <span className={styles.heroImagePlaceholder}>
                  [Department Header Image Backdrop]
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── B) What's New ──────────────────────────────────────────────── */}
        <section className={styles.whatsNewSection} aria-labelledby="whats-new-title">
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeader}>
              <h2 id="whats-new-title" className={styles.sectionTitle}>
                What&#39;s New
              </h2>
              <a
                href="#"
                className={styles.seeAllLink}
                aria-label="See all news updates"
              >
                See all
              </a>
            </div>

            <div className={styles.newsGrid} role="list">
              {PLACEHOLDER_NEWS.map((item, i) => (
                <article
                  key={i}
                  className={styles.newsCard}
                  role="listitem"
                >
                  <div className={styles.newsImageWrap} aria-hidden="true">
                    <span className={styles.newsImagePlaceholder}>
                      Photo Placeholder
                    </span>
                  </div>
                  <div className={styles.newsBody}>
                    <a href="#" className={styles.newsSource}>
                      Rapid City Transportation Hub
                    </a>
                    <h3 className={styles.newsTitle}>{item.title}</h3>
                    <p className={styles.newsMeta}>
                      Posted {item.date} by {item.author}
                    </p>
                    <p className={styles.newsViews}>[Number of Views]</p>
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
                    <div className={styles.leaderImageWrap}>
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
                      <p className={styles.leaderRole}>
                        <span className={styles.leaderRoleLabel}>Role:</span>{' '}
                        {leader.level}
                      </p>
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
