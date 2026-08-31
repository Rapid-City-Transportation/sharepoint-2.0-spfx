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

/**
 * Zone and city must hold within a single zone profile: a vendor serving
 * London with {Byron} and Halton with {Acton} is not a match for London +
 * Acton. The coverage list has one row per (vendor, zone), so cities are
 * genuinely per-zone; the separation is as good as the coverage data.
 */
export function filterVendors(vendors: IVendor[], filters: IVendorFilters): IVendor[] {
  return vendors.filter(v => {
    if (filters.zone !== 'All' || filters.city !== 'All') {
      const profileOk = v.zones.some(z =>
        (filters.zone === 'All' || z.zone === filters.zone) &&
        (filters.city === 'All' || z.cities.indexOf(filters.city) !== -1)
      );
      if (!profileOk) return false;
    }
    if (filters.vehicleType !== 'All' && v.vehicleTypes.indexOf(filters.vehicleType) === -1) {
      return false;
    }
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

export interface IFacetOptions {
  zones: string[];
  cities: string[];
  vehicleTypes: string[];
}

/**
 * Dropdown options narrowed by the other active filters (faceted search).
 * Each list is computed with its own selection removed, so the user can always
 * switch a value directly instead of clearing it first. Zone and city narrow
 * each other per zone profile, matching filterVendors: with London selected,
 * the city list holds only the cities inside vendors' London profiles.
 * The grid passes searchText as '' so half-typed queries never reshape the
 * dropdowns or invalidate a selection.
 */
export function facetOptions(vendors: IVendor[], filters: IVendorFilters): IFacetOptions {
  const base = filterVendors(vendors, { ...filters, zone: 'All', city: 'All' });
  const zones = new Set<string>();
  const cities = new Set<string>();
  for (const v of base) {
    for (const z of v.zones) {
      if (z.zone && (filters.city === 'All' || z.cities.indexOf(filters.city) !== -1)) {
        zones.add(z.zone);
      }
      if (filters.zone === 'All' || z.zone === filters.zone) {
        for (const c of z.cities) cities.add(c);
      }
    }
  }

  const vehicleTypes = new Set<string>();
  for (const v of filterVendors(vendors, { ...filters, vehicleType: 'All' })) {
    for (const vt of v.vehicleTypes) vehicleTypes.add(vt);
  }

  return { zones: sorted(zones), cities: sorted(cities), vehicleTypes: sorted(vehicleTypes) };
}

function sorted(values: Set<string>): string[] {
  return Array.from(values).sort((a, b) => a.localeCompare(b));
}
