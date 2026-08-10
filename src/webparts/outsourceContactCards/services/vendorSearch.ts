import {
  allCities,
  bestPriority,
  IVendor,
  IVendorFilters,
  priorityRank,
} from '../models/types';

/**
 * Matches against name, operating name, zones, cities, and vehicle types.
 * Priority is excluded by design: dispatch must not search on it.
 */
export function vendorMatchesQuery(vendor: IVendor, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const blob = [
    vendor.name,
    vendor.operatingName || '',
    ...vendor.zones.map(z => z.zone || ''),
    ...allCities(vendor),
    ...vendor.vehicleTypes,
  ]
    .join(' ')
    .toLowerCase();
  return blob.indexOf(q) !== -1;
}

export function filterVendors(vendors: IVendor[], filters: IVendorFilters): IVendor[] {
  return vendors.filter(v => {
    if (filters.zone !== 'All' && !v.zones.some(z => z.zone === filters.zone)) return false;
    if (filters.city !== 'All' && !v.zones.some(z => z.cities.indexOf(filters.city) !== -1)) return false;
    if (filters.vehicleType !== 'All' && v.vehicleTypes.indexOf(filters.vehicleType) === -1) return false;
    return vendorMatchesQuery(v, filters.searchText);
  });
}

/** Priority first, then name. */
export function sortVendors(vendors: IVendor[]): IVendor[] {
  return [...vendors].sort((a, b) => {
    const rank = priorityRank(bestPriority(a)) - priorityRank(bestPriority(b));
    return rank !== 0 ? rank : a.name.localeCompare(b.name);
  });
}

export function distinctCities(vendors: IVendor[]): string[] {
  const seen = new Set<string>();
  for (const v of vendors) {
    for (const city of allCities(v)) seen.add(city);
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
}

export function distinctZones(vendors: IVendor[]): string[] {
  const seen = new Set<string>();
  for (const v of vendors) {
    for (const z of v.zones) {
      if (z.zone) seen.add(z.zone);
    }
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
}

export function distinctVehicleTypes(vendors: IVendor[]): string[] {
  const seen = new Set<string>();
  for (const v of vendors) {
    for (const vt of v.vehicleTypes) seen.add(vt);
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
}
