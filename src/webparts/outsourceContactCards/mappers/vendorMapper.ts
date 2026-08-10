import {
  IVendor,
  IVendorManagerInfo,
  IVendorZoneProfile,
  VendorPriority,
} from '../models/types';
import { DD, MGR } from '../services/fieldNames';

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

/** The list still says "Tertiary Option"; dispatch wanted "When Required" on
 *  screen. Blank stays undefined rather than defaulting to a tier. */
function mapPriority(raw?: string): VendorPriority | undefined {
  if (!raw) return undefined;
  if (raw === 'Tertiary Option') return 'When Required';
  if (raw === 'Primary Option' || raw === 'Secondary Option' || raw === 'When Required') {
    return raw;
  }
  return undefined;
}

/**
 * Maps one Outsource Company row to a vendor card. Multiple Home Zone values
 * fan out into a zone profile each, sharing the row's cities and priority.
 */
export function mapRowToVendor(row: SPRow): IVendor {
  const cities = splitCities(readString(row, DD.City));
  const priority = mapPriority(readString(row, DD.Priority));
  const specialInstructions = readString(row, DD.SpecialDispatchInstructions);
  const homeZones = readChoiceArray(row, DD.HomeZone);

  const zones: IVendorZoneProfile[] =
    homeZones.length > 0
      ? homeZones.map(zone => ({ zone, cities, priority, specialInstructions }))
      : [{ cities, priority, specialInstructions }];

  return {
    id: String(row[DD.Id] ?? row['Id'] ?? ''),
    name: readString(row, DD.Title) || '(unnamed vendor)',
    operatingName: readString(row, DD.OperatingName),
    vehicleTypes: readChoiceArray(row, DD.Vehicle),
    portal: readBool(row, DD.Portal),
    zones,
    templates: [],
    dispatch: {
      phone: readString(row, DD.Primary),
      secondaryPhone: readString(row, DD.Secondary),
      afterHoursPhone: readString(row, DD.AfterHoursPhone),
      email: readString(row, DD.Email),
      hours: readString(row, DD.HoursOfOperation),
      notes: readString(row, DD.Notes),
      bookingMethod: readString(row, DD.BookingMethod),
      service247: readBool(row, DD.Service247),
    },
  };
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
