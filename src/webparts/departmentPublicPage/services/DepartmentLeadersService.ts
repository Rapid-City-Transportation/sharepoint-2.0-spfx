// Department leaders for the public department page.
//
// Leaders come from the "Employee Highlight" list (root site), reusing the
// Employee Directory's reader. A leader is an Employee Highlight row flagged
// "Feature On Public Page" whose Department(s) field contains the page's
// department (e.g. "Customer Experience"). The toggle is the opt-in gate;
// Department(s) scopes it to the right page. Photos come from the Highlight
// row's Employee person field (M365 profile photo).
import { fetchActiveEmployees } from '../../employeeDirectory/services/employeesService';
import { getDepartmentMatchNames } from './DepartmentConfig';

export interface IDepartmentLeader {
  id: number;
  name: string;
  /** Always set: Level, or a derived fallback (see roleLabel). */
  role: string;
  shift?: string;
  phone?: string;
  photoUrl?: string;
}

/** Same chain as the private hubs so a person carries one title everywhere:
 *  Level wins, then the Management department tag, then a generic fallback so
 *  no card is left without a role line. */
function roleLabel(level?: string, departments?: string[]): string {
  if (level) return level;
  // Plain "Manager": matches what people type into Level, instead of a
  // longer derived phrase only the fallback would ever produce.
  if ((departments || []).some(d => d.toLowerCase() === 'management')) {
    return 'Manager';
  }
  return 'Team member';
}

/** Same hierarchy as the private hubs: management first, then team leads,
 *  then trainers, then everyone else. 'manage' catches "Manager",
 *  "Management", and the derived "<Dept> Management" alike. */
function roleRank(role: string): number {
  const r = role.toLowerCase();
  if (r.indexOf('manage') !== -1) return 1;
  if (r.indexOf('team lead') !== -1) return 2;
  if (r.indexOf('trainer') !== -1) return 3;
  return 4;
}

/**
 * Returns the department's leaders: Employee Highlight rows flagged
 * "Feature On Public Page" whose Department(s) field contains the given
 * department display name (or any of its aliases). Returns [] on any error so
 * the page renders without leaders rather than breaking.
 */
export async function fetchDepartmentLeaders(
  departmentDisplayName: string,
  forceRefresh = false
): Promise<IDepartmentLeader[]> {
  const employees = await fetchActiveEmployees(forceRefresh);
  const matchNames = getDepartmentMatchNames(departmentDisplayName).map(n => n.toLowerCase());

  return employees
    .filter(e => {
      if (!e.featureOnPublicPage) return false;
      const depts = (e.departments || []).map(d => d.toLowerCase());
      return depts.some(d => matchNames.indexOf(d) !== -1);
    })
    .map(e => ({
      id: Number(e.id),
      name: e.name,
      role: roleLabel(e.level, e.departments),
      shift: e.shift,
      phone: e.phoneLine,
      photoUrl: e.photoUrl,
    }))
    .sort((a, b) => {
      const diff = roleRank(a.role) - roleRank(b.role);
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    });
}
