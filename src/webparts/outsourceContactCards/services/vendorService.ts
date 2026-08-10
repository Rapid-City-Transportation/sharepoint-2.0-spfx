import { IVendor } from '../models/types';
import { getSP } from './spConfig';
import { DD, DD_SELECT_FIELDS, MGR, MGR_SELECT_FIELDS } from './fieldNames';
import { mapManagerRows, mapRowToVendor } from '../mappers/vendorMapper';
import { isManagerView } from './permissions';
import { MOCK_VENDORS } from '../mock/mockVendors';

/** Set true to run the page off mock data instead of the Dispatch lists. */
const USE_MOCK_DATA = false;

const MOCK_DELAY_MS = 400;

const CACHE_TTL_MS = 5 * 60 * 1000;

interface ICacheEntry {
  data: IVendor[];
  timestamp: number;
}

let _cache: ICacheEntry | undefined;

/**
 * Loads the vendor directory. Read-only: this module issues item GETs only.
 */
export async function fetchVendors(): Promise<IVendor[]> {
  if (USE_MOCK_DATA) {
    await new Promise<void>(resolve => setTimeout(resolve, MOCK_DELAY_MS));
    return MOCK_VENDORS;
  }

  if (_cache && Date.now() - _cache.timestamp < CACHE_TTL_MS) {
    return _cache.data;
  }

  // ContentTypeId can't be indexed, so this throttles if the list ever passes
  // 5,000 items. Add an indexed IsVendor column and filter on that instead.
  const rows: Record<string, unknown>[] = await getSP()
    .web.lists.getByTitle(DD.LIST_TITLE)
    .items.select(...DD_SELECT_FIELDS)
    .filter(`startswith(ContentTypeId,'${DD.OUTSOURCE_CONTENT_TYPE_ID}')`)
    .top(4999)();

  // Most rows leave Active Vendor blank, so only explicit "Inactive" is hidden.
  const vendors = rows
    .filter(r => r[DD.ActiveVendor] !== 'Inactive')
    .map(mapRowToVendor);

  if (isManagerView()) {
    await attachManagerInfo(vendors);
  }

  _cache = { data: vendors, timestamp: Date.now() };
  return vendors;
}

/**
 * Joins manager-view rows onto vendors by Driver Directory id. Swallows errors
 * so a denied read (permission-trimmed list) just leaves the sections empty.
 */
async function attachManagerInfo(vendors: IVendor[]): Promise<void> {
  try {
    const rows: Record<string, unknown>[] = await getSP()
      .web.lists.getByTitle(MGR.LIST_TITLE)
      .items.select(...MGR_SELECT_FIELDS)
      .top(4999)();

    const byDirectoryId = mapManagerRows(rows);
    for (const vendor of vendors) {
      const info = byDirectoryId.get(vendor.id);
      if (info) vendor.managerOnly = info;
    }
  } catch {
    return;
  }
}
