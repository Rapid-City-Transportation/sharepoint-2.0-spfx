import {
  COORD_PRECISION,
  WEATHER_CACHE_KEY_PREFIX,
  WEATHER_CACHE_TTL_MS,
} from './weatherConfig';

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

export interface IWeatherData {
  /** Display label for the location (city name or "Office"). */
  locationLabel: string;
  /** Coordinates the data was fetched for. */
  lat: number;
  lon: number;
  /** Current temperature in °C, rounded to whole number. */
  temperatureC: number;
  /** Apparent (feels-like) temperature in °C. */
  apparentTemperatureC: number;
  /** Today's high in °C. */
  highC: number;
  /** Today's low in °C. */
  lowC: number;
  /** WMO weather code — see getCondition() for mapping. */
  weatherCode: number;
  /** Whether it's daytime (affects icon choice). */
  isDay: boolean;
  /** Friendly condition label (e.g., "Partly cloudy"). */
  conditionLabel: string;
  /** Fluent UI icon name matching the condition. */
  conditionIcon: string;
  /** ISO timestamp when the data was fetched (not when the API observed). */
  fetchedAt: string;
}

interface ICachedWeather {
  fetchedAt: number;
  data: IWeatherData;
}

/** Round a coordinate to the configured precision (default 2 decimals = ~1km). */
export function roundCoord(value: number): number {
  const factor = Math.pow(10, COORD_PRECISION);
  return Math.round(value * factor) / factor;
}

function cacheKey(lat: number, lon: number): string {
  return `${WEATHER_CACHE_KEY_PREFIX}${roundCoord(lat)}:${roundCoord(lon)}`;
}

function readCache(lat: number, lon: number): ICachedWeather | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(lat, lon));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ICachedWeather;
    if (typeof parsed?.fetchedAt !== 'number' || !parsed.data) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(lat: number, lon: number, data: IWeatherData): void {
  try {
    const payload: ICachedWeather = { fetchedAt: Date.now(), data };
    sessionStorage.setItem(cacheKey(lat, lon), JSON.stringify(payload));
  } catch {
    // sessionStorage might be unavailable (private mode etc.) — fail silently
  }
}

/** Fetch current weather for a coordinate. Uses sessionStorage cache (30 min TTL).
 *  If the network call fails but a stale cache exists, returns the stale data
 *  rather than throwing — caller can detect staleness via fetchedAt. */
export async function fetchWeather(
  lat: number,
  lon: number,
  locationLabel: string,
  forceRefresh = false
): Promise<IWeatherData> {
  const cached = readCache(lat, lon);
  if (!forceRefresh && cached && Date.now() - cached.fetchedAt < WEATHER_CACHE_TTL_MS) {
    return { ...cached.data, locationLabel };
  }

  const url = new URL(OPEN_METEO_URL);
  url.searchParams.set('latitude', String(roundCoord(lat)));
  url.searchParams.set('longitude', String(roundCoord(lon)));
  url.searchParams.set(
    'current',
    'temperature_2m,apparent_temperature,weather_code,is_day'
  );
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('temperature_unit', 'celsius');

  let response: Response;
  try {
    response = await fetch(url.toString());
  } catch (err) {
    // Network failure — return stale cache if any, else rethrow
    if (cached) return { ...cached.data, locationLabel };
    throw new Error('Weather service unreachable.');
  }

  if (!response.ok) {
    if (cached) return { ...cached.data, locationLabel };
    throw new Error(`Weather API returned ${response.status}.`);
  }

  const json = await response.json();
  const current = json?.current ?? {};
  const daily = json?.daily ?? {};
  const code = Number(current.weather_code ?? -1);
  const isDay = current.is_day === 1;
  const condition = getCondition(code, isDay);

  const data: IWeatherData = {
    locationLabel,
    lat,
    lon,
    temperatureC: Math.round(Number(current.temperature_2m ?? 0)),
    apparentTemperatureC: Math.round(Number(current.apparent_temperature ?? 0)),
    highC: Math.round(Number(daily?.temperature_2m_max?.[0] ?? 0)),
    lowC: Math.round(Number(daily?.temperature_2m_min?.[0] ?? 0)),
    weatherCode: code,
    isDay,
    conditionLabel: condition.label,
    conditionIcon: condition.icon,
    fetchedAt: new Date().toISOString(),
  };

  writeCache(lat, lon, data);
  return data;
}

/** Map WMO weather code to a friendly label and Fluent UI icon name. */
function getCondition(code: number, isDay: boolean): { label: string; icon: string } {
  if (code === 0) return { label: 'Clear sky', icon: isDay ? 'Sunny' : 'ClearNight' };
  if (code === 1) return { label: 'Mainly clear', icon: isDay ? 'PartlyCloudyDay' : 'PartlyCloudyNight' };
  if (code === 2) return { label: 'Partly cloudy', icon: isDay ? 'PartlyCloudyDay' : 'PartlyCloudyNight' };
  if (code === 3) return { label: 'Overcast', icon: 'Cloudy' };
  if (code === 45 || code === 48) return { label: 'Fog', icon: 'Fog' };
  if (code === 51 || code === 53 || code === 55) return { label: 'Drizzle', icon: 'Rain' };
  if (code === 56 || code === 57) return { label: 'Freezing drizzle', icon: 'Rain' };
  if (code === 61 || code === 63 || code === 65) return { label: 'Rain', icon: 'Rain' };
  if (code === 66 || code === 67) return { label: 'Freezing rain', icon: 'Rain' };
  if (code === 71 || code === 73 || code === 75) return { label: 'Snow', icon: 'Snow' };
  if (code === 77) return { label: 'Snow grains', icon: 'Snow' };
  if (code === 80 || code === 81 || code === 82) return { label: 'Rain showers', icon: 'Rain' };
  if (code === 85 || code === 86) return { label: 'Snow showers', icon: 'Snow' };
  if (code === 95) return { label: 'Thunderstorm', icon: 'Thunderstorms' };
  if (code === 96 || code === 99) return { label: 'Thunderstorm with hail', icon: 'Thunderstorms' };
  return { label: 'Unknown', icon: 'Cloudy' };
}
