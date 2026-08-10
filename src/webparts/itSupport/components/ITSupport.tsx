import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './ITSupport.module.scss';
import { IITSupportProps } from './IITSupportProps';
import { defaultTheme, getThemeCssVariables } from '../../rapidCityHomepage/theme/ThemeTokens';
import { Navigation } from '../../rapidCityHomepage/components/Navigation/Navigation';
import { Footer } from '../../rapidCityHomepage/components/Footer/Footer';
import { submitTicket } from '../services/ticketService';

const SUPPORT_EMAIL = 'support@rapidcitytransport.com';

const PRIORITIES = ['Low', 'Medium', 'High'];

interface ITool {
  label: string;
  icon: string;
  docUrl?: string;
}

// Guides live in the RCT-ITTeam "IT Pages" library; action=embedview renders
// them read-only in the viewer, and Open full swaps it for the real doc.
const DOC_BASE =
  'https://rapidcitytransport.sharepoint.com/sites/RCT-ITTeam/_layouts/15/Doc.aspx';
const TOOLS: ITool[] = [
  { label: 'ButterflyMX (Door Access)', icon: 'Permissions', docUrl: `${DOC_BASE}?sourcedoc=%7BB743A82B-1D72-44C1-B580-0C67F8E15012%7D&action=embedview` },
  { label: 'Five9',                     icon: 'Headset',     docUrl: `${DOC_BASE}?sourcedoc=%7B5B925B22-1901-4452-AF7B-5E90D3742486%7D&action=embedview` },
  { label: 'System Slowdowns',          icon: 'Broom',       docUrl: `${DOC_BASE}?sourcedoc=%7BE477AB25-1DF0-478B-90EB-0F4654C103A7%7D&action=embedview` },
  { label: 'Teams Calling',             icon: 'TeamsLogo',   docUrl: `${DOC_BASE}?sourcedoc=%7B5D5CB8A4-7B63-4902-992D-7C7EFC211895%7D&action=embedview` },
].sort((a, b) => a.label.localeCompare(b.label));

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error' | 'invalid';

