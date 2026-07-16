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

interface IFaq {
  q: string;
  a: string;
}

const FAQS: IFaq[] = [
  {
    q: 'Five9 opens to a login page instead of loading. How do I fix it?',
    a: 'This happens most often in Microsoft Edge. Switch to Google Chrome and open Five9 there; it usually loads straight into the app.',
  },
  {
    q: 'I keep missing calls in Five9. How can I catch them?',
    a: 'Keep your headset on and close to your ear, since a missed call drops you into Not Ready. Turn on incoming-call alerts in Plus Applications (Enable Notification Banner or Toast Notification), and turn on Ring on Computer Speakers so you hear the phone ring. The speaker option may not work on office monitors that have no speakers.',
  },
  {
    q: 'My Five9 audio cut out, or the caller cannot hear me. What should I do?',
    a: 'Restart the device first. If that does not fix it, log out of Five9, turn your headset off and back on, then log back in. For one-way audio, where you can hear them but they cannot hear you or the reverse, it is usually a network or headset issue; check the Five9 troubleshooting guide on the agent community.',
  },
  {
    q: 'I cannot transfer a Five9 call to an extension like x700 or a Bell number. Why?',
    a: 'Wait until AFTER the French prompt finishes, then dial # on the dial pad to enter the extension. For x700 specifically, do not dial #, just dial 700 after the French prompt. If a caller hits this, remind them to wait for the French prompt before dialing any extension.',
  },
  {
    q: 'How do I transfer a call in Microsoft Teams?',
    a: 'On the call, select More options (the three dots) or Transfer. Use Consult then Transfer to speak with the person first, which is a warm transfer; internal staff show a colour indicator for whether they are free. Use Transfer to send the call straight through, which is a cold transfer and leaves you immediately. For Customer Service, Quality, or Accounting, transfer to the main line at 1-888-202-3923.',
  },
];

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

const ITSupport: React.FC<IITSupportProps> = (props) => {
  const themeVars = React.useMemo(
    () => getThemeCssVariables(defaultTheme) as React.CSSProperties,
    []
  );

  const [summary, setSummary] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [priority, setPriority] = React.useState('Medium');
  const [status, setStatus] = React.useState<SubmitStatus>('idle');
  const [openFaq, setOpenFaq] = React.useState<number | null>(null);

  const handleNavSearch = React.useCallback((query: string): void => {
    const q = (query || '').trim();
    const url = q
      ? `/SitePages/ContactCards.aspx?q=${encodeURIComponent(q)}`
      : '/SitePages/ContactCards.aspx';
    window.location.assign(url);
  }, []);

  const doSubmit = async (): Promise<void> => {
    if (!summary.trim() || !description.trim()) return;
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
          <h1 id="it-support-title" className={styles.heroTitle}>IT Support</h1>
          <p className={styles.heroIntro}>
            Trouble with your laptop, login, email, or anything tech? Submit a ticket below and the IT
            team will follow up. You can also email us at{' '}
            <a className={styles.heroEmail} href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </p>
        </section>

        <div className={styles.grid}>
          <section className={styles.ticketCard} aria-labelledby="ticket-title">
            <h2 id="ticket-title" className={styles.sectionTitle}>
              <Icon iconName="EditNote" className={styles.sectionIcon} aria-hidden="true" />
              Submit a ticket
            </h2>

            {status === 'success' ? (
              <div className={styles.successBox} role="status" aria-live="polite">
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

                <button type="submit" className={styles.submitBtn} disabled={status === 'submitting'}>
                  {status === 'submitting' ? 'Submitting...' : 'Submit ticket'}
                </button>
              </form>
            )}
          </section>

          <section className={styles.faqCard} aria-labelledby="faq-title">
            <h2 id="faq-title" className={styles.sectionTitle}>
              <Icon iconName="Help" className={styles.sectionIcon} aria-hidden="true" />
              Common questions
            </h2>
            <ul className={styles.faqList} role="list">
              {FAQS.map((faq, i) => {
                const isOpen = openFaq === i;
                return (
                  <li key={i} className={styles.faqItem}>
                    <button
                      type="button"
                      className={styles.faqQuestion}
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                    >
                      <span>{faq.q}</span>
                      <Icon iconName={isOpen ? 'ChevronUp' : 'ChevronDown'} aria-hidden="true" />
                    </button>
                    {isOpen && <p className={styles.faqAnswer}>{faq.a}</p>}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </main>

      <Footer pageIdentifier="IT Support Page" />
    </div>
  );
};

export default ITSupport;
