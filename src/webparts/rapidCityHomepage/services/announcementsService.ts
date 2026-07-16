// Reads the Announcements list, which lives on the compass intranet site (so
// every department's public page can render it for all staff). Each consuming
// web part initializes this SPFI in its onInit via initializeAnnouncementsSP.
import { getSP } from './announcementsSpConfig';

const LIST_TITLE = 'Announcements';
const TENANT_ORIGIN = 'https://rapidcitytransport.sharepoint.com';

/** One announcement, shaped for the cards that render it. */
export interface IAnnouncement {
  /** Badge text e.g. "PAUSE"; empty for News items (which render with no badge). */
  tag: string;
  tone: 'pause' | 'school' | 'change' | 'info';
  /** Raw category value (e.g. "News"), used to decide card behavior. */
  category: string;
  title: string;
  /** Plain-text body, for one-line previews. */
  body: string;
  /** Raw rich-text body HTML, for a "Read more" modal (sanitize before render). */
  bodyHtml: string;
  /** Friendly relative timestamp, e.g. "Today · 8:10 AM". */
  time: string;
  /** Optional "Read more" target. */
  linkUrl?: string;
  /** Created-by display name, for pages that show "Posted by". */
  author?: string;
  /** Optional card image URL (used by the public "What's New" cards). */
  imageUrl?: string;
}

interface IFieldDef {
  Title: string;
  InternalName: string;
}

// Internal names of the custom columns, resolved at read time (see below).
interface IResolvedFields {
  page?: string;
  category?: string;
  body?: string;
  active?: string;
  linkUrl?: string;
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
 * "SPRQ", "Trainers", "Customer Experience Public"). Page is multi-select, so
 * one item can appear on several pages. Returns [] on any error so callers can
 * fall back to their built-in defaults and never render a blank card.
 *
 * The list was moved between sites and can lose its original column internal
 * names on import, so the custom columns are resolved by their display Title
 * (or internal name) at read time and any the list no longer has are skipped,
 * rather than hardcoding a name that 400s the whole query.
 */
export async function fetchAnnouncements(page: string): Promise<IAnnouncement[]> {
  const sp = getSP();

  const fields: IFieldDef[] = await sp.web.lists
    .getByTitle(LIST_TITLE)
    .fields.select('Title', 'InternalName')();
  const find = (...names: string[]): string | undefined => {
    for (const name of names) {
      const lc = name.trim().toLowerCase();
      const match = fields.find(
        f =>
          (f.Title || '').trim().toLowerCase() === lc ||
          (f.InternalName || '').toLowerCase() === lc
      );
      if (match) return match.InternalName;
    }
    return undefined;
  };
  const f: IResolvedFields = {
    page: find('Page'),
    category: find('Category'),
    body: find('Body'),
    active: find('Active'),
    linkUrl: find('LinkUrl', 'Link Url'),
  };

  const selects = ['Title', 'Created', 'Author/Title'];
  [f.page, f.category, f.body, f.active, f.linkUrl].forEach(name => {
    if (name) selects.push(name);
  });

  let items: Record<string, unknown>[];
  try {
    items = await sp.web.lists
      .getByTitle(LIST_TITLE)
      .items.select(...selects, 'AttachmentFiles/ServerRelativeUrl')
      .expand('Author', 'AttachmentFiles')
      .orderBy('Created', true)
      .top(200)();
  } catch {
    // Attachments (the card image) may be disabled on the list after the
    // import; retry without them so the rest of the card still renders.
    items = await sp.web.lists
      .getByTitle(LIST_TITLE)
      .items.select(...selects)
      .expand('Author')
      .orderBy('Created', true)
      .top(200)();
  }

  return items
    .filter(it => (f.active ? it[f.active] !== false : true))
    .filter(it => pageMatches(f.page ? it[f.page] : undefined, page))
    .map(it => mapItem(it, f));
}

function pageMatches(value: unknown, page: string): boolean {
  if (Array.isArray(value)) return value.indexOf(page) !== -1;
  return value === page;
}

function mapItem(it: Record<string, unknown>, f: IResolvedFields): IAnnouncement {
  const category = f.category ? String(it[f.category] || '') : '';
  const lower = category.toLowerCase();
  const rawBody = f.body ? String(it[f.body] || '') : '';
  const link = f.linkUrl ? (it[f.linkUrl] as { Url?: string } | null) : null;
  const author = it.Author as { Title?: string } | null | undefined;
  return {
    // News items have no badge - they read as a plain line.
    tag: lower && lower !== 'news' ? category.toUpperCase() : '',
    tone: TONE_BY_CATEGORY[lower] || 'info',
    category,
    title: String(it.Title || ''),
    body: stripHtml(rawBody),
    bodyHtml: rawBody,
    time: formatRelative(it.Created as string | undefined),
    linkUrl: link && link.Url ? link.Url : undefined,
    author: author && author.Title ? author.Title : undefined,
    imageUrl: resolveAttachmentImage(it.AttachmentFiles as { ServerRelativeUrl?: string }[] | undefined),
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
