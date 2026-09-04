import { getSP } from './spConfig';

/**
 * The online incident report, replacing the old Excel Incident Investigation
 * Form for first submissions. Rows land in the "Incident Reports" list on
 * compass with HRReviewed=false: HR (Liana) reviews every report first, and
 * only non-confidential reports she releases go on to the Health & Safety
 * mailbox (both notifications are Power Automate flows on the list, not
 * code). Harassment reports are flagged Confidential and never leave HR.
 *
 * Create the list with EXACTLY these single-word column names:
 * Title (built in), ReporterName (text), ReporterEmail (text),
 * IncidentDate (date), Location (text), IncidentType (choice), Severity
 * (choice: Minor/Major/Critical), Description (multi-line plain),
 * Witnesses (text), ImmediateAction (multi-line plain), Confidential
 * (Yes/No), HRReviewed (Yes/No, default No), ReleasedToHS (Yes/No,
 * default No). Then lock it down: item-level permissions = read/edit own
 * items only, plus unique list permissions granting HR full access.
 */
const LIST_TITLE = 'Incident Reports';

export type IncidentType =
  | 'Injury or illness'
  | 'Near miss'
  | 'Hazard or unsafe condition'
  | 'Harassment or bullying';

export type IncidentSeverity = 'Minor' | 'Major' | 'Critical';

export interface IIncidentInput {
  reporterName: string;
  reporterEmail: string;
  /** YYYY-MM-DD from the date input. */
  incidentDate: string;
  location: string;
  incidentType: IncidentType;
  severity?: IncidentSeverity;
  description: string;
  witnesses?: string;
  immediateAction?: string;
}

/** Harassment reports are confidential by definition: they go to HR only
 *  and must never appear in anything Health & Safety can read. */
export function isConfidential(type: IncidentType): boolean {
  return type === 'Harassment or bullying';
}

export async function submitIncident(input: IIncidentInput): Promise<void> {
  await getSP()
    .web.lists.getByTitle(LIST_TITLE)
    .items.add({
      Title: `${input.incidentType} - ${input.incidentDate}`,
      ReporterName: input.reporterName,
      ReporterEmail: input.reporterEmail,
      // Anchored at noon: SharePoint reads offset-less strings as UTC, and
      // midnight UTC renders as the previous day in Ontario.
      IncidentDate: `${input.incidentDate}T12:00:00`,
      Location: input.location,
      IncidentType: input.incidentType,
      Severity: input.severity || null,
      Description: input.description,
      Witnesses: input.witnesses || null,
      ImmediateAction: input.immediateAction || null,
      Confidential: isConfidential(input.incidentType),
      HRReviewed: false,
      ReleasedToHS: false,
    });
}
