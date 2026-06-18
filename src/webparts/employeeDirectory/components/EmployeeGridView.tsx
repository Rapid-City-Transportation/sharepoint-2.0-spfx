import * as React from 'react';
import styles from './EmployeeDirectory.module.scss';
import { IEmployee, DepartmentFilter } from './types';
import EmployeeCard from './EmployeeCard';

// Target items per page. The real page size is rounded to a whole multiple of
// the rendered column count so every page shows complete rows.
const BASE_PAGE_SIZE = 18;

interface IEmployeeGridViewProps {
  allEmployees: IEmployee[];
  onCardClick: (employee: IEmployee) => void;
  searchQuery?: string;
}

const EmployeeGridView: React.FC<IEmployeeGridViewProps> = ({
  allEmployees,
  onCardClick,
  searchQuery,
}) => {
  const [filterDept, setFilterDept]   = React.useState<DepartmentFilter>('All');
  const [searchText, setSearchText]   = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [showAll, setShowAll]         = React.useState(false);
  // Columns the responsive grid currently renders; the page size is derived from
  // this so each page fills complete rows instead of leaving a ragged last row.
  const [columns, setColumns]         = React.useState(6);
  const gridRef                       = React.useRef<HTMLDivElement>(null);

  const departmentOptions = React.useMemo(() => {
    const set = new Set<string>();
    for (const emp of allEmployees) {
      for (const dept of emp.departments) {
        if (dept) set.add(dept);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allEmployees]);

  React.useEffect(() => {
    if (searchQuery !== undefined) {
      setSearchText(searchQuery);
    }
  }, [searchQuery]);

  const filtered = React.useMemo(() => {
    let list = allEmployees;
    if (filterDept !== 'All') {
      list = list.filter(e => e.departments.indexOf(filterDept) !== -1);
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) ||
        (e.level || '').toLowerCase().includes(q) ||
        (e.workingStatus || '').toLowerCase().includes(q) ||
        e.departments.some(d => d.toLowerCase().includes(q)) ||
        (e.shift || '').toLowerCase().includes(q) ||
        (e.manager?.name || '').toLowerCase().includes(q) ||
        (e.rctUser || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [allEmployees, filterDept, searchText]);

  React.useEffect(() => {
    setCurrentPage(1);
    setShowAll(false);
  }, [filterDept, searchText]);

  // Round the target page size to a whole multiple of the column count so every
  // page shows complete rows; the overflow flows onto the next page.
  const itemsPerPage    = Math.max(columns, Math.round(BASE_PAGE_SIZE / columns) * columns);
  const totalPages      = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const safePage        = Math.min(currentPage, totalPages);
  const pageStart       = (safePage - 1) * itemsPerPage;
  const pageItems       = showAll ? filtered : filtered.slice(pageStart, pageStart + itemsPerPage);
  const needsPagination = filtered.length > itemsPerPage;

  // Keep columns in sync with what the grid actually renders (it respects the
  // responsive breakpoints) so itemsPerPage always matches the visible layout.
  const hasItems = pageItems.length > 0;
  React.useEffect(() => {
    const el = gridRef.current;
    if (!el) return undefined;
    const measure = (): void => {
      const count = getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length;
      if (count > 0) setColumns(prev => (prev === count ? prev : count));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasItems]);

  const countLabel = React.useMemo(() => {
    const n = filtered.length;
    return `${n} ${n === 1 ? 'Employee' : 'Employees'}`;
  }, [filtered.length]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    setFilterDept(e.target.value as DepartmentFilter);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchText(e.target.value);
  };

  const clearFilter = (): void => {
    setFilterDept('All');
    setSearchText('');
  };

  const goToPage = (page: number): void => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const isFiltered = filterDept !== 'All' || searchText.trim() !== '';

  return (
    <div className={styles.gridView}>
      <div className={styles.filterBar} role="search" aria-label="Employee filter controls">

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor="ed-dept-filter">
            Department
          </label>
          <div className={styles.filterChip}>
            <select
              id="ed-dept-filter"
              className={styles.filterSelect}
              value={filterDept}
              onChange={handleFilterChange}
              aria-label="Filter employees by department"
            >
              <option value="All">All Departments</option>
              {departmentOptions.map(d => (
                <option key={d} value={d}>{d}</option>
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
            id="ed-search"
            type="search"
            className={styles.searchInput}
            placeholder="Search employees"
            value={searchText}
            onChange={handleSearchChange}
            aria-label="Search employees by name, role, department, shift, or manager"
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
                aria-label={showAll ? 'Show paginated view' : 'Show all employees'}
              >
                {showAll ? 'Show Less' : 'Show All'}
              </button>
            </>
          )}
        </div>
      </div>

      {pageItems.length > 0 ? (
        <div
          ref={gridRef}
          className={styles.cardGrid}
          role="list"
          aria-label={`Employee directory — ${countLabel}`}
        >
          {pageItems.map(employee => (
            <div key={employee.id} role="listitem">
              <EmployeeCard employee={employee} onClick={onCardClick} />
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState} role="status">
          <p>No employees match your search or filter.</p>
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
    </div>
  );
};

export default EmployeeGridView;
