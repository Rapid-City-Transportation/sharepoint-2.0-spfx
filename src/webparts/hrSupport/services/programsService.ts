import '@pnp/sp/webs';
import '@pnp/sp/folders';
import '@pnp/sp/files';
import { COMPASS_SITE_URL, getSP } from '../../healthSafety/services/spConfig';

export interface IProgramPoster {
  /** The file name without its extension: HR names the file, the page shows it. */
  label: string;
  /** An image of the poster, shown inline: scales to the viewer with no
   *  scrollbar. Present when the folder holds a PNG/JPG beside the PDF. */
  imageUrl?: string;
  /** embed.aspx by UniqueId, used when there is no image to show instead. */
  docUrl: string;
  /** The PDF itself: "Open full", and the text copy for screen readers. */
  fullUrl: string;
}

// HR drops a poster into this folder and it is on the page; nothing in the
// code names a poster, so the list cannot go stale or grow out of hand.
const PROGRAMS_FOLDER = 'Shared Documents/HR Support/Government Programs';
export const PROGRAMS_FOLDER_URL =
  `${COMPASS_SITE_URL}/Shared%20Documents/HR%20Support/Government%20Programs`;

const DOC_BASE = `${COMPASS_SITE_URL}/_layouts/15/embed.aspx?UniqueId=`;
const origin = new URL(COMPASS_SITE_URL).origin;

const IMAGE_EXT = /\.(png|jpe?g|webp)$/i;
const PDF_EXT = /\.pdf$/i;

/** encodeURI leaves '#' alone, which truncates URLs for files named with it. */
function encodePath(serverRelativePath: string): string {
  return serverRelativePath.split('/').map(encodeURIComponent).join('/');
}

interface IRawFile {
  Name: string;
  UniqueId: string;
  ServerRelativeUrl: string;
}

/**
 * One poster per PDF in the folder. An image with the same name (PNG, JPG or
 * WEBP) is what gets displayed, because the embedded PDF viewer always adds
 * its own scrollbar; the PDF stays the document people open and the readable
 * copy for assistive tech. An image with no PDF beside it is ignored, so a
 * poster can never ship without that text version.
 */
export async function fetchProgramPosters(): Promise<IProgramPoster[]> {
  const sitePath = new URL(COMPASS_SITE_URL).pathname;
  const files: IRawFile[] = await getSP()
    .web.getFolderByServerRelativePath(`${sitePath}/${PROGRAMS_FOLDER}`)
    .files.select('Name', 'UniqueId', 'ServerRelativeUrl')();

  const imagesByName = new Map<string, IRawFile>();
  for (const f of files) {
    if (IMAGE_EXT.test(f.Name)) {
      imagesByName.set(f.Name.replace(IMAGE_EXT, '').toLowerCase(), f);
    }
  }

  return files
    .filter(f => PDF_EXT.test(f.Name))
    .map(f => {
      const label = f.Name.replace(PDF_EXT, '');
      const image = imagesByName.get(label.toLowerCase());
      return {
        label,
        imageUrl: image ? `${origin}${encodePath(image.ServerRelativeUrl)}` : undefined,
        docUrl: `${DOC_BASE}${f.UniqueId}`,
        fullUrl: `${origin}${encodePath(f.ServerRelativeUrl)}`,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}
