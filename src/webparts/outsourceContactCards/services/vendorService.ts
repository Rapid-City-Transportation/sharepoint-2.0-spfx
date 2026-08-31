import { buildZoneAccents, IVendor } from '../models/types';
import { getSP } from './spConfig';
import { COV, COV_SELECT_FIELDS, MGR, MGR_SELECT_FIELDS, ML, ML_SELECT_FIELDS } from './fieldNames';
import { mapManagerRows, mapMasterAndCoverage } from '../mappers/vendorMapper';
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
    buildZoneAccents(MOCK_VENDORS);
    return MOCK_VENDORS;
  }

  if (_cache && Date.now() - _cache.timestamp < CACHE_TTL_MS) {
    return _cache.data;
  }

  const [masterRows, coverageRows] = await Promise.all([
    getSP()
      .web.lists.getByTitle(ML.LIST_TITLE)
      .items.select(...ML_SELECT_FIELDS)
      .top(4999)() as Promise<Record<string, unknown>[]>,
    getSP()
      .web.lists.getByTitle(COV.LIST_TITLE)
      .items.select(...COV_SELECT_FIELDS)
      .top(4999)() as Promise<Record<string, unknown>[]>,
  ]);

  const vendors = mapMasterAndCoverage(masterRows, coverageRows);

  if (isManagerView()) {
    await attachManagerInfo(vendors);
  }

  // Zone chip colours are assigned from the loaded data so zones sharing a
  // vendor never share a colour; must happen before anything renders a chip.
  buildZoneAccents(vendors);

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
      // The manager list still keys on the old Driver Directory row id.
      if (!vendor.legacyDirectoryId) continue;
      const info = byDirectoryId.get(vendor.legacyDirectoryId);
      if (info) vendor.managerOnly = info;
    }
  } catch {
    return;
  }
}
