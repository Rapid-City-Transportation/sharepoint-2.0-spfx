import * as React from 'react';
import { IconButton } from '@fluentui/react/lib/Button';
import { Callout, DirectionalHint } from '@fluentui/react/lib/Callout';
import { Icon } from '@fluentui/react/lib/Icon';
import { FocusZone, FocusZoneTabbableElements } from '@fluentui/react/lib/FocusZone';
import styles from './WeatherWidget.module.scss';
import { useWeather } from '../../hooks/useWeather';
import { IOfficeLocation } from '../../services/weatherConfig';

export interface IWeatherWidgetProps {
  /** Override the default office location. */
  office?: IOfficeLocation;
}

export const WeatherWidget: React.FC<IWeatherWidgetProps> = ({ office }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  const {
    weather,
    loading,
    error,
    source,
    geolocationStatus,
    requestCurrentLocation,
    useOfficeLocation,
  } = useWeather(office);

  const toggle = React.useCallback(() => setIsOpen(prev => !prev), []);
  const close = React.useCallback(() => setIsOpen(false), []);

  const inlineTemp = weather ? `${weather.temperatureC}°C` : '';
  const ariaLabel = weather
    ? `Weather, ${weather.temperatureC} degrees, ${weather.conditionLabel}, ${weather.locationLabel}`
    : 'Weather';

  return (
    <div ref={wrapperRef} className={styles.widgetWrapper}>
      <IconButton
        iconProps={{ iconName: weather?.conditionIcon || 'Sunny' }}
        ariaLabel={ariaLabel}
        title={ariaLabel}
        className={styles.widgetButton}
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onRenderText={
          inlineTemp
            ? () => <span className={styles.tempInline}>{inlineTemp}</span>
            : undefined
        }
      />

      {isOpen && (
        <Callout
          target={wrapperRef.current}
          onDismiss={close}
          directionalHint={DirectionalHint.bottomRightEdge}
          isBeakVisible={false}
          gapSpace={6}
          setInitialFocus
          className={styles.callout}
          role="dialog"
          ariaLabel="Weather details"
        >
          <FocusZone
            handleTabKey={FocusZoneTabbableElements.all}
            isCircularNavigation
            className={styles.calloutInner}
          >
            {loading && !weather && (
              <div className={styles.loadingState} role="status" aria-live="polite">
                Loading weather…
              </div>
            )}

            {!loading && !weather && error && (
              <div className={styles.unavailableState} role="alert">
                Weather unavailable.
              </div>
            )}

            {weather && (
              <>
                <h2 className={styles.locationLabel}>{weather.locationLabel}</h2>
                <div className={styles.currentRow}>
                  <Icon
                    iconName={weather.conditionIcon}
                    className={styles.currentIcon}
                    aria-hidden="true"
                  />
                  <div>
                    <div className={styles.currentTemp}>{weather.temperatureC}°C</div>
                    <div className={styles.currentMeta}>
                      <span className={styles.condition}>{weather.conditionLabel}</span>
                      <span>Feels like {weather.apparentTemperatureC}°C</span>
                      <span className={styles.highLow}>
                        H: {weather.highC}° &nbsp;·&nbsp; L: {weather.lowC}°
                      </span>
                    </div>
                  </div>
                </div>
                {error && (
                  <div className={`${styles.statusMessage} ${styles.statusError}`} role="alert">
                    Could not refresh. Last updated {formatFetchedAt(weather.fetchedAt)}.
                  </div>
                )}
              </>
            )}

            <hr className={styles.divider} />

            <div className={styles.actionsRow}>
              {source === 'office' && (
                <button
                  type="button"
                  className={styles.actionLink}
                  onClick={requestCurrentLocation}
                  disabled={geolocationStatus === 'requesting'}
                >
                  {geolocationStatus === 'requesting'
                    ? 'Requesting location…'
                    : 'Use my current location'}
                </button>
              )}

              {source === 'currentLocation' && (
                <button
                  type="button"
                  className={styles.actionLink}
                  onClick={useOfficeLocation}
                  aria-label="Switch back to office weather"
                >
                  Use office location
                </button>
              )}

              {geolocationStatus === 'denied' && (
                <div className={styles.statusMessage} role="status" aria-live="polite">
                  Location access denied. Showing office weather.
                </div>
              )}
              {geolocationStatus === 'unavailable' && (
                <div className={styles.statusMessage} role="status" aria-live="polite">
                  Location is unavailable on this device. Showing office weather.
                </div>
              )}
            </div>
          </FocusZone>
        </Callout>
      )}
    </div>
  );
};

function formatFetchedAt(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const hh = ('0' + d.getHours()).slice(-2);
  const mm = ('0' + d.getMinutes()).slice(-2);
  return `${hh}:${mm}`;
}

export default WeatherWidget;
