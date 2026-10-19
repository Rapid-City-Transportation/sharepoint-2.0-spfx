import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './OutsourceContactCards.module.scss';

// Fluent ships a single wheelchair glyph, so the loading side rides on a
// letter badge; an unspecified wheelchair gets the plain glyph. Every choice
// the lists offer is mapped, so nothing falls back to a car by accident.
const VEHICLE_ICONS: Record<string, { icon: string; badge?: string }> = {
  'Sedan': { icon: 'Car' },
  'SUV': { icon: 'Car' },
  'Minivan': { icon: 'Bus' },
  'Wheelchair (SL)': { icon: 'Wheelchair', badge: 'S' },
  'Wheelchair (RL)': { icon: 'Wheelchair', badge: 'R' },
  'Wheelchair (OS)': { icon: 'Wheelchair', badge: 'O' },
  'Wheelchair (Unspecified)': { icon: 'Wheelchair' },
  'Stretcher': { icon: 'Medical' },
};

/** Decorative: the vehicle name is always in adjacent text or an aria-label. */
const VehicleIcon: React.FC<{ type: string }> = ({ type }) => {
  const { icon, badge } = VEHICLE_ICONS[type] || { icon: 'Car' };
  return (
    <span className={styles.vehicleIconCompound} aria-hidden="true">
      <Icon iconName={icon} />
      {badge && <span className={styles.vehicleIconBadge}>{badge}</span>}
    </span>
  );
};

export default VehicleIcon;
