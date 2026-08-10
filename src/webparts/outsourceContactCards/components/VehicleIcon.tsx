import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';

const VEHICLE_FONT_ICONS: Record<string, string> = {
  'Sedan': 'Car',
  'Minivan': 'Bus',
  'Wheelchair (SL)': 'Wheelchair',
  'Wheelchair (RL)': 'Wheelchair',
  'Stretcher': 'Medical',
};

/** Decorative: the vehicle name is always in adjacent text or an aria-label. */
const VehicleIcon: React.FC<{ type: string }> = ({ type }) => (
  <Icon iconName={VEHICLE_FONT_ICONS[type] || 'Car'} aria-hidden="true" />
);

export default VehicleIcon;
