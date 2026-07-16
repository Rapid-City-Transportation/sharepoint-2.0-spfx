import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/fields';
import { getSP } from './spConfig';

const LIST_TITLE = 'CX Daily Task List';

export interface IDailyTask {
  id: number;
  group: string;
  task: string;
  agents: string;
  /** Date-part key (YYYY-MM-DD) of the Date column, or '' when empty. */
  dateKey: string;
}

/** A row to create, produced by the weekly generator. */
export interface IDailyTaskInput {
  group: string;
  task: string;
  agents: string;
  dateKey: string;
}

interface IFieldDef {
  Title: string;
  InternalName: string;
  TypeAsString: string;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Local calendar date as YYYY-MM-DD, for matching against a task's date key. */
export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Build a Date from a YYYY-MM-DD key using its parts, avoiding the UTC
 *  day-shift that date-only SharePoint fields cause in negative timezones. */
export function parseKey(key: string): Date | undefined {
  const [y, m, d] = (key || '').split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : undefined;
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

// Agents may be a text column or a (multi) people picker. Text comes back as a
// string; a people picker expands to an object or array of objects with Title.
function asAgents(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    return value
      .map(v => (typeof v === 'string' ? v : (v as { Title?: string })?.Title || ''))
      .filter(Boolean)
      .join(', ');
  }
  if (value && typeof value === 'object') return (value as { Title?: string }).Title || '';
  return '';
}

async function resolveFields(sp: SPFI): Promise<Record<string, IFieldDef>> {
  const fields: IFieldDef[] = await sp.web.lists
    .getByTitle(LIST_TITLE)
    .fields.select('Title', 'InternalName', 'TypeAsString')();
  const byTitle: Record<string, IFieldDef> = {};
  for (const f of fields) byTitle[(f.Title || '').trim().toLowerCase()] = f;
  return byTitle;
}

export async function fetchDailyTasks(): Promise<IDailyTask[]> {
  const sp = getSP();
  const byTitle = await resolveFields(sp);
  const groupF = byTitle['group']?.InternalName;
  const taskF = byTitle['task']?.InternalName;
  const agentsDef = byTitle['agents'];
  const agentsF = agentsDef?.InternalName;
  const dateF = byTitle['date']?.InternalName;
  const agentsIsPerson = (agentsDef?.TypeAsString || '').indexOf('User') !== -1;

  const selects = ['Id', groupF, taskF, dateF].filter((f): f is string => !!f);
  const expands: string[] = [];
  if (agentsF) {
    if (agentsIsPerson) {
      selects.push(`${agentsF}/Title`);
      expands.push(agentsF);
    } else {
      selects.push(agentsF);
    }
  }

  let query = sp.web.lists.getByTitle(LIST_TITLE).items.select(...selects).top(2000);
  if (expands.length) query = query.expand(...expands);
  const rows: Record<string, unknown>[] = await query();

  return rows
    .map(r => ({
      id: Number(r.Id ?? 0),
      group: groupF ? asText(r[groupF]) : '',
      task: taskF ? asText(r[taskF]) : '',
      agents: agentsF ? asAgents(r[agentsF]) : '',
      dateKey: dateF ? asText(r[dateF]).split('T')[0] : '',
    }))
    .filter(t => t.task || t.agents || t.group);
}

/** Create Daily Task rows (used by the weekly generator). Writes Agents as text;
 *  a date-only field is stamped at local noon so it does not shift a day when
 *  Office converts to UTC in a negative timezone. */
export async function addDailyTaskRows(rows: IDailyTaskInput[]): Promise<number> {
  const sp = getSP();
  const byTitle = await resolveFields(sp);
  const groupF = byTitle['group']?.InternalName;
  const taskF = byTitle['task']?.InternalName;
  const agentsDef = byTitle['agents'];
  const agentsF = agentsDef?.InternalName;
  const dateF = byTitle['date']?.InternalName;

  if ((agentsDef?.TypeAsString || '').indexOf('User') !== -1) {
    throw new Error(
      'The Agents column is a people picker; the generator writes names as text. Switch Agents to a single line of text column.'
    );
  }

  const list = sp.web.lists.getByTitle(LIST_TITLE);
  let created = 0;
  for (const r of rows) {
    const payload: Record<string, unknown> = {};
    if (groupF) payload[groupF] = r.group;
    if (taskF) payload[taskF] = r.task;
    if (agentsF) payload[agentsF] = r.agents;
    if (dateF) {
      const [y, m, d] = r.dateKey.split('-').map(Number);
      payload[dateF] = new Date(y, m - 1, d, 12, 0, 0).toISOString();
    }
    await list.items.add(payload);
    created++;
  }
  return created;
}
