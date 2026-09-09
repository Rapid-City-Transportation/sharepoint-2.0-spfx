import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import { type IPropertyPaneConfiguration, PropertyPaneTextField } from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import RapidCityHomepage from './components/RapidCityHomepage';
import { IRapidCityHomepageProps } from './components/IRapidCityHomepageProps';
import { initializeSP } from '../customerContactCards/services/spConfig';

export interface IRapidCityHomepageWebPartProps {
  /** JSON array of { label, url, iconName? } for quick links. */
  /** Contact Cards page URL for search redirect (e.g. /sites/intranet/SitePages/ContactCards.aspx). Update to real intranet link. */
  contactCardsPageUrl: string;
  /** Send Feedback link URL. Update to real feedback form/list. */
  feedbackUrl: string;
}


export default class RapidCityHomepageWebPart extends BaseClientSideWebPart<IRapidCityHomepageWebPartProps> {
  protected async onInit(): Promise<void> {
    await super.onInit();
    initializeSP(this.context);
  }

  public render(): void {
    const element: React.ReactElement<IRapidCityHomepageProps> = React.createElement(RapidCityHomepage, {
      contactCardsPageUrl: this.properties.contactCardsPageUrl || 'https://rapidcitytransport.sharepoint.com/sites/ContactCards',
      feedbackUrl: this.properties.feedbackUrl || '#',
      displayMode: this.displayMode,
    });

    ReactDom.render(element, this.domElement);
  }

catch {
      return DEFAULT_QUICK_LINKS;
    }
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
          header: {
            description: 'Rapid City Homepage settings',
          },
          groups: [
            {
              groupName: 'Links & URLs',
              groupFields: [
                PropertyPaneTextField('contactCardsPageUrl', {
                  label: 'Contact Cards page URL (for search redirect)',
                  description: 'e.g. /sites/intranet/SitePages/ContactCards.aspx',
                }),
                PropertyPaneTextField('feedbackUrl', {
                  label: 'Send Feedback link URL',
                }),
              ],
            },
          ],
        },
      ],
    };
  }
}
