import { getSP } from './spConfig';
import { PB, IB, IB_SELECT_FIELDS, ALL_LOOKUP_COLUMNS } from './fieldNames';
import {
  IProtocolBookGridItem,
  IProtocolBookDetailItem,
  IInstructionBlockRaw,
} from '../models/IProtocolBookItem';

interface ICacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const gridCache: { entry?: ICacheEntry<IProtocolBookGridItem[]> } = {};
const detailCache: Map<number, ICacheEntry<IProtocolBookDetailItem>> = new Map();

function isFresh<T>(entry: ICacheEntry<T> | undefined): entry is ICacheEntry<T> {
  return !!entry && Date.now() - entry.timestamp < CACHE_TTL_MS;
}

/** Fetch all clients for the card grid (flat fields only). */
export async function fetchGridItems(
  forceRefresh = false
): Promise<IProtocolBookGridItem[]> {
  if (!forceRefresh && isFresh(gridCache.entry)) {
    return gridCache.entry.data;
  }

  const sp = getSP();

  const rawItems = await sp.web.lists
    .getByTitle(PB.LIST_TITLE)
    .items.select(
      PB.Id,
      PB.Title,
      PB.ClientName,
      PB.ClientRole,
      PB.ClientType,
      PB.PhoneBusinessHours,
      PB.Specification,
      PB.PhoneAfterHours,
      PB.BusinessHours,
      PB.SpecialInstructions,
      PB.ProblemWithReminderCall
    )
    .orderBy(PB.Title, true)
    .top(5000)();

  const items: IProtocolBookGridItem[] = rawItems.map((raw: Record<string, unknown>) => ({
    Id: raw[PB.Id] as number,
    Title: (raw[PB.Title] as string) || '',
    ClientName: (raw[PB.ClientName] as string) || undefined,
    ClientRole: (raw[PB.ClientRole] as string) || undefined,
    ClientType: (raw[PB.ClientType] as string) || undefined,
    PhoneBusinessHours: (raw[PB.PhoneBusinessHours] as string) || undefined,
    Specification: (raw[PB.Specification] as string) || undefined,
    PhoneAfterHours: (raw[PB.PhoneAfterHours] as string) || undefined,
    BusinessHours: (raw[PB.BusinessHours] as string) || undefined,
    SpecialInstructions: (raw[PB.SpecialInstructions] as string) || undefined,
    ProblemWithReminderCall: (raw[PB.ProblemWithReminderCall] as string) || undefined,
  }));

  gridCache.entry = { data: items, timestamp: Date.now() };
  return items;
}

/**
 * Fetch one client by ID with full instruction-block data.
 * Phase 1: get flat fields + lookup IDs.
 * Phase 2: fetch referenced instruction blocks by those IDs.
 */
export async function fetchDetailItem(
  id: number,
  forceRefresh = false
): Promise<IProtocolBookDetailItem> {
  if (!forceRefresh) {
    const cached = detailCache.get(id);
    if (isFresh(cached)) {
      return cached.data;
    }
  }

  const sp = getSP();

  const flatFields = [
    PB.Id, PB.Title, PB.ClientName, PB.ClientRole, PB.ClientType,
    PB.Specification, PB.BusinessHours, PB.PhoneBusinessHours, PB.PhoneAfterHours,
    PB.SpecialInstructions, PB.AccountNumber, PB.Customer,
    PB.ReferralOptions, PB.PassengerName, PB.PassengerNotes, PB.TripNotes,
    PB.UnitInfo, PB.ProblemWithReminderCall,
    PB.OkToBill3rdParty, PB.PassengerOkToBook, PB.ConfirmationsSpecific,
    PB.ApprovalAllModifications, PB.ApprovalBlanket,
    PB.ApprovalRTW, PB.ApprovalNotes,
  ];

  const lookupIdFields = ALL_LOOKUP_COLUMNS.map(col => `${col}Id`);

  const raw: Record<string, unknown> = await sp.web.lists
    .getByTitle(PB.LIST_TITLE)
    .items.getById(id)
    .select(...flatFields, ...lookupIdFields)();

  const allBlockIds = new Set<number>();
  for (const col of ALL_LOOKUP_COLUMNS) {
    const val = raw[`${col}Id`];
    if (Array.isArray(val)) {
      for (const v of val) if (typeof v === 'number') allBlockIds.add(v);
    } else if (typeof val === 'number') {
      allBlockIds.add(val);
    }
  }

  const blocksById = new Map<number, IInstructionBlockRaw>();

  if (allBlockIds.size > 0) {
    const idArray: number[] = [];
    allBlockIds.forEach(bid => idArray.push(bid));
    const filter = idArray.map(bid => `(Id eq ${bid})`).join(' or ');

    const ibRaw: Record<string, unknown>[] = await sp.web.lists
      .getByTitle(IB.LIST_TITLE)
      .items.select(...IB_SELECT_FIELDS)
      .filter(filter)
      .top(allBlockIds.size)();

    for (const row of ibRaw) {
      const block: IInstructionBlockRaw = {
        Id: row[IB.Id] as number,
        Title: (row[IB.Title] as string) || '',
        Category: (row[IB.Category] as string) || undefined,
        Source: (row[IB.Source] as string) || undefined,
        DefaultText: (row[IB.DefaultText] as string) || undefined,
        Description: (row[IB.Description] as string) || undefined,
        ApprovalToModify: (row[IB.ApprovalToModify] as string) || undefined,
      };
      blocksById.set(block.Id, block);
    }
  }

  const item = mapRawToDetail(raw, blocksById);
  detailCache.set(id, { data: item, timestamp: Date.now() });
  return item;
}

