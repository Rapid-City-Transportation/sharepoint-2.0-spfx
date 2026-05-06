// Protocol Book Draft2 — column internal names
export const PB = {
  LIST_TITLE: 'Protocol Book Draft2',

  Id: 'Id',
  Title: 'Title',
  ClientName: 'Client_x0020_Name',
  ClientRole: 'Client_x0020_Role',
  ClientType: 'ClientType',
  Specification: 'Specification',
  BusinessHours: 'BusinessHours',

  PhoneBusinessHours: 'Phone_x0020_Numbers_x0020__x00280',
  PhoneAfterHours: 'Phone_x0020_Numbers_x0020__x0028',
  SpecialInstructions: 'Special_x0020_Instructions',
  AccountNumber: 'Account_x0020_Number',
  Customer: 'Customer',
  ReferralOptions: 'Referral_x0020_Options',

  PassengerName: 'Passenger_x0020_Name',
  OkToBill3rdParty: 'OKTOBOOK',
  ConfirmationsSpecific: 'Confirmations1',

  PassengerNotes: 'PassengerNotes',
  PassengerOkToBook: 'PassengerOKtoBook',
  TripNotes: 'Trip_x0020_Notes',
  UnitInfo: 'Unit_x0020_Info',
  ProblemWithReminderCall: 'Problem_x0020_With_x0020_Reminde',

  // Single-value lookups
  WaitTimes: 'WaitTimes',
  ReturnTimesPolicy: 'Return_x0020_Times_x0020_Policy',
  ApptType: 'Appt_x0020_Type',

  // Multi-value lookups
  ConfirmationCall: 'ConfirmationCall',
  Confirmations: 'Confirmations_x0028_Lookup_x0029',
  ServiceType: 'Service_x0020_Type_x0020__x0028_',
  ServiceAmendments: 'Service_x0020_Amendments_x0020__',
  VehicleTypePolicy: 'Vehicle_x0020_Type_x0020_Policy',
  ChangePolicy: 'Cancel_x0020__x0026__x0020_Chang',
  CancelPolicy: 'Cancel_x0020_Policy_x0020__x0028',

  // Approval fields
  ApprovalAllModifications: 'Approval_x0020__x002d__x0020_ALL',
  ApprovalBlanket: 'Approval_x0020__x002d__x0020_Bla',
  ApprovalRTW: 'Approval_x0020__x002d__x0020_RTW',
  ApprovalNotes: 'Approval_x0020_Notes_x0020__x002',
} as const;

// SiteResources — column internal names
export const SR = {
  LIST_TITLE: 'SiteResources',

  Id: 'Id',
  Title: 'Title',
  Category: 'Category',
  Content: 'Content',
  Group: 'Group',
} as const;

export const SR_SELECT_FIELDS = [
  SR.Id, SR.Title, SR.Category, SR.Group, SR.Content,
] as const;

// PB Instruction Blocks Test — column internal names
export const IB = {
  LIST_TITLE: 'PB Instruction Blocks Test',

  Id: 'Id',
  Title: 'Title',
  Category: 'Category',
  ClientType: 'ClientType',
  Source: 'Source',
  DefaultText: 'DefaultText',
  Description: 'Description',
  ApprovalToModify: 'Approval',
} as const;

export const IB_SELECT_FIELDS = [
  IB.Id, IB.Title, IB.Category, IB.ClientType,
  IB.Source, IB.DefaultText, IB.Description, IB.ApprovalToModify,
] as const;

// All lookup columns that reference instruction blocks (used to build "{col}Id" selects)
export const ALL_LOOKUP_COLUMNS = [
  PB.ConfirmationCall,
  PB.Confirmations,
  PB.WaitTimes,
  PB.ReturnTimesPolicy,
  PB.ApptType,
  PB.ServiceType,
  PB.ServiceAmendments,
  PB.VehicleTypePolicy,
  PB.ChangePolicy,
  PB.CancelPolicy,
] as const;

// ContactCardNotifications — column internal names (written by Power Automate)
export const CCN = {
  LIST_TITLE: 'ContactCardNotifications',

  Id: 'Id',
  Title: 'Title',
  Created: 'Created',
  Modified: 'Modified',
  SourceList: 'SourceList',
  SourceItemId: 'SourceItemId',
  CompanyName: 'CompanyName',
  ChangedFields: 'ChangedFields',
  Summary: 'Summary',
  NewValueSnapshot: 'NewValueSnapshot',
  ChangeType: 'ChangeType',
  ChangedBy: 'ChangedBy',
  ChangedAt: 'ChangedAt',
  Scope: 'Scope',
} as const;

// ContactCardNotifReads — per-user read receipts
export const CCNR = {
  LIST_TITLE: 'ContactCardNotifReads',

  Id: 'Id',
  Title: 'Title',
  NotificationId: 'NotificationId',
  User: 'User',
  ReadAt: 'ReadAt',
} as const;
