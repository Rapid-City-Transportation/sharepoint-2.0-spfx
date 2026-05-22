import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField,
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import TeamLeadHub from './components/TeamLeadHub';
import { ITeamLeadHubProps } from './components/ITeamLeadHubProps';
import { initializeSP as initializeFeedbackSP } from '../customerContactCards/services/spConfig';

export interface ITeamLeadHubWebPartProps {
  weekTitle: string;
  weekDateRange: string;
}

export default class TeamLeadHubWebPart extends BaseClientSideWebPart<ITeamLeadHubWebPartProps> {

  protected async onInit(): Promise<void> {
    await super.onInit();
    // The Footer's Send Feedback button writes to the SiteFeedback list
    // on IntranetRedesignSharepoint20 via the FeedbackService — that SPFI
    // instance has to be initialized for this web part to work standalone.
    initializeFeedbackSP(this.context);
  }

  public render(): void {
    const element: React.ReactElement<ITeamLeadHubProps> = React.createElement(
      TeamLeadHub,
      {
        weekTitle: this.properties.weekTitle || 'Week of May 20',
        weekDateRange: this.properties.weekDateRange || 'May 18 to May 24, 2026',
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
          header: { description: 'Team Lead Hub Settings' },
          groups: [
            {
              groupName: 'Weekly Focus',
              groupFields: [
                PropertyPaneTextField('weekTitle', {
                  label: 'Week Title',
                }),
                PropertyPaneTextField('weekDateRange', {
                  label: 'Date Range',
                }),
              ],
            },
          ],
        },
      ],
    };
  }
}
