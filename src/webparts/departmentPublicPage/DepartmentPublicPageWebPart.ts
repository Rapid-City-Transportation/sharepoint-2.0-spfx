import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneDropdown,
  PropertyPaneTextField,
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import DepartmentPublicPage from './components/DepartmentPublicPage';
import { IDepartmentPublicPageProps } from './models/IDepartmentPublicPageProps';
import {
  DepartmentKey,
  ALL_DEPARTMENT_KEYS,
  DEPARTMENT_CONFIGS,
} from './services/DepartmentConfig';
import { initializeSP } from './services/spConfig';
import { initializeSP as initializeFeedbackSP } from '../customerContactCards/services/spConfig';
import { initializeSP as initializeDirectorySP } from '../employeeDirectory/services/spConfig';

export interface IDepartmentPublicPageWebPartProps {
  /** Department key: determines which department's content is rendered. */
  departmentKey: string;
  /** Azure AD group GUID (optional override). */
  allowedGroupId: string;
  /** Department hub page URL (optional override). */
  resourcePageUrl: string;
  /** Contact email (optional override). */
  contactEmail: string;
  /** Contact phone (optional override). */
  contactPhone: string;
  /** Contact hours (optional override). */
  contactHours: string;
}

export default class DepartmentPublicPageWebPart extends BaseClientSideWebPart<IDepartmentPublicPageWebPartProps> {

  protected async onInit(): Promise<void> {
    await super.onInit();
    initializeSP(this.context);
    initializeFeedbackSP(this.context);
    // Leaders now source from the Employee Highlight list (root site) via the
    // Employee Directory reader, so its SPFI must be initialized too.
    initializeDirectorySP(this.context);
  }

  public render(): void {
    const element: React.ReactElement<IDepartmentPublicPageProps> = React.createElement(
      DepartmentPublicPage,
      {
        departmentKey: (this.properties.departmentKey || 'customerExperience') as DepartmentKey,
        allowedGroupId: this.properties.allowedGroupId || '',
        resourcePageUrl: this.properties.resourcePageUrl || '',
        contactEmail: this.properties.contactEmail || '',
        contactPhone: this.properties.contactPhone || '',
        contactHours: this.properties.contactHours || '',
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
          header: { description: 'Department Public Page settings' },
          groups: [
            {
              groupName: 'Department',
              groupFields: [
                PropertyPaneDropdown('departmentKey', {
                  label: 'Department',
                  options: ALL_DEPARTMENT_KEYS.map((k) => ({
                    key: k,
                    text: DEPARTMENT_CONFIGS[k].displayName,
                  })),
                }),
              ],
            },
            {
              groupName: 'Authorization',
              groupFields: [
                PropertyPaneTextField('allowedGroupId', {
                  label: 'Azure AD Group ID (GUID)',
                  description:
                    'Members of this M365 group will see the "View Department Resources" button. ' +
                    'Leave empty to use the default from DepartmentConfig.',
                }),
              ],
            },
            {
              groupName: 'Overrides (optional)',
              groupFields: [
                PropertyPaneTextField('resourcePageUrl', {
                  label: 'Resource Page URL',
                  description: 'Override the locked-down department hub page URL.',
                }),
                PropertyPaneTextField('contactEmail', {
                  label: 'Contact Email',
                }),
                PropertyPaneTextField('contactPhone', {
                  label: 'Contact Phone',
                }),
                PropertyPaneTextField('contactHours', {
                  label: 'Contact Hours',
                }),
              ],
            },
          ],
        },
      ],
    };
  }
}
