import {
  allCities,
  allVehicleTypes,
  bestPriority,
  IVendor,
  IVendorFilters,
  IVendorZoneProfile,
  compareProvinces,
  priorityRank,
  vehiclesForZone,
} from '../models/types';

/** A filter choice of its own: any wheelchair-capable vehicle, whichever
 *  loading side. When a client needs a wheelchair, dispatch rarely cares which. */
export const ANY_WHEELCHAIR = 'Wheelchair (any)';

function isWheelchair(vehicle: string): boolean {
  return /^wheelchair/i.test(vehicle);
}

function hasVehicle(vehicles: string[], wanted: string): boolean {
  return wanted === ANY_WHEELCHAIR ? vehicles.some(isWheelchair) : vehicles.indexOf(wanted) !== -1;
}

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
      hasVehicle(vehiclesForZone(vendor, profile), filters.vehicleType))
  );
}

/** Province is a vendor-level fact from the Masterlist. A standalone coverage
 *  row has no master and so no province; it always passes, since hiding a
 *  mid-migration vendor behind a filter it cannot satisfy helps nobody. */
function provinceMatches(vendor: IVendor, filters: IVendorFilters): boolean {
  if (filters.province === 'All' || !vendor.province) return true;
  return vendor.province.toUpperCase() === filters.province.toUpperCase();
}

/** Every vendor carries at least one profile, so no filter means every vendor passes. */
export function filterVendors(vendors: IVendor[], filters: IVendorFilters): IVendor[] {
  return vendors.filter(
    v =>
      provinceMatches(v, filters) &&
      v.zones.some(z => profileMatches(v, z, filters)) &&
      vendorMatchesQuery(v, filters.searchText)
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
  /** Two-letter codes; render with provinceName. */
  provinces: string[];
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
  const provinces = new Set<string>();
  const zones = new Set<string>();
  const cities = new Set<string>();
  const vehicleTypes = new Set<string>();
  for (const v of vendors) {
    if (!vendorMatchesQuery(v, filters.searchText)) continue;
    // The province list ignores the province selection, as every facet
    // ignores its own, so another province can always be picked directly.
    if (v.province && v.zones.some(z => profileMatches(v, z, filters))) {
      provinces.add(v.province.toUpperCase());
    }
    if (!provinceMatches(v, filters)) continue;
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
  if (Array.from(vehicleTypes).some(isWheelchair)) vehicleTypes.add(ANY_WHEELCHAIR);
  return {
    provinces: Array.from(provinces).sort(compareProvinces),
    zones: sorted(zones),
    cities: sorted(cities),
    vehicleTypes: sorted(vehicleTypes),
  };
}

function sorted(values: Set<string>): string[] {
  return Array.from(values).sort((a, b) => a.localeCompare(b));
}
