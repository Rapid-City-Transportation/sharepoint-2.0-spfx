import * as React from 'react';
import styles from './DailyTaskBoard.module.scss';
import { useDailyTasks } from '../../hooks/useDailyTasks';
import { IDailyTask, IDailyTaskInput, parseKey, todayKey } from '../../services/dailyTaskService';
import { generateNextWeek, previewNextWeek, nextWeekLabel } from '../../services/weeklyTaskGenerator';

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

  // "Generate next week" fills the CX Daily Task List from the roster lists. It
  // only applies to the CX board (Checking/Booking), not the SPRQ view.
  const showGenerate = scope !== 'sprq';
  const weekLabel = React.useMemo(() => (showGenerate ? nextWeekLabel() : ''), [showGenerate]);
  const [confirming, setConfirming] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [genMessage, setGenMessage] = React.useState('');
  const [previewRows, setPreviewRows] = React.useState<IDailyTaskInput[] | null>(null);

  const runPreview = React.useCallback(async () => {
    setConfirming(false);
    setBusy(true);
    setGenMessage('Building a preview from the roster...');
    try {
      const rows = await previewNextWeek();
      setPreviewRows(rows);
      setGenMessage(
        rows.length === 0
          ? 'Preview built: no tasks would be generated. Check the roster lists.'
          : `Preview only - ${rows.length} tasks would be created for the week of ${weekLabel}. Nothing was written.`
      );
    } catch (e) {
      console.error('Preview next week failed', e);
      setGenMessage('Could not build the preview. The roster lists could not be read.');
    } finally {
      setBusy(false);
    }
  }, [weekLabel]);

  const runGenerate = React.useCallback(async () => {
    setConfirming(false);
    setBusy(true);
    setGenMessage('Generating next week from the roster...');
    try {
      const result = await generateNextWeek();
      setPreviewRows(null);
      setGenMessage(result.message);
    } catch (e) {
      console.error('Generate next week failed', e);
      setGenMessage(
        'Could not generate the schedule. You may not have edit access to the Daily Task list, or the roster lists could not be read.'
      );
    } finally {
      setBusy(false);
    }
  }, []);

  const previewDays = React.useMemo(() => {
    if (!previewRows) return [];
    const map = new Map<string, IDailyTaskInput[]>();
    previewRows.forEach(r => {
      const bucket = map.get(r.dateKey) || [];
      bucket.push(r);
      map.set(r.dateKey, bucket);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, rows]) => {
        const d = parseKey(key);
        return {
          key,
          label: d
            ? d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
            : key,
          rows: rows.sort((a, b) => (a.group + a.task).localeCompare(b.group + b.task)),
        };
      });
  }, [previewRows]);

  const generateBar = showGenerate ? (
    <div className={styles.genBar}>
      {confirming ? (
        <div className={styles.genConfirm} role="group" aria-label="Confirm generate next week">
          <span className={styles.genPrompt}>
            Fill the week of {weekLabel} from the roster? This writes to the live list.
          </span>
          <button type="button" className={styles.genButton} onClick={runGenerate} disabled={busy}>
            Generate
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
      ) : (
        <>
          <button
            type="button"
            className={styles.genCancel}
            onClick={runPreview}
            disabled={busy}
          >
            {busy ? 'Working...' : 'Preview next week'}
          </button>
          <button
            type="button"
            className={styles.genButton}
            onClick={() => setConfirming(true)}
            disabled={busy}
          >
            Generate next week
          </button>
        </>
      )}
      {genMessage && (
        <p className={styles.genMessage} role="status" aria-live="polite">
          {genMessage}
        </p>
      )}
      {previewRows && (
        <div className={styles.preview} role="region" aria-label="Preview of next week (not saved)">
          <p className={styles.previewNote}>
            Preview only - nothing was written. This is exactly what Generate would create.
          </p>
          {previewDays.length === 0 ? (
            <p className={styles.genMessage}>No tasks would be generated - check the roster lists.</p>
          ) : (
            previewDays.map(day => (
              <div key={day.key} className={styles.previewDay}>
                <h4 className={styles.previewDayTitle}>{day.label}</h4>
                <ul className={styles.previewList}>
                  {day.rows.map((r, i) => (
                    <li key={i} className={styles.previewItem}>
                      <div className={styles.previewTask}>
                        {r.group} - {r.task}
                      </div>
                      <div className={styles.previewAgents}>{r.agents || '(no one eligible)'}</div>
                    </li>
                  ))}
                </ul>
              </div>
            ))
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
                  {task.agents && <span className={styles.taskAgents}>{task.agents}</span>}
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
