import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField,
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import TrainersHub from './components/TrainersHub';
import { ITrainersHubProps } from './components/ITrainersHubProps';
import { initializeSP as initializeFeedbackSP } from '../customerContactCards/services/spConfig';

export interface ITrainersHubWebPartProps {
  weekTitle: string;
  weekDateRange: string;
}

export default class TrainersHubWebPart extends BaseClientSideWebPart<ITrainersHubWebPartProps> {

  protected async onInit(): Promise<void> {
    await super.onInit();
    // The Footer's Send Feedback button writes to the SiteFeedback list
    // on IntranetRedesignSharepoint20 via the FeedbackService — its SPFI
    // instance has to be initialized for this web part to work standalone.
    initializeFeedbackSP(this.context);
  }

  public render(): void {
    const element: React.ReactElement<ITrainersHubProps> = React.createElement(
      TrainersHub,
      {
        weekTitle: this.properties.weekTitle || 'Week of May 25',
        weekDateRange: this.properties.weekDateRange || 'May 25 to May 31, 2026',
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
          header: { description: 'Trainers Hub Settings' },
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
