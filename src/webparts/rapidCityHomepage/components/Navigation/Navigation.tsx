import * as React from 'react';
import {
  Dropdown,
  IDropdownOption,
  IDropdownProps,
} from '@fluentui/react/lib/Dropdown';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './Navigation.module.scss';
import { useSearchCustomers } from '../../../customerContactCards/hooks/useSearchCustomers';
import { ICustomer } from '../../../customerContactCards/components/types';
import { NotificationBell } from '../../../customerContactCards/components/NotificationBell/NotificationBell';
import { WeatherWidget } from '../WeatherWidget/WeatherWidget';

export interface INavLink {
  label: string;
  href: string;
  /** Open in a new tab (external apps like Viva Engage, ADP). */
  newTab?: boolean;
}

export interface INavDropdown {
  label: string;
  options: INavLink[];
}

// Canonical page URLs: every page lives on the COMPASS site. Single source of
// truth for the nav; render sites pass only activePage.
const COMPASS = 'https://rapidcitytransport.sharepoint.com/sites/compass';
const HOME_URL = `${COMPASS}/SitePages/Home.aspx`;
// Temporary: Contact Cards still lives on its own site until full go-live.
// This MUST be the explicit page that hosts the web part, NOT the site root:
// navigating to "/sites/ContactCards?id=" makes SharePoint do a welcome-page
// redirect that fails to render (bypassReason=abandoned) and 404s the bell/search
// deep links. The page's file is Home.aspx on that site. Switch to
// `${COMPASS}/SitePages/ContactCards.aspx` when it moves to COMPASS.
const CONTACT_CARDS_URL =
  'https://rapidcitytransport.sharepoint.com/sites/ContactCards/SitePages/Home.aspx';
const EMPLOYEE_DIRECTORY_URL = `${COMPASS}/SitePages/EmployeeDirectory.aspx`;
const TRAINING_HUB_URL = `${COMPASS}/SitePages/TrainingHub.aspx`;
const CX_PUBLIC_URL = `${COMPASS}/SitePages/CustomerExperience.aspx`;
// RISE Hub lives in Viva Engage (same community deep link the CX Hub embeds).
const RISE_HUB_URL =
  'https://engage.cloud.microsoft/main/org/rapidcitytransport.com/groups/eyJfdHlwZSI6Ikdyb3VwIiwiaWQiOiIyMjgxNzMxMzU4NzIifQ/all';
// ADP Web Clock: external punch-clock app; opens in a new tab.
const ADP_WEB_CLOCK_URL =
  'https://online.adp.com/signin/v1/?APPID=webclk&productId=80e309c3-7098-bae1-e053-3505430b5495&returnURL=https://clock.adp.com&callingAppId=webclk&TARGET=-SM-https://clock.adp.com/';

function buildEmployeeSupportOptions(
  employeeDirectoryUrl: string,
  trainingHubUrl: string
): INavLink[] {
  // Alphabetical by label.
  return [
    { label: 'ADP Web Clock', href: ADP_WEB_CLOCK_URL, newTab: true },
    { label: 'Employee Directory', href: employeeDirectoryUrl },
    { label: 'Human Resources Support', href: '#' },
    { label: 'Information Technology Support', href: '#' },
    { label: 'Rise Hub', href: RISE_HUB_URL, newTab: true },
    { label: 'Training Hub', href: trainingHubUrl },
    // Update remaining hrefs as those pages come online.
  ];
}

// Alphabetical by label.
const DEPARTMENT_HUBS_OPTIONS: INavLink[] = [
  { label: 'Accounting', href: '#' },
  { label: 'Business Development', href: '#' },
  { label: 'Customer Experience', href: CX_PUBLIC_URL },
  { label: 'Dispatch', href: '#' },
  { label: 'Human Resources', href: '#' },
  { label: 'Information Technology', href: '#' },
];

export type NavPage =
  | 'home'
  | 'contactCards'
  | 'training'
  | 'departmentHub'
  | 'employeeDirectory';

export interface INavigationProps {
  onSearch: (query: string) => void;
  /** Called when a customer is selected from the search dropdown (used on Contact Cards page to avoid page reload) */
  onCustomerSelect?: (customerId: string) => void;
  /** Which page is currently active; controls the highlighted nav item */
  activePage?: NavPage;
  /** URL for the Home page link (defaults to '/') */
  homeUrl?: string;
  /** URL for the Contact Cards page link (defaults to '#') */
  contactCardsUrl?: string;
  /** URL for the Employee Directory page link (defaults to the Management site page) */
  employeeDirectoryUrl?: string;
  /** URL for the public Training Hub landing page. */
  trainingHubUrl?: string;
}

