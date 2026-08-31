# SharePoint Data and Operations

The tenant side of COMPASS: which sites and lists the code reads, the field-name traps, how to deploy, and the routine content tasks (like adding a homepage banner) that need no developer at all. If a page is behaving oddly and the code has not changed, the answer is usually in here.

## Sites

Everything lives under `https://rapidcitytransport.sharepoint.com`.

| Site | Holds |
|---|---|
| `/sites/compass` | The COMPASS pages themselves (SitePages) |
| `/` (root) | Employee Highlight list |
| `/sites/Management` | Employee Tracker list |
| `/sites/IntranetRedesignSharepoint20` | Contact Cards data, SiteFeedback, Home Banners |
| `/sites/Dispatch` | Driver Directory, Outsource Provider Manager View |
| `/sites/CSQCLeads` | Trainee Progress, TL Assignments (embedded by iframe) |
| `/sites/RCT-ITTeam` | Private IT site: Documents library, team notebook, IT Pages guides |
| `/sites/ContactCards` | Interim home of the Contact Cards page until it moves to COMPASS |

All access is delegated. A page works for a user only if their account can read the relevant lists; there is no service account to paper over permission gaps, which is a feature.

## Lists

| List | Site | Access | Used by |
|---|---|---|---|
| Protocol Book Draft2 | IntranetRedesign | read | Contact Cards protocol book |
| PB Instruction Blocks Test | IntranetRedesign | read | Contact Cards instruction blocks |
| SiteResources | IntranetRedesign | read | Contact Cards resources drawer |
| EmailTemplates | IntranetRedesign | read | Contact Cards templates drawer |
| ContactCardNotifications | IntranetRedesign | read/write | Notification bell |
| ContactCardNotifReads | IntranetRedesign | read/write | Bell read-state |
| SiteFeedback | IntranetRedesign | write | Footer feedback modal (every page) |
| Home Banners | IntranetRedesign | read | Homepage banner carousel |
| Employee Highlight | root | read | Employee directory, hub team sections, department page leaders |
| Employee Tracker | /sites/Management | unused | Legacy; leaders now come from Employee Highlight |
| Driver Directory | /sites/Dispatch | read | Vendor cards (outsource rows only) |
| Outsource Provider - Manager View (Disp) | /sites/Dispatch | read | Vendor cards, manager sections |

For any list's exact internal field names, the source of truth is `services/fieldNames.ts` in the owning web part. Do not trust display names; see the traps below.

`SiteFeedback` columns, since it was created by hand: `Title` (page identifier), `Description` (multi-line), `Urgency` (choice: Critical/High/Medium/Low), `SourcePage` (full URL, meant for routing feedback to the page owner).

## Field-name traps

These have each produced a real bug or a real 400 error. Read this section before wiring any new column.

**Internal names are not display names.** SharePoint freezes the internal name from the column's original name: spaces become `_x0020_`, and renaming the column later changes nothing internally. "Operating Name" is `Operating_x0020_Name` forever.

**Leading digits and symbols encode too, and then REST adds a prefix.** A column named "24/7 Service" gets the internal name `_x0032_4_x002f_7_x0020_Service`, and because that starts with an underscore, the REST layer needs it addressed as `OData__x0032_4_x002f_7_x0020_Service` in a `$select`. Getting this wrong is a 400 that names a field which "does not exist" while you stare at it existing.

**Choice values can contain commas.** "Tri Cities (Guelph, Kitchener, Cambridge)" is one choice value. Never split a choice column's string on commas; a multi-select arrives as an array already, and a plain string is a single value.

**Lookups project as `<Name>Id`.** The Manager View list joins to Driver Directory through `DirectoryIDLookup`, which the REST layer exposes raw as `DirectoryIDLookupId`.

**Some columns are calculated and lie when inputs are blank.** "Days Until Expiry" on the Manager View goes hugely negative when no expiry date is set, so the UI only renders it when the expiry date itself is present.

**List URL and list title can differ.** Driver Directory's URL segment is `Test Driver Directory`; the title, which is what PnPjs `getByTitle` uses, is `Driver Directory`. Trust the title.

## Query limits worth knowing

