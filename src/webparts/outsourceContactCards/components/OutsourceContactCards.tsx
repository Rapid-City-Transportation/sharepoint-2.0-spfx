import * as React from 'react';
import styles from './OutsourceContactCards.module.scss';
import { IOutsourceContactCardsProps } from './IOutsourceContactCardsProps';
import { EMPTY_FILTERS, IVendor, IVendorFilters } from '../models/types';
import { useVendors } from '../hooks/useVendors';
import VendorGridView from './VendorGridView';
import VendorDetailView from './VendorDetailView';
import { Navigation } from '../../rapidCityHomepage/components/Navigation/Navigation';
import { defaultTheme, getThemeCssVariables } from '../../rapidCityHomepage/theme/ThemeTokens';
import { Footer } from '../../rapidCityHomepage/components/Footer/Footer';

type ViewState = 'grid' | 'detail';

/**
 * Grid/detail router, same shape as the Customer Contact Cards page. Filter
 * state lives here so selections survive opening and closing a vendor.
 */
const OutsourceContactCards: React.FC<IOutsourceContactCardsProps> = ({ title }) => {
  const [view, setView] = React.useState<ViewState>('grid');
  const [selectedVendor, setSelectedVendor] = React.useState<IVendor | null>(null);
  const [filters, setFilters] = React.useState<IVendorFilters>(EMPTY_FILTERS);

  const themeVars = React.useMemo(() => getThemeCssVariables(defaultTheme), []);
  const { vendors, loading, error } = useVendors();

  const lastVendorIdRef = React.useRef<string | null>(null);

  const handleCardClick = React.useCallback((vendor: IVendor): void => {
    lastVendorIdRef.current = vendor.id;
    setSelectedVendor(vendor);
    setView('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleBack = React.useCallback((): void => {
    setView('grid');
    setSelectedVendor(null);
  }, []);

  const handleNavSearch = React.useCallback((query: string): void => {
    // Same-text no-ops keep their object identity so the grid's page and
    // Show All state survive a redundant nav-search callback.
    setFilters(prev => (prev.searchText === query ? prev : { ...prev, searchText: query }));
    setView('grid');
    setSelectedVendor(null);
  }, []);

  const handleVendorSelect = React.useCallback((vendorId: string): void => {
    const match = vendors.find(v => v.id === vendorId);
    if (match) handleCardClick(match);
  }, [vendors, handleCardClick]);

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
    <div className={styles.webPartContainer} style={themeVars as React.CSSProperties}>
      <Navigation
        activePage="outsourceCards"
        onSearch={handleNavSearch}
        onVendorSelect={handleVendorSelect}
      />

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
          onCardClick={handleCardClick}
        />
      )}

      {view === 'detail' && selectedVendor && (
        <VendorDetailView
          key={selectedVendor.id}
          vendor={selectedVendor}
          onBack={handleBack}
          allVendors={vendors}
          onVendorSelect={handleCardClick}
        />
      )}

      <Footer pageIdentifier={feedbackPageId} />
    </div>
  );
};

export default OutsourceContactCards;
