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

/**
 * All AA-accessible as text on white and as a background under white text.
 * Brand blue #1F4C7F and slate #4A5568 are deliberately absent: those live on
 * the priority badges, and a zone chip in the same colour reads as a priority.
 */
const ZONE_PALETTE: string[] = [
  '#1D4ED8',
  '#B84A00',
  '#2E7D32',
  '#6B21A8',
  '#187389',
  '#8A6A0C',
  '#9B2C2C',
  '#BE185D',
];

function hashIndex(zone: string): number {
  let hash = 0;
  for (let i = 0; i < zone.length; i++) {
    hash = (hash * 31 + zone.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % ZONE_PALETTE.length;
}

// Populated from live data by buildZoneAccents; module-level so every consumer
// (cards, detail tabs, nav search rows) shares one assignment without the
// vendor list being threaded through Navigation's props.
let assignedAccents: Map<string, string> | undefined;

/**
 * Colour for a zone chip. Data-aware when the vendor list has loaded, hash
 * fallback before that. The list has 20+ zones and grows, so a hand-kept map
 * would go stale. Colour is decorative: zone names always render alongside.
 */
export function zoneAccent(zone?: string): string {
  if (!zone) return ZONE_PALETTE[0];
  const assigned = assignedAccents && assignedAccents.get(zone);
  return assigned || ZONE_PALETTE[hashIndex(zone)];
}

/**
 * Assigns palette colours so zones that co-occur on any vendor never share
 * one: each zone takes its hash-preferred slot unless a co-occurring zone got
 * there first, then probes forward. Alphabetical order keeps it deterministic.
 * The guarantee holds up to 8 zones on one vendor (the palette size); past
 * that a repeat is unavoidable and the probe keeps the preferred slot.
 */
export function buildZoneAccents(vendors: IVendor[]): void {
  const zones = new Set<string>();
  const coOccurring = new Map<string, Set<string>>();
  for (const v of vendors) {
    const named = v.zones.map(z => z.zone).filter((z): z is string => !!z);
    for (const a of named) {
      zones.add(a);
      for (const b of named) {
        if (a === b) continue;
        let set = coOccurring.get(a);
        if (!set) {
          set = new Set<string>();
          coOccurring.set(a, set);
        }
        set.add(b);
      }
    }
  }

  const result = new Map<string, string>();
  const ordered = Array.from(zones).sort((a, b) => a.localeCompare(b));
  for (const zone of ordered) {
    const taken = new Set<string>();
    const neighbours = coOccurring.get(zone);
    if (neighbours) {
      neighbours.forEach(n => {
        const c = result.get(n);
        if (c) taken.add(c);
      });
    }
    const start = hashIndex(zone);
    let colour = ZONE_PALETTE[start];
    for (let i = 0; i < ZONE_PALETTE.length; i++) {
      const candidate = ZONE_PALETTE[(start + i) % ZONE_PALETTE.length];
      if (!taken.has(candidate)) {
        colour = candidate;
        break;
      }
    }
    result.set(zone, colour);
  }
  assignedAccents = result;
}

/** One zone a vendor serves; built from one Outsource Vendor Coverage row. */
export interface IVendorZoneProfile {
  zone?: string;
  cities: string[];
  priority?: VendorPriority;
  specialInstructions?: string;
  /** Zone-specific dispatch line, when it differs from the company line. */
  dispatchPhone?: string;
  dispatchPhoneAlt?: string;
  dispatchEmail?: string;
  /** Zone-specific vehicle availability override. */
  vehicleTypes?: string[];
}

export interface IVendorTemplate {
  title: string;
  body: string;
}

/** Company-wide dispatch contact details, from the Masterlist row. */
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

/** One outsource company: a Masterlist record plus its per-zone coverage profiles. */
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
  /** Driver Directory row id carried over by the migration; joins the
   *  manager-view list, which still keys on the old directory. */
  legacyDirectoryId?: string;
}

/** Grid filter state. 'All' means that facet is not filtering. */
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
