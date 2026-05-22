/**
 * Shared display helpers used wherever an employee is rendered as an
 * initials avatar with an accent colour — Employee Directory cards,
 * the CX Hub team list, etc. Keep the rendering visually consistent
 * across surfaces by having every caller derive initials/accents the
 * same way from the same data.
 */

/** WCAG-safe brand accent colours, paired with white text. */
const ACCENT_PALETTE: readonly string[] = [
  '#1F4C7F', // primary blue       — 8.71:1 on white
  '#187389', // blue-accessible    — 5.45:1
  '#8A6A0C', // gold-accessible    — 5.09:1
  '#9B2C2C', // red                — 7.51:1
  '#4A5568', // slate              — 7.51:1
  '#262931', // dark navy          — 14.54:1
  '#2E7D32', // green
];

/**
 * Deterministic hash → palette index. Same input string always picks
 * the same colour, which keeps a person's avatar colour stable across
 * renders and views (directory card → CX hub list → detail header).
 */
export function pickAccentFromString(seed: string | undefined | null): string {
  if (!seed) return ACCENT_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return ACCENT_PALETTE[hash % ACCENT_PALETTE.length];
}

/** Two-letter avatar text from a full name. Falls back to '?' if empty. */
export function getEmployeeInitials(name: string | undefined | null): string {
  if (!name) return '?';
  const words = name.trim().split(/\s+/);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
