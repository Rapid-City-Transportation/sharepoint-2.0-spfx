import { IEmployee } from '../components/types';
import { ET } from '../services/fieldNames';
import { EMPLOYEE_DIRECTORY_SITE_URL } from '../services/spConfig';

type SPRow = Record<string, unknown>;

interface SPPersonField {
  Title?: string;
  EMail?: string;
}

function readString(row: SPRow, field: string): string | undefined {
  const val = row[field];
  if (typeof val === 'string' && val.trim().length > 0) return val;
  return undefined;
}

function readChoiceArray(row: SPRow, field: string): string[] {
  const val = row[field];
  if (Array.isArray(val)) {
    return val
      .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      .map(v => v.trim());
  }
  // Multi-choice columns sometimes serialize as a comma-joined string
  // (e.g. "Customer Experience, Management") instead of an array. Split
  // those so downstream filters can match each choice as a discrete value.
  if (typeof val === 'string' && val.trim().length > 0) {
    return val.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }
  return [];
}

function readPerson(row: SPRow, field: string): SPPersonField | undefined {
  const val = row[field] as SPPersonField | undefined;
  if (!val) return undefined;
  if (!val.Title && !val.EMail) return undefined;
  return val;
}

/** Build the M365 profile-photo URL for an account.
 *  Hits the SharePoint user-photo endpoint with the user's email address
 *  as the account name; SharePoint returns the rendered photo image. */
function buildUserPhotoUrl(email: string | undefined): string | undefined {
  if (!email) return undefined;
  return `${EMPLOYEE_DIRECTORY_SITE_URL}/_layouts/15/userphoto.aspx?size=L&accountname=${encodeURIComponent(email)}`;
}

/** Map one Employee Highlight row to an IEmployee. Fields the Highlight
 *  list doesn't carry (level, working status, supervisor, etc.) are left
 *  undefined — downstream UI already handles missing values gracefully. */
export function mapRowToEmployee(row: SPRow): IEmployee {
  const idRaw = row[ET.Id] ?? row['id'];
  const id = idRaw != null ? String(idRaw) : '';

  const person = readPerson(row, ET.Employee);
  // Title is the source of truth for display; fall back to the Person
  // field's Title when Title hasn't been filled in.
  const name =
    readString(row, ET.Title) ||
    person?.Title ||
    '';

  return {
    id,
    name,
    // Highlight list has no Active column — every highlighted row is
    // assumed active by curation.
    active: true,

    departments: readChoiceArray(row, ET.Department),
    shift: readString(row, ET.Shift),
    phoneLine: readString(row, ET.PhoneLine),

    photoUrl: buildUserPhotoUrl(person?.EMail),
    photoAlt: name ? `Photo of ${name}` : undefined,
  };
}

export function mapRowsToEmployees(rows: SPRow[]): IEmployee[] {
  return rows.map(mapRowToEmployee);
}
