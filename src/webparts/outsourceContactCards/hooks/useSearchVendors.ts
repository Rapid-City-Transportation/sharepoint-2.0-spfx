import * as React from 'react';
import { IVendor } from '../models/types';
import { fetchVendors } from '../services/vendorService';
import { sortVendors, vendorMatchesQuery } from '../services/vendorSearch';

const MAX_RESULTS = 8;

export interface IUseSearchVendorsResult {
  results: IVendor[];
  loading: boolean;
}

/**
 * Typeahead for the nav search, mirroring useSearchCustomers. Pulls the vendor
 * list on the first query (the service caches it) and filters client-side.
 */
export function useSearchVendors(query: string): IUseSearchVendorsResult {
  const [vendors, setVendors] = React.useState<IVendor[] | null>(null);
  const [loading, setLoading] = React.useState(false);

  const wanted = query.trim().length > 0;

  React.useEffect(() => {
    if (!wanted || vendors !== null) return;
    let cancelled = false;
    setLoading(true);
    fetchVendors()
      .then(items => {
        if (!cancelled) setVendors(items);
      })
      .catch(() => {
        if (!cancelled) setVendors([]);
      })
      .then(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [wanted, vendors]);

  const results = React.useMemo<IVendor[]>(() => {
    if (!wanted || !vendors) return [];
    const q = query.trim();
    return sortVendors(vendors.filter(v => vendorMatchesQuery(v, q))).slice(0, MAX_RESULTS);
  }, [wanted, query, vendors]);

  return { results, loading };
}
