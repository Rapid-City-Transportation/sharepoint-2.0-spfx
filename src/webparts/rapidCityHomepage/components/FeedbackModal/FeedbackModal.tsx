import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import { submitFeedback } from '../../services/FeedbackService';
import styles from './FeedbackModal.module.scss';

const URGENCY_OPTIONS = [
  'Critical - Information missing or incorrect',
  'High - Information is there, but unclear',
  'Medium - Formatting, spelling/grammar error',
  'Low - General feedback',
] as const;

export interface IFeedbackModalProps {
  /** Auto-filled page context label (e.g. "Home Page") */
  pageIdentifier: string;
  /** Called when the modal should close */
  onDismiss: () => void;
}

type ModalView = 'form' | 'success';

export const FeedbackModal: React.FC<IFeedbackModalProps> = ({
  pageIdentifier,
  onDismiss,
}) => {
  const [view, setView] = React.useState<ModalView>('form');
  const [description, setDescription] = React.useState('');
  const [urgency, setUrgency] = React.useState(URGENCY_OPTIONS[3] as string);
  const [descriptionError, setDescriptionError] = React.useState('');
  const [submitError, setSubmitError] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const dialogRef = React.useRef<HTMLDivElement>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  // Focus trap: capture & restore focus
  React.useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    dialogRef.current?.focus();

    return () => {
      previousFocusRef.current?.focus();
    };
  }, []);

  // Close on Escape
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onDismiss();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onDismiss]);

  // Trap focus inside modal
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    []
  );

  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setDescriptionError('');
      setSubmitError('');

      if (!description.trim()) {
        setDescriptionError('Please describe the issue.');
        return;
      }

      setSubmitting(true);
      try {
        await submitFeedback({
          pageIdentifier,
          description: description.trim(),
          urgency,
          sourcePage: window.location.href,
        });
        setView('success');
      } catch (err) {
        setSubmitError(
          'Something went wrong submitting your feedback. Please try again.'
        );
      } finally {
        setSubmitting(false);
      }
    },
    [description, urgency, pageIdentifier]
  );

  // Backdrop click closes modal
  const handleBackdropClick = React.useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onDismiss();
    },
    [onDismiss]
  );

  return (
    <div
      className={styles.backdrop}
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-modal-title"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.header}>
          <h2 id="feedback-modal-title" className={styles.title}>
            Send Feedback
          </h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onDismiss}
            aria-label="Close feedback form"
          >
            <Icon iconName="Cancel" />
          </button>
        </div>

        {view === 'success' && (
          <div className={styles.successState}>
            <Icon iconName="CompletedSolid" className={styles.successIcon} />
            <p className={styles.successTitle}>Thank you!</p>
            <p className={styles.successMessage}>
              Your feedback has been submitted successfully. Our team will review
              it shortly.
            </p>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={onDismiss}
            >
              Close
            </button>
          </div>
        )}

        {view === 'form' && (
          <form onSubmit={handleSubmit} noValidate>
            {submitError && (
              <div className={styles.errorBanner} role="alert">
                {submitError}
              </div>
            )}

            <div className={styles.fieldGroup}>
              {/* Page Identifier (read-only) */}
              <div className={styles.field}>
                <label className={styles.label} htmlFor="fb-page">
                  Page
                </label>
                <input
                  id="fb-page"
                  type="text"
                  className={styles.input}
                  value={pageIdentifier}
                  readOnly
                  aria-readonly="true"
                />
              </div>

              {/* Description */}
              <div className={styles.field}>
                <label className={styles.label} htmlFor="fb-description">
                  Description of Issue
                  <span className={styles.required} aria-hidden="true">
                    *
                  </span>
                </label>
                <textarea
                  id="fb-description"
                  className={styles.textarea}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (descriptionError) setDescriptionError('');
                  }}
                  aria-required="true"
                  aria-invalid={!!descriptionError}
                  aria-describedby={
                    descriptionError ? 'fb-description-error' : undefined
                  }
                  placeholder="Describe the issue you encountered..."
                />
                {descriptionError && (
                  <span
                    id="fb-description-error"
                    className={styles.fieldError}
                    role="alert"
                  >
                    {descriptionError}
                  </span>
                )}
              </div>

              {/* Urgency */}
              <div className={styles.field}>
                <label className={styles.label} htmlFor="fb-urgency">
                  Urgency
                </label>
                <select
                  id="fb-urgency"
                  className={styles.select}
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                >
                  {URGENCY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={onDismiss}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.btnPrimary}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default FeedbackModal;
