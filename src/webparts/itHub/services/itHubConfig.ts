import { IT_TEAM_SITE_URL } from './spConfig';

/** List title vs server-relative folder name, which differ on team sites. */
export const LIBRARY_TITLE = 'Documents';
export const LIBRARY_ROOT = 'Shared Documents';

/** The same redirect the site's own Notebook nav link uses. Property-pane
 *  overridable if IT wants a direct OneNote URL. */
export const NOTEBOOK_URL_DEFAULT = `${IT_TEAM_SITE_URL}/_layouts/15/groupstatus.aspx?Target=NOTEBOOK`;

/** Back-link target. The compass page must be named InformationTechnology. */
export const PUBLIC_IT_PAGE_URL =
  'https://rapidcitytransport.sharepoint.com/sites/compass/SitePages/InformationTechnology.aspx';

/** embedUrl renders inline in the Tool Viewer; externalUrl opens a new tab. */
export interface IItTool {
  label: string;
  icon: string;
  embedUrl?: string;
  /** Built here rather than derived later: URLSearchParams would re-encode
   *  %20 as '+', which SharePoint's id parsing rejects. */
  fullUrl?: string;
  externalUrl?: string;
}

const LIBRARY_VIEW_URL = `${IT_TEAM_SITE_URL}/${encodeURIComponent(LIBRARY_ROOT).replace(/%2F/g, '/')}/Forms/AllItems.aspx`;

/** Shortcut to the legacy lists without going through the old site's nav. */
const SITE_CONTENTS_URL = `${IT_TEAM_SITE_URL}/_layouts/15/viewlsts.aspx?view=14`;

/** Unknown or renamed folders fall back to the plain folder icon. */
const FOLDER_ICONS: Record<string, string> = {
  'Developer Documentation': 'Code',
  'IT Tech Support Knowledge': 'Headset',
  'Phone Prompts': 'Phone',
  'SharePoint': 'SharepointLogo',
  'Medical Transport Booking Site': 'Medical',
};

const DEFAULT_FOLDER_ICON = 'FabricFolder';

/** Folder tools are absent by design: folderTool builds those from the live
 *  library, so renames and additions need no deploy. */
export function buildStaticTools(notebookUrl: string): IItTool[] {
  return [
    { label: 'Site Contents',        icon: 'AllApps',     embedUrl: `${SITE_CONTENTS_URL}&env=Embedded`, fullUrl: SITE_CONTENTS_URL },
    { label: 'Browse All Documents', icon: 'DocLibrary',  embedUrl: `${LIBRARY_VIEW_URL}?env=Embedded`, fullUrl: LIBRARY_VIEW_URL },
    { label: 'IT Team Notebook',     icon: 'OneNoteLogo', externalUrl: notebookUrl },
  ];
}

/** Targets the folder's real server-relative path, so renames survive a
 *  reload. env=Embedded strips SharePoint chrome from the embed. */
export function folderTool(folder: { name: string; serverRelativeUrl: string }): IItTool {
  const id = encodeURIComponent(folder.serverRelativeUrl);
  return {
    label: folder.name,
    icon: FOLDER_ICONS[folder.name] || DEFAULT_FOLDER_ICON,
    embedUrl: `${LIBRARY_VIEW_URL}?id=${id}&env=Embedded`,
    fullUrl: `${LIBRARY_VIEW_URL}?id=${id}`,
  };
}

export const FILE_TYPE_ICONS: Record<string, string> = {
  doc: 'WordDocument',
  docx: 'WordDocument',
  xls: 'ExcelDocument',
  xlsx: 'ExcelDocument',
  ppt: 'PowerPointDocument',
  pptx: 'PowerPointDocument',
  pdf: 'PDF',
  png: 'Photo2',
  jpg: 'Photo2',
  jpeg: 'Photo2',
  gif: 'Photo2',
  one: 'OneNoteLogo',
  html: 'FileHTML',
};

export const DEFAULT_FILE_ICON = 'Page';
