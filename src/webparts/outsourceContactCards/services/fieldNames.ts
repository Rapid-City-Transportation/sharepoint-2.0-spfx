/**
 * Internal field names for the two Dispatch-site lists.
 *
 * Account Password and Account Number are intentionally absent: this web part
 * must never fetch or render them.
 */

export const DD = {
  LIST_TITLE: 'Driver Directory',
  /** The list also holds fleet drivers, so vendor reads filter on this. */
  OUTSOURCE_CONTENT_TYPE_ID: '0x0100AD273086343F4640B574D341F3C1C333',

  Id: 'ID',
  Title: 'Title',
  OperatingName: 'Operating_x0020_Name',
  Priority: 'Priority',
  Primary: 'Primary',
  Secondary: 'Secondary',
  Email: 'Emailaddress',
  City: 'City',
  HomeZone: 'HomeZone',
  Vehicle: 'Vehicle',
  Portal: 'Portal',
  Notes: 'Notes',
  SpecialDispatchInstructions: 'Special_x0020_Dispatch_x0020_Ins',
  HoursOfOperation: 'Hours_x0020_of_x0020_Operation',
  AfterHoursPhone: 'After_x0020_Hours_x0020_Phone',
  BookingMethod: 'Booking_x0020_Method',
  /** Internal name starts with an encoded digit, so REST needs the OData_ prefix. */
  Service247: 'OData__x0032_4_x002f_7_x0020_Service',
  ActiveVendor: 'Active_x0020_Vendor',
} as const;

export const DD_SELECT_FIELDS: readonly string[] = [
  DD.Id,
  DD.Title,
  DD.OperatingName,
  DD.Priority,
  DD.Primary,
  DD.Secondary,
  DD.Email,
  DD.City,
  DD.HomeZone,
  DD.Vehicle,
  DD.Portal,
  DD.Notes,
  DD.SpecialDispatchInstructions,
  DD.HoursOfOperation,
  DD.AfterHoursPhone,
  DD.BookingMethod,
  DD.Service247,
  DD.ActiveVendor,
];

export const MGR = {
  LIST_TITLE: 'Outsource Provider - Manager View (Disp)',

  Id: 'ID',
  Title: 'Title',
  /** Raw id field of the Driver Directory lookup. */
  DirectoryLookupId: 'DirectoryIDLookupId',
  InsuranceProvider: 'Insurance_x0020_Provider',
  PolicyNumber: 'Policy_x0020_Number',
  CoverageType: 'Coverage_x0020_Type',
  PolicyExpiryDate: 'Policy_x0020_Expiry_x0020_Date',
  InsuranceStatus: 'Insurance_x0020_Status',
  DaysUntilExpiry: 'Days_x0020_Until_x0020_Expiry',
  CertificateOnFile: 'Certificate_x0020_on_x0020_File',
  BusinessLicenceOnFile: 'Business_x0020_Licence_x0020_on_',
  VehicleSafetyDocsOnFile: 'Vehicle_x0020_Safety_x0020_Docs_',
  WsibClearanceOnFile: 'WSIB_x0020_Clearance_x0020_on_x0',
  ContractOnFile: 'Contract_x0020_on_x0020_File',
  LastReviewDate: 'Last_x0020_Review_x0020_Date',
  NextReviewDate: 'Next_x0020_Review_x0020_Date',
  AccountType: 'Account_x0020_Type',
  CreditCardOnFile: 'Credit_x0020_Card_x0020_on_x0020',
  HstGstNumber: 'HST_x002f_GST_x0020_Number',
  RateNotes: 'Rate_x0020_Notes',
  BillingContactName: 'Billing_x0020_Contact_x0020_Name',
  BillingEmail: 'Billing_x0020_Email',
  BillingPhone: 'Billing_x0020_Phone',
  EscalationsContact: 'EscalationsContact',
  VendorReviewNotes: 'Vendor_x0020_Review_x0020_Notes',
  DispatchNotes: 'Dispatch_x0020_Notes',
  ManagerNotes: 'Manager_x0020_Notes',
  OperationsNotes: 'Operations_x0020_Notes',
} as const;

export const MGR_SELECT_FIELDS: readonly string[] = [
  MGR.Id,
  MGR.Title,
  MGR.DirectoryLookupId,
  MGR.InsuranceProvider,
  MGR.PolicyNumber,
  MGR.CoverageType,
  MGR.PolicyExpiryDate,
  MGR.InsuranceStatus,
  MGR.DaysUntilExpiry,
  MGR.CertificateOnFile,
  MGR.BusinessLicenceOnFile,
  MGR.VehicleSafetyDocsOnFile,
  MGR.WsibClearanceOnFile,
  MGR.ContractOnFile,
  MGR.LastReviewDate,
  MGR.NextReviewDate,
  MGR.AccountType,
  MGR.CreditCardOnFile,
  MGR.HstGstNumber,
  MGR.RateNotes,
  MGR.BillingContactName,
  MGR.BillingEmail,
  MGR.BillingPhone,
  MGR.EscalationsContact,
  MGR.VendorReviewNotes,
  MGR.DispatchNotes,
  MGR.ManagerNotes,
  MGR.OperationsNotes,
];
