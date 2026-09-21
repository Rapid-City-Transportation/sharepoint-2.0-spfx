import * as React from 'react';
import {
  fetchIncidentReports,
  fetchViewer,
  IIncidentReport,
  setFiled,
} from '../services/incidentReviewService';

interface IUseIncidentReports {
  reports: IIncidentReport[];
  /** False until proven: a visitor is treated as a submitter, never as HR,
   *  while the permission check is in flight or if it fails. */
  canReview: boolean;
  /** Printed on exported PDFs as the person who exported them. */
  viewerName?: string;
  loading: boolean;
  error: boolean;
  /** Files or reopens a report, then patches local state. Rejects on failure
   *  so the card that asked can show the problem in place. */
  file: (report: IIncidentReport, filed: boolean) => Promise<void>;
  reload: () => void;
}

/**
 * Loads who is looking first and the incident queue second, so the read is
 * already scoped to the right audience and the page never renders review
 * controls before it knows the viewer is a reviewer.
 */
export function useIncidentReports(): IUseIncidentReports {
  const [reports, setReports] = React.useState<IIncidentReport[]>([]);
  const [canReview, setCanReview] = React.useState(false);
  const [viewerName, setViewerName] = React.useState<string | undefined>(undefined);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);
  // Counts saved changes. A fetch that started before a save finished may
  // carry pre-save rows; applying it would undo the change on screen, so such
  // a fetch is thrown away and run again.
  const savedChanges = React.useRef(0);

  React.useEffect(() => {
    let cancelled = false;
    const startedAt = savedChanges.current;
    setLoading(true);
    setError(false);
    fetchViewer()
      .then(viewer => fetchIncidentReports(viewer).then(items => ({ viewer, items })))
      .then(({ viewer, items }) => {
        if (cancelled) return;
        if (savedChanges.current !== startedAt) {
          setReloadKey(k => k + 1);
          return;
        }
        setReports(items);
        setCanReview(viewer.canReview);
        setViewerName(viewer.userName);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [reloadKey]);

  const file = React.useCallback(
    async (report: IIncidentReport, filed: boolean): Promise<void> => {
      await setFiled(report, filed);
      savedChanges.current += 1;
      const changedAt = new Date().toISOString();
      setReports(prev =>
        prev.map(r =>
          r.id === report.id
            ? { ...r, filed, lastChangedBy: viewerName || r.lastChangedBy, modified: changedAt }
            : r
        )
      );
    },
    [viewerName]
  );

  const reload = React.useCallback((): void => {
    setReloadKey(k => k + 1);
  }, []);

  return { reports, canReview, viewerName, loading, error, file, reload };
}
