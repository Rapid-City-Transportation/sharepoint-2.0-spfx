import { getSP } from './spConfig';
import {
  ET,
  ET_GRID_SELECT_FIELDS,
  ET_GRID_EXPAND_FIELDS,
  ET_DETAIL_SELECT_FIELDS,
  ET_DETAIL_EXPAND_FIELDS,
} from './fieldNames';
import { IEmployee } from '../components/types';
import { mapRowToEmployee, mapRowsToEmployees } from '../mappers/employeeMapper';

interface ICacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

const gridCache: { entry?: ICacheEntry<IEmployee[]> } = {};
const detailCache: Map<number, ICacheEntry<IEmployee>> = new Map();

function isFresh<T>(entry: ICacheEntry<T> | undefined): entry is ICacheEntry<T> {
  return !!entry && Date.now() - entry.timestamp < CACHE_TTL_MS;
}

/**
 * Fetch every highlighted employee for the directory grid.
 *
 * The Highlight list is curated, so there's no "Active Only" filter to
 * apply — every row is considered visible. Sorting happens client-side
 * since the display name comes from Title (sortable, but kept consistent
 * with the previous service shape).
 */
export async function fetchActiveEmployees(forceRefresh = false): Promise<IEmployee[]> {
  if (!forceRefresh && isFresh(gridCache.entry)) {
    return gridCache.entry.data;
  }

  const sp = getSP();

  const raw: Record<string, unknown>[] = await sp.web.lists
    .getByTitle(ET.LIST_TITLE)
    .items.select(...ET_GRID_SELECT_FIELDS)
    .expand(...ET_GRID_EXPAND_FIELDS)
    .top(5000)();

  const employees = mapRowsToEmployees(raw)
    .sort((a, b) => a.name.localeCompare(b.name));

  gridCache.entry = { data: employees, timestamp: Date.now() };
  return employees;
}

/** Fetch one highlighted employee with the full detail field set. */
export async function fetchEmployeeDetail(
  id: number,
  forceRefresh = false
): Promise<IEmployee> {
  if (!forceRefresh) {
    const cached = detailCache.get(id);
    if (isFresh(cached)) return cached.data;
  }

  const sp = getSP();

  const raw: Record<string, unknown> = await sp.web.lists
    .getByTitle(ET.LIST_TITLE)
    .items.getById(id)
    .select(...ET_DETAIL_SELECT_FIELDS)
    .expand(...ET_DETAIL_EXPAND_FIELDS)();

  const employee = mapRowToEmployee(raw);
  detailCache.set(id, { data: employee, timestamp: Date.now() });
  return employee;
}

export function clearCache(): void {
  gridCache.entry = undefined;
  detailCache.clear();
}
