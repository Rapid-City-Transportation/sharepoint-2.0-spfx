/** Discovered at read time, so SharePoint renames flow into the toolbox. */
export interface IItFolder {
  name: string;
  serverRelativeUrl: string;
}

export interface IItRecentDoc {
  name: string;
  webUrl: string;
  modified: string;
  modifiedBy?: string;
  fileType: string;
}

/** Content renders only in 'ready', so nothing flashes while checks run. */
export type ItHubState = 'checking' | 'denied' | 'error' | 'ready';
