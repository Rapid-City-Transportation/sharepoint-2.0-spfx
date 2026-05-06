import {
  ICustomer,
  ITabContent,
  IInstructionGroup,
  IInstructionItem,
  CustomerType,
  TabId,
} from '../components/types';
import {
  IProtocolBookGridItem,
  IProtocolBookDetailItem,
  IInstructionBlockRaw,
} from '../models/IProtocolBookItem';

type SectionKey = 'booking' | 'serviceAmendments' | 'cancellationsAndChanges' | 'reminderCalls';

const LOOKUP_TO_SECTION: Record<string, SectionKey> = {
  ApptType: 'booking',
  ServiceType: 'booking',
  Confirmations: 'booking',
  VehicleTypePolicy: 'booking',
  ReturnTimesPolicy: 'booking',
  ServiceAmendments: 'serviceAmendments',
  WaitTimes: 'serviceAmendments',
  ConfirmationCall: 'reminderCalls',
  ChangePolicy: 'cancellationsAndChanges',
  CancelPolicy: 'cancellationsAndChanges',
};

/**
 * Parse ClientRole to determine which tabs are visible.
 * If the role contains both "Referral" and "Customer" (e.g. "Referral & Customer"),
 * the Customer tab is hidden — its blocks are merged into Referral.
 */
function parseVisibleTabs(role?: string, customerType?: CustomerType, name?: string): TabId[] {
  // WSIB customers only use the Passenger tab
  if (customerType === 'WSIB') return ['passenger'];

  // "Passengers Who Pay" — passenger-only, no referral tab
  if (name && name.toLowerCase().indexOf('passengers who pay') !== -1) {
    return ['passenger'];
  }

  if (!role) return ['referral', 'passenger', 'customer'];

  const lower = role.toLowerCase();
  const hasReferral = lower.includes('referral');
  const hasCustomer = lower.includes('customer');
  const hasPassenger = lower.includes('passenger');

  // Combined roles — hide the redundant tab
  if (hasReferral && hasCustomer) {
    return ['referral', 'passenger'];
  }
  if (hasReferral && hasPassenger) {
    return ['referral', 'customer'];
  }
  if (hasCustomer && hasPassenger) {
    return ['passenger', 'customer'];
  }

  // Default: show all three
  return ['referral', 'passenger', 'customer'];
}

/**
 * Merge two BlocksBySection maps: appends blocks from `b` into `a` per section.
 * Returns a new object (does not mutate inputs).
 */
function mergeBlocksBySections(a: BlocksBySection, b: BlocksBySection): BlocksBySection {
  const result: BlocksBySection = {};
  const allSections: SectionKey[] = ['booking', 'serviceAmendments', 'cancellationsAndChanges', 'reminderCalls'];
  for (const key of allSections) {
    const aBlocks = a[key] || [];
    const bBlocks = b[key] || [];
    const seenIds = new Set(aBlocks.map(block => block.Id));
    const deduped = [...aBlocks, ...bBlocks.filter(block => !seenIds.has(block.Id))];
    if (deduped.length > 0) {
      result[key] = deduped;
    }
  }
  return result;
}

/** Map grid items to lightweight ICustomer[] for the card view. */
export function mapGridItemsToCustomers(items: IProtocolBookGridItem[]): ICustomer[] {
  return items.map(item => {
    const phone = extractFirstPhone(item.PhoneBusinessHours);
    const email = extractEmail(item.PhoneBusinessHours);

    return {
      id: String(item.Id),
      name: item.Title || item.ClientName || '',
      customerType: mapCustomerType(item.ClientType),
      customerTypeDisplay: item.ClientType || 'Other',
      bio: item.Specification || '',
      phone,
      email,
      referral: emptyTabContent(),
      passenger: emptyTabContent(),
      customer: emptyTabContent(),
      visibleTabs: parseVisibleTabs(item.ClientRole, mapCustomerType(item.ClientType), item.Title || item.ClientName),
      clientRole: item.ClientRole || undefined,
    };
  });
}

