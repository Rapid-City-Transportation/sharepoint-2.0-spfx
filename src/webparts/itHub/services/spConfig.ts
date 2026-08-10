import { WebPartContext } from '@microsoft/sp-webpart-base';
import { spfi, SPFI, SPFx } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/folders';

let _sp: SPFI | undefined;

// Delegated auth is the real boundary: SharePoint rejects non-member reads
// server-side, so the hub cannot leak library content.
export const IT_TEAM_SITE_URL = 'https://rapidcitytransport.sharepoint.com/sites/RCT-ITTeam';

/** Call once from onInit(). */
export function initializeSP(context: WebPartContext): SPFI {
  _sp = spfi(IT_TEAM_SITE_URL).using(SPFx(context));
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
