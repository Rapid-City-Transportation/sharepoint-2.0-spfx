import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './DailyHighlight.module.scss';

const bannerImage = require('../../assets/SP Banner.png');

const DEFAULT_HIGHLIGHT_TITLE = 'Prepare to Launch: Welcome to Testing';
const DEFAULT_HIGHLIGHT_SUBTITLE = 'RCT Intranet — Mission Ready. Your new hub is preparing for liftoff!';

export interface IDailyHighlightProps {
  /** Optional title override */
  title?: string;
  /** Optional subtitle/description */
  subtitle?: string;
}

export const DailyHighlight: React.FC<IDailyHighlightProps> = (props) => {
  const title = props.title ?? DEFAULT_HIGHLIGHT_TITLE;
  const subtitle = props.subtitle ?? DEFAULT_HIGHLIGHT_SUBTITLE;

  return (
    <section
      className={styles.highlight}
      aria-labelledby="daily-highlight-title"
    >
      <div
        className={styles.banner}
        role="img"
        aria-label="Space themed banner with Earth horizon and rocket trajectory"
        style={{ backgroundImage: `url(${bannerImage})` }}
      >
        <div className={styles.bannerOverlay} aria-hidden="true" />
        <div className={styles.card}>
          <div className={styles.headerRow}>
            <Icon
              iconName="Rocket"
              className={styles.icon}
              aria-hidden="true"
            />
            <h2 id="daily-highlight-title" className={styles.title}>
              {title}
            </h2>
          </div>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
      </div>
    </section>
  );
};

export default DailyHighlight;
