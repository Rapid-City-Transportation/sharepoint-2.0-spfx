# Rapid City Transportation - SharePoint Intranet

Canonical working notes for Claude sessions on this project. Read this before starting; it captures the things you cannot derive from the code in a few seconds.

## Project overview

SPFx solution for the Rapid City Transportation (RCT) intranet on Microsoft 365 / SharePoint Online: a public homepage plus a set of department hubs, a customer directory, and shared tools used by RCT staff (dispatchers, customer experience agents, team leads, trainers, managers). The app is used in Ontario, so AODA / WCAG 2.1 Level AA compliance is a legal expectation, not a nice-to-have.

## Stack

- **SPFx** 1.18.2 (Microsoft 365 / SharePoint Online)
- **React** 17.0.1
- **Fluent UI** 8.106.4. Do NOT suggest Fluent UI 9 / `@fluentui/react-components`; the entire codebase is on v8 and mixing v8 + v9 is a known compatibility headache.
- **TypeScript** 4.7.4 (rush-stack-compiler-4.7)
- **PnPjs** 3.26.0 (`@pnp/sp`) for SharePoint data access
- **DOMPurify** 3.x for sanitizing user-authored HTML before render
- **Node** 16.13+ or 18.17+ (see `engines`; Node 17/19/20+ will fail install and are not supported by this SPFx version)
- Build orchestrated by **Gulp** 4

## Commands

```
npm run serve        # local workbench / hosted workbench dev loop
npm run build        # debug bundle (sass -> lint -> tsc -> webpack)
npm run build:ship   # production bundle for App Catalog deploy
npm run clean        # gulp clean
npm test             # gulp test
```

Builds use `--max-old-space-size=8192` because the bundle is large enough to OOM Node otherwise. Keep that flag on any new build script. There is no device emulator here; `serve` against the hosted workbench needs a tenant URL in `config/serve.json` (each dev sets their own).

## Architecture and data flow

Each web part is a self-contained SPFx client-side web part: `XxxWebPart.ts` (entry: `onInit()` initializes data, `render()` mounts React) to `components/Xxx.tsx` (React root) to child components in sibling folders.

- **Data access is PnPjs only** (`@pnp/sp`), never raw REST or `SPHttpClient`. Each web part owns a per-site SPFI singleton in `services/spConfig.ts`, created once in `onInit()` via `initializeSP(this.context)`. Auth is delegated: `spfi(SITE_URL).using(SPFx(context))` runs as the signed-in user, so reads/writes obey that user's list permissions.
- **Graph** is used in exactly one place (Department page group gating), via `context.msGraphClientFactory.getClient('3')`.
- **External**: weather from Open-Meteo (`api.open-meteo.com/v1/forecast`, no API key), cached in `localStorage` with a TTL.
- There is **no Power Automate, no Azure Function, and no app-only auth** in the repo. Any HTML from SharePoint rich-text fields is run through DOMPurify before `dangerouslySetInnerHTML`.

```
WebPart.onInit()
  -> services/spConfig.initializeSP(context)      per-site SPFI singleton (delegated, runs as user)
components/Xxx.tsx (React root, theme vars injected at root)
  -> hooks/ (useEmployees, useSearchCustomers, useNotifications, useWeather, ...)
       -> services/*Service.ts  ->  sp.web.lists.getByTitle(LIST).items   (SharePoint lists)
       -> FeedbackService       ->  SiteFeedback list
       -> weatherService        ->  api.open-meteo.com  (cached in localStorage)
  -> Graph (Department page only): POST /me/checkMemberGroups  (AAD group gating)
Shared chrome on every page: Navigation + Footer + ThemeTokens (all from rapidCityHomepage)
```

## Repository structure

