import * as React from 'react';
import styles from './OutsourceContactCards.module.scss';
import { IVendor, IVendorFilters } from '../models/types';
import { facetOptions, filterVendors, sortVendors } from '../services/vendorSearch';
import VendorCard from './VendorCard';

const PAGE_SIZE = 15;

interface IVendorGridViewProps {
  allVendors: IVendor[];
  filters: IVendorFilters;
  onFiltersChange: (filters: IVendorFilters) => void;
  onCardClick: (vendor: IVendor) => void;
}

/**
 * Vendor directory with zone/city/vehicle facets and paging that matches the
 * customer contact cards. Filter state lives in the parent so it survives
 * opening a vendor. Priority is deliberately absent from every control.
 */
const VendorGridView: React.FC<IVendorGridViewProps> = ({
  allVendors,
  filters,
  onFiltersChange,
  onCardClick,
}) => {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [showAll, setShowAll] = React.useState(false);

  React.useEffect(() => {
    setCurrentPage(1);
    setShowAll(false);
  }, [filters]);

  // Dropdown options facet each other but deliberately ignore the search
  // text: if typing narrowed them, a half-typed word could invalidate and
  // silently wipe a selected zone. Search stays an overlay on the results.
  const { zone, city, vehicleType } = filters;
  const options = React.useMemo(
    () => facetOptions(allVendors, { zone, city, vehicleType, searchText: '' }),
    [allVendors, zone, city, vehicleType]
  );

  const [resetNotice, setResetNotice] = React.useState('');

  // A selection its own option list no longer offers is impossible given the
  // other dropdowns (e.g. the chosen city vanishes after switching zones), so
  // it resets to All. Announced for screen readers: the value changes while
  // focus is on a different control.
  React.useEffect(() => {
    const next = { ...filters };
    const cleared: string[] = [];
    if (filters.zone !== 'All' && options.zones.indexOf(filters.zone) === -1) {
      next.zone = 'All';
      cleared.push('Zone');
    }
    if (filters.city !== 'All' && options.cities.indexOf(filters.city) === -1) {
      next.city = 'All';
      cleared.push('City');
    }
    if (filters.vehicleType !== 'All' && options.vehicleTypes.indexOf(filters.vehicleType) === -1) {
      next.vehicleType = 'All';
      cleared.push('Vehicle');
    }
    if (cleared.length > 0) {
      setResetNotice(
        `${cleared.join(' and ')} filter${cleared.length > 1 ? 's' : ''} reset to All to match your other selections.`
      );
      onFiltersChange(next);
    }
  }, [options, filters, onFiltersChange]);

  const results = React.useMemo(
    () => sortVendors(filterVendors(allVendors, filters)),
    [allVendors, filters]
  );

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const visible = showAll ? results : results.slice(pageStart, pageStart + PAGE_SIZE);
  const needsPagination = results.length > PAGE_SIZE;
  const isFiltered =
    filters.zone !== 'All' ||
    filters.city !== 'All' ||
    filters.vehicleType !== 'All' ||
    filters.searchText.trim() !== '';

  const countLabel = `${results.length} ${results.length === 1 ? 'Vendor' : 'Vendors'}`;

  const clearFilters = (): void => {
    onFiltersChange({ zone: 'All', city: 'All', vehicleType: 'All', searchText: '' });
  };

  const goToPage = (page: number): void => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <div className={styles.gridView}>
      <div className={styles.srOnly} role="status">{resetNotice}</div>
      <div className={styles.filterBar} role="search" aria-label="Vendor filter controls">
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor="occ-zone-filter">
            Zone
          </label>
          <div className={styles.filterChip}>
            <select
              id="occ-zone-filter"
              className={styles.filterSelect}
              value={filters.zone}
              onChange={e => onFiltersChange({ ...filters, zone: e.target.value })}
            >
              <option value="All">All Zones</option>
              {filters.zone !== 'All' && options.zones.indexOf(filters.zone) === -1 && (
                <option value={filters.zone}>{filters.zone}</option>
              )}
              {options.zones.map(z => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor="occ-city-filter">
            City
          </label>
          <div className={styles.filterChip}>
            <select
              id="occ-city-filter"
              className={styles.filterSelect}
              value={filters.city}
              onChange={e => onFiltersChange({ ...filters, city: e.target.value })}
            >
              <option value="All">All Cities</option>
              {filters.city !== 'All' && options.cities.indexOf(filters.city) === -1 && (
                <option value={filters.city}>{filters.city}</option>
              )}
              {options.cities.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor="occ-vehicle-filter">
            Vehicle
          </label>
          <div className={styles.filterChip}>
            <select
              id="occ-vehicle-filter"
              className={styles.filterSelect}
              value={filters.vehicleType}
              onChange={e => onFiltersChange({ ...filters, vehicleType: e.target.value })}
            >
              <option value="All">All Vehicles</option>
              {filters.vehicleType !== 'All' && options.vehicleTypes.indexOf(filters.vehicleType) === -1 && (
                <option value={filters.vehicleType}>{filters.vehicleType}</option>
              )}
              {options.vehicleTypes.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {isFiltered && (
            <button
              className={styles.clearButton}
              onClick={clearFilters}
              type="button"
              aria-label="Clear all filters and search"
            >
              Clear
            </button>
          )}
        </div>

        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon} aria-hidden="true">🔍</span>
          <input
            id="occ-search"
            type="search"
            className={styles.searchInput}
            placeholder="Search Vendors"
            value={filters.searchText}
            onChange={e => onFiltersChange({ ...filters, searchText: e.target.value })}
            aria-label="Search vendors by name, zone, or city"
          />
        </div>

        <div className={styles.countGroup} aria-live="polite" aria-atomic="true">
          <span className={styles.countText}>{countLabel}</span>
          {needsPagination && (
            <>
              <span className={styles.countDivider} aria-hidden="true">|</span>
              <button
                type="button"
                className={styles.showAllButton}
                onClick={() => setShowAll(prev => !prev)}
                aria-label={showAll ? 'Show paginated view' : 'Show all vendors'}
              >
                {showAll ? 'Show Less' : 'Show All'}
              </button>
            </>
          )}
        </div>
      </div>

      {visible.length > 0 ? (
        <>
          <div
            className={styles.cardGrid}
            role="list"
            aria-label={`Outsource vendor cards, ${countLabel}`}
          >
            {visible.map(vendor => (
              <div key={vendor.id} role="listitem">
                <VendorCard vendor={vendor} onClick={onCardClick} />
              </div>
            ))}
          </div>

          {!showAll && totalPages > 1 && (
            <nav className={styles.pagination} aria-label="Page navigation">
              <button
                className={styles.pageBtn}
                onClick={() => goToPage(safePage - 1)}
                disabled={safePage <= 1}
                aria-label="Previous page"
                type="button"
              >
                ‹
              </button>

              <span
                className={styles.pageIndicator}
                aria-current="page"
                aria-label={`Page ${safePage} of ${totalPages}`}
              >
                {safePage} / {totalPages}
              </span>

              <button
                className={styles.pageBtn}
                onClick={() => goToPage(safePage + 1)}
                disabled={safePage >= totalPages}
                aria-label="Next page"
                type="button"
              >
                ›
              </button>
            </nav>
          )}
        </>
      ) : (
        <div className={styles.emptyState} role="status">
          <p>No vendors match your search or filters.</p>
          <button className={styles.clearButton} onClick={clearFilters} type="button">
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
};

export default VendorGridView;
