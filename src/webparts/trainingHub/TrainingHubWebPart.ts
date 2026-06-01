import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField,
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import TrainingHub from './components/TrainingHub';
import { ITrainingHubProps } from './components/ITrainingHubProps';
import { initializeSP as initializeEmployeesSP } from '../employeeDirectory/services/spConfig';
import { initializeSP as initializeFeedbackSP } from '../customerContactCards/services/spConfig';

export interface ITrainingHubWebPartProps {
  title: string;
  subtitle: string;
}

export default class TrainingHubWebPart extends BaseClientSideWebPart<ITrainingHubWebPartProps> {

  protected async onInit(): Promise<void> {
    await super.onInit();
    // Training team section pulls from the Employee Highlight list on the
    // root site; Footer's Send Feedback writes to SiteFeedback on
    // IntranetRedesignSharepoint20. Both SPFI singletons need init.
    initializeEmployeesSP(this.context);
    initializeFeedbackSP(this.context);
  }

  public render(): void {
    const element: React.ReactElement<ITrainingHubProps> = React.createElement(
      TrainingHub,
      {
        title: this.properties.title || 'Training',
        subtitle:
          this.properties.subtitle ||
          'Learning paths, resources, and your training team in one place.',
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
          header: { description: 'Training Hub Settings' },
          groups: [
            {
              groupName: 'Hero',
              groupFields: [
                PropertyPaneTextField('title', {
                  label: 'Hero Title',
                }),
                PropertyPaneTextField('subtitle', {
                  label: 'Hero Subtitle',
                  multiline: true,
                }),
              ],
            },
          ],
        },
      ],
    };
  }
}
