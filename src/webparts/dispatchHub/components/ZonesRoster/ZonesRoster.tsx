import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './ZonesRoster.module.scss';
import { useDispatcherSchedule } from '../../hooks/useDispatcherSchedule';
import { IDispatcherShift } from '../../services/dispatcherScheduleService';

interface IZoneGroup {
  name: string;
  people: IDispatcherShift[];
}

// Zones appear in the order their first dispatcher holds on the list (rows
// arrive sorted by Sort Order), so the roster reads the way Albert laid his
// sheet out rather than alphabetically.
function groupByZone(rows: IDispatcherShift[]): IZoneGroup[] {
  const groups: IZoneGroup[] = [];
  const byName = new Map<string, IZoneGroup>();
  for (const row of rows) {
    const name = row.zone || 'Unassigned';
    let group = byName.get(name);
    if (!group) {
      group = { name, people: [] };
      byName.set(name, group);
      groups.push(group);
    }
    group.people.push(row);
  }
  return groups;
}

function countLabel(n: number): string {
  return `${n} ${n === 1 ? 'dispatcher' : 'dispatchers'}`;
}

function renderPerson(person: IDispatcherShift): React.ReactNode {
  return (
    <li key={person.id} className={styles.personRow}>
      <span className={styles.personName}>{person.name}</span>
      {person.shifts.length > 0 && (
        <span className={styles.shiftChips}>
          {person.shifts.map((shift, i) => (
            <span key={i} className={styles.shiftChip}>{shift}</span>
          ))}
        </span>
      )}
    </li>
  );
}

/** Who dispatches which zone, from the Dispatcher Schedule list: one card
 *  per area of coverage, then the outsource dispatchers as a flat list. */
export const ZonesRoster: React.FC = () => {
  const { rows, loading, error } = useDispatcherSchedule();
  const zones = React.useMemo(
    () => groupByZone(rows.filter(r => r.team === 'Dispatch')),
    [rows]
  );
  const outsource = React.useMemo(() => rows.filter(r => r.team === 'Outsource'), [rows]);

  if (loading) {
    return (
      <div className={styles.state} role="status" aria-live="polite">
        Loading the roster...
      </div>
    );
  }
  if (error) {
    return (
      <div className={styles.state} role="alert">
        The roster could not be loaded. Try refreshing the page.
      </div>
    );
  }
  if (rows.length === 0) {
    return <div className={styles.state}>No dispatchers are on the roster yet.</div>;
  }

  const dispatchCount = rows.length - outsource.length;

  return (
    <div className={styles.roster}>
      {dispatchCount > 0 && (
        <section className={styles.group} aria-labelledby="zones-roster-dispatch">
          <header className={styles.groupHeader}>
            <Icon iconName="MapPin" className={styles.groupIcon} aria-hidden="true" />
            <span className={styles.groupEyebrow}>Dispatch</span>
            <h4 id="zones-roster-dispatch" className={styles.groupTitle}>Zones &amp; shifts</h4>
            <span className={styles.groupCount}>{countLabel(dispatchCount)}</span>
          </header>

          <div className={styles.zoneGrid}>
            {zones.map(zone => (
              <section key={zone.name} className={styles.zoneCard} aria-label={zone.name}>
                <header className={styles.zoneHeader}>
                  <span className={styles.zoneName}>{zone.name}</span>
                  <span className={styles.zoneCount}>{countLabel(zone.people.length)}</span>
                </header>
                <ul className={styles.personList} role="list">
                  {zone.people.map(renderPerson)}
                </ul>
              </section>
            ))}
          </div>
        </section>
      )}

      {outsource.length > 0 && (
        <section className={styles.group} aria-labelledby="zones-roster-outsource">
          <header className={styles.groupHeader}>
            <Icon iconName="Headset" className={styles.groupIcon} aria-hidden="true" />
            <span className={styles.groupEyebrow}>Outsource</span>
            <h4 id="zones-roster-outsource" className={styles.groupTitle}>Outsource dispatchers</h4>
            <span className={styles.groupCount}>{countLabel(outsource.length)}</span>
          </header>
          <ul className={`${styles.personList} ${styles.personListFlat}`} role="list">
            {outsource.map(renderPerson)}
          </ul>
        </section>
      )}
    </div>
  );
};

export default ZonesRoster;
