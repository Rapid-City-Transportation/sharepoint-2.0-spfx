import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './OutsourceContactCards.module.scss';
import AccordionSection from '../../customerContactCards/components/AccordionSection';
import {
  allCities,
  bestPriority,
  IVendor,
  IVendorManagerInfo,
  IVendorZoneProfile,
  priorityRank,
  zoneAccent,
} from '../models/types';
import { isManagerView } from '../services/permissions';
import VehicleIcon from './VehicleIcon';

// Accent hexes match the customer detail view's sections so the two card
// pages read as one family.
const SECTION_COLORS = {
  allDispatch: '#1F4C7F',
  templates: '#9B2C2C',
  contracts: '#187389',
  notes: '#8A6A0C',
  alternatives: '#187389',
};

interface IVendorDetailViewProps {
  vendor: IVendor;
  onBack: () => void;
  /** Full directory, for the "If Unavailable" alternatives panel. */
  allVendors: IVendor[];
  onVendorSelect: (vendor: IVendor) => void;
}

/** Renders nothing when the value is empty. */
const FieldRow: React.FC<{ label: string; value?: string }> = ({ label, value }) => {
  if (!value) return null;
  return (
    <div className={styles.fieldRow}>
      <div className={styles.fieldRowLabel}>{label}</div>
      <div className={styles.fieldRowValue}>{value}</div>
    </div>
  );
};

/** The source list has emails typed into phone columns, so pick by shape. */
function contactHref(value: string): string {
  return value.indexOf('@') !== -1
    ? `mailto:${value}`
    : `tel:${value.replace(/[^+\d]/g, '')}`;
}

