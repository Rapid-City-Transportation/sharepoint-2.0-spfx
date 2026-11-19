import * as React from 'react';
import { fetchVendorDocuments, IVendorDocuments } from '../services/vendorDocumentsService';

export type VendorDocsState = 'loading' | 'ready' | 'noFolder' | 'noAccess' | 'error';

function httpStatus(err: unknown): number | undefined {
  return (err as { status?: number } | null)?.status;
}

/** Loads a vendor's compliance documents for the manager section. No ERP id
 *  (a standalone coverage row) reads as "no folder" without a request. */
export function useVendorDocuments(erpDriverId: string | undefined): {
  state: VendorDocsState;
  docs?: IVendorDocuments;
} {
  const [state, setState] = React.useState<VendorDocsState>(erpDriverId ? 'loading' : 'noFolder');
  const [docs, setDocs] = React.useState<IVendorDocuments | undefined>(undefined);

  React.useEffect(() => {
    setDocs(undefined);
    if (!erpDriverId) {
      setState('noFolder');
      return;
    }
    setState('loading');
    let cancelled = false;
    fetchVendorDocuments(erpDriverId)
      .then(result => {
        if (cancelled) return;
        setDocs(result);
        setState(result ? 'ready' : 'noFolder');
      })
      .catch(err => {
        if (cancelled) return;
        const status = httpStatus(err);
        // 404 covers a library the viewer cannot see at all: SharePoint hides
        // rather than refuses when the site itself is off limits.
        setState(status === 401 || status === 403 || status === 404 ? 'noAccess' : 'error');
      });
    return () => {
      cancelled = true;
    };
  }, [erpDriverId]);

  return { state, docs };
}
