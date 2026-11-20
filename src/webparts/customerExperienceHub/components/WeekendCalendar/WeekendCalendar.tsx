import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './WeekendCalendar.module.scss';
import { useWeekendCalendar } from '../../hooks/useWeekendCalendar';
import { IWeekendShift, parseListDate } from '../../services/weekendCalendarService';

// Palette slots, named after the CX skills that first used them; the Dispatch
// calendar's teams reuse them below.
type SkillTone = 'checking' | 'booking' | 'wsib' | 'vet' | 'default';

function skillTone(skill: string): SkillTone {
  const s = skill.toUpperCase();
  if (s.indexOf('WSIB') !== -1) return 'wsib';
  if (s.indexOf('VET') !== -1) return 'vet';
  if (s.indexOf('BOOK') !== -1) return 'booking';
  if (s.indexOf('CHECK') !== -1) return 'checking';
  if (s.indexOf('OUTSOURCE') !== -1 && s.indexOf('DISPATCH') !== -1) return 'wsib';
  if (s.indexOf('OUTSOURCE') !== -1) return 'booking';
  if (s.indexOf('NEXT') !== -1) return 'vet';
  if (s.indexOf('DISPATCH') !== -1) return 'checking';
  return 'default';
}

/** Lets viewers take open slots and ask to be taken off their own. Absent on
 *  read-only calendars. Nobody clears a row from here: a drop is a request
 *  that a manager acts on in the list. */
export interface IWeekendSignUp {
  /** Why this open slot cannot be taken right now; undefined means it can. */
  blockReason: (shift: IWeekendShift, all: IWeekendShift[]) => string | undefined;
  isMine: (shift: IWeekendShift) => boolean;
  signUp: (shift: IWeekendShift) => Promise<void>;
  requestDrop: (shift: IWeekendShift) => Promise<void>;
}

