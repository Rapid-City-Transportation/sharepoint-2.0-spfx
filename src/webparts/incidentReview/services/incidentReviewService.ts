import '@pnp/sp/security/list';
import { PermissionKind } from '@pnp/sp/security';
import { getSP } from '../../healthSafety/services/spConfig';

/**
 * Read-and-decide side of the Incident Reports list. The submit side lives in
 * healthSafety/services/incidentService.ts, which also documents the column
 * spec. HR's review is two verbs here instead of the raw HRReviewed and
 * ReleasedToHS checkboxes; the Power Automate flows on the list still send the
 * emails, so this module only ever sets those two columns and never touches
 * Confidential (stamped at submission) or HSNotified (owned by the flow).
 */
const LIST_TITLE = 'Incident Reports';

const BASE_FIELDS: readonly string[] = [
  'Id',
  'Title',
  'ReporterName',
  'ReporterEmail',
  'IncidentDate',
  'Location',
  'IncidentType',
  'Severity',
  'Description',
  'Witnesses',
  'ImmediateAction',
  'Confidential',
  'HRReviewed',
  'ReleasedToHS',
  'Created',
  'Modified',
  'Author/Title',
  'Author/EMail',
  'Editor/Title',
];

const EXPAND_FIELDS: readonly string[] = ['Author', 'Editor'];

/** The release flow's sent-marker. Selected separately because the page must
 *  keep working on a list where that optional column was never added. */
const HS_NOTIFIED = 'HSNotified';

export interface IIncidentReport {
  id: number;
  incidentType: string;
  /** Free text from the form; the reporter can type anything here. */
  reporterName: string;
  reporterEmail?: string;
  /** The signed-in account that created the row: the identity HR can trust. */
  authorName?: string;
  authorEmail?: string;
  /** Who last saved the row, so a review HR did not make is visible. */
  lastChangedBy?: string;
  modified?: string;
  /** ISO datetime; the submit side anchors it at noon so it never shifts a day. */
  incidentDate?: string;
  /** ISO datetime the report was submitted. */
  submitted?: string;
  location?: string;
  severity?: string;
  description: string;
  witnesses?: string;
  immediateAction?: string;
  confidential: boolean;
  hrReviewed: boolean;
  releasedToHS: boolean;
  /** Undefined when the list has no HSNotified column. */
  hsNotified?: boolean;
}

export interface IViewer {
  /** False until proven; see fetchViewer. */
  canReview: boolean;
  /** SharePoint user id, used to scope a submitter's reads to their own rows. */
  userId?: number;
}

export type ReviewStatus = 'awaiting' | 'released' | 'hrOnly';

/** HR's two possible decisions on a report. */
export type ReviewDecision = 'release' | 'hrOnly';

/**
 * Where a report stands. A confidential report can never count as released,
 * even if someone ticks ReleasedToHS on the raw list: the release flow refuses
 * to forward it, so calling it released would be a lie.
 */
export function statusOf(report: IIncidentReport): ReviewStatus {
  if (!report.hrReviewed) return 'awaiting';
  return report.releasedToHS && !report.confidential ? 'released' : 'hrOnly';
}

type RawRow = Record<string, unknown>;

/**
 * Multi-line columns come back wrapped in markup only when a list owner has
 * switched them to rich text, and SharePoint always opens that markup with a
 * block tag. Anything else is the reporter's own words and must survive
 * untouched: "John <john@rct.com> saw it" is a sentence, not HTML.
 */
function toPlainText(value: unknown): string {
  if (typeof value !== 'string') return '';
  const text = value.trim();
  if (!/^<(div|p|span|br)[\s>/]/i.test(text)) return text;
  const doc = new DOMParser().parseFromString(text, 'text/html');
  return (doc.body.textContent || '').trim();
}

function optionalText(value: unknown): string | undefined {
  const text = toPlainText(value);
  return text.length > 0 ? text : undefined;
}

function personField(value: unknown, key: 'Title' | 'EMail'): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  return optionalText((value as Record<string, unknown>)[key]);
}

/**
 * Harassment reports are confidential by definition. The Confidential column
 * is only a copy of that fact, and a submitter can edit their own row, so the
 * type is checked too: a cleared flag must never make such a report
 * releasable from this page.
 */
