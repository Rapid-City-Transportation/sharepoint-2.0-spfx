// Employee Highlight — SharePoint list column internal names.
//
// The directory used to source from "Employee Tracker" on /sites/Management,
// but it now reads from "Employee Highlight" on the root site. The Highlight
// list is a curated set of employees with photos linked through a Person
// field (which gives us a real M365 profile photo).
//
// Field internal names below are best-guess based on the visible display
// names and the encoding patterns seen on Employee Tracker. If a field
// returns undefined when you expect a value, run scripts/sharepoint-graph-test
// against the Employee Highlight list and update the matching entry here.

export const ET = {
  LIST_TITLE: 'Employee Highlight',

  // ── Core identity ────────────────────────────────────────────────
  Id: 'Id',
  /** Display name — visible in the list view as the "Title" column. */
  Title: 'Title',
  /** Person field — holds the M365 user object the row is associated with.
   *  Expand to get Employee/Title (display name) and Employee/EMail (used
   *  to construct the SharePoint user-photo URL). */
  Employee: 'Employee',

  // ── Employment ───────────────────────────────────────────────────
  Department: 'Department_x0028_s_x0029_',
  Shift: 'Shift',

  // ── Contact ──────────────────────────────────────────────────────
  PhoneLine: 'PhoneLine',

  // ── Cross-reference ──────────────────────────────────────────────
  /** Foreign key back to the Employee Tracker row, for code that needs
   *  to walk into the richer profile data (e.g. supervisor, team lead). */
  ETID: 'ETID',

  // ── Audit ────────────────────────────────────────────────────────
  Created: 'Created',
  Modified: 'Modified',
} as const;

/** Flat columns + person projection for the grid view. */
export const ET_GRID_SELECT_FIELDS: readonly string[] = [
  ET.Id,
  ET.Title,
  ET.Department,
  ET.Shift,
  ET.PhoneLine,
  ET.ETID,
  `${ET.Employee}/Title`,
  `${ET.Employee}/EMail`,
];

export const ET_GRID_EXPAND_FIELDS: readonly string[] = [
  ET.Employee,
];

/** Same set for detail — the Highlight list is flat enough that grid
 *  and detail can share field lists. */
export const ET_DETAIL_SELECT_FIELDS: readonly string[] = [
  ...ET_GRID_SELECT_FIELDS,
  ET.Created,
  ET.Modified,
];

export const ET_DETAIL_EXPAND_FIELDS: readonly string[] = [
  ...ET_GRID_EXPAND_FIELDS,
];
