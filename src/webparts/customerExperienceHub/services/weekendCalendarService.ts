import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/fields';
import { getSP } from './spConfig';

const LIST_TITLE = 'CX Weekend Calendar';

export interface IWeekendShift {
  id: number;
  /** ISO date string from the Date column, or undefined when empty. */
  date?: string;
  agent: string;
  skill: string;
  schedule: string;
}

interface IFieldDef {
  Title: string;
  InternalName: string;
}

async function getFields(sp: SPFI): Promise<IFieldDef[]> {
  return sp.web.lists.getByTitle(LIST_TITLE).fields.select('Title', 'InternalName')();
}

// Resolve a column's internal name by matching candidate names against either
// the display Title or the InternalName (case-insensitive). Earlier candidates
// win, so the preferred name is passed first. This survives the export/import
// quirk that left a stuck "Date" column alongside the good "Date1".
function resolveField(fields: IFieldDef[], ...candidates: string[]): string | undefined {
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

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export async function fetchWeekendShifts(): Promise<IWeekendShift[]> {
  const sp = getSP();
  const fields = await getFields(sp);
  // Prefer "Date1" (the working column) over the stuck, import-broken "Date".
  const dateField = resolveField(fields, 'Date1', 'Date');
  const agentField = resolveField(fields, 'Agent');
  const skillField = resolveField(fields, 'Skill');
  const scheduleField = resolveField(fields, 'Schedule');

  const selects = ['Id', dateField, agentField, skillField, scheduleField].filter(
    (f): f is string => !!f
  );

  const rows: Record<string, unknown>[] = await sp.web.lists
    .getByTitle(LIST_TITLE)
    .items.select(...selects)
    .top(2000)();

  return rows
    .map(r => ({
      id: Number(r.Id ?? 0),
      date: dateField ? asText(r[dateField]) || undefined : undefined,
      agent: agentField ? asText(r[agentField]) : '',
      skill: skillField ? asText(r[skillField]) : '',
      schedule: scheduleField ? asText(r[scheduleField]) : '',
    }))
    .filter(s => s.agent || s.skill || s.schedule);
}