/** Clear all caches. */
export function clearCache(): void {
  gridCache.entry = undefined;
  detailCache.clear();
}

function mapBoolOrString(val: unknown): string | undefined {
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'string' && val) return val;
  return undefined;
}

function resolveBlock(
  raw: Record<string, unknown>,
  col: string,
  blocksById: Map<number, IInstructionBlockRaw>
): IInstructionBlockRaw | null {
  const val = raw[`${col}Id`];
  if (typeof val === 'number') return blocksById.get(val) || null;
  return null;
}

function resolveBlocks(
  raw: Record<string, unknown>,
  col: string,
  blocksById: Map<number, IInstructionBlockRaw>
): IInstructionBlockRaw[] {
  const val = raw[`${col}Id`];
  if (Array.isArray(val)) {
    return val
      .map(v => (typeof v === 'number' ? blocksById.get(v) : undefined))
      .filter(Boolean) as IInstructionBlockRaw[];
  }
  const single = resolveBlock(raw, col, blocksById);
  return single ? [single] : [];
}

function mapRawToDetail(
  raw: Record<string, unknown>,
  blocksById: Map<number, IInstructionBlockRaw>
): IProtocolBookDetailItem {
  return {
    Id: raw[PB.Id] as number,
    Title: (raw[PB.Title] as string) || '',
    ClientName: (raw[PB.ClientName] as string) || undefined,
    ClientRole: (raw[PB.ClientRole] as string) || undefined,
    ClientType: (raw[PB.ClientType] as string) || undefined,
    Specification: (raw[PB.Specification] as string) || undefined,
    BusinessHours: (raw[PB.BusinessHours] as string) || undefined,
    PhoneBusinessHours: (raw[PB.PhoneBusinessHours] as string) || undefined,
    PhoneAfterHours: (raw[PB.PhoneAfterHours] as string) || undefined,
    SpecialInstructions: (raw[PB.SpecialInstructions] as string) || undefined,
    AccountNumber: (raw[PB.AccountNumber] as string) || undefined,
    Customer: (raw[PB.Customer] as string) || undefined,
    ReferralOptions: (raw[PB.ReferralOptions] as string) || undefined,
    PassengerName: (raw[PB.PassengerName] as string) || undefined,
    PassengerNotes: (raw[PB.PassengerNotes] as string) || undefined,
    TripNotes: (raw[PB.TripNotes] as string) || undefined,
    UnitInfo: (raw[PB.UnitInfo] as string) || undefined,
    ProblemWithReminderCall: (raw[PB.ProblemWithReminderCall] as string) || undefined,
    OkToBill3rdParty: mapBoolOrString(raw[PB.OkToBill3rdParty]),
    PassengerOkToBook: raw[PB.PassengerOkToBook] === true,
    ConfirmationsSpecific: (raw[PB.ConfirmationsSpecific] as string) || undefined,
    ApprovalAllModifications: (raw[PB.ApprovalAllModifications] as string) || undefined,
    ApprovalBlanket: (raw[PB.ApprovalBlanket] as string) || undefined,
    ApprovalRTW: (raw[PB.ApprovalRTW] as string) || undefined,
    ApprovalNotes: (raw[PB.ApprovalNotes] as string) || undefined,

    WaitTimes: resolveBlock(raw, PB.WaitTimes, blocksById),
    ReturnTimesPolicy: resolveBlock(raw, PB.ReturnTimesPolicy, blocksById),
    ApptType: resolveBlock(raw, PB.ApptType, blocksById),

    ConfirmationCall: resolveBlocks(raw, PB.ConfirmationCall, blocksById),
    Confirmations: resolveBlocks(raw, PB.Confirmations, blocksById),
    ServiceType: resolveBlocks(raw, PB.ServiceType, blocksById),
    ServiceAmendments: resolveBlocks(raw, PB.ServiceAmendments, blocksById),
    VehicleTypePolicy: resolveBlocks(raw, PB.VehicleTypePolicy, blocksById),
    ChangePolicy: resolveBlocks(raw, PB.ChangePolicy, blocksById),
    CancelPolicy: resolveBlocks(raw, PB.CancelPolicy, blocksById),
  };
}
