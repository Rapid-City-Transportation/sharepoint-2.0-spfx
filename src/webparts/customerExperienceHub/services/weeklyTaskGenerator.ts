import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/fields';
import { getSP } from './spConfig';
import { addDailyTaskRows, fetchDailyTasks, IDailyTaskInput, parseKey } from './dailyTaskService';

// Roster lists mirror the eligibility spreadsheet (one row per person). They
// live on the same site as the CX Daily Task List, so getSP() reaches them.
const CHECKING_LIST = 'CX Task Roster - Checking';
const BOOKING_LIST = 'CX Task Roster - Booking';
const SPRQ_LIST = 'SPRQ Task Roster';

type Status = 'priority' | 'scheduled' | 'backup' | 'all';

interface IFieldDef {
  Title: string;
  InternalName: string;
  TypeAsString: string;
}

// Each task maps to a roster column found by keyword, so the two lists' very
// different column names (long imported headers vs short typed ones) both work.
interface ITaskSpec {
  name: string;
  match: (columnTitle: string) => boolean;
}

const CHECKING_TASKS: ITaskSpec[] = [
  { name: 'IME Emails', match: c => c.indexOf('ime') !== -1 },
  { name: 'Reminding', match: c => c.indexOf('remind') !== -1 },
  { name: 'Emails', match: c => c.indexOf('email') !== -1 && c.indexOf('ime') === -1 },
];

const BOOKING_TASKS: ITaskSpec[] = [
  { name: 'Autos & Manage Changes', match: c => c.indexOf('auto') !== -1 || c.indexOf('manage') !== -1 },
  { name: 'Dispatch Alerts', match: c => c.indexOf('dispatch') !== -1 },
  { name: 'Ontario Shores', match: c => c.indexOf('ontario') !== -1 },
  { name: 'Emails', match: c => c.indexOf('email') !== -1 },
];

// SPRQ uses the same eligibility model as Checking (words + Work Time shift).
const SPRQ_TASKS: ITaskSpec[] = [
  { name: 'Email Monitor - SPRQ Items', match: c => c.indexOf('monitor') !== -1 },
  { name: 'CTC', match: c => c.indexOf('ctc') !== -1 },
  { name: 'College Trips', match: c => c.indexOf('college') !== -1 },
  { name: 'School Bookings Inbox', match: c => c.indexOf('school') !== -1 },
  { name: 'Accommodations', match: c => c.indexOf('accommodation') !== -1 },
  { name: 'Dispatch Alerts', match: c => c.indexOf('dispatch') !== -1 },
  { name: 'SPRQ Checking Emails', match: c => c.indexOf('checking') !== -1 },
  { name: 'SPRQ Reminding', match: c => c.indexOf('remind') !== -1 },
];

