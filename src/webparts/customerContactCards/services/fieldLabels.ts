/**
 * Maps the friendly field labels we put in the snapshot/ChangedFields
 * (e.g., "Passenger Notes") back to their SharePoint internal names
 * (e.g., "PassengerNotes"). Used when looking up the previous value
 * of a field from a fetched version record.
 *
 * Keep these in sync with the friendly names used in the Power Automate
 * `ChangedFieldsRaw` and `MergedSnapshot` Compose expressions.
 *
 * Lookup-type fields are intentionally excluded: version history stores
 * lookup values as numeric IDs, which can't be diffed meaningfully against
 * each other for end-user display.
 */

import { PB, IB } from './fieldNames';

export const PROTOCOL_BOOK_FIELD_MAP: Record<string, string> = {
  'Specification': PB.Specification,
  'Business Hours': PB.BusinessHours,
  'Special Instructions': PB.SpecialInstructions,
  'Confirmations (specific)': PB.ConfirmationsSpecific,
  'Passenger Notes': PB.PassengerNotes,
  'Trip Notes': PB.TripNotes,
  'Referral Options': PB.ReferralOptions,
  'Contact Before Trip Date': PB.ProblemWithReminderCall,
  'Before Trip Date': PB.ProblemWithReminderCall,
  'Problem With Reminder Call': PB.ProblemWithReminderCall,
  'Approval — All Modifications': PB.ApprovalAllModifications,
  'Approval - All Modifications': PB.ApprovalAllModifications,
  'Approval — Blanket': PB.ApprovalBlanket,
  'Approval - Blanket': PB.ApprovalBlanket,
  'Approval — RTW': PB.ApprovalRTW,
  'Approval - RTW': PB.ApprovalRTW,
  'Approval Notes': PB.ApprovalNotes,
};

export const INSTRUCTION_BLOCK_FIELD_MAP: Record<string, string> = {
  'Block Title': IB.Title,
  'Default Instructions': IB.DefaultText,
  'Description': IB.Description,
  'Approval to Modify': IB.ApprovalToModify,
};

/** Get the right field-label-to-internal-name map for a given source list. */
export function getFieldMap(
  sourceList: 'ProtocolBook' | 'InstructionBlock'
): Record<string, string> {
  return sourceList === 'ProtocolBook'
    ? PROTOCOL_BOOK_FIELD_MAP
    : INSTRUCTION_BLOCK_FIELD_MAP;
}

/**
 * Lookup-field labels → internal column names. These don't appear in the
 * snapshot (lookup values are numeric IDs that don't render usefully as text)
 * but we still need their internal names so the phantom-filter can compare
 * lookup IDs between versions and detect when SP fired a HasColumnChanged
 * event without actually changing the lookup target.
 */
export const PROTOCOL_BOOK_LOOKUP_MAP: Record<string, string> = {
  'Confirmation Call': PB.ConfirmationCall,
  'Confirmations': PB.Confirmations,
  'Wait Times': PB.WaitTimes,
  'Return Times Policy': PB.ReturnTimesPolicy,
  'Appointment Type': PB.ApptType,
  'Service Type': PB.ServiceType,
  'Service Amendments': PB.ServiceAmendments,
  'Vehicle Type Policy': PB.VehicleTypePolicy,
  'Cancel & Change Policy': PB.ChangePolicy,
  'Cancel Policy': PB.CancelPolicy,
};

/** Get the lookup-label-to-internal-name map for a source list.
 *  IB lists have no lookup columns we track, so it returns an empty map. */
export function getLookupMap(
  sourceList: 'ProtocolBook' | 'InstructionBlock'
): Record<string, string> {
  return sourceList === 'ProtocolBook' ? PROTOCOL_BOOK_LOOKUP_MAP : {};
}
