import { WebPartContext } from '@microsoft/sp-webpart-base';
import { spfi, SPFI, SPFx } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/fields';

let _sp: SPFI | undefined;

// The SPRQ master lists + trackers all live on the tenant root site.
const ROOT_SITE_URL = 'https://rapidcitytransport.sharepoint.com';

/** Call once from the web part's onInit(). Read-only access (delegated). */
export function initializeSP(context: WebPartContext): SPFI {
  _sp = spfi(ROOT_SITE_URL).using(SPFx(context));
  return _sp;
}

/** Get the initialized SPFI instance. */
export function getSP(): SPFI {
  if (!_sp) {
    throw new Error(
      'PnPjs SPFI not initialized. Call initializeSP(context) in the SPRQ Hub web part onInit().'
    );
  }
  return _sp;
}
