import '@pnp/sp/security/list';
import { PermissionKind } from '@pnp/sp/security';
import { getSP } from './spConfig';
import { MGR } from './fieldNames';

// Resolved by fetchVendors before anything that renders a manager section can
// mount; false until then, and whenever the check cannot be made.
let _isManager = false;

/**
 * A manager is whoever SharePoint lets read the Manager View list, so the page
 * agrees with that list's own permissions instead of keeping a second roster.
 * The render guard is a courtesy for the layout; the list is the boundary.
 */
export async function resolveManagerView(): Promise<boolean> {
  try {
    _isManager = await getSP()
      .web.lists.getByTitle(MGR.LIST_TITLE)
      .currentUserHasPermissions(PermissionKind.ViewListItems);
  } catch {
    _isManager = false;
  }
  return _isManager;
}

/** The answer from the last resolveManagerView(); false before the first. */
export function isManagerView(): boolean {
  return _isManager;
}
