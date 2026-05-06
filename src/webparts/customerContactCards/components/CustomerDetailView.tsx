import * as React from 'react';
import styles from './CustomerContactCards.module.scss';
import {
  ICustomer,
  ITabContent,
  IInstructionGroup,
  IInstructionItem,
  CustomerType,
  TabId,
} from './types';
import AccordionSection from './AccordionSection';
import { sanitizeHtml } from '../utils/sanitize';

function isItem(x: string | IInstructionItem): x is IInstructionItem {
  return typeof x === 'object';
}

const SECTION_COLORS = {
  booking:           '#1F4C7F',
  serviceAmendments: '#9B2C2C',
  cancellations:     '#187389',
  reminderCalls:     '#8A6A0C',
  contactInfo:       '#4A5568',
};

const TYPE_ACCENT: Record<CustomerType, string> = {
  'IME Clinic':        '#1F4C7F',
  'Treatment Clinic':  '#3A8FB7',
  'Hospital':          '#2E7D32',
  'School':            '#8A6A0C',
  'Social/Community Services': '#B84A00',
  'Lawyer':            '#4A5568',
  'WSIB': '#952c9b',
  'Other': '#4A5568'
};

type RoleClass =
  | 'roleReferral'
  | 'roleCustomer'
  | 'roleCombined'
  | 'roleIntactException'
  | 'roleDefault';

function classifyClientRole(role?: string): RoleClass | null {
  if (!role) return null;
  const lower = role.toLowerCase();
  if (lower.indexOf('intact') !== -1) return 'roleIntactException';
  const hasReferral = lower.indexOf('referral') !== -1;
  const hasCustomer = lower.indexOf('customer') !== -1;
  if (hasReferral && hasCustomer) return 'roleCombined';
  if (hasReferral) return 'roleReferral';
  if (hasCustomer) return 'roleCustomer';
  return 'roleDefault';
}

interface ICustomerDetailViewProps {
  customer: ICustomer;
  onBack: () => void;
}

const InfoTooltip: React.FC<{ text: string }> = ({ text }) => (
  <span className={styles.infoTooltipWrapper}>
    <span
      className={styles.infoIcon}
      role="img"
      aria-label="More information"
      tabIndex={0}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="15"
        height="15"
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm.93 12.412H7.07V6.706h1.86v5.706ZM8 5.647a1.059 1.059 0 1 1 0-2.118 1.059 1.059 0 0 1 0 2.118Z" />
      </svg>
    </span>
    <span className={styles.infoTooltip} role="tooltip">{text}</span>
  </span>
);

/** Renders a titled rich-text block only when value is non-empty. Used for flat (non-lookup) fields. */
const FlatFieldGroup: React.FC<{ label: string; value?: string }> = ({ label, value }) => {
  if (!value) return null;
  return (
    <div className={styles.instructionGroup}>
      <div className={styles.instructionGroupTitle}>{label}</div>
      <div
        className={styles.richContent}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }}
      />
    </div>
  );
};

/** Renders the "Approval to Modify" status badge beside a field title. Data-driven from SharePoint. */
const ApprovalBadge: React.FC<{ status?: string }> = ({ status }) => {
  if (!status) return null;

  const normalized = status.trim().toLowerCase();

  if (normalized === 'proceed') {
    return (
      <span className={`${styles.approvalBadge} ${styles.approvalProceed}`} title="Proceed">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
        Proceed
      </span>
    );
  }

  if (normalized === 'needs approval') {
    return (
      <span className={`${styles.approvalBadge} ${styles.approvalNeedsApproval}`} title="Needs Approval">
        {/* No-entry road sign: red circle with white horizontal bar */}
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="11" fill="#C53030" stroke="#9B2C2C" strokeWidth="1"/>
          <rect x="5" y="10" width="14" height="4" rx="1" fill="#FFFFFF"/>
        </svg>
        Needs Approval
      </span>
    );
  }

  if (normalized === 'proceed if') {
    return (
      <span className={`${styles.approvalBadge} ${styles.approvalProceedIf}`} title="Proceed IF">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        Proceed IF
      </span>
    );
  }

  // Fallback for any other status value from SharePoint
  return (
    <span className={styles.approvalBadge} title={status}>
      {status}
    </span>
  );
};

