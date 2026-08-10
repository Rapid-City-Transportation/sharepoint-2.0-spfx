import { WebPartContext } from '@microsoft/sp-webpart-base';
import { spfi, SPFI, SPFx } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';

let _sp: SPFI | undefined;

export const DISPATCH_SITE_URL = 'https://rapidcitytransport.sharepoint.com/sites/Dispatch';

/**
 * Call once from onInit(). Delegated auth, so reads run as the signed-in user
 * and this web part can only ever see what they can.
 */
export function initializeSP(context: WebPartContext): SPFI {
  _sp = spfi(DISPATCH_SITE_URL).using(SPFx(context));
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
