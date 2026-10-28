import { getSP } from './spConfig';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';

// The Vendor categories feed the Outsource Contact Cards drawer; the list's
// Category choice column must carry exactly this text or the row is dropped.
export type EmailTemplateCategory =
  | 'Booking'
  | 'Dispatch Alerts'
  | 'Reminder Call'
  | 'Vendor Booking'
  | 'Vendor Changes'
  | 'Vendor Cancellation';

export interface IEmailTemplate {
  /** SharePoint list item ID, used as a stable React key. */
  id: number;
  /** Display name (the Title column). */
  name: string;
  category: EmailTemplateCategory;
  /** Plain-text email body, used as the `mailto:` fallback if clipboard fails. */
  body: string;
  /** Raw HTML body from SharePoint, copied to the clipboard for rich paste. */
  bodyHtml: string;
  /**
   * Comma-separated list of email addresses to auto-CC. Empty string if no CC
   * is configured on this template.
   */
  cc: string;
  /** Prefilled `mailto:` subject; empty when the row (or the list) has none. */
  subject: string;
}

const LIST_TITLE = 'EmailTemplates';
const VALID_CATEGORIES: EmailTemplateCategory[] = [
  'Booking',
  'Dispatch Alerts',
  'Reminder Call',
  'Vendor Booking',
  'Vendor Changes',
  'Vendor Cancellation',
];

interface IRawItem {
  Id: number;
  Title: string;
  Body: string;
  Category: string;
  IsActive: boolean;
  CcRecipients: string | null;
  Subject?: string | null;
}

const SUBJECT_FIELD = 'Subject';

/**
 * Fetches every active email template from the SharePoint list.
 * Filters out inactive rows server-side to keep the payload lean.
 */
export async function fetchEmailTemplates(): Promise<IEmailTemplate[]> {
  const list = getSP().web.lists.getByTitle(LIST_TITLE);

  // Subject was added for the vendor templates after the list went live, and
  // selecting a column the list lacks fails the whole query.
  const hasSubject = await list.fields
    .filter(`InternalName eq '${SUBJECT_FIELD}'`)
    .select('InternalName')()
    .then(fields => fields.length > 0)
    .catch(() => false);

  const selects = ['Id', 'Title', 'Body', 'Category', 'IsActive', 'CcRecipients'];
  if (hasSubject) selects.push(SUBJECT_FIELD);

  const items: IRawItem[] = await list.items
    .select(...selects)
    .filter('IsActive eq 1')
    .top(500)();

  return items
    .map(mapRawToTemplate)
    .filter((t): t is IEmailTemplate => t !== null);
}

function mapRawToTemplate(raw: IRawItem): IEmailTemplate | null {
  if (!raw.Title || !raw.Category || !isValidCategory(raw.Category)) return null;
  return {
    id: raw.Id,
    name: raw.Title,
    category: raw.Category,
    body: htmlToPlainText(raw.Body || ''),
    bodyHtml: raw.Body || '',
    cc: normalizeCcList(raw.CcRecipients),
    subject: (raw.Subject || '').trim(),
  };
}

function isValidCategory(value: string): value is EmailTemplateCategory {
  return (VALID_CATEGORIES as string[]).indexOf(value) !== -1;
}

/**
 * Normalize whatever Liana types in the `CcRecipients` column into a
 * comma-separated list suitable for a `mailto:` URL. Accepts comma OR
 * semicolon separation, trims whitespace around each entry, and drops
 * blanks.
 */
function normalizeCcList(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .split(/[,;]/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .join(',');
}

/**
 * Converts SharePoint's rich-text HTML body into plain text suitable for a
 * `mailto:` URL. Preserves paragraph and line breaks but discards inline
 * styles, font tags, and SharePoint's `ExternalClass*` wrapper divs.
 */
function htmlToPlainText(html: string): string {
  if (!html) return '';

  const withBreaks = html
    .replace(/<\/(p|div|li|h[1-6]|tr|blockquote)\s*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n');

  const stripped = withBreaks.replace(/<[^>]+>/g, '');

  const decoder = document.createElement('textarea');
  decoder.innerHTML = stripped;
  const decoded = decoder.value;

  return decoded
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