/** Map a full Protocol Book item into a complete ICustomer with all tab data. */
export function mapDetailItemToCustomer(item: IProtocolBookDetailItem): ICustomer {
  const phone = extractFirstPhone(item.PhoneBusinessHours);
  const email = extractEmail(item.PhoneBusinessHours);
  const orgName = item.ClientName || item.Title || '';

  const blocksByTab = collectBlocksByTab(item);
  const visibleTabs = parseVisibleTabs(item.ClientRole, mapCustomerType(item.ClientType), item.Title || item.ClientName);

  let referralBlocks = blocksByTab.Client || {};
  let passengerBlocks = blocksByTab.Passenger || {};
  let customerBlocks = blocksByTab.Customer || {};

  // Merge blocks from hidden tabs into visible ones
  if (visibleTabs.indexOf('customer') === -1 && visibleTabs.indexOf('referral') !== -1) {
    // "Referral & Customer" — merge Customer blocks into Referral
    referralBlocks = mergeBlocksBySections(referralBlocks, customerBlocks);
    customerBlocks = {};
  } else if (visibleTabs.indexOf('referral') === -1 && visibleTabs.indexOf('customer') !== -1) {
    // "Customer & Passenger" — merge Referral blocks into Customer
    customerBlocks = mergeBlocksBySections(customerBlocks, referralBlocks);
    referralBlocks = {};
  }

  if (visibleTabs.indexOf('passenger') === -1 && visibleTabs.indexOf('referral') !== -1) {
    // "Referral & Passenger" — merge Passenger blocks into Referral
    referralBlocks = mergeBlocksBySections(referralBlocks, passengerBlocks);
    passengerBlocks = {};
  }

  return {
    id: String(item.Id),
    name: item.Title || orgName,
    customerType: mapCustomerType(item.ClientType),
    customerTypeDisplay: item.ClientType || '',
    bio: item.Specification || '',
    phone,
    email,
    referral: buildTabContent(referralBlocks, item, orgName),
    passenger: buildTabContent(passengerBlocks, item, orgName),
    customer: buildTabContent(customerBlocks, item, orgName),
    visibleTabs,
    clientRole: item.ClientRole || undefined,

    accountNumber: rawField(item.AccountNumber),
    customerField: rawField(item.Customer),
    passengerName: rawField(item.PassengerName),
    specialInstructions: rawField(item.SpecialInstructions),
    okToBill3rdParty: item.OkToBill3rdParty || undefined,
    passengerOkToBook: item.PassengerOkToBook === true,
    passengerNotes: rawField(item.PassengerNotes),
    unitInfo: rawField(item.UnitInfo),
    tripNotes: rawField(item.TripNotes),
    referralOptions: rawField(item.ReferralOptions),
    confirmationsSpecific: rawField(item.ConfirmationsSpecific),
    businessHoursValue: cleanField(item.BusinessHours),

    approvalBlanket: rawField(item.ApprovalBlanket),
    approvalAllModifications: rawField(item.ApprovalAllModifications),
    approvalRTW: rawField(item.ApprovalRTW),
    approvalNotes: rawField(item.ApprovalNotes),
  };
}

// ---- Internal helpers ----

/** Strip HTML and return trimmed string, or undefined if empty. */
function cleanField(val?: string): string | undefined {
  if (!val) return undefined;
  const clean = stripHtml(val).trim();
  return clean.length > 0 ? clean : undefined;
}

/**
 * Return raw HTML if it has any text content, or undefined if empty.
 * SharePoint sometimes returns rich text with entity-encoded angle brackets
 * (e.g. &lt;div&gt; instead of <div>), so we decode those first.
 */
