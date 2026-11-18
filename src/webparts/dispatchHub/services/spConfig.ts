import { WebPartContext } from '@microsoft/sp-webpart-base';
import { spfi, SPFI, SPFx } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/fields';

let _sp: SPFI | undefined;

export const DISPATCH_SITE_URL = 'https://rapidcitytransport.sharepoint.com/sites/Dispatch';

/** Call once from onInit(). Delegated, so the calendar and roster lists show
 *  only what the signed-in user can read on the Dispatch site. */
export function initializeSP(context: WebPartContext): SPFI {
  _sp = spfi(DISPATCH_SITE_URL).using(SPFx(context));
  return _sp;
}

export function getSP(): SPFI {
  if (!_sp) {
    throw new Error(
      'PnPjs SPFI not initialized. Call initializeSP(context) in the Dispatch Hub web part onInit().'
    );
  }
  return _sp;
}
