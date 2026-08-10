import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField,
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import ItHub from './components/ItHub';
import { IItHubProps } from './components/IItHubProps';
import { initializeSP } from './services/spConfig';
import { NOTEBOOK_URL_DEFAULT } from './services/itHubConfig';
import { initializeSP as initializeEmployeesSP } from '../employeeDirectory/services/spConfig';
import { initializeSP as initializeFeedbackSP } from '../customerContactCards/services/spConfig';
import { DEPARTMENT_CONFIGS } from '../departmentPublicPage/services/DepartmentConfig';

export interface IItHubWebPartProps {
  /** Welcome-card heading override. */
  welcomeTitle: string;
  /** Welcome-card subline override. */
  welcomeSubtitle: string;
  /** IT Team Notebook URL override. */
  notebookUrl: string;
  /** AAD group GUID override for the access gate. */
  allowedGroupId: string;
}

export default class ItHubWebPart extends BaseClientSideWebPart<IItHubWebPartProps> {

  protected async onInit(): Promise<void> {
    await super.onInit();
    // IT team site SPFI (delegated): the document library reads run as the
    // signed-in user, so SharePoint enforces the private-site permissions.
    initializeSP(this.context);
    // Employee Highlight SPFI: the Senior & Support Team card reads it via
    // the Employee Directory hook, like the CX hub.
    initializeEmployeesSP(this.context);
    // Contact Cards site SPFI: Navigation search/notifications and the
    // Footer's feedback modal both depend on it.
    initializeFeedbackSP(this.context);
  }

  public render(): void {
    const element: React.ReactElement<IItHubProps> = React.createElement(
      ItHub,
      {
        welcomeTitle: this.properties.welcomeTitle || 'IT Team',
        welcomeSubtitle:
          this.properties.welcomeSubtitle ||
          'Quick access to documents, the team notebook, and internal IT resources.',
        notebookUrl: this.properties.notebookUrl || NOTEBOOK_URL_DEFAULT,
        // Single source of truth: the same IT group that gates the public
        // page's hub button gates this page's content.
        allowedGroupId:
          this.properties.allowedGroupId ||
          DEPARTMENT_CONFIGS.informationTechnology.groupId,
        context: this.context,
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
          header: { description: 'IT Team Hub settings' },
          groups: [
            {
              groupName: 'Welcome card',
              groupFields: [
                PropertyPaneTextField('welcomeTitle', {
                  label: 'Title',
                }),
                PropertyPaneTextField('welcomeSubtitle', {
                  label: 'Subtitle',
                }),
              ],
            },
            {
              groupName: 'Links',
              groupFields: [
                PropertyPaneTextField('notebookUrl', {
                  label: 'Team Notebook URL',
                  description:
                    'Defaults to the site notebook redirect. Set a direct OneNote link to override.',
                }),
              ],
            },
            {
              groupName: 'Access',
              groupFields: [
                PropertyPaneTextField('allowedGroupId', {
                  label: 'Azure AD Group ID (GUID)',
                  description:
                    'Members of this group can view the page. Leave empty to use the IT default from DepartmentConfig.',
                }),
              ],
            },
          ],
        },
      ],
    };
  }
}