const InstructionGroupList: React.FC<{
  groups: IInstructionGroup[];
  appendHtml?: string;
}> = ({ groups, appendHtml }) => {
  const hasGroups = groups.length > 0;

  // If appendHtml provided but no groups exist, render it under a standalone heading
  if (!hasGroups && appendHtml) {
    return (
      <div className={styles.instructionGroup}>
        <div className={styles.instructionGroupTitle}>Confirmations</div>
        <div
          className={styles.richContent}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(appendHtml) }}
        />
      </div>
    );
  }

  return (
    <>
      {groups.map((group, idx) => {
        const isLast = idx === groups.length - 1;
        return (
          <div key={idx} className={styles.instructionGroup}>
            <div className={styles.instructionGroupTitle}>
              {group.title}
              {group.description && <InfoTooltip text={group.description} />}
              <ApprovalBadge status={group.approvalToModify} />
            </div>
            {group.rawHtml ? (
              <div
                className={styles.richContent}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(group.rawHtml) }}
              />
            ) : (
              <ul className={styles.instructionList}>
                {group.items.map((item, i) => (
                  <li key={i}>
                    {isItem(item) ? (
                      <>
                        {item.text}
                        {item.subItems && item.subItems.length > 0 && (
                          <ul className={styles.instructionSubList}>
                            {item.subItems.map((sub, j) => <li key={j}>{sub}</li>)}
                          </ul>
                        )}
                      </>
                    ) : item}
                  </li>
                ))}
              </ul>
            )}
            {isLast && appendHtml && (
              <div
                className={styles.richContent}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(appendHtml) }}
              />
            )}
          </div>
        );
      })}
    </>
  );
};

const ServiceAmendmentsContent: React.FC<{ tabContent: ITabContent }> = ({ tabContent }) => {
  const allGroups = tabContent.serviceAmendments;
  const categories = Array.from(new Set(allGroups.map(g => g.title))).sort((a, b) => a.localeCompare(b));

  const defaultCategory = categories.find(c => c.toLowerCase().includes('address alert')) || categories[0] || '';
  const [selectedCategory, setSelectedCategory] = React.useState<string>(defaultCategory);

  const effectiveCategory = categories.indexOf(selectedCategory) !== -1 ? selectedCategory : (categories[0] || '');
  const filtered = allGroups.filter(g => g.title === effectiveCategory);

  if (categories.length === 0) {
    return <p className={styles.saEmptyState}>None available.</p>;
  }

  return (
    <div className={styles.serviceAmendments}>
      <label className={styles.saLabel} htmlFor="sa-type-select">
        Amendment Type
      </label>
      <select
        id="sa-type-select"
        className={styles.saSelect}
        value={effectiveCategory}
        onChange={e => setSelectedCategory(e.target.value)}
        aria-label="Select service amendment type"
      >
        {categories.map(cat => (
          <option key={cat} value={cat}>{cat}</option>
        ))}
      </select>

      <div className={styles.saInstructions}>
        <InstructionGroupList groups={filtered} />
      </div>
    </div>
  );
};

/** Strip redundant "Same Day" / "Active Trip" subtitles from SharePoint HTML since the card title already conveys that context. */
function stripSameDaySubtitles(html: string): string {
  return html.replace(/<[^>]*>?\s*Same\s*Day\s*[/\\]\s*(?:Live\s*Trip|Active\s*Trip\s*(?:in\s*progress)?)\s*<\/[^>]*>/gi, '')
             .replace(/(?:^|\n)\s*Same\s*Day\s*[/\\]\s*(?:Live\s*Trip|Active\s*Trip\s*(?:in\s*progress)?)\s*(?:\n|$)/gi, '\n');
}

