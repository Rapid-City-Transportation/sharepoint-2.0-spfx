import { getSP } from './spConfig';
import { fetchActiveEmployees } from '../../employeeDirectory/services/employeesService';

/** Employee Highlight Levels allowed to generate task weeks. */
const GENERATOR_LEVELS = ['team lead', 'supervisor', 'manager'];

/**
 * True when the signed-in user may generate weeks on the daily task board:
 * their Employee Highlight row (matched by email) carries a leadership Level
 * or the Management department tag. This is a UI render-guard, not security -
 * the CX Daily Task List permissions are the real enforcement - but it keeps
 * agents from being one accidental click away from generating a week.
 * Fails safe to false: no Highlight row, blank Level, or any error hides
 * the generate bar.
 */
export async function canGenerateTasks(): Promise<boolean> {
  try {
    const [me, employees] = await Promise.all([
      getSP().web.currentUser(),
      fetchActiveEmployees(),
    ]);
    const mail = (me.Email || '').toLowerCase();
    if (!mail) return false;
    const row = employees.find(e => (e.email || '').toLowerCase() === mail);
    if (!row) return false;
    const lvl = (row.level || '').toLowerCase();
    if (GENERATOR_LEVELS.some(g => lvl.indexOf(g) !== -1)) return true;
    return row.departments.some(d => d.toLowerCase() === 'management');
  } catch {
    return false;
  }
}