export const Navigation: React.FC<INavigationProps> = (props) => {
  const activePage = props.activePage || 'home';
  const isSupportActive =
    activePage === 'training' || activePage === 'employeeDirectory';
  const homeUrl = props.homeUrl || HOME_URL;
  const contactCardsUrl = props.contactCardsUrl || CONTACT_CARDS_URL;
  const employeeDirectoryUrl = props.employeeDirectoryUrl || EMPLOYEE_DIRECTORY_URL;
  const trainingHubUrl       = props.trainingHubUrl       || TRAINING_HUB_URL;

  const [query, setQuery] = React.useState('');
  const [isOpen, setIsOpen] = React.useState(false);
  const [highlightIndex, setHighlightIndex] = React.useState(-1);
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const blurTimeoutRef = React.useRef<number | undefined>(undefined);

  // Below 960px the full horizontal bar no longer fits, so it collapses
  // behind a hamburger toggle. Escape closes the open panel.
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    if (!menuOpen) return undefined;
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  // Which drawer accordion sections (Employee Support / Department Hubs) are
  // expanded on mobile.
  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>({});

  const toggleSection = React.useCallback((key: string): void => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // A drawer leaf link closes the menu on tap. Placeholder ('#') links go
  // nowhere, so we also stop the default jump-to-top.
  const handleDrawerLink = React.useCallback(
    (href: string) => (e: React.MouseEvent<HTMLAnchorElement>): void => {
      if (!href || href === '#') {
        e.preventDefault();
      }
      setMenuOpen(false);
    },
    []
  );

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 200);
    return () => window.clearTimeout(timer);
  }, [query]);

  const { results, loading } = useSearchCustomers(debouncedQuery);

  React.useEffect(() => {
    setHighlightIndex(-1);
  }, [results]);

  const navigateToCustomerById = React.useCallback((customerId: string) => {
    // If we're already on the Contact Cards page, use the callback to avoid a page reload
    if (props.onCustomerSelect) {
      props.onCustomerSelect(customerId);
      return;
    }
    // Otherwise navigate to the Contact Cards page with ?id= param
    const base = contactCardsUrl && contactCardsUrl !== '#'
      ? contactCardsUrl
      : CONTACT_CARDS_URL;
    const sep = base.indexOf('?') >= 0 ? '&' : '?';
    window.location.assign(`${base}${sep}id=${customerId}`);
  }, [contactCardsUrl, props.onCustomerSelect]);

  const navigateToCustomer = React.useCallback(
    (customer: ICustomer) => navigateToCustomerById(customer.id),
    [navigateToCustomerById]
  );

  const handleInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(val.trim().length > 0);
  }, []);

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < results.length) {
        navigateToCustomer(results[highlightIndex]);
      } else {
        setIsOpen(false);
        props.onSearch(query);
      }
      return;
    }
  }, [results, highlightIndex, query, navigateToCustomer, props.onSearch]);

  const handleFocus = React.useCallback(() => {
    if (blurTimeoutRef.current) {
      window.clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = undefined;
    }
    if (query.trim().length > 0) {
      setIsOpen(true);
    }
  }, [query]);

  const handleBlur = React.useCallback(() => {
    // Delay close so click events on dropdown items fire first
    blurTimeoutRef.current = window.setTimeout(() => setIsOpen(false), 200);
  }, []);

  const handleResultClick = React.useCallback((customer: ICustomer) => {
    setIsOpen(false);
    setQuery('');
    navigateToCustomer(customer);
  }, [navigateToCustomer]);

  const handleClear = React.useCallback(() => {
    setQuery('');
    setIsOpen(false);
    props.onSearch('');
  }, [props.onSearch]);

  // Single source of truth for the menu links: the desktop dropdowns and the
  // mobile drawer accordions both render from these arrays.
  const supportLinks = React.useMemo(
    () => buildEmployeeSupportOptions(employeeDirectoryUrl, trainingHubUrl),
    [employeeDirectoryUrl, trainingHubUrl]
  );

  const supportOptions: IDropdownOption[] = React.useMemo(
    () => supportLinks.map((o) => ({ key: o.label, text: o.label, data: o })),
    [supportLinks]
  );

  const deptOptions: IDropdownOption[] = DEPARTMENT_HUBS_OPTIONS.map((o) => ({
    key: o.label,
    text: o.label,
    data: o,
  }));

  // The two expandable sections shown in the mobile drawer.
  const mobileSections: Array<{ key: string; label: string; active: boolean; links: INavLink[] }> = [
    {
      key: 'dept',
      label: 'Department Hubs',
      active: activePage === 'departmentHub',
      links: DEPARTMENT_HUBS_OPTIONS,
    },
    {
      key: 'support',
      label: 'Employee Support',
      active: activePage === 'training' || activePage === 'employeeDirectory',
      links: supportLinks,
    },
  ];

  const onSupportChange: IDropdownProps['onChange'] = (_ev, option) => {
    const link = option?.data as INavLink;
    if (!link?.href || link.href === '#') return;
    if (link.newTab) {
      window.open(link.href, '_blank', 'noopener,noreferrer');
    } else {
      window.location.assign(link.href);
    }
  };

  const onDeptChange: IDropdownProps['onChange'] = (_ev, option) => {
    const href = (option?.data as INavLink)?.href;
    if (href && href !== '#') {
      window.location.assign(href);
    }
  };

  return (
    <nav className={styles.nav} role="navigation" aria-label="Main">
      <div className={styles.navInner}>
        <button
          type="button"
          className={styles.hamburger}
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          aria-controls="rct-nav-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Icon iconName={menuOpen ? 'Cancel' : 'GlobalNavButton'} aria-hidden="true" />
        </button>
        <ul className={styles.list}>
          {/* 1. Home */}
          <li className={styles.listItem}>
            <a
              href={homeUrl}
              className={`${activePage === 'home' ? styles.linkActive : styles.link} ${styles.homeLink}`}
              aria-label="Home"
              {...(activePage === 'home' ? { 'aria-current': 'page' as const } : {})}
            >
              <Icon iconName="Home" className={styles.homeIcon} />
            </a>
          </li>

          {/* 2. All About the Company */}
          <li className={styles.listItem}>
            <a href="#" className={styles.link} onClick={(e) => e.preventDefault()}>
              All About the Company
            </a>
          </li>

          {/* 3. Contact Cards */}
          <li className={styles.listItem}>
            <a
              href={contactCardsUrl}
              className={activePage === 'contactCards' ? styles.linkActive : styles.link}
              {...(activePage === 'contactCards' ? { 'aria-current': 'page' as const } : {})}
            >
              Contact Cards
            </a>
          </li>

          {/* 4. Department Hubs (dropdown) */}
          <li className={`${styles.listItem} ${activePage === 'departmentHub' ? styles.listItemActive : ''}`}>
            <Dropdown
              placeholder="Department Hubs"
              options={deptOptions}
              onChange={onDeptChange}
              className={styles.dropdown}
              ariaLabel="Department Hubs menu"
              dropdownWidth={220}
              onRenderPlaceholder={() => (
                <span className={`${styles.dropdownTitle} ${activePage === 'departmentHub' ? styles.dropdownTitleActive : ''}`}>
                  Department Hubs
                  <Icon iconName="ChevronDown" className={styles.chevron} />
                </span>
              )}
              onRenderTitle={() => (
                <span className={`${styles.dropdownTitle} ${activePage === 'departmentHub' ? styles.dropdownTitleActive : ''}`}>
                  Department Hubs
                  <Icon iconName="ChevronDown" className={styles.chevron} />
                </span>
              )}
            />
          </li>

          {/* 5. Employee Support (dropdown: ADP, Employee Directory, IT/HR Support, Rise Hub, Training Hub) */}
          <li className={`${styles.listItem} ${isSupportActive ? styles.listItemActive : ''}`}>
            <Dropdown
              placeholder="Employee Support"
              options={supportOptions}
              onChange={onSupportChange}
              notifyOnReselect
              className={styles.dropdown}
              ariaLabel="Employee Support menu"
              dropdownWidth={220}
              onRenderPlaceholder={() => (
                <span className={`${styles.dropdownTitle} ${isSupportActive ? styles.dropdownTitleActive : ''}`}>
                  Employee Support
                  <Icon iconName="ChevronDown" className={styles.chevron} />
                </span>
              )}
              onRenderTitle={() => (
                <span className={`${styles.dropdownTitle} ${isSupportActive ? styles.dropdownTitleActive : ''}`}>
                  Employee Support
                  <Icon iconName="ChevronDown" className={styles.chevron} />
                </span>
              )}
            />
          </li>
        </ul>

        <div className={styles.utilityBar} role="group" aria-label="Search and utility actions">
          <div className={styles.searchBox} ref={wrapperRef}>
            <div className={styles.searchInputWrapper}>
              <span className={styles.searchIconInline} aria-hidden="true">
                <Icon iconName="Search" />
              </span>
              <input
                type="search"
                className={styles.searchInput}
                placeholder="Search for Contact Cards"
                aria-label="Search for customer contact card"
                value={query}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                onBlur={handleBlur}
                role="combobox"
                aria-expanded={isOpen && results.length > 0}
                aria-controls="nav-search-listbox"
                aria-activedescendant={highlightIndex >= 0 ? `nav-search-option-${highlightIndex}` : undefined}
                autoComplete="off"
              />
              {query && (
                <button
                  type="button"
                  className={styles.searchClear}
                  onClick={handleClear}
                  aria-label="Clear search"
                  tabIndex={-1}
                >
                  <Icon iconName="Cancel" />
                </button>
              )}
            </div>

            {isOpen && query.trim().length > 0 && (
              <ul
                id="nav-search-listbox"
                role="listbox"
                className={styles.searchDropdown}
                aria-label="Search results"
              >
                {loading && results.length === 0 && (
                  <li className={styles.searchNoResults} role="option" aria-selected={false}>
                    Loading...
                  </li>
                )}
                {!loading && results.length === 0 && debouncedQuery.trim().length > 0 && (
                  <li className={styles.searchNoResults} role="option" aria-selected={false}>
                    No matches found
                  </li>
                )}
                {results.map((customer, idx) => (
                  <li
                    key={customer.id}
                    id={`nav-search-option-${idx}`}
                    role="option"
                    aria-selected={idx === highlightIndex}
                    className={`${styles.searchResult} ${idx === highlightIndex ? styles.searchResultActive : ''}`}
                    onMouseDown={() => handleResultClick(customer)}
                    onMouseEnter={() => setHighlightIndex(idx)}
                  >
                    <div className={styles.searchResultName}>{customer.name}</div>
                    <div className={styles.searchResultMeta}>
                      <span className={styles.searchResultBadge}>{customer.customerType}</span>
                      {customer.clientRole && (
                        <span className={styles.searchResultRoleBadge}>{customer.clientRole}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <NotificationBell onNavigateToCustomer={navigateToCustomerById} />
          <WeatherWidget />
        </div>
      </div>

      {/* Mobile drawer: navigation links only. The header above keeps the
          search, bell, and weather. Hidden entirely above 960px via CSS. */}
      <div id="rct-nav-menu" className={styles.mobileDrawer} hidden={!menuOpen}>
        <ul className={styles.mobileNavList}>
          <li>
            <a
              href={homeUrl}
              className={`${styles.mobileNavLink} ${activePage === 'home' ? styles.mobileNavLinkActive : ''}`}
              onClick={handleDrawerLink(homeUrl)}
              {...(activePage === 'home' ? { 'aria-current': 'page' as const } : {})}
            >
              <span className={styles.mobileNavLinkLabel}>Home</span>
            </a>
          </li>

          <li>
            <a href="#" className={styles.mobileNavLink} onClick={handleDrawerLink('#')}>
              <span className={styles.mobileNavLinkLabel}>All About the Company</span>
            </a>
          </li>

          <li>
            <a
              href={contactCardsUrl}
              className={`${styles.mobileNavLink} ${activePage === 'contactCards' ? styles.mobileNavLinkActive : ''}`}
              onClick={handleDrawerLink(contactCardsUrl)}
              {...(activePage === 'contactCards' ? { 'aria-current': 'page' as const } : {})}
            >
              <span className={styles.mobileNavLinkLabel}>Contact Cards</span>
            </a>
          </li>

          {mobileSections.map((section) => {
            const expanded = !!openSections[section.key];
            const panelId = `rct-nav-${section.key}`;
            return (
              <li key={section.key}>
                <button
                  type="button"
                  className={`${styles.mobileNavLink} ${section.active ? styles.mobileNavLinkActive : ''}`}
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  onClick={() => toggleSection(section.key)}
                >
                  <span className={styles.mobileNavLinkLabel}>{section.label}</span>
                  <Icon iconName="ChevronDown" className={styles.mobileChevron} aria-hidden="true" />
                </button>
                <ul id={panelId} className={styles.mobileSubList} hidden={!expanded}>
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className={styles.mobileSubLink}
                        onClick={handleDrawerLink(link.href)}
                        {...(link.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};

export default Navigation;
