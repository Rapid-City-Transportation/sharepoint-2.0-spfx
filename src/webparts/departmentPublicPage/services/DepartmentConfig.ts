/**
 * Department configuration map for public department pages.
 *
 * Each department key maps to display-name, contact info, resource-hub URL,
 * and an Azure AD group GUID whose members see the "View Department Resources"
 * button.  Property-pane overrides take precedence over these defaults.
 *
 * Replace the placeholder groupId GUIDs with real Azure AD / M365 group IDs
 * once the groups are provisioned.
 */

export type DepartmentKey =
  | 'customerExperience'
  | 'dispatch'
  | 'accounting'
  | 'humanResources'
  | 'informationTechnology'
  | 'businessDevelopment'
  | 'fleet';

export interface IDepartmentConfig {
  key: DepartmentKey;
  displayName: string;
  subtitle: string;
  /** Short "About the Team" blurb shown in the hero. */
  about: string;
  /** Announcements list `Page` value this department's What's New filters on
   *  (e.g. "IT"). Falls back to "<displayName> Public" when omitted. */
  announcementPage?: string;
  /** Heading for the featured-people section. Defaults to "Meet the
   *  Department Leaders"; small departments that feature the whole team
   *  (e.g. IT) override it so the label matches who's actually shown. */
  teamSectionTitle?: string;
  contactEmail: string;
  contactPhone: string;
  contactHours: string;
  /** Optional richer contact emails, each with a short scope label telling
   *  the reader which address to use (Internal, External, Driver candidates,
   *  ...). Falls back to a single contactEmail entry when omitted. */
  contactEmails?: { email: string; scope: string }[];
  /** Optional structured office hours (grouped). Falls back to contactHours. */
  hoursGroups?: { title: string; rows: { days: string; time: string }[] }[];
  /** Optional labelled phone numbers (Main / Other / WSIB). Falls back to a
   *  single contactPhone entry when omitted. */
  phoneNumbers?: { label: string; number: string }[];
  /** URL to the locked-down department hub page (only for authorized members). */
  resourcePageUrl: string;
  /** Azure AD / M365 group GUID: members of this group see the CTA button. */
  groupId: string;
}

