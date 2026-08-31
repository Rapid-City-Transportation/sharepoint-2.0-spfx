import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import { type IPropertyPaneConfiguration } from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import HealthSafety from './components/HealthSafety';
import { IHealthSafetyProps } from './components/IHealthSafetyProps';
import { initializeSP as initializeEmployeesSP } from '../employeeDirectory/services/spConfig';
import { initializeSP as initializeFeedbackSP } from '../customerContactCards/services/spConfig';

/** Entry point for the public Health & Safety page (HealthSafety.aspx). */
export default class HealthSafetyWebPart extends BaseClientSideWebPart<Record<string, never>> {

  protected async onInit(): Promise<void> {
    await super.onInit();
    // Root-site SPFI for the JHSC roster (Employee Highlight); feedback
    // SPFI for the Footer.
    initializeEmployeesSP(this.context);
    initializeFeedbackSP(this.context);
  }

  public render(): void {
    const element: React.ReactElement<IHealthSafetyProps> = React.createElement(HealthSafety, {});
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
          header: { description: 'Health & Safety Page Settings' },
          groups: [],
        },
      ],
    };
  }
}
