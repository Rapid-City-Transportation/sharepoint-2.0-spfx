import { getSP } from '../../employeeDirectory/services/spConfig';
import { ET } from '../../employeeDirectory/services/fieldNames';
import { buildUserPhotoUrl } from '../../employeeDirectory/mappers/employeeMapper';

/** A JHSC roster entry shaped from an Employee Highlight row; photoUrl is
 *  derived from the member's email, not stored on the list. */
export interface IJhscMember {
  id: number;
  name: string;
  jobTitle?: string;
  committeeRole?: string;
  email?: string;
  photoUrl?: string;
}

interface IRawRow {
  Id: number;
  Title?: string;
  Level?: string;
  JHSCRole?: string | { results?: string[] };
  Employee?: { Title?: string; EMail?: string };
}

/** Tolerates the column being single- or multi-choice: SharePoint returns a
 *  bare string for one, an object with results for the other. */
function roleText(v: IRawRow['JHSCRole']): string {
  if (typeof v === 'string') return v.trim();
  if (v && Array.isArray(v.results)) return v.results.join(', ').trim();
  return '';
}

/** Certified reps lead, first aid next, plain members last. */
function roleRank(role: string): number {
  const r = role.toLowerCase();
  if (r.indexOf('worker representative') !== -1) return 1;
  if (r.indexOf('management representative') !== -1) return 2;
  if (r.indexOf('first aid') !== -1) return 3;
  return 4;
}

/** The committee roster is the Employee Highlight rows whose JHSCRole choice
 *  column is filled in: one source of truth for people, so a member who
 *  leaves the list leaves this page too. Throws on failure (including the
 *  column not existing yet) so the hook can fall back to an empty roster. */
export async function fetchJhscMembers(): Promise<IJhscMember[]> {
  const rows: IRawRow[] = await getSP()
    .web.lists.getByTitle(ET.LIST_TITLE)
    .items.select(
      ET.Id,
      ET.Title,
      ET.Level,
      ET.JhscRole,
      `${ET.Employee}/Title`,
      `${ET.Employee}/EMail`
    )
    .expand(ET.Employee)
    .top(5000)();

  return rows
    .map(r => ({ row: r, role: roleText(r.JHSCRole) }))
    .filter(x => x.role.length > 0)
    .map(x => ({
      id: x.row.Id,
      name: x.row.Title || (x.row.Employee && x.row.Employee.Title) || '(unnamed)',
      jobTitle: x.row.Level || undefined,
      committeeRole: x.role,
      email: (x.row.Employee && x.row.Employee.EMail) || undefined,
      photoUrl: buildUserPhotoUrl(
        (x.row.Employee && x.row.Employee.EMail) || undefined
      ),
    }))
    .sort((a, b) => {
      const ar = roleRank(a.committeeRole);
      const br = roleRank(b.committeeRole);
      if (ar !== br) return ar - br;
      return a.name.localeCompare(b.name);
    });
}
