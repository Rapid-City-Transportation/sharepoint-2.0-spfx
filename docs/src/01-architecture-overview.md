# Architecture Overview

This document explains how the COMPASS intranet is put together: what runs where, how data moves, and the design decisions you need to understand before changing anything. If you are new to the project, read this first, then the Developer Handbook. The Web Part Reference and the SharePoint Data and Operations doc are lookup material; nobody expects you to read those cover to cover.

## What this application is

COMPASS is the Rapid City Transportation intranet, built as a single SharePoint Framework (SPFx) solution deployed to our Microsoft 365 tenant. One package (`rapid-city-transportation-hub.sppkg`) contains every web part: the public homepage, the department hubs, the customer and vendor contact directories, the employee directory, and the support pages. Each SharePoint page hosts exactly one web part, and each web part is a full-page React application that brings its own copy of the shared navigation and footer.

That "one bundle, many pages" decision matters day to day. A deploy ships everything at once, so a fix to the CX Hub and a fix to Contact Cards land together, and the App Catalog only ever holds one package to keep track of. The flip side: if the deployed package is stale, every page is stale. When someone reports seeing old behaviour after a code change, check the package upload date in the App Catalog before you debug anything.

## The stack, and why it is pinned

| Piece | Version | Notes |
|---|---|---|
| SPFx | 1.18.2 | Dictates almost everything below |
| React | 17.0.1 | What SPFx 1.18 supports; do not upgrade independently |
| Fluent UI | 8.106.4 | v8 only; never add `@fluentui/react-components` (v9) |
| TypeScript | 4.7.4 | Via rush-stack-compiler-4.7 |
| PnPjs | 3.26.0 | All SharePoint data access |
| DOMPurify | 3.x | Sanitises any list-sourced HTML before render |
| Node | 16.13+ or 18.17+ | 17, 19, and 20+ fail the install. Not negotiable |
| Gulp | 4 | SPFx build orchestration |

These versions move together or not at all. SPFx pins the TypeScript and React versions it can compile against, and Fluent v8 is what the entire component layer is written in. Mixing Fluent v8 and v9 on one page causes styling and focus-management conflicts, so the rule is simple: v9 never gets installed. If a component you want only exists in v9, build it yourself with v8 primitives.

## How a page is put together

Every web part follows the same shape, and once you have read one you have read them all:

```
XxxWebPart.ts          SPFx entry point. onInit() wires up data access,
                       render() mounts the React root.
components/Xxx.tsx     The React root. Injects theme CSS variables,
                       renders Navigation, the page content, and Footer.
components/...         Child components, one folder per feature.
hooks/use*.ts          Data hooks. Components never call services directly.
services/*.ts          PnPjs calls, list names, business logic.
models/ or types.ts    Interfaces.
```

The flow at runtime:

```
WebPart.onInit()
  -> services/spConfig.initializeSP(context)     per-site SPFI singleton
components/Xxx.tsx                               theme vars injected at root
  -> hooks (useEmployees, useVendors, ...)
      -> services/*Service.ts
          -> sp.web.lists.getByTitle(...)        SharePoint lists via PnPjs
  -> Navigation + Footer                         shared chrome on every page
```

Two rules fall out of this. First, a component that needs data consumes a hook; the hook calls a service; the service is the only place that knows list and field names. Second, every site a web part reads from needs its SPFI singleton initialised in `onInit()`. Forgetting that second one is the classic new-page bug: the page renders, then the search bar or the feedback form throws because the Contact Cards SPFI was never initialised.

## Data access and security

All SharePoint reads and writes go through PnPjs with delegated auth: `spfi(SITE_URL).using(SPFx(context))` runs as the signed-in user. There is no app-only principal, no stored secret, and no service account anywhere in this codebase. That is deliberate, and it is the security model: SharePoint enforces list permissions server-side per user, so a web part can never show someone data their account cannot read.

Understand what that does and does not give you. The private hubs (CX, IT, SPRQ, Trainers, Team Lead) live on sites with restricted membership, so a non-member who somehow reaches the page gets SharePoint 401/403 responses and the page shows its access-denied state. That is real security. By contrast, the manager-only sections in the vendor cards are render-guarded in the client, which is a UX courtesy, not a boundary; the actual boundary is that the Manager View list itself should be permissioned to managers on the Dispatch site. Never treat client-side hiding as protection on its own.

