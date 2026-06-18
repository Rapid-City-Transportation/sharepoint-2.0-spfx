import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './BannerCarousel.module.scss';
import { useBanners } from '../../hooks/useBanners';

/** One banner slide. Slides are sourced from the Home Banners SharePoint list. */
export interface IBannerSlide {
  id: string;
  title: string;
  subtitle: string;
  iconName: string;
  /** URL or require()'d image module */
  backgroundImage?: string;
  /** CSS gradient for the overlay; keeps contrast on text */
  overlayGradient?: string;
  /** Accessible description of the background image */
  backgroundAlt?: string;
  /** Left-border accent colour */
  accentColor?: string;
  /** If true, hide text overlay and gradient (image already contains text) */
  hideOverlay?: boolean;
}

export const BannerCarousel: React.FC = () => {
  // Slides come straight from the Home Banners list. No hardcoded fallback:
  // if the list is empty or unreachable, the carousel renders nothing.
  const { banners: slides } = useBanners();
  const [activeIndex, setActiveIndex] = React.useState(0);
  const slideCount = slides.length;

  const goTo = React.useCallback(
    (index: number) => {
      setActiveIndex(((index % slideCount) + slideCount) % slideCount);
    },
    [slideCount]
  );

  const goPrev = React.useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);
  const goNext = React.useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      }
    },
    [goPrev, goNext]
  );

  const slide = slides[activeIndex] || slides[0];

  // Nothing to show yet (still loading, empty list, or unreachable).
  if (!slide) return null;

  return (
    <section
      className={styles.carousel}
      aria-roledescription="carousel"
      aria-label="Banner announcements"
      onKeyDown={handleKeyDown}
    >
      {/* ── Slide ────────────────────────────────────────────────────────── */}
      <div
        className={styles.banner}
        role="group"
        aria-roledescription="slide"
        aria-label={`Slide ${activeIndex + 1} of ${slideCount}: ${slide.title}`}
        style={{
          backgroundImage: !slide.hideOverlay && slide.backgroundImage
            ? `url(${slide.backgroundImage})`
            : 'none',
          borderLeftColor: slide.accentColor || 'var(--rct-brand-gold)',
          ['--banner-img']: slide.hideOverlay && slide.backgroundImage
            ? `url("${slide.backgroundImage}")`
            : undefined,
        } as React.CSSProperties}
      >
        {slide.hideOverlay && slide.backgroundImage && (
          <img
            className={styles.bannerImg}
            src={slide.backgroundImage}
            alt={slide.backgroundAlt || slide.title}
          />
        )}

        {!slide.hideOverlay && (
          <div
            className={styles.bannerOverlay}
            aria-hidden="true"
            style={{
              background: slide.overlayGradient,
            }}
          />
        )}

        {!slide.hideOverlay && (
          <div className={styles.card}>
            <div className={styles.headerRow}>
              <Icon
                iconName={slide.iconName}
                className={styles.icon}
                aria-hidden="true"
              />
              <h2 className={styles.title}>{slide.title}</h2>
            </div>
            <p className={styles.subtitle}>{slide.subtitle}</p>
          </div>
        )}

        {/* ── Prev / Next arrows ──────────────────────────────────────── */}
        <button
          type="button"
          className={`${styles.arrow} ${styles.arrowLeft}`}
          onClick={goPrev}
          aria-label="Previous slide"
        >
          <Icon iconName="ChevronLeft" />
        </button>
        <button
          type="button"
          className={`${styles.arrow} ${styles.arrowRight}`}
          onClick={goNext}
          aria-label="Next slide"
        >
          <Icon iconName="ChevronRight" />
        </button>
      </div>

      {/* ── Dot indicators ───────────────────────────────────────────── */}
      <div className={styles.dots} role="tablist" aria-label="Banner slides">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={i === activeIndex}
            aria-label={`Go to slide ${i + 1}: ${s.title}`}
            className={`${styles.dot} ${i === activeIndex ? styles.dotActive : ''}`}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </section>
  );
};

export default BannerCarousel;
