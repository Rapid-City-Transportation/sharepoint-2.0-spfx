import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import { getSP } from './spConfig';
import { DISPATCHER_SCHEDULE_LIST, DispatcherScheduleColumns } from './fieldNames';
import {
  asText,
  getListFields,
  resolveField,
} from '../../customerExperienceHub/services/listFields';

export type DispatcherTeam = 'Dispatch' | 'Outsource';

export interface IDispatcherShift {
  id: number;
  name: string;
  team: DispatcherTeam;
  /** One entry per line of the Shift column, so a weekend dispatcher can
   *  list a Saturday and a Sunday shift. */
  shifts: string[];
  zone: string;
  sortOrder: number;
  /** On vacation: still on the roster, shown as unavailable. */
  onLeave: boolean;
}

// Rows without a Sort Order sink to the bottom instead of jumping to the top.
const UNORDERED = 1e9;

// A multi-line column switched to rich text comes back as HTML; its tags
// become line breaks so the split still yields one shift per line.
function toLines(value: unknown): string[] {
  const text = typeof value === 'string' ? value : '';
  return text
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(s => !!s);
}

export async function fetchDispatcherSchedule(): Promise<IDispatcherShift[]> {
  const sp = getSP();
  const fields = await getListFields(sp, DISPATCHER_SCHEDULE_LIST);
  const nameField = resolveField(fields, ...DispatcherScheduleColumns.name);
  const teamField = resolveField(fields, ...DispatcherScheduleColumns.team);
  const shiftField = resolveField(fields, ...DispatcherScheduleColumns.shift);
  const zoneField = resolveField(fields, ...DispatcherScheduleColumns.zone);
  const sortField = resolveField(fields, ...DispatcherScheduleColumns.sortOrder);
  const leaveField = resolveField(fields, ...DispatcherScheduleColumns.onLeave);

  const selects = ['Id', nameField, teamField, shiftField, zoneField, sortField, leaveField].filter(
    (f): f is string => !!f
  );

  const rows: Record<string, unknown>[] = await sp.web.lists
    .getByTitle(DISPATCHER_SCHEDULE_LIST)
    .items.select(...selects)
    .top(500)();

  return rows
    .map(r => {
      const teamText = teamField ? asText(r[teamField]) : '';
      const team: DispatcherTeam = /outsource/i.test(teamText) ? 'Outsource' : 'Dispatch';
      const order = sortField ? Number(r[sortField]) : NaN;
      return {
        id: Number(r.Id ?? 0),
        name: nameField ? asText(r[nameField]) : '',
        team,
        shifts: shiftField ? toLines(r[shiftField]) : [],
        zone: zoneField ? asText(r[zoneField]) : '',
        sortOrder: isNaN(order) ? UNORDERED : order,
        onLeave: !!leaveField && r[leaveField] === true,
      };
    })
    .filter(s => !!s.name)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}
