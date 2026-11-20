import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import { getSP } from './spConfig';
import { WEEKEND_CALENDAR_LIST, WeekendCalendarColumns } from './fieldNames';
import {
  asText,
  getListFields,
  resolveField,
} from '../../customerExperienceHub/services/listFields';
import {
  IWeekendShift,
  parseListDate,
} from '../../customerExperienceHub/services/weekendCalendarService';

export interface ISignUpUser {
  /** Written into the Dispatcher column, so it is the directory's spelling. */
  name: string;
  /** Email or login; what marks a row as this person's. */
  login: string;
}

/** Errors written for the person carry the flag; a failed request does not. */
export interface ISignUpError extends Error {
  userFacing?: boolean;
}

function userError(message: string): ISignUpError {
  const err: ISignUpError = new Error(message);
  err.userFacing = true;
  return err;
}

interface IWriteFields {
  agent: string;
  signedUpBy?: string;
  dropRequested?: string;
}

let _fields: Promise<IWriteFields> | undefined;

// Resolved once per page load; a failure is forgotten so the next click retries.
function writeFields(): Promise<IWriteFields> {
  if (!_fields) {
    _fields = getListFields(getSP(), WEEKEND_CALENDAR_LIST)
      .then(fields => {
        const agent = resolveField(fields, ...WeekendCalendarColumns.agent);
        if (!agent) throw new Error(`${WEEKEND_CALENDAR_LIST} has no Dispatcher column.`);
        return {
          agent,
          signedUpBy: resolveField(fields, ...WeekendCalendarColumns.signedUpBy),
          dropRequested: resolveField(fields, ...WeekendCalendarColumns.dropRequested),
        };
      })
      .catch(err => {
        _fields = undefined;
        throw err;
      });
  }
  return _fields;
}

/** Rows taken through the hub carry the login; rows Albert typed in only
 *  carry a name, so those match on the name itself. */
export function isMine(shift: IWeekendShift, user: ISignUpUser): boolean {
  if (shift.signedUpBy) return shift.signedUpBy.toLowerCase() === user.login.toLowerCase();
  return !!shift.agent && shift.agent.trim().toLowerCase() === user.name.trim().toLowerCase();
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function monthName(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long' });
}

/**
 * Albert's rule from the sign-up sheet: one shift per month per dispatcher
 * on each sheet (Team), until the last week of the previous month, when
 * whatever is still open goes first come, first served.
 */
export function signUpBlockReason(
  shift: IWeekendShift,
  all: IWeekendShift[],
  user: ISignUpUser,
  today: Date = new Date()
): string | undefined {
  const date = parseListDate(shift.date);
  if (!date) return undefined;
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  if (today.getTime() >= monthStart.getTime() - WEEK_MS) return undefined;

  const alreadyHasOne = all.some(s => {
    if (s.id === shift.id || s.skill !== shift.skill || !isMine(s, user)) return false;
    const d = parseListDate(s.date);
    return !!d && d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth();
  });
  if (!alreadyHasOne) return undefined;

  const prior = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  const team = shift.skill ? `${shift.skill} ` : '';
  return `You already have a ${team}shift in ${monthName(date)}. Anything still open becomes first come, first served in the last week of ${monthName(prior)}.`;
}

export async function signUpForShift(shift: IWeekendShift, user: ISignUpUser): Promise<void> {
  const fields = await writeFields();
  const item = getSP().web.lists.getByTitle(WEEKEND_CALENDAR_LIST).items.getById(shift.id);

  // Re-read before writing: the calendar on screen may be minutes old.
  const current: Record<string, unknown> = await item.select('Id', fields.agent)();
  if (asText(current[fields.agent])) throw userError('Someone just took this slot.');

  const props: Record<string, string> = { [fields.agent]: user.name };
  if (fields.signedUpBy) props[fields.signedUpBy] = user.login;
  const etag = typeof current['odata.etag'] === 'string' ? current['odata.etag'] : '*';
  try {
    await item.update(props, etag);
  } catch (err) {
    // 412: the row changed between the read above and this write.
    if ((err as { status?: number })?.status === 412) throw userError('Someone just took this slot.');
    throw err;
  }
}

/** A holder never clears their own row: the request flags it for a manager
 *  (Albert), who clears the name and the flag in the list. */
export async function requestDrop(shift: IWeekendShift, user: ISignUpUser): Promise<void> {
  if (!isMine(shift, user)) throw userError('Only the person who signed up can ask to drop this slot.');
  const fields = await writeFields();
  if (!fields.dropRequested) {
    throw userError('The list has no Drop Requested column yet. Ask Albert to take you off this slot.');
  }
  await getSP().web.lists
    .getByTitle(WEEKEND_CALENDAR_LIST)
    .items.getById(shift.id)
    .update({ [fields.dropRequested]: true });
}
