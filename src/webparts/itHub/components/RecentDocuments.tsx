import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './ItHub.module.scss';
import { IItRecentDoc } from '../models/IItHubModels';
import { FILE_TYPE_ICONS, DEFAULT_FILE_ICON } from '../services/itHubConfig';

export interface IRecentDocumentsProps {
  docs: IItRecentDoc[];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export const RecentDocuments: React.FC<IRecentDocumentsProps> = ({ docs }) => {
  if (docs.length === 0) {
    return <p className={styles.emptyText}>No documents in the library yet.</p>;
  }

  return (
    <ul className={styles.recentList} role="list">
      {docs.map(doc => (
        <li key={doc.webUrl} className={styles.recentRow}>
          <span className={styles.recentIcon} aria-hidden="true">
            <Icon iconName={FILE_TYPE_ICONS[doc.fileType] || DEFAULT_FILE_ICON} />
          </span>
          <span className={styles.recentMain}>
            <a href={doc.webUrl} className={styles.recentName}>
              {doc.name}
            </a>
            <span className={styles.recentMeta}>
              <span>
                Modified {formatDate(doc.modified)}
                {doc.modifiedBy ? ` by ${doc.modifiedBy}` : ''}
              </span>
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
};
