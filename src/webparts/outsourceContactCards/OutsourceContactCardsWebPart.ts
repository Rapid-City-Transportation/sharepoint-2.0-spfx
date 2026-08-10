import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField,
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import OutsourceContactCards from './components/OutsourceContactCards';
import { IOutsourceContactCardsProps } from './components/IOutsourceContactCardsProps';
import { initializeSP } from './services/spConfig';
import { initializeSP as initializeFeedbackSP } from '../customerContactCards/services/spConfig';

export interface IOutsourceContactCardsWebPartProps {
  title: string;
}

/**
 * Outsource Vendor Contact Cards. Reads the Dispatch site lists; also inits the
 * Contact Cards SPFI, which the nav bell and footer feedback modal depend on.
 */
export default class OutsourceContactCardsWebPart extends BaseClientSideWebPart<IOutsourceContactCardsWebPartProps> {

  protected async onInit(): Promise<void> {
    await super.onInit();
    initializeSP(this.context);
    initializeFeedbackSP(this.context);
  }

  public render(): void {
    const element: React.ReactElement<IOutsourceContactCardsProps> = React.createElement(
      OutsourceContactCards,
      {
        title: this.properties.title || 'Outsource Contact Cards',
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
          header: { description: 'Outsource Contact Cards settings' },
          groups: [
            {
              groupName: 'Page',
              groupFields: [
                PropertyPaneTextField('title', {
                  label: 'Page Title',
                }),
              ],
            },
          ],
        },
      ],
    };
  }
}
