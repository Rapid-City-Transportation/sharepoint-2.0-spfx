import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import { type IPropertyPaneConfiguration } from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import HrSupport from './components/HrSupport';
import { IHrSupportProps } from './components/IHrSupportProps';
import { initializeSP as initializeFeedbackSP } from '../customerContactCards/services/spConfig';

/** Entry point for the public HR Support page (HRSupport.aspx). */
export default class HrSupportWebPart extends BaseClientSideWebPart<Record<string, never>> {

  protected async onInit(): Promise<void> {
    await super.onInit();
    // SiteFeedback (Footer's Send Feedback) is the page's only data access.
    initializeFeedbackSP(this.context);
  }

  public render(): void {
    const element: React.ReactElement<IHrSupportProps> = React.createElement(HrSupport, {});
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
          header: { description: 'HR Support Page Settings' },
          groups: [],
        },
      ],
    };
  }
}