Microsoft Graph appears in exactly two places, both doing the same thing: `POST /me/checkMemberGroups` to test AAD group membership. The public department page uses it to show or hide the "View Department Resources" button, and the IT Team Hub uses it as the first layer of its access gate. Both fail safe: an error means "not a member." Graph calls need `GroupMember.Read.All` approved under SharePoint Admin, Advanced, API access.

The only external service is Open-Meteo for the homepage weather widget. No API key; results are cached in sessionStorage for 30 minutes, with the user's saved location kept separately in localStorage, so we are not hammering a free API on every page load.

Any HTML that originates in a SharePoint rich-text column goes through DOMPurify before it reaches `dangerouslySetInnerHTML`. No exceptions.

## Shared chrome and cross-part coupling

`rapidCityHomepage` owns everything that appears on more than one page: `Navigation`, `Footer`, the theme, and the shared component partials. The other web parts import from it. This keeps the chrome identical everywhere, but it creates coupling you must keep in mind:

- **Navigation imports from both card web parts.** The notification bell and customer search come from `customerContactCards`, and the vendor search comes from `outsourceContactCards`. Any page that renders Navigation therefore transitively depends on both. The nav search bar renders only on the two card pages, and it searches that page's own data.
- **Footer leads to FeedbackService.** The feedback modal writes to the `SiteFeedback` list using the Contact Cards SPFI. Every page with a Footer must call `initializeFeedbackSP` (or the equivalent) in `onInit()`, or feedback submissions fail on that page with a generic error that gives no hint the missing init is the cause.
- **itHub imports from departmentPublicPage.** The IT AAD group GUID lives in `DepartmentConfig.ts` (single source of truth) and the IT banner asset lives in the department page's assets folder. Renaming or moving either breaks the IT hub build.

The hub pages share a layout family on purpose: full-bleed Navigation, a main-plus-sidebar grid that collapses at 1100px, a dark Tools panel, and a Footer. When building a new hub, copy `trainersHub` or `sprqHub` rather than inventing a new skeleton.

## Theming

Design tokens live in three files under `rapidCityHomepage/theme/`:

- `ThemeTokens.ts` - TypeScript tokens, injected as CSS custom properties at each React root via `getThemeCssVariables()`
- `themeVariables.module.scss` - the same tokens for SCSS
- `_rct-components.scss` - shared mixins, including the focus ring every interactive element uses

Component styles reference `var(--rct-*)`, never raw hex. The brand is blue and gold (2025 refresh); the old teal and green tokens were removed deliberately and must not come back. The full palette with contrast ratios is in the Developer Handbook.

## Repository layout

```
src/webparts/
  rapidCityHomepage/      homepage + ALL shared chrome and theme
  customerContactCards/   customer directory, protocol book, notifications
  outsourceContactCards/  outsource vendor directory (Dispatch lists)
  employeeDirectory/      employee directory
  customerExperienceHub/  CX team hub (private)
  sprqHub/                SPRQ hub (private)
  teamLeadHub/            team lead hub (private)
  trainersHub/            trainers hub (private)
  trainingHub/            public training landing
  departmentPublicPage/   one web part, many departments (config-driven)
  itSupport/              public IT support page (guides + ticket form)
  itHub/                  private IT team hub (access-gated)
scripts/                  ad-hoc Python: Graph and list inspection probes,
                          plus the docs generator. Not part of the SPFx build
config/config.json        bundle registry; every web part is listed here
config/serve.json         personal workbench URL; never commit yours
docs/                     this documentation: markdown sources in docs/src,
                          Word output built by scripts/build-docs.py
```

## What is deliberately not here

No Power Automate flows are defined or referenced in this repo. Two integration points probably have flows behind them in the tenant (the Passenger Feedback form and the SiteFeedback list routing), but they are invisible from the code and are documented as unknowns in the Operations doc. There are also no Azure Functions, no custom APIs, and no timer jobs. If a requirement seems to need server-side execution, raise it before assuming; so far everything has been solvable client-side or with a list.
