export type VendorPriority = 'Primary Option' | 'Secondary Option' | 'When Required';

/** Sort order for the directory. Never exposed as a search or filter facet. */
export const VENDOR_PRIORITIES: VendorPriority[] = [
  'Primary Option',
  'Secondary Option',
  'When Required',
];

/** Rows with no priority sort after every explicit tier. */
export function priorityRank(priority?: VendorPriority): number {
  const idx = priority ? VENDOR_PRIORITIES.indexOf(priority) : -1;
  return idx === -1 ? VENDOR_PRIORITIES.length : idx;
}

/** All AA-accessible as text on white and as a background under white text. */
const ZONE_PALETTE: string[] = [
  '#1F4C7F',
  '#B84A00',
  '#2E7D32',
  '#6B21A8',
  '#187389',
  '#8A6A0C',
  '#9B2C2C',
  '#4A5568',
];

/**
 * Hashes the zone name to a palette colour. The list has 20+ zones and grows,
 * so a hand-kept map would go stale. Zone names always render alongside.
 */
export function zoneAccent(zone?: string): string {
  if (!zone) return ZONE_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < zone.length; i++) {
    hash = (hash * 31 + zone.charCodeAt(i)) | 0;
  }
  return ZONE_PALETTE[Math.abs(hash) % ZONE_PALETTE.length];
}

/** One zone a vendor serves. Most vendors have a single profile. */
export interface IVendorZoneProfile {
  zone?: string;
  cities: string[];
  priority?: VendorPriority;
  specialInstructions?: string;
}

export interface IVendorTemplate {
  title: string;
  body: string;
}

export interface IVendorDispatchContact {
  phone?: string;
  secondaryPhone?: string;
  afterHoursPhone?: string;
  email?: string;
  hours?: string;
  notes?: string;
  bookingMethod?: string;
  service247?: boolean;
}

/** From the Manager View list. Fetched and rendered for managers only. */
export interface IVendorManagerInfo {
  insuranceProvider?: string;
  policyNumber?: string;
  coverageType?: string;
  policyExpiry?: string;
  insuranceStatus?: string;
  daysUntilExpiry?: string;
  certificateOnFile?: boolean;
  businessLicenceOnFile?: boolean;
  vehicleSafetyDocsOnFile?: boolean;
  wsibClearanceOnFile?: boolean;
  contractOnFile?: boolean;
  lastReviewDate?: string;
  nextReviewDate?: string;
  accountType?: string;
  creditCardOnFile?: boolean;
  hstGstNumber?: string;
  rateNotes?: string;
  billingContactName?: string;
  billingEmail?: string;
  billingPhone?: string;
  escalationsContact?: string;
  reviewNotes?: string;
  dispatchNotes?: string;
  managerNotes?: string;
  operationsNotes?: string;
}

export interface IVendor {
  id: string;
  name: string;
  operatingName?: string;
  vehicleTypes: string[];
  portal: boolean;
  zones: IVendorZoneProfile[];
  templates: IVendorTemplate[];
  dispatch: IVendorDispatchContact;
  managerOnly?: IVendorManagerInfo;
}

export interface IVendorFilters {
  zone: string | 'All';
  city: string | 'All';
  vehicleType: string | 'All';
  searchText: string;
}

export const EMPTY_FILTERS: IVendorFilters = {
  zone: 'All',
  city: 'All',
  vehicleType: 'All',
  searchText: '',
};

/** Strongest priority across a vendor's zones, or undefined if none set. */
export function bestPriority(vendor: IVendor): VendorPriority | undefined {
  let best: VendorPriority | undefined;
  for (const z of vendor.zones) {
    if (z.priority && priorityRank(z.priority) < priorityRank(best)) {
      best = z.priority;
    }
  }
  return best;
}

/** Cities across all zones, deduplicated, in zone order. */
export function allCities(vendor: IVendor): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const z of vendor.zones) {
    for (const city of z.cities) {
      if (!seen.has(city)) {
        seen.add(city);
        out.push(city);
      }
    }
  }
  return out;
}
