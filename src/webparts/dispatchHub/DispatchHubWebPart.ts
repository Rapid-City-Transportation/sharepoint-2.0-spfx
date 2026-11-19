import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField,
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import DispatchHub from './components/DispatchHub';
import { IDispatchHubProps } from './components/IDispatchHubProps';
import { initializeSP as initializeEmployeesSP } from '../employeeDirectory/services/spConfig';
import { initializeSP as initializeFeedbackSP } from '../customerContactCards/services/spConfig';
import { initializeSP as initializeDispatchSP } from './services/spConfig';

export interface IDispatchHubWebPartProps {
  title: string;
  subtitle: string;
}

export default class DispatchHubWebPart extends BaseClientSideWebPart<IDispatchHubWebPartProps> {

  protected async onInit(): Promise<void> {
    await super.onInit();
    // Employee Highlight roster (team card), SiteFeedback (Footer), and the
    // Dispatch site lists behind Weekend Sign-Up and Zones & Rosters.
    initializeEmployeesSP(this.context);
    initializeFeedbackSP(this.context);
    initializeDispatchSP(this.context);
  }

  public render(): void {
    const element: React.ReactElement<IDispatchHubProps> = React.createElement(
      DispatchHub,
      {
        title: this.properties.title || 'Dispatch',
        subtitle:
          this.properties.subtitle ||
          'Everything you need for daily operations, in one place.',
        userDisplayName: this.context.pageContext.user.displayName,
        userLogin: this.context.pageContext.user.email || this.context.pageContext.user.loginName,
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
          header: { description: 'Dispatch Hub Settings' },
          groups: [
            {
              groupName: 'Welcome card',
              groupFields: [
                PropertyPaneTextField('title', {
                  label: 'Title',
                }),
                PropertyPaneTextField('subtitle', {
                  label: 'Subtitle',
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
