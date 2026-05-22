import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField,
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import CustomerExperienceHub from './components/CustomerExperienceHub';
import { ICustomerExperienceHubProps } from './components/ICustomerExperienceHubProps';
import { initializeSP as initializeEmployeesSP } from '../employeeDirectory/services/spConfig';
import { initializeSP as initializeFeedbackSP } from '../customerContactCards/services/spConfig';

export interface ICustomerExperienceHubWebPartProps {
  title: string;
  subtitle: string;
}

export default class CustomerExperienceHubWebPart extends BaseClientSideWebPart<ICustomerExperienceHubWebPartProps> {

  protected async onInit(): Promise<void> {
    await super.onInit();
    // The hub pulls team data from the Employee Tracker on the Management
    // site, and submits feedback to SiteFeedback on IntranetRedesignSharepoint20.
    // Each spConfig is a separate SPFI singleton targeting its own site.
    initializeEmployeesSP(this.context);
    initializeFeedbackSP(this.context);
  }

  public render(): void {
    const element: React.ReactElement<ICustomerExperienceHubProps> = React.createElement(
      CustomerExperienceHub,
      {
        title: this.properties.title || 'Customer Experience',
        subtitle:
          this.properties.subtitle ||
          'Everything you need for daily operations, in one place.',
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
          header: { description: 'Customer Experience Hub (Prototype) Settings' },
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
