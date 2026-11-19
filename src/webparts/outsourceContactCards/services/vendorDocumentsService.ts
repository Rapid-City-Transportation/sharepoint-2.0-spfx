import { Web } from '@pnp/sp/webs';
import '@pnp/sp/folders';
import '@pnp/sp/files';
import { getSP } from './spConfig';
import { MANAGEMENT_SITE_URL } from '../../rapidCityHomepage/services/managementAccessService';

export const VENDOR_DOCS_LIBRARY = 'Vendor Compliance Documents';
const MANAGEMENT_ORIGIN = new URL(MANAGEMENT_SITE_URL).origin;
const LIBRARY_PATH = `${new URL(MANAGEMENT_SITE_URL).pathname}/${VENDOR_DOCS_LIBRARY}`;
export const VENDOR_DOCS_LIBRARY_URL = `${MANAGEMENT_ORIGIN}${LIBRARY_PATH}`;

export interface IVendorDocFile {
  name: string;
  url: string;
  modified?: string;
}

/** One subfolder of the vendor's folder (Business Licence, Certificate of
 *  Insurance, ...): the library's own categories, read as they are. */
export interface IVendorDocCategory {
  name: string;
  url: string;
  files: IVendorDocFile[];
}

export interface IVendorDocuments {
  folderUrl: string;
  categories: IVendorDocCategory[];
  /** Files dropped straight into the vendor folder rather than a category. */
  looseFiles: IVendorDocFile[];
}

interface IRawFile {
  Name: string;
  ServerRelativeUrl: string;
  TimeLastModified?: string;
}

interface IRawFolder {
  Name: string;
  ServerRelativeUrl: string;
  Files?: IRawFile[];
}

// The library lives on the Management site; the page's own SPFI is bound to
// the Dispatch site, so reads go through a Web pointed at the other site
// with the same delegated identity.
function managementWeb(): ReturnType<typeof Web> {
  return Web([getSP().web, MANAGEMENT_SITE_URL]);
}

// Folders are named "<Vendor> (<City>) - <ERP id>". The id is the key:
// the names were typed separately from the Masterlist and drift from it.
const ERP_SUFFIX = / - 0*(\d+)\s*$/;

let _foldersByErpId: Promise<Map<string, IRawFolder>> | undefined;

async function loadFolderIndex(): Promise<Map<string, IRawFolder>> {
  const folders: IRawFolder[] = await managementWeb()
    .getFolderByServerRelativePath(LIBRARY_PATH)
    .folders.select('Name', 'ServerRelativeUrl')
    .top(2000)();
  const byId = new Map<string, IRawFolder>();
  for (const folder of folders) {
    const match = ERP_SUFFIX.exec(folder.Name);
    if (match) byId.set(match[1], folder);
  }
  return byId;
}

// One listing of the 350-odd vendor folders per page load serves every card;
// a failed load is forgotten so the next card can retry it.
function folderIndex(): Promise<Map<string, IRawFolder>> {
  if (!_foldersByErpId) {
    _foldersByErpId = loadFolderIndex().catch(err => {
      _foldersByErpId = undefined;
      throw err;
    });
  }
  return _foldersByErpId;
}

function toFile(raw: IRawFile): IVendorDocFile {
  return {
    name: raw.Name,
    // web=1 opens Office files in the browser instead of downloading them.
    url: `${MANAGEMENT_ORIGIN}${raw.ServerRelativeUrl}?web=1`,
    modified: raw.TimeLastModified,
  };
}

/**
 * The vendor's compliance folder with the files in each of its categories,
 * or undefined when no folder carries this ERP id. A denied or failed read
 * throws, so the card can tell "no folder" from "no access".
 */
export async function fetchVendorDocuments(erpDriverId: string): Promise<IVendorDocuments | undefined> {
  const folder = (await folderIndex()).get(erpDriverId.replace(/^0+/, ''));
  if (!folder) return undefined;

  const root = managementWeb().getFolderByServerRelativePath(folder.ServerRelativeUrl);
  const [subfolders, rootFiles] = await Promise.all([
    root.folders
      .select('Name', 'ServerRelativeUrl', 'Files/Name', 'Files/ServerRelativeUrl', 'Files/TimeLastModified')
      .expand('Files')() as Promise<IRawFolder[]>,
    root.files.select('Name', 'ServerRelativeUrl', 'TimeLastModified')() as Promise<IRawFile[]>,
  ]);

  return {
    folderUrl: `${MANAGEMENT_ORIGIN}${folder.ServerRelativeUrl}`,
    categories: subfolders
      .slice()
      .sort((a, b) => a.Name.localeCompare(b.Name))
      .map(sub => ({
        name: sub.Name,
        url: `${MANAGEMENT_ORIGIN}${sub.ServerRelativeUrl}`,
        files: (sub.Files || []).map(toFile),
      })),
    looseFiles: rootFiles.map(toFile),
  };
}
