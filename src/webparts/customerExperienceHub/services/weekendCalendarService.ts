import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import { getSP } from './spConfig';
import { asText, getListFields, resolveField } from './listFields';

const LIST_TITLE = 'CX Weekend Calendar';

export interface IWeekendShift {
  id: number;
  /** ISO date string from the Date column, or undefined when empty. */
  date?: string;
  agent: string;
  skill: string;
  schedule: string;
}

/** Candidate column names per field, matched by display or internal name;
 *  the first one found wins. */
export interface IWeekendShiftColumns {
  date: string[];
  agent: string[];
  skill: string[];
  schedule: string[];
}

/** Reads any list shaped like a weekend calendar (one row per person per
 *  day), so other hubs can show their own calendar through the same
 *  component. */
export async function fetchWeekendShiftsFrom(
  sp: SPFI,
  listTitle: string,
  columns: IWeekendShiftColumns
): Promise<IWeekendShift[]> {
  const fields = await getListFields(sp, listTitle);
  const dateField = resolveField(fields, ...columns.date);
  const agentField = resolveField(fields, ...columns.agent);
  const skillField = resolveField(fields, ...columns.skill);
  const scheduleField = resolveField(fields, ...columns.schedule);

  const selects = ['Id', dateField, agentField, skillField, scheduleField].filter(
    (f): f is string => !!f
  );

  const rows: Record<string, unknown>[] = await sp.web.lists
    .getByTitle(listTitle)
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

export async function fetchWeekendShifts(): Promise<IWeekendShift[]> {
  // Prefer "Date1" (the working column) over the stuck, import-broken "Date".
  return fetchWeekendShiftsFrom(getSP(), LIST_TITLE, {
    date: ['Date1', 'Date'],
    agent: ['Agent'],
    skill: ['Skill'],
    schedule: ['Schedule'],
  });
}
