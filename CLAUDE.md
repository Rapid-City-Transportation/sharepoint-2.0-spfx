# Rapid City Transportation — SharePoint Homepage

SPFx solution containing the RCT intranet homepage and supporting web parts. This file briefs Claude Code on the project so conversations don't start cold.

## Stack

- **SPFx** 1.18.2 (Microsoft 365 / SharePoint Online)
- **React** 17.0.1
- **Fluent UI** 8.106.4 — do **not** suggest Fluent UI 9 / `@fluentui/react-components`, the entire codebase is on v8
- **TypeScript** 4.7.4 (rush-stack-compiler-4.7)
- **PnPjs** 3.26.0 for SharePoint data access
- **DOMPurify** 3.x for sanitizing any user-authored HTML before render
- **Node** 16.13+ or 18.17+ (engines field — Node 20 is not supported by this SPFx version)
- Build orchestrated by **Gulp** 4

## Commands

```
npm run serve        # local workbench / hosted workbench dev loop
npm run build        # debug bundle
npm run build:ship   # production bundle for App Catalog deploy
npm run clean        # gulp clean
npm test             # gulp test
```

Builds use `--max-old-space-size=8192` because the bundle is large enough to OOM Node otherwise — keep that flag on any new build script.

## Repository layout

```
src/webparts/
  rapidCityHomepage/        # main homepage (hero, nav, carousel, quick links, weather, feedback)
  customerContactCards/     # customer directory cards + detail view
  customerExperienceHub/    # CX team hub
  departmentPublicPage/     # public-facing department page
  employeeDirectory/        # employee directory + detail view
  teamLeadHub/              # team lead landing
  trainersHub/              # trainers landing
  trainingHub/              # training resources
src/webparts/rapidCityHomepage/theme/
  themeVariables.module.scss   # SCSS tokens (source of truth for component styles)
  _rct-components.scss         # shared component mixins / partials
  ThemeTokens.ts               # TS-side tokens injected as CSS custom props at React root
scripts/
  sharepoint-fetch-lists*/     # Python tooling that hits Microsoft Graph for list inspection
  sharepoint-graph-test/       # Graph API smoke tests
config/config.json             # SPFx bundle manifest — register every new web part here
```

Each web part follows the SPFx convention: `XxxWebPart.ts` (entry) → `components/Xxx.tsx` (React root) → child components in sibling folders.

## Styling conventions

- All SCSS modules **must** start with `@import '../../theme/themeVariables.module.scss';` to pull in shared tokens
- Component SCSS additionally pulls `@import '../../theme/_rct-components';` for shared layout/utility styles
- CSS Modules scope class names — global selectors are a smell; prefer module classes
- CSS custom properties are injected at the React root via `getThemeCssVariables()`; reference them as `var(--rct-*)` in SCSS, not raw hex
- Primary brand is **blue + gold**, not the old teal/green palette — see brand color table below

### Brand colors (2025 refresh)

| Token                    | Hex     | Use                                  |
|--------------------------|---------|--------------------------------------|
| `--rct-brand-blue`       | #1F4C7F | Primary blue (AAA on white)          |
| `--rct-brand-gold`       | #D29F1C | Primary button background            |
| `--rct-brand-navy`       | #262931 | Darkest text / button text on gold   |
| `--rct-blue-accessible`  | #187389 | Links / interactive accents (AA)     |
| `--rct-gold-accessible`  | #8A6A0C | Gold text on light backgrounds (AA)  |
| `--rct-gold-light`       | #E8B832 | Gold text on dark backgrounds (AA)   |
| `--rct-text-secondary`   | #4A5568 | Secondary body text (AAA)            |
| Light gray surface       | #F8F8F8 | Page/card background                 |

Button conventions:
- **Primary button** = gold background (`--rct-brand-gold`) + navy text (`--rct-brand-navy`) → 6.06:1 AA
- **Secondary button** = blue background (`--rct-brand-blue`) + white text

Old variable names (`--rct-brand-green`, `--rct-brand-teal`) are gone — do not reintroduce.

## Adding a new web part

1. Scaffold with `yo @microsoft/sharepoint` or copy an existing web part folder
2. Register the bundle in `config/config.json` under `bundles`
3. Import shared theme SCSS (see Styling conventions)
4. Reuse `Navigation` from `rapidCityHomepage/components/Navigation` with an appropriate `activePage` prop instead of building a new nav
5. Use Fluent UI 8 primitives and the existing theme tokens — don't pull in new component libraries

## Data access

- SharePoint list / Graph reads go through **PnPjs** (`@pnp/sp`), not raw REST or `SPHttpClient` directly
- Any HTML coming from SharePoint rich-text fields must be passed through **DOMPurify** before `dangerouslySetInnerHTML`
- Python scripts under `scripts/` are for ad-hoc Graph testing and list-schema inspection — they are not part of the SPFx build

## Accessibility

- Contrast ratios above are the floor — pick variants from the accessible token row when text sits on white or on the brand blue
- Decorative-only color (e.g., the original light blue #62A9B8 at 2.65:1) must not carry information by itself
- All interactive elements need visible focus styles; use the shared focus mixin in `_rct-components.scss`

## Gotchas

- Node 17, 19, 20+ will fail the install — match the `engines` field
- Bundle OOMs without the 8 GB heap flag; don't strip it from the npm scripts
- Fluent UI v9 is **not** installed and should not be added — mixing v8 and v9 is a known compatibility headache
- `gulp serve` against the hosted workbench needs a tenant URL in `config/serve.json` (each dev sets their own; don't commit personal tenant URLs)
