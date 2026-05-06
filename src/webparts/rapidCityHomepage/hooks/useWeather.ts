import * as React from 'react';
import { fetchWeather, IWeatherData, roundCoord } from '../services/weatherService';
import {
  DEFAULT_OFFICE_LOCATION,
  IOfficeLocation,
  LOCATION_PREF_STORAGE_KEY,
} from '../services/weatherConfig';

export type LocationSource = 'office' | 'currentLocation';

export type GeolocationStatus =
  | 'idle'
  | 'requesting'
  | 'denied'
  | 'unavailable';

interface IStoredPreference {
  mode: LocationSource;
  /** Only set when mode === 'currentLocation'. Coordinates are rounded for privacy. */
  lat?: number;
  lon?: number;
  label?: string;
}

export interface IUseWeatherResult {
  weather: IWeatherData | null;
  loading: boolean;
  error: string | null;
  /** Which location is currently being shown. */
  source: LocationSource;
  /** Status of the most recent geolocation request, if any. */
  geolocationStatus: GeolocationStatus;
  /** Triggers a browser geolocation prompt and switches to current-location weather. */
  requestCurrentLocation: () => void;
  /** Switches back to office weather, clears the saved current-location preference. */
  useOfficeLocation: () => void;
  /** Force-refresh the current view (bypasses cache). */
  refresh: () => void;
}

function readPreference(): IStoredPreference {
  try {
    const raw = localStorage.getItem(LOCATION_PREF_STORAGE_KEY);
    if (!raw) return { mode: 'office' };
    const parsed = JSON.parse(raw) as IStoredPreference;
    if (parsed?.mode === 'currentLocation' && typeof parsed.lat === 'number' && typeof parsed.lon === 'number') {
      return parsed;
    }
    return { mode: 'office' };
  } catch {
    return { mode: 'office' };
  }
}

function writePreference(pref: IStoredPreference): void {
  try {
    localStorage.setItem(LOCATION_PREF_STORAGE_KEY, JSON.stringify(pref));
  } catch {
    // localStorage might be unavailable — fail silently
  }
}

/** Manages weather state, location preference, and geolocation flow.
 *  No browser permission prompt fires until requestCurrentLocation() is called. */
export function useWeather(office: IOfficeLocation = DEFAULT_OFFICE_LOCATION): IUseWeatherResult {
  const [weather, setWeather] = React.useState<IWeatherData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [source, setSource] = React.useState<LocationSource>('office');
  const [geolocationStatus, setGeolocationStatus] = React.useState<GeolocationStatus>('idle');

  const mountedRef = React.useRef(true);
  React.useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const loadFor = React.useCallback(
    async (lat: number, lon: number, label: string, src: LocationSource, force = false): Promise<void> => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchWeather(lat, lon, label, force);
        if (mountedRef.current) {
          setWeather(data);
          setSource(src);
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : 'Weather unavailable.');
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    []
  );

  // Initial load: respect stored preference, but never trigger a permission prompt.
  // If the user previously opted into current location, we already have their (rounded)
  // coordinates in localStorage and can fetch directly without re-prompting.
  React.useEffect(() => {
    const pref = readPreference();
    if (pref.mode === 'currentLocation' && typeof pref.lat === 'number' && typeof pref.lon === 'number') {
      loadFor(pref.lat, pref.lon, pref.label || 'Your location', 'currentLocation').catch(() => {});
    } else {
      loadFor(office.lat, office.lon, office.label, 'office').catch(() => {});
    }
  }, [office.lat, office.lon, office.label, loadFor]);

  const requestCurrentLocation = React.useCallback((): void => {
    if (!('geolocation' in navigator)) {
      setGeolocationStatus('unavailable');
      return;
    }
    setGeolocationStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!mountedRef.current) return;
        const lat = roundCoord(position.coords.latitude);
        const lon = roundCoord(position.coords.longitude);
        const label = 'Your location';
        setGeolocationStatus('idle');
        writePreference({ mode: 'currentLocation', lat, lon, label });
        loadFor(lat, lon, label, 'currentLocation').catch(() => {});
      },
      (err) => {
        if (!mountedRef.current) return;
        if (err.code === err.PERMISSION_DENIED) {
          setGeolocationStatus('denied');
        } else {
          setGeolocationStatus('unavailable');
        }
        // Stay on whatever we were showing (likely office weather).
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  }, [loadFor]);

  const useOfficeLocation = React.useCallback((): void => {
    writePreference({ mode: 'office' });
    setGeolocationStatus('idle');
    loadFor(office.lat, office.lon, office.label, 'office').catch(() => {});
  }, [office.lat, office.lon, office.label, loadFor]);

  const refresh = React.useCallback((): void => {
    if (!weather) return;
    loadFor(weather.lat, weather.lon, weather.locationLabel, source, true).catch(() => {});
  }, [weather, source, loadFor]);

  return {
    weather,
    loading,
    error,
    source,
    geolocationStatus,
    requestCurrentLocation,
    useOfficeLocation,
    refresh,
  };
}
