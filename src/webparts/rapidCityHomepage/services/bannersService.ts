// Reuses the Contact Cards SPFI singleton, which already targets
// IntranetRedesignSharepoint20 (where the Home Banners list lives) and is
// initialized in the homepage web part's onInit via initializeSP.
import { getSP } from '../../customerContactCards/services/spConfig';
import { IBannerSlide } from '../components/BannerCarousel/BannerCarousel';

const LIST_TITLE = 'Home Banners';
const TENANT_ORIGIN = 'https://rapidcitytransport.sharepoint.com';
// The modern Image column stores its file as a list-item attachment and only
// returns a fileName. The file itself lives at <list>/Attachments/<itemId>/<fileName>
// (same pattern as the Employee Tracker photo column).
const ATTACHMENTS_BASE =
  `${TENANT_ORIGIN}/sites/IntranetRedesignSharepoint20/Lists/Home%20Banners/Attachments`;

interface IRawBanner {
  Id: number;
  Title?: string;
  // Modern "Image" column: a JSON string (sometimes an object). Typed unknown
  // so the resolver can handle every shape.
  BannerImage?: unknown;
  ImageAltText?: string;
  Active?: boolean;
  SortOrder?: number;
}

/**
 * Active homepage banner slides, ordered by SortOrder. Each row is an uploaded
 * image (text baked in), so every slide is image-only (hideOverlay). Returns []
 * on any error so the carousel falls back to its built-in slides and never goes
 * blank.
 */
export async function fetchBanners(): Promise<IBannerSlide[]> {
  const sp = getSP();
  const items: IRawBanner[] = await sp.web.lists
    .getByTitle(LIST_TITLE)
    .items
    .select('Id', 'Title', 'BannerImage', 'ImageAltText', 'Active', 'SortOrder')
    .top(50)();

  return items
    .filter(it => it.Active !== false)
    .sort((a, b) => order(a.SortOrder) - order(b.SortOrder))
    .map(toSlide)
    .filter((s): s is IBannerSlide => s !== undefined);
}

// SortOrder ascending; rows with no SortOrder sink to the bottom.
function order(value: number | undefined): number {
  return typeof value === 'number' ? value : Number.MAX_SAFE_INTEGER;
}

function toSlide(it: IRawBanner): IBannerSlide | undefined {
  const backgroundImage = resolveImageUrl(it.BannerImage, it.Id);
  if (!backgroundImage) return undefined; // a banner with no image is nothing to show
  return {
    id: `home-banner-${it.Id}`,
    title: it.Title || '',
    subtitle: '',
    iconName: '',
    backgroundImage,
    backgroundAlt: it.ImageAltText || it.Title || '',
    // Image-only: render the uploaded picture, no text overlay/card.
    hideOverlay: true,
  };
}

interface IImageShape {
  serverUrl?: string;
  serverRelativeUrl?: string;
  Url?: string;
  fileName?: string;
}

/**
 * Resolve a SharePoint image/link column value to an <img> src. Handles:
 *  - Image column stored as an attachment: { fileName } -> build attachment URL
 *  - Image column with a server-relative URL: { serverUrl, serverRelativeUrl }
 *  - Hyperlink/Picture column: { Url }
 *  - A plain absolute URL or a server-relative path string
 */
function resolveImageUrl(raw: unknown, itemId: number): string | undefined {
  if (raw === null || raw === undefined || raw === '') return undefined;

  let shape: IImageShape | undefined;
  if (typeof raw === 'object') {
    shape = raw as IImageShape;
  } else if (typeof raw === 'string') {
    const s = raw.trim();
    if (s.indexOf('http') === 0) return s;
    if (s.charAt(0) === '/') return `${TENANT_ORIGIN}${s}`;
    if (s.charAt(0) === '{') {
      try {
        shape = JSON.parse(s) as IImageShape;
      } catch {
        return undefined;
      }
    }
  }
  if (!shape) return undefined;

  if (shape.serverRelativeUrl) {
    return shape.serverRelativeUrl.indexOf('http') === 0
      ? shape.serverRelativeUrl
      : `${shape.serverUrl || TENANT_ORIGIN}${shape.serverRelativeUrl}`;
  }
  if (shape.Url) return shape.Url;
  if (shape.fileName) {
    return `${ATTACHMENTS_BASE}/${itemId}/${encodeURIComponent(shape.fileName)}`;
  }
  return undefined;
}