export const DEPARTMENT_CONFIGS: Record<DepartmentKey, IDepartmentConfig> = {
  customerExperience: {
    key: 'customerExperience',
    displayName: 'Customer Experience',
    subtitle: 'About the Team',
    about: 'Our Customer Experience team is the first point of contact for every passenger: booking trips, answering questions, and resolving issues so riders get where they need to go safely and on time.',
    contactEmail: 'customerexperience@rapidcitytransport.com',
    contactPhone: '+1 905-831-1500',
    contactHours: '8:00 AM - 5:00 PM',
    contactEmails: [
      { email: 'info@rapidcitytransport.com', scope: 'External' },
      { email: 'quality@rapidcitytransport.com', scope: 'External' },
      { email: 'customerexperience@rapidcitytransport.com', scope: 'Internal' },
      { email: 'accommodations@rapidcitytransport.com', scope: 'Accommodations' },
      { email: 'schoolbookings@rapidcitytransport.com', scope: 'School Bookings' },
      { email: 'clientcare@rapidcitytransport.com', scope: 'School Bookings' },
    ],
    phoneNumbers: [
      { label: 'Main', number: '+1 905-831-1500' },
      { label: 'Other', number: '+1 416-266-1500' },
      { label: 'WSIB', number: '+1 833-567-9742' },
      { label: 'Toll Free', number: '+1 888-202-3923' },
    ],
    hoursGroups: [
      {
        title: '',
        rows: [
          { days: 'Monday to Friday', time: '6:00 AM to 11:00 PM' },
          { days: 'Saturday, Sunday & Holidays', time: '8:00 AM to 5:00 PM' },
        ],
      },
    ],
    resourcePageUrl: 'https://rapidcitytransport.sharepoint.com/sites/CustomerService576/SitePages/Home.aspx',
    groupId: '00000000-0000-0000-0000-000000000001', // Replace with real GUID
  },
  dispatch: {
    key: 'dispatch',
    displayName: 'Dispatch',
    subtitle: 'About the Team',
    about: 'Our Dispatch team assigns trips to drivers and partner companies and keeps the schedule moving through the day. They handle the delays, cancellations and last-minute changes that come up, and they are the first call when a driver needs help on the road.',
    contactEmail: 'dispatch@rapidcitytransport.com',
    // Email-only until dispatch provides the number to publish.
    contactPhone: '',
    contactHours: '',
    hoursGroups: [
      {
        title: '',
        rows: [
          { days: 'Every day', time: '24 hours' },
        ],
      },
    ],
    // Private hub page on the Dispatch team site, so the site's own
    // permissions gate it the way the CX hub's site does. Create it with
    // exactly this name.
    resourcePageUrl: 'https://rapidcitytransport.sharepoint.com/sites/Dispatch/SitePages/DispatchHub.aspx',
    groupId: '00000000-0000-0000-0000-000000000002', // Replace with real GUID
  },
  accounting: {
    key: 'accounting',
    displayName: 'Accounting',
    subtitle: 'About the Team',
    about: 'Accounting manages the numbers behind the service: billing, payroll, and reporting that keep Rapid City Transportation running.',
    contactEmail: 'accounting@rapidcitytransport.com',
    // Email-only until the team provides the number to publish.
    contactPhone: '',
    contactHours: '',
    hoursGroups: [
      {
        title: '',
        rows: [
          { days: 'Monday to Friday', time: '8:00 AM to 5:00 PM' },
        ],
      },
    ],
    // Private hub page (create with exactly this name).
    resourcePageUrl: 'https://rapidcitytransport.sharepoint.com/sites/compass/SitePages/AccountingHub.aspx',
    groupId: '00000000-0000-0000-0000-000000000003', // Replace with real GUID
  },
  humanResources: {
    key: 'humanResources',
    displayName: 'Human Resources',
    subtitle: 'About the Team',
    about: 'Our Human Resources team is dedicated to creating a positive, supportive, and engaging workplace for everyone at Rapid City Transportation. Whether you have questions about payroll, policies, training, or employee programs, we are here to help.',
    teamSectionTitle: 'Meet the Team',
    contactEmail: 'hr@rapidcitytransport.com',
    contactPhone: '',
    contactHours: '',
    // Purpose-routed addresses, in the CX shape: the scope label tells a
    // reader which one to use (or hand to a candidate or agency). No phone
    // numbers by HR's request: contact is email-only on the public page.
    contactEmails: [
      { email: 'Driverrecruitment@rapidcitytransport.com', scope: 'Driver candidates' },
      { email: 'Careers@rapidcitytransport.com', scope: 'Office candidates' },
      { email: 'hr@rapidcitytransport.com', scope: 'General' },
    ],
    hoursGroups: [
      {
        title: '',
        rows: [
          { days: 'Monday to Friday', time: '9:00 AM to 5:00 PM' },
        ],
      },
    ],
    // Private hub page (create with exactly this name).
    // Blank until the HR hub is a real page: the public page hides its
    // "View Department Hub" button rather than link to a mock.
    resourcePageUrl: '',
    groupId: '00000000-0000-0000-0000-000000000004', // Replace with real GUID
  },
  informationTechnology: {
    key: 'informationTechnology',
    displayName: 'Information Technology',
    subtitle: 'About the Team',
    about: 'Information Technology keeps our systems running: support, security, and the tools every team relies on each day.',
    announcementPage: 'IT',
    teamSectionTitle: 'Meet the Team',
    contactEmail: 'support@rapidcitytransport.com',
    contactPhone: '',
    contactHours: '',
    hoursGroups: [
      {
        title: '',
        rows: [
          { days: 'Monday to Friday', time: '9:00 AM to 5:00 PM' },
        ],
      },
    ],
    // Private IT hub page, hosted on the RCT-ITTeam site so site permissions
    // gate it (page must be named exactly ITHub).
    resourcePageUrl: 'https://rapidcitytransport.sharepoint.com/sites/RCT-ITTeam/SitePages/ITHub.aspx',
    groupId: '00000000-0000-0000-0000-000000000005', // Replace with real GUID
  },
  businessDevelopment: {
    key: 'businessDevelopment',
    displayName: 'Business Development',
    subtitle: 'About the Team',
    about: 'Business Development grows our service: building partnerships and finding new ways to serve the Rapid City community.',
    contactEmail: 'bizdev@rapidcitytransport.com',
    // Email-only until the team provides the number to publish.
    contactPhone: '',
    contactHours: '',
    hoursGroups: [
      {
        title: '',
        rows: [
          { days: 'Monday to Friday', time: '8:00 AM to 5:00 PM' },
        ],
      },
    ],
    // Private hub page (create with exactly this name).
    resourcePageUrl: 'https://rapidcitytransport.sharepoint.com/sites/compass/SitePages/BusinessDevelopmentHub.aspx',
    groupId: '00000000-0000-0000-0000-000000000006', // Replace with real GUID
  },
  fleet: {
    key: 'fleet',
    displayName: 'Fleet',
    subtitle: 'About the Team',
    about: 'Fleet keeps our vehicles road-ready: maintenance, safety, and the equipment behind every trip.',
    // Confirm this alias exists before publishing the page.
    contactEmail: 'fleet@rapidcitytransport.com',
    // Email-only until the team provides the number to publish.
    contactPhone: '',
    contactHours: '',
    hoursGroups: [
      {
        title: '',
        rows: [
          { days: 'Monday to Friday', time: '8:00 AM to 5:00 PM' },
        ],
      },
    ],
    // Private hub page (create with exactly this name). Fleet docs are meant
    // to stay private from Dispatch, so host this page somewhere Dispatch
    // cannot reach (a Fleet team site, like the IT hub on RCT-ITTeam) before
    // putting real documents on it.
    resourcePageUrl: 'https://rapidcitytransport.sharepoint.com/sites/compass/SitePages/FleetHub.aspx',
    groupId: '00000000-0000-0000-0000-000000000007', // Replace with real GUID
  },
};

/**
 * Maps display names to alternate names used in the Employee Tracker list.
 * The filter will match if the employee's department matches ANY of these names.
 */
export const DEPARTMENT_ALIASES: Record<string, string[]> = {
  'Human Resources': ['Human Resources', 'HR'],
  'Information Technology': ['Information Technology', 'IT'],
};

/** Returns all names that should match for a given department display name. */
export function getDepartmentMatchNames(displayName: string): string[] {
  return DEPARTMENT_ALIASES[displayName] || [displayName];
}

/** Returns the config for a department key, or undefined if the key is unknown. */
export function getDepartmentConfig(key: string): IDepartmentConfig | undefined {
  return DEPARTMENT_CONFIGS[key as DepartmentKey];
}

/** All department keys, used for the property pane dropdown. */
export const ALL_DEPARTMENT_KEYS: DepartmentKey[] = [
  'customerExperience',
  'dispatch',
  'accounting',
  'humanResources',
  'informationTechnology',
  'businessDevelopment',
  'fleet',
];
