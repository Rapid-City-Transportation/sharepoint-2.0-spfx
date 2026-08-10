import * as React from 'react';
import styles from './OutsourceContactCards.module.scss';
import { allCities, bestPriority, IVendor, zoneAccent } from '../models/types';
import VehicleIcon from './VehicleIcon';

interface IVendorCardProps {
  vendor: IVendor;
  onClick: (vendor: IVendor) => void;
}

const CITY_PREVIEW_COUNT = 3;

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Directory tile: name, zones, priority, cities, vehicles. Zone names always
 * render as text so the accent colour never carries meaning on its own.
 */
const VendorCard: React.FC<IVendorCardProps> = ({ vendor, onClick }) => {
  const namedZones = vendor.zones.filter(z => !!z.zone);
  const accent = zoneAccent(namedZones[0]?.zone);
  const initials = getInitials(vendor.name);
  const cities = allCities(vendor);
  const previewCities = cities.slice(0, CITY_PREVIEW_COUNT);
  const moreCities = cities.length - previewCities.length;
  const priority = bestPriority(vendor);

  const labelParts = [
    `View vendor card for ${vendor.name}`,
    namedZones.length > 0 ? `Zones: ${namedZones.map(z => z.zone).join(', ')}` : '',
    priority || '',
    previewCities.length > 0
      ? `Cities: ${previewCities.join(', ')}${moreCities > 0 ? ` and ${moreCities} more` : ''}`
      : '',
    vendor.vehicleTypes.length > 0 ? `Vehicles: ${vendor.vehicleTypes.join(', ')}` : '',
  ].filter(Boolean);

  return (
    <button
      className={styles.card}
      onClick={() => onClick(vendor)}
      type="button"
      data-vendor-id={vendor.id}
      aria-label={labelParts.join('. ')}
      style={{ borderTopColor: accent }}
    >
      <div
        className={styles.cardAvatar}
        style={{ backgroundColor: accent }}
        aria-hidden="true"
      >
        {initials}
      </div>

      <div className={styles.cardName}>{vendor.name}</div>

      {namedZones.length > 0 && (
        <div className={styles.cardZoneRow}>
          {namedZones.map(z => (
            <span
              key={z.zone}
              className={styles.cardTypeBadge}
              style={{ color: zoneAccent(z.zone), borderColor: zoneAccent(z.zone) }}
            >
              {z.zone}
            </span>
          ))}
        </div>
      )}

      {previewCities.length > 0 && (
        <div className={styles.cardCities}>
          {previewCities.join(', ')}
          {moreCities > 0 ? ` +${moreCities} more` : ''}
        </div>
      )}

      <div className={styles.cardFooter}>
        {priority && (
          <span
            className={`${styles.priorityBadge} ${
              priority === 'Primary Option'
                ? styles.priorityPrimary
                : priority === 'Secondary Option'
                  ? styles.prioritySecondary
                  : styles.priorityWhenRequired
            }`}
          >
            {priority}
          </span>
        )}

        <span className={styles.cardVehicles} aria-hidden="true">
          {vendor.vehicleTypes.map(v => (
            <span key={v} className={styles.cardVehicleIcon} title={v}>
              <VehicleIcon type={v} />
            </span>
          ))}
        </span>
      </div>
    </button>
  );
};

export default VendorCard;
