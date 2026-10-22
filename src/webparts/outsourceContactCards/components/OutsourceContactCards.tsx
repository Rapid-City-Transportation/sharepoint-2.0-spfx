import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './OutsourceContactCards.module.scss';
import { IOutsourceContactCardsProps } from './IOutsourceContactCardsProps';
import { EMPTY_FILTERS, IVendor, IVendorFilters } from '../models/types';
import { useVendors } from '../hooks/useVendors';
import VendorGridView from './VendorGridView';
import VendorDetailView from './VendorDetailView';
import { Navigation } from '../../rapidCityHomepage/components/Navigation/Navigation';
import { defaultTheme, getThemeCssVariables } from '../../rapidCityHomepage/theme/ThemeTokens';
import { Footer } from '../../rapidCityHomepage/components/Footer/Footer';
import ResourcesDrawer, {
  IResourceTab,
  RESOURCE_TABS,
} from '../../customerContactCards/components/ResourcesDrawer/ResourcesDrawer';
import ResourcesTrigger from '../../customerContactCards/components/ResourcesDrawer/ResourcesTrigger';

// Dispatch asked for the address directories only; travel times, insurance
// and auto alerts are Customer Experience material.
const ADDRESS_TAB_IDS = ['airports', 'trainStations', 'hospitals', 'schools'];
const ADDRESS_TABS: IResourceTab[] = RESOURCE_TABS.filter(t => ADDRESS_TAB_IDS.indexOf(t.id) !== -1);

type ViewState = 'grid' | 'detail';

// The open card lives in the URL (?vendor=<id>), so a refresh, a bookmark or
// a pasted link lands on the same company instead of back at the grid.
const VENDOR_PARAM = 'vendor';

function readVendorParam(): string | null {
  return new URLSearchParams(window.location.search).get(VENDOR_PARAM);
}

function writeVendorParam(id: string | null): void {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set(VENDOR_PARAM, id);
  else url.searchParams.delete(VENDOR_PARAM);
  window.history.replaceState(window.history.state, '', url.toString());
}

/**
 * Grid/detail router, same shape as the Customer Contact Cards page, with the
 * same Address Directories drawer (addresses only). Filter state lives here
 * so selections survive opening and closing a vendor.
 */
