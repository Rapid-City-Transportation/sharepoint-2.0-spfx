/**
 * Employee Tracker list: column internal names.
 *
 * Verify internal names at:
 *   https://rapidcitytransport.sharepoint.com/sites/Management/_api/web/lists/getbytitle('Employee Tracker')/fields?$select=Title,InternalName&$filter=Hidden eq false
 */
export const ET = {
  LIST_TITLE: 'Employee Tracker',

  Id: 'Id',
  /** "Staff" lookup/person field. Must $expand and select sub-property. */
  Staff: 'Staff',
  StaffExpand: 'Staff/Title',
  /** "Active?" boolean (Yes/No). */
  Active: 'Active_x003f_',
  /** "Working Status" choice column. */
  WorkingStatus: 'WorkingStatus',
  /** "Department(s)" multi-value choice. */
  Departments: 'Department_x0028_s_x0029_',
  /** "Level" choice column (Manager, Team Lead, etc.). */
  Level: 'Level',
  /** "Shift" choice column. */
  Shift: 'Shift',
  /** "Photo" image or hyperlink column. */
  Photo: 'Photo',
  /** "Phone Line" text. */
  PhoneLine: 'PhoneLine',
  /** "Alt contact#/Cell#" text. */
  AltContact: 'Altcontact_x0023__x002f_Cell_x0023_',
} as const;