function rawField(val?: string): string | undefined {
  if (!val) return undefined;

  let html = val;
  // Decode up to 2 levels of entity-encoding (SharePoint can double-encode)
  for (let i = 0; i < 2 && /&lt;\w/.test(html); i++) {
    html = html
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  const clean = stripHtml(html).trim();
  return clean.length > 0 ? html : undefined;
}

type BlocksBySection = Partial<Record<SectionKey, IInstructionBlockRaw[]>>;

/** Group all instruction blocks by Source (tab) and section. */
function collectBlocksByTab(
  item: IProtocolBookDetailItem
): Record<string, BlocksBySection> {
  const result: Record<string, BlocksBySection> = {};

  const lookupEntries: Array<{ key: string; blocks: IInstructionBlockRaw[] }> = [
    { key: 'ApptType', blocks: item.ApptType ? [item.ApptType] : [] },
    { key: 'ServiceType', blocks: item.ServiceType || [] },
    { key: 'ServiceAmendments', blocks: item.ServiceAmendments || [] },
    { key: 'VehicleTypePolicy', blocks: item.VehicleTypePolicy || [] },
    { key: 'ReturnTimesPolicy', blocks: item.ReturnTimesPolicy ? [item.ReturnTimesPolicy] : [] },
    { key: 'Confirmations', blocks: item.Confirmations || [] },
    { key: 'ConfirmationCall', blocks: item.ConfirmationCall || [] },
    { key: 'WaitTimes', blocks: item.WaitTimes ? [item.WaitTimes] : [] },
    { key: 'ChangePolicy', blocks: item.ChangePolicy || [] },
    { key: 'CancelPolicy', blocks: item.CancelPolicy || [] },
  ];

  for (const { key, blocks } of lookupEntries) {
    const section = LOOKUP_TO_SECTION[key];
    if (!section) continue;

    for (const block of blocks) {
      const sources: string[] = block.Source
        ? [block.Source]
        : ['Client', 'Passenger', 'Customer'];

      for (const source of sources) {
        if (!result[source]) result[source] = {};
        if (!result[source][section]) result[source][section] = [];
        result[source][section]!.push(block);
      }
    }
  }

  return result;
}

/** Build ITabContent for one tab. Splits "Wait Time" blocks into the top bar. */
function buildTabContent(
  sections: BlocksBySection,
  item: IProtocolBookDetailItem,
  orgName: string
): ITabContent {
  const saBlocks = sections.serviceAmendments || [];
  const waitTimeBlock = saBlocks.find(b => /^Wait Time/i.test(b.Category || ''));
  const amendmentBlocks = saBlocks.filter(b => !/^Wait Time/i.test(b.Category || ''));

  // Move any "Confirmation Call" blocks out of booking into reminder calls
  const bookingBlocks = (sections.booking || []).filter(b => !/^Confirmation Call/i.test(b.Category || ''));
  const misplacedConfCalls = (sections.booking || []).filter(b => /^Confirmation Call/i.test(b.Category || ''));
  const reminderBlocks = [...(sections.reminderCalls || []), ...misplacedConfCalls];

  const waitTimeGroups = buildInstructionGroups(waitTimeBlock ? [waitTimeBlock] : []);
  return {
    booking: buildInstructionGroups(bookingBlocks),
    serviceAmendments: buildServiceAmendments(amendmentBlocks),
    waitTime: waitTimeGroups.length > 0 ? waitTimeGroups[0] : undefined,
    cancellationsAndChanges: buildInstructionGroups(sections.cancellationsAndChanges)
      .sort((a, b) => {
        const aIsChange = /change/i.test(a.title) ? 0 : 1;
        const bIsChange = /change/i.test(b.title) ? 0 : 1;
        return aIsChange - bIsChange;
      }),
    reminderCalls: buildReminderCalls(reminderBlocks, item.ProblemWithReminderCall),
    contactInformation: buildContactInformation(item, orgName),
  };
}

/** Convert instruction blocks into groups (Category = heading, DefaultText = items).
 *  Merges blocks with the same Category under one heading. */
function buildInstructionGroups(
  blocks: IInstructionBlockRaw[] | undefined
): IInstructionGroup[] {
  if (!blocks || blocks.length === 0) return [];

  const merged = new Map<string, IInstructionGroup>();

  for (const block of blocks) {
    const title = block.Category || 'Instructions';
    const existing = merged.get(title);

    if (existing) {
      existing.items.push(...parseMultilineToItems(block.DefaultText));
      if (block.DefaultText) {
        existing.rawHtml = existing.rawHtml
          ? existing.rawHtml + block.DefaultText
          : block.DefaultText;
      }
      if (!existing.approvalToModify && block.ApprovalToModify) {
        existing.approvalToModify = block.ApprovalToModify;
      }
    } else {
      merged.set(title, {
        title,
        description: parseTooltipText(block.Description),
        items: parseMultilineToItems(block.DefaultText),
        rawHtml: block.DefaultText,
        approvalToModify: block.ApprovalToModify || undefined,
      });
    }
  }

  return Array.from(merged.values());
}

/** Build service amendment groups, deduplicating by block ID and merging by Category. */
function buildServiceAmendments(
  blocks: IInstructionBlockRaw[] | undefined
): IInstructionGroup[] {
  if (!blocks || blocks.length === 0) return [];

  const seen = new Set<number>();
  const unique: IInstructionBlockRaw[] = [];
  for (const block of blocks) {
    if (!seen.has(block.Id)) {
      seen.add(block.Id);
      unique.push(block);
    }
  }

  const merged = new Map<string, IInstructionGroup>();
  for (const block of unique) {
    const category = block.Category || 'Instructions';
    const existing = merged.get(category);

    if (existing) {
      existing.items.push(...parseMultilineToItems(block.DefaultText));
      if (block.DefaultText) {
        existing.rawHtml = existing.rawHtml
          ? existing.rawHtml + block.DefaultText
          : block.DefaultText;
      }
      if (!existing.approvalToModify && block.ApprovalToModify) {
        existing.approvalToModify = block.ApprovalToModify;
      }
    } else {
      merged.set(category, {
        title: category,
        description: parseTooltipText(block.Description),
        items: parseMultilineToItems(block.DefaultText),
        rawHtml: block.DefaultText,
        approvalToModify: block.ApprovalToModify || undefined,
      });
    }
  }

  return Array.from(merged.values());
}

function buildReminderCalls(
  blocks: IInstructionBlockRaw[] | undefined,
  problemWithReminderCall?: string
): ITabContent['reminderCalls'] {
  return {
    instructionGroups: buildInstructionGroups(blocks),
    problemWithReminderCall: rawField(problemWithReminderCall),
  };
}

function buildContactInformation(
  item: IProtocolBookDetailItem,
  _orgName: string
): ITabContent['contactInformation'] {
  return {
    businessHours: 'Monday - Friday | 8:30 AM - 5:00 PM EST',
    duringHoursHtml: rawField(item.PhoneBusinessHours),
    outsideHoursHtml: rawField(item.PhoneAfterHours),
  };
}

// ---- Parsing utilities ----

/** Strip HTML tags and decode entities from SharePoint rich text fields. */
function stripHtml(html: string): string {
  let text = html;
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/(?:div|p|li|tr|h[1-6])>/gi, '\n');
  text = text.replace(/<\/(?:ol|ul|table)>/gi, '\n');
  text = text.replace(/<[^>]*>/g, '');
  text = text
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(Number(code)));
  return text;
}

