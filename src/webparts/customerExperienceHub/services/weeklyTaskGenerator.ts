import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/fields';
import { getSP } from './spConfig';
import { addDailyTaskRows, fetchDailyTasks, IDailyTaskInput } from './dailyTaskService';

// Roster lists mirror the eligibility spreadsheet (one row per person). They
// live on the same site as the CX Daily Task List, so getSP() reaches them.
const CHECKING_LIST = 'CX Task Roster - Checking';
const BOOKING_LIST = 'CX Task Roster - Booking';

type Status = 'priority' | 'scheduled' | 'backup';

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

interface ISlot {
  label: string;
  start: number;
  end: number;
}

interface ITaskTemplate {
  task: string;
  slots: ISlot[];
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

function overlaps(a: ITimeRange, b: ITimeRange): boolean {
  return a.start < b.end && b.start < a.end;
}

const BOOKING_TEMPLATE: ITaskTemplate[] = [
  {
    task: 'Emails',
    slots: [
      { label: '6:00am-10:00am', start: 360, end: 600 },
      { label: '10:00am-8:30pm', start: 600, end: 1230 },
    ],
    backups: [],
  },
  {
    task: 'Dispatch Alerts',
    slots: [
      { label: '6:00am-8:00am', start: 360, end: 480 },
      { label: '8:00am-4:30pm', start: 480, end: 990 },
      { label: '4:30pm-11:00pm', start: 990, end: 1380 },
    ],
    backups: ['morning', 'night'],
  },
  {
    task: 'Ontario Shores',
    slots: [
      { label: '6:00am-2:30pm', start: 360, end: 870 },
      { label: '4:30pm-11:00pm', start: 990, end: 1380 },
    ],
    backups: [],
  },
  {
    task: 'Autos & Manage Changes',
    slots: [
      { label: '6:00am-4:30pm', start: 360, end: 990 },
      { label: '4:30pm-11:00pm', start: 990, end: 1380 },
    ],
    backups: [],
  },
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

function bookingEligible(people: IBookingPerson[], task: string, slot: ISlot, dow: number): string[] {
  const priority: string[] = [];
  const regular: string[] = [];
  for (const p of people) {
    if (!p.days.has(dow)) continue;
    const info = p.tasks.get(task);
    if (!info || info.backup || !info.window) continue;
    if (overlaps(info.window, slot)) {
      (info.priority ? priority : regular).push(p.person);
    }
  }
  const ordered = [
    ...priority.sort((a, b) => a.localeCompare(b)),
    ...regular.sort((a, b) => a.localeCompare(b)),
  ];
  const unique: string[] = [];
  for (const n of ordered) if (unique.indexOf(n) === -1) unique.push(n);
  return unique;
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

// Booking, like Checking, is one person per slot: named defaults stay fixed, and
// every other slot (and each backup) takes one person, rotated weekly, skipping
// anyone already placed that day.
function buildBookingRows(people: IBookingPerson[], weekStart: Date): IDailyTaskInput[] {
  const rows: IDailyTaskInput[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i);
    const dow = date.getDay();
    if (dow === 0 || dow === 6) continue; // booking coverage is Mon-Fri
    const dateKey = dateKeyOf(date);
    const assigned = new Set<string>();
    for (const t of BOOKING_TEMPLATE) {
      const lines: string[] = [];
      for (const slot of t.slots) {
        const person = pickStable(bookingEligible(people, t.task, slot, dow), assigned);
        if (person) assigned.add(person);
        lines.push(`${slot.label}: ${person || '(open)'}`);
      }
      for (const period of t.backups) {
        const person = pickStable(bookingBackupEligible(people, t.task, period, dow), assigned);
        if (person) assigned.add(person);
        lines.push(`Backup (${period}): ${person || '(open)'}`);
      }
      rows.push({ group: 'Booking', task: t.task, agents: lines.join('\n'), dateKey });
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Checking is also time-slot coverage. Its roster cells are eligibility words
// ("Okay to Schedule"), not time ranges, so a person is a candidate for a slot
// when they're scheduled for that task AND their shift (Work Time) covers the
// slot. The weekly rotation is still done by hand (candidates only, TL picks).
// ---------------------------------------------------------------------------

interface ICheckingPerson {
  person: string;
  days: Set<number>;
  shift: ITimeRange | null;
  tasks: Map<string, Status>;
}

// `task` matches the roster column (keyword); `display` is the row title shown
// on the board, matching the names used today.
const CHECKING_TEMPLATE: { task: string; display: string; slots: ISlot[] }[] = [
  {
    task: 'Emails',
    display: 'Emails - Checking',
    slots: [
      { label: '6:00am-2:30pm', start: 360, end: 870 },
      { label: '2:30pm-10:00pm', start: 870, end: 1320 },
      { label: '6:00pm-11:00pm', start: 1080, end: 1380 },
    ],
  },
  {
    task: 'IME Emails',
    display: 'IME Email Coverage',
    slots: [
      { label: '8:00am-4:30pm', start: 480, end: 990 },
      { label: '4:30pm-6:00pm', start: 990, end: 1080 },
      { label: '6:00pm-11:00pm', start: 1080, end: 1380 },
    ],
  },
  {
    task: 'Reminding',
    display: 'Reminding - Checking',
    slots: [
      { label: '8:00am-4:30pm', start: 480, end: 990 },
      { label: '4:30pm-11:00pm', start: 990, end: 1380 },
    ],
  },
];

async function readCheckingRoster(sp: SPFI): Promise<ICheckingPerson[]> {
  const fields: IFieldDef[] = await sp.web.lists
    .getByTitle(CHECKING_LIST)
    .fields.select('Title', 'InternalName', 'TypeAsString')();
  const titleOf = (f: IFieldDef): string => (f.Title || '').trim().toLowerCase();

  const nameField =
    fields.find(f => titleOf(f).indexOf('staff') !== -1) ||
    fields.find(f => f.InternalName === 'Title');
  const daysField = fields.find(f => titleOf(f).indexOf('day') !== -1);
  const workField = fields.find(f => titleOf(f).indexOf('work') !== -1);
  const taskCols = CHECKING_TASKS
    .map(s => ({ task: s.name, field: fields.find(f => s.match(titleOf(f))) }))
    .filter((t): t is { task: string; field: IFieldDef } => !!t.field);

  const selects = ['Id'];
  if (nameField) selects.push(nameField.InternalName);
  if (daysField) selects.push(daysField.InternalName);
  if (workField) selects.push(workField.InternalName);
  taskCols.forEach(t => selects.push(t.field.InternalName));

  const rows: Record<string, unknown>[] = await sp.web.lists
    .getByTitle(CHECKING_LIST)
    .items.select(...selects)
    .top(2000)();

  const out: ICheckingPerson[] = [];
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
  return out;
}

// Weeks since a fixed Monday (Jan 1 2024), so the rotation advances one step per
// week with no stored state and lands the same for everyone who opens it.
function weekIndexOf(weekStart: Date): number {
  const epoch = new Date(2024, 0, 1).getTime();
  return Math.floor((weekStart.getTime() - epoch) / (7 * 24 * 60 * 60 * 1000));
}

function eligibleForSlot(people: ICheckingPerson[], task: string, slot: ISlot, dow: number): string[] {
  const names: string[] = [];
  for (const p of people) {
    if (!p.days.has(dow)) continue;
    const status = p.tasks.get(task);
    if (status !== 'scheduled' && status !== 'priority') continue;
    if (p.shift && overlaps(p.shift, slot)) names.push(p.person);
  }
  const unique: string[] = [];
  for (const n of names.sort((a, b) => a.localeCompare(b))) {
    if (unique.indexOf(n) === -1) unique.push(n);
  }
  return unique;
}

// Pick one person from the pool, advancing by the week number so the choice
// rotates each week, and skipping anyone already placed that day.
function pickRotated(pool: string[], weekIndex: number, assigned: Set<string>): string {
  for (let k = 0; k < pool.length; k++) {
    const cand = pool[(weekIndex + k) % pool.length];
    if (!assigned.has(cand)) return cand;
  }
  return pool.length ? pool[weekIndex % pool.length] : '';
}

// Pick the first available person (priority order preserved) for a stable
// week-to-week assignment; skips anyone already placed that day.
function pickStable(pool: string[], assigned: Set<string>): string {
  for (const cand of pool) {
    if (!assigned.has(cand)) return cand;
  }
  return pool.length ? pool[0] : '';
}

// Weekly rotation: each slot takes one person, rotating by week and skipping
// anyone already placed that day so no one is double-booked.
function buildCheckingRows(people: ICheckingPerson[], weekStart: Date): IDailyTaskInput[] {
  const rows: IDailyTaskInput[] = [];
  const weekIndex = weekIndexOf(weekStart);
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i);
    const dow = date.getDay();
    if (dow === 0 || dow === 6) continue; // checking coverage is Mon-Fri
    const dateKey = dateKeyOf(date);
    const assigned = new Set<string>();
    for (const t of CHECKING_TEMPLATE) {
      const lines: string[] = [];
      for (const slot of t.slots) {
        const person = pickRotated(eligibleForSlot(people, t.task, slot, dow), weekIndex, assigned);
        if (person) assigned.add(person);
        lines.push(`${slot.label}: ${person || '(open)'}`);
      }
      rows.push({ group: 'Checking', task: t.display, agents: lines.join('\n'), dateKey });
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

function weekBounds(): { start: Date; end: Date } {
  const start = nextMonday(new Date());
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  return { start, end };
}

function labelFor(start: Date, end: Date): string {
  const fmt = (d: Date): string => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(start)} - ${fmt(end)}`;
}

/** Human label for the week the button would fill, shown in the confirm prompt. */
export function nextWeekLabel(): string {
  const { start, end } = weekBounds();
  return labelFor(start, end);
}

export interface IGenResult {
  created: number;
  skipped: boolean;
  message: string;
}

async function computeNextWeekRows(sp: SPFI): Promise<IDailyTaskInput[]> {
  const { start } = weekBounds();
  // Both sections are time-slot coverage: Checking (candidates by shift + task
  // eligibility) and Booking (Siyam's slot template with named defaults).
  const checkingPeople = await readCheckingRoster(sp);
  const bookingPeople = await readBookingRoster(sp);
  return [...buildCheckingRows(checkingPeople, start), ...buildBookingRows(bookingPeople, start)];
}

/** Compute next week's rows WITHOUT writing anything. Safe to run against
 *  production: it only reads the roster lists. */
export async function previewNextWeek(): Promise<IDailyTaskInput[]> {
  return computeNextWeekRows(getSP());
}

/** Read both roster lists and write next week's rows into the CX Daily Task
 *  List. No-op (with a message) if that week already has tasks. */
export async function generateNextWeek(): Promise<IGenResult> {
  const sp = getSP();
  const { start, end } = weekBounds();
  const label = labelFor(start, end);
  const startKey = dateKeyOf(start);
  const endKey = dateKeyOf(end);

  // Only CX (Checking/Booking) rows count here; SPRQ tasks share the list but
  // are generated separately, so they must not block a CX generation.
  const existing = await fetchDailyTasks();
  const inWeek = existing.filter(
    t =>
      t.dateKey >= startKey &&
      t.dateKey <= endKey &&
      t.group.toUpperCase().indexOf('SPRQ') === -1
  );
  if (inWeek.length > 0) {
    return {
      created: 0,
      skipped: true,
      message: `The week of ${label} already has ${inWeek.length} tasks. Delete them first if you want to regenerate.`,
    };
  }

  const rows = await computeNextWeekRows(sp);
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
    message: `Generated ${created} tasks for the week of ${label}. Open the board each day to see them, and edit any exceptions.`,
  };
}
