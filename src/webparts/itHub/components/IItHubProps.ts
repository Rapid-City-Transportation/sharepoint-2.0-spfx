import { WebPartContext } from '@microsoft/sp-webpart-base';

export interface IItHubProps {
  /** Welcome-card heading (property-pane editable, like the CX hub). */
  welcomeTitle: string;
  /** Welcome-card subline (property-pane editable, like the CX hub). */
  welcomeSubtitle: string;
  /** IT Team Notebook URL (property-pane override of the config default). */
  notebookUrl: string;
  /** AAD group GUID gating the page; placeholder GUIDs skip the Graph check. */
  allowedGroupId: string;
  context: WebPartContext;
}