function splitLines(text?: string): string[] {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);
}

/**
 * Parse DefaultText into instruction items.
 * If the text has address lines (e.g. "123 Main St"), groups each address
 * with its following lines (Unit, Trip Note, etc.) as sub-bullets.
 */
function parseMultilineToItems(defaultText?: string): (string | IInstructionItem)[] {
  if (!defaultText) return ['No instructions available.'];

  const lines = splitLines(stripHtml(defaultText));
  if (lines.length === 0) return ['No instructions available.'];

  const isAddressLine = (l: string): boolean => /^\d+\s+[A-Za-z]/.test(l);

  if (!lines.some(isAddressLine)) {
    return lines;
  }

  const items: (string | IInstructionItem)[] = [];
  let current: IInstructionItem | null = null;

  for (const line of lines) {
    if (isAddressLine(line)) {
      if (current) items.push(current);
      current = { text: line, subItems: [] };
    } else if (current) {
      current.subItems!.push(line);
    } else {
      items.push(line);
    }
  }

  if (current) items.push(current);
  return items.length > 0 ? items : ['No instructions available.'];
}

function parseTooltipText(description?: string): string | undefined {
  if (!description) return undefined;
  const clean = stripHtml(description).trim();
  return clean.length > 0 ? clean : undefined;
}

function extractFirstPhone(text?: string): string {
  if (!text) return '';
  const clean = stripHtml(text);
  const match = clean.match(/[\d(][\d\s().-]{6,}[\d)]/);
  return match ? match[0].trim() : '';
}

function extractEmail(text?: string): string {
  if (!text) return '';
  const clean = stripHtml(text);
  const match = clean.match(/[\w.+-]+@[\w.-]+\.\w{2,}/);
  return match ? match[0] : '';
}

function mapCustomerType(raw?: string): CustomerType {
  const known: CustomerType[] = [
    'IME Clinic', 'Treatment Clinic', 'Hospital', 'School',
    'Social/Community Services', 'Lawyer', 'WSIB'
  ];

  if (raw && known.indexOf(raw as CustomerType) !== -1) {
    return raw as CustomerType;
  }

  if (raw) {
    const lower = raw.toLowerCase();
    for (const t of known) {
      if (lower.includes(t.toLowerCase()) || t.toLowerCase().includes(lower)) {
        return t;
      }
    }
  }

  return 'Other';
}

function emptyTabContent(): ITabContent {
  return {
    booking: [],
    serviceAmendments: [],
    cancellationsAndChanges: [],
    reminderCalls: { instructionGroups: [] },
    contactInformation: {
      businessHours: '',
    },
  };
}
