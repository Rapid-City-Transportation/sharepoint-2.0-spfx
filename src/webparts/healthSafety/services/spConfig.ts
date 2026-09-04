import { WebPartContext } from '@microsoft/sp-webpart-base';
import { spfi, SPFI, SPFx } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
// currentUser lives in site-users; without this import the prefill in
// IncidentReportForm would depend on another web part's import surviving.
import '@pnp/sp/site-users/web';

let _sp: SPFI | undefined;

export const COMPASS_SITE_URL = 'https://rapidcitytransport.sharepoint.com/sites/compass';

/** Call once from onInit(). Delegated: incident submissions are written as
 *  the signed-in user, so the list's item-level permissions decide who can
 *  read what. */
export function initializeSP(context: WebPartContext): SPFI {
  _sp = spfi(COMPASS_SITE_URL).using(SPFx(context));
  return _sp;
}

export function getSP(): SPFI {
  if (!_sp) {
    throw new Error(
      'PnPjs SPFI not initialized. Call initializeSP(context) in the web part onInit().'
    );
  }
  return _sp;
}
