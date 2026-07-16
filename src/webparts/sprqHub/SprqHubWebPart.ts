import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField,
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import SprqHub from './components/SprqHub';
import { ISprqHubProps } from './components/ISprqHubProps';
import { initializeSP as initializeFeedbackSP } from '../customerContactCards/services/spConfig';
import { initializeSP as initializeRootSP } from './services/spConfig';
import { initializeSP as initializeCxSP } from '../customerExperienceHub/services/spConfig';
import { initializeSP as initializeAnnouncementsSP } from '../rapidCityHomepage/services/announcementsSpConfig';
import { initializeSP as initializeEmployeesSP } from '../employeeDirectory/services/spConfig';

export interface ISprqHubWebPartProps {
  bannerEyebrow: string;
  bannerTitle: string;
}

export default class SprqHubWebPart extends BaseClientSideWebPart<ISprqHubWebPartProps> {

  protected async onInit(): Promise<void> {
    await super.onInit();
    // The Footer's Send Feedback button writes to the SiteFeedback list on
    // IntranetRedesignSharepoint20 via the FeedbackService: its SPFI
    // instance has to be initialized for this web part to work standalone.
    initializeFeedbackSP(this.context);
    // Root-site SPFI for reading the master lists / trackers behind At a Glance.
    initializeRootSP(this.context);
    // CX site SPFI for the read-only Daily Task list shown in Task Schedule.
    initializeCxSP(this.context);
    // CX site SPFI for the CX Announcements list (updates).
    initializeAnnouncementsSP(this.context);
    // Root-site SPFI for the Employee Highlight list (SPRQ team roster).
    initializeEmployeesSP(this.context);
  }

  public render(): void {
    const element: React.ReactElement<ISprqHubProps> = React.createElement(
      SprqHub,
      {
        bannerEyebrow: this.properties.bannerEyebrow || 'Latest updates & temp changes',
        bannerTitle:
          this.properties.bannerTitle ||
          'Short term changes: read before dispatching',
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
          header: { description: 'SPRQ Hub Settings' },
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
