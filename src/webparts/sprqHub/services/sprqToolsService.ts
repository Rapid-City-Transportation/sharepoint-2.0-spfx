import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import { getSP } from '../../customerExperienceHub/services/spConfig';

/** The Tool Viewer tools the SPRQ team maintains themselves. These are the
 *  list's Tool choice values, character for character. */
export type SprqToolKey = 'Client Accounts' | 'Master Lists' | 'Booking Forms';

export interface ISprqToolEntry {
  tool: SprqToolKey;
  label: string;
  url?: string;
}

// The list sits on the CustomerService576 site beside the hub page itself,
// which is the CX hub's SPFI, so no extra site connection is needed.
const LIST_TITLE = 'SPRQ Tools';
export const SPRQ_TOOLS_LIST_URL =
  'https://rapidcitytransport.sharepoint.com/sites/CustomerService576/Lists/SPRQ%20Tools';

const FIELDS = { Title: 'Title', Tool: 'TOOL', Url: 'URL', Active: 'Active' } as const;
const TOOL_KEYS: SprqToolKey[] = ['Client Accounts', 'Master Lists', 'Booking Forms'];

/** A Hyperlink column arrives as {Url, Description}; a text column as a string. */
function readUrl(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined;
  if (value && typeof value === 'object') {
    const url = (value as { Url?: unknown }).Url;
    if (typeof url === 'string') return url.trim() || undefined;
  }
  return undefined;
}

/**
 * Active rows of the SPRQ Tools list, alphabetical within each tool. A row
 * whose Tool is not one of the three known values is dropped rather than
 * guessed at, so a typo in the list cannot invent a new tool on the hub.
 */
export async function fetchSprqTools(): Promise<ISprqToolEntry[]> {
  const rows: Record<string, unknown>[] = await getSP()
    .web.lists.getByTitle(LIST_TITLE)
    .items.select(FIELDS.Title, FIELDS.Tool, FIELDS.Url, FIELDS.Active)
    .top(500)();

  const entries: ISprqToolEntry[] = [];
  for (const row of rows) {
    if (row[FIELDS.Active] === false) continue;
    const tool = row[FIELDS.Tool] as SprqToolKey;
    const raw = row[FIELDS.Title];
    const label = typeof raw === 'string' ? raw.trim() : '';
    if (!label || TOOL_KEYS.indexOf(tool) === -1) continue;
    entries.push({ tool, label, url: readUrl(row[FIELDS.Url]) });
  }
  return entries.sort((a, b) => a.label.localeCompare(b.label));
}
