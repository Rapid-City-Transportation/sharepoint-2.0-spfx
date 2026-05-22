import { getFieldMap, getLookupMap } from './fieldLabels';

/**
 * Helpers for parsing the `NewValueSnapshot` text written by Power Automate
 * into structured sections, and for comparing those sections against a
 * previous SharePoint version's raw field values.
 *
 * Used by:
 *   - notificationsService (to filter out "phantom" notifications where SP
 *     fired a change event but visible content didn't actually change)
 *   - NotificationBell (to render the diff in the modal)
 */

export interface ISnapshotSection {
  label: string;
  value: string;
}

export type NotificationSourceList = 'ProtocolBook' | 'InstructionBlock';

/** Strip HTML tags from a string and collapse to plain text.
 *  Preserves line breaks: <br>, </p>, </div>, </li>, </h*> all become \n.
 *  <li> tags get a "• " prefix so list bullets survive the strip. */
export function htmlToPlainText(html: string): string {
  if (!html) return '';
  const withNewlines = html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<\s*li\s*[^>]*>/gi, '• ');
  // innerHTML doesn't execute scripts, so this is XSS-safe even on untrusted HTML.
  const el = document.createElement('div');
  el.innerHTML = withNewlines;
  const text = el.textContent || el.innerText || '';
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Split the snapshot text into sections, using ONLY known field labels as
 * delimiters. Lines matching `<KnownFieldLabel>:` start a new section; any
 * other line (including content-internal headings like "NO CALL IF:") is
 * treated as content within the current section.
 */
export function parseSnapshotSections(
  html: string,
  sourceList: NotificationSourceList
): ISnapshotSection[] {
  const text = htmlToPlainText(html);
  if (!text) return [];

  const fieldMap = getFieldMap(sourceList);
  const knownLabels = Object.keys(fieldMap);

  const lines = text.split('\n');
  const sections: ISnapshotSection[] = [];
  let current: ISnapshotSection = { label: '', value: '' };

  for (const line of lines) {
    const trimmed = line.trim();
    const matchedLabel = knownLabels.find(label => trimmed === `${label}:`);
    if (matchedLabel) {
      if (current.label || current.value.trim()) {
        sections.push({ label: current.label, value: current.value.trim() });
      }
      current = { label: matchedLabel, value: '' };
    } else {
      current.value += (current.value ? '\n' : '') + line;
    }
  }

  if (current.label || current.value.trim()) {
    sections.push({ label: current.label, value: current.value.trim() });
  }

  return sections;
}

/**
 * Look up the previous-version value for a parsed snapshot section.
 * Returns plain text (HTML stripped) or null if no previous value is available
 * (versioning off, fetch failed, lookup field, or unmapped label).
 */
export function getOldValueForSection(
  label: string,
  sourceList: NotificationSourceList,
  previousVersion: Record<string, unknown> | null
): string | null {
  if (!label || !previousVersion) return null;
  const fieldMap = getFieldMap(sourceList);
  const internalName = fieldMap[label];
  if (!internalName) return null;

  // SharePoint's /versions endpoint double-encodes underscores in field names:
  // each `_` becomes `_x005f_` (URL-encoded underscore). So a field named
  // `Problem_x0020_With_x0020_Reminde` shows up as
  // `Problem_x005f_x0020_x005f_With_x005f_x0020_x005f_Reminde` in the version
  // payload. Try both the raw internal name and the version-encoded form so
  // we work whether SP returns it one way or the other.
  const encodedName = internalName.replace(/_/g, '_x005f_');
  const raw = previousVersion[internalName] ?? previousVersion[encodedName];
  if (typeof raw !== 'string') return null;
  return htmlToPlainText(raw).trim();
}

/**
 * Decide whether a notification represents a real visible change.
 *
 * Returns true if any section has either no comparable previous value (so
 * we can't prove it's a phantom) OR has plain-text content that differs from
 * the previous version. Returns false ONLY when every section's plain text
 * is provably identical to the previous version — i.e., a phantom triggered
 * by SharePoint's HTML/encoding quirks on rich-text saves.
 *
 * Conservative by design: when in doubt, keep the notification. We only
 * filter when we're sure nothing visible changed.
 */
export function hasVisibleChange(
  newSnapshot: string | null,
  sourceList: NotificationSourceList,
  previousVersion: Record<string, unknown> | null
): boolean {
  if (!newSnapshot) return true;
  if (!previousVersion) return true;
  const sections = parseSnapshotSections(newSnapshot, sourceList);
  if (sections.length === 0) return true;
  for (const section of sections) {
    const oldValue = getOldValueForSection(section.label, sourceList, previousVersion);
    // Can't compare — keep the notification (could be brand-new content)
    if (oldValue === null) return true;
    // Real difference — keep the notification
    if (oldValue !== section.value) return true;
  }
  // Every section's plain text matched the previous version → phantom
  return false;
}

/**
 * Look up a value in version data, trying both the raw internal name AND the
 * version-encoded form (where every `_` becomes `_x005f_`). SP's /versions
 * endpoint double-encodes underscores in property names.
 */
