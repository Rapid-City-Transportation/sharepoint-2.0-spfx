import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './OutsourceContactCards.module.scss';
import AccordionSection from '../../customerContactCards/components/AccordionSection';
import { IVendor } from '../models/types';
import { useVendorDocuments } from '../hooks/useVendorDocuments';
import {
  IVendorDocFile,
  VENDOR_DOCS_LIBRARY,
  VENDOR_DOCS_LIBRARY_URL,
} from '../services/vendorDocumentsService';

interface IVendorDocumentsProps {
  vendor: IVendor;
  accentColor: string;
  badge: React.ReactNode;
}

function formatDate(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return undefined;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

const FileList: React.FC<{ files: IVendorDocFile[] }> = ({ files }) => (
  <ul className={styles.docList} role="list">
    {files.map(file => (
      <li key={file.url} className={styles.docItem}>
        <a className={styles.contactLink} href={file.url} target="_blank" rel="noopener noreferrer">
          {file.name}
        </a>
        {formatDate(file.modified) && (
          <span className={styles.docDate}>Updated {formatDate(file.modified)}</span>
        )}
      </li>
    ))}
  </ul>
);

/** Managers only: the vendor's folder in the Management site's Vendor
 *  Compliance Documents library, one row per category, read live so the
 *  card tracks whatever is uploaded there. */
const VendorDocuments: React.FC<IVendorDocumentsProps> = ({ vendor, accentColor, badge }) => {
  const { state, docs } = useVendorDocuments(vendor.erpDriverId);

  return (
    <AccordionSection
      id="vendor-documents"
      title="Compliance Documents"
      accentColor={accentColor}
      badge={badge}
    >
      {state === 'loading' && (
        <p className={styles.emptySectionText} role="status" aria-live="polite">
          Loading documents...
        </p>
      )}

      {state === 'noFolder' && (
        <p className={styles.emptySectionText}>
          No documents folder on file for this vendor
          {vendor.erpDriverId ? ` (ERP ID ${vendor.erpDriverId})` : ''}.{' '}
          <a
            className={styles.contactLink}
            href={VENDOR_DOCS_LIBRARY_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open the {VENDOR_DOCS_LIBRARY} library
          </a>
          .
        </p>
      )}

      {state === 'noAccess' && (
        <p className={styles.emptySectionText}>
          Your account cannot open the {VENDOR_DOCS_LIBRARY} library on the Management site.
        </p>
      )}

      {state === 'error' && (
        <p className={styles.emptySectionText} role="alert">
          The documents could not be loaded. Try refreshing the page.
        </p>
      )}

      {state === 'ready' && docs && (
        <>
          {docs.categories.map(category => (
            <div key={category.url} className={styles.fieldRow}>
              <div className={styles.fieldRowLabel}>{category.name}</div>
              {category.files.length > 0 ? (
                <FileList files={category.files} />
              ) : (
                <div className={`${styles.fieldRowValue} ${styles.docEmpty}`}>None on file</div>
              )}
            </div>
          ))}

          {docs.looseFiles.length > 0 && (
            <div className={styles.fieldRow}>
              <div className={styles.fieldRowLabel}>Other files</div>
              <FileList files={docs.looseFiles} />
            </div>
          )}

          <a
            className={styles.docFolderLink}
            href={docs.folderUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open {vendor.name}&apos;s folder in SharePoint
            <Icon iconName="OpenInNewTab" aria-hidden="true" />
          </a>
        </>
      )}
    </AccordionSection>
  );
};

export default VendorDocuments;
