import * as React from 'react';
import styles from './DailyTaskBoard.module.scss';
import { useDailyTasks } from '../../hooks/useDailyTasks';
import { IDailyTask, IDailyTaskInput, parseKey, todayKey } from '../../services/dailyTaskService';
import { canGenerateTasks } from '../../services/taskPermissions';
import {
  generateWeek,
  previewWeek,
  weekOptions,
  IWeekOption,
  GenScope,
} from '../../services/weeklyTaskGenerator';

const TONES = ['blue', 'gold', 'green', 'purple', 'slate'];

// Stable color per Group label so the same category reads consistently. The
// Group text is always shown, so the color is decorative (AODA-safe).
function groupTone(group: string): string {
  if (!group) return 'slate';
  let sum = 0;
  for (let i = 0; i < group.length; i++) sum += group.charCodeAt(i);
  return TONES[sum % TONES.length];
}

interface IDayGroup {
  key: string;
  weekday: string;
  dateLabel: string;
  tasks: IDailyTask[];
}

function groupByDay(tasks: IDailyTask[]): IDayGroup[] {
  const buckets = new Map<string, IDailyTask[]>();
  for (const task of tasks) {
    const key = task.dateKey || 'undated';
    const bucket = buckets.get(key) || [];
    bucket.push(task);
    buckets.set(key, bucket);
  }

  const groups: IDayGroup[] = [];
  buckets.forEach((bucket, key) => {
    const d = key !== 'undated' ? parseKey(key) : undefined;
    groups.push({
      key,
      weekday: d ? d.toLocaleDateString('en-US', { weekday: 'long' }) : 'Undated',
      dateLabel: d
        ? d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : '',
      tasks: bucket.sort(
        (a, b) =>
          (a.group || '').localeCompare(b.group || '') || (a.task || '').localeCompare(b.task || '')
      ),
    });
  });

  return groups.sort((a, b) => {
    if (a.key === 'undated') return 1;
    if (b.key === 'undated') return -1;
    return a.key.localeCompare(b.key);
  });
}

// SPRQ-group tasks belong to the SPRQ hub; everything else (Checking, Booking,
// etc.) belongs to the private CX hub.
function isSprqGroup(group: string): boolean {
  return (group || '').toUpperCase().indexOf('SPRQ') !== -1;
}

// Split a coverage cell ("Name 6:00am-2:30pm\nName 2:30pm-11:00pm") into entries,
// separating the trailing time range from the name so each can be styled.
function parseCoverage(agents: string): { label: string; time?: string }[] {
  return agents
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const m = /^(.*\S)\s+(\d{1,2}:\d{2}(?:am|pm)-\d{1,2}:\d{2}(?:am|pm))$/.exec(line);
      return m ? { label: m[1], time: m[2] } : { label: line };
    });
}

// Render a coverage string as bulleted entries: name emphasized, time subdued.
function renderCoverage(agents: string | undefined): React.ReactNode {
  if (!agents) return null;
  return parseCoverage(agents).map((entry, i) => (
    <span key={i} className={styles.cellEntry}>
      <span className={styles.entryName}>{entry.label}</span>
      {entry.time ? <span className={styles.entryTime}> {entry.time}</span> : null}
    </span>
  ));
}

export interface IDailyTaskBoardProps {
  /** 'cx' shows non-SPRQ groups; 'sprq' shows SPRQ groups; omitted shows all. */
  scope?: 'cx' | 'sprq';
}

