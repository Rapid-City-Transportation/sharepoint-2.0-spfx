import { WebPartContext } from '@microsoft/sp-webpart-base';
import { spfi, SPFI, SPFx } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/fields';

let _sp: SPFI | undefined;

// The Announcements list lives on the compass intranet site, which everyone in
// the org can read - so the public department pages render it for all staff,
// not just Customer Experience members.
const ANNOUNCEMENTS_SITE_URL = 'https://rapidcitytransport.sharepoint.com/sites/compass';

/** Call once from each consuming web part's onInit(). Read-only (delegated). */
export function initializeSP(context: WebPartContext): SPFI {
  _sp = spfi(ANNOUNCEMENTS_SITE_URL).using(SPFx(context));
  return _sp;
}

/** Get the initialized SPFI instance. */
export function getSP(): SPFI {
  if (!_sp) {
    throw new Error(
      'PnPjs SPFI not initialized. Call initializeAnnouncementsSP(context) in the web part onInit().'
    );
  }
  return _sp;
}
