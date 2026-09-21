import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import { type IPropertyPaneConfiguration } from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import IncidentReview from './components/IncidentReview';
import { IIncidentReviewProps } from './components/IIncidentReviewProps';
import { initializeSP as initializeCompassSP } from '../healthSafety/services/spConfig';
import { initializeSP as initializeFeedbackSP } from '../customerContactCards/services/spConfig';

/**
 * HR's review queue for the Incident Reports list. The page itself holds no
 * secrets: every read runs as the signed-in user, so the list's own
 * permissions decide whether a visitor sees the whole queue (HR) or only the
 * reports they submitted themselves (everyone else).
 */
export default class IncidentReviewWebPart extends BaseClientSideWebPart<Record<string, never>> {

  protected async onInit(): Promise<void> {
    await super.onInit();
    // Compass SPFI (shared with healthSafety) for the Incident Reports list;
    // feedback SPFI for the Footer and the nav's notification bell.
    initializeCompassSP(this.context);
    initializeFeedbackSP(this.context);
  }

  public render(): void {
    const element: React.ReactElement<IIncidentReviewProps> = React.createElement(IncidentReview, {});
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
          header: { description: 'Incident Review Settings' },
          groups: [],
        },
      ],
    };
  }
}