```
src/webparts/
  rapidCityHomepage/      # home page + ALL shared chrome: Navigation, Footer, Hero,
                          #   BannerCarousel, DailyHighlight, QuickLinks, WeatherWidget,
                          #   FeedbackModal, theme/
  customerContactCards/   # customer directory cards, detail view, drawers, notifications
  customerExperienceHub/  # CX team hub (private)
  sprqHub/                # SPRQ hub for CX (private); linked from the CX Hub
  teamLeadHub/            # team lead landing (private)
  trainersHub/            # trainers landing (private) + QuizzesPanel
  trainingHub/            # public training resources landing
  departmentPublicPage/   # multi-tenant public department page (one bundle, many depts)
  employeeDirectory/      # employee directory + detail view
src/webparts/rapidCityHomepage/theme/
  themeVariables.module.scss  # SCSS tokens (source of truth for component styles)
  _rct-components.scss        # shared component mixins / partials (focus mixin lives here)
  ThemeTokens.ts              # TS tokens injected as CSS custom props at the React root
scripts/                  # ad-hoc Python (Graph/list inspection). NOT part of the SPFx build.
config/config.json        # SPFx bundle manifest. Register every new web part here.
config/serve.json         # personal tenant workbench URL. Do NOT commit personal URLs.
```

Within a web part: `services/` (PnP + business logic), `hooks/` (React data hooks), `components/` (UI), `models/` or `components/types.ts` (interfaces).

## Pages / hubs inventory

| Page / hub | Code root | Page URL (SitePages) | Cross-page dependencies |
|---|---|---|---|
| Home | `rapidCityHomepage/` | `/sites/HomeTest` | owns shared Navigation/Footer/theme |
| Contact Cards | `customerContactCards/` | `/SitePages/ContactCards.aspx` | Navigation search + NotificationBell live here |
| CX Hub (private) | `customerExperienceHub/` | dept hub | reads `employeeDirectory` (`useEmployees`); links to SPRQ + Team Lead hubs |
| SPRQ Hub (private) | `sprqHub/` | `/SitePages/SPRQHub.aspx` | reached from the CX Hub "SPRQ Hub" tile |
| Team Lead Hub (private) | `teamLeadHub/` | `/SitePages/TeamLeadHub.aspx` | reached from CX Hub |
| Trainers Hub (private) | `trainersHub/` | `/SitePages/TrainersHub.aspx` | has `QuizzesPanel` |
| Training Hub (public) | `trainingHub/` | `/SitePages/TrainingHub.aspx` | linked from nav Employee Support |
| Department Public Page | `departmentPublicPage/` | `/SitePages/DeptHub-*.aspx` | `departmentKey` selects config; Graph group gating |
| Employee Directory | `employeeDirectory/` | `/sites/Management/SitePages/EmployeeDirectory.aspx` | Employee Highlight list (root site) |

Cross-page coupling to remember:
- **`Navigation` (in rapidCityHomepage) imports from `customerContactCards`** (`useSearchCustomers`, `ICustomer`, `NotificationBell`) and from `WeatherWidget`. Every page that renders Navigation transitively depends on Contact Cards services.
- **`Footer` -> `FeedbackModal` -> `FeedbackService` -> SiteFeedback list.** FeedbackService reuses the Contact Cards SPFI (same site), so any web part with a Footer must initialize that SP config in `onInit()` (the hubs call `initializeFeedbackSP`). If feedback submit fails, check that init.
- The hub pages (CX, SPRQ, Trainers, Team Lead, Training) share the same layout DNA: full-bleed Navigation, a grid `main + sidebar` that collapses at 1100px, a dark "Tools" panel, and a Footer. `trainersHub` or `sprqHub` is the cleanest reference.

## SharePoint / Microsoft 365 specifics

**Sites** (all under `https://rapidcitytransport.sharepoint.com`):

| Site | Holds |
|---|---|
| `/` (root) | Employee Highlight list |
| `/sites/Management` | Employee Tracker list |
| `/sites/IntranetRedesignSharepoint20` | Contact Cards data + SiteFeedback (the "Protocol Book" site) |
| `/sites/CSQCLeads` | Trainee Progress + TL Assignments (embedded via iframe in hubs, not PnP) |

