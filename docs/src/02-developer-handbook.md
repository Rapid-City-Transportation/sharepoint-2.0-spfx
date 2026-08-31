# Developer Handbook

Everything you need to work on COMPASS day to day: environment setup, the build, the conventions we hold each other to, and step-by-step recipes for the common tasks. The Architecture Overview explains why things are shaped this way; this doc is the how.

## Getting set up

1. Install Node 16.13+ or 18.17+. Nothing else works: Node 17, 19, and 20+ fail `npm install` because SPFx 1.18 checks the engines field. If you juggle Node versions, use nvm-windows and switch before touching this repo.
2. `npm install` from the repo root. First install takes a while; SPFx pulls a lot.
3. Copy the workbench URL for your tenant into `config/serve.json`. This file is personal: it points at whatever site you test against, and it must never be committed with your tenant URL in it.
4. `npm run serve` starts the local dev loop against the hosted workbench.

There is no emulator and no local SharePoint. You develop against the hosted workbench and you sanity-check responsive behaviour structurally (correct media queries, no fixed widths) rather than by device testing on every change.

## Day-to-day commands

| Command | What it does |
|---|---|
| `npm run serve` | Dev loop against the hosted workbench |
| `npm run build` | Debug build: sass, lint, tsc, webpack |
| `npm run build:ship` | Production bundle for App Catalog deploy |
| `npm run clean` | gulp clean |
| `npm test` | gulp test |

Two things about the build that will save you an afternoon:

- **The heap flag is load-bearing.** The npm scripts run Node with `--max-old-space-size=8192` because webpack runs out of memory on this bundle without it. If you add a new build script, carry the flag over.
- **Know what success looks like.** A green build prints a `Total duration:` line and exits 0. If you pipe build output through `tail` or similar, you can hide a failure from yourself; check the exit code or look for that line.

## Build gotchas we have already hit

These are not hypothetical; each one has cost real time.

**Ship builds fail on any stderr output.** `gulp bundle --ship` treats a single line on stderr as a failed task. The recurring offender is Browserslist complaining that caniuse-lite is stale, which starts happening roughly every six months. The fix is one command: `npx update-browserslist-db@latest`, then commit the `package-lock.json` change. If a ship build fails with "task wrote output to stderr" and the debug build is green, this is almost certainly it.

**Generated files are generated.** Every `*.module.scss` has a sibling `*.module.scss.ts` produced by the build. Never hand-edit the `.ts` side; the build regenerates it, and the class-name hashes change whenever the SCSS does. Commit both files together.

**The TypeScript lib target predates ES2017.** String methods like `padStart` and `padEnd` do not compile (TS2550). Write the two-line helper instead of fighting the lib config.

**A stale package looks like a broken deploy.** The App Catalog serves whatever `.sppkg` was uploaded last. If your change is on main but the page shows old behaviour, rebuild and re-upload before debugging: `npm run build:ship`, then `npx gulp package-solution --ship`, then upload `sharepoint/solution/rapid-city-transportation-hub.sppkg`. Users may also need a hard refresh (Ctrl+F5) to drop the cached bundle.

## Project conventions

Follow the sibling, not your instincts. Before writing anything new, open the equivalent file in another web part and match it.

- **Web part shape**: `XxxWebPart.ts` entry, `components/Xxx.tsx` default-exported React root, `components/IXxxProps.ts`. Editable text like hero titles is a web part property surfaced in the property pane, not a hardcoded string.
- **Data access**: one SPFI singleton per site in `services/spConfig.ts` (`initializeSP` / `getSP`), one `*Service.ts` per list, all list titles and internal field names centralised in `services/fieldNames.ts`. Components read through `hooks/use*.ts`, never from a service directly.
- **Styling**: SCSS modules. Every module starts with `@import '../../theme/themeVariables.module.scss';` and component modules also import `_rct-components`. Colours are `var(--rct-*)`, never raw hex. A `:global` selector is a smell; justify it or remove it.
- **No new libraries.** In particular no Fluent UI v9 and no toast library. Status messages render inline with `aria-live`.
- **DRY, pragmatically.** Three similar lines are fine. Extract on the third or fourth duplication, not the second, and never on speculation.

## Accessibility: AODA is a legal requirement

We operate in Ontario, so WCAG 2.1 Level AA is law, not a preference. Run this checklist mentally before calling any UI work done:

