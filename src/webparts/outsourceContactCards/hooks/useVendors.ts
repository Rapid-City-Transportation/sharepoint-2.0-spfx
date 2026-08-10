import * as React from 'react';
import { IVendor } from '../models/types';
import { fetchVendors } from '../services/vendorService';

export interface IUseVendorsResult {
  vendors: IVendor[];
  loading: boolean;
  error: string | null;
}

/** Loads the vendor directory on mount. Mirrors useProtocolBook's shape. */
export function useVendors(): IUseVendorsResult {
  const [vendors, setVendors] = React.useState<IVendor[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    fetchVendors()
      .then(items => {
        if (!cancelled) setVendors(items);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || 'Could not load outsource vendors.');
      })
      .then(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return { vendors, loading, error };
}
