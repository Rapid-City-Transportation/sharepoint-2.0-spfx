import '@pnp/sp/security/list';
import { PermissionKind } from '@pnp/sp/security';
import { getSP } from '../../healthSafety/services/spConfig';

/**
 * Read-and-file side of the Incident Reports list. The submit side lives in
 * healthSafety/services/incidentService.ts, which also documents the column
 * spec. The workflow is deliberately small: every report goes to HR (a
 * Power Automate flow emails HR on each new row), HR reviews it here,
 * exports a PDF when WSIB or the safety committee needs a copy, and marks it
 * filed. Filing is just the HRReviewed column; nothing is emailed onward.
 */
const LIST_TITLE = 'Incident Reports';

const FIELDS: readonly string[] = [
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
  'Created',
  'Modified',
  'Author/Title',
  'Author/EMail',
  'Editor/Title',
];

const EXPAND_FIELDS: readonly string[] = ['Author', 'Editor'];

export interface IIncidentReport {
  id: number;
  incidentType: string;
  /** Free text from the form; the reporter can type anything here. */
  reporterName: string;
  reporterEmail?: string;
  /** The signed-in account that created the row: the identity HR can trust. */
  authorName?: string;
  authorEmail?: string;
  /** Who last saved the row. */
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
  /** HR has reviewed and filed the report (the list's HRReviewed column). */
  filed: boolean;
}

export interface IViewer {
  /** False until proven; see fetchViewer. */
  canReview: boolean;
  /** SharePoint user id, used to scope a submitter's reads to their own rows. */
  userId?: number;
  /** Display name, printed on exported PDFs as the person who exported them. */
  userName?: string;
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
 * type is checked too: a cleared flag must not drop the confidential marking
 * from the review card or the exported PDF.
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
    filed: row.HRReviewed === true,
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
  let items = getSP()
    .web.lists.getByTitle(LIST_TITLE)
    .items.select(...FIELDS)
    .expand(...EXPAND_FIELDS);
  if (!viewer.canReview && typeof viewer.userId === 'number') {
    items = items.filter(`AuthorId eq ${viewer.userId}`);
  }
  const rows: RawRow[] = await items.orderBy('Created', false).top(500)();
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
  let userName: string | undefined;
  try {
    const me = await sp.web.currentUser.select('Id', 'Title')();
    userId = typeof me.Id === 'number' ? me.Id : undefined;
    userName = me.Title || undefined;
  } catch {
    userId = undefined;
  }

  try {
    const list = sp.web.lists.getByTitle(LIST_TITLE);
    const [overrides, edits] = await Promise.all([
      list.currentUserHasPermissions(PermissionKind.CancelCheckout),
      list.currentUserHasPermissions(PermissionKind.EditListItems),
    ]);
    return { canReview: overrides && edits, userId, userName };
  } catch {
    return { canReview: false, userId, userName };
  }
}

/**
 * Marks a report filed, or reopens it. Filing also clears ReleasedToHS: the
 * list predates the simpler workflow, and a leftover "release to Health &
 * Safety" flow would fire on any row carrying HRReviewed and ReleasedToHS
 * together. Lists where that column has been deleted get the plain update.
 */
export async function setFiled(report: IIncidentReport, filed: boolean): Promise<void> {
  const item = getSP().web.lists.getByTitle(LIST_TITLE).items.getById(report.id);
  if (!filed) {
    await item.update({ HRReviewed: false });
    return;
  }
  try {
    await item.update({ HRReviewed: true, ReleasedToHS: false });
  } catch {
    await item.update({ HRReviewed: true });
  }
}
