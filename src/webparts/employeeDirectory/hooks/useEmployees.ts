import * as React from 'react';
import { IEmployee } from '../components/types';
import { fetchActiveEmployees, fetchEmployeeDetail } from '../services/employeesService';

export interface IUseEmployeesResult {
  employees: IEmployee[];
  employeeDetail: IEmployee | null;
  gridLoading: boolean;
  detailLoading: boolean;
  error: string | null;
  loadEmployeeDetail: (id: number) => Promise<void>;
  clearDetail: () => void;
}

/** Mirrors useProtocolBook — fetches active employees on mount and exposes a
 *  loader for the detail view. Cancellation guards prevent state writes after
 *  unmount, which matters when navigating away mid-fetch. */
export function useEmployees(): IUseEmployeesResult {
  const [employees, setEmployees] = React.useState<IEmployee[]>([]);
  const [employeeDetail, setEmployeeDetail] = React.useState<IEmployee | null>(null);
  const [gridLoading, setGridLoading] = React.useState(true);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const mountedRef = React.useRef(true);
  React.useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    async function loadGrid(): Promise<void> {
      try {
        setGridLoading(true);
        setError(null);
        const items = await fetchActiveEmployees();
        if (!cancelled && mountedRef.current) {
          setEmployees(items);
        }
      } catch (err) {
        if (!cancelled && mountedRef.current) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load the employee directory. Please try again.'
          );
        }
      } finally {
        if (!cancelled && mountedRef.current) {
          setGridLoading(false);
        }
      }
    }

    loadGrid().catch(() => {});

    return () => { cancelled = true; };
  }, []);

  const loadEmployeeDetail = React.useCallback(async (id: number): Promise<void> => {
    try {
      setDetailLoading(true);
      setError(null);
      const item = await fetchEmployeeDetail(id);
      if (mountedRef.current) {
        setEmployeeDetail(item);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load employee details. Please try again.'
        );
      }
    } finally {
      if (mountedRef.current) {
        setDetailLoading(false);
      }
    }
  }, []);

  const clearDetail = React.useCallback(() => {
    setEmployeeDetail(null);
    setError(null);
  }, []);

  return {
    employees,
    employeeDetail,
    gridLoading,
    detailLoading,
    error,
    loadEmployeeDetail,
    clearDetail,
  };
}
