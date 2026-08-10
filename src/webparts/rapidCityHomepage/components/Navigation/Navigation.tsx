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
import { useSearchVendors } from '../../../outsourceContactCards/hooks/useSearchVendors';
import { IVendor } from '../../../outsourceContactCards/models/types';
import { NotificationBell } from '../../../customerContactCards/components/NotificationBell/NotificationBell';
import { WeatherWidget } from '../WeatherWidget/WeatherWidget';

export interface INavLink {
  label: string;
  href: string;
  /** Open in a new tab (external apps like Viva Engage, ADP). */
  newTab?: boolean;
  /** URL is known but the page isn't built yet. '#' hrefs grey out anyway. */
  disabled?: boolean;
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
// Outsource vendor directory page (created at deploy time, COMPASS convention).
const OUTSOURCE_CARDS_URL = `${COMPASS}/SitePages/OutsourceContactCards.aspx`;
const EMPLOYEE_DIRECTORY_URL = `${COMPASS}/SitePages/EmployeeDirectory.aspx`;
const TRAINING_HUB_URL = `${COMPASS}/SitePages/TrainingHub.aspx`;
const IT_SUPPORT_URL = `${COMPASS}/SitePages/ITSupport.aspx`;
const CX_PUBLIC_URL = `${COMPASS}/SitePages/CustomerExperience.aspx`;
const IT_PUBLIC_URL = `${COMPASS}/SitePages/InformationTechnology.aspx`;
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
    { label: 'IT Support', href: IT_SUPPORT_URL },
    { label: 'Rise Hub', href: RISE_HUB_URL, newTab: true },
    // Remove `disabled` once the Training Hub page is created on compass.
    { label: 'Training Hub', href: trainingHubUrl, disabled: true },
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
  { label: 'Information Technology', href: IT_PUBLIC_URL },
];

export type NavPage =
  | 'home'
  | 'contactCards'
  | 'outsourceCards'
  | 'training'
  | 'departmentHub'
  | 'employeeDirectory'
  | 'itSupport';

export interface INavigationProps {
  /** Legacy: the nav search bar was removed (search lives in each directory);
   *  kept optional so existing pages that still pass it keep compiling. */
  onSearch?: (query: string) => void;
  /** Called when a customer is selected from the search dropdown (used on Contact Cards page to avoid page reload) */
  onCustomerSelect?: (customerId: string) => void;
  /** Vendor picked from the search dropdown, on the Outsource page. */
  onVendorSelect?: (vendorId: string) => void;
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
    activePage === 'training' || activePage === 'employeeDirectory' || activePage === 'itSupport';
  const isCardsActive = activePage === 'contactCards' || activePage === 'outsourceCards';
  const homeUrl = props.homeUrl || HOME_URL;
  const contactCardsUrl = props.contactCardsUrl || CONTACT_CARDS_URL;
  const employeeDirectoryUrl = props.employeeDirectoryUrl || EMPLOYEE_DIRECTORY_URL;
  const trainingHubUrl       = props.trainingHubUrl       || TRAINING_HUB_URL;

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

  // Only the two card pages get a nav search, so agents can jump to the next
  // card from inside a detail view. Each page searches its own data.
  const showSearch = activePage === 'contactCards' || activePage === 'outsourceCards';
  const searchesCustomers = activePage === 'contactCards';