const ContactInformationContent: React.FC<{
  tabContent: ITabContent;
  problemWithReminderCall?: string;
}> = ({ tabContent, problemWithReminderCall }) => {
  const { contactInformation } = tabContent;

  const duringHtml = contactInformation.duringHoursHtml
    ? stripSameDaySubtitles(contactInformation.duringHoursHtml)
    : undefined;
  const outsideHtml = contactInformation.outsideHoursHtml
    ? stripSameDaySubtitles(contactInformation.outsideHoursHtml)
    : undefined;

  return (
    <div className={styles.contactInfoContent}>
      <div className={styles.supportGrid}>
        <div className={styles.supportCard}>
          <div className={styles.supportCardHeader}>
            <div className={styles.supportCardTopRow}>
              <div className={styles.supportCardIcon} aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <div className={styles.supportCardSubtitle}>Before Trip Date</div>
            </div>
            <div className={styles.supportCardTitle}>
              Updates or Assistance Needed
            </div>
          </div>
          <hr className={styles.contactInfoDivider} aria-hidden="true" />
          {problemWithReminderCall ? (
            <div
              className={styles.richContent}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(problemWithReminderCall) }}
            />
          ) : (
            <p className={styles.saEmptyState}>No pre-trip instructions available.</p>
          )}
        </div>

        <div className={styles.supportCard}>
          <div className={styles.supportCardHeader}>
            <div className={styles.supportCardTopRow}>
              <div className={`${styles.supportCardIcon} ${styles.supportCardIconActive}`} aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              </div>
              <div className={styles.supportCardSubtitle}>During Business Hours</div>
            </div>
            <div className={styles.supportCardTitle}>
              Same Day / Active Trip in Progress
            </div>
          </div>
          <hr className={styles.contactInfoDivider} aria-hidden="true" />
          {duringHtml ? (
            <div
              className={styles.richContent}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(duringHtml) }}
            />
          ) : (
            <p className={styles.saEmptyState}>No contact information available.</p>
          )}
        </div>

        <div className={styles.supportCard}>
          <div className={styles.supportCardHeader}>
            <div className={styles.supportCardTopRow}>
              <div className={`${styles.supportCardIcon} ${styles.supportCardIconMuted}`} aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
              </div>
              <div className={`${styles.supportCardSubtitle} ${styles.supportCardSubtitleMuted}`}>Outside Business Hours</div>
            </div>
            <div className={styles.supportCardTitle}>
              Same Day / Active Trip in Progress
            </div>
          </div>
          <hr className={styles.contactInfoDivider} aria-hidden="true" />
          {outsideHtml ? (
            <div
              className={styles.richContent}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(outsideHtml) }}
            />
          ) : (
            <p className={styles.saEmptyState}>No contact information available.</p>
          )}
        </div>
      </div>
    </div>
  );
};

const ReminderCallsContent: React.FC<{ tabContent: ITabContent }> = ({ tabContent }) => {
  const { reminderCalls } = tabContent;
  return (
    <div>
      <InstructionGroupList groups={reminderCalls.instructionGroups} />
    </div>
  );
};

