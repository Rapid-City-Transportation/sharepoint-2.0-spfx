import * as React from 'react';
import styles from './ResourcesDrawer.module.scss';
import {
  fetchResourcesByCategory,
  ISiteResource,
  ResourceCategory,
} from '../../services/resourcesService';
import { sanitizeHtml } from '../../utils/sanitize';

interface IResourcesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
}

interface ITabConfig {
  id: string;
  label: string;
  category: ResourceCategory | null;
}

const TABS: ITabConfig[] = [
  { id: 'airports', label: 'Airports', category: 'Airport' },
  { id: 'trainStations', label: 'Train Stations', category: 'Train Station' },
  { id: 'hospitals', label: 'Hospitals', category: 'Hospital' },
  { id: 'schools', label: 'Schools', category: 'School' },
  { id: 'insurance', label: 'Insurance', category: 'Insurance Company' },
  { id: 'autoAlerts', label: 'Auto Alerts', category: 'Auto Alert' },
];

const ACTIVE_CATEGORIES: ResourceCategory[] = [
  'Airport',
  'Train Station',
  'Hospital',
  'School',
  'Insurance Company',
  'Auto Alert',
];

const COLLAPSIBLE_GROUP_TABS = new Set(['schools']);

const ResourcesDrawer: React.FC<IResourcesDrawerProps> = ({ isOpen, onClose, triggerRef }) => {
  const [activeTab, setActiveTab] = React.useState<string>('airports');
  const [resources, setResources] = React.useState<ISiteResource[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string>('');
  const [search, setSearch] = React.useState('');
  const [expandedIds, setExpandedIds] = React.useState<Set<number>>(new Set());
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set());

  const drawerRef = React.useRef<HTMLDivElement>(null);
  const closeBtnRef = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (!isOpen || resources.length > 0 || loading) return;

    setLoading(true);
    setError('');
    fetchResourcesByCategory(ACTIVE_CATEGORIES)
      .then(items => {
        setResources(items);
        setLoading(false);
      })
      .catch(() => {
        setError('Unable to load resources. Please try again later.');
        setLoading(false);
      });
  }, [isOpen, resources.length, loading]);

  // Only return focus to the trigger after a real close — not on initial mount.
  const wasOpenRef = React.useRef(false);
  React.useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
      const t = window.setTimeout(() => closeBtnRef.current?.focus(), 50);
      return () => window.clearTimeout(t);
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      triggerRef.current?.focus();
    }
    return undefined;
  }, [isOpen, triggerRef]);

  React.useEffect(() => {
    if (!isOpen) return undefined;
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleDrawerKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !drawerRef.current) return;
    const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  const handleTabChange = React.useCallback((tab: ITabConfig) => {
    setActiveTab(tab.id);
    setSearch('');
    setExpandedIds(new Set());
    setExpandedGroups(new Set());
  }, []);

  const toggleGroup = React.useCallback((groupName: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName);
      else next.add(groupName);
      return next;
    });
  }, []);

  const toggleItem = React.useCallback((id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const currentTab = TABS.find(t => t.id === activeTab);
  const isActiveCategory = currentTab?.category !== null && currentTab?.category !== undefined;
  const isCollapsibleTab = COLLAPSIBLE_GROUP_TABS.has(activeTab);
  const isSearching = search.trim().length > 0;

  const visibleItems = React.useMemo(() => {
    if (!currentTab || currentTab.category === null) return [];
    let list = resources.filter(r => r.category === currentTab.category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        r =>
          r.title.toLowerCase().includes(q) ||
          r.content.toLowerCase().includes(q) ||
          r.group.toLowerCase().includes(q)
      );
    }
    return list;
  }, [resources, currentTab, search]);

  const hasAnyGroup = React.useMemo(
    () => visibleItems.some(item => item.group && item.group.trim().length > 0),
    [visibleItems]
  );

  const groupedItems = React.useMemo(() => {
    const groups = new Map<string, ISiteResource[]>();
    const sorted = [...visibleItems].sort((a, b) => {
      const groupCmp = (a.group || 'zzz').localeCompare(b.group || 'zzz');
      if (groupCmp !== 0) return groupCmp;
      return a.title.localeCompare(b.title);
    });
    for (const item of sorted) {
      const key = item.group || '';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }
    return Array.from(groups.entries());
  }, [visibleItems]);

  return (
      <aside
        ref={drawerRef}
        className={`${styles.drawer} ${isOpen ? styles.open : ''}`}
        role="dialog"
        aria-modal="false"
        aria-labelledby="resources-drawer-title"
        aria-hidden={!isOpen}
        tabIndex={-1}
        onKeyDown={handleDrawerKeyDown}
      >
        <div className={styles.header}>
          <h2 id="resources-drawer-title" className={styles.title}>
            Address Directories
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close Address Directories panel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div role="tablist" aria-label="Resource categories" className={styles.tabBar}>
          {TABS.map(tab => {
            const isActive = tab.id === activeTab;
            const isPlaceholder = tab.category === null;
            return (
              <button
                key={tab.id}
                role="tab"
                id={`res-tab-${tab.id}`}
                type="button"
                aria-selected={isActive}
                aria-controls={`res-panel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                className={`${styles.tab} ${isActive ? styles.tabActive : ''} ${isPlaceholder ? styles.tabComingSoon : ''}`}
                onClick={() => handleTabChange(tab)}
              >
                {tab.label}
                {isPlaceholder && <span className={styles.comingSoonBadge}>Soon</span>}
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id={`res-panel-${activeTab}`}
          aria-labelledby={`res-tab-${activeTab}`}
          className={styles.body}
        >
          {!isActiveCategory && (
            <div className={styles.placeholder} role="status">
              <svg className={styles.placeholderIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <p className={styles.placeholderTitle}>Coming soon</p>
              <p className={styles.placeholderText}>
                This section will be populated as content is added to the SiteResources list.
              </p>
            </div>
          )}

          {isActiveCategory && (
            <>
              <div className={styles.searchWrapper}>
                <span className={styles.searchIcon} aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </span>
                <input
                  type="search"
                  className={styles.searchInput}
                  placeholder={`Search ${currentTab?.label.toLowerCase() || ''}...`}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  aria-label={`Search ${currentTab?.label || ''}`}
                />
              </div>

              {error && (
                <div className={styles.errorBanner} role="alert">
                  {error}
                </div>
              )}

              {loading && (
                <div className={styles.loadingState} role="status" aria-live="polite">
                  Loading resources…
                </div>
              )}

              {!loading && !error && visibleItems.length === 0 && (
                <div className={styles.placeholder} role="status">
                  <p className={styles.placeholderTitle}>No results</p>
                  <p className={styles.placeholderText}>
                    {search.trim()
                      ? 'Try a different search term.'
                      : 'No items have been added to this category yet.'}
                  </p>
                </div>
              )}

              {!loading && !error && visibleItems.length > 0 && (
                <>
                  <div className={styles.countLabel} aria-live="polite">
                    {visibleItems.length} result{visibleItems.length !== 1 ? 's' : ''}
                  </div>

                  {groupedItems.map(([groupName, items]) => {
                    const useCollapse = isCollapsibleTab && hasAnyGroup && groupName && !isSearching;
                    const isGroupOpen = !useCollapse || expandedGroups.has(groupName);
                    const groupId = `res-group-${(groupName || 'ungrouped').replace(/\s+/g, '-')}`;

                    return (
                      <section key={groupName || 'ungrouped'} aria-label={groupName || undefined}>
                        {hasAnyGroup && groupName && (
                          useCollapse ? (
                            <button
                              type="button"
                              className={styles.groupHeadingBtn}
                              onClick={() => toggleGroup(groupName)}
                              aria-expanded={isGroupOpen}
                              aria-controls={groupId}
                            >
                              <span>{groupName}</span>
                              <span className={styles.groupCount}>{items.length}</span>
                              <span
                                className={`${styles.groupChevron} ${isGroupOpen ? styles.groupChevronOpen : ''}`}
                                aria-hidden="true"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                              </span>
                            </button>
                          ) : (
                            <h3 className={styles.groupHeading}>{groupName}</h3>
                          )
                        )}
                        {isGroupOpen && items.map(item => {
                          const isExpanded = expandedIds.has(item.id);
                          const panelId = `res-item-${item.id}`;
                          return (
                            <div key={item.id} className={styles.item}>
                              <button
                                type="button"
                                className={styles.itemHeader}
                                onClick={() => toggleItem(item.id)}
                                aria-expanded={isExpanded}
                                aria-controls={panelId}
                              >
                                <span className={styles.itemTitle}>{item.title}</span>
                                <span
                                  className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ''}`}
                                  aria-hidden="true"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                                </span>
                              </button>
                              {isExpanded && (
                                <div
                                  id={panelId}
                                  className={styles.itemContent}
                                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.content) }}
                                />
                              )}
                            </div>
                          );
                        })}
                      </section>
                    );
                  })}
                </>
              )}
            </>
          )}
        </div>
      </aside>
  );
};

export default ResourcesDrawer;