  const [query, setQuery] = React.useState('');
  const [isOpen, setIsOpen] = React.useState(false);
  const [highlightIndex, setHighlightIndex] = React.useState(-1);
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const blurTimeoutRef = React.useRef<number | undefined>(undefined);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 200);
    return () => window.clearTimeout(timer);
  }, [query]);

  const { results, loading } = useSearchCustomers(searchesCustomers ? debouncedQuery : '');
  const { results: vendorResults, loading: vendorLoading } = useSearchVendors(
    showSearch && !searchesCustomers ? debouncedQuery : ''
  );

  const activeCount = searchesCustomers ? results.length : vendorResults.length;
  const activeLoading = searchesCustomers ? loading : vendorLoading;

  React.useEffect(() => {
    setHighlightIndex(-1);
  }, [results, vendorResults]);

  const navigateToCustomer = React.useCallback(
    (customer: ICustomer) => navigateToCustomerById(customer.id),
    [navigateToCustomerById]
  );

  const handleInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(val.trim().length > 0);
  }, []);

  const handleVendorResultClick = React.useCallback((vendor: IVendor) => {
    setIsOpen(false);
    setQuery('');
    if (props.onVendorSelect) props.onVendorSelect(vendor.id);
  }, [props.onVendorSelect]);

  const handleSearchKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      return;
    }
    if (e.key === 'ArrowDown' && activeCount > 0) {
      e.preventDefault();
      setHighlightIndex(prev => (prev < activeCount - 1 ? prev + 1 : 0));
      return;
    }
    if (e.key === 'ArrowUp' && activeCount > 0) {
      e.preventDefault();
      setHighlightIndex(prev => (prev > 0 ? prev - 1 : activeCount - 1));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < activeCount) {
        if (searchesCustomers) {
          navigateToCustomer(results[highlightIndex]);
        } else {
          handleVendorResultClick(vendorResults[highlightIndex]);
        }
      } else {
        setIsOpen(false);
        if (props.onSearch) props.onSearch(query);
      }
    }
  }, [searchesCustomers, results, vendorResults, activeCount, highlightIndex, query,
      navigateToCustomer, handleVendorResultClick, props.onSearch]);

  const handleSearchFocus = React.useCallback(() => {
    if (blurTimeoutRef.current) {
      window.clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = undefined;
    }
    if (query.trim().length > 0) {
      setIsOpen(true);
    }
  }, [query]);

  const handleSearchBlur = React.useCallback(() => {
    blurTimeoutRef.current = window.setTimeout(() => setIsOpen(false), 200);
  }, []);

  const handleResultClick = React.useCallback((customer: ICustomer) => {
    setIsOpen(false);
    setQuery('');
    navigateToCustomer(customer);
  }, [navigateToCustomer]);

  const handleSearchClear = React.useCallback(() => {
    setQuery('');
    setIsOpen(false);
    if (props.onSearch) props.onSearch('');
  }, [props.onSearch]);

  // Single source of truth for the menu links: the desktop dropdowns and the
  // mobile drawer accordions both render from these arrays.
  const contactCardsLinks: INavLink[] = React.useMemo(
    () => [
      { label: 'Customer', href: contactCardsUrl },
      // Remove `disabled` once OutsourceContactCards.aspx is created on compass.
      { label: 'Outsource', href: OUTSOURCE_CARDS_URL, disabled: true },
    ],
    [contactCardsUrl]
  );

  const cardsOptions: IDropdownOption[] = React.useMemo(
    () => contactCardsLinks.map((o) => ({
      key: o.label,
      text: o.label,
      data: o,
      disabled: o.disabled || o.href === '#',
    })),
    [contactCardsLinks]
  );

  const supportLinks = React.useMemo(
    () => buildEmployeeSupportOptions(employeeDirectoryUrl, trainingHubUrl),
    [employeeDirectoryUrl, trainingHubUrl]
  );

  const supportOptions: IDropdownOption[] = React.useMemo(
    () => supportLinks.map((o) => ({
      key: o.label,
      text: o.label,
      data: o,
      disabled: o.disabled || o.href === '#',
    })),
    [supportLinks]
  );

  const deptOptions: IDropdownOption[] = DEPARTMENT_HUBS_OPTIONS.map((o) => ({
    key: o.label,
    text: o.label,
    data: o,
    disabled: o.disabled || o.href === '#',
  }));

  // The expandable sections shown in the mobile drawer.
  const mobileSections: Array<{ key: string; label: string; active: boolean; links: INavLink[] }> = [
    {
      key: 'cards',
      label: 'Contact Cards',
      active: isCardsActive,
      links: contactCardsLinks,
    },
    {
      key: 'dept',
      label: 'Department Hubs',
      active: activePage === 'departmentHub',
      links: DEPARTMENT_HUBS_OPTIONS,
    },
    {
      key: 'support',
      label: 'Employee Support',
      active: activePage === 'training' || activePage === 'employeeDirectory' || activePage === 'itSupport',
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
            <a
              href="#"
              className={`${styles.link} ${styles.linkDisabled}`}
              onClick={(e) => e.preventDefault()}
              aria-disabled="true"
              tabIndex={-1}
            >
              All About the Company
            </a>
          </li>

          {/* 3. Contact Cards (dropdown: Customer / Outsource) */}
          <li className={`${styles.listItem} ${isCardsActive ? styles.listItemActive : ''}`}>
            <Dropdown
              placeholder="Contact Cards"
              options={cardsOptions}
              onChange={onDeptChange}
              className={styles.dropdown}
              ariaLabel="Contact Cards menu"
              dropdownWidth={180}
              onRenderPlaceholder={() => (
                <span className={`${styles.dropdownTitle} ${isCardsActive ? styles.dropdownTitleActive : ''}`}>
                  Contact Cards
                  <Icon iconName="ChevronDown" className={styles.chevron} />
                </span>
              )}
              onRenderTitle={() => (
                <span className={`${styles.dropdownTitle} ${isCardsActive ? styles.dropdownTitleActive : ''}`}>
                  Contact Cards
                  <Icon iconName="ChevronDown" className={styles.chevron} />
                </span>
              )}
            />
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

        <div
          className={`${styles.utilityBar} ${showSearch ? styles.utilityBarWithSearch : ''}`}
          role="group"
          aria-label="Search and utility actions"
        >
          {showSearch && (
            <div className={styles.searchBox}>
              <div className={styles.searchInputWrapper}>
                <span className={styles.searchIconInline} aria-hidden="true">
                  <Icon iconName="Search" />
                </span>
                <input
                  type="search"
                  className={styles.searchInput}
                  placeholder={searchesCustomers ? 'Search for Contact Cards' : 'Search Outsource Vendors'}
                  aria-label={searchesCustomers ? 'Search for customer contact card' : 'Search outsource vendors'}
                  value={query}
                  onChange={handleInputChange}
                  onKeyDown={handleSearchKeyDown}
                  onFocus={handleSearchFocus}
                  onBlur={handleSearchBlur}
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={isOpen && activeCount > 0}
                  aria-controls="nav-search-listbox"
                  aria-activedescendant={highlightIndex >= 0 ? `nav-search-option-${highlightIndex}` : undefined}
                />
                {query && (
                  <button
                    type="button"
                    className={styles.searchClear}
                    onClick={handleSearchClear}
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
                  {activeLoading && activeCount === 0 && (
                    <li className={styles.searchNoResults} role="option" aria-selected={false}>
                      Loading...
                    </li>
                  )}
                  {!activeLoading && activeCount === 0 && debouncedQuery.trim().length > 0 && (
                    <li className={styles.searchNoResults} role="option" aria-selected={false}>
                      No matches found
                    </li>
                  )}
                  {searchesCustomers && results.map((customer, idx) => (
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
                  {!searchesCustomers && vendorResults.map((vendor, idx) => (
                    <li
                      key={vendor.id}
                      id={`nav-search-option-${idx}`}
                      role="option"
                      aria-selected={idx === highlightIndex}
                      className={`${styles.searchResult} ${idx === highlightIndex ? styles.searchResultActive : ''}`}
                      onMouseDown={() => handleVendorResultClick(vendor)}
                      onMouseEnter={() => setHighlightIndex(idx)}
                    >
                      <div className={styles.searchResultName}>{vendor.name}</div>
                      <div className={styles.searchResultMeta}>
                        {vendor.zones.filter(z => !!z.zone).slice(0, 2).map(z => (
                          <span key={z.zone} className={styles.searchResultBadge}>{z.zone}</span>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <NotificationBell onNavigateToCustomer={navigateToCustomerById} />
          <WeatherWidget />
        </div>
      </div>

      {/* Mobile drawer: navigation links only. The header above keeps the
          bell and weather. Hidden entirely above 960px via CSS. */}
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
            <a
              href="#"
              className={`${styles.mobileNavLink} ${styles.mobileNavLinkDisabled}`}
              onClick={handleDrawerLink('#')}
              aria-disabled="true"
              tabIndex={-1}
            >
              <span className={styles.mobileNavLinkLabel}>All About the Company</span>
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
                  {section.links.map((link) => {
                    const isDisabled = link.disabled || link.href === '#';
                    return (
                      <li key={link.label}>
                        <a
                          href={link.href}
                          className={`${styles.mobileSubLink} ${isDisabled ? styles.mobileSubLinkDisabled : ''}`}
                          onClick={isDisabled
                            ? (e: React.MouseEvent<HTMLAnchorElement>) => e.preventDefault()
                            : handleDrawerLink(link.href)}
                          {...(isDisabled ? { 'aria-disabled': 'true' as const, tabIndex: -1 } : {})}
                          {...(link.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                        >
                          {link.label}
                        </a>
                      </li>
                    );
                  })}
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
