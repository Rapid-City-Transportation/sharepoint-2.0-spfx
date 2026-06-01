/** Display-friendly employee model used throughout the directory UI.
 *  Map raw SharePoint list items into this shape via employeeMapper. */

export interface IPerson {
  name: string;
  email?: string;
}

export interface IEmployee {
  id: string;
  /** Display name. Prefers the explicit "Staff" column; falls back to Title. */
  name: string;
  /** "Yes" / "No" — pre-filtered to "Yes" by the service, but kept on the model
   *  so downstream UI can display it without re-fetching. */
  active: boolean;

  workingStatus?: string;
  /** Multi-choice column — array of department labels. */
  departments: string[];
  level?: string;
  shift?: string;

  manager?: IPerson;
  teamLead?: IPerson;

  /** Derived flag. True when this employee's Id is listed as the TeamLead
   *  on at least one other active employee — i.e. they ARE someone's team
   *  lead. Set by employeesService after the full roster is loaded so the
   *  whole graph is available for the cross-reference. */
  isTeamLead?: boolean;

  // Grid-only fields stop here. Detail-view-only fields below.
  rctUser?: string;
  phoneLine?: string;
  altContact?: string;
  keyFob?: string;
  server?: string;

  /** Server-relative URL of the first attachment (used as the photo). */
  photoUrl?: string;
  /** Friendly photo alt text — typically "Photo of <name>". */
  photoAlt?: string;
}

/** Top-level filter shown in the grid header. Departments are derived from data
 *  so the type intentionally stays open as `string`. */
export type DepartmentFilter = string | 'All';
