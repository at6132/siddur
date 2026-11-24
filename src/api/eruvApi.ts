/**
 * US Eruv listings via Railway analytics-api only.
 * External status sources are aggregated on the server; the app caches locally.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type EruvStatus = 'up' | 'down' | 'unknown' | 'awaiting';

export type EruvGeometry =
  | { type: 'Polygon'; coordinates: number[][][] }
  | { type: 'MultiPolygon'; coordinates: number[][][][] };

export type EruvListing = {
  id: string;
  name: string;
  city: string;
  state: string;
  country: 'US' | string;
  areaLabel: string;
  status: EruvStatus;
  statusUpdatedAt: string | null;
  statusSourceUrl: string | null;
  statusHotline: string | null;
  mapUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  /** True when Railway last fetched status successfully from a live provider. */
  statusLive: boolean;
  /** Exact boundary available (GeoJSON). */
  hasExactBoundary?: boolean;
  geometry?: EruvGeometry | null;
  boundarySourceUrl?: string | null;
};

const CACHE_KEY = '@siddur/eruv_us_v5';
const CACHE_TTL_MS = 15 * 60 * 1000;

type CachePayload = {
  savedAt: number;
  disclaimer: string | null;
  eruvs: EruvListing[];
};

async function getBaseUrl(): Promise<string | null> {
  try {
    const { default: Constants } = await import('expo-constants');
    const extra = (Constants.expoConfig as any)?.extra;
    const u =
      (typeof extra?.analyticsUrl === 'string' && extra.analyticsUrl) ||
      (typeof process !== 'undefined' && (process as any).env?.EXPO_PUBLIC_ANALYTICS_URL);
    if (typeof u === 'string' && u.length > 0) return u.replace(/\/$/, '');
  } catch {}
  return null;
}

function normalizeListing(raw: any): EruvListing {
  const status = (['up', 'down', 'awaiting', 'unknown'] as EruvStatus[]).includes(raw?.status)
    ? (raw.status as EruvStatus)
    : 'unknown';
  const geometry =
    raw?.geometry?.type === 'Polygon' || raw?.geometry?.type === 'MultiPolygon'
      ? (raw.geometry as EruvGeometry)
      : null;
  return {
    id: String(raw?.id ?? ''),
    name: String(raw?.name ?? ''),
    city: String(raw?.city ?? ''),
    state: String(raw?.state ?? ''),
    country: String(raw?.country ?? 'US'),
    areaLabel: String(raw?.areaLabel ?? ''),
    status,
    statusUpdatedAt: raw?.statusUpdatedAt ?? null,
    statusSourceUrl: raw?.statusSourceUrl ?? null,
    statusHotline: raw?.statusHotline ?? null,
    mapUrl: raw?.mapUrl ?? null,
    latitude: typeof raw?.latitude === 'number' ? raw.latitude : null,
    longitude: typeof raw?.longitude === 'number' ? raw.longitude : null,
    statusLive: Boolean(raw?.statusLive),
    hasExactBoundary: Boolean(raw?.hasExactBoundary || geometry),
    geometry,
    boundarySourceUrl: raw?.boundarySourceUrl ?? null,
  };
}

async function readCache(): Promise<CachePayload | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachePayload;
    if (!parsed || !Array.isArray(parsed.eruvs)) return null;
    return {
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : 0,
      disclaimer: parsed.disclaimer ?? null,
      eruvs: parsed.eruvs.map(normalizeListing).filter((e) => e.id),
    };
  } catch {
    return null;
  }
}

async function writeCache(eruvs: EruvListing[], disclaimer: string | null): Promise<void> {
  const payload: CachePayload = {
    savedAt: Date.now(),
    disclaimer,
    eruvs,
  };
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore cache write failures
  }
}

async function fetchFromBackend(): Promise<{ eruvs: EruvListing[]; disclaimer: string | null }> {
  const base = await getBaseUrl();
  if (!base) throw new Error('Analytics URL not configured');
  const res = await fetch(`${base}/api/eruvs?country=US&includeGeometry=1`);
  if (!res.ok) throw new Error(`Eruv API HTTP ${res.status}`);
  const body = await res.json();
  const eruvs = Array.isArray(body?.eruvs) ? body.eruvs.map(normalizeListing).filter((e: EruvListing) => e.id) : [];
  const disclaimer = typeof body?.disclaimer === 'string' ? body.disclaimer : null;
  return { eruvs, disclaimer };
}

/**
 * List US eruvin from Railway. Serves cache when fresh or when offline;
 * revalidates against the backend when the soft TTL expires.
 * Pass `{ force: true }` (e.g. pull-to-refresh) to bypass TTL.
 */
export async function fetchUsEruvs(options?: { force?: boolean }): Promise<EruvListing[]> {
  const cached = await readCache();
  const fresh = cached && Date.now() - cached.savedAt < CACHE_TTL_MS;

  if (!options?.force && fresh && cached) {
    return cached.eruvs;
  }

  try {
    const { eruvs, disclaimer } = await fetchFromBackend();
    await writeCache(eruvs, disclaimer);
    return eruvs;
  } catch (e) {
    if (cached?.eruvs?.length) return cached.eruvs;
    throw e;
  }
}

export async function fetchEruvById(id: string): Promise<EruvListing | null> {
  if (!id) return null;

  const cached = await readCache();
  const fromCache = cached?.eruvs.find((e) => e.id === id) ?? null;

  try {
    const base = await getBaseUrl();
    if (!base) {
      if (fromCache) return fromCache;
      throw new Error('Analytics URL not configured');
    }
    const res = await fetch(`${base}/api/eruvs/${encodeURIComponent(id)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Eruv API HTTP ${res.status}`);
    const body = await res.json();
    const eruv = body?.eruv ? normalizeListing(body.eruv) : null;
    if (eruv && cached) {
      const next = cached.eruvs.filter((e) => e.id !== eruv.id).concat(eruv);
      await writeCache(next, cached.disclaimer);
    }
    return eruv;
  } catch (e) {
    if (fromCache) return fromCache;
    throw e;
  }
}

export async function getCachedEruvDisclaimer(): Promise<string | null> {
  const cached = await readCache();
  return cached?.disclaimer ?? null;
}
