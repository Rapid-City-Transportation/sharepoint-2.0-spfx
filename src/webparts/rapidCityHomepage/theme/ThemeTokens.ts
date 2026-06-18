/**
 * Theme tokens for Rapid City Transportation Hub.
 *
 * Brand palette (2025 refresh):
 *   Light Gray   : #F8F8F8  (surface / background)
 *   Light Blue   : #62A9B8  (accent / decorative: low contrast on white, use on dark bg only)
 *   Primary Blue : #1F4C7F  (primary interactive: 8.71:1 on white, AAA)
 *   Dark Navy    : #262931  (darkest / footer: 14.54:1 on white, AAA)
 *   Gold Accent  : #D29F1C  (buttons / highlights: dark text on gold for AA)
 *
 * WCAG 2.1 / AODA compliance:
 *   - All interactive colour tokens meet AA (4.5:1 normal text, 3:1 UI components).
 *   - Primary Blue and Dark Navy meet AAA (7:1+) on white.
 *   - blueAccessible (#187389) replaces raw Light Blue for interactive use (~5.45:1 on white).
 *   - goldAccessible (#8A6A0C) replaces raw Gold for text on light backgrounds (~5.09:1).
 *   - Gold buttons use Dark Navy text (#262931) on Gold bg (#D29F1C): 6.06:1, AA.
 *
 * Use getThemeCssVariables() to inject tokens as CSS custom properties into the
 * web part root element so all child SCSS modules can consume var(--rct-*).
 */

// ─── Brand color constants (read-only reference) ─────────────────────────────
export const RCT_BRAND = {
  /** Light Gray: surface / background. */
  lightGray: '#F8F8F8',
  /** Light Blue: visual brand accent; use blueAccessible for interactive. */
  lightBlue: '#62A9B8',
  /** Primary Blue: primary interactive dark colour; AAA on white. */
  primaryBlue: '#1F4C7F',
  /** Dark Navy: darkest tone; footer, darkest sections. */
  darkNavy: '#262931',
  /** Gold Accent: buttons, highlights; use with dark text. */
  gold: '#D29F1C',
} as const;

// ─── IThemeTokens interface ───────────────────────────────────────────────────
export interface IThemeTokens {
  // Primary interactive colours
  primary: string;
  primaryHover: string;
  primaryActive: string;
  secondary: string;
  secondaryHover: string;
  secondaryActive: string;

  // Brand accent colours
  brandGold: string;
  brandBlue: string;
  /** Darkened gold (#8A6A0C) safe for text on white backgrounds (~5.09:1). */
  goldAccessible: string;
  /** Darkened light blue (#187389) safe for interactive elements on white (~5.45:1). */
  blueAccessible: string;

  // Gold button variants
  goldHover: string;
  goldActive: string;
  /** Light gold (#E8B832) for text/icons on dark backgrounds. */
  goldLight: string;

  // Backgrounds
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceDark: string;
  surfaceMidnight: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textInverse: string;

  // Borders
  border: string;
  borderStrong: string;

  // State / semantic
  accentPositive: string;
  accentNegative: string;
  accentWarning: string;
  positiveBg: string;
  negativeBg: string;
  warningBg: string;

  // Spacing (8-pt grid)
  spacingUnit: number;

  // Shape
  borderRadius: string;
  borderRadiusLg: string;

  // Focus ring
  focusOutline: string;
  focusOffset: string;
}

