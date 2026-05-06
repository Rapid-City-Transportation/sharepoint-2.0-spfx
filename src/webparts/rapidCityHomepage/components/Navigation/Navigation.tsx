import * as React from 'react';
import {
  Dropdown,
  IDropdownOption,
  IDropdownProps,
} from '@fluentui/react/lib/Dropdown';
import { IconButton } from '@fluentui/react/lib/Button';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './Navigation.module.scss';
import { useSearchCustomers } from '../../../customerContactCards/hooks/useSearchCustomers';
import { ICustomer } from '../../../customerContactCards/components/types';
import { NotificationBell } from '../../../customerContactCards/components/NotificationBell/NotificationBell';
import { WeatherWidget } from '../WeatherWidget/WeatherWidget';

export interface INavLink {
  label: string;
  href: string;
}

export interface INavDropdown {
  label: string;
  options: INavLink[];
}

const EMPLOYEE_SUPPORT_OPTIONS: INavLink[] = [
  { label: 'Training Hub', href: '#' },
  { label: 'Rise Hub', href: '#' },
  { label: 'Employee Directory', href: '#' },
  { label: 'Information Technology Support', href: '#' },
  { label: 'Human Resources Support', href: '#' },
  // Update hrefs to real intranet pages
];

const DEPARTMENT_HUBS_OPTIONS: INavLink[] = [
  { label: 'Customer Experience', href: '#' },
  { label: 'Dispatch', href: '#' },
  { label: 'Accounting', href: '#' },
  { label: 'Human Resources', href: '#' },
  { label: 'Information Technology', href: '#' },
  { label: 'Business Development', href: '#' },
];

export type NavPage = 'home' | 'contactCards' | 'training';

export interface INavigationProps {
  onSearch: (query: string) => void;
  /** Called when a customer is selected from the search dropdown (used on Contact Cards page to avoid page reload) */
  onCustomerSelect?: (customerId: string) => void;
  /** Which page is currently active — controls the highlighted nav item */
  activePage?: NavPage;
  /** URL for the Home page link (defaults to '/') */
  homeUrl?: string;
  /** URL for the Contact Cards page link (defaults to '#') */
  contactCardsUrl?: string;
}

export const Navigation: React.FC<INavigationProps> = (props) => {
  const activePage = props.activePage || 'home';
  const homeUrl = props.homeUrl || 'https://rapidcitytransport.sharepoint.com/sites/HomeTest';
  const contactCardsUrl = props.contactCardsUrl || 'https://rapidcitytransport.sharepoint.com/sites/ContactCards';

  // Search dropdown state
  const [query, setQuery] = React.useState('');
  const [isOpen, setIsOpen] = React.useState(false);
  const [highlightIndex, setHighlightIndex] = React.useState(-1);
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const blurTimeoutRef = React.useRef<number | undefined>(undefined);

  // Debounce the query
  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 200);
    return () => window.clearTimeout(timer);
  }, [query]);

  const { results, loading } = useSearchCustomers(debouncedQuery);

  // Reset highlight when results change
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
      : 'https://rapidcitytransport.sharepoint.com/sites/ContactCards';
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

  // Fluent dropdown handlers (unchanged)
  const supportOptions: IDropdownOption[] = EMPLOYEE_SUPPORT_OPTIONS.map((o) => ({
    key: o.label,
    text: o.label,
    data: o,
  }));

  const deptOptions: IDropdownOption[] = DEPARTMENT_HUBS_OPTIONS.map((o) => ({
    key: o.label,
    text: o.label,
    data: o,
  }));

  const onSupportChange: IDropdownProps['onChange'] = (_ev, option) => {
    const href = (option?.data as INavLink)?.href;
    if (href && href !== '#') {
      window.location.assign(href);
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

          {/* 3. Employee Support (dropdown: Training Hub, Rise HUB, Employee Directory) */}
          <li className={styles.listItem}>
            <Dropdown
              placeholder="Employee Support"
              options={supportOptions}
              onChange={onSupportChange}
              className={styles.dropdown}
              ariaLabel="Employee Support menu"
              dropdownWidth={220}
              onRenderPlaceholder={() => (
                <span className={styles.dropdownTitle}>
                  Employee Support
                  <Icon iconName="ChevronDown" className={styles.chevron} />
                </span>
              )}
              onRenderTitle={() => (
                <span className={styles.dropdownTitle}>
                  Employee Support
                  <Icon iconName="ChevronDown" className={styles.chevron} />
                </span>
              )}
            />
          </li>

          {/* 4. Department Hubs (dropdown) */}
          <li className={styles.listItem}>
            <Dropdown
              placeholder="Department Hubs"
              options={deptOptions}
              onChange={onDeptChange}
              className={styles.dropdown}
              ariaLabel="Department Hubs menu"
              dropdownWidth={220}
              onRenderPlaceholder={() => (
                <span className={styles.dropdownTitle}>
                  Department Hubs
                  <Icon iconName="ChevronDown" className={styles.chevron} />
                </span>
              )}
              onRenderTitle={() => (
                <span className={styles.dropdownTitle}>
                  Department Hubs
                  <Icon iconName="ChevronDown" className={styles.chevron} />
                </span>
              )}
            />
          </li>

          {/* 5. Contact Cards */}
          <li className={styles.listItem}>
            <a
              href={contactCardsUrl}
              className={activePage === 'contactCards' ? styles.linkActive : styles.link}
              {...(activePage === 'contactCards' ? { 'aria-current': 'page' as const } : {})}
            >
              Contact Cards
            </a>
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

          {activePage === 'contactCards' ? (
            <NotificationBell onNavigateToCustomer={navigateToCustomerById} />
          ) : (
            <IconButton
              iconProps={{ iconName: 'Ringer' }}
              ariaLabel="Notifications"
              title="Notifications"
              className={styles.utilityIcon}
            />
          )}
          <WeatherWidget />
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