**Lists** (titles are exact; defined as `LIST_TITLE` in each web part's `services/fieldNames.ts`):

| List title | Site | Access | Used by |
|---|---|---|---|
| `Protocol Book Draft2` | IntranetRedesign | read | Contact Cards protocol book |
| `PB Instruction Blocks Test` | IntranetRedesign | read | Contact Cards instruction blocks |
| `SiteResources` | IntranetRedesign | read | Contact Cards resources drawer |
| `EmailTemplates` | IntranetRedesign | read | Contact Cards email templates drawer |
| `ContactCardNotifications` | IntranetRedesign | read/write | NotificationBell |
| `ContactCardNotifReads` | IntranetRedesign | read/write | NotificationBell read-state |
| `SiteFeedback` | IntranetRedesign | write | Footer feedback modal (every page) |
| `Employee Highlight` | root | read | Employee Directory + CX Hub team section |
| `Employee Tracker` | /sites/Management | read | Department page leaders |

`SiteFeedback` columns (created manually, see `FeedbackService.ts`): `Title` (page identifier), `Description` (multi-line), `Urgency` (Choice: Critical/High/Medium/Low), `SourcePage` (full URL, used to route to the page owner). For any other list's columns, read that web part's `services/fieldNames.ts` (internal names) and `fieldLabels.ts` (display names).

**Graph**: only `departmentPublicPage` uses it. `useDepartmentMembership` posts to `/me/checkMemberGroups` to gate the "View Department Resources" button by AAD group membership; it fails safe to hidden. Requires `GroupMember.Read.All` approved in **SharePoint Admin -> Advanced -> API access**.

**Permissions**: all data access is delegated (runs as the signed-in user). No app-only, no stored secrets. A page works for a user only if they have list access on the relevant site.

## Power Automate flows

**No Power Automate flows are referenced anywhere in this repo** (no flow IDs, webhook URLs, `logic.azure.com` calls, or environment manifests). Two integration points likely have flows behind them in the tenant that are NOT visible from the code:

- The **Passenger Feedback Form** (a Microsoft Form, URL hardcoded in `customerExperienceHub`) may trigger a flow on submit.
- The **SiteFeedback** list (`SourcePage` column exists "to route to the page owner") may have a flow that emails owners on new items.

**TODO: ask user** to confirm and document any flows (trigger, ordered actions, what they read/write, environment). Until then, treat flow behavior as unknown.

Claude **cannot create or edit Power Automate flows programmatically**. When a change involves a flow, write the change as plain-English steps (trigger, each action in order, fields/expressions) for the user to apply in the Power Automate portal, and offer to update this section once they confirm.

## Coding standards (always apply)

### AODA / WCAG 2.1 Level AA (legal requirement in Ontario)

Walk through this list in your head before declaring any UI task done:

- **Semantic HTML over styled divs.** Use `<button>`, `<a>`, `<nav>`, `<ul>/<li>`, headings in order. A clickable div is a bug.
- **Keyboard**: every interactive element reachable by Tab and operable with Enter/Space. If you must put a handler on a non-button, it needs `tabIndex={0}`, `role`, and an `onKeyDown` for Enter/Space, not just `onClick`.
- **Screen readers**: icon-only buttons need `aria-label`. Modals/dialogs are labelled by their title (`aria-labelledby`). Decorative icons get `aria-hidden="true"`. Status regions use `aria-live`.
- **Contrast >= 4.5:1** for text. Use the accessible token rows below, not raw brand hex, when text sits on white or on brand blue.
- **Never convey information by color alone** (status badges carry a text label, not just a color; the dot is decorative).
- **Never remove focus indicators.** Use the shared focus mixin in `_rct-components.scss` (`%focus-ring`). Do not set `outline: none` without a visible replacement.
- **Do not trap focus** in custom modals beyond standard dialog behavior.

### Responsive design (works on every device, mobile included)

Non-negotiable: it works AND the code stays clean. If a responsive fix doubles the code, the wrong tool is being used.

- **Mobile-first thinking, but the hard rule on THIS codebase is: a desktop layout that is already approved must not change.** Make mobile fixes inside `@media (max-width: ...)` blocks. Standard breakpoints: `640px` (phone), with `600 / 480 / 400px` for finer steps. The only edits allowed in base (non-media-query) styles are non-visual overflow guards: `min-width: 0` on flex/grid children, `overflow-wrap: anywhere`, `max-width: 100%` / `height: auto` on media.
- **No hardcoded widths** that cannot shrink. Collapse multi-column grids to 1 or 2 columns on phones.
- **Touch targets >= 44px** on phones. Inputs use `font-size: 16px` to stop iOS auto-zoom.
- **Never ship a separate `<MobileX>` component.** Use breakpoints on the existing one. If something genuinely cannot work in one component, share state via a hook and duplicate only the JSX shell, never the logic.
- Test at 375px (iPhone SE) in your head before declaring done. There is no device render locally; verify structurally with `npm run build` and a diff that confirms changes sit inside media queries.
- Fluent v8 `Dialog`/`Callout` size comes from JS props (`minWidth`, `directionalHint`), not CSS; making those responsive needs a small `.tsx` change or a media-query `:global(.ms-Dialog-main)` override.

### DRY, pragmatically

Three similar lines is fine. Extract on the third or fourth duplication, not the second. Do not introduce abstractions on speculation. **Match the existing pattern before inventing a new one** (look at a sibling web part first).

### Project-specific conventions

- **Web part shape**: `XxxWebPart.ts` (entry) + `components/Xxx.tsx` (default-exported React root) + `components/IXxxProps.ts`. Editable hero/banner text is a web part property (property pane), not hardcoded.
- **Data**: per-site SPFI singleton in `services/spConfig.ts` (`initializeSP`/`getSP`); one `*Service.ts` per list; list/field names centralized in `services/fieldNames.ts`. UI reads through a `hooks/use*.ts` hook, not directly from a service in the component.
- **Styling**: SCSS modules. Every module starts with `@import '../../theme/themeVariables.module.scss';` and component modules also `@import '../../theme/_rct-components';`. Reference colors as `var(--rct-*)`, never raw hex. CSS Modules scope class names; a global selector is a smell.
- **Generated files**: `*.module.scss.ts` are generated by the build. Do not hand-edit them (the build regenerates the class-name hashes).
- **No toast library**; status is shown inline / via Fluent components and `aria-live`.

### No em-dashes in user-facing strings

Use plain hyphens (`-`) or restructure with a colon. Em-dashes (and en-dashes) read as AI-generated and the user has explicitly flagged this. Applies to rendered text, aria-labels, and anything a person sees.

### Comments: only WHY, never WHAT

Identifiers explain what; comments explain only non-obvious why (a hidden constraint, a workaround, a subtle invariant). If deleting a comment would not confuse a reader, do not write it. The repo was recently scrubbed of iteration-era WHAT comments; keep it that way.

## Things to NOT do

- Do not force-push or run destructive git (`reset --hard`, `clean -fd`, branch deletion) without an explicit ask. Branch before committing on `main`.
- Do not commit secrets or personal config: `config/serve.json` (tenant URL), `.env`, `local.settings.json`.
- Do not add Fluent UI v9 or any new component/CSS library.
- Do not strip the `--max-old-space-size=8192` flag from build scripts.
- Do not bypass accessibility for styling convenience (removing focus rings, color-only status, click-handlers on divs).
- Do not change the desktop layout when doing responsive work (max-width queries only).
- Do not reintroduce the old palette tokens (`--rct-brand-green`, `--rct-brand-teal`, `--rct-teal-accessible`, `--rct-green-accessible`); they are gone on purpose.
- Do not hand-edit Power Automate (you cannot); describe the change in plain English instead.

## Common workflows

- **Add a web part**: scaffold with `yo @microsoft/sharepoint` or copy a sibling folder; register the bundle in `config/config.json`; import the shared theme SCSS; reuse `Navigation` (with the right `activePage`) and `Footer` instead of building new chrome; in `onInit()` call the relevant `initializeSP` (and `initializeFeedbackSP` if the page has a Footer).
- **Add a list-backed data source**: set the site URL in a `services/spConfig.ts`; add `LIST_TITLE` + internal field names to `services/fieldNames.ts`; add a `*Service.ts` that does `getSP().web.lists.getByTitle(...).items...`; expose it through a `hooks/use*.ts`; consume the hook in the component.
- **Add a list column**: add its internal name to `services/fieldNames.ts`, include it in the service `select(...)`, extend the TypeScript model/interface, then render it. Remember the column must also exist on the SharePoint list.
- **Make a page mobile-ready**: see Responsive design above. Add `@media (max-width: ...)` blocks; never touch base desktop rules except the allowed overflow guards.
- **Wire a new Power Automate trigger**: you cannot do this in code. Write the trigger + ordered actions in plain English for the user, and note which list/column or form drives it.

## Where to find things fast

- Standard card pattern: `customerContactCards/components/CustomerCard`
- Shared nav (and its `activePage` prop): `rapidCityHomepage/components/Navigation/Navigation.tsx`
- Footer + feedback flow: `rapidCityHomepage/components/Footer/` and `services/FeedbackService.ts`
- Theme tokens: TS at `rapidCityHomepage/theme/ThemeTokens.ts`, SCSS at `theme/themeVariables.module.scss`, focus mixin in `theme/_rct-components.scss`
- Hub layout reference (grid + sidebar + Tool Viewer): `trainersHub/` or `sprqHub/`
- PnP service + singleton pattern: any `services/spConfig.ts` plus a `*Service.ts`
- List + field names: `services/fieldNames.ts` in the relevant web part
- Graph group gating: `departmentPublicPage/components/DepartmentPublicPage.tsx` (`useDepartmentMembership`)
- Per-department config (accents, contact, group IDs, resource URLs): `departmentPublicPage/services/DepartmentConfig.ts`
- Bundle registration: `config/config.json`
- Responsive examples: the `@media (max-width: ...)` blocks at the bottom of each hub `*.module.scss`

## Styling conventions and brand colors

- SCSS modules must `@import` the theme variables (and `_rct-components` for shared layout/focus). Reference `var(--rct-*)`, not raw hex.
- CSS custom properties are injected at the React root via `getThemeCssVariables()`.
- Primary brand is **blue + gold**, not the old teal/green palette.

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
| Light gray surface       | #F8F8F8 | Page / card background               |

Button conventions:
- **Primary button** = gold background (`--rct-brand-gold`) + navy text (`--rct-brand-navy`) = 6.06:1 (AA)
- **Secondary button** = blue background (`--rct-brand-blue`) + white text

Decorative-only color (e.g. the original light blue #62A9B8 at 2.65:1) must never carry information by itself.

## Gotchas

- Node 17, 19, 20+ fail the install; match the `engines` field.
- Bundle OOMs without the 8 GB heap flag; do not strip it from the npm scripts.
- Fluent UI v9 is not installed and must not be added.
- `gulp serve` against the hosted workbench needs a tenant URL in `config/serve.json` (each dev sets their own; do not commit personal tenant URLs).
- `Navigation` depends on `customerContactCards`; a page that shows the nav but does not init that SP config will have a broken search/notification bell.
- Employee data moved: the directory now reads `Employee Highlight` on the root site, while the Department page still reads `Employee Tracker` on `/sites/Management`. Do not assume one list.