const ITSupport: React.FC<IITSupportProps> = (props) => {
  const themeVars = React.useMemo(
    () => getThemeCssVariables(defaultTheme) as React.CSSProperties,
    []
  );

  const [summary, setSummary] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [priority, setPriority] = React.useState('Medium');
  const [status, setStatus] = React.useState<SubmitStatus>('idle');
  const [activeTool, setActiveTool] = React.useState<ITool | null>(null);

  // Swap the embed action so the doc opens normally in a new tab.
  const activeDocFullUrl = activeTool?.docUrl
    ? activeTool.docUrl.replace('action=embedview', 'action=default')
    : undefined;

  // Closing unmounts the focused button, so put focus back on the heading.
  const handleCloseTool = React.useCallback((): void => {
    setActiveTool(null);
    document.getElementById('it-tools-heading')?.focus();
  }, []);

  // Submit unmounts its own button, so move focus to the confirmation.
  React.useEffect(() => {
    if (status === 'success') {
      document.getElementById('ticket-success')?.focus();
    }
  }, [status]);

  const handleNavSearch = React.useCallback((query: string): void => {
    const q = (query || '').trim();
    const url = q
      ? `/SitePages/ContactCards.aspx?q=${encodeURIComponent(q)}`
      : '/SitePages/ContactCards.aspx';
    window.location.assign(url);
  }, []);

  const doSubmit = async (): Promise<void> => {
    // Whitespace passes the browser's required check, so say something.
    if (!summary.trim() || !description.trim()) {
      setStatus('invalid');
      return;
    }
    setStatus('submitting');
    try {
      await submitTicket({
        summary: summary.trim(),
        description: description.trim(),
        priority,
      });
      setStatus('success');
      setSummary('');
      setDescription('');
      setPriority('Medium');
    } catch {
      setStatus('error');
    }
  };

  const onFormSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    doSubmit().catch(() => setStatus('error'));
  };

  return (
    <div className={styles.page} style={themeVars}>
      <a href="#it-support-main" className={styles.skipLink}>Skip to main content</a>
      <Navigation onSearch={handleNavSearch} activePage="itSupport" />

      <main id="it-support-main" className={styles.main} role="main" tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="it-support-title">
          <div className={styles.heroText}>
            <h1 id="it-support-title" className={styles.heroTitle}>IT Support</h1>
            <p className={styles.heroIntro}>
              Trouble with your laptop, login, email, or anything tech? Browse the self-help
              guides below to fix common issues fast, or submit a ticket and the IT team will
              follow up.
            </p>
          </div>
          <div className={styles.heroActions}>
            <a href="#it-ticket" className={styles.heroPrimaryBtn}>
              Submit a ticket
            </a>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className={styles.heroSecondaryBtn}
              aria-label={`Email support at ${SUPPORT_EMAIL}`}
            >
              Email support
            </a>
          </div>
        </section>

        <section className={styles.toolboxSection} aria-labelledby="it-tools-heading">
          <h2 id="it-tools-heading" className={styles.sectionTitle} tabIndex={-1}>
            <Icon iconName="Toolbox" className={styles.sectionIcon} aria-hidden="true" />
            Self-help guides
          </h2>
          <p className={styles.toolboxIntro}>
            Step-by-step guides for common IT tasks. Select a tool to open its guide.
          </p>

          <div className={styles.toolboxLayout}>
            <section className={styles.toolsPanel} aria-labelledby="it-tools-title">
              <div className={styles.panelHeader}>
                <h3 id="it-tools-title" className={styles.panelTitle}>
                  <Icon iconName="Toolbox" aria-hidden="true" />Tools
                </h3>
              </div>
              <ul className={styles.toolsGrid} role="list">
                {TOOLS.map((tool) => {
                  const isActive = activeTool?.label === tool.label;
                  return (
                    <li key={tool.label}>
                      <button
                        type="button"
                        className={`${styles.toolTile} ${isActive ? styles.toolTileActive : ''}`}
                        onClick={() => setActiveTool(tool)}
                        aria-pressed={isActive}
                      >
                        <span className={styles.toolIcon} aria-hidden="true">
                          <Icon iconName={tool.icon} />
                        </span>
                        <span className={styles.toolLabel}>{tool.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            <div className={styles.toolViewer} aria-live="polite">
              {!activeTool && (
                <div className={styles.toolViewerEmpty}>
                  <Icon
                    iconName="ViewList"
                    className={styles.toolViewerEmptyIcon}
                    aria-hidden="true"
                  />
                  <p className={styles.toolViewerEmptyText}>
                    Select a tool to view its guide here.
                  </p>
                </div>
              )}

              {activeTool && (
                <div className={styles.toolViewerContent}>
                  <header className={styles.toolViewerHeader}>
                    <div>
                      <p className={styles.toolViewerEyebrow}>Now viewing</p>
                      <h3 className={styles.toolViewerTitle}>{activeTool.label}</h3>
                    </div>
                    <div className={styles.toolViewerActions}>
                      {activeDocFullUrl && (
                        <button
                          type="button"
                          className={styles.toolViewerOpen}
                          onClick={() => window.open(activeDocFullUrl, '_blank', 'noopener,noreferrer')}
                          aria-label={`Open full ${activeTool.label} guide in a new tab`}
                        >
                          Open full <Icon iconName="OpenInNewTab" aria-hidden="true" />
                        </button>
                      )}
                      <button
                        type="button"
                        className={styles.toolViewerClose}
                        onClick={handleCloseTool}
                        aria-label="Close tool"
                      >
                        <Icon iconName="Cancel" />
                      </button>
                    </div>
                  </header>

                  {activeTool.docUrl ? (
                    <iframe
                      title={`${activeTool.label} guide`}
                      src={activeTool.docUrl}
                      className={styles.toolDocFrame}
                      loading="lazy"
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  ) : (
                    <div className={styles.toolComingSoon}>
                      <Icon
                        iconName="ConstructionCone"
                        className={styles.toolComingSoonIcon}
                        aria-hidden="true"
                      />
                      <p className={styles.toolComingSoonText}>
                        The guide for <strong>{activeTool.label}</strong> is being
                        prepared and will appear here once it is uploaded.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <section id="it-ticket" className={styles.ticketSection} aria-labelledby="ticket-title">
          <div className={styles.ticketCard}>
            <h2 id="ticket-title" className={styles.sectionTitle}>
              <Icon iconName="EditNote" className={styles.sectionIcon} aria-hidden="true" />
              Still need help? Submit a ticket
            </h2>

            {status === 'success' ? (
              <div id="ticket-success" className={styles.successBox} role="status" aria-live="polite" tabIndex={-1}>
                <Icon iconName="CompletedSolid" className={styles.successIcon} aria-hidden="true" />
                <div>
                  <p className={styles.successTitle}>Your ticket has been submitted.</p>
                  <p className={styles.successText}>
                    The IT team will follow up{props.userEmail ? ` at ${props.userEmail}` : ''}.{' '}
                    <button type="button" className={styles.linkButton} onClick={() => setStatus('idle')}>
                      Submit another ticket
                    </button>
                  </p>
                </div>
              </div>
            ) : (
              <form className={styles.form} onSubmit={onFormSubmit}>
                <div className={styles.field}>
                  <label htmlFor="ticket-summary" className={styles.label}>Summary</label>
                  <input
                    id="ticket-summary"
                    className={styles.input}
                    type="text"
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    maxLength={150}
                    required
                    placeholder="Short description, e.g. Cannot connect to Wi-Fi"
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="ticket-description" className={styles.label}>What is going on?</label>
                  <textarea
                    id="ticket-description"
                    className={styles.textarea}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                    required
                    placeholder="Tell us what is happening, any error messages, and what you have already tried."
                  />
                </div>

                <div className={styles.field}>
                  <span className={styles.label} id="ticket-priority-label">Priority</span>
                  <div className={styles.priorityRow} role="radiogroup" aria-labelledby="ticket-priority-label">
                    {PRIORITIES.map((p) => (
                      <label
                        key={p}
                        className={`${styles.priorityChip} ${priority === p ? styles.priorityChipActive : ''}`}
                      >
                        <input
                          type="radio"
                          name="priority"
                          value={p}
                          checked={priority === p}
                          onChange={() => setPriority(p)}
                          className={styles.priorityInput}
                        />
                        {p}
                      </label>
                    ))}
                  </div>
                </div>

                {status === 'error' && (
                  <p className={styles.errorText} role="alert">
                    Something went wrong submitting your ticket. Please try again, or email {SUPPORT_EMAIL}.
                  </p>
                )}

                {status === 'invalid' && (
                  <p className={styles.errorText} role="alert">
                    Please fill in the summary and description before submitting.
                  </p>
                )}

                <button type="submit" className={styles.submitBtn} disabled={status === 'submitting'}>
                  {status === 'submitting' ? 'Submitting...' : 'Submit ticket'}
                </button>
              </form>
            )}
          </div>
        </section>
      </main>

      <Footer pageIdentifier={activeTool ? `IT Support - ${activeTool.label}` : 'IT Support Page'} />
    </div>
  );
};

export default ITSupport;