export const DailyTaskBoard: React.FC<IDailyTaskBoardProps> = ({ scope }) => {
  const { tasks, loading, error } = useDailyTasks();
  const today = React.useMemo(() => todayKey(), []);
  // Managers enter a Date per task for the week; the board only ever shows the
  // rows dated today, so no daily maintenance is needed.
  const visible = React.useMemo(() => {
    const scoped =
      scope === 'sprq'
        ? tasks.filter(t => isSprqGroup(t.group))
        : scope === 'cx'
          ? tasks.filter(t => !isSprqGroup(t.group))
          : tasks;
    return scoped.filter(t => t.dateKey === today);
  }, [tasks, scope, today]);
  const days = React.useMemo(() => groupByDay(visible), [visible]);

  // "Generate next week" fills the CX Daily Task List from the roster lists.
  // Render-guarded to leads (Team Lead/Supervisor/Manager or the Management
  // tag in Employee Highlight): the list permissions are the real enforcement,
  // but agents must not be one accidental click away from generating a week.
  const [canGenerate, setCanGenerate] = React.useState(false);
  React.useEffect(() => {
    let cancelled = false;
    canGenerateTasks()
      .then(ok => {
        if (!cancelled) setCanGenerate(ok);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);
  const showGenerate = (scope === 'cx' || scope === 'sprq') && canGenerate;
  // Each hub offers only its own team's sections, so they generate independently.
  const sections = React.useMemo<{ value: GenScope; label: string }[]>(
    () =>
      scope === 'sprq'
        ? [{ value: 'sprq', label: 'SPRQ' }]
        : [
            { value: 'checking', label: 'Checking' },
            { value: 'booking', label: 'Booking' },
          ],
    [scope]
  );
  const [section, setSection] = React.useState<GenScope>(sections[0].value);
  const weeks = React.useMemo<IWeekOption[]>(() => (showGenerate ? weekOptions(6) : []), [showGenerate]);
  const [panelOpen, setPanelOpen] = React.useState(false);
  // Default to next week (index 1); this week is index 0.
  const [weekKey, setWeekKey] = React.useState(() =>
    weeks.length > 1 ? weeks[1].key : weeks[0]?.key || ''
  );
  // The week options only exist once the permission check resolves, so the
  // default selection (next week) has to be applied when they appear.
  React.useEffect(() => {
    if (!weekKey && weeks.length > 0) {
      setWeekKey(weeks.length > 1 ? weeks[1].key : weeks[0].key);
    }
  }, [weeks, weekKey]);
  const [busy, setBusy] = React.useState(false);
  const [genMessage, setGenMessage] = React.useState('');
  const [previewRows, setPreviewRows] = React.useState<IDailyTaskInput[] | null>(null);
  const [confirming, setConfirming] = React.useState(false);

  const loadPreview = React.useCallback(async (key: string, sc: GenScope) => {
    setBusy(true);
    setGenMessage('');
    try {
      setPreviewRows(await previewWeek(key, sc));
    } catch (e) {
      console.error('Preview failed', e);
      setPreviewRows(null);
      setGenMessage('Could not load the preview - the roster lists could not be read.');
    } finally {
      setBusy(false);
    }
  }, []);

  const openPanel = React.useCallback(() => {
    setPanelOpen(true);
    setGenMessage('');
    if (weekKey) loadPreview(weekKey, section);
  }, [weekKey, section, loadPreview]);

  const onWeekChange = React.useCallback(
    (key: string) => {
      setWeekKey(key);
      setConfirming(false);
      loadPreview(key, section);
    },
    [section, loadPreview]
  );

  const onSectionChange = React.useCallback(
    (value: GenScope) => {
      setSection(value);
      setConfirming(false);
      loadPreview(weekKey, value);
    },
    [weekKey, loadPreview]
  );

  const runGenerate = React.useCallback(async () => {
    setConfirming(false);
    setBusy(true);
    setGenMessage('Generating...');
    try {
      const result = await generateWeek(weekKey, section);
      setGenMessage(result.message);
      if (!result.skipped) setPreviewRows(null);
    } catch (e) {
      console.error('Generate failed', e);
      setGenMessage('Could not generate - you may not have edit access to the Daily Task list.');
    } finally {
      setBusy(false);
    }
  }, [weekKey, section]);

  // Pivot the flat rows into a task-by-day grid: one row per task, one column
  // per day, matching how a weekly schedule is actually read.
  const previewGrid = React.useMemo(() => {
    if (!previewRows) return undefined;
    const dayKeys = Array.from(new Set(previewRows.map(r => r.dateKey))).sort();
    const cells = new Map<string, Map<string, string>>();
    const taskOrder: string[] = [];
    previewRows.forEach(r => {
      const label = `${r.group} - ${r.task}`;
      let row = cells.get(label);
      if (!row) {
        row = new Map<string, string>();
        cells.set(label, row);
        taskOrder.push(label);
      }
      row.set(r.dateKey, r.agents);
    });
    const columns = dayKeys.map(key => {
      const d = parseKey(key);
      return {
        key,
        label: d
          ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
          : key,
      };
    });
    return { columns, taskOrder, cells };
  }, [previewRows]);

  const generateBar = showGenerate ? (
    <div className={styles.genBar}>
      {!panelOpen ? (
        <button type="button" className={styles.genButton} onClick={openPanel} disabled={busy}>
          Weekly scheduler
        </button>
      ) : (
        <div className={styles.genPanel}>
          <div className={styles.genControls}>
            {sections.length > 1 && (
              <>
                <label htmlFor="genSection" className={styles.genLabel}>
                  Section
                </label>
                <select
                  id="genSection"
                  className={styles.genSelect}
                  value={section}
                  onChange={e => onSectionChange(e.target.value as GenScope)}
                  disabled={busy}
                >
                  {sections.map(s => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </>
            )}
            <label htmlFor="genWeek" className={styles.genLabel}>
              Week
            </label>
            <select
              id="genWeek"
              className={styles.genSelect}
              value={weekKey}
              onChange={e => onWeekChange(e.target.value)}
              disabled={busy}
            >
              {weeks.map((w, i) => (
                <option key={w.key} value={w.key}>
                  {w.label}
                  {i === 0 ? ' (this week)' : i === 1 ? ' (next week)' : ''}
                </option>
              ))}
            </select>
            {!confirming && (
              <>
                <button
                  type="button"
                  className={styles.genButton}
                  onClick={() => setConfirming(true)}
                  disabled={busy || !previewGrid}
                >
                  Generate
                </button>
                <button
                  type="button"
                  className={styles.genCancel}
                  onClick={() => setPanelOpen(false)}
                  disabled={busy}
                >
                  Close
                </button>
              </>
            )}
          </div>

          {confirming && (
            <div className={styles.genConfirm}>
              <span className={styles.genPrompt}>
                Write {sections.find(s => s.value === section)?.label} to the live list for{' '}
                {weeks.find(w => w.key === weekKey)?.label}?
              </span>
              <button type="button" className={styles.genButton} onClick={runGenerate} disabled={busy}>
                Yes
              </button>
              <button
                type="button"
                className={styles.genCancel}
                onClick={() => setConfirming(false)}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          )}

          {genMessage && (
            <p className={styles.genMessage} role="status" aria-live="polite">
              {genMessage}
            </p>
          )}
          {busy && !previewGrid && <p className={styles.genMessage}>Loading preview...</p>}

          {previewGrid && (
            <div
              className={styles.previewScroll}
              role="region"
              aria-label="Preview of the selected week (not saved)"
            >
              <p className={styles.previewNote}>
                Preview only - nothing is written until you choose Generate.
              </p>
              {previewGrid.taskOrder.length === 0 ? (
                <p className={styles.genMessage}>No tasks would be generated - check the roster lists.</p>
              ) : (
                <table className={styles.previewTable}>
                  <thead>
                    <tr>
                      <th scope="col" className={styles.previewCorner}>
                        Task
                      </th>
                      {previewGrid.columns.map(c => (
                        <th key={c.key} scope="col">
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewGrid.taskOrder.map(label => (
                      <tr key={label}>
                        <th scope="row" className={styles.previewRowHead}>
                          {label}
                        </th>
                        {previewGrid.columns.map(c => (
                          <td key={c.key}>{renderCoverage(previewGrid.cells.get(label)?.get(c.key))}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  ) : null;

  let content: React.ReactNode;
  if (loading) {
    content = (
      <div className={styles.state} role="status" aria-live="polite">
        Loading the daily tasks...
      </div>
    );
  } else if (error) {
    content = (
      <div className={styles.state} role="alert">
        The daily task list could not be loaded. Try refreshing the page.
      </div>
    );
  } else if (days.length === 0) {
    content = <div className={styles.state}>No tasks are scheduled for today.</div>;
  } else {
    content = (
      <div className={styles.board}>
        {days.map(day => (
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
              {day.tasks.length} {day.tasks.length === 1 ? 'task' : 'tasks'}
            </span>
          </header>

          <ul className={styles.taskList} role="list">
            {day.tasks.map(task => (
              <li key={task.id} className={styles.taskRow}>
                <span className={styles.taskMain}>
                  <span className={styles.taskTitle}>{task.task}</span>
                  {task.agents && (
                    <span className={styles.taskAgents}>{renderCoverage(task.agents)}</span>
                  )}
                </span>
                {task.group && (
                  <span className={`${styles.taskGroup} ${styles[`group_${groupTone(task.group)}`]}`}>
                    {task.group}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      {generateBar}
      {content}
    </div>
  );
};

export default DailyTaskBoard;
