import * as React from 'react';
import styles from './CustomerContactCards.module.scss';
import { ICustomer, CustomerType, CUSTOMER_TYPES } from './types';
import { customerMatchesQuery } from '../services/customerSearch';
import CustomerCard from './CustomerCard';

const PAGE_SIZE = 15;

interface ICardGridViewProps {
  allCustomers: ICustomer[];
  onCardClick: (customer: ICustomer) => void;
  searchQuery?: string;
}

const CardGridView: React.FC<ICardGridViewProps> = ({ allCustomers, onCardClick, searchQuery }) => {
  const [filterType, setFilterType]   = React.useState<CustomerType | 'All'>('All');
  const [searchText, setSearchText]   = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [showAll, setShowAll]         = React.useState(false);

  React.useEffect(() => {
    if (searchQuery !== undefined) {
      setSearchText(searchQuery);
    }
  }, [searchQuery]);

  const filtered = React.useMemo(() => {
    let list = allCustomers;
    if (filterType !== 'All') {
      list = list.filter(c => c.customerType === filterType);
    }
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter(c => customerMatchesQuery(c, q));
    }
    return list;
  }, [allCustomers, filterType, searchText]);

  React.useEffect(() => { setCurrentPage(1); setShowAll(false); }, [filterType, searchText]);

  const totalPages   = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage     = Math.min(currentPage, totalPages);
  const pageStart    = (safePage - 1) * PAGE_SIZE;
  const pageItems    = showAll ? filtered : filtered.slice(pageStart, pageStart + PAGE_SIZE);
  const needsPagination = filtered.length > PAGE_SIZE;

  const countLabel = React.useMemo(() => {
    const n = filtered.length;
    const plural = filterType === 'All'
      ? (n === 1 ? 'Contact' : 'Contacts')
      : `${filterType}${n !== 1 ? 's' : ''}`;
    return `${n} ${plural}`;
  }, [filtered.length, filterType]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    setFilterType(e.target.value as CustomerType | 'All');
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchText(e.target.value);
  };

  const clearFilter = (): void => {
    setFilterType('All');
    setSearchText('');
  };

  const goToPage = (page: number): void => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const isFiltered = filterType !== 'All' || searchText.trim() !== '';

  return (
    <div className={styles.gridView}>
      <div className={styles.filterBar} role="search" aria-label="Customer filter controls">

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor="ccc-type-filter">
            Customer Type
          </label>
          <div className={styles.filterChip}>
            <select
              id="ccc-type-filter"
              className={styles.filterSelect}
              value={filterType}
              onChange={handleFilterChange}
              aria-label="Filter by customer type"
            >
              <option value="All">All Types</option>
              {CUSTOMER_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {isFiltered && (
            <button
              className={styles.clearButton}
              onClick={clearFilter}
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
            id="ccc-search"
            type="search"
            className={styles.searchInput}
            placeholder="Search Customers"
            value={searchText}
            onChange={handleSearchChange}
            aria-label="Search customers by name, type, phone, or email"
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
                aria-label={showAll ? 'Show paginated view' : 'Show all contacts'}
              >
                {showAll ? 'Show Less' : 'Show All'}
              </button>
            </>
          )}
        </div>
      </div>

      {pageItems.length > 0 ? (
        <div
          className={styles.cardGrid}
          role="list"
          aria-label={`Customer contact cards — ${countLabel}`}
        >
          {pageItems.map(customer => (
            <div key={customer.id} role="listitem">
              <CustomerCard customer={customer} onClick={onCardClick} />
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState} role="status">
          <p>No customers match your search or filter.</p>
          <button
            className={styles.clearButton}
            onClick={clearFilter}
            type="button"
          >
            Clear filters
          </button>
        </div>
      )}

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

          <span className={styles.pageIndicator} aria-current="page" aria-label={`Page ${safePage} of ${totalPages}`}>
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
    </div>
  );
};

export default CardGridView;
