import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import { TextField } from '@fluentui/react/lib/TextField';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import styles from './HealthSafety.module.scss';
import { getSP as getEmployeesSP } from '../../employeeDirectory/services/spConfig';
import {
  IIncidentInput,
  IncidentSeverity,
  IncidentType,
  isConfidential,
  submitIncident,
} from '../services/incidentService';

const TYPE_OPTIONS: IDropdownOption[] = [
  { key: 'Injury or illness', text: 'Injury or illness' },
  { key: 'Near miss', text: 'Near miss' },
  { key: 'Hazard or unsafe condition', text: 'Hazard or unsafe condition' },
  { key: 'Harassment or bullying', text: 'Harassment or bullying (confidential)' },
];

const SEVERITY_OPTIONS: IDropdownOption[] = [
  { key: 'Minor', text: 'Minor' },
  { key: 'Major', text: 'Major' },
  { key: 'Critical', text: 'Critical' },
];

function todayIso(): string {
  const d = new Date();
  const pad = (n: number): string => (n < 10 ? `0${n}` : String(n));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface IIncidentReportFormProps {
  open: boolean;
  onToggle: (open: boolean) => void;
}

type SubmitState = 'idle' | 'busy' | 'done' | 'error';

/**
 * The guided incident report: prompted fields, prefilled name and date, a
 * severity choice for injuries, and a confidential branch for harassment.
 * Every submission goes to HR for review first; the thank-you copy says so.
 * Submit failures fall back to contacting HR directly, so the page can go
 * live before the list and flows exist.
 */
export const IncidentReportForm: React.FC<IIncidentReportFormProps> = ({ open, onToggle }) => {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [incidentType, setIncidentType] = React.useState<IncidentType | undefined>(undefined);
  const [severity, setSeverity] = React.useState<IncidentSeverity | undefined>(undefined);
  const [date, setDate] = React.useState(todayIso());
  const [location, setLocation] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [witnesses, setWitnesses] = React.useState('');
  const [action, setAction] = React.useState('');
  const [state, setState] = React.useState<SubmitState>('idle');
  const [touched, setTouched] = React.useState(false);

  // Prefill from the signed-in user; a failure just leaves the fields blank.
  React.useEffect(() => {
    let cancelled = false;
    getEmployeesSP()
      .web.currentUser()
      .then(me => {
        if (cancelled) return;
        setName(prev => prev || me.Title || '');
        setEmail(prev => prev || me.Email || '');
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const resetForIncidentFields = React.useCallback((): void => {
    setIncidentType(undefined);
    setSeverity(undefined);
    setDate(todayIso());
    setLocation('');
    setDescription('');
    setWitnesses('');
    setAction('');
    setTouched(false);
    setState('idle');
  }, []);

  // The hero and hazard-card buttons reopen the form after a submission;
  // name and email survive, everything about the last incident clears.
  React.useEffect(() => {
    if (open && state === 'done') {
      resetForIncidentFields();
    }
  }, [open, state, resetForIncidentFields]);

  /** Every open/close/submit unmounts the button that was focused, so focus
   *  is handed to the section heading instead of falling to the body. */
  const focusHeading = React.useCallback((): void => {
    window.setTimeout(() => {
      document.getElementById('hs-incident-title')?.focus({ preventScroll: true });
    }, 60);
  }, []);

  const confidential = incidentType ? isConfidential(incidentType) : false;
  const needsSeverity = incidentType === 'Injury or illness';
  const valid =
    !!name.trim() &&
    !!incidentType &&
    !!date &&
    !!description.trim() &&
    (!needsSeverity || !!severity);

  const handleSubmit = React.useCallback(async () => {
    setTouched(true);
    if (!valid || !incidentType) return;
    setState('busy');
    const input: IIncidentInput = {
      reporterName: name.trim(),
      reporterEmail: email.trim(),
      incidentDate: date,
      location: location.trim(),
      incidentType,
      severity: needsSeverity ? severity : undefined,
      description: description.trim(),
      witnesses: witnesses.trim() || undefined,
      immediateAction: action.trim() || undefined,
    };
    try {
      await submitIncident(input);
      setState('done');
      focusHeading();
    } catch {
      setState('error');
    }
  }, [valid, incidentType, name, email, date, location, needsSeverity, severity, description, witnesses, action, focusHeading]);

  return (
    <section id="hs-incident" className={styles.incidentSection} aria-labelledby="hs-incident-title">
      <h2 id="hs-incident-title" className={styles.sectionTitle} tabIndex={-1}>
        <Icon iconName="ReportDocument" className={styles.sectionIcon} aria-hidden="true" />
        Submit an Incident Report
      </h2>

      {!open && state !== 'done' && (
        <div className={styles.incidentIntroCard}>
          <p className={styles.incidentIntroText}>
            Injuries, near misses, hazards, and confidential concerns all start
            here. Your report goes to HR for review first; depending on what you
            submit, HR follows up with you and notifies the Health &amp; Safety
            committee.
          </p>
          <button
            type="button"
            className={styles.incidentStartButton}
            onClick={() => {
              onToggle(true);
              focusHeading();
            }}
          >
            Start an incident report
          </button>
        </div>
      )}

      {open && state !== 'done' && (
        <div className={styles.incidentFormCard}>
          <div className={styles.incidentGrid}>
            <TextField
              label="Your name"
              required
              value={name}
              onChange={(_, v) => setName(v || '')}
              errorMessage={touched && !name.trim() ? 'Enter your name.' : undefined}
            />
            <TextField
              label="Your email"
              value={email}
              onChange={(_, v) => setEmail(v || '')}
            />
            <Dropdown
              label="What are you reporting?"
              required
              options={TYPE_OPTIONS}
              selectedKey={incidentType || null}
              onChange={(_, opt) => setIncidentType(opt ? (opt.key as IncidentType) : undefined)}
              errorMessage={touched && !incidentType ? 'Choose what happened.' : undefined}
            />
            <TextField
              label="Date of incident"
              required
              type="date"
              value={date}
              onChange={(_, v) => setDate(v || '')}
              errorMessage={touched && !date ? 'Enter the date of the incident.' : undefined}
            />
          </div>

          {confidential && (
            <div className={styles.incidentConfidentialNote} role="note">
              <Icon iconName="Lock" aria-hidden="true" />
              <span>
                Harassment and bullying reports are confidential. This goes to
                HR only; it is not shared with the Health &amp; Safety committee.
              </span>
            </div>
          )}

          {needsSeverity && (
            <Dropdown
              label="Nature of injury"
              required
              options={SEVERITY_OPTIONS}
              selectedKey={severity || null}
              onChange={(_, opt) => setSeverity(opt ? (opt.key as IncidentSeverity) : undefined)}
              errorMessage={
                touched && !severity ? 'Choose Minor, Major, or Critical.' : undefined
              }
            />
          )}

          <TextField
            label="Where did it happen?"
            value={location}
            onChange={(_, v) => setLocation(v || '')}
            placeholder="Building, floor, or area"
          />
          <TextField
            label="What happened?"
            required
            multiline
            rows={5}
            value={description}
            onChange={(_, v) => setDescription(v || '')}
            errorMessage={touched && !description.trim() ? 'Describe what happened.' : undefined}
          />
          <TextField
            label="Witnesses (if any)"
            value={witnesses}
            onChange={(_, v) => setWitnesses(v || '')}
          />
          <TextField
            label="Immediate action taken (if any)"
            multiline
            rows={3}
            value={action}
            onChange={(_, v) => setAction(v || '')}
          />

          {state === 'error' && (
            <div className={styles.incidentErrorNote} role="alert">
              <Icon iconName="Warning" aria-hidden="true" />
              <span>
                The report could not be submitted right now. Please contact HR
                directly at{' '}
                <a href="mailto:hr@rapidcitytransport.com">hr@rapidcitytransport.com</a>
                {' '}or leave a voicemail at 905-831-1500 ext. 144.
              </span>
            </div>
          )}

          <div className={styles.incidentActions}>
            <button
              type="button"
              className={styles.incidentSubmitButton}
              onClick={handleSubmit}
              disabled={state === 'busy'}
            >
              {state === 'busy' ? 'Submitting\u2026' : 'Submit report'}
            </button>
            <button
              type="button"
              className={styles.incidentCancelButton}
              onClick={() => {
                onToggle(false);
                focusHeading();
              }}
              disabled={state === 'busy'}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <p role="status" aria-live="polite" className={state === 'done' ? styles.incidentDoneCard : styles.srOnlyHeading}>
        {state === 'done'
          ? 'Thank you for your submission. Your report has been sent to HR for review; HR will follow up with you based on the nature of your submission.'
          : ''}
      </p>
      {state === 'done' && (
        <div className={styles.incidentActions}>
          <button
            type="button"
            className={styles.incidentStartButton}
            onClick={() => {
              resetForIncidentFields();
              onToggle(true);
              focusHeading();
            }}
          >
            Submit another report
          </button>
        </div>
      )}
    </section>
  );
};

export default IncidentReportForm;