// ─── Default (RCT brand) theme ────────────────────────────────────────────────
export const defaultTheme: IThemeTokens = {
  // Primary interactive: Primary Blue (#1F4C7F), 8.71:1 on white, AAA
  primary: '#1F4C7F',
  primaryHover: '#173B62',
  primaryActive: '#112E4D',

  // Secondary interactive: Accessible Light Blue (#187389), ~5.45:1 on white, AA
  secondary: '#187389',
  secondaryHover: '#126070',
  secondaryActive: '#0E4D5A',

  // Brand colours
  brandGold: '#D29F1C',
  brandBlue: '#62A9B8',
  goldAccessible: '#8A6A0C',
  blueAccessible: '#187389',

  // Gold button states: dark text (#262931) on gold bg, 6.06:1, AA
  goldHover: '#C09118',
  goldActive: '#B8890F',
  goldLight: '#E8B832',

  // Backgrounds
  background: '#FFFFFF',
  surface: '#F8F8F8',
  surfaceAlt: '#EFF1F3',
  surfaceDark: '#1F4C7F',
  surfaceMidnight: '#262931',

  // Text: all meet AA+ on their intended backgrounds
  textPrimary: '#262931',    // 14.54:1 on white, AAA
  textSecondary: '#4A5568',  // ~7.51:1 on white, AAA
  textInverse: '#FFFFFF',    // for use on dark bg tokens

  // Borders
  border: '#D0D5DD',
  borderStrong: '#1F4C7F',

  // Semantic state colours: all AA-accessible on white/light bg
  accentPositive: '#1A6B1A',  // green text on white: ~6.8:1
  accentNegative: '#A4262C',  // red text on white: ~5.9:1
  accentWarning: '#7A4F00',   // amber text on white: ~7.4:1
  positiveBg: '#E8F5E8',
  negativeBg: '#FFF0F1',
  warningBg: '#FFF8E6',

  spacingUnit: 8,
  borderRadius: '4px',
  borderRadiusLg: '8px',

  // Focus ring: Primary Blue for visibility on light surfaces
  focusOutline: '3px solid #1F4C7F',
  focusOffset: '3px',
};

// ─── CSS custom-property map ──────────────────────────────────────────────────
export function getThemeCssVariables(tokens: IThemeTokens): Record<string, string> {
  return {
    // Primary
    '--rct-primary':        tokens.primary,
    '--rct-primary-hover':  tokens.primaryHover,
    '--rct-primary-active': tokens.primaryActive,
    '--rct-secondary':        tokens.secondary,
    '--rct-secondary-hover':  tokens.secondaryHover,
    '--rct-secondary-active': tokens.secondaryActive,

    // Brand
    '--rct-brand-gold':       tokens.brandGold,
    '--rct-brand-blue':       tokens.brandBlue,
    '--rct-gold-accessible':  tokens.goldAccessible,
    '--rct-blue-accessible':  tokens.blueAccessible,

    // Gold button variants
    '--rct-gold-hover':  tokens.goldHover,
    '--rct-gold-active': tokens.goldActive,
    '--rct-gold-light':  tokens.goldLight,

    // Backgrounds
    '--rct-background':        tokens.background,
    '--rct-surface':           tokens.surface,
    '--rct-surface-alt':       tokens.surfaceAlt,
    '--rct-surface-dark':      tokens.surfaceDark,
    '--rct-surface-midnight':  tokens.surfaceMidnight,

    // Text
    '--rct-text-primary':   tokens.textPrimary,
    '--rct-text-secondary': tokens.textSecondary,
    '--rct-text-inverse':   tokens.textInverse,

    // Borders
    '--rct-border':        tokens.border,
    '--rct-border-strong': tokens.borderStrong,

    // Semantic
    '--rct-accent-positive': tokens.accentPositive,
    '--rct-accent-negative': tokens.accentNegative,
    '--rct-accent-warning':  tokens.accentWarning,
    '--rct-positive-bg':     tokens.positiveBg,
    '--rct-negative-bg':     tokens.negativeBg,
    '--rct-warning-bg':      tokens.warningBg,

    // Spacing (8-pt grid)
    '--rct-spacing-unit': `${tokens.spacingUnit}px`,
    '--rct-spacing-xs':   `${tokens.spacingUnit / 2}px`,
    '--rct-spacing-sm':   `${tokens.spacingUnit}px`,
    '--rct-spacing-md':   `${tokens.spacingUnit * 2}px`,
    '--rct-spacing-lg':   `${tokens.spacingUnit * 3}px`,
    '--rct-spacing-xl':   `${tokens.spacingUnit * 4}px`,
    '--rct-spacing-2xl':  `${tokens.spacingUnit * 6}px`,

    // Shape
    '--rct-border-radius':    tokens.borderRadius,
    '--rct-border-radius-lg': tokens.borderRadiusLg,

    // Focus
    '--rct-focus-outline': tokens.focusOutline,
    '--rct-focus-offset':  tokens.focusOffset,

    // Shadows (derived: dark navy tone)
    '--rct-shadow-sm': '0 1px 3px rgba(38, 41, 49, 0.08)',
    '--rct-shadow-md': '0 4px 12px rgba(38, 41, 49, 0.12)',
    '--rct-shadow-lg': '0 8px 24px rgba(38, 41, 49, 0.16)',

    // Transition
    '--rct-transition':        '150ms ease',
    '--rct-transition-medium': '250ms ease',
  } as Record<string, string>;
}
