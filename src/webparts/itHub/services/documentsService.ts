import { getSP, IT_TEAM_SITE_URL } from './spConfig';
import { LIBRARY_TITLE, LIBRARY_ROOT } from './itHubConfig';
import { IItFolder, IItRecentDoc } from '../models/IItHubModels';

// Sorting on Modified (not indexed) throttles past 5,000 items. Index the
// column in library settings if the library ever gets that big.
const RECENT_COUNT = 8;

const origin = new URL(IT_TEAM_SITE_URL).origin;

/** encodeURI leaves '#' alone, which truncates URLs for files named with it. */
function encodePath(serverRelativePath: string): string {
  return serverRelativePath.split('/').map(encodeURIComponent).join('/');
}

interface IRawFolder {
  Name: string;
  ServerRelativeUrl: string;
}

/** Read at load time so the toolbox tracks renames without a deploy. */
export async function fetchFolders(): Promise<IItFolder[]> {
  const sitePath = new URL(IT_TEAM_SITE_URL).pathname;
  const folders: IRawFolder[] = await getSP()
    .web.getFolderByServerRelativePath(`${sitePath}/${LIBRARY_ROOT}`)
    .folders.select('Name', 'ServerRelativeUrl')();

  return folders
    // Forms is SharePoint's own system folder, not content.
    .filter(f => f.Name !== 'Forms')
    .map(f => ({ name: f.Name, serverRelativeUrl: f.ServerRelativeUrl }));
}

interface IRawDocRow {
  FileLeafRef: string;
  FileRef: string;
  Modified: string;
  Editor?: { Title?: string };
  File_x0020_Type?: string;
}

/** Doubles as the access probe: SharePoint rejects this for non-members. */
export async function fetchRecentDocuments(): Promise<IItRecentDoc[]> {
  const rows: IRawDocRow[] = await getSP()
    .web.lists.getByTitle(LIBRARY_TITLE)
    .items.select('FileLeafRef', 'FileRef', 'Modified', 'File_x0020_Type', 'Editor/Title')
    .expand('Editor')
    .filter('FSObjType eq 0')
    .orderBy('Modified', false)
    .top(RECENT_COUNT)();

  return rows.map(r => ({
    name: r.FileLeafRef,
    webUrl: `${origin}${encodePath(r.FileRef)}`,
    modified: r.Modified,
    modifiedBy: r.Editor?.Title,
    fileType: (r.File_x0020_Type || '').toLowerCase(),
  }));
}
