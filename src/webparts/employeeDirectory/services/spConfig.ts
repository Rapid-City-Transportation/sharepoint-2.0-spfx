import { WebPartContext } from '@microsoft/sp-webpart-base';
import { spfi, SPFI, SPFx } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';

let _sp: SPFI | undefined;

/** Site where the Employee Highlight list lives. The directory used to
 *  point at the Management site (Employee Tracker), but the source of
 *  truth is now the curated Highlight list on the root site. */
export const EMPLOYEE_DIRECTORY_SITE_URL =
  'https://rapidcitytransport.sharepoint.com';

/** Call once from the web part's onInit(). */
export function initializeSP(context: WebPartContext): SPFI {
  _sp = spfi(EMPLOYEE_DIRECTORY_SITE_URL).using(SPFx(context));
  return _sp;
}

/** Get the initialized SPFI instance. */
export function getSP(): SPFI {
  if (!_sp) {
    throw new Error(
      'PnPjs SPFI not initialized. Call initializeSP(context) in the web part onInit().'
    );
  }
  return _sp;
}
