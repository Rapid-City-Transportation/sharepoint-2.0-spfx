import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField,
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import AboutCompany from './components/AboutCompany';
import { IAboutCompanyProps } from './components/IAboutCompanyProps';
import { initializeSP as initializeEmployeesSP } from '../employeeDirectory/services/spConfig';
import { initializeSP as initializeAnnouncementsSP } from '../rapidCityHomepage/services/announcementsSpConfig';
import { initializeSP as initializeFeedbackSP } from '../customerContactCards/services/spConfig';

export interface IAboutCompanyWebPartProps {
  videoUrl: string;
}

/** Entry point for the public "All About the Company" page. The page reads
 *  three different sites, so onInit must initialize all three SPFI
 *  singletons before the React tree mounts. */
export default class AboutCompanyWebPart extends BaseClientSideWebPart<IAboutCompanyWebPartProps> {

  protected async onInit(): Promise<void> {
    await super.onInit();
    // Root-site SPFI for leadership profiles (Employee Highlight); compass
    // SPFI for Leadership Updates (Announcements); feedback SPFI for Footer.
    initializeEmployeesSP(this.context);
    initializeAnnouncementsSP(this.context);
    initializeFeedbackSP(this.context);
  }

  public render(): void {
    const element: React.ReactElement<IAboutCompanyProps> = React.createElement(AboutCompany, {
      videoUrl: this.properties.videoUrl,
    });
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
          header: { description: 'All About the Company Settings' },
          groups: [
            {
              groupName: 'Mission, Vision & Values video',
              groupFields: [
                PropertyPaneTextField('videoUrl', {
                  label: 'Video embed URL',
                  description:
                    'Paste the Stream or SharePoint embed link when the video is ready. Until then the page shows a launch note.',
                }),
              ],
            },
          ],
        },
      ],
    };
  }
}
