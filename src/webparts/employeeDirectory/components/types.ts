/** Display-friendly employee model used throughout the directory UI.
 *  Map raw SharePoint list items into this shape via employeeMapper. */

export interface IPerson {
  name: string;
  email?: string;
}

export interface IEmployee {
  id: string;
  /** Display name. Prefers the Title column; falls back to the linked person's name. */
  name: string;
  /** Email of the linked M365 user, from the "Employee" person column. */
  email?: string;
  /** Always true: the Highlight list is curated and has no Active column. */
  active: boolean;

  workingStatus?: string;
  /** Multi-choice column: array of department labels. */
  departments: string[];
  level?: string;
  shift?: string;

  /** "Feature On Public Page" (Yes/No). Opt-in gate for the department public
   *  page leaders. */
  featureOnPublicPage?: boolean;
  /** "Show In Dept Team" (Yes/No). Opt-in gate for a private hub team panel. */
  showInDeptTeam?: boolean;

  manager?: IPerson;
  teamLead?: IPerson;

  /** Derived flag, set by the mapper: true when this employee's Level is
   *  "Team Lead". */
  isTeamLead?: boolean;

  // Grid-only fields stop here. Detail-view-only fields below.
  rctUser?: string;
  phoneLine?: string;
  altContact?: string;
  keyFob?: string;
  server?: string;

  /** Server-relative URL of the first attachment (used as the photo). */
  photoUrl?: string;
  /** Friendly photo alt text, typically "Photo of <name>". */
  photoAlt?: string;
}

/** Top-level filter shown in the grid header. Departments are derived from data
 *  so the type intentionally stays open as `string`. */
export type DepartmentFilter = string | 'All';
