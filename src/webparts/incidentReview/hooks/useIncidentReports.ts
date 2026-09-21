import * as React from 'react';
import {
  applyReviewDecision,
  fetchIncidentReports,
  fetchViewer,
  IIncidentReport,
  ReviewDecision,
} from '../services/incidentReviewService';

interface IUseIncidentReports {
  reports: IIncidentReport[];
  /** False until proven: a visitor is treated as a submitter, never as HR,
   *  while the permission check is in flight or if it fails. */
  canReview: boolean;
  loading: boolean;
  error: boolean;
  /** Saves a decision, then patches local state. Rejects on failure so the
   *  card that asked can show the problem in place. */
  decide: (report: IIncidentReport, decision: ReviewDecision) => Promise<void>;
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
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);
  // Counts saved decisions. A fetch that started before a save finished may
  // carry pre-save rows; applying it would resurrect a decided report with
  // live buttons, so such a fetch is thrown away and run again.
  const savedDecisions = React.useRef(0);

  React.useEffect(() => {
    let cancelled = false;
    const startedAt = savedDecisions.current;
    setLoading(true);
    setError(false);
    fetchViewer()
      .then(viewer => fetchIncidentReports(viewer).then(items => ({ viewer, items })))
      .then(({ viewer, items }) => {
        if (cancelled) return;
        if (savedDecisions.current !== startedAt) {
          setReloadKey(k => k + 1);
          return;
        }
        setReports(items);
        setCanReview(viewer.canReview);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [reloadKey]);

  const decide = React.useCallback(
    async (report: IIncidentReport, decision: ReviewDecision): Promise<void> => {
      await applyReviewDecision(report, decision);
      savedDecisions.current += 1;
      setReports(prev =>
        prev.map(r =>
          r.id === report.id
            ? { ...r, hrReviewed: true, releasedToHS: decision === 'release' }
            : r
        )
      );
    },
    []
  );

  const reload = React.useCallback((): void => {
    setReloadKey(k => k + 1);
  }, []);

  return { reports, canReview, loading, error, decide, reload };
}