export function readVersionField(
  version: Record<string, unknown>,
  internalName: string
): unknown {
  const encoded = internalName.replace(/_/g, '_x005f_');
  return version[internalName] !== undefined
    ? version[internalName]
    : version[encoded];
}

export type VersionDiffType = 'text' | 'lookup';

export interface IVersionDiff {
  /** Friendly field label (e.g., "Passenger Notes"). */
  field: string;
  type: VersionDiffType;
  /** Plain-text old value — only present for type === 'text'. */
  oldText?: string;
  /** Plain-text new value — only present for type === 'text'. */
  newText?: string;
}

/**
 * Compute the list of fields that actually changed between two versions of
 * the same row. Returns an empty array when the versions are visibly identical.
 *
 * Used by the per-customer Change History view to render a timeline of
 * meaningful edits, skipping versions that are effectively no-ops (HTML-only
 * diffs, lookup ID unchanged).
 */
export function computeChangesBetweenVersions(
  newer: Record<string, unknown>,
  older: Record<string, unknown>,
  sourceList: NotificationSourceList
): IVersionDiff[] {
  const result: IVersionDiff[] = [];

  // Text fields. Iterate the field map and dedupe by internal name (some
  // friendly-label aliases share an internal name — keep just the first one).
  const fieldMap = getFieldMap(sourceList);
  const seen = new Set<string>();
  for (const label of Object.keys(fieldMap)) {
    const internalName = fieldMap[label];
    if (seen.has(internalName)) continue;
    seen.add(internalName);

    const newerRaw = readVersionField(newer, internalName);
    const olderRaw = readVersionField(older, internalName);
    const newerText = typeof newerRaw === 'string' ? htmlToPlainText(newerRaw).trim() : '';
    const olderText = typeof olderRaw === 'string' ? htmlToPlainText(olderRaw).trim() : '';

    if (newerText !== olderText) {
      result.push({ field: label, type: 'text', oldText: olderText, newText: newerText });
    }
  }

  // Lookup fields — compare the lookup ID column. Only meaningful for PB lists.
  if (sourceList === 'ProtocolBook') {
    const lookupMap = getLookupMap(sourceList);
    const seenLookups = new Set<string>();
    for (const label of Object.keys(lookupMap)) {
      const internalName = lookupMap[label];
      if (seenLookups.has(internalName)) continue;
      seenLookups.add(internalName);

      const idColumn = `${internalName}Id`;
      const newerId = readVersionField(newer, idColumn);
      const olderId = readVersionField(older, idColumn);
      if (JSON.stringify(newerId) !== JSON.stringify(olderId)) {
        result.push({ field: label, type: 'lookup' });
      }
    }
  }

  return result;
}

/**
 * Filter the raw ChangedFields string (PA's list of every field SP detected as
 * changed) down to only the fields whose value actually changed.
 *
 * Removes "phantom" labels in two cases:
 *   - Text fields whose plain-text content didn't differ from the previous
 *     version (rich-text save quirk where invisible HTML/encoding diffs
 *     trigger HasColumnChanged but nothing visible changed)
 *   - Lookup fields whose ID didn't differ from the previous version (saving
 *     a row sometimes flags HasColumnChanged on lookups even when their target
 *     wasn't reassigned)
 *
 * Conservative: when we can't compare (no current/previous version, no
 * snapshot content for a label), we keep the label.
 */
export function filterRealChangedFields(
  changedFieldsRaw: string,
  newSnapshot: string | null,
  sourceList: NotificationSourceList,
  previousVersion: Record<string, unknown> | null,
  currentVersion: Record<string, unknown> | null = null
): string {
  const allLabels = (changedFieldsRaw || '').split(', ').map(s => s.trim()).filter(Boolean);
  if (allLabels.length === 0) return '';
  if (!previousVersion) return changedFieldsRaw;

  const phantomLabels = new Set<string>();

  // Text-field phantoms: section content matches the previous version
  if (newSnapshot) {
    const sections = parseSnapshotSections(newSnapshot, sourceList);
    for (const section of sections) {
      if (!section.label) continue;
      const oldValue = getOldValueForSection(section.label, sourceList, previousVersion);
      if (oldValue !== null && oldValue === section.value) {
        phantomLabels.add(section.label);
      }
    }
  }

  // Lookup-field phantoms: lookup ID matches between current and previous.
  // Needs the current version to compare against — if we don't have it, skip
  // (caller will fall back to keeping the labels).
  if (currentVersion) {
    const lookupMap = getLookupMap(sourceList);
    for (const label of allLabels) {
      const internalName = lookupMap[label];
      if (!internalName) continue;
      const idColumn = `${internalName}Id`;
      const currentId = readVersionField(currentVersion, idColumn);
      const previousId = readVersionField(previousVersion, idColumn);
      // JSON-stringify handles both scalar IDs and arrays (multi-value lookups)
      if (JSON.stringify(currentId) === JSON.stringify(previousId)) {
        phantomLabels.add(label);
      }
    }
  }

  return allLabels.filter(label => !phantomLabels.has(label)).join(', ');
}
