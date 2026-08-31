# Foundry sync: ERP contact data into the Driver Directory list

**STATUS: shelved (2026-08-18).** The team decided Foundry will not write to
the SharePoint list; the Driver Directory stays manually maintained for now.
Kept because the technical groundwork below (IDs, column mapping, content type
filter, row-matching pitfalls) is done and verified, so if a write-back sync is
ever revisited this is the starting point. Foundry reading the list is
unaffected.

Handover notes for the nightly job that writes outsource taxi vendor contact
details from the ERP into SharePoint. Everything below was verified against the
live list via Graph on 2026-08-17.

The intranet side needs no changes. The vendor cards web part reads this list as
the signed-in user, so whatever the sync writes shows up on the next page load.

## Coordinates

```
Site URL:  https://rapidcitytransport.sharepoint.com/sites/Dispatch
Site ID:   rapidcitytransport.sharepoint.com,4e6cccb3-99c5-4212-a606-9b00dbfe0d12,a8dcb5d7-e44b-467c-b7c4-17a21c7087b1
List ID:   6fa1b165-4ad2-4bfb-b077-38d1059025ce
List title: Driver Directory          (the URL says "Test Driver Directory"; the title is what Graph matches)
```

Permissions are already in place. The `RCT Foundry SharePoint Reader` app
registration (client id `ba8d6665-c2f3-42f1-b2e4-cbc0e44490a4`) holds
`Sites.ReadWrite.All` as an admin-consented application permission, so it can
write here with no further grant. Note the app is far more privileged than its
name suggests: that permission covers every site in the tenant, not just
Dispatch.

## Filter to vendor rows first

The list holds 495 rows: 212 outsource vendors and 283 of our own fleet drivers,
distinguished only by content type. **A sync that skips this filter will write
taxi company details onto fleet driver records.**

The expanded `fields` payload returns the content type as a readable name, so
the check is a string comparison:

```
fields.ContentType == "Outsource Company"
```

If you would rather match on the id, vendor rows start with
`0x0100AD273086343F4640B574D341F3C1C333` and fleet drivers with
`0x01005072132859B2AE448CBEE3BBBCCD906C`.

## Column mapping

All seven targets are plain text columns and confirmed writeable. Graph wants
**internal** names in the request body, not the display names you see in the UI.

| ERP field | Display name in SharePoint | Internal name (use this) |
|---|---|---|
| FullName | Name | `Title` |
| NickName | Operating Name | `Operating_x0020_Name` |
| ContactPhone | Primary | `Primary` |
| ContactPhoneAlt | Secondary | `Secondary` |
| ContactEmail | Email address | `Emailaddress` |
| ContactFax | Fax Number | `Fax_x0020_Number` |
| Address1 | Office Address | `Office_x0020_Address` |

The write is a PATCH per row:

```
PATCH /sites/{siteId}/lists/{listId}/items/{itemId}/fields
{
  "Title": "...",
  "Operating_x0020_Name": "...",
  "Primary": "...",
  "Secondary": "...",
  "Emailaddress": "...",
  "Fax_x0020_Number": "...",
  "Office_x0020_Address": "..."
}
```

## Columns the sync must never touch

These are maintained by hand by the dispatch team and represent operational
knowledge that does not exist in the ERP. Overwriting them, including blanking
them as part of a full-row write, destroys work that cannot be recovered from
the source system:

Home Zone, City, Priority, Vehicle, Equipment, Booking Method, Portal,
24/7 Service, Hours of Operation, After Hours Phone, Special Dispatch
Instructions, Notes, Language, Province, Active Vendor, Under Performance
Review, Preferred Contact Name.

Also on the list and out of scope: `Account Number` and `Account Password`.
Both are empty across all 495 rows today, and the intranet deliberately never
reads them. The sync should not populate them.

## Open questions

1. **What do rows match on?** Matching by company name is fragile, and the sync
   also writes `Title`, so the first ERP rename breaks the join. Suggested fix:
   add one indexed text column (`ERPVendorId`), backfill it once, and match on
   that. Adding a column is a change to dispatch's list, so it needs their
   agreement.
2. **Update only, or create and delete too?** Update-only is the safer first
   version: ERP vendors with no matching row get logged rather than created, and
   nothing is ever deleted.
3. **Blank handling.** If an ERP field is empty, skip it rather than clearing a
   value someone typed in by hand.

## Before the first live run

- Dispatch owns this list and asked that nothing modify it. They should see the
  column mapping and agree to it.
- Run against a copy of the list first, not the live one.

## Verifying a read

From this repo, with credentials in `scripts/sharepoint-graph-test/.env`:

```
cd scripts/sharepoint-fetch-lists-v2
python test_lists.py Dispatch
```

That pulls all 495 rows and prints the first one. Credential-ish fields are
redacted in the output.