const OutsourceContactCards: React.FC<IOutsourceContactCardsProps> = ({
  title,
  showDevelopmentNotice,
}) => {
  const [view, setView] = React.useState<ViewState>('grid');
  const [selectedVendor, setSelectedVendor] = React.useState<IVendor | null>(null);
  const [filters, setFilters] = React.useState<IVendorFilters>(EMPTY_FILTERS);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const resourcesTriggerRef = React.useRef<HTMLButtonElement>(null);
  const openDrawer = React.useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = React.useCallback(() => setDrawerOpen(false), []);

  const themeVars = React.useMemo(() => getThemeCssVariables(defaultTheme), []);
  const { vendors, loading, error } = useVendors();

  const lastVendorIdRef = React.useRef<string | null>(null);

  const handleCardClick = React.useCallback((vendor: IVendor): void => {
    lastVendorIdRef.current = vendor.id;
    setSelectedVendor(vendor);
    setView('detail');
    writeVendorParam(vendor.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // The alternatives' vehicle filter. Seeded from the grid's vehicle filter
  // when a card is opened from the grid or the nav search, then left alone
  // as the dispatcher hops from one alternative's card to the next.
  const [altVehicle, setAltVehicle] = React.useState<string>(EMPTY_FILTERS.vehicleType);
  const handleGridCardClick = React.useCallback((vendor: IVendor): void => {
    setAltVehicle(filters.vehicleType);
    handleCardClick(vendor);
  }, [filters.vehicleType, handleCardClick]);

  const handleBack = React.useCallback((): void => {
    setView('grid');
    setSelectedVendor(null);
    writeVendorParam(null);
  }, []);

  const handleNavSearch = React.useCallback((query: string): void => {
    // Same-text no-ops keep their object identity so the grid's page and
    // Show All state survive a redundant nav-search callback.
    setFilters(prev => (prev.searchText === query ? prev : { ...prev, searchText: query }));
    setView('grid');
    setSelectedVendor(null);
    writeVendorParam(null);
  }, []);

  // Once the directory has loaded, open the card the URL names (if any).
  const openedFromUrl = React.useRef(false);
  React.useEffect(() => {
    if (openedFromUrl.current || vendors.length === 0) return;
    openedFromUrl.current = true;
    const wanted = readVendorParam();
    const match = wanted ? vendors.find(v => v.id === wanted) : undefined;
    if (match) handleCardClick(match);
  }, [vendors, handleCardClick]);

  const handleVendorSelect = React.useCallback((vendorId: string): void => {
    const match = vendors.find(v => v.id === vendorId);
    if (match) handleGridCardClick(match);
  }, [vendors, handleGridCardClick]);

  // Returning to the grid moves focus back to the card that opened the
  // detail view; falls back to the page heading when the card is gone.
  React.useEffect(() => {
    if (view !== 'grid' || !lastVendorIdRef.current) return;
    const card = document.querySelector<HTMLButtonElement>(
      `[data-vendor-id="${lastVendorIdRef.current}"]`
    );
    if (card) {
      card.focus();
    } else {
      document.getElementById('occ-page-heading')?.focus();
    }
    lastVendorIdRef.current = null;
  }, [view]);

  const feedbackPageId = view === 'detail' && selectedVendor
    ? `${selectedVendor.name} Outsource Contact Card`
    : 'Outsource Contact Cards Page';

  return (
    <div
      className={`${styles.webPartContainer} ${drawerOpen ? styles.webPartContainerShifted : ''}`}
      style={themeVars as React.CSSProperties}
    >
      <Navigation
        activePage="outsourceCards"
        onSearch={handleNavSearch}
        onVendorSelect={handleVendorSelect}
      />

      {showDevelopmentNotice && (
        <div className={styles.devNotice} role="note">
          <Icon iconName="Warning" className={styles.devNoticeIcon} aria-hidden="true" />
          <p className={styles.devNoticeText}>
            <strong>In development - do not use.</strong> This page is still being built, and
            the information on it may be incomplete or out of date.
          </p>
        </div>
      )}

      {view === 'grid' && (
        <div className={styles.pageHeadingRow}>
          <h1 id="occ-page-heading" className={styles.pageHeading} tabIndex={-1}>{title}</h1>
        </div>
      )}

      {view === 'grid' && loading && (
        <div className={styles.emptyState} role="status" aria-live="polite">
          <p>Loading vendors…</p>
        </div>
      )}

      {view === 'grid' && error && !loading && (
        <div className={styles.emptyState} role="alert">
          <p>{error}</p>
        </div>
      )}

      {view === 'grid' && !loading && !error && (
        <VendorGridView
          allVendors={vendors}
          filters={filters}
          onFiltersChange={setFilters}
          onCardClick={handleGridCardClick}
        />
      )}

      {view === 'detail' && selectedVendor && (
        <VendorDetailView
          key={selectedVendor.id}
          vendor={selectedVendor}
          onBack={handleBack}
          allVendors={vendors}
          onVendorSelect={handleCardClick}
          altVehicle={altVehicle}
          onAltVehicleChange={setAltVehicle}
        />
      )}

      <Footer pageIdentifier={feedbackPageId} />

      <ResourcesDrawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        triggerRef={resourcesTriggerRef}
        tabs={ADDRESS_TABS}
      />

      <ResourcesTrigger
        ref={resourcesTriggerRef}
        onClick={drawerOpen ? closeDrawer : openDrawer}
        isOpen={drawerOpen}
      />
    </div>
  );
};

export default OutsourceContactCards;
