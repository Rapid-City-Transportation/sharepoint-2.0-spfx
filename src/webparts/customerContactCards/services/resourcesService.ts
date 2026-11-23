import { getSP } from './spConfig';
import { SR, SR_SELECT_FIELDS } from './fieldNames';
import { getListFields, resolveField } from '../../customerExperienceHub/services/listFields';

export type ResourceCategory =
  | 'Airport'
  | 'Train Station'
  | 'Travel Time Guidelines'
  | 'Hospital'
  | 'School'
  | 'Insurance Company'
  | 'Auto Alert'
  | 'Accommodations'
  | 'FAQ';

export interface ISiteResourceAttachment {
  name: string;
  url: string;
}

export interface ISiteResource {
  id: number;
  title: string;
  category: ResourceCategory;
  group: string;
  content: string;
  /** Downloadable files on the item (e.g. Flight & Hotel .docx templates). */
  attachments: ISiteResourceAttachment[];
  /** Kept in the list for the record but retired from use: hidden from
   *  agents, shown to managers under a separate heading. */
  archived: boolean;
}

type RawItem = Record<string, unknown>;

// The Archived column is optional: a list without it simply has nothing
// archived. Resolved once per page load.
const ARCHIVED_CANDIDATES = ['Archived', 'IsArchived'];
let _archivedField: Promise<string | undefined> | undefined;

function archivedField(): Promise<string | undefined> {
  if (!_archivedField) {
    _archivedField = getListFields(getSP(), SR.LIST_TITLE)
      .then(fields => resolveField(fields, ...ARCHIVED_CANDIDATES))
      .catch(() => {
        _archivedField = undefined;
        return undefined;
      });
  }
  return _archivedField;
}

/**
 * Fetch site resources from the SiteResources SharePoint list.
 * @param categories Categories to include in the query.
 * @returns Resources matching any of the given categories.
 */
export async function fetchResourcesByCategory(
  categories: ResourceCategory[]
): Promise<ISiteResource[]> {
  if (categories.length === 0) return [];

  const sp = getSP();
  const archived = await archivedField();
  const filter = categories
    .map(c => `${SR.Category} eq '${escapeODataString(c)}'`)
    .join(' or ');
  const selects: string[] = [
    ...SR_SELECT_FIELDS,
    'AttachmentFiles/FileName',
    'AttachmentFiles/ServerRelativeUrl',
  ];
  if (archived) selects.push(archived);

  const items: RawItem[] = await sp.web.lists
    .getByTitle(SR.LIST_TITLE)
    .items
    .select(...selects)
    .expand('AttachmentFiles')
    .filter(filter)
    .top(500)();

  return items.map(raw => mapRawToResource(raw, archived)).filter(isValidResource);
}

function mapRawToResource(raw: RawItem, archivedKey: string | undefined): ISiteResource | null {
  const id = Number(raw[SR.Id]);
  const title = typeof raw[SR.Title] === 'string' ? (raw[SR.Title] as string) : '';
  const categoryRaw = typeof raw[SR.Category] === 'string' ? (raw[SR.Category] as string) : '';
  const content = typeof raw[SR.Content] === 'string' ? (raw[SR.Content] as string) : '';
  const group = typeof raw[SR.Group] === 'string' ? (raw[SR.Group] as string) : '';

  if (!Number.isFinite(id) || !title || !isKnownCategory(categoryRaw)) {
    return null;
  }

  return {
    id,
    title,
    category: categoryRaw,
    group,
    content,
    attachments: mapAttachments(raw),
    archived: !!archivedKey && raw[archivedKey] === true,
  };
}

interface RawAttachment {
  FileName?: string;
  ServerRelativeUrl?: string;
}

/** Read the item's attachments (downloadable files such as .docx templates). */
function mapAttachments(raw: RawItem): ISiteResourceAttachment[] {
  const att = raw['AttachmentFiles'];
  const list = Array.isArray(att)
    ? att
    : (att && (att as { results?: unknown[] }).results) || [];
  return (list as RawAttachment[])
    .filter(a => a && !!a.ServerRelativeUrl)
    .map(a => ({ name: a.FileName || 'template', url: a.ServerRelativeUrl as string }));
}

function isValidResource(x: ISiteResource | null): x is ISiteResource {
  return x !== null;
}

function isKnownCategory(value: string): value is ResourceCategory {
  return (
    value === 'Airport' ||
    value === 'Train Station' ||
    value === 'Travel Time Guidelines' ||
    value === 'Hospital' ||
    value === 'School' ||
    value === 'Insurance Company' ||
    value === 'Auto Alert' ||
    value === 'Accommodations' ||
    value === 'FAQ'
  );
}

/**
 * Escape single quotes for OData string literals to prevent injection.
 * @param value Raw string to embed inside an OData filter literal.
 * @returns The value with single quotes doubled per OData spec.
 */
function escapeODataString(value: string): string {
  return value.replace(/'/g, "''");
}
