import { getSP } from '../../employeeDirectory/services/spConfig';
import { ET } from '../../employeeDirectory/services/fieldNames';
import { buildUserPhotoUrl } from '../../employeeDirectory/mappers/employeeMapper';

/** Display model for one senior-leadership card. */
export interface ILeader {
  id: number;
  name: string;
  role: string;
  bio?: string;
  email?: string;
  photoUrl?: string;
}

interface IRawRow {
  Id: number;
  Title?: string;
  Level?: string;
  LeadershipOrder?: number;
  LeadershipBio?: string;
  Employee?: { Title?: string; EMail?: string };
}

/** The leadership roster is the Employee Highlight rows whose LeadershipOrder
 *  number is filled in: presence is the flag, the value is the display order.
 *  Same single-source-of-truth pattern as the JHSC roster. Reads through the
 *  employeeDirectory SPFI, so the host web part must call that web part's
 *  initializeSP() in onInit(). Throws on failure (including the column not
 *  existing yet) so the hook falls back to empty. */
export async function fetchLeadership(): Promise<ILeader[]> {
  const rows: IRawRow[] = await getSP()
    .web.lists.getByTitle(ET.LIST_TITLE)
    .items.select(
      ET.Id,
      ET.Title,
      ET.Level,
      ET.LeadershipOrder,
      ET.LeadershipBio,
      `${ET.Employee}/Title`,
      `${ET.Employee}/EMail`
    )
    .expand(ET.Employee)
    .top(5000)();

  return rows
    .filter(r => typeof r.LeadershipOrder === 'number')
    .sort((a, b) => {
      const ao = a.LeadershipOrder as number;
      const bo = b.LeadershipOrder as number;
      if (ao !== bo) return ao - bo;
      return (a.Title || '').localeCompare(b.Title || '');
    })
    .map(r => ({
      id: r.Id,
      name: r.Title || (r.Employee && r.Employee.Title) || '(unnamed)',
      role: r.Level || 'Leadership Team',
      bio: (r.LeadershipBio || '').trim() || undefined,
      email: (r.Employee && r.Employee.EMail) || undefined,
      photoUrl: buildUserPhotoUrl((r.Employee && r.Employee.EMail) || undefined),
    }));
}
