import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './WeekendCalendar.module.scss';
import { useWeekendCalendar } from '../../hooks/useWeekendCalendar';
import { IWeekendShift } from '../../services/weekendCalendarService';

type SkillTone = 'checking' | 'booking' | 'wsib' | 'vet' | 'default';

function skillTone(skill: string): SkillTone {
  const s = skill.toUpperCase();
  if (s.indexOf('WSIB') !== -1) return 'wsib';
  if (s.indexOf('VET') !== -1) return 'vet';
  if (s.indexOf('BOOK') !== -1) return 'booking';
  if (s.indexOf('CHECK') !== -1) return 'checking';
  return 'default';
}

// Date-only SharePoint fields come back as midnight UTC, which renders as the
// previous day in Ontario's timezone. Building the date from its Y/M/D parts
// keeps it on the intended calendar day.
function parseListDate(value: string): Date | undefined {
  const datePart = (value || '').split('T')[0];
  const [y, m, d] = datePart.split('-').map(Number);
  if (y && m && d) return new Date(y, m - 1, d);
  const fallback = new Date(value);
  return isNaN(fallback.getTime()) ? undefined : fallback;
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

export const WeekendCalendar: React.FC = () => {
  const { shifts, loading, error } = useWeekendCalendar();
  const months = React.useMemo(() => groupByMonth(groupByWeekend(shifts)), [shifts]);

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

  return (
    <div className={styles.calendar}>
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

      {activeMonth.weekends.map(weekend => (
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
              {weekend.total} {weekend.total === 1 ? 'shift' : 'shifts'}
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
                    {day.shifts.length} {day.shifts.length === 1 ? 'shift' : 'shifts'}
                  </span>
                </header>

                <ul className={styles.shiftList} role="list">
                  {day.shifts.map(shift => (
                    <li key={shift.id} className={styles.shiftRow}>
                      <span className={styles.shiftAgent}>{shift.agent}</span>
                      {shift.skill && (
                        <span
                          className={`${styles.shiftSkill} ${styles[`skill_${skillTone(shift.skill)}`]}`}
                        >
                          {shift.skill}
                        </span>
                      )}
                      {shift.schedule && <span className={styles.shiftTime}>{shift.schedule}</span>}
                    </li>
                  ))}
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