Two of our queries flirt with SharePoint's 5,000-item list view threshold, and both are documented in code comments where they live:

- The vendor fetch filters on `ContentTypeId`, which cannot be indexed. Fine at a couple hundred vendors; if Driver Directory ever approaches 5,000 items, add an indexed yes/no column (for example IsVendor) and filter on that instead.
- The IT Hub's recent-documents query sorts on Modified, which is not indexed by default. Same story: index the column in library settings if the library grows anywhere near the threshold.

## Vendor data model

The vendor directory joins two Dispatch lists. `Driver Directory` holds one row per vendor (mixed in with fleet drivers, hence the content-type filter) with dispatch-facing fields: contacts, zones, cities, vehicles, hours, booking method, special instructions. `Outsource Provider - Manager View (Disp)` holds the management layer: insurance, documents on file, billing, reviews, and notes, joined by directory ID.

Behavioural details that were agreed with the list owners:

- Rows are visible unless `Active Vendor` is explicitly "Inactive". Blank means active, because most rows are blank.
- Priority "Tertiary Option" displays as "When Required". Blank priority stays blank and sorts last; the UI never invents a tier.
- Emails typed into phone columns happen; the UI detects an @ and renders mailto instead of tel.
- Account Password and Account Number are never selected by the code. If a future requirement seems to need them, that is a conversation with the list owners first, not a code change.

## Graph usage and approval

Two web parts call Microsoft Graph, both `POST /me/checkMemberGroups`, both failing safe to "no access": the department public page (resources button) and the IT hub (access gate). This needs `GroupMember.Read.All` approved once per tenant under SharePoint Admin Center, Advanced, API access. If group gating silently never grants access, check that approval before debugging code.

The ad-hoc scripts under `scripts/` use separate app credentials from a local `.env` for schema inspection. They are read-only by convention and are not part of the build or the deployed solution.

## Adding a homepage banner (no deploy needed)

The carousel reads the `Home Banners` list on the IntranetRedesign site. To add a slide:

1. Open the list and add an item.
2. Upload the picture to the item's image column. Bake any text into the image itself; slides render image-only.
3. Fill `ImageAltText` with a screen-reader description of what the banner says.
4. Set `SortOrder` (ascending; blanks sink to the bottom) and leave `Active` checked.

The carousel shows the row on next page load. To pull a banner without deleting it, uncheck Active. A row with no image is skipped silently, so if a new banner does not appear, that is the first thing to check.

## Deployment runbook

1. `npm run build:ship` (fails on any stderr; see the Developer Handbook for the Browserslist fix)
2. `npx gulp package-solution --ship`
3. Upload `sharepoint/solution/rapid-city-transportation-hub.sppkg` to the tenant App Catalog, replacing the existing package
4. Hard refresh (Ctrl+F5) on an affected page to confirm the new bundle is being served

One package serves every page, so a deploy affects the whole intranet at once. The corollary bites in the other direction: if any page shows stale behaviour, confirm the App Catalog package date matches your latest ship build before debugging anything else.

New pages are created in SharePoint (Site Pages, add the web part, name the page). Page names matter because the code links to them by URL: the nav expects `InformationTechnology`, `ITSupport`, and `OutsourceContactCards` on COMPASS, and the IT department page's resources button expects `ITHub` on the IT team site (see `DepartmentConfig.ts`). After creating a page the nav greys out, remove that entry's `disabled` flag (or give it its real URL) in `Navigation.tsx` and redeploy.

## Known pending items

- Real AAD group GUIDs: every department page config, and therefore the IT hub gate too, still carries an all-zero placeholder. No resources button currently shows anywhere, and the IT hub gate falls back to site permissions.
- `MOCK_IS_MANAGER` in the vendor cards awaits the managers AAD group, then becomes a Graph check.
- Department configs for Dispatch, Accounting, HR, and Business Development have placeholder 605 area-code phone numbers left from scaffolding; get real numbers before publishing those pages.
- A vendor Templates list is planned by the list owners; the templates accordion hides itself until it exists and is wired.
- Power Automate: nothing in this repo defines a flow, but the Passenger Feedback form and SiteFeedback routing likely have flows in the tenant. When someone confirms the details, document each flow's trigger and actions here, because the code cannot see them.