interface IWeekendCalendarProps {
  /** Defaults to the CX list. Another hub passes its own module-level
   *  loader so the same calendar renders its list. */
  loadShifts?: () => Promise<IWeekendShift[]>;
  signUp?: IWeekendSignUp;
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function isPast(shift: IWeekendShift, today: Date): boolean {
  const d = parseListDate(shift.date);
  return !!d && d.getTime() < today.getTime();
}

function shortDate(shift: IWeekendShift): string {
  const d = parseListDate(shift.date);
  return d ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';
}

/** Errors the sign-up service wrote for the person carry a flag; anything
 *  else is a failed request and gets a generic line. */
function failureText(err: unknown): string {
  const e = err as { userFacing?: boolean; message?: string } | null;
  return e && e.userFacing && e.message ? e.message : 'That did not save. Try again.';
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// A weekend is keyed by its Saturday. Sunday maps back to the day before;
// stray weekdays (shouldn't occur) snap to that week's Saturday.
function weekendKey(date: Date): string {
  const sat = new Date(date);
  const dow = date.getDay();
  if (dow === 0) sat.setDate(date.getDate() - 1);
  else if (dow !== 6) sat.setDate(date.getDate() + (6 - dow));
  return toKey(sat);
}

interface IDayGroup {
  key: string;
  weekday: string;
  dateLabel: string;
  shifts: IWeekendShift[];
}

interface IWeekendGroup {
  key: string;
  label: string;
  total: number;
  days: IDayGroup[];
}

function groupByDay(shifts: IWeekendShift[]): IDayGroup[] {
  const buckets = new Map<string, IWeekendShift[]>();
  for (const shift of shifts) {
    const key = (shift.date || '').split('T')[0] || 'undated';
    const bucket = buckets.get(key) || [];
    bucket.push(shift);
    buckets.set(key, bucket);
  }

  const groups: IDayGroup[] = [];
  buckets.forEach((bucket, key) => {
    const d = key !== 'undated' ? parseListDate(key) : undefined;
    groups.push({
      key,
      weekday: d ? d.toLocaleDateString('en-US', { weekday: 'long' }) : 'Unscheduled',
      dateLabel: d
        ? d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : '',
      shifts: bucket.sort(
        (a, b) =>
          (a.skill || '').localeCompare(b.skill || '') ||
          (a.agent || '').localeCompare(b.agent || '')
      ),
    });
  });

  return groups.sort((a, b) => {
    if (a.key === 'undated') return 1;
    if (b.key === 'undated') return -1;
    return a.key.localeCompare(b.key);
  });
}

// Range label across a weekend's days, e.g. "June 20 to 21, 2026" or, across a
// month boundary, "May 31 to June 1, 2026".
function weekendLabel(days: IDayGroup[]): string {
  const dates = days.map(d => parseListDate(d.key)).filter((d): d is Date => !!d);
  if (dates.length === 0) return 'Unscheduled';
  const min = dates[0];
  const max = dates[dates.length - 1];
  if (min.getTime() === max.getTime()) {
    return min.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }
  const sameMonth = min.getMonth() === max.getMonth() && min.getFullYear() === max.getFullYear();
  const start = min.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const end = sameMonth
    ? String(max.getDate())
    : max.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  return `${start} to ${end}, ${max.getFullYear()}`;
}

function groupByWeekend(shifts: IWeekendShift[]): IWeekendGroup[] {
  const dayGroups = groupByDay(shifts);
  const buckets = new Map<string, IDayGroup[]>();
  for (const day of dayGroups) {
    const d = parseListDate(day.key);
    const key = d ? weekendKey(d) : day.key;
    const bucket = buckets.get(key) || [];
    bucket.push(day);
    buckets.set(key, bucket);
  }

  const groups: IWeekendGroup[] = [];
  buckets.forEach((days, key) => {
    groups.push({
      key,
      label: weekendLabel(days),
      total: days.reduce((sum, day) => sum + day.shifts.length, 0),
      days,
    });
  });

  return groups.sort((a, b) => a.key.localeCompare(b.key));
}

interface IMonthGroup {
  key: string;
  label: string;
  weekends: IWeekendGroup[];
}

function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  if (!y || !m) return 'Unscheduled';
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// Group the weekends into the calendar months they fall in (keyed by the
// weekend's Saturday), so the calendar can page one month at a time.
function groupByMonth(weekends: IWeekendGroup[]): IMonthGroup[] {
  const buckets = new Map<string, IWeekendGroup[]>();
  for (const weekend of weekends) {
    const monthKey = weekend.key.slice(0, 7);
    const bucket = buckets.get(monthKey) || [];
    bucket.push(weekend);
    buckets.set(monthKey, bucket);
  }
  const groups: IMonthGroup[] = [];
  buckets.forEach((list, key) => groups.push({ key, label: monthLabel(key), weekends: list }));
  return groups.sort((a, b) => a.key.localeCompare(b.key));
}

export const WeekendCalendar: React.FC<IWeekendCalendarProps> = ({ loadShifts, signUp }) => {
  const { shifts, loading, error, refresh } = useWeekendCalendar(loadShifts);
  const months = React.useMemo(() => groupByMonth(groupByWeekend(shifts)), [shifts]);
  const today = startOfToday();

  // One row at a time saves; its outcome shows beside that row and is also
  // mirrored into the always-mounted live region below the month picker.
  const [busyId, setBusyId] = React.useState<number | undefined>(undefined);
  const [notice, setNotice] = React.useState<
    { id: number; text: string; tone: 'info' | 'error' } | undefined
  >(undefined);

  const runSlotAction = (shift: IWeekendShift, action: (s: IWeekendShift) => Promise<void>): void => {
    setBusyId(shift.id);
    setNotice(undefined);
    action(shift)
      .then(() => refresh())
      .catch(err => setNotice({ id: shift.id, text: failureText(err), tone: 'error' }))
      .then(() => setBusyId(undefined))
      .catch(() => undefined);
  };

  const handleSignUp = (shift: IWeekendShift): void => {
    if (!signUp) return;
    const reason = signUp.blockReason(shift, shifts);
    if (reason) {
      setNotice({ id: shift.id, text: reason, tone: 'info' });
      return;
    }
    runSlotAction(shift, signUp.signUp);
  };

  const myUpcoming = React.useMemo(() => {
    if (!signUp) return [];
    return shifts
      .filter(s => signUp.isMine(s) && !isPast(s, today))
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    // today changes once a day; the list is recomputed with the shifts anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shifts, signUp]);

  // Default to the current month, else the next scheduled month, else the last.
  const defaultKey = React.useMemo(() => {
    if (months.length === 0) return undefined;
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
    const exact = months.find(m => m.key === currentMonth);
    const upcoming = months.find(m => m.key >= currentMonth);
    return (exact || upcoming || months[months.length - 1]).key;
  }, [months]);

  const [selectedKey, setSelectedKey] = React.useState<string | undefined>(undefined);
  const activeKey =
    selectedKey && months.some(m => m.key === selectedKey) ? selectedKey : defaultKey;
  const activeIndex = months.findIndex(m => m.key === activeKey);
  const activeMonth = activeIndex >= 0 ? months[activeIndex] : undefined;

  // Open slots are scattered among taken ones, so a filter hides everything
  // that cannot be signed up for: taken rows, past rows, and the days and
  // weekends left empty by that.
  const [openOnly, setOpenOnly] = React.useState(false);
  const shownWeekends = React.useMemo<IWeekendGroup[]>(() => {
    if (!activeMonth) return [];
    if (!openOnly) return activeMonth.weekends;
    return activeMonth.weekends
      .map(w => {
        const days = w.days
          .map(d => ({ ...d, shifts: d.shifts.filter(s => !s.agent && !isPast(s, today)) }))
          .filter(d => d.shifts.length > 0);
        return { ...w, days, total: days.reduce((n, d) => n + d.shifts.length, 0) };
      })
      .filter(w => w.days.length > 0);
    // today changes once a day; recomputed with the month anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMonth, openOnly]);

  if (loading) {
    return (
      <div className={styles.state} role="status" aria-live="polite">
        Loading the weekend calendar...
      </div>
    );
  }
  if (error) {
    return (
      <div className={styles.state} role="alert">
        The weekend calendar could not be loaded. Try refreshing the page.
      </div>
    );
  }
  if (!activeMonth) {
    return <div className={styles.state}>No weekend shifts are scheduled right now.</div>;
  }

  const openThisMonth = activeMonth.weekends.reduce(
    (n, w) => n + w.days.reduce(
      (m, d) => m + d.shifts.filter(s => !s.agent && !isPast(s, today)).length,
      0
    ),
    0
  );

  return (
    <div className={styles.calendar}>
      {signUp && (
        <p className={styles.yourShifts}>
          <strong>Your shifts:</strong>{' '}
          {myUpcoming.length === 0
            ? 'none yet. Pick an open slot below.'
            : myUpcoming
                .slice(0, 4)
                .map(s =>
                  `${shortDate(s)}${s.skill ? ` (${s.skill})` : ''}${s.dropRequested ? ', drop requested' : ''}`
                )
                .join('; ') + (myUpcoming.length > 4 ? ` and ${myUpcoming.length - 4} more` : '')}
        </p>
      )}

      <div className={styles.monthNav}>
        <button
          type="button"
          className={styles.monthNavBtn}
          onClick={() => activeIndex > 0 && setSelectedKey(months[activeIndex - 1].key)}
          disabled={activeIndex <= 0}
          aria-label="Previous month"
        >
          <Icon iconName="ChevronLeft" aria-hidden="true" />
        </button>
        <span className={styles.monthLabel} aria-live="polite">
          {activeMonth.label}
        </span>
        <button
          type="button"
          className={styles.monthNavBtn}
          onClick={() =>
            activeIndex < months.length - 1 && setSelectedKey(months[activeIndex + 1].key)
          }
          disabled={activeIndex >= months.length - 1}
          aria-label="Next month"
        >
          <Icon iconName="ChevronRight" aria-hidden="true" />
        </button>
      </div>

      <div className={styles.monthTools}>
        {signUp ? (
          <p className={styles.monthOpen}>
            {openThisMonth === 0
              ? 'No open slots this month.'
              : `${openThisMonth} open ${openThisMonth === 1 ? 'slot' : 'slots'} this month.`}
          </p>
        ) : (
          <span />
        )}
        <button
          type="button"
          className={`${styles.filterToggle} ${openOnly ? styles.filterToggleActive : ''}`}
          onClick={() => setOpenOnly(v => !v)}
          aria-pressed={openOnly}
        >
          <Icon iconName={openOnly ? 'CheckboxComposite' : 'Checkbox'} aria-hidden="true" />
          Open slots only
        </button>
      </div>

      {/* Mounted once so a row's outcome is announced; the visible copy sits by the row. */}
      <p className={styles.srOnly} role="status" aria-live="polite">
        {notice ? notice.text : ''}
      </p>

      {openOnly && shownWeekends.length === 0 && (
        <div className={styles.state} role="status">
          No open slots in {activeMonth.label}. Try the next month.
        </div>
      )}

      {shownWeekends.map(weekend => (
        <section
          key={weekend.key}
          className={styles.weekendGroup}
          aria-label={`Weekend of ${weekend.label}`}
        >
          <header className={styles.weekendHeader}>
            <Icon iconName="CalendarWeek" className={styles.weekendIcon} aria-hidden="true" />
            <span className={styles.weekendEyebrow}>Weekend</span>
            <span className={styles.weekendLabel}>{weekend.label}</span>
            <span className={styles.weekendCount}>
              {weekend.total} {openOnly ? 'open' : weekend.total === 1 ? 'shift' : 'shifts'}
            </span>
          </header>

          <div className={styles.weekendDays}>
            {weekend.days.map(day => (
              <section
                key={day.key}
                className={styles.dayCard}
                aria-label={`${day.weekday} ${day.dateLabel}`.trim()}
              >
                <header className={styles.dayHeader}>
                  <div className={styles.dayHeading}>
                    <span className={styles.dayWeekday}>{day.weekday}</span>
                    {day.dateLabel && <span className={styles.dayDate}>{day.dateLabel}</span>}
                  </div>
                  <span className={styles.dayCount}>
                    {day.shifts.length} {openOnly ? 'open' : day.shifts.length === 1 ? 'shift' : 'shifts'}
                  </span>
                </header>

                <ul className={styles.shiftList} role="list">
                  {day.shifts.map(shift => {
                    const past = isPast(shift, today);
                    const mine = !!signUp && signUp.isMine(shift);
                    const busy = busyId === shift.id;
                    const slotLabel = `${shift.skill || 'shift'} ${shift.schedule || ''} on ${day.weekday} ${day.dateLabel}`.trim();
                    return (
                      <li
                        key={shift.id}
                        className={`${styles.shiftRow} ${mine ? styles.shiftRowMine : ''}`}
                      >
                        {shift.agent ? (
                          <span className={styles.shiftAgent}>
                            {shift.agent}
                            {mine && <span className={styles.youBadge}>You</span>}
                            {shift.dropRequested && (
                              <span className={styles.dropBadge}>Drop requested</span>
                            )}
                          </span>
                        ) : (
                          <span className={`${styles.shiftAgent} ${styles.shiftOpen}`}>
                            {past ? 'Not filled' : 'Open slot'}
                          </span>
                        )}
                        {shift.skill && (
                          <span
                            className={`${styles.shiftSkill} ${styles[`skill_${skillTone(shift.skill)}`]}`}
                          >
                            {shift.skill}
                          </span>
                        )}
                        {shift.schedule && <span className={styles.shiftTime}>{shift.schedule}</span>}

                        {signUp && !past && !shift.agent && (
                          <button
                            type="button"
                            className={styles.signUpBtn}
                            onClick={() => handleSignUp(shift)}
                            disabled={busy}
                            aria-label={`Sign up for the ${slotLabel}`}
                          >
                            {busy ? 'Saving...' : 'Sign up'}
                          </button>
                        )}
                        {signUp && !past && mine && !shift.dropRequested && (
                          <button
                            type="button"
                            className={styles.releaseBtn}
                            onClick={() => runSlotAction(shift, signUp.requestDrop)}
                            disabled={busy}
                            aria-label={`Ask to drop the ${slotLabel}`}
                          >
                            {busy ? 'Saving...' : 'Request to drop'}
                          </button>
                        )}
                        {notice && notice.id === shift.id && (
                          <span
                            className={`${styles.shiftNotice} ${notice.tone === 'error' ? styles.shiftNoticeError : ''}`}
                          >
                            {notice.text}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default WeekendCalendar;