function formatDate(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Yes/No is spelled out; the icon only reinforces it. */
const OnFileRow: React.FC<{ label: string; value?: boolean }> = ({ label, value }) => (
  <div className={styles.fieldRowValue}>
    <Icon
      iconName={value ? 'CheckMark' : 'Cancel'}
      className={value ? styles.onFileYesIcon : styles.onFileNoIcon}
      aria-hidden="true"
    />{' '}
    {label}: <strong>{value ? 'Yes' : 'No'}</strong>
  </div>
);

const ManagerSections: React.FC<{ info: IVendorManagerInfo }> = ({ info }) => (
  <>
    <AccordionSection
      id="vendor-contracts"
      title="Contracts & Insurance"
      accentColor={SECTION_COLORS.contracts}
      badge={
        <span className={styles.managerBadge}>
          <Icon iconName="Lock" aria-hidden="true" /> Managers only
        </span>
      }
    >
      <FieldRow label="Insurance Provider" value={info.insuranceProvider} />
      <FieldRow label="Policy Number" value={info.policyNumber} />
      <FieldRow label="Coverage Type" value={info.coverageType} />
      <FieldRow label="Policy Expiry" value={formatDate(info.policyExpiry)} />
      <FieldRow label="Insurance Status" value={info.insuranceStatus} />
      {/* The list's day count goes hugely negative when no expiry date is set. */}
      {info.policyExpiry && (
        <FieldRow label="Days Until Expiry" value={info.daysUntilExpiry} />
      )}
      <div className={styles.fieldRow}>
        <div className={styles.fieldRowLabel}>Documents on File</div>
        <OnFileRow label="Insurance certificate" value={info.certificateOnFile} />
        <OnFileRow label="Contract" value={info.contractOnFile} />
        <OnFileRow label="Business licence" value={info.businessLicenceOnFile} />
        <OnFileRow label="Vehicle safety docs" value={info.vehicleSafetyDocsOnFile} />
        <OnFileRow label="WSIB clearance" value={info.wsibClearanceOnFile} />
        <OnFileRow label="Credit card on file" value={info.creditCardOnFile} />
      </div>

      <FieldRow label="Account Type" value={info.accountType} />
      <FieldRow label="HST/GST Number" value={info.hstGstNumber} />
      <FieldRow label="Rate Notes" value={info.rateNotes} />
      <FieldRow label="Billing Contact" value={info.billingContactName} />
      <FieldRow label="Billing Email" value={info.billingEmail} />
      <FieldRow label="Billing Phone" value={info.billingPhone} />
    </AccordionSection>

    <AccordionSection
      id="vendor-notes"
      title="Reviews & Notes"
      accentColor={SECTION_COLORS.notes}
      badge={
        <span className={styles.managerBadge}>
          <Icon iconName="Lock" aria-hidden="true" /> Managers only
        </span>
      }
    >
      <FieldRow label="Last Review" value={formatDate(info.lastReviewDate)} />
      <FieldRow label="Next Review" value={formatDate(info.nextReviewDate)} />
      <FieldRow label="Escalations Contact" value={info.escalationsContact} />
      <FieldRow label="Vendor Review Notes" value={info.reviewNotes} />
      <FieldRow label="Dispatch Notes" value={info.dispatchNotes} />
      <FieldRow label="Manager Notes" value={info.managerNotes} />
      <FieldRow label="Operations Notes" value={info.operationsNotes} />
      {!info.lastReviewDate && !info.nextReviewDate && !info.escalationsContact &&
        !info.reviewNotes && !info.dispatchNotes && !info.managerNotes &&
        !info.operationsNotes && (
          <p className={styles.emptySectionText}>No reviews or notes on record.</p>
        )}
    </AccordionSection>
  </>
);


interface IAlternative {
  vendor: IVendor;
  sharedCities: string[];
}

/**
 * Other companies serving the same cities as the active zone (or the whole
 * vendor when it has no zone breakdown), for when this one cannot take the
 * trip. Best coverage first: shared-city count, then strongest priority,
 * then name.
 */
function findAlternatives(
  current: IVendor,
  zoneProfile: IVendorZoneProfile | undefined,
  all: IVendor[]
): IAlternative[] {
  // A zone with no city data must not borrow other zones' cities (that
  // recommends wrong-area companies); only a vendor with no zone breakdown
  // at all falls back to everything it serves.
  const base = zoneProfile ? zoneProfile.cities : allCities(current);
  const wanted = new Set(base.map(c => c.toLowerCase()));
  if (wanted.size === 0) return [];

  const out: IAlternative[] = [];
  for (const v of all) {
    if (v.id === current.id) continue;
    const shared: string[] = [];
    const seen = new Set<string>();
    for (const c of allCities(v)) {
      const k = c.toLowerCase();
      if (wanted.has(k) && !seen.has(k)) {
        seen.add(k);
        shared.push(c);
      }
    }
    if (shared.length > 0) out.push({ vendor: v, sharedCities: shared });
  }

  return out
    .sort((a, b) => {
      if (b.sharedCities.length !== a.sharedCities.length) {
        return b.sharedCities.length - a.sharedCities.length;
      }
      const pa = priorityRank(bestPriority(a.vendor));
      const pb = priorityRank(bestPriority(b.vendor));
      if (pa !== pb) return pa - pb;
      return a.vendor.name.localeCompare(b.vendor.name);
    })
    .slice(0, 5);
}

/**
 * Full vendor record, laid out like the customer detail view. Manager sections
 * are render-guarded rather than hidden, so dispatch never receives that data.
 * Zone tabs are keyed by index: live zone values can be missing or repeated.
 */
const VendorDetailView: React.FC<IVendorDetailViewProps> = ({
  vendor,
  onBack,
  allVendors,
  onVendorSelect,
}) => {
  const manager = isManagerView();
  const singleZone = vendor.zones.length === 1;
  const [activeIdx, setActiveIdx] = React.useState<number | null>(singleZone ? 0 : null);

  const zoneProfile: IVendorZoneProfile | undefined =
    activeIdx !== null ? vendor.zones[activeIdx] : undefined;

  const alternatives = React.useMemo(
    () => findAlternatives(vendor, zoneProfile, allVendors),
    [vendor, zoneProfile, allVendors]
  );

  const backRef = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    backRef.current?.focus();
  }, []);

  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  /** ARIA tabs pattern: arrows wrap through the tablist, Home/End jump. */
  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    const count = vendor.zones.length;
    const current = tabRefs.current.findIndex(el => el === document.activeElement);
    let next = -1;
    if (e.key === 'ArrowRight') next = (current + 1 + count) % count;
    else if (e.key === 'ArrowLeft') next = (current - 1 + count) % count;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = count - 1;
    if (next !== -1) {
      e.preventDefault();
      tabRefs.current[next]?.focus();
    }
  };

  const namedZones = vendor.zones.filter(z => !!z.zone);

  return (
    <article className={styles.detailView} aria-label={`Vendor detail for ${vendor.name}`}>
      <button
        ref={backRef}
        className={styles.backButton}
        onClick={onBack}
        type="button"
        aria-label="Back to all vendors"
      >
        ← Back to All Vendors
      </button>

      <header className={styles.detailHeader}>
        <div className={styles.detailHeaderLeft}>
          <h1 className={styles.detailName}>
            <span>{vendor.name}</span>
            {namedZones.map((z, i) => (
              <span
                key={`${z.zone}-${i}`}
                className={styles.detailTypePill}
                style={{ backgroundColor: zoneAccent(z.zone) }}
              >
                {z.zone}
              </span>
            ))}
          </h1>

          {vendor.operatingName && (
            <p className={styles.detailOperatingName}>Operating as {vendor.operatingName}</p>
          )}

          {vendor.vehicleTypes.length > 0 && (
            <div className={styles.vehicleRow} aria-label={`Vehicles: ${vendor.vehicleTypes.join(', ')}`}>
              {vendor.vehicleTypes.map(v => (
                <span key={v} className={styles.vehiclePill}>
                  <VehicleIcon type={v} />
                  {v}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      <hr className={styles.headerDivider} aria-hidden="true" />

      {!singleZone && (
        <div
          role="tablist"
          aria-label="Service zones"
          className={styles.tabBar}
          onKeyDown={handleTabKeyDown}
        >
          {vendor.zones.map((z, i) => (
            <button
              key={i}
              ref={el => { tabRefs.current[i] = el; }}
              role="tab"
              id={`zone-tab-${i}`}
              aria-selected={activeIdx === i}
              aria-controls={`zone-panel-${i}`}
              tabIndex={activeIdx !== null ? (activeIdx === i ? 0 : -1) : (i === 0 ? 0 : -1)}
              className={`${styles.tab} ${activeIdx === i ? styles.tabActive : ''}`}
              onClick={() => setActiveIdx(i)}
              type="button"
            >
              {z.zone || `Zone ${i + 1}`}
            </button>
          ))}
        </div>
      )}

      {!zoneProfile ? (
        <div className={styles.tabSelectionPrompt} role="status">
          <Icon iconName="MapPin" aria-hidden="true" />
          <p>
            Select a zone above to view instructions for that area.
          </p>
        </div>
      ) : (
        <div
          role={singleZone ? undefined : 'tabpanel'}
          id={singleZone ? undefined : `zone-panel-${activeIdx}`}
          aria-labelledby={singleZone ? undefined : `zone-tab-${activeIdx}`}
        >
          {zoneProfile.cities.length > 0 && (
            <div className={styles.citiesRow}>
              <span className={styles.citiesRowLabel}>
                {zoneProfile.zone ? `Cities served (${zoneProfile.zone}):` : 'Cities served:'}
              </span>
              {zoneProfile.cities.map(city => (
                <span key={city} className={styles.cityChip}>{city}</span>
              ))}
            </div>
          )}

          {(zoneProfile.dispatchPhone || zoneProfile.dispatchPhoneAlt || zoneProfile.dispatchEmail) && (
            <div className={styles.zoneOverrideRow} role="note">
              <Icon iconName="Phone" aria-hidden="true" />
              <span>
                <strong>
                  {zoneProfile.zone ? `${zoneProfile.zone} dispatch:` : 'Zone dispatch:'}
                </strong>{' '}
                {zoneProfile.dispatchPhone && (
                  <a className={styles.contactLink} href={contactHref(zoneProfile.dispatchPhone)}>
                    {zoneProfile.dispatchPhone}
                  </a>
                )}
                {zoneProfile.dispatchPhoneAlt && (
                  <>
                    {' / '}
                    <a
                      className={styles.contactLink}
                      href={contactHref(zoneProfile.dispatchPhoneAlt)}
                    >
                      {zoneProfile.dispatchPhoneAlt}
                    </a>
                  </>
                )}
                {zoneProfile.dispatchEmail && (
                  <>
                    {' / '}
                    <a
                      className={styles.contactLink}
                      href={`mailto:${zoneProfile.dispatchEmail}`}
                    >
                      {zoneProfile.dispatchEmail}
                    </a>
                  </>
                )}
              </span>
            </div>
          )}
          {zoneProfile.vehicleTypes && (
            <div className={styles.zoneOverrideRow} role="note">
              <Icon iconName="Car" aria-hidden="true" />
              <span>
                <strong>Vehicles in this zone:</strong>{' '}
                {zoneProfile.vehicleTypes.join(', ')}
              </span>
            </div>
          )}

          <div className={styles.infoBar}>
            <span
              className={`${styles.infoBadge} ${vendor.portal ? styles.infoBadgeYes : styles.infoBadgeNeutral}`}
            >
              Portal: <strong>{vendor.portal ? 'Yes' : 'No'}</strong>
            </span>
            {vendor.dispatch.service247 && (
              <span className={`${styles.infoBadge} ${styles.infoBadgeYes}`}>
                24/7 Service: <strong>Yes</strong>
              </span>
            )}
            {zoneProfile.priority && (
              <span className={styles.priorityBadgeDetail}>
                {zoneProfile.priority}
              </span>
            )}
            {vendor.dispatch.bookingMethod && (
              <>
                <span className={styles.infoBarLabel}>
                  <Icon iconName="Phone" aria-hidden="true" /> Booking Method
                </span>
                <span className={styles.infoBarText}>{vendor.dispatch.bookingMethod}</span>
              </>
            )}
          </div>

          {zoneProfile.specialInstructions && (
            <div className={styles.specialAlertBanner} role="note">
              <Icon iconName="Warning" aria-hidden="true" />
              <span>
                <strong>Special Instructions:</strong> {zoneProfile.specialInstructions}
              </span>
            </div>
          )}

          <div className={styles.sectionsGrid}>
            <AccordionSection
              id="vendor-dispatch"
              title="All Dispatch"
              accentColor={SECTION_COLORS.allDispatch}
              defaultOpen
            >
              <FieldRow label="Primary" value={vendor.dispatch.phone} />
              <FieldRow label="Secondary" value={vendor.dispatch.secondaryPhone} />
              <FieldRow label="After Hours Phone" value={vendor.dispatch.afterHoursPhone} />
              <FieldRow label="Email" value={vendor.dispatch.email} />
              <FieldRow label="Hours of Operation" value={vendor.dispatch.hours} />
              <FieldRow label="Booking Method" value={vendor.dispatch.bookingMethod} />
              <FieldRow label="Notes" value={vendor.dispatch.notes} />
            </AccordionSection>

            <AccordionSection
              id="vendor-alternatives"
              title="If Unavailable: Alternatives"
              accentColor={SECTION_COLORS.alternatives}
              defaultOpen
            >
              {zoneProfile.cities.length === 0 ? (
                <p className={styles.recEmpty}>
                  No cities are on file for this coverage yet, so alternatives
                  cannot be suggested.
                </p>
              ) : alternatives.length === 0 ? (
                <p className={styles.recEmpty}>
                  No other company on file serves
                  {zoneProfile.zone ? ` these ${zoneProfile.zone} cities.` : ' these cities.'}
                </p>
              ) : (
                <>
                  <p className={styles.recIntro}>
                    If {vendor.name} cannot take the trip, these companies serve
                    the same cities:
                  </p>
                  <ul className={styles.recList} role="list">
                    {alternatives.map(alt => (
                      <li key={alt.vendor.id}>
                        <button
                          type="button"
                          className={styles.recButton}
                          onClick={() => onVendorSelect(alt.vendor)}
                        >
                          <span className={styles.recTopRow}>
                            <span className={styles.recName}>{alt.vendor.name}</span>
                            {bestPriority(alt.vendor) && (
                              <span className={styles.recPriority}>
                                {bestPriority(alt.vendor)}
                              </span>
                            )}
                          </span>
                          <span className={styles.recCities}>
                            Also serves: {alt.sharedCities.slice(0, 3).join(', ')}
                            {alt.sharedCities.length > 3
                              ? ` +${alt.sharedCities.length - 3} more`
                              : ''}
                          </span>
                          {alt.vendor.dispatch.phone && (
                            <span className={styles.recPhone}>
                              {alt.vendor.dispatch.phone}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </AccordionSection>

            {vendor.templates.length > 0 && (
              <AccordionSection
                id="vendor-templates"
                title="Templates, Blurbs & Scenario Instructions"
                accentColor={SECTION_COLORS.templates}
                defaultOpen
              >
                {vendor.templates.map(t => (
                  <div key={t.title} className={styles.fieldRow}>
                    <div className={styles.fieldRowLabel}>{t.title}</div>
                    <div className={styles.fieldRowValue}>{t.body}</div>
                  </div>
                ))}
              </AccordionSection>
            )}

            {manager && vendor.managerOnly && <ManagerSections info={vendor.managerOnly} />}
          </div>
        </div>
      )}

      <section className={styles.persistentContact} aria-labelledby="vendor-contact-heading">
        <div className={styles.persistentContactHeader}>
          <hr className={styles.contactDividerLine} aria-hidden="true" />
          <h2 id="vendor-contact-heading" className={styles.persistentContactTitle}>
            Contact Information
          </h2>
          <hr className={styles.contactDividerLine} aria-hidden="true" />
        </div>

        {vendor.dispatch.hours && (
          <div className={styles.businessHoursBanner}>
            <Icon iconName="Clock" aria-hidden="true" />
            <span><strong>Business Hours:</strong> {vendor.dispatch.hours}</span>
          </div>
        )}

        <div className={styles.contactBlocks}>
          <div className={styles.contactBlock}>
            <h3 className={styles.contactBlockTitle}>During Business Hours</h3>
            <p className={styles.contactBlockText}>
              {vendor.dispatch.phone ? (
                <a className={styles.contactLink} href={contactHref(vendor.dispatch.phone)}>
                  {vendor.dispatch.phone}
                </a>
              ) : (
                'No dispatch line on file.'
              )}
              {vendor.dispatch.secondaryPhone && (
                <>
                  <br />
                  <a className={styles.contactLink} href={contactHref(vendor.dispatch.secondaryPhone)}>
                    {vendor.dispatch.secondaryPhone}
                  </a>
                </>
              )}
              {vendor.dispatch.email && vendor.dispatch.email !== vendor.dispatch.phone && (
                <>
                  <br />
                  <a className={styles.contactLink} href={`mailto:${vendor.dispatch.email}`}>
                    {vendor.dispatch.email}
                  </a>
                </>
              )}
            </p>
          </div>

          <div className={styles.contactBlock}>
            <h3 className={styles.contactBlockTitle}>Outside Business Hours</h3>
            <p className={styles.contactBlockText}>
              {vendor.dispatch.afterHoursPhone ? (
                <a
                  className={styles.contactLink}
                  href={contactHref(vendor.dispatch.afterHoursPhone)}
                >
                  {vendor.dispatch.afterHoursPhone}
                </a>
              ) : (
                'Use the main dispatch line.'
              )}
            </p>
          </div>
        </div>
      </section>
    </article>
  );
};

export default VendorDetailView;
