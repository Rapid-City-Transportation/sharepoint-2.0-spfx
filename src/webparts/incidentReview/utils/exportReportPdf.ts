import { IIncidentReport } from '../services/incidentReviewService';

// Static shell only: every value from the report is inserted afterwards
// through textContent, so nothing a reporter typed is ever parsed as HTML.
const SHELL = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title></title>
<style>
  @page { size: letter; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 32px; font-family: "Segoe UI", Arial, sans-serif; color: #262931; font-size: 12pt; line-height: 1.5; }
  .toolbar { display: flex; align-items: center; gap: 16px; margin: 0 0 28px; padding: 14px 18px; border: 1px solid #D0D5DD; border-radius: 10px; background: #F4F6FA; }
  .toolbar button { min-height: 44px; padding: 10px 20px; border: 0; border-radius: 8px; background: #D29F1C; color: #262931; font: 700 14px "Segoe UI", Arial, sans-serif; cursor: pointer; }
  .toolbar button:focus-visible { outline: 3px solid #1F4C7F; outline-offset: 2px; }
  .toolbar p { margin: 0; font-size: 13px; color: #4A5568; }
  .brand { margin: 0; font-size: 11pt; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #1F4C7F; }
  h1 { margin: 2px 0 4px; font-size: 22pt; }
  .sub { margin: 0; color: #4A5568; font-size: 11pt; }
  .confidential { margin: 16px 0 0; padding: 8px 12px; border: 2px solid #9B2C2C; color: #9B2C2C; font-weight: 700; letter-spacing: 0.04em; }
  table { width: 100%; margin: 20px 0 0; border-collapse: collapse; }
  th, td { padding: 8px 10px; border: 1px solid #D0D5DD; text-align: left; vertical-align: top; }
  th { width: 34%; background: #F4F6FA; font-weight: 700; }
  h2 { margin: 22px 0 6px; font-size: 13pt; color: #1F4C7F; }
  .block { margin: 0; padding: 10px 12px; border: 1px solid #D0D5DD; white-space: pre-wrap; overflow-wrap: anywhere; }
  .footer { margin: 28px 0 0; padding: 10px 0 0; border-top: 1px solid #D0D5DD; font-size: 9.5pt; color: #4A5568; }
  h2, .block { break-inside: avoid; }
  @media print { body { padding: 0; } .toolbar { display: none; } }
</style></head><body></body></html>`;

function formatDate(iso: string | undefined, withTime: boolean): string {
  if (!iso) return 'Not specified';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return withTime
    ? d.toLocaleString([], { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' });
}

/** YYYY-MM-DD for the suggested file name, from the local calendar date. */
function fileDate(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  if (isNaN(d.getTime())) return 'undated';
  const pad = (n: number): string => (n < 10 ? `0${n}` : String(n));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Opens one incident report as a clean, printable document in a new tab and
 * brings up the print dialog, where "Save as PDF" produces the file HR sends
 * to WSIB or the safety committee. The browser prints it, so there is no PDF
 * library in the bundle and the text in the file stays selectable. Returns
 * false when the browser blocked the new tab, so the caller can say so.
 */
export function exportReportPdf(report: IIncidentReport, exportedBy?: string): boolean {
  const win = window.open('', '_blank');
  if (!win) return false;

  const doc = win.document;
  doc.open();
  doc.write(SHELL);
  doc.close();

  // Browsers use the document title as the suggested PDF file name.
  const safeType = report.incidentType.replace(/[\\/:*?"<>|]+/g, ' ').trim();
  doc.title = `Incident Report ${report.id} - ${safeType} - ${fileDate(report.incidentDate)}`;

  const body = doc.body;
  const el = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    text?: string,
    className?: string
  ): HTMLElementTagNameMap[K] => {
    const node = doc.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };

  const toolbar = el('div', undefined, 'toolbar');
  const printButton = el('button', 'Print or save as PDF');
  printButton.type = 'button';
  printButton.onclick = () => win.print();
  toolbar.appendChild(printButton);
  toolbar.appendChild(el('p', 'In the print window, choose "Save as PDF" as the destination to keep a file copy.'));
  body.appendChild(toolbar);

  body.appendChild(el('p', 'Rapid City Transportation', 'brand'));
  body.appendChild(el('h1', 'Incident Report'));
  body.appendChild(el('p', `Report #${report.id}  |  ${report.filed ? 'Filed by HR' : 'Awaiting HR review'}`, 'sub'));

  if (report.confidential) {
    body.appendChild(el('p', 'CONFIDENTIAL: share this report only with the people who need it.', 'confidential'));
  }

  const submittedBy = report.authorName || report.reporterName;
  const rows: [string, string][] = [
    ['Incident type', report.incidentType],
    ['Nature of injury', report.severity && report.severity !== 'N/A' ? report.severity : 'Not applicable'],
    ['Date of incident', formatDate(report.incidentDate, false)],
    ['Location', report.location || 'Not specified'],
    ['Submitted', formatDate(report.submitted, true)],
    ['Submitted by', report.authorEmail ? `${submittedBy} (${report.authorEmail})` : submittedBy],
  ];
  if (report.authorName && report.reporterName.toLowerCase() !== report.authorName.toLowerCase()) {
    rows.push(['Name entered on the report', report.reporterName]);
  }
  if (report.reporterEmail && report.reporterEmail !== report.authorEmail) {
    rows.push(['Email entered on the report', report.reporterEmail]);
  }

  const table = el('table');
  rows.forEach(([label, value]) => {
    const tr = el('tr');
    const th = el('th', label);
    th.scope = 'row';
    tr.appendChild(th);
    tr.appendChild(el('td', value));
    table.appendChild(tr);
  });
  body.appendChild(table);

  const sections: [string, string][] = [
    ['What happened', report.description || 'No description provided.'],
    ['Witnesses', report.witnesses || 'None reported'],
    ['Immediate action taken', report.immediateAction || 'None reported'],
  ];
  sections.forEach(([heading, text]) => {
    body.appendChild(el('h2', heading));
    body.appendChild(el('p', text, 'block'));
  });

  const exported = formatDate(new Date().toISOString(), true);
  body.appendChild(
    el('p', `Exported ${exported}${exportedBy ? ` by ${exportedBy}` : ''} from the Compass incident review page.`, 'footer')
  );

  win.focus();
  // Let the new tab lay out before the dialog snapshots it.
  win.setTimeout(() => win.print(), 300);
  return true;
}
