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

// A dispatcher on leave keeps their place under the zone (Albert: include
// them, mark them unavailable) so the roster never has to be edited twice.
function renderPersonRow(person: IDispatcherShift): React.ReactNode {
  return (
    <tr
      key={person.id}
      className={`${styles.personRow} ${person.onLeave ? styles.personRowLeave : ''}`}
    >
      <td className={styles.personName}>
        {person.name}
        {person.onLeave && <span className={styles.leaveBadge}>Unavailable (on leave)</span>}
      </td>
      <td className={styles.personShifts}>
        {person.shifts.map((shift, i) => (
          <span key={i} className={styles.shiftChip}>{shift}</span>
        ))}
      </td>
    </tr>
  );
}

const TableHead: React.FC = () => (
  <thead>
    <tr>
      <th scope="col" className={styles.colName}>Dispatcher</th>
      <th scope="col">Shift</th>
    </tr>
  </thead>
);

/** Who dispatches which zone, from the Dispatcher Schedule list: one table
 *  with a band per area of coverage, then the outsource dispatchers. A
 *  table rather than cards so every row lines up whatever the name or zone
 *  length, which cards in the narrow viewer could not do. */
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

          <table className={styles.rosterTable}>
            <TableHead />
            {zones.map(zone => (
              <tbody key={zone.name}>
                <tr className={styles.zoneRow}>
                  <th scope="rowgroup" colSpan={2}>
                    <span className={styles.zoneHeading}>
                      <span className={styles.zoneName}>{zone.name}</span>
                      <span className={styles.zoneCount}>{countLabel(zone.people.length)}</span>
                    </span>
                  </th>
                </tr>
                {zone.people.map(renderPersonRow)}
              </tbody>
            ))}
          </table>
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

          <table className={styles.rosterTable}>
            <TableHead />
            <tbody>{outsource.map(renderPersonRow)}</tbody>
          </table>
        </section>
      )}
    </div>
  );
};

export default ZonesRoster;