function isConfidentialRow(row: RawRow, incidentType: string): boolean {
  return row.Confidential === true || incidentType.toLowerCase().indexOf('harassment') !== -1;
}

function mapRow(row: RawRow): IIncidentReport {
  const incidentType =
    toPlainText(row.IncidentType) || toPlainText(row.Title) || 'Incident report';
  return {
    id: Number(row.Id),
    incidentType,
    reporterName: toPlainText(row.ReporterName) || 'Unknown reporter',
    reporterEmail: optionalText(row.ReporterEmail),
    authorName: personField(row.Author, 'Title'),
    authorEmail: personField(row.Author, 'EMail'),
    lastChangedBy: personField(row.Editor, 'Title'),
    modified: optionalText(row.Modified),
    incidentDate: optionalText(row.IncidentDate),
    submitted: optionalText(row.Created),
    location: optionalText(row.Location),
    severity: optionalText(row.Severity),
    description: toPlainText(row.Description),
    witnesses: optionalText(row.Witnesses),
    immediateAction: optionalText(row.ImmediateAction),
    confidential: isConfidentialRow(row, incidentType),
    hrReviewed: row.HRReviewed === true,
    releasedToHS: row.ReleasedToHS === true,
    hsNotified: typeof row[HS_NOTIFIED] === 'boolean' ? (row[HS_NOTIFIED] as boolean) : undefined,
  };
}

/**
 * Reports the viewer may see, newest first. For reviewers that is the whole
 * queue. For everyone else the list's item-level permissions already return
 * only their own rows, and the query is scoped to their user id as well, so a
 * list whose lockdown was switched off can never leak other people's reports
 * through this page.
 */
export async function fetchIncidentReports(viewer: IViewer): Promise<IIncidentReport[]> {
  const list = getSP().web.lists.getByTitle(LIST_TITLE);
  const scope =
    !viewer.canReview && typeof viewer.userId === 'number'
      ? `AuthorId eq ${viewer.userId}`
      : undefined;

  const query = (fields: readonly string[]): Promise<RawRow[]> => {
    let items = list.items.select(...fields).expand(...EXPAND_FIELDS);
    if (scope) items = items.filter(scope);
    return items.orderBy('Created', false).top(500)();
  };

  let rows: RawRow[];
  try {
    rows = await query([...BASE_FIELDS, HS_NOTIFIED]);
  } catch {
    rows = await query(BASE_FIELDS);
  }
  return rows.map(mapRow);
}

/**
 * Who is looking. A reviewer holds Override List Behaviors on the list (PnP
 * still calls it CancelCheckout): that is the SharePoint permission that
 * exempts a user from "read and edit only your own items", so it is exactly
 * "can see and act on other people's reports". It ships in Full Control and
 * Design only, which is why HR is granted Full Control on the list. Asking the
 * list itself avoids keeping a second roster of who HR is. Fails safe: any
 * error leaves the viewer a submitter.
 */
export async function fetchViewer(): Promise<IViewer> {
  const sp = getSP();
  let userId: number | undefined;
  try {
    const me = await sp.web.currentUser.select('Id')();
    userId = typeof me.Id === 'number' ? me.Id : undefined;
  } catch {
    userId = undefined;
  }

  try {
    const list = sp.web.lists.getByTitle(LIST_TITLE);
    const [overrides, edits] = await Promise.all([
      list.currentUserHasPermissions(PermissionKind.CancelCheckout),
      list.currentUserHasPermissions(PermissionKind.EditListItems),
    ]);
    return { canReview: overrides && edits, userId };
  } catch {
    return { canReview: false, userId };
  }
}

/**
 * Saves HR's decision. Releasing sets both review columns, which is what the
 * release flow watches for. Keeping a report with HR also clears ReleasedToHS:
 * a row where that box was already ticked would otherwise satisfy the flow the
 * moment HRReviewed flips, and email the committee the report HR just chose to
 * keep. Confidential reports are refused here as well as by the flow.
 */
export async function applyReviewDecision(
  report: IIncidentReport,
  decision: ReviewDecision
): Promise<void> {
  if (decision === 'release' && report.confidential) {
    throw new Error('Confidential reports are never released to Health & Safety.');
  }
  await getSP()
    .web.lists.getByTitle(LIST_TITLE)
    .items.getById(report.id)
    .update({ HRReviewed: true, ReleasedToHS: decision === 'release' });
}
