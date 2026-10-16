import { getSP } from '../../customerContactCards/services/spConfig';

/**
 * SharePoint list name where feedback is stored.
 * Create this list on the site with columns:
 *   Title          (Single line: auto-mapped to PageIdentifier)
 *   Description    (Multiple lines of text, plain text)
 *   Urgency        (Choice: Critical, High, Medium, Low)
 *   SourcePage     (Single line of text, ~500 chars: full URL of the
 *                   page the feedback was submitted from, used to look
 *                   up the page's content owner for routing)
 */
const FEEDBACK_LIST_TITLE = 'SiteFeedback';

// Title and SourcePage are single lines of text, which SharePoint caps at
// 255 characters and rejects outright when exceeded.
const SINGLE_LINE_MAX = 255;

export interface IFeedbackPayload {
  pageIdentifier: string;
  description: string;
  urgency: string;
  sourcePage: string;
}

/**
 * The page URL to record. A page opened from a Teams or Outlook link carries
 * tracking tokens that run past the column limit; the bare page URL still
 * identifies the page, which is all the routing needs.
 */
export function feedbackSourcePage(loc: Location = window.location): string {
  if (loc.href.length <= SINGLE_LINE_MAX) return loc.href;
  const bare = `${loc.origin}${loc.pathname}`;
  return bare.length <= SINGLE_LINE_MAX ? bare : bare.slice(0, SINGLE_LINE_MAX);
}

/** True when SharePoint refused the write for lack of permission. */
export function isPermissionError(err: unknown): boolean {
  const status = (err as { status?: number } | null)?.status;
  return status === 401 || status === 403;
}

/**
 * Submits feedback to the SiteFeedback SharePoint list.
 * Uses the PnPjs SPFI instance already initialized by the web part.
 */
export async function submitFeedback(payload: IFeedbackPayload): Promise<void> {
  const sp = getSP();
  await sp.web.lists.getByTitle(FEEDBACK_LIST_TITLE).items.add({
    Title: payload.pageIdentifier.slice(0, SINGLE_LINE_MAX),
    Description: payload.description,
    Urgency: payload.urgency,
    SourcePage: payload.sourcePage.slice(0, SINGLE_LINE_MAX),
  });
}
