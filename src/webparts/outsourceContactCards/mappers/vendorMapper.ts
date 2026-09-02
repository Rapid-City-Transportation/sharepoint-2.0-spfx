import {
  IVendor,
  IVendorManagerInfo,
  IVendorZoneProfile,
  VendorPriority,
} from '../models/types';
import { COV, MGR, ML } from '../services/fieldNames';

type SPRow = Record<string, unknown>;

function readString(row: SPRow, field: string): string | undefined {
  const val = row[field];
  if (typeof val === 'string' && val.trim().length > 0) return val.trim();
  return undefined;
}

function readBool(row: SPRow, field: string): boolean {
  const val = row[field];
  return val === true || val === 1 || val === '1';
}

/** Never comma-splits: choice values contain commas, e.g. "Tri Cities (Guelph,
 *  Kitchener, Cambridge)". A string value is a single choice. */
function readChoiceArray(row: SPRow, field: string): string[] {
  const val = row[field];
  if (Array.isArray(val)) {
    return val
      .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      .map(v => v.trim());
  }
  if (typeof val === 'string' && val.trim().length > 0) {
    return [val.trim()];
  }
  return [];
}

function splitCities(value?: string): string[] {
  if (!value) return [];
  return value.split(',').map(s => s.trim()).filter(s => s.length > 0);
}

/** Coverage Rank number to the on-screen tier. Blank stays undefined. */
function rankToPriority(rank: unknown): VendorPriority | undefined {
  if (typeof rank !== 'number') return undefined;
  if (rank <= 1) return 'Primary Option';
  if (rank === 2) return 'Secondary Option';
  return 'When Required';
}

/**
 * Merges the coverage rows for one (vendor, zone) into a single profile.
 * The list deliberately holds one row per rank in a zone (CoverageKey
 * "vendorId-zone-rank"): the vendor is Primary in some towns and Secondary
 * in others. One profile per zone keeps the chips and tabs honest, while
 * cityTiers preserves the per-town priority split for the detail view.
 */
function mergeCoverageRows(rows: SPRow[]): IVendorZoneProfile {
  const sorted = rows.slice().sort((a, b) => {
    const ra = typeof a[COV.Rank] === 'number' ? (a[COV.Rank] as number) : 99;
    const rb = typeof b[COV.Rank] === 'number' ? (b[COV.Rank] as number) : 99;
    return ra - rb;
  });

  const cities: string[] = [];
  const seen = new Set<string>();
  const tiers: { priority: VendorPriority; cities: string[] }[] = [];
  const notes: string[] = [];
  let phone: string | undefined;
  let phoneAlt: string | undefined;
  let email: string | undefined;
  let vehicles: string[] | undefined;

  for (const row of sorted) {
    const rowCities = splitCities(readString(row, COV.Cities));
    for (const c of rowCities) {
      const k = c.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        cities.push(c);
      }
    }
    const priority = rankToPriority(row[COV.Rank]);
    if (priority && rowCities.length > 0) {
      tiers.push({ priority, cities: rowCities });
    }
    const note = readString(row, COV.DispatchNotes);
    if (note && notes.indexOf(note) === -1) notes.push(note);
    phone = phone || readString(row, COV.DispatchPhone);
    phoneAlt = phoneAlt || readString(row, COV.DispatchPhoneAlt);
    email = email || readString(row, COV.DispatchEmail);
    if (!vehicles) {
      const vo = readChoiceArray(row, COV.VehicleOverride);
      if (vo.length > 0) vehicles = vo;
    }
  }

  const priority = rankToPriority(sorted[0][COV.Rank]);
  // The split stays whenever it says something the flat priority does not:
  // more than one tier, or a lone tier whose rank differs from the zone's
  // best rank (a rank-1 row with no cities must not relabel rank-2 towns).
  const keepTiers =
    tiers.length > 1 || (tiers.length === 1 && tiers[0].priority !== priority);

  return {
    zone: readString(sorted[0], COV.Zone),
    cities,
    priority,
    specialInstructions: notes.length > 0 ? notes.join(' | ') : undefined,
    dispatchPhone: phone,
    dispatchPhoneAlt: phoneAlt,
    dispatchEmail: email,
    vehicleTypes: vehicles,
    cityTiers: keepTiers ? tiers : undefined,
  };
}

function mapMasterRow(row: SPRow): IVendor {
  return {
    id: String(row[ML.Id] ?? row['Id'] ?? ''),
    name: readString(row, ML.ProperName) || readString(row, ML.Title) || '(unnamed vendor)',
    operatingName: readString(row, ML.ERPSystemName),
    vehicleTypes: readChoiceArray(row, ML.VehicleTypesC),
    portal: readBool(row, ML.PortalAccessYN),
    zones: [],
    templates: [],
    dispatch: {
      phone: readString(row, ML.ContactPhone),
      secondaryPhone: readString(row, ML.PhoneAlt),
      email: readString(row, ML.ContactEmail),
      hours: readString(row, ML.Hours),
      notes: readString(row, ML.Restriction),
      bookingMethod:
        readString(row, ML.PhoneOnly) === 'Yes' ? 'Phone only' : undefined,
    },
  };
}

/**
 * Joins masterlist records to their coverage rows. Coverage rows whose
 * lookup points nowhere (mid-migration data still being identified) become
 * standalone vendors from the row's own fields, so dispatch can still reach
 * them. Masters with no active coverage keep a single empty profile so the
 * card stays searchable.
 */
