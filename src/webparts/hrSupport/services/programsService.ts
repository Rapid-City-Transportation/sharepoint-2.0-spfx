import '@pnp/sp/webs';
import '@pnp/sp/folders';
import '@pnp/sp/files';
import { COMPASS_SITE_URL, getSP } from '../../healthSafety/services/spConfig';

export interface IProgramPoster {
  /** The file name without its extension: HR names the file, the page shows it. */
  label: string;
  /** embed.aspx by UniqueId, so renaming the file does not break the embed. */
  docUrl: string;
  fullUrl: string;
}

// HR drops a poster into this folder and it is on the page; nothing in the
// code names a poster, so the list cannot go stale or grow out of hand.
const PROGRAMS_FOLDER = 'Shared Documents/HR Support/Government Programs';
export const PROGRAMS_FOLDER_URL =
  `${COMPASS_SITE_URL}/Shared%20Documents/HR%20Support/Government%20Programs`;

const DOC_BASE = `${COMPASS_SITE_URL}/_layouts/15/embed.aspx?UniqueId=`;
const origin = new URL(COMPASS_SITE_URL).origin;

/** encodeURI leaves '#' alone, which truncates URLs for files named with it. */
function encodePath(serverRelativePath: string): string {
  return serverRelativePath.split('/').map(encodeURIComponent).join('/');
}

interface IRawFile {
  Name: string;
  UniqueId: string;
  ServerRelativeUrl: string;
}

/** PDFs only: embed.aspx renders those inline, while an image or Office file
 *  dropped in by mistake would show as a blank frame. */
export async function fetchProgramPosters(): Promise<IProgramPoster[]> {
  const sitePath = new URL(COMPASS_SITE_URL).pathname;
  const files: IRawFile[] = await getSP()
    .web.getFolderByServerRelativePath(`${sitePath}/${PROGRAMS_FOLDER}`)
    .files.select('Name', 'UniqueId', 'ServerRelativeUrl')();

  return files
    .filter(f => /\.pdf$/i.test(f.Name))
    .map(f => ({
      label: f.Name.replace(/\.pdf$/i, ''),
      docUrl: `${DOC_BASE}${f.UniqueId}`,
      fullUrl: `${origin}${encodePath(f.ServerRelativeUrl)}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
