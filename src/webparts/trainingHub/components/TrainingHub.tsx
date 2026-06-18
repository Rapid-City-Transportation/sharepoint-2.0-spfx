import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './TrainingHub.module.scss';
import { ITrainingHubProps } from './ITrainingHubProps';
import {
  defaultTheme,
  getThemeCssVariables,
} from '../../rapidCityHomepage/theme/ThemeTokens';
import { Footer } from '../../rapidCityHomepage/components/Footer/Footer';
import { Navigation } from '../../rapidCityHomepage/components/Navigation/Navigation';
import { useEmployees } from '../../employeeDirectory/hooks/useEmployees';
import { IEmployee } from '../../employeeDirectory/components/types';
import {
  getEmployeeInitials,
  pickAccentFromString,
} from '../../employeeDirectory/utils/employeeFormatting';

interface IDepartment {
  label: string;
  icon: string;
  accent: string;
  href: string;
}

const DEPARTMENTS: IDepartment[] = [
  { label: 'Customer Experience', icon: 'PeopleAlert', accent: '#1F4C7F', href: '#train-cx' },
  { label: 'Dispatch',            icon: 'Headset',     accent: '#187389', href: '#train-dispatch' },
  { label: 'Accounting',          icon: 'Calculator',  accent: '#8A6A0C', href: '#train-accounting' },
  { label: 'Fleet',               icon: 'Car',         accent: '#262931', href: '#train-fleet' },
];

const TRAINERS_HUB_URL =
  'https://rapidcitytransport.sharepoint.com/SitePages/TrainersHub.aspx';

function inCustomerExperience(emp: IEmployee): boolean {
  return emp.departments.some(d => d.toLowerCase().indexOf('customer') !== -1);
}

function inIT(emp: IEmployee): boolean {
  return emp.departments.some(d => {
    const lower = d.toLowerCase();
    return lower.indexOf('information technology') !== -1 || lower === 'it';
  });
}

function isManagement(emp: IEmployee): boolean {
  return emp.departments.some(d => d.toLowerCase() === 'management');
}

function isTrainingTeamMember(emp: IEmployee): boolean {
  // The training team is everyone whose Level (Employee Highlight) is "Trainer".
  return !!emp.level && emp.level.trim().toLowerCase() === 'trainer';
}

function teamSortRank(emp: IEmployee): number {
  if (isManagement(emp) && inCustomerExperience(emp)) return 1;
  if (isManagement(emp) && inIT(emp))                 return 2;
  return 3;
}

/** Render departments in a consistent order: non-Management first,
 *  Management last, to match the CX Hub's team cards. */
function orderTeamScope(departments: string[]): string[] {
  const nonMgmt = departments.filter(d => d.toLowerCase() !== 'management');
  const mgmt    = departments.filter(d => d.toLowerCase() === 'management');
  return [...nonMgmt, ...mgmt];
}

function getTeamRoleLabel(emp: IEmployee): string {
  if (emp.level) return emp.level;
  if (isManagement(emp) && inCustomerExperience(emp)) return 'Customer Experience Management';
  if (isManagement(emp) && inIT(emp)) return 'IT Management';
  return 'Team member';
}

