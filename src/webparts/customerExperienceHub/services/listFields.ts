import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/fields';

export interface IListFieldDef {
  Title: string;
  InternalName: string;
}

interface IFieldRow extends IListFieldDef {
  Hidden?: boolean;
  ReadOnlyField?: boolean;
}

// Hidden system columns are dropped so a candidate such as "Name" or "Order"
// can never resolve to SharePoint's own FileLeafRef / Order fields, and
// read-only ones so a renamed Title never resolves to its computed
// "Title (linked to item)" twins, which carry the same display name.
export async function getListFields(sp: SPFI, listTitle: string): Promise<IListFieldDef[]> {
  const rows: IFieldRow[] = await sp.web.lists
    .getByTitle(listTitle)
    .fields.select('Title', 'InternalName', 'Hidden', 'ReadOnlyField')();
  return rows.filter(f => !f.Hidden && !f.ReadOnlyField);
}

// Resolve a column's internal name by matching candidate names against either
// the display Title or the InternalName (case-insensitive). Earlier candidates
// win, so the preferred name is passed first. This survives a column being
// renamed in SharePoint, and the CX export/import quirk that left a stuck
// "Date" column alongside the good "Date1".
export function resolveField(fields: IListFieldDef[], ...candidates: string[]): string | undefined {
  for (const candidate of candidates) {
    const lc = candidate.trim().toLowerCase();
    const match = fields.find(
      f =>
        (f.Title || '').trim().toLowerCase() === lc ||
        (f.InternalName || '').toLowerCase() === lc
    );
    if (match) return match.InternalName;
  }
  return undefined;
}

export function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
