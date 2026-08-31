# Web Part Reference

One section per web part: what it is for, where it runs, what data it touches, and anything non-obvious about how it behaves. Exact list titles, columns, and site URLs live in the SharePoint Data and Operations doc; this one is about the code.

Most pages live on the COMPASS site (`/sites/compass`). The exceptions today: Contact Cards sits on its own site until full go-live, the SPRQ and Team Lead hubs live on their teams' sites, and the IT hub lives on the IT team site. "Private" means the hosting site has restricted membership, which is the real access control.

## rapidCityHomepage

The homepage, and the home of everything shared. Besides its own content (hero, banner carousel, daily highlight, quick links, weather), this web part owns `Navigation`, `Footer`, the feedback modal, and the theme. Every other web part imports its chrome from here.

Things to know:

- The banner carousel is list-driven from `Home Banners` on the IntranetRedesign site. Add a row with an image and it appears; no deploy. If the list is empty or unreachable the carousel renders nothing at all, so a missing banner means checking the list before the code.
- The weather widget calls Open-Meteo directly (no key) and caches in localStorage.
- Navigation's search bar renders only on the two contact card pages. Its "Contact Cards" entry is a dropdown (Customer / Outsource), and entries for pages that do not exist yet render greyed out, either from an explicit `disabled` flag (used when the URL is already decided) or automatically from a '#' placeholder href. Lighting one up means removing the flag or supplying the real URL.

## customerContactCards

The customer directory: cards for clinics, hospitals, schools, lawyers, insurers, and the protocol book content that tells agents how to handle each one. Reads several lists on the IntranetRedesign site (protocol book, instruction blocks, resources, email templates) and owns the notification bell that the nav shows on every page, backed by its two notification lists.

Data is customer-sensitive, so treat this web part's lists as read-mostly: the only writes are notifications and their read-state.

## outsourceContactCards

The outsource vendor directory for dispatch: who to call when we cannot take a trip ourselves. Reads two lists on the Dispatch site, read-only by construction (the services contain only selects and filters; there is no update path to break). Vendor rows come from `Driver Directory` filtered by the outsource content type; manager-only detail joins in from the Manager View list by directory ID.

Things to know:

- Priority drives sort order and the card badge but is deliberately not searchable. The list value "Tertiary Option" displays as "When Required", and a blank priority stays blank.
- Manager-only sections are render-guarded on `isManagerView()`, currently a mock constant awaiting the real Graph group check. The render guard is UX; the Manager View list's own permissions are the boundary.
- Account Password and Account Number exist on the source list and are intentionally never fetched. Keep it that way.
- A vendor covering several zones renders one tab per zone in the detail view. Zone accent colours are hashed from the zone name into a fixed AA palette, so new zones colour themselves.
- Vehicle icons are Fluent font glyphs; the two wheelchair variants (side load and rear load) share the one wheelchair glyph and are told apart by a small S or R letter badge.
- `USE_MOCK_DATA` in the vendor service flips the whole page to six fictional vendors for demos.

## employeeDirectory

Searchable staff directory with a detail view, reading the `Employee Highlight` list on the tenant root site. Its `useEmployees` hook is also consumed by the CX, SPRQ, Training, and IT hubs for their team sections, so changes to the employee model ripple to five pages.

## customerExperienceHub

The private CX team hub, and the busiest of the hubs: tools panel with an embedded Tool Viewer, team roster section, a RISE Hub Viva Engage feed, the breaks and sick-calls card, and the Daily Task board. The task board's weekly generator builds each week's coverage from the roster, with SPRQ evening handoffs going to night staff on every task except Dispatch Alerts. Generating a week writes to the live task list after an explicit confirmation step.

Its lunch schedule embeds from the CSQC site by iframe; the CSQC lists themselves are embedded by the hubs that own them, not here.

## sprqHub, teamLeadHub, trainersHub, trainingHub

Four hubs sharing the standard layout (nav, main-plus-sidebar grid collapsing at 1100px, dark tools panel, footer). SPRQ and Team Lead are private and reached from the CX Hub; Trainers is private and reached from the Training Hub; Training Hub itself is public and linked from the nav's Employee Support menu. Trainers Hub adds the quizzes panel and embeds the CSQC Trainee Progress list by iframe; Team Lead Hub embeds the TL Assignments workbook the same way, since both are owned and permissioned on the CSQC site. When you need a clean reference for the hub skeleton, read `trainersHub` or `sprqHub`; they are the least encumbered.

## departmentPublicPage

One web part that renders the public page for any department. A `departmentKey` web part property selects the config from `DepartmentConfig.ts`: accent colours, contact block, office hours, banner, AAD group ID, and resource page URL. The "View Department Resources" button only shows for members of the department's AAD group (Graph `checkMemberGroups`, failing safe to hidden).

Customer Experience and Information Technology have live contact details and resource links; every config, including those two, still carries a placeholder AAD group ID, and the non-live ones also have placeholder phone numbers. Check the config before publishing a new department's page. IT's config also overrides the team section heading to "Meet the Team" since all three IT members are listed, not just leadership.

## itSupport

The public IT support page: self-help first, ticket second. Four guide documents from the IT team's site embed read-only in a viewer (with an "open full" escape hatch), and the ticket form sits below for whatever the guides do not cover. The guides are Word documents in the "IT Pages" folder on the IT team site, so IT can edit them without a deploy.

## itHub

The private IT team hub, structurally a copy of the CX Hub on purpose: same banner treatment, tools panel, Tool Viewer, and team card. In front of all of it sits an access gate: a Graph group check when a real AAD group is configured, with the delegated library read as the backstop; both fail safe to an access-denied state, and nothing renders until access is proven.

The document tools are discovered, not configured: the hub reads the top-level folders of the team site's Documents library at load time and renders a chip per folder, so IT can add or rename folders in SharePoint and the hub follows without a deploy.

## Feature flags and mocks worth knowing about

| Where | Flag | Current state |
|---|---|---|
| outsourceContactCards vendor service | `USE_MOCK_DATA` | false (live Dispatch data) |
| outsourceContactCards permissions | `MOCK_IS_MANAGER` | true; swap for Graph group check when the managers group exists |
| itHub property pane | `allowedGroupId` | placeholder GUID skips the Graph check; site permissions still gate |
| departmentPublicPage configs | `groupId` (every department) | all placeholders; non-CX/IT configs also carry placeholder phones |