const SPRQ_TASK_NAMES = SPRQ_TASKS.map(s => s.name);

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function dateKeyOf(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// Parse a roster "Days" value into weekday numbers. Handles "Daily M-F", full
// day-name ranges ("Monday-Wednesday"), slash lists ("Monday/Wednesday/Friday"),
// and mixed day+time strings ("Monday-Tuesday 12:30pm-11pm"): times carry no day
// names, so they are ignored naturally.
export function parseDays(raw: string): Set<number> {
  const s = (raw || '').toLowerCase();
  const days = new Set<number>();
  if (!s) return days;

  if (/m\s*-\s*f/.test(s) || /\bdaily\b/.test(s)) {
    for (let d = 1; d <= 5; d++) days.add(d);
  }

  const alt = DAY_NAMES.join('|');
  const rangeRe = new RegExp(`(${alt})\\s*-\\s*(${alt})`, 'g');
  let m: RegExpExecArray | null;
  while ((m = rangeRe.exec(s)) !== null) {
    const a = DAY_NAMES.indexOf(m[1]);
    const b = DAY_NAMES.indexOf(m[2]);
    if (a >= 0 && b >= 0 && a <= b) {
      for (let d = a; d <= b; d++) days.add(d);
    }
  }

  const singleRe = new RegExp(`\\b(${alt})\\b`, 'g');
  while ((m = singleRe.exec(s)) !== null) {
    days.add(DAY_NAMES.indexOf(m[1]));
  }
  return days;
}

// A roster cell tells us how (or whether) to schedule that person for the task.
function classifyStatus(raw: string): Status | undefined {
  const v = (raw || '').trim().toLowerCase();
  if (!v) return undefined;
  if (v.indexOf('n/a') !== -1 || v === 'na') return undefined;
  if (v.indexOf('do not') !== -1) return undefined;
  if (v.indexOf('leave') !== -1) return undefined;
  if (v.indexOf('all agent') !== -1) return 'all';
  if (v.indexOf('priority') !== -1) return 'priority';
  if (v.indexOf('backup') !== -1) return 'backup';
  return 'scheduled';
}

// ---------------------------------------------------------------------------
// Booking uses a fixed daily coverage template (per team lead Siyam): each task
// is split into time slots, some with a named default, the rest showing the
// roster people whose hours cover that slot as candidates for the TL to pick.
// Weekday only (6am-11pm); weekends have no coverage spec yet.
// ---------------------------------------------------------------------------

interface ITimeRange {
  start: number; // minutes since midnight
  end: number;
}

interface IBookingTaskInfo {
  window: ITimeRange | null;
  backup: boolean;
  priority: boolean;
}

interface IBookingPerson {
  person: string;
  days: Set<number>;
  shiftStart: number | null;
  tasks: Map<string, IBookingTaskInfo>;
}

interface ITaskTemplate {
  task: string;
  backups: string[];
}

function toMinutes(h: number, m: number, ap: string): number {
  const hh = (h % 12) + (ap === 'pm' ? 12 : 0);
  return hh * 60 + m;
}

// Pull the first "H(:MM)am - H(:MM)pm" range out of a cell (ignores trailing
// notes like "(priority)"); returns null for "N/A", "Backup Only", etc.
function parseTimeRange(raw: string): ITimeRange | null {
  const m = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*-\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i.exec(raw || '');
  if (!m) return null;
  return {
    start: toMinutes(Number(m[1]), m[2] ? Number(m[2]) : 0, m[3].toLowerCase()),
    end: toMinutes(Number(m[4]), m[5] ? Number(m[5]) : 0, m[6].toLowerCase()),
  };
}

const BOOKING_TEMPLATE: ITaskTemplate[] = [
  { task: 'Emails', backups: [] },
  { task: 'Dispatch Alerts', backups: ['morning', 'night'] },
  { task: 'Ontario Shores', backups: [] },
  { task: 'Autos & Manage Changes', backups: [] },
];

async function readBookingRoster(sp: SPFI): Promise<IBookingPerson[]> {
  const fields: IFieldDef[] = await sp.web.lists
    .getByTitle(BOOKING_LIST)
    .fields.select('Title', 'InternalName', 'TypeAsString')();
  const titleOf = (f: IFieldDef): string => (f.Title || '').trim().toLowerCase();

  const nameField =
    fields.find(f => titleOf(f).indexOf('staff') !== -1) ||
    fields.find(f => f.InternalName === 'Title');
  const daysField = fields.find(f => titleOf(f).indexOf('day') !== -1);
  const workField = fields.find(f => titleOf(f).indexOf('work') !== -1);
  const taskCols = BOOKING_TASKS
    .map(s => ({ task: s.name, field: fields.find(f => s.match(titleOf(f))) }))
    .filter((t): t is { task: string; field: IFieldDef } => !!t.field);

  const selects = ['Id'];
  if (nameField) selects.push(nameField.InternalName);
  if (daysField) selects.push(daysField.InternalName);
  if (workField) selects.push(workField.InternalName);
  taskCols.forEach(t => selects.push(t.field.InternalName));

  const rows: Record<string, unknown>[] = await sp.web.lists
    .getByTitle(BOOKING_LIST)
    .items.select(...selects)
    .top(2000)();

  const out: IBookingPerson[] = [];
  for (const r of rows) {
    const person = nameField ? String(r[nameField.InternalName] ?? '').trim() : '';
    if (!person) continue;
    const days = parseDays(daysField ? String(r[daysField.InternalName] ?? '') : '');
    if (days.size === 0) continue;
    const shift = workField ? parseTimeRange(String(r[workField.InternalName] ?? '')) : null;
    const tasks = new Map<string, IBookingTaskInfo>();
    for (const tc of taskCols) {
      const val = String(r[tc.field.InternalName] ?? '').trim();
      const status = classifyStatus(val);
      if (!status) continue;
      tasks.set(tc.task, {
        window: parseTimeRange(val),
        backup: status === 'backup',
        priority: status === 'priority',
      });
    }
    out.push({ person, days, shiftStart: shift ? shift.start : null, tasks });
  }
  return out;
}

// Booking: the shift for a task IS the person's roster window (e.g. Dispatch
// "6am-8am"), so coverage shows the exact roster hours. The priority person wins
// a tie so they keep their slot.
function bookingCoverage(people: IBookingPerson[], task: string, dow: number, used: Set<string>): string {
  const entries: IShiftEntry[] = [];
  for (const p of people) {
    if (!p.days.has(dow)) continue;
    const info = p.tasks.get(task);
    if (!info || info.backup || !info.window) continue;
    entries.push({
      name: p.person,
      start: info.window.start,
      end: info.window.end,
      priority: info.priority,
    });
  }
  // Priority people hold their slots; otherwise the earliest-starting person.
  return chainShifts(
    entries,
    active => {
      const prio = active.filter(e => e.priority);
      const pool = prio.length ? prio : active;
      const earliest = Math.min(...pool.map(e => e.start));
      return pool
        .filter(e => e.start === earliest)
        .sort((a, b) => a.name.localeCompare(b.name))[0];
    },
    used
  );
}

function bookingBackupEligible(people: IBookingPerson[], task: string, period: string, dow: number): string[] {
  const names: string[] = [];
  for (const p of people) {
    if (!p.days.has(dow)) continue;
    const info = p.tasks.get(task);
    if (!info || !info.backup) continue;
    // No task-cell time on a backup, so categorize by the person's shift start.
    const isMorning = p.shiftStart === null ? true : p.shiftStart < 720;
    if ((period === 'morning' && isMorning) || (period === 'night' && !isMorning)) {
      names.push(p.person);
    }
  }
  return names.sort((a, b) => a.localeCompare(b));
}

function buildBookingRows(people: IBookingPerson[], weekStart: Date): IDailyTaskInput[] {
  const rows: IDailyTaskInput[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i);
    const dow = date.getDay();
    if (dow === 0 || dow === 6) continue; // booking coverage is Mon-Fri
    const dateKey = dateKeyOf(date);
    const used = new Set<string>();
    for (const t of BOOKING_TEMPLATE) {
      let agents = bookingCoverage(people, t.task, dow, used);
      for (const period of t.backups) {
        const backup = bookingBackupEligible(people, t.task, period, dow);
        if (backup.length) agents += `\nBackup (${period}): ${backup[0]}`;
      }
      rows.push({ group: 'Booking', task: t.task, agents, dateKey });
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Checking coverage is built FROM each person's actual work time, not fixed
// slots. For each task we take everyone scheduled that day and chain their
// shifts to span the operating window (6am-11pm), showing each with their real
// hours - matching how the team lead builds it by hand. Among interchangeable
// shifts the pick rotates weekly.
// ---------------------------------------------------------------------------

interface IEligibilityPerson {
  person: string;
  days: Set<number>;
  shift: ITimeRange | null;
  tasks: Map<string, Status>;
}

// The three Checking tasks and their board row titles.
const CHECKING_COVERAGE: { task: string; display: string }[] = [
  { task: 'Emails', display: 'Emails - Checking' },
  { task: 'IME Emails', display: 'IME Email Coverage' },
  { task: 'Reminding', display: 'Reminding - Checking' },
];

// Operating window the coverage spans, in minutes since midnight.
const CHECK_DAY_START = 360; // 6:00am
const CHECK_DAY_END = 1380; // 11:00pm
// SPRQ evenings are owned collectively: every SPRQ task except Dispatch Alerts
// shows "night staff" from here to close instead of named coverage.
const SPRQ_NIGHT_START = 990; // 4:30pm

function fmtTime(mins: number): string {
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const ap = h24 >= 12 ? 'pm' : 'am';
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${m < 10 ? `0${m}` : m}${ap}`;
}

// Reads an eligibility-style roster (words + a Work Time shift): used for both
// Checking and SPRQ. Booking has its own reader because its cells are time ranges.
async function readEligibilityRoster(
  sp: SPFI,
  listTitle: string,
  taskSpecs: ITaskSpec[]
): Promise<{ people: IEligibilityPerson[]; backupTasks: Set<string> }> {
  const fields: IFieldDef[] = await sp.web.lists
    .getByTitle(listTitle)
    .fields.select('Title', 'InternalName', 'TypeAsString')();
  const titleOf = (f: IFieldDef): string => (f.Title || '').trim().toLowerCase();

  const nameField =
    fields.find(f => titleOf(f).indexOf('staff') !== -1) ||
    fields.find(f => f.InternalName === 'Title');
  const daysField = fields.find(f => titleOf(f).indexOf('day') !== -1);
  const workField = fields.find(f => titleOf(f).indexOf('work') !== -1);
  const taskCols = taskSpecs
    .map(s => ({ task: s.name, field: fields.find(f => s.match(titleOf(f))) }))
    .filter((t): t is { task: string; field: IFieldDef } => !!t.field);

  // A task whose column header says "with backup" (and not "no backup") gets a
  // backup line; "no backup" tasks do not.
  const backupTasks = new Set<string>();
  for (const tc of taskCols) {
    const header = titleOf(tc.field);
    if (header.indexOf('backup') !== -1 && header.indexOf('no backup') === -1) {
      backupTasks.add(tc.task);
    }
  }

  const selects = ['Id'];
  if (nameField) selects.push(nameField.InternalName);
  if (daysField) selects.push(daysField.InternalName);
  if (workField) selects.push(workField.InternalName);
  taskCols.forEach(t => selects.push(t.field.InternalName));

  const rows: Record<string, unknown>[] = await sp.web.lists
    .getByTitle(listTitle)
    .items.select(...selects)
    .top(2000)();

  const out: IEligibilityPerson[] = [];
  for (const r of rows) {
    const person = nameField ? String(r[nameField.InternalName] ?? '').trim() : '';
    if (!person) continue;
    const days = parseDays(daysField ? String(r[daysField.InternalName] ?? '') : '');
    if (days.size === 0) continue;
    const shift = workField ? parseTimeRange(String(r[workField.InternalName] ?? '')) : null;
    const tasks = new Map<string, Status>();
    for (const tc of taskCols) {
      const status = classifyStatus(String(r[tc.field.InternalName] ?? ''));
      if (status) tasks.set(tc.task, status);
    }
    out.push({ person, days, shift, tasks });
  }
  return { people: out, backupTasks };
}

// Weeks since a fixed Monday (Jan 1 2024), so the rotation advances one step per
// week with no stored state and lands the same for everyone who opens it.
function weekIndexOf(weekStart: Date): number {
  const epoch = new Date(2024, 0, 1).getTime();
  return Math.floor((weekStart.getTime() - epoch) / (7 * 24 * 60 * 60 * 1000));
}

interface IShiftEntry {
  name: string;
  start: number;
  end: number;
  priority?: boolean;
}

// Shift-chaining across 6am-11pm, built BACKWARD from close. Working from the end
// means a genuine late-shift person owns the evening (instead of being wasted on a
// 10-11pm sliver) and the chain always ends exactly at close. At each step it
// takes whoever is working at the cursor, hands off to them back to their start,
// and repeats. Each person shows their real hours, trimmed to connect. `pickAmong`
// chooses among the people working at the cursor (earliest-start + weekly rotation
// for Checking; priority-first for Booking). Uncovered stretches show "(open)".
function chainShifts(
  entries: IShiftEntry[],
  pickAmong: (active: IShiftEntry[]) => IShiftEntry,
  used: Set<string>,
  dayEnd: number = CHECK_DAY_END
): string {
  if (entries.length === 0) return '(open)';
  const segments: { label: string; start: number; end: number }[] = [];
  let cursor = dayEnd;
  let guard = 0;
  while (cursor > CHECK_DAY_START && guard++ < 40) {
    // People working at the moment just before the cursor. `used` is shared across
    // the day's tasks, so no one is placed on two at once.
    const active = entries.filter(e => !used.has(e.name) && e.start < cursor && e.end >= cursor);
    if (active.length > 0) {
      const chosen = pickAmong(active);
      used.add(chosen.name);
      const start = Math.max(chosen.start, CHECK_DAY_START);
      segments.push({ label: chosen.name, start, end: cursor });
      cursor = start;
    } else {
      // No one covers the cursor: mark an (open) gap back to the next-latest shift
      // end (or the day's open), then keep filling from there.
      const prevEnd = entries
        .filter(e => !used.has(e.name) && e.end < cursor && e.end > CHECK_DAY_START)
        .reduce((max, e) => Math.max(max, e.end), CHECK_DAY_START);
      segments.push({ label: '(open)', start: prevEnd, end: cursor });
      cursor = prevEnd;
    }
  }
  return segments
    .reverse()
    .map(s => `${s.label} ${fmtTime(s.start)}-${fmtTime(s.end)}`)
    .join('\n');
}

// Checking: the shift comes from each person's Work Time; ties rotate weekly.
function coverageForTask(
  people: IEligibilityPerson[],
  task: string,
  dow: number,
  weekIndex: number,
  used: Set<string>,
  dayEnd: number = CHECK_DAY_END
): string {
  const entries: IShiftEntry[] = [];
  for (const p of people) {
    if (!p.days.has(dow) || !p.shift) continue;
    const status = p.tasks.get(task);
    if (status !== 'scheduled' && status !== 'priority') continue;
    entries.push({ name: p.person, start: p.shift.start, end: p.shift.end });
  }
  // Prefer the earliest-starting person working at the cursor (longest clean block
  // back = fewest handoffs); rotate weekly among equal starts.
  return chainShifts(
    entries,
    active => {
      const earliest = Math.min(...active.map(e => e.start));
      const ties = active.filter(e => e.start === earliest);
      return ties[weekIndex % ties.length];
    },
    used,
    dayEnd
  );
}

function backupNames(people: IEligibilityPerson[], task: string, dow: number): string {
  return people
    .filter(p => p.days.has(dow) && p.tasks.get(task) === 'backup')
    .map(p => p.person)
    .sort((a, b) => a.localeCompare(b))
    .join(' / ');
}

function buildCheckingRows(
  people: IEligibilityPerson[],
  weekStart: Date,
  backupTasks: Set<string>
): IDailyTaskInput[] {
  const rows: IDailyTaskInput[] = [];
  const weekIndex = weekIndexOf(weekStart);
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i);
    const dow = date.getDay();
    if (dow === 0 || dow === 6) continue; // checking coverage is Mon-Fri
    const dateKey = dateKeyOf(date);
    const used = new Set<string>();
    for (const t of CHECKING_COVERAGE) {
      let agents = coverageForTask(people, t.task, dow, weekIndex, used);
      if (backupTasks.has(t.task)) {
        const backup = backupNames(people, t.task, dow);
        if (backup) agents += `\nBackup: ${backup}`;
      }
      rows.push({ group: 'Checking', task: t.display, agents, dateKey });
    }
  }
  return rows;
}

// SPRQ uses the same eligibility/coverage model as Checking, except a task the
// roster marks "All agents" is shown literally and consumes no one, and every
// task but Dispatch Alerts hands the 4:30pm-close stretch to "night staff"
// (so evening people stay free to be named on Dispatch Alerts).
function sprqCoverage(
  people: IEligibilityPerson[],
  task: string,
  dow: number,
  weekIndex: number,
  used: Set<string>
): string {
  const allAgents = people.some(p => p.days.has(dow) && p.tasks.get(task) === 'all');
  if (allAgents) return 'All agents';
  if (task === 'Dispatch Alerts') {
    return coverageForTask(people, task, dow, weekIndex, used);
  }
  const named = coverageForTask(people, task, dow, weekIndex, used, SPRQ_NIGHT_START);
  return `${named}\nnight staff ${fmtTime(SPRQ_NIGHT_START)}-${fmtTime(CHECK_DAY_END)}`;
}

function buildSprqRows(people: IEligibilityPerson[], weekStart: Date): IDailyTaskInput[] {
  const rows: IDailyTaskInput[] = [];
  const weekIndex = weekIndexOf(weekStart);
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i);
    const dow = date.getDay();
    if (dow === 0 || dow === 6) continue; // SPRQ coverage is Mon-Fri
    const dateKey = dateKeyOf(date);
    const used = new Set<string>();
    for (const task of SPRQ_TASK_NAMES) {
      rows.push({
        group: 'SPRQ',
        task,
        agents: sprqCoverage(people, task, dow, weekIndex, used),
        dateKey,
      });
    }
  }
  return rows;
}

// The Monday that starts next week (a Sunday run fills the very next day's week;
// a mid-week click fills the following Monday-Sunday).
function nextMonday(from: Date): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const add = ((8 - d.getDay()) % 7) || 7;
  d.setDate(d.getDate() + add);
  return d;
}

function weekEnd(start: Date): Date {
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
}

// Monday on or before a date (the start of that week).
function mondayOfWeek(from: Date): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function labelFor(start: Date): string {
  const fmt = (d: Date): string => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const friday = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 4);
  return `${fmt(start)} - ${fmt(friday)}`;
}

export interface IWeekOption {
  key: string; // the Monday's YYYY-MM-DD
  label: string; // e.g. "Jul 20 - Jul 24"
}

/** Pickable weeks for the Generate panel: this week first, then forward. */
export function weekOptions(count: number): IWeekOption[] {
  const thisMonday = mondayOfWeek(new Date());
  const out: IWeekOption[] = [];
  for (let i = 0; i < count; i++) {
    const start = new Date(
      thisMonday.getFullYear(),
      thisMonday.getMonth(),
      thisMonday.getDate() + i * 7
    );
    out.push({ key: dateKeyOf(start), label: labelFor(start) });
  }
  return out;
}

export interface IGenResult {
  created: number;
  skipped: boolean;
  message: string;
}

// weekKey is a Monday's YYYY-MM-DD (from weekOptions); falls back to next week.
function weekStartFromKey(weekKey: string): Date {
  return parseKey(weekKey) || nextMonday(new Date());
}

// Each roster/team is its own scope so they generate independently.
export type GenScope = 'checking' | 'booking' | 'sprq';

async function computeRows(sp: SPFI, weekStart: Date, scope: GenScope): Promise<IDailyTaskInput[]> {
  if (scope === 'checking') {
    const { people, backupTasks } = await readEligibilityRoster(sp, CHECKING_LIST, CHECKING_TASKS);
    return buildCheckingRows(people, weekStart, backupTasks);
  }
  if (scope === 'booking') {
    return buildBookingRows(await readBookingRoster(sp), weekStart);
  }
  const { people } = await readEligibilityRoster(sp, SPRQ_LIST, SPRQ_TASKS);
  return buildSprqRows(people, weekStart);
}

// The board Group each scope writes, used to keep sections independent.
function groupForScope(scope: GenScope): string {
  return scope === 'booking' ? 'Booking' : scope === 'sprq' ? 'SPRQ' : 'Checking';
}

/** Compute a week's rows WITHOUT writing anything. Safe against production: it
 *  only reads the roster lists. */
export async function previewWeek(weekKey: string, scope: GenScope): Promise<IDailyTaskInput[]> {
  return computeRows(getSP(), weekStartFromKey(weekKey), scope);
}

/** Write a week's rows into the CX Daily Task List. No-op (with a message) if
 *  that week already has tasks for this scope. */
export async function generateWeek(weekKey: string, scope: GenScope): Promise<IGenResult> {
  const sp = getSP();
  const start = weekStartFromKey(weekKey);
  const label = labelFor(start);
  const startKey = dateKeyOf(start);
  const endKey = dateKeyOf(weekEnd(start));

  // All sections share the list, so each scope only counts its own rows:
  // regenerating one section never blocks (or touches) another.
  const group = groupForScope(scope);
  const existing = await fetchDailyTasks();
  const inWeek = existing.filter(
    t => t.dateKey >= startKey && t.dateKey <= endKey && t.group === group
  );
  if (inWeek.length > 0) {
    return {
      created: 0,
      skipped: true,
      message: `The week of ${label} already has ${inWeek.length} tasks. Delete them first to regenerate.`,
    };
  }

  const rows = await computeRows(sp, start, scope);
  if (rows.length === 0) {
    return {
      created: 0,
      skipped: true,
      message: 'No eligible staff were found in the roster lists, so nothing was generated.',
    };
  }

  const created = await addDailyTaskRows(rows);
  return {
    created,
    skipped: false,
    message: `Generated ${created} tasks for the week of ${label}. Edit any exceptions on the board.`,
  };
}
