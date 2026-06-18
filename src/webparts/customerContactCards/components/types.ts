export type CustomerType =
  | 'IME Clinic'
  | 'Treatment Clinic'
  | 'Hospital'
  | 'School'
  | 'Social/Community Services'
  | 'Lawyer'
  | 'WSIB'
  | 'Other';

export const CUSTOMER_TYPES: CustomerType[] = [
  'IME Clinic',
  'Treatment Clinic',
  'Hospital',
  'School',
  'Social/Community Services',
  'Lawyer',
  'WSIB',
  'Other',
];

export interface IInstructionItem {
  text: string;
  subItems?: string[];
}

export interface IInstructionGroup {
  title: string;
  description?: string;
  items: (string | IInstructionItem)[];
  /** Raw HTML from SharePoint DefaultText, rendered directly for non-address groups. */
  rawHtml?: string;
  /** "Approval to Modify" status from the SharePoint instruction block (e.g. Proceed, Needs Approval, Proceed IF). */
  approvalToModify?: string;
}

export interface ITabContent {
  booking: IInstructionGroup[];
  serviceAmendments: IInstructionGroup[];
  waitTime?: IInstructionGroup;
  cancellationsAndChanges: IInstructionGroup[];
  reminderCalls: {
    instructionGroups: IInstructionGroup[];
    problemWithReminderCall?: string;
  };
  contactInformation: {
    businessHours: string;
    duringHoursHtml?: string;
    outsideHoursHtml?: string;
  };
}

export type TabId = 'referral' | 'passenger' | 'customer';

export interface ICustomer {
  id: string;
  name: string;
  customerType: CustomerType;
  /** The original ClientType label from SharePoint, displayed on the detail page. */
  customerTypeDisplay: string;
  bio: string;
  phone: string;
  email: string;
  referral: ITabContent;
  passenger: ITabContent;
  customer: ITabContent;

  /** Which tabs to show in the UI, derived from ClientRole. */
  visibleTabs: TabId[];
  /** Original ClientRole value from SharePoint. */
  clientRole?: string;

  /** Lowercased blob of all searchable text (name, type, role, phone/email,
   *  during/after-hours, business hours, special instructions). The customer
   *  search matches against this so a hospital name buried in an umbrella
   *  company's hours fields is findable, not just the page's company name. */
  searchText?: string;

  // Flat fields (not per-tab: same value regardless of active tab)
  accountNumber?: string;
  customerField?: string;
  passengerName?: string;
  specialInstructions?: string;
  okToBill3rdParty?: string;
  passengerOkToBook?: boolean;
  passengerNotes?: string;
  unitInfo?: string;
  tripNotes?: string;
  referralOptions?: string;
  confirmationsSpecific?: string;
  /** Business Hours value from SharePoint, displayed as a banner below contact info. */
  businessHoursValue?: string;

  // Approval fields (flat: same value regardless of active tab)
  approvalBlanket?: string;
  approvalAllModifications?: string;
  approvalRTW?: string;
  approvalNotes?: string;
}
