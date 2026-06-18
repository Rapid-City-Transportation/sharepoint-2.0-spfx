import * as React from 'react';
import { Navigation } from './Navigation/Navigation';
import { BannerCarousel } from './BannerCarousel/BannerCarousel';
import { Footer } from './Footer/Footer';
import { defaultTheme, getThemeCssVariables } from '../theme/ThemeTokens';
import { IRapidCityHomepageProps } from './IRapidCityHomepageProps';
import styles from './RapidCityHomepage.module.scss';

/**
 * Build the Contact Cards page URL with the search query appended as ?q=.
 * Accepts either an absolute URL or a server-relative path; returns '#' when
 * baseUrl is empty or '#'.
 */
function buildContactCardsSearchUrl(baseUrl: string, query: string): string {
  if (!baseUrl || baseUrl === '#') return '#';
  const trimmed = (query || '').trim();
  try {
    const fullHref = baseUrl.startsWith('http') ? baseUrl : `${window.location.origin}${baseUrl.startsWith('/') ? '' : '/'}${baseUrl}`;
    const url = new URL(fullHref);
    if (trimmed) {
      url.searchParams.set('q', trimmed);
    }
    return url.pathname + url.search;
  } catch {
    const sep = baseUrl.indexOf('?') >= 0 ? '&' : '?';
    return baseUrl + (trimmed ? `${sep}q=${encodeURIComponent(trimmed)}` : '');
  }
}

export default function RapidCityHomepage(props: IRapidCityHomepageProps) {
  const themeVars = React.useMemo(
    () => getThemeCssVariables(defaultTheme),
    []
  );

  const handleSearch = React.useCallback(
    (query: string) => {
      const url = buildContactCardsSearchUrl(props.contactCardsPageUrl, query);
      window.location.assign(url);
    },
    [props.contactCardsPageUrl]
  );

  return (
    <div
      className={styles.container}
      style={themeVars as React.CSSProperties}
    >
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>

      <Navigation onSearch={handleSearch} activePage="home" />

      <main id="main-content" className={styles.main} role="main" tabIndex={-1}>
        <h1 className={styles.srHeading}>Rapid City Transportation Hub</h1>
        <BannerCarousel />
      </main>

      <Footer pageIdentifier="Home Page" />
    </div>
  );
}
