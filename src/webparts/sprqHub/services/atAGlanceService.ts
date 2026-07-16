import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/fields';
import { getSP } from './spConfig';

export interface IAtAGlanceCounts {
  routes: number;
  flight: number;
  bookings: number;
}

const MASTER_LISTS = [
  'Georgian College Masterlist',
  'Fanshawe Masterlist',
  'Conestoga College Masterlist',
  'BWDSB Masterlist',
];

// The Status column was renamed in the UI but kept its original internal name.
const STATUS_FIELD = 'sdfg';

// The list's display title contains an "&", which the URL renders as two spaces
// ("Flight  Hotel Tracker"); getByTitle 404s, so it's read by its
// server-relative URL instead.
const FLIGHT_HOTEL_URL = '/Lists/Flight  Hotel Tracker';

const SCHOOL_BOOKINGS_TITLE = 'School Bookings Tracker';

interface IField {
  InternalName: string;
  TypeAsString: string;
  Hidden: boolean;
}

// Active school routes = rows still Approved (vs Complete / Cancelled) across
// every college master list.
async function countApprovedRoutes(sp: SPFI): Promise<number> {
  const perList = await Promise.all(
    MASTER_LISTS.map(title =>
      sp.web.lists
        .getByTitle(title)
        .items.select('Id')
        .filter(`${STATUS_FIELD} eq 'Approved'`)
        .top(5000)()
        .then(items => items.length)
        .catch(() => 0)
    )
  );
  return perList.reduce((sum, n) => sum + n, 0);
}

// School booking quotes = rows still waiting for a quote to be produced.
async function countWaitingForQuote(sp: SPFI): Promise<number> {
  const items = await sp.web.lists
    .getByTitle(SCHOOL_BOOKINGS_TITLE)
    .items.select('Id')
    .filter("QuoteStatus eq 'Waiting for quote'")
    .top(5000)();
  return items.length;
}

// Terminal statuses on the Flight & Hotel Tracker. "Flight & hotel quotes"
// counts everything NOT in one of these (i.e. still in progress).
const FLIGHT_HOTEL_TERMINAL = ['Completed', 'Cancelled'];

function isTerminalStatus(value: unknown): boolean {
  return typeof value === 'string' && FLIGHT_HOTEL_TERMINAL.indexOf(value.trim()) !== -1;
}

// Flight & hotel quotes = rows still in progress (not Completed or Cancelled).
// This list's status column name is unknown, so it's resolved at read time as
// the Choice field that carries the terminal statuses.
async function countFlightHotelOpen(sp: SPFI): Promise<number> {
  const list = sp.web.getList(FLIGHT_HOTEL_URL);
  const fields: IField[] = await list.fields.select('InternalName', 'TypeAsString', 'Hidden')();
  const choices = fields.filter(f => !f.Hidden && (f.TypeAsString || '').indexOf('Choice') !== -1);
  if (choices.length === 0) return 0;

  const items: Record<string, unknown>[] = await list.items
    .select('Id', ...choices.map(f => f.InternalName))
    .top(5000)();

  const statusField = choices.find(f => items.some(it => isTerminalStatus(it[f.InternalName])));
  if (!statusField) return 0;
  return items.filter(it => !isTerminalStatus(it[statusField.InternalName])).length;
}

export async function getAtAGlanceCounts(): Promise<IAtAGlanceCounts> {
  const sp = getSP();
  const [routes, flight, bookings] = await Promise.all([
    countApprovedRoutes(sp).catch(() => 0),
    countFlightHotelOpen(sp).catch(() => 0),
    countWaitingForQuote(sp).catch(() => 0),
  ]);
  return { routes, flight, bookings };
}
