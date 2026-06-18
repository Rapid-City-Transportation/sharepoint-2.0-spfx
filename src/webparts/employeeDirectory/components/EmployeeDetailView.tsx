import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './EmployeeDirectory.module.scss';
import { IEmployee } from './types';

interface IEmployeeDetailViewProps {
  employee: IEmployee;
  onBack: () => void;
}

interface IDetailRowProps {
  label: string;
  value?: string | React.ReactNode;
}

const DetailRow: React.FC<IDetailRowProps> = ({ label, value }) => {
  if (!value) return null;
  return (
    <div className={styles.detailRow}>
      <dt className={styles.detailLabel}>{label}</dt>
      <dd className={styles.detailValue}>{value}</dd>
    </div>
  );
};

const EmployeeDetailView: React.FC<IEmployeeDetailViewProps> = ({ employee, onBack }) => {
  const initials = React.useMemo(() => {
    if (!employee.name) return '?';
    const parts = employee.name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [employee.name]);

  const roleLine = [employee.level, employee.workingStatus].filter(Boolean).join(' · ');
  const deptLine = employee.departments.join(' · ');

  return (
    <article className={styles.detailView} aria-labelledby="ed-detail-name">
      <div className={styles.detailHeaderRow}>
        <button
          className={styles.backButton}
          onClick={onBack}
          type="button"
          aria-label="Back to employee directory"
        >
          <Icon iconName="ChevronLeft" /> Back to Directory
        </button>
      </div>

      <header className={styles.detailHero}>
        {employee.photoUrl ? (
          <img
            className={styles.detailPhoto}
            src={employee.photoUrl}
            alt={employee.photoAlt || ''}
          />
        ) : (
          <div className={styles.detailAvatar} aria-hidden="true">
            {initials}
          </div>
        )}

        <div className={styles.detailHeroBody}>
          <h1 id="ed-detail-name" className={styles.detailName}>{employee.name}</h1>
          {roleLine && <p className={styles.detailRole}>{roleLine}</p>}
          {deptLine && <p className={styles.detailDept}>{deptLine}</p>}
          <div className={styles.detailPillRow}>
            {employee.shift && (
              <span className={styles.detailShiftPill}>{employee.shift} shift</span>
            )}
          </div>
        </div>
      </header>

      <section className={styles.detailSection} aria-labelledby="ed-detail-employment">
        <h2 id="ed-detail-employment" className={styles.detailSectionTitle}>Employment</h2>
        <dl className={styles.detailList}>
          <DetailRow label="Working status" value={employee.workingStatus} />
          <DetailRow label="Department(s)" value={deptLine || undefined} />
          <DetailRow label="Level" value={employee.level} />
          <DetailRow label="Shift" value={employee.shift} />
          <DetailRow
            label="Manager"
            value={
              employee.manager
                ? (employee.manager.email
                    ? <a href={`mailto:${employee.manager.email}`}>{employee.manager.name}</a>
                    : employee.manager.name)
                : undefined
            }
          />
          <DetailRow
            label="Team Lead"
            value={
              employee.teamLead
                ? (employee.teamLead.email
                    ? <a href={`mailto:${employee.teamLead.email}`}>{employee.teamLead.name}</a>
                    : employee.teamLead.name)
                : undefined
            }
          />
        </dl>
      </section>

      <section className={styles.detailSection} aria-labelledby="ed-detail-contact">
        <h2 id="ed-detail-contact" className={styles.detailSectionTitle}>Contact &amp; Systems</h2>
        <dl className={styles.detailList}>
          <DetailRow
            label="Email"
            value={
              employee.email
                ? <a href={`mailto:${employee.email}`}>{employee.email}</a>
                : undefined
            }
          />
          <DetailRow label="RCT user" value={employee.rctUser} />
          <DetailRow label="Phone line" value={employee.phoneLine} />
          <DetailRow label="Alt contact / cell" value={employee.altContact} />
          <DetailRow label="Server" value={employee.server} />
        </dl>
      </section>

    </article>
  );
};

export default EmployeeDetailView;
