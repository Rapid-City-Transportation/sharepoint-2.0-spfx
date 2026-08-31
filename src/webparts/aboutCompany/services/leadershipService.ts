import { fetchActiveEmployees } from '../../employeeDirectory/services/employeesService';
import { IEmployee } from '../../employeeDirectory/components/types';

/** One senior leadership card on the About the Company page, shaped for
 *  the public-page showcase card (same anatomy as the department pages'
 *  "Meet the Department Leaders" section). */
export interface ILeader {
  id: string;
  name: string;
  /** The departments this person leads (their Department tags minus the
   *  Management flag itself). Preferred over role: it is consistently
   *  filled and says what the leadership page needs to say. */
  leads?: string;
  /** Fallback line from the row's Level, for people with no department
   *  portfolio (the Management-only executives). Never invented: blank
   *  Level renders no line rather than a filler label. */
  role?: string;
  photoUrl?: string;
}

/** Same predicate the department hubs use for their management-first sort,
 *  so tagging someone Management affects both surfaces consistently. */
function isManagement(emp: IEmployee): boolean {
  return emp.departments.some(d => d.toLowerCase() === 'management');
}

/** Only the Management tag and nothing else marks the people who run the
 *  company (CEO, President); they lead the page ahead of department heads. */
function isExecutive(emp: IEmployee): boolean {
  return emp.departments.every(d => d.toLowerCase() === 'management');
}

/**
 * Senior leadership, derived from Employee Highlight rather than a dedicated
 * column: everyone tagged with the Management department appears, so curating
 * the page means curating that tag. Executives (Management-only rows) sort
 * first, then department heads, alphabetical within each group. Reads through
 * the shared cached employees fetch; the host web part must have called the
 * employeeDirectory initializeSP() in onInit().
 */
export async function fetchLeadership(): Promise<ILeader[]> {
  const employees = await fetchActiveEmployees();
  return employees
    .filter(isManagement)
    .sort((a, b) => {
      const ae = isExecutive(a) ? 0 : 1;
      const be = isExecutive(b) ? 0 : 1;
      if (ae !== be) return ae - be;
      return a.name.localeCompare(b.name);
    })
    .map(emp => {
      const portfolio = emp.departments.filter(
        d => d.toLowerCase() !== 'management'
      );
      return {
        id: emp.id,
        name: emp.name,
        leads: portfolio.length > 0 ? portfolio.join(', ') : undefined,
        role: portfolio.length === 0 ? emp.level || undefined : undefined,
        photoUrl: emp.photoUrl,
      };
    });
}
