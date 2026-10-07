import {
  allCities,
  allVehicleTypes,
  bestPriority,
  IVendor,
  IVendorFilters,
  IVendorZoneProfile,
  priorityRank,
  vehiclesForZone,
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
    ...allVehicleTypes(vendor),
  ]
    .join(' ')
    .toLowerCase();
  return blob.indexOf(q) !== -1;
}

type Facet = 'zone' | 'city' | 'vehicleType';

/**
 * Zone, city and vehicle must all hold within one zone profile: a vendor
 * serving London with {Byron} and Halton with {Acton} is not a match for
 * London + Acton, and a zone whose coverage overrides the vehicle list is
 * matched on that list. `ignore` drops one facet so its own options can be
 * listed with the other filters still applied.
 */
function profileMatches(
  vendor: IVendor,
  profile: IVendorZoneProfile,
  filters: IVendorFilters,
  ignore?: Facet
): boolean {
  return (
    (ignore === 'zone' || filters.zone === 'All' || profile.zone === filters.zone) &&
    (ignore === 'city' || filters.city === 'All' || profile.cities.indexOf(filters.city) !== -1) &&
    (ignore === 'vehicleType' ||
      filters.vehicleType === 'All' ||
      vehiclesForZone(vendor, profile).indexOf(filters.vehicleType) !== -1)
  );
}

/** Every vendor carries at least one profile, so no filter means every vendor passes. */
export function filterVendors(vendors: IVendor[], filters: IVendorFilters): IVendor[] {
  return vendors.filter(
    v => v.zones.some(z => profileMatches(v, z, filters)) && vendorMatchesQuery(v, filters.searchText)
  );
}

/** Priority first, then name. */
export function sortVendors(vendors: IVendor[]): IVendor[] {
  return [...vendors].sort((a, b) => {
    const rank = priorityRank(bestPriority(a)) - priorityRank(bestPriority(b));
    return rank !== 0 ? rank : a.name.localeCompare(b.name);
  });
}

export interface IFacetOptions {
  zones: string[];
  cities: string[];
  vehicleTypes: string[];
}

/**
 * Dropdown options narrowed by the other active filters (faceted search).
 * Each list is computed with its own selection removed, so the user can always
 * switch a value directly instead of clearing it first, and every value
 * offered is one filterVendors accepts with the other filters as they stand.
 * The grid passes searchText as '' so half-typed queries never reshape the
 * dropdowns or invalidate a selection.
 */
export function facetOptions(vendors: IVendor[], filters: IVendorFilters): IFacetOptions {
  const zones = new Set<string>();
  const cities = new Set<string>();
  const vehicleTypes = new Set<string>();
  for (const v of vendors) {
    if (!vendorMatchesQuery(v, filters.searchText)) continue;
    for (const z of v.zones) {
      if (z.zone && profileMatches(v, z, filters, 'zone')) zones.add(z.zone);
      if (profileMatches(v, z, filters, 'city')) {
        for (const c of z.cities) cities.add(c);
      }
      if (profileMatches(v, z, filters, 'vehicleType')) {
        for (const vt of vehiclesForZone(v, z)) vehicleTypes.add(vt);
      }
    }
  }
  return { zones: sorted(zones), cities: sorted(cities), vehicleTypes: sorted(vehicleTypes) };
}

function sorted(values: Set<string>): string[] {
  return Array.from(values).sort((a, b) => a.localeCompare(b));
}