export function mapMasterAndCoverage(
  masterRows: SPRow[],
  coverageRows: SPRow[]
): IVendor[] {
  const byId = new Map<string, IVendor>();
  const inactiveIds = new Set<string>();
  for (const row of masterRows) {
    if (row[ML.ActiveYN] === false) {
      inactiveIds.add(String(row[ML.Id] ?? row['Id'] ?? ''));
      continue;
    }
    const vendor = mapMasterRow(row);
    byId.set(vendor.id, vendor);
  }

  const standalone: IVendor[] = [];
  const grouped = new Map<string, { vendor: IVendor; rows: SPRow[] }>();
  const soloGroups = new Map<string, SPRow[]>();
  for (const row of coverageRows) {
    if (row[COV.CoverageActive] === false) continue;
    const legacyId = readString(row, COV.OldDirectoryID);
    const refRaw = row[COV.VendorRefId];
    const refKey =
      refRaw !== null && refRaw !== undefined ? String(refRaw) : undefined;
    // A row pointing at a deactivated master is deactivated with it; only
    // rows whose lookup was never set become standalone cards.
    if (refKey && inactiveIds.has(refKey)) continue;
    const master = refKey ? byId.get(refKey) : undefined;

    if (master) {
      if (legacyId && !master.legacyDirectoryId) {
        master.legacyDirectoryId = legacyId;
      }
      // Blank-zone rows stay separate profiles; named zones merge per zone.
      const zone = readString(row, COV.Zone);
      const groupKey = zone
        ? `${refKey}|${zone}`
        : `${refKey}|#${String(row[COV.Id] ?? '')}`;
      const group = grouped.get(groupKey);
      if (group) {
        group.rows.push(row);
      } else {
        grouped.set(groupKey, { vendor: master, rows: [row] });
      }
      continue;
    }

    // Unrefd rows come in the same rank pairs as everything else; group
    // them by (name, zone) so half a company never becomes a second card
    // that recommends its own other half.
    const title = readString(row, COV.Title);
    const zone = readString(row, COV.Zone);
    const soloKey =
      title && zone
        ? `solo|${title.toLowerCase()}|${zone}`
        : `solo|#${String(row[COV.Id] ?? '')}`;
    const soloGroup = soloGroups.get(soloKey);
    if (soloGroup) {
      soloGroup.push(row);
    } else {
      soloGroups.set(soloKey, [row]);
    }
  }
  grouped.forEach(group => {
    group.vendor.zones.push(mergeCoverageRows(group.rows));
  });
  soloGroups.forEach(rows => {
    const first = rows[0];
    const profile = mergeCoverageRows(rows);
    standalone.push({
      id: `cov-${String(first[COV.Id] ?? first['Id'] ?? '')}`,
      name: readString(first, COV.Title) || '(unnamed vendor)',
      vehicleTypes: profile.vehicleTypes || [],
      portal: false,
      zones: [profile],
      templates: [],
      dispatch: {
        phone: profile.dispatchPhone,
        secondaryPhone: profile.dispatchPhoneAlt,
        email: profile.dispatchEmail,
        notes: profile.specialInstructions,
      },
      legacyDirectoryId: rows
        .map(r => readString(r, COV.OldDirectoryID))
        .filter(Boolean)[0],
    });
  });

  const vendors: IVendor[] = [];
  byId.forEach(vendor => {
    if (vendor.zones.length === 0) {
      vendor.zones.push({ cities: [] });
    }
    vendors.push(vendor);
  });

  return vendors
    .concat(standalone)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Manager rows keyed by Driver Directory id, for a single-pass join. */
export function mapManagerRows(rows: SPRow[]): Map<string, IVendorManagerInfo> {
  const byDirectoryId = new Map<string, IVendorManagerInfo>();
  for (const row of rows) {
    const directoryId = row[MGR.DirectoryLookupId];
    if (directoryId === null || directoryId === undefined) continue;
    byDirectoryId.set(String(directoryId), {
      insuranceProvider: readString(row, MGR.InsuranceProvider),
      policyNumber: readString(row, MGR.PolicyNumber),
      coverageType: readString(row, MGR.CoverageType),
      policyExpiry: readString(row, MGR.PolicyExpiryDate),
      insuranceStatus: readString(row, MGR.InsuranceStatus),
      daysUntilExpiry: readString(row, MGR.DaysUntilExpiry),
      certificateOnFile: readBool(row, MGR.CertificateOnFile),
      businessLicenceOnFile: readBool(row, MGR.BusinessLicenceOnFile),
      vehicleSafetyDocsOnFile: readBool(row, MGR.VehicleSafetyDocsOnFile),
      wsibClearanceOnFile: readBool(row, MGR.WsibClearanceOnFile),
      contractOnFile: readBool(row, MGR.ContractOnFile),
      lastReviewDate: readString(row, MGR.LastReviewDate),
      nextReviewDate: readString(row, MGR.NextReviewDate),
      accountType: readString(row, MGR.AccountType),
      creditCardOnFile: readBool(row, MGR.CreditCardOnFile),
      hstGstNumber: readString(row, MGR.HstGstNumber),
      rateNotes: readString(row, MGR.RateNotes),
      billingContactName: readString(row, MGR.BillingContactName),
      billingEmail: readString(row, MGR.BillingEmail),
      billingPhone: readString(row, MGR.BillingPhone),
      escalationsContact: readString(row, MGR.EscalationsContact),
      reviewNotes: readString(row, MGR.VendorReviewNotes),
      dispatchNotes: readString(row, MGR.DispatchNotes),
      managerNotes: readString(row, MGR.ManagerNotes),
      operationsNotes: readString(row, MGR.OperationsNotes),
    });
  }
  return byDirectoryId;
}
