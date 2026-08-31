import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField,
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import FleetHub from './components/FleetHub';
import { IFleetHubProps } from './components/IFleetHubProps';
import { initializeSP as initializeFeedbackSP } from '../customerContactCards/services/spConfig';
import { initializeSP as initializeAnnouncementsSP } from '../rapidCityHomepage/services/announcementsSpConfig';
import { initializeSP as initializeEmployeesSP } from '../employeeDirectory/services/spConfig';

export interface IFleetHubWebPartProps {
  bannerEyebrow: string;
  bannerTitle: string;
}

export default class FleetHubWebPart extends BaseClientSideWebPart<IFleetHubWebPartProps> {

  protected async onInit(): Promise<void> {
    await super.onInit();
    // Footer feedback (SiteFeedback), announcements (updates card), and the
    // Employee Highlight roster (team card). Tools carry no data source yet.
    initializeFeedbackSP(this.context);
    initializeAnnouncementsSP(this.context);
    initializeEmployeesSP(this.context);
  }

  public render(): void {
    const element: React.ReactElement<IFleetHubProps> = React.createElement(
      FleetHub,
      {
        bannerEyebrow: this.properties.bannerEyebrow || 'Latest updates',
        bannerTitle: this.properties.bannerTitle || 'Team updates and notices',
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
          header: { description: 'Fleet Hub Settings' },
          groups: [
            {
              groupName: 'Latest Updates Banner',
              groupFields: [
                PropertyPaneTextField('bannerEyebrow', {
                  label: 'Banner Eyebrow',
                }),
                PropertyPaneTextField('bannerTitle', {
                  label: 'Banner Title',
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
