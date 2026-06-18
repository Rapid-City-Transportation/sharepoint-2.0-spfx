export interface IInstructionBlockRaw {
  Id: number;
  Title: string;
  Category?: string;
  Source?: string;
  DefaultText?: string;
  Description?: string;
  ApprovalToModify?: string;
}

export interface IProtocolBookGridItem {
  Id: number;
  Title: string;
  ClientName?: string;
  ClientRole?: string;
  ClientType?: string;
  PhoneBusinessHours?: string;
  Specification?: string;
  // Also loaded for the grid so the customer search can index the text where
  // hospital names live on umbrella-company pages: after-hours, business hours,
  // special instructions, and the "Before Trip Date" notes (which render from
  // ProblemWithReminderCall, e.g. WOHS keeps its hospital list there).
  PhoneAfterHours?: string;
  BusinessHours?: string;
  SpecialInstructions?: string;
  ProblemWithReminderCall?: string;
}

export interface IProtocolBookDetailItem extends IProtocolBookGridItem {
  AccountNumber?: string;
  Customer?: string;
  ReferralOptions?: string;
  PassengerName?: string;
  PassengerNotes?: string;
  TripNotes?: string;
  UnitInfo?: string;
  OkToBill3rdParty?: string;
  PassengerOkToBook?: boolean;
  ConfirmationsSpecific?: string;

  ApprovalAllModifications?: string;
  ApprovalBlanket?: string;
  ApprovalRTW?: string;
  ApprovalNotes?: string;

  // Single-value lookups
  WaitTimes?: IInstructionBlockRaw | null;
  ReturnTimesPolicy?: IInstructionBlockRaw | null;
  ApptType?: IInstructionBlockRaw | null;

  // Multi-value lookups
  ConfirmationCall?: IInstructionBlockRaw[];
  Confirmations?: IInstructionBlockRaw[];
  ServiceType?: IInstructionBlockRaw[];
  ServiceAmendments?: IInstructionBlockRaw[];
  VehicleTypePolicy?: IInstructionBlockRaw[];
  ChangePolicy?: IInstructionBlockRaw[];
  CancelPolicy?: IInstructionBlockRaw[];
}

export type InstructionSource = 'Client' | 'Passenger' | 'Customer';
