import { WebPartContext } from '@microsoft/sp-webpart-base';
import { DepartmentKey } from '../services/DepartmentConfig';

export interface IDepartmentPublicPageProps {
  /** Which department to display. */
  departmentKey: DepartmentKey;
  /** Override Azure AD group ID from property pane (optional). */
  allowedGroupId?: string;
  /** Override resource page URL (optional). */
  resourcePageUrl?: string;
  /** Override contact email (optional). */
  contactEmail?: string;
  /** Override contact phone (optional). */
  contactPhone?: string;
  /** Override contact hours (optional). */
  contactHours?: string;
  /** SPFx context, needed for the MSGraphClient group membership check. */
  context: WebPartContext;
}
