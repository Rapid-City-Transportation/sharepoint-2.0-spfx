import { getSP } from './spConfig';
import { PB, IB, ALL_LOOKUP_COLUMNS } from './fieldNames';

/**
 * Fields we explicitly request when fetching versions. SharePoint's /versions
 * endpoint returns only built-in metadata by default: custom field values
 * have to be selected explicitly or they come back as undefined.
 *
 * Per source list, we request the union of built-in metadata + every watched
 * custom column + lookup ID columns (so we can detect phantom lookup events
 * by comparing IDs across versions). SP throws if you select a field that
 * doesn't exist on the list, so the lists are kept separate.
 */
const PROTOCOL_BOOK_VERSION_FIELDS = [
  'Created', 'Modified', 'IsCurrentVersion', 'VersionId', 'VersionLabel',
  PB.Specification,
  PB.BusinessHours,
  PB.SpecialInstructions,
  PB.ConfirmationsSpecific,
  PB.PassengerNotes,
  PB.TripNotes,
  PB.ReferralOptions,
  PB.ProblemWithReminderCall,
  PB.ApprovalAllModifications,
  PB.ApprovalBlanket,
  PB.ApprovalRTW,
  PB.ApprovalNotes,
  // Lookup ID columns, used by the phantom filter to detect when SP fired
  // HasColumnChanged on a lookup but the actual ID didn't change.
  ...ALL_LOOKUP_COLUMNS.map(col => `${col}Id`),
];

const INSTRUCTION_BLOCK_VERSION_FIELDS = [
  'Created', 'Modified', 'IsCurrentVersion', 'VersionId', 'VersionLabel',
  IB.Title,
  IB.DefaultText,
  IB.Description,
  IB.ApprovalToModify,
];

export interface IVersionPair {
  /** Most recent version (latest edit). */
  current: Record<string, unknown>;
  /** Version immediately before the current one. */
  previous: Record<string, unknown>;
}

/**
 * Fetches the most recent two versions of a SharePoint list item, sorted
 * so [current] is the latest and [previous] is the one before. Used by
 * filters and the diff renderer to determine what changed.
 *
 * Falls back to null if:
 *   - Versioning isn't enabled on the list
 *   - The item only has one version (no previous to compare against)
 *   - The fetch fails for any reason
 */
export async function fetchVersionPair(
  listTitle: string,
  itemId: number
): Promise<IVersionPair | null> {
  try {
    const sp = getSP();
    // Pick the right $select set: SP throws if you ask for fields that don't
    // exist on the list, so PB and IB get separate field lists. Without an
    // explicit select, the versions endpoint returns metadata only: custom
    // field values come back as undefined.
    const fields =
      listTitle === PB.LIST_TITLE
        ? PROTOCOL_BOOK_VERSION_FIELDS
        : INSTRUCTION_BLOCK_VERSION_FIELDS;
    const allVersions = await sp.web.lists
      .getByTitle(listTitle)
      .items.getById(itemId)
      .versions
      .select(...fields)();

    if (!Array.isArray(allVersions) || allVersions.length < 2) {
      return null;
    }

    // Sort newest-first by Created so [0] = current and [1] = previous.
    const sorted = [...allVersions].sort((a, b) => {
      const ta = new Date(String((a as Record<string, unknown>).Created)).getTime();
      const tb = new Date(String((b as Record<string, unknown>).Created)).getTime();
      return tb - ta;
    });

    return {
      current: sorted[0] as Record<string, unknown>,
      previous: sorted[1] as Record<string, unknown>,
    };
  } catch {
    return null;
  }
}

/**
 * Convenience wrapper that returns just the previous version. Used by the
 * notification modal which only needs the previous value to render diffs.
 */
export async function fetchPreviousVersion(
  listTitle: string,
  itemId: number
): Promise<Record<string, unknown> | null> {
  const pair = await fetchVersionPair(listTitle, itemId);
  return pair ? pair.previous : null;
}

/**
 * Fetches all versions of a list item, newest-first, capped at `top` entries.
 * Used by the per-customer change history view to render a timeline of edits.
 *
 * Falls back to an empty array if versioning is off, the item only has one
 * version, or the fetch fails.
 */
export async function fetchAllVersions(
  listTitle: string,
  itemId: number,
  top = 20
): Promise<Record<string, unknown>[]> {
  try {
    const sp = getSP();
    const fields =
      listTitle === PB.LIST_TITLE
        ? PROTOCOL_BOOK_VERSION_FIELDS
        : INSTRUCTION_BLOCK_VERSION_FIELDS;
    const allVersions = await sp.web.lists
      .getByTitle(listTitle)
      .items.getById(itemId)
      .versions
      .select(...fields, 'Editor')();

    if (!Array.isArray(allVersions) || allVersions.length === 0) {
      return [];
    }

    const sorted = [...allVersions].sort((a, b) => {
      const ta = new Date(String((a as Record<string, unknown>).Created)).getTime();
      const tb = new Date(String((b as Record<string, unknown>).Created)).getTime();
      return tb - ta;
    });

    return sorted.slice(0, top) as Record<string, unknown>[];
  } catch {
    return [];
  }
}
