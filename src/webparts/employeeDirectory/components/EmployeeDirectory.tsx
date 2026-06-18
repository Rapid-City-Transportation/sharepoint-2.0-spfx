import * as React from 'react';
import styles from './EmployeeDirectory.module.scss';
import { IEmployeeDirectoryProps } from './IEmployeeDirectoryProps';
import { IEmployee } from './types';
import EmployeeGridView from './EmployeeGridView';
import EmployeeDetailView from './EmployeeDetailView';
import { Navigation } from '../../rapidCityHomepage/components/Navigation/Navigation';
import {
  defaultTheme,
  getThemeCssVariables,
} from '../../rapidCityHomepage/theme/ThemeTokens';
import { Footer } from '../../rapidCityHomepage/components/Footer/Footer';
import { useEmployees } from '../hooks/useEmployees';

type ViewState = 'grid' | 'detail';

const EmployeeDirectory: React.FC<IEmployeeDirectoryProps> = ({ title }) => {
  const [view, setView]                       = React.useState<ViewState>('grid');
  const [selectedEmployee, setSelectedEmployee] = React.useState<IEmployee | null>(null);
  const [searchQuery, setSearchQuery]         = React.useState('');

  const themeVars = React.useMemo(
    () => getThemeCssVariables(defaultTheme) as React.CSSProperties,
    []
  );

  const {
    employees,
    employeeDetail,
    gridLoading,
    detailLoading,
    error,
    loadEmployeeDetail,
    clearDetail,
  } = useEmployees();

  React.useEffect(() => {
    if (employeeDetail && view === 'detail') {
      // The detail fetch hits a single item and so doesn't know about the
      // wider TeamLead cross-reference computed at grid load. Preserve the
      // flag from the row the user clicked so the badge sticks on the
      // detail hero.
      setSelectedEmployee(prev => ({
        ...employeeDetail,
        isTeamLead: prev?.isTeamLead ?? employeeDetail.isTeamLead,
      }));
    }
  }, [employeeDetail, view]);

  const handleCardClick = React.useCallback((employee: IEmployee): void => {
    setSelectedEmployee(employee);
    setView('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const numericId = parseInt(employee.id, 10);
    if (!isNaN(numericId)) {
      loadEmployeeDetail(numericId).catch(() => {});
    }
  }, [loadEmployeeDetail]);

  const handleBack = React.useCallback((): void => {
    setView('grid');
    setSelectedEmployee(null);
    clearDetail();
  }, [clearDetail]);

  // The shared Navigation component dispatches search results through
  // onCustomerSelect / onSearch. We don't have customer-style search here,
  // so we just use the search box to filter the grid by passing the query in.
  const handleNavSearch = React.useCallback((query: string) => {
    setSearchQuery(query);
    setView('grid');
    setSelectedEmployee(null);
    clearDetail();
  }, [clearDetail]);

  const feedbackPageId = view === 'detail' && selectedEmployee
    ? `${selectedEmployee.name} Employee Profile`
    : 'Employee Directory Page';

  return (
    <div className={styles.webPartContainer} style={themeVars}>
      <Navigation
        onSearch={handleNavSearch}
        activePage="employeeDirectory"
      />

      {view === 'grid' && (
        <div className={styles.pageHeadingRow}>
          <h1 className={styles.pageHeading}>{title}</h1>
        </div>
      )}

      {view === 'grid' && gridLoading && (
        <div className={styles.emptyState} role="status" aria-live="polite">
          <p>Loading employees…</p>
        </div>
      )}

      {view === 'grid' && error && !gridLoading && (
        <div className={styles.emptyState} role="alert">
          <p>{error}</p>
        </div>
      )}

      {view === 'grid' && !gridLoading && !error && (
        <EmployeeGridView
          allEmployees={employees}
          onCardClick={handleCardClick}
          searchQuery={searchQuery}
        />
      )}

      {view === 'detail' && detailLoading && (
        <div className={styles.emptyState} role="status" aria-live="polite">
          <p>Loading employee details…</p>
        </div>
      )}

      {view === 'detail' && error && !detailLoading && (
        <div className={styles.emptyState} role="alert">
          <p>{error}</p>
          <button
            className={styles.clearButton}
            onClick={handleBack}
            type="button"
          >
            Back to Directory
          </button>
        </div>
      )}

      {view === 'detail' && selectedEmployee && !detailLoading && (
        <EmployeeDetailView
          employee={selectedEmployee}
          onBack={handleBack}
        />
      )}

      <Footer pageIdentifier={feedbackPageId} />
    </div>
  );
};

export default EmployeeDirectory;
