import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './EmployeeDirectory.module.scss';
import { IEmployee } from './types';
import { getEmployeeInitials, pickAccentFromString } from '../utils/employeeFormatting';

interface IEmployeeCardProps {
  employee: IEmployee;
  onClick: (employee: IEmployee) => void;
}

const EmployeeCard: React.FC<IEmployeeCardProps> = ({ employee, onClick }) => {
  // Grouping by the first department keeps team colour-coding consistent:
  // every member of the same department gets the same border accent.
  const accent = pickAccentFromString(employee.departments[0]);
  const initials = getEmployeeInitials(employee.name);

  const handleClick = (): void => onClick(employee);
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(employee);
    }
  };

  const roleLine = [employee.level, employee.workingStatus].filter(Boolean).join(' · ');
  const deptLine = employee.departments.join(' · ');
  const ariaLabel = [
    `View profile for ${employee.name}`,
    employee.level,
    deptLine,
  ].filter(Boolean).join(', ');

  return (
    <button
      className={styles.card}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      type="button"
      aria-label={ariaLabel}
      style={{ borderTopColor: accent }}
    >
      {employee.photoUrl ? (
        <img
          className={styles.cardPhoto}
          src={employee.photoUrl}
          alt={employee.photoAlt || ''}
        />
      ) : (
        <div
          className={styles.cardAvatar}
          style={{ backgroundColor: accent }}
          aria-hidden="true"
        >
          {initials}
        </div>
      )}

      <div className={styles.cardName}>{employee.name}</div>

      {roleLine && (
        <div className={styles.cardRole}>{roleLine}</div>
      )}

      {deptLine && (
        <div
          className={styles.cardDeptBadge}
          style={{ color: accent, borderColor: accent }}
        >
          {deptLine}
        </div>
      )}

      <div
        className={`${styles.cardPhoneLine} ${!employee.phoneLine ? styles.cardPhoneLineEmpty : ''}`}
        aria-label={employee.phoneLine ? `Phone line: ${employee.phoneLine}` : 'No phone line on file'}
      >
        <Icon iconName="Phone" aria-hidden="true" />
        <span>{employee.phoneLine || '—'}</span>
      </div>

      {employee.shift && (
        <div className={styles.cardShift} aria-label={`Shift: ${employee.shift}`}>
          {employee.shift}
        </div>
      )}
    </button>
  );
};

export default EmployeeCard;
