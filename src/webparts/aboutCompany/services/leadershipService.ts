import { fetchActiveEmployees } from '../../employeeDirectory/services/employeesService';
import { getSP } from '../../employeeDirectory/services/spConfig';
import { ET } from '../../employeeDirectory/services/fieldNames';
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
  /** Short professional bio from the LeadershipBio column, when present. */
  bio?: string;
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
let _biosCache: { data: Map<string, string>; timestamp: number } | undefined;
const BIOS_TTL_MS = 5 * 60 * 1000;

/** Bios come from a targeted second read so the shared employees fetch never
 *  depends on the LeadershipBio column existing; any failure means no bios,
 *  never a broken page. Cached (including the miss) so a missing column does
 *  not cost a failing round-trip on every mount. */
async function fetchBios(): Promise<Map<string, string>> {
  if (_biosCache && Date.now() - _biosCache.timestamp < BIOS_TTL_MS) {
    return _biosCache.data;
  }
  const bios = new Map<string, string>();
  try {
    const rows: { Id: number; LeadershipBio?: string }[] = await getSP()
      .web.lists.getByTitle(ET.LIST_TITLE)
      .items.select(ET.Id, ET.LeadershipBio)
      .top(5000)();
    for (const row of rows) {
      const bio = (row.LeadershipBio || '').trim();
      if (bio) bios.set(String(row.Id), bio);
    }
  } catch {
    // Fall through: cache the empty result either way.
  }
  _biosCache = { data: bios, timestamp: Date.now() };
  return bios;
}

export async function fetchLeadership(): Promise<ILeader[]> {
  const [employees, bios] = await Promise.all([fetchActiveEmployees(), fetchBios()]);
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
        bio: bios.get(emp.id),
      };
    });
}