- Semantic HTML first. `<button>`, `<a>`, `<nav>`, `<ul>`, headings in order. A clickable `<div>` is a bug, full stop.
- Everything reachable by Tab and operable with Enter or Space. A handler on a non-button needs `tabIndex={0}`, a `role`, and an `onKeyDown`.
- Icon-only buttons get `aria-label`. Dialogs point `aria-labelledby` at their title. Decorative icons are marked `aria-hidden="true"`. Status regions use `aria-live`.
- Text contrast 4.5:1 or better. Use the accessible token variants (below), not raw brand hex, for text on white or on brand blue.
- Never convey information by colour alone. A status badge carries a text label; the coloured dot is decoration.
- Never remove a focus indicator. The shared focus mixin in `_rct-components.scss` exists so you do not have to invent one.
- When something unmounts the focused element (closing a viewer, a successful submit), move focus somewhere sensible instead of letting it fall to `<body>`.

## Responsive rules

The contract on this project: approved desktop layouts do not change, and every page must work on a phone. Those two constraints resolve the same way every time:

- Mobile fixes go inside `@media (max-width: ...)` blocks. Standard breakpoints are 640px, with 600, 480, and 400 for finer steps, and 1100px where hub sidebars collapse.
- The only base-style edits allowed are invisible overflow guards: `min-width: 0` on flex or grid children, `overflow-wrap: anywhere`, `max-width: 100%` on media.
- Touch targets are 44px minimum on phones. Text inputs use `font-size: 16px` so iOS does not zoom the page on focus.
- No separate mobile components, ever. One component, breakpoints on it. If the JSX genuinely cannot serve both, share the logic through a hook and duplicate only the shell.
- Before declaring a page done, walk it at 375 pixels wide in your head (iPhone SE), then verify structurally: build green, and the diff shows your changes inside media queries.
- Fluent v8 dialogs and callouts size themselves from JS props (`minWidth`, `directionalHint`), not CSS. Making those responsive is a small `.tsx` change or a `:global(.ms-Dialog-main)` override in a media query.

## Brand colours

Primary brand is blue and gold. The old teal and green tokens are gone on purpose; do not reintroduce them.

| Token | Hex | Use |
|---|---|---|
| `--rct-primary` | #1F4C7F | Primary blue, AAA on white |
| `--rct-brand-gold` | #D29F1C | Primary button background |
| `--rct-text-primary` | #262931 | Darkest text; button text on gold |
| `--rct-blue-accessible` | #187389 | Links and interactive accents (AA) |
| `--rct-gold-accessible` | #8A6A0C | Gold text on light backgrounds (AA) |
| `--rct-gold-light` | #E8B832 | Gold text on dark backgrounds (AA) |
| `--rct-text-secondary` | #4A5568 | Secondary body text (AAA) |
| `--rct-brand-blue` | #62A9B8 | Light Blue, decorative only (2.65:1) |
| (surface) | #F8F8F8 | Page and card background |

Buttons: primary is gold background with navy text (6.06:1), secondary is blue background with white text. Watch the naming trap: `--rct-brand-blue` is the decorative light blue, not the primary. Anything at 2.65:1 must never carry information by itself.

## Comments and user-facing strings

Comments explain why, never what. If deleting a comment would not confuse the next reader, it should not exist. The repo was scrubbed of narrating comments deliberately; keep it that way. Function and class JSDoc is welcome where the behaviour is not obvious from the signature.

No em-dashes or en-dashes in anything a user sees: rendered text, aria-labels, property pane labels. Use a hyphen or restructure with a colon.

## Recipes

**Add a web part.** Copy a sibling folder (or scaffold with `yo @microsoft/sharepoint` and reshape to match). Register the bundle in `config/config.json`; the build does not pick up web parts automatically. Import the shared theme SCSS. Reuse `Navigation` with the right `activePage` and `Footer` instead of building chrome. In `onInit()`, initialise every SPFI your page reads through, including `initializeFeedbackSP` if the page has a Footer.

**Add a list-backed data source.** Site URL in `services/spConfig.ts`; list title and internal field names in `services/fieldNames.ts`; a `*Service.ts` doing `getSP().web.lists.getByTitle(...)`; a `hooks/use*.ts` wrapping it; the component consumes the hook.

**Add a column to an existing list read.** Internal name into `fieldNames.ts`, into the service's `select(...)`, into the TypeScript model, then render it. Remember the column must actually exist on the SharePoint list too, and internal names rarely match display names (see the Data and Operations doc for the traps).

**Make a page mobile-ready.** See the responsive rules above. Media queries only; never touch approved desktop styles.

**Anything involving Power Automate.** Flows cannot be created or edited from this codebase. Write the trigger and ordered actions in plain English for whoever owns the Power Automate side, and record the outcome in the Operations doc once it exists.

## Git habits

Branch before committing; main gets fast-forwarded from reviewed branches. Small commits, one concern each, conventional-commit style subjects (`feat(cx-hub): ...`, `fix(nav): ...`). Never commit `config/serve.json` with a tenant URL, `.env`, or anything with a secret. No force pushes and no destructive git without agreeing it first.
