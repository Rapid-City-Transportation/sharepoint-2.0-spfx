// Reuses the Contact Cards SPFI singleton, which already targets
// IntranetRedesignSharepoint20 (where the CX Announcements list lives) and is
// initialized in every hub web part's onInit via initializeFeedbackSP.
import { getSP } from '../../customerContactCards/services/spConfig';

const LIST_TITLE = 'CX Announcements';
const TENANT_ORIGIN = 'https://rapidcitytransport.sharepoint.com';

/** One announcement, shaped for the cards that render it. */
export interface IAnnouncement {
  /** Badge text e.g. "PAUSE"; empty for News items (which render with no badge). */
  tag: string;
  tone: 'pause' | 'school' | 'change' | 'info';
  title: string;
  body: string;
  /** Friendly relative timestamp, e.g. "Today · 8:10 AM". */
  time: string;
  featured: boolean;
  /** Optional "Read more" target. */
  linkUrl?: string;
  /** Created-by display name, for pages that show "Posted by". */
  author?: string;
  /** Optional card image URL (used by the public "What's New" cards). */
  imageUrl?: string;
}

interface IRawAnnouncement {
  Title?: string;
  // "Page" is a multi-select Choice, so SharePoint returns an array of values.
  Page?: string[] | string;
  Category?: string;
  Body?: string;
  Active?: boolean;
  Featured?: boolean;
  LinkUrl?: { Url?: string } | null;
  // Card image is now an uploaded Image column, which SharePoint stores as a
  // list-item attachment. We read it from AttachmentFiles instead of a URL.
  AttachmentFiles?: { ServerRelativeUrl?: string }[];
  Created?: string;
  Author?: { Title?: string } | null;
}

const TONE_BY_CATEGORY: Record<string, IAnnouncement['tone']> = {
  pause: 'pause',
  school: 'school',
  change: 'change',
  info: 'info',
  news: 'info',
};

/**
 * Fetch the active announcements tagged for a page (the `Page` column, e.g.
 * "SPRQ", "Trainers", "Customer Experience"). Page is multi-select, so one item
 * can appear on several pages. Returns [] on any error so callers can fall back
 * to their built-in defaults and never render a blank card.
 */
export async function fetchAnnouncements(page: string): Promise<IAnnouncement[]> {
  const sp = getSP();
  const items: IRawAnnouncement[] = await sp.web.lists
    .getByTitle(LIST_TITLE)
    .items
    .select('Title', 'Page', 'Category', 'Body', 'Active', 'Featured', 'LinkUrl', 'Created', 'Author/Title', 'AttachmentFiles/ServerRelativeUrl')
    .expand('Author', 'AttachmentFiles')
    .orderBy('Created', true)
    .top(200)();

  return items
    .filter(it => it.Active !== false)
    .filter(it => pageMatches(it.Page, page))
    .map(mapItem);
}

function pageMatches(value: string[] | string | undefined, page: string): boolean {
  if (Array.isArray(value)) return value.indexOf(page) !== -1;
  return value === page;
}

function mapItem(it: IRawAnnouncement): IAnnouncement {
  const category = (it.Category || '').toString();
  const lower = category.toLowerCase();
  return {
    // News items have no badge - they read as a plain line.
    tag: lower && lower !== 'news' ? category.toUpperCase() : '',
    tone: TONE_BY_CATEGORY[lower] || 'info',
    title: it.Title || '',
    body: stripHtml(it.Body || ''),
    time: formatRelative(it.Created),
    featured: it.Featured === true,
    linkUrl: it.LinkUrl && it.LinkUrl.Url ? it.LinkUrl.Url : undefined,
    author: it.Author && it.Author.Title ? it.Author.Title : undefined,
    imageUrl: resolveAttachmentImage(it.AttachmentFiles),
  };
}

/** Pick the uploaded card image from the item's attachments. The modern Image
 *  column stores its file as a list attachment, so we use the first image-type
 *  attachment. Returns an absolute URL, or undefined if there is no image. */
function resolveAttachmentImage(atts?: { ServerRelativeUrl?: string }[]): string | undefined {
  if (!atts || atts.length === 0) return undefined;
  const isImg = (u?: string): boolean => !!u && /\.(png|jpe?g|gif|webp|bmp)$/i.test(u);
  const match = atts.filter(a => isImg(a.ServerRelativeUrl))[0] || atts[0];
  const url = match.ServerRelativeUrl;
  if (!url) return undefined;
  return url.indexOf('http') === 0 ? url : `${TENANT_ORIGIN}${url}`;
}

/** Reduce SharePoint rich text to plain text for one-line descriptions. */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Format a created timestamp as "Today · 8:10 AM", "Yesterday · 4:20 PM",
 *  "Mon · 2:05 PM", or "Jun 12 · 9:00 AM" for older items. */
function formatRelative(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const startOfDay = (x: Date): number =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);

  let label: string;
  if (days <= 0) label = 'Today';
  else if (days === 1) label = 'Yesterday';
  else if (days < 7) label = d.toLocaleDateString([], { weekday: 'short' });
  else label = d.toLocaleDateString([], { month: 'short', day: 'numeric' });

  return `${label} · ${time}`;
}
