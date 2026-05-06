import * as React from 'react';
import styles from './ResourcesDrawer.module.scss';

interface IResourcesTriggerProps {
  onClick: () => void;
  isOpen: boolean;
  shifted?: boolean;
}

/**
 * Persistent left-edge tab that opens the Address Directories drawer.
 * @param props onClick handler, drawer open state, and whether to slide left
 *              (shifted is true when *any* drawer is open so this tab clears the panel).
 * @returns A fixed-position button that slides with the drawer.
 */
const ResourcesTrigger = React.forwardRef<HTMLButtonElement, IResourcesTriggerProps>(
  ({ onClick, isOpen, shifted }, ref) => (
    <button
      ref={ref}
      type="button"
      className={`${styles.persistentTab} ${(shifted ?? isOpen) ? styles.persistentTabOpen : ''}`}
      onClick={onClick}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      aria-label={isOpen ? 'Close Address Directories' : 'Open Address Directories'}
      title="Address Directories"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    </button>
  )
);

ResourcesTrigger.displayName = 'ResourcesTrigger';

export default ResourcesTrigger;
