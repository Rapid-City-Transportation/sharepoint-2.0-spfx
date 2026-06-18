import * as React from 'react';
import styles from './EmailTemplatesDrawer.module.scss';
import {
  fetchEmailTemplates,
  IEmailTemplate,
  EmailTemplateCategory,
} from '../../services/emailTemplatesService';
import { sanitizeHtml } from '../../utils/sanitize';

interface IEmailTemplatesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
}

interface ITabConfig {
  id: string;
  label: string;
  category: EmailTemplateCategory;
}

const TABS: ITabConfig[] = [
  { id: 'booking', label: 'Booking', category: 'Booking' },
  { id: 'dispatch', label: 'Dispatch Alerts', category: 'Dispatch Alerts' },
  { id: 'reminder', label: 'Reminder Call', category: 'Reminder Call' },
];

type ToastTone = 'success' | 'error';
interface IToast { message: string; tone: ToastTone; }

const EmailTemplatesDrawer: React.FC<IEmailTemplatesDrawerProps> = ({ isOpen, onClose, triggerRef }) => {
  const [activeTab, setActiveTab] = React.useState<string>('booking');
  const [templates, setTemplates] = React.useState<IEmailTemplate[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string>('');
  const [search, setSearch] = React.useState('');
  const [toast, setToast] = React.useState<IToast | null>(null);
  const [expandedIds, setExpandedIds] = React.useState<Set<number>>(new Set());
  const toastTimerRef = React.useRef<number | null>(null);

  const toggleExpand = React.useCallback((id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const drawerRef = React.useRef<HTMLDivElement>(null);
  const closeBtnRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!isOpen || templates.length > 0 || loading) return;

    setLoading(true);
    setError('');
    fetchEmailTemplates()
      .then(items => {
        setTemplates(items);
        setLoading(false);
      })
      .catch(() => {
        setError('Unable to load email templates. Please try again later.');
        setLoading(false);
      });
  }, [isOpen, templates.length, loading]);

  // Only return focus to the trigger after a real close, not on initial mount.
  const wasOpenRef = React.useRef(false);
  React.useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
      const t = window.setTimeout(() => closeBtnRef.current?.focus(), 50);
      return () => window.clearTimeout(t);
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      triggerRef.current?.focus();
    }
    return undefined;
  }, [isOpen, triggerRef]);

  React.useEffect(() => {
    if (!isOpen) return undefined;
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleDrawerKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !drawerRef.current) return;
    const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  const handleTabChange = React.useCallback((tab: ITabConfig) => {
    setActiveTab(tab.id);
    setSearch('');
    setExpandedIds(new Set());
  }, []);

  const showToast = React.useCallback((message: string, tone: ToastTone) => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast({ message, tone });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 4000);
  }, []);

  React.useEffect(() => () => {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
  }, []);

  // Copy the rich-text HTML body to the clipboard so the agent can paste it
  // into Outlook with full formatting preserved (fonts, colors, paragraphs,
  // signatures). Then open a `mailto:` with any auto-CC recipients pre-filled
  // so Outlook's compose window pops up: agent presses Ctrl+V to paste.
  const handleTemplateClick = React.useCallback(async (template: IEmailTemplate) => {
    const html = template.bodyHtml || template.body;
    const plain = template.body;

    const ccParam = template.cc ? `cc=${encodeURIComponent(template.cc)}` : '';
    const mailtoUrl = ccParam ? `mailto:?${ccParam}` : 'mailto:';

    try {
      const ClipboardItemCtor = (window as unknown as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
      if (navigator.clipboard && ClipboardItemCtor) {
        await navigator.clipboard.write([
          new ClipboardItemCtor({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([plain], { type: 'text/plain' }),
          }),
        ]);
        window.location.href = mailtoUrl;
        const ccNote = template.cc ? ` (CC: ${template.cc})` : '';
        showToast(`Template copied${ccNote}. Press Ctrl+V to paste in Outlook`, 'success');
        return;
      }
    } catch {
      // Fall through to the plain-text fallback below.
    }

    // Fallback for browsers without ClipboardItem support.
    const fallbackParams = [
      template.cc ? `cc=${encodeURIComponent(template.cc)}` : '',
      `body=${encodeURIComponent(plain)}`,
    ].filter(Boolean).join('&');
    window.location.href = `mailto:?${fallbackParams}`;
    showToast('Opened in Outlook with plain text (formatting unavailable)', 'error');
  }, [showToast]);

  const currentTab = TABS.find(t => t.id === activeTab);

  const visibleItems = React.useMemo(() => {
    if (!currentTab) return [];
    let list = templates.filter(t => t.category === currentTab.category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t => t.name.toLowerCase().includes(q));
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [templates, currentTab, search]);

  return (
    <aside
      ref={drawerRef}
      className={`${styles.drawer} ${isOpen ? styles.open : ''}`}
      role="dialog"
      aria-modal="false"
      aria-labelledby="email-templates-drawer-title"
      aria-hidden={!isOpen}
      tabIndex={-1}
      onKeyDown={handleDrawerKeyDown}
    >
      <div className={styles.header}>
        <h2 id="email-templates-drawer-title" className={styles.title}>
          Email Templates
        </h2>
        <button
          ref={closeBtnRef}
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close Email Templates panel"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div role="tablist" aria-label="Email template categories" className={styles.tabBar}>
        {TABS.map(tab => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              role="tab"
              id={`email-tab-${tab.id}`}
              type="button"
              aria-selected={isActive}
              aria-controls={`email-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              className={`${styles.tab} ${isActive ? styles.tabActive : ''}`}
              onClick={() => handleTabChange(tab)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`email-panel-${activeTab}`}
        aria-labelledby={`email-tab-${activeTab}`}
        className={styles.body}
      >
        <div className={styles.helpText}>
          <strong>How this works:</strong> Click a template name to preview the
          full body. Click <strong>Copy</strong> to copy the formatted template
          and open Outlook. Then, press <kbd className={styles.kbd}>Ctrl</kbd>+
          <kbd className={styles.kbd}>V</kbd> in the body to paste.
        </div>

        {toast && (
          <div
            className={`${styles.toast} ${toast.tone === 'error' ? styles.toastError : styles.toastSuccess}`}
            role="status"
            aria-live="polite"
          >
            {toast.message}
          </div>
        )}

        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon} aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
          <input
            type="search"
            className={styles.searchInput}
            placeholder={`Search ${currentTab?.label.toLowerCase() || ''}...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label={`Search ${currentTab?.label || ''} templates`}
          />
        </div>

        {error && (
          <div className={styles.errorBanner} role="alert">
            {error}
          </div>
        )}

        {loading && (
          <div className={styles.loadingState} role="status" aria-live="polite">
            Loading templates…
          </div>
        )}

        {!loading && !error && visibleItems.length === 0 && (
          <div className={styles.placeholder} role="status">
            <p className={styles.placeholderTitle}>No templates</p>
            <p className={styles.placeholderText}>
              {search.trim()
                ? 'Try a different search term.'
                : 'No templates have been added to this category yet.'}
            </p>
          </div>
        )}

        {!loading && !error && visibleItems.length > 0 && (
          <>
            <div className={styles.countLabel} aria-live="polite">
              {visibleItems.length} template{visibleItems.length !== 1 ? 's' : ''}
            </div>
            <ul className={styles.templateList} role="list">
              {visibleItems.map(t => {
                const isExpanded = expandedIds.has(t.id);
                const panelId = `email-template-${t.id}`;
                return (
                  <li key={t.id} className={styles.templateItem}>
                    <div className={styles.templateRow}>
                      <button
                        type="button"
                        className={styles.templateToggle}
                        onClick={() => toggleExpand(t.id)}
                        aria-expanded={isExpanded}
                        aria-controls={panelId}
                      >
                        <span className={styles.templateIcon} aria-hidden="true">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                            <polyline points="22,6 12,13 2,6"/>
                          </svg>
                        </span>
                        <span className={styles.templateName}>{t.name}</span>
                        <span
                          className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ''}`}
                          aria-hidden="true"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                        </span>
                      </button>
                      <button
                        type="button"
                        className={styles.copyButton}
                        onClick={() => handleTemplateClick(t)}
                        aria-label={`Copy "${t.name}" and open Outlook`}
                        title="Copy template and open Outlook"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        <span>Copy</span>
                      </button>
                    </div>
                    {isExpanded && (
                      <div
                        id={panelId}
                        className={styles.templatePreview}
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(t.bodyHtml || t.body) }}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </aside>
  );
};

export default EmailTemplatesDrawer;
