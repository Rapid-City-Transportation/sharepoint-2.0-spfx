/**
 * Internal field names for the Dispatch-site lists.
 *
 * The directory reads the normalized pair: Outsource Providers Masterlist
 * (one record per company) joined to Outsource Vendor Coverage (one row per
 * company per zone) through the coverage row's VendorRef lookup. The legacy
 * Driver Directory list is no longer read by this web part.
 *
 * Account numbers, account references, and passwords are intentionally
 * absent from every select below: this web part must never fetch or render
 * them.
 */

/** Masterlist columns kept their imported field_N internal names; the
 *  display names are in the comments. */
export const ML = {
  LIST_TITLE: 'Outsource Providers Masterlist',

  Id: 'ID',
  Title: 'Title',
  /** ProperName */
  ProperName: 'field_2',
  /** ERPSystemName */
  ERPSystemName: 'field_3',
  /** ContactPhone */
  ContactPhone: 'field_8',
  /** PhoneAlt */
  PhoneAlt: 'field_9',
  /** ContactEmail */
  ContactEmail: 'field_11',
  /** Restriction, e.g. "Sedan only" */
  Restriction: 'field_15',
  /** Hours */
  Hours: 'field_19',
  /** PhoneOnly ("Yes"/"No") */
  PhoneOnly: 'field_21',
  ActiveYN: 'ActiveYN',
  PortalAccessYN: 'PortalAccessYN',
  VehicleTypesC: 'VehicleTypesC',
} as const;

export const ML_SELECT_FIELDS: readonly string[] = [
  ML.Id,
  ML.Title,
  ML.ProperName,
  ML.ERPSystemName,
  ML.ContactPhone,
  ML.PhoneAlt,
  ML.ContactEmail,
  ML.Restriction,
  ML.Hours,
  ML.PhoneOnly,
  ML.ActiveYN,
  ML.PortalAccessYN,
  ML.VehicleTypesC,
];

/** Outsource Vendor Coverage: one row per (vendor, zone). */
export const COV = {
  LIST_TITLE: 'Outsource Vendor Coverage',

  Id: 'ID',
  Title: 'Title',
  Zone: 'Zone',
  /** Comma-separated town list for this zone. */
  Cities: 'Cities',
  /** 1 = Primary Option, 2 = Secondary Option, 3+ = When Required. */
  Rank: 'Rank',
  DispatchPhone: 'DispatchPhone',
  DispatchPhoneAlt: 'DispatchPhoneAlt',
  DispatchEmail: 'DispatchEmail',
  DispatchNotes: 'DispatchNotes',
  VehicleOverride: 'VehicleOverride',
  CoverageActive: 'CoverageActive',
  /** REST id field of the VendorRef lookup into the Masterlist. */
  VendorRefId: 'VendorRefId',
  /** Legacy Driver Directory row id, kept by the migration; bridges the
   *  Manager View list, which still looks up the old directory. */
  OldDirectoryID: 'OldDirectoryID',
} as const;

export const COV_SELECT_FIELDS: readonly string[] = [
  COV.Id,
  COV.Title,
  COV.Zone,
  COV.Cities,
  COV.Rank,
  COV.DispatchPhone,
  COV.DispatchPhoneAlt,
  COV.DispatchEmail,
  COV.DispatchNotes,
  COV.VehicleOverride,
  COV.CoverageActive,
  COV.VendorRefId,
  COV.OldDirectoryID,
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
