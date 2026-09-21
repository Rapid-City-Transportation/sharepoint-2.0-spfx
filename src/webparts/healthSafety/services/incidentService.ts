import { getSP } from './spConfig';

/**
 * The online incident report, replacing the old Excel Incident Investigation
 * Form for first submissions. Rows land in the "Incident Reports" list on
 * compass with HRReviewed=false, and a Power Automate flow on the list emails
 * HR. That is the whole routing: HR reviews each report on the incidentReview
 * page, exports a PDF when WSIB or the safety committee needs a copy, and
 * marks it filed (HRReviewed=true). There is no separate Health & Safety
 * mailbox. Harassment reports are flagged Confidential.
 *
 * Create the list with EXACTLY these single-word column names:
 * Title (built in), ReporterName (text), ReporterEmail (text),
 * IncidentDate (date), Location (text), IncidentType (choice: Injury or
 * illness / Near miss / Hazard or unsafe condition / Harassment or bullying /
 * Other), Severity (choice: Minor/Major/Critical/N/A), Description
 * (multi-line plain), Witnesses (text), ImmediateAction (multi-line plain),
 * Confidential (Yes/No), HRReviewed (Yes/No, default No). Then lock it down: item-level permissions = read/edit own
 * items only, plus unique list permissions granting HR Full Control (the
 * level that carries Override List Behaviors, which is what lets HR see
 * past the item-level restriction; incidentReview keys off that permission).
 * Everyone who must be able to submit needs at least Contribute.
 */
const LIST_TITLE = 'Incident Reports';

export type IncidentType =
  | 'Injury or illness'
  | 'Near miss'
  | 'Hazard or unsafe condition'
  | 'Harassment or bullying'
  | 'Other';

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
      // Blanks get explicit text so the HR notification email and list
      // views never show dangling empty labels.
      Location: input.location || 'Not specified',
      IncidentType: input.incidentType,
      Severity: input.severity || 'N/A',
      Description: input.description,
      Witnesses: input.witnesses || 'None reported',
      ImmediateAction: input.immediateAction || 'None reported',
      Confidential: isConfidential(input.incidentType),
      HRReviewed: false,
    });
}
