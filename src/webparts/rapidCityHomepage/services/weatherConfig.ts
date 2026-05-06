/**
 * Default office location for the navbar weather widget.
 * Override per web part via property pane in the future if multiple offices are added.
 */
export interface IOfficeLocation {
  lat: number;
  lon: number;
  label: string;
}

export const DEFAULT_OFFICE_LOCATION: IOfficeLocation = {
  lat: 43.84,
  lon: -79.09,
  label: 'Pickering, ON',
};

/** Cache TTL for fetched weather payloads (sessionStorage). */
export const WEATHER_CACHE_TTL_MS = 30 * 60 * 1000;

/** Coordinate rounding precision (decimal places). ~1km at typical latitudes. */
export const COORD_PRECISION = 2;

/** localStorage key for the user's location preference. */
export const LOCATION_PREF_STORAGE_KEY = 'rct.weatherWidget.preference';

/** sessionStorage key prefix for cached weather payloads. */
export const WEATHER_CACHE_KEY_PREFIX = 'rct.weatherWidget.cache:';
