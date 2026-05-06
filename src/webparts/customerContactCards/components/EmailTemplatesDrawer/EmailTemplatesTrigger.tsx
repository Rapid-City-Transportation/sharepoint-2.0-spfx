import * as React from 'react';
import styles from './EmailTemplatesDrawer.module.scss';

interface IEmailTemplatesTriggerProps {
  onClick: () => void;
  isOpen: boolean;
  shifted?: boolean;
}

/**
 * Persistent right-edge tab that opens the Email Templates drawer.
 * Sits directly below the Address Directories trigger.
 * shifted is true whenever *any* drawer is open so this tab clears the open panel.
 */
const EmailTemplatesTrigger = React.forwardRef<HTMLButtonElement, IEmailTemplatesTriggerProps>(
  ({ onClick, isOpen, shifted }, ref) => (
    <button
      ref={ref}
      type="button"
      className={`${styles.persistentTab} ${(shifted ?? isOpen) ? styles.persistentTabOpen : ''}`}
      onClick={onClick}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      aria-label={isOpen ? 'Close Email Templates' : 'Open Email Templates'}
      title="Email Templates"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
      </svg>
    </button>
  )
);

EmailTemplatesTrigger.displayName = 'EmailTemplatesTrigger';

export default EmailTemplatesTrigger;