const CustomerDetailView: React.FC<ICustomerDetailViewProps> = ({ customer, onBack }) => {
  const [activeTab, setActiveTab] = React.useState<TabId | null>(null);
  const [row1Open, setRow1Open] = React.useState(false); // Booking + Service Amendments
  const [row2Open, setRow2Open] = React.useState(false); // Cancellations + Reminder Calls
  const toggleRow1 = React.useCallback(() => setRow1Open(prev => !prev), []);
  const toggleRow2 = React.useCallback(() => setRow2Open(prev => !prev), []);

  const tabContent: ITabContent | null = activeTab ? customer[activeTab] : null;
  const accentColor = TYPE_ACCENT[customer.customerType] || '#1F4C7F';

  // Contact info is the same across all tabs — pull from whichever is available
  const contactTabContent: ITabContent | null =
    customer[customer.visibleTabs[0]] || customer.referral || null;

  const isIntactExceptions = customer.clientRole?.toLowerCase().includes('intact');
  const TAB_LABELS: Record<TabId, string> = isIntactExceptions
    ? { referral: 'Referral/Customer', passenger: 'Passenger', customer: 'Intact' }
    : { referral: 'Referral', passenger: 'Passenger', customer: 'Customer' };

  const tabs: { id: TabId; label: string }[] = customer.visibleTabs.map(id => ({
    id,
    label: TAB_LABELS[id],
  }));

  const prefix = `cust-${customer.id}-${activeTab || 'none'}`;

  const bookingGroupsByCategory = React.useMemo(() => {
    const CATEGORY_MAP: Record<string, string> = {
      'vehicle type': 'vehicleType',
      'service type': 'serviceType',
      'appt type': 'apptType',
      'return times': 'returnTimes',
      'confirmations': 'confirmations',
    };
    const result: Record<string, IInstructionGroup[]> = {
      vehicleType: [], serviceType: [], apptType: [],
      returnTimes: [], confirmations: [], other: [],
    };
    if (!tabContent) return result;
    for (const group of tabContent.booking) {
      const key = CATEGORY_MAP[group.title.toLowerCase()] || 'other';
      result[key].push(group);
    }
    return result;
  }, [tabContent]);

  return (
    <article className={styles.detailView} aria-label={`Contact detail for ${customer.name}`}>

      <button
        className={styles.backButton}
        onClick={onBack}
        type="button"
        aria-label="Back to all customer contacts"
      >
        ← Back to All Contacts
      </button>

      <header className={styles.detailHeader}>
        <div className={styles.detailHeaderLeft}>
          <h1 className={styles.detailName}>
            <span>{customer.name}</span>
            {customer.customerTypeDisplay && (
              <span
                className={styles.detailTypePill}
                style={{ backgroundColor: accentColor }}
              >
                {customer.customerTypeDisplay}
              </span>
            )}
          </h1>
          {customer.bio && (() => {
            const roleClass = classifyClientRole(customer.clientRole);
            const bannerClasses = roleClass
              ? `${styles.specificationBanner} ${styles[roleClass]}`
              : '';
            return (
              <div
                className={`${styles.detailBio} ${styles.detailBioBold} ${bannerClasses}`}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(customer.bio) }}
              />
            );
          })()}
        </div>

      </header>

      <hr className={styles.headerDivider} aria-hidden="true" />

      <div
        role="tablist"
        aria-label="Contact context tabs"
        className={styles.tabBar}
      >
        {tabs.map(tab => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Instructions area: blank-state or tab-driven accordions ── */}
      {!activeTab ? (
        <div className={styles.tabSelectionPrompt} role="status">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/>
            <polyline points="10 17 15 12 10 7"/>
            <line x1="15" y1="12" x2="3" y2="12"/>
          </svg>
          <p>Select {tabs.map((t, i) => (
            <React.Fragment key={t.id}>
              {i > 0 && i < tabs.length - 1 && ', '}
              {i > 0 && i === tabs.length - 1 && (tabs.length > 2 ? ', or ' : ' or ')}
              <strong>{t.label}</strong>
            </React.Fragment>
          ))} above to view instructions.</p>
        </div>
      ) : (
        <div
          role="tabpanel"
          id={`tabpanel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          className={styles.tabPanel}
        >
          {tabContent && (customer.okToBill3rdParty || tabContent.waitTime) && (
            <div className={styles.waitTimeBar}>
              {customer.okToBill3rdParty && (
                <span className={`${styles.billThirdPartyBadge} ${
                  customer.okToBill3rdParty.toLowerCase() === 'yes' ? styles.billYes
                  : customer.okToBill3rdParty.toLowerCase() === 'no' ? styles.billNo
                  : ''
                }`}>
                  Ok to Bill 3rd Party: <strong>{customer.okToBill3rdParty.toLowerCase() === 'no' ? 'Needs Approval' : customer.okToBill3rdParty}</strong>
                </span>
              )}
              {tabContent.waitTime && (
                <>
                  <div className={styles.waitTimeBarLabel}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    Wait Time
                  </div>
                  <ul className={styles.waitTimeBarItems}>
                    {tabContent.waitTime.items.map((item, i) => (
                      <li key={i}>{typeof item === 'string' ? item : item.text}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

          {tabContent && tabContent.serviceAmendments.some(g => g.title.toLowerCase().includes('address alert')) && (
            <div className={styles.addressAlertBanner} role="alert">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span>This customer has <strong>Address Alerts</strong>. Review Service Amendments before proceeding.</span>
            </div>
          )}

          <div className={styles.sectionsGrid}>
            <div className={activeTab === 'passenger' && !customer.passengerOkToBook ? styles.bookingMuted : undefined}>
            <AccordionSection
              id={`${prefix}-booking`}
              title="Booking"
              accentColor={SECTION_COLORS.booking}
              isOpen={row1Open}
              onToggle={toggleRow1}
              badge={activeTab === 'passenger' && !customer.passengerOkToBook ? (
                <span className={styles.passengerNotOkBanner}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  Passenger NOT OK TO BOOK
                </span>
              ) : undefined}
            >
              {customer.specialInstructions && (
                <div className={styles.specialInstructionsBanner}>
                  <div className={styles.specialInstructionsLabel}>Special Instructions</div>
                  <div
                    className={styles.specialInstructionsText}
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(customer.specialInstructions) }}
                  />
                </div>
              )}
              <FlatFieldGroup label="Claim Number" value={customer.accountNumber} />
              <FlatFieldGroup label="Passenger Name" value={customer.passengerName} />
              <FlatFieldGroup label="Customer" value={customer.customerField} />
              <FlatFieldGroup label="Referral Options" value={customer.referralOptions} />
              <FlatFieldGroup label="Passenger Notes" value={customer.passengerNotes} />
              <InstructionGroupList groups={bookingGroupsByCategory.vehicleType} />
              <InstructionGroupList groups={bookingGroupsByCategory.serviceType} />
              <InstructionGroupList groups={bookingGroupsByCategory.apptType} />
              <InstructionGroupList groups={bookingGroupsByCategory.returnTimes} />
              <FlatFieldGroup label="Unit Info" value={customer.unitInfo} />
              <FlatFieldGroup label="Trip Notes" value={customer.tripNotes} />
              <InstructionGroupList
                groups={bookingGroupsByCategory.confirmations}
                appendHtml={customer.confirmationsSpecific}
              />
              <InstructionGroupList groups={bookingGroupsByCategory.other} />
              {(customer.approvalBlanket || customer.approvalAllModifications || customer.approvalRTW || customer.approvalNotes) && (
                <div className={styles.instructionGroup}>
                  <div className={styles.instructionGroupTitle}>Approvals</div>
                  {customer.approvalBlanket && (
                    <div className={styles.richContent} dangerouslySetInnerHTML={{ __html: sanitizeHtml(customer.approvalBlanket) }} />
                  )}
                  {customer.approvalAllModifications && (
                    <div className={styles.richContent} dangerouslySetInnerHTML={{ __html: sanitizeHtml(customer.approvalAllModifications) }} />
                  )}
                  {customer.approvalRTW && (
                    <div className={styles.richContent} dangerouslySetInnerHTML={{ __html: sanitizeHtml(customer.approvalRTW) }} />
                  )}
                  {customer.approvalNotes && (
                    <div className={styles.richContent} dangerouslySetInnerHTML={{ __html: sanitizeHtml(customer.approvalNotes) }} />
                  )}
                </div>
              )}
            </AccordionSection>
            </div>

            <AccordionSection
              id={`${prefix}-amendments`}
              title="Service Amendments"
              accentColor={SECTION_COLORS.serviceAmendments}
              isOpen={row1Open}
              onToggle={toggleRow1}
              badge={tabContent && tabContent.serviceAmendments.some(g => g.title.toLowerCase().includes('address alert')) ? (
                <span className={styles.addressAlertBadge}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  Address Alert
                </span>
              ) : undefined}
            >
              {tabContent && <ServiceAmendmentsContent tabContent={tabContent} />}
            </AccordionSection>

            <AccordionSection
              id={`${prefix}-cancellations`}
              title="Cancellations & Changes"
              accentColor={SECTION_COLORS.cancellations}
              isOpen={row2Open}
              onToggle={toggleRow2}
              badge={tabContent && tabContent.serviceAmendments.some(g => g.title.toLowerCase().includes('address alert')) ? (
                <span className={styles.addressAlertBadge}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  Address Alert
                </span>
              ) : undefined}
            >
              {tabContent && <InstructionGroupList groups={tabContent.cancellationsAndChanges} />}
              {bookingGroupsByCategory.vehicleType.length > 0 && (
                <InstructionGroupList groups={bookingGroupsByCategory.vehicleType} />
              )}
              {(bookingGroupsByCategory.confirmations.length > 0 || customer.confirmationsSpecific) && (
                <InstructionGroupList
                  groups={bookingGroupsByCategory.confirmations}
                  appendHtml={customer.confirmationsSpecific}
                />
              )}
            </AccordionSection>

            <AccordionSection
              id={`${prefix}-remindercalls`}
              title="Reminder Calls"
              accentColor={SECTION_COLORS.reminderCalls}
              isOpen={row2Open}
              onToggle={toggleRow2}
            >
              {tabContent && <ReminderCallsContent tabContent={tabContent} />}
            </AccordionSection>
          </div>
        </div>
      )}

      {/* ── Contact Information: always visible, independent of tab selection ── */}
      {contactTabContent && (
        <section className={styles.persistentContactInfo} aria-labelledby="contact-info-heading">
          <div className={styles.persistentContactInfoHeader}>
            <hr className={styles.contactInfoDividerLine} />
            <h2 id="contact-info-heading" className={styles.persistentContactInfoTitle}>
              Contact Information
            </h2>
            <hr className={styles.contactInfoDividerLine} />
          </div>

          {customer.businessHoursValue && (
            <div className={styles.businessHoursBanner}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span><strong>Business Hours:</strong> {customer.businessHoursValue}</span>
            </div>
          )}

          <ContactInformationContent
            tabContent={contactTabContent}
            problemWithReminderCall={contactTabContent.reminderCalls.problemWithReminderCall}
          />
        </section>
      )}
    </article>
  );
};

export default CustomerDetailView;
