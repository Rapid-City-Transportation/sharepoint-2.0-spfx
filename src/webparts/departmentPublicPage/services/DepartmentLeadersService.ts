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
  level?: string;
  shift?: string;
  phone?: string;
  photoUrl?: string;
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
      // The person's actual job level (Supervisor, Team Lead, etc.). Left
      // undefined when the Highlight row has no Level, so the card can drop
      // the Role line rather than repeat the department name.
      level: e.level,
      shift: e.shift,
      phone: e.phoneLine,
      photoUrl: e.photoUrl,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