const TrainingHub: React.FC<ITrainingHubProps> = ({ title, subtitle }) => {
  const themeVars = React.useMemo(
    () => getThemeCssVariables(defaultTheme) as React.CSSProperties,
    []
  );

  const { employees, gridLoading: teamLoading } = useEmployees();

  const teamMembers = React.useMemo<IEmployee[]>(() => {
    return employees
      .filter(isTrainingTeamMember)
      .sort((a, b) => {
        const diff = teamSortRank(a) - teamSortRank(b);
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      });
  }, [employees]);

  const handleNavSearch = React.useCallback((query: string): void => {
    const q = (query || '').trim();
    const url = q
      ? `/SitePages/ContactCards.aspx?q=${encodeURIComponent(q)}`
      : '/SitePages/ContactCards.aspx';
    window.location.assign(url);
  }, []);

  return (
    <div className={styles.hub} style={themeVars}>
      <Navigation onSearch={handleNavSearch} activePage="training" />

      <div className={styles.layout}>
        <main className={styles.mainColumn}>

          <section className={styles.welcomeCard} aria-labelledby="th-welcome">
            <div className={styles.welcomeHeader}>
              <Icon iconName="Education" className={styles.welcomeHeaderIcon} aria-hidden="true" />
              <div>
                <p className={styles.welcomeEyebrow}>Training</p>
                <h2 id="th-welcome" className={styles.welcomeTitle}>{title}</h2>
                <p className={styles.welcomeSubtitle}>{subtitle}</p>
              </div>
            </div>
          </section>

          <section className={styles.trainerHubCard} aria-labelledby="th-depts">
            <div className={styles.trainerHubHeader}>
              <div>
                <span className={styles.trainerHubEyebrow}>Training</span>
                <h3 id="th-depts" className={styles.trainerHubTitle}>Department Training</h3>
              </div>
              <span className={styles.trainerHubSubtitle}>
                Pick a department to browse its training material.
              </span>
            </div>
            <ul className={styles.trainerHubGrid} role="list">
              {DEPARTMENTS.map((dept) => (
                <li key={dept.label}>
                  <a
                    href={dept.href}
                    className={styles.trainerDeptTile}
                    style={{ ['--dept-accent' as string]: dept.accent } as React.CSSProperties}
                  >
                    <span className={styles.trainerDeptIcon} aria-hidden="true">
                      <Icon iconName={dept.icon} />
                    </span>
                    <span className={styles.trainerDeptLabel}>{dept.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.teamCard} aria-labelledby="th-team">
            <div className={styles.teamHeader}>
              <div>
                <span className={styles.teamEyebrow}>Customer Experience</span>
                <h3 id="th-team" className={styles.teamTitle}>Training Team</h3>
              </div>
              <a href="#team-all" className={styles.teamViewAll}>View all</a>
            </div>

            {teamLoading && teamMembers.length === 0 && (
              <p className={styles.teamMemberRole} role="status" aria-live="polite">
                Loading team…
              </p>
            )}

            {!teamLoading && teamMembers.length === 0 && (
              <p className={styles.teamMemberRole}>
                No training team members found yet. Set a person&#39;s Level to &quot;Trainer&quot; on the Employee Highlight list.
              </p>
            )}

            {teamMembers.length > 0 && (
              <ul className={styles.teamGrid} role="list">
                {teamMembers.map((member) => {
                  const accent = pickAccentFromString(member.name);
                  const initials = getEmployeeInitials(member.name);
                  const role = getTeamRoleLabel(member);
                  const scope = orderTeamScope(member.departments).join(' · ') || '—';

                  return (
                    <li key={member.id} className={styles.teamMember}>
                      <div className={styles.teamMemberTop}>
                        <span
                          className={styles.teamAvatar}
                          style={{ background: accent }}
                          aria-hidden="true"
                        >
                          {initials}
                        </span>
                        <div className={styles.teamMemberInfo}>
                          <span className={styles.teamMemberName}>{member.name}</span>
                          <span className={styles.teamMemberRole}>{role}</span>
                        </div>
                      </div>
                      <div className={styles.teamMemberFooter}>
                        <span className={styles.teamMemberScope}>{scope}</span>
                        <div className={styles.teamMemberContact} aria-hidden="true">
                          <span><Icon iconName="Mail" /></span>
                          <span><Icon iconName="Chat" /></span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </main>

        <aside className={styles.sidebar} aria-label="Quick links">
          <section className={styles.hubCard} aria-labelledby="th-trainers-hub">
            <span className={styles.hubEyebrow}>For trainers</span>
            <h3 id="th-trainers-hub" className={styles.hubTitle}>Trainers Hub</h3>
            <p className={styles.hubDescription}>
              Internal workspace for the training team. Holds the training matrix,
              quizzes, quiz results, and the day-to-day training tools.
            </p>
            <a href={TRAINERS_HUB_URL} className={styles.hubLink}>
              Open hub <span aria-hidden="true">→</span>
            </a>
          </section>
        </aside>
      </div>

      <Footer pageIdentifier="Training Hub Page" />
    </div>
  );
};

export default TrainingHub;
