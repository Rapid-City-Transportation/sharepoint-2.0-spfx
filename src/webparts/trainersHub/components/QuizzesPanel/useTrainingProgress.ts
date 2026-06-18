import * as React from 'react';

const STORAGE_KEY = 'rct.trainersHub.trainingStages.progress.v1';

type ProgressMap = Record<string, boolean>;

function readProgress(): ProgressMap {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as ProgressMap) : {};
  } catch {
    return {};
  }
}

function writeProgress(map: ProgressMap): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // localStorage unavailable (private mode, quota): fail silent, in-memory state still works for the session
  }
}

export interface ITrainingProgress {
  isComplete: (key: string) => boolean;
  toggle: (key: string) => void;
  count: (keys: string[]) => number;
}

export function useTrainingProgress(): ITrainingProgress {
  const [map, setMap] = React.useState<ProgressMap>(() => readProgress());

  const toggle = React.useCallback((key: string): void => {
    setMap(prev => {
      const next = { ...prev, [key]: !prev[key] };
      writeProgress(next);
      return next;
    });
  }, []);

  const isComplete = React.useCallback(
    (key: string): boolean => !!map[key],
    [map]
  );

  const count = React.useCallback(
    (keys: string[]): number => keys.reduce((n, k) => (map[k] ? n + 1 : n), 0),
    [map]
  );

  return { isComplete, toggle, count };
}
