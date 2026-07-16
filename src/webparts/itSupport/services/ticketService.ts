import { getSP } from './spConfig';

/**
 * SharePoint list that receives IT tickets. Create it on the compass site with:
 *   Title        (Single line: the ticket summary)
 *   Description  (Multiple lines of text, plain)
 *   Priority     (Choice: Low, Medium, High)
 *   Status       (Choice: New, In Progress, Resolved; default New)
 * The submitter is captured automatically in the built-in Created By column, so
 * the Jira flow reads the reporter from there (no custom email column needed).
 * Optionally add a JiraKey (Single line) column for the flow to write the issue
 * key back to.
 */
const TICKETS_LIST_TITLE = 'IT Tickets';

export interface ITicketPayload {
  summary: string;
  description: string;
  priority: string;
}

/** Creates a new IT ticket item. Delegated, so the list's Created By captures
 *  the requester. Throws on failure so the form can surface an error. */
export async function submitTicket(payload: ITicketPayload): Promise<void> {
  const sp = getSP();
  await sp.web.lists.getByTitle(TICKETS_LIST_TITLE).items.add({
    Title: payload.summary,
    Description: payload.description,
    Priority: payload.priority,
    Status: 'New',
  });
}
