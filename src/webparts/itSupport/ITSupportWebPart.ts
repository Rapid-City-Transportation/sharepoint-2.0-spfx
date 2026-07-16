import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField,
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import ITSupport from './components/ITSupport';
import { IITSupportProps } from './components/IITSupportProps';
import { initializeSP as initializeTicketsSP } from './services/spConfig';
import { initializeSP as initializeFeedbackSP } from '../customerContactCards/services/spConfig';

const DEFAULT_PUBLIC_PAGE_URL =
  'https://rapidcitytransport.sharepoint.com/sites/compass/SitePages/InformationTechnology.aspx';

export interface IITSupportWebPartProps {
  publicPageUrl: string;
}

export default class ITSupportWebPart extends BaseClientSideWebPart<IITSupportWebPartProps> {

  protected async onInit(): Promise<void> {
    await super.onInit();
    // IT Tickets list (the ticket form) + SiteFeedback (Footer's Send Feedback).
    initializeTicketsSP(this.context);
    initializeFeedbackSP(this.context);
  }

  public render(): void {
    const user = this.context.pageContext.user;
    const element: React.ReactElement<IITSupportProps> = React.createElement(
      ITSupport,
      {
        publicPageUrl: this.properties.publicPageUrl || DEFAULT_PUBLIC_PAGE_URL,
        userDisplayName: user.displayName || '',
        userEmail: user.email || user.loginName || '',
      }
    );
    ReactDom.render(element, this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: { description: 'IT Support Page Settings' },
          groups: [
            {
              groupName: 'Links',
              groupFields: [
                PropertyPaneTextField('publicPageUrl', {
                  label: 'IT public page URL (used by the back link)',
                }),
              ],
            },
          ],
        },
      ],
    };
  }
}
