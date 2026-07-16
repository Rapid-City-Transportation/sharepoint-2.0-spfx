import { WebPartContext } from '@microsoft/sp-webpart-base';
import { spfi, SPFI, SPFx } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';

let _sp: SPFI | undefined;

// The IT Tickets list lives on the compass intranet site so any employee can
// submit a ticket. Writes run as the signed-in user (delegated).
const TICKETS_SITE_URL = 'https://rapidcitytransport.sharepoint.com/sites/compass';

/** Call once from the web part's onInit(). */
export function initializeSP(context: WebPartContext): SPFI {
  _sp = spfi(TICKETS_SITE_URL).using(SPFx(context));
  return _sp;
}

/** Get the initialized SPFI instance. */
export function getSP(): SPFI {
  if (!_sp) {
    throw new Error(
      'PnPjs SPFI not initialized. Call initializeSP(context) in the IT Support web part onInit().'
    );
  }
  return _sp;
}
