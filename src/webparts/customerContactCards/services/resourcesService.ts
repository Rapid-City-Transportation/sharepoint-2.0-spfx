import { getSP } from './spConfig';
import { SR } from './fieldNames';

export type ResourceCategory =
  | 'Airport'
  | 'Train Station'
  | 'Travel Time Guidelines'
  | 'Hospital'
  | 'School'
  | 'Insurance Company'
  | 'Auto Alert'
  | 'FAQ';

export interface ISiteResource {
  id: number;
  title: string;
  category: ResourceCategory;
  group: string;
  content: string;
}

type RawItem = Record<string, unknown>;

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
  const filter = categories
    .map(c => `${SR.Category} eq '${escapeODataString(c)}'`)
    .join(' or ');

  const items: RawItem[] = await sp.web.lists
    .getByTitle(SR.LIST_TITLE)
    .items
    .filter(filter)
    .top(500)();

  return items.map(mapRawToResource).filter(isValidResource);
}

function mapRawToResource(raw: RawItem): ISiteResource | null {
  const id = Number(raw[SR.Id]);
  const title = typeof raw[SR.Title] === 'string' ? (raw[SR.Title] as string) : '';
  const categoryRaw = typeof raw[SR.Category] === 'string' ? (raw[SR.Category] as string) : '';
  const content = typeof raw[SR.Content] === 'string' ? (raw[SR.Content] as string) : '';
  const group = typeof raw[SR.Group] === 'string' ? (raw[SR.Group] as string) : '';

  if (!Number.isFinite(id) || !title || !isKnownCategory(categoryRaw)) {
    return null;
  }

  return { id, title, category: categoryRaw, group, content };
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
