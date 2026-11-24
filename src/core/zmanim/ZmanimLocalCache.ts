/**
 * Durable local cache of extended zmanim for today ±7 days.
 * Survives offline / app restarts; invalidated when location moves meaningfully.
 */

import type { LocationObject } from 'expo-location';
import type { ExtendedZmanim } from '../../types/calendar';
import { ZmanimService } from './ZmanimService';

const CACHE_KEY = 'zmanim_local_cache_v1';
const WINDOW_DAYS = 7;

type SerializedDate = string | null;

type SerializedExtendedZmanim = {
  [K in keyof ExtendedZmanim]: ExtendedZmanim[K] extends Date | null
    ? SerializedDate
    : ExtendedZmanim[K];
};

interface ZmanimCachePayload {
  locationKey: string;
  centerDate: string;
  days: Record<string, SerializedExtendedZmanim>;
  updatedAt: string;
}

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** ~100m stability so tiny GPS jitter does not bust the cache. */
function locationKey(lat: number, lon: number): string {
  return `${lat.toFixed(3)},${lon.toFixed(3)}`;
}

function serializeZmanim(z: ExtendedZmanim): SerializedExtendedZmanim {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(z)) {
    if (value instanceof Date) {
      out[key] = value.toISOString();
    } else if (value === null || value === undefined) {
      out[key] = value ?? null;
    } else {
      out[key] = value;
    }
  }
  return out as SerializedExtendedZmanim;
}

function hydrateZmanim(raw: SerializedExtendedZmanim): ExtendedZmanim {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      const d = new Date(value);
      out[key] = Number.isNaN(d.getTime()) ? null : d;
    } else {
      out[key] = value;
    }
  }
  return out as ExtendedZmanim;
}

function toLocationObject(
  location: { latitude: number; longitude: number; altitude?: number | null } | LocationObject
): LocationObject {
  if ('coords' in location) return location;
  return {
    coords: {
      latitude: location.latitude,
      longitude: location.longitude,
      altitude: location.altitude ?? null,
      accuracy: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: Date.now(),
  } as LocationObject;
}

async function readPayload(): Promise<ZmanimCachePayload | null> {
  try {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ZmanimCachePayload;
    if (!parsed?.locationKey || !parsed?.days) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writePayload(payload: ZmanimCachePayload): Promise<void> {
  try {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {}
}

export class ZmanimLocalCache {
  private static warming: Promise<void> | null = null;

  /** Whether `date` falls inside the ±WINDOW_DAYS window around `center`. */
  static isInWindow(date: Date, center: Date = new Date()): boolean {
    const a = startOfLocalDay(date).getTime();
    const c = startOfLocalDay(center).getTime();
    const delta = Math.abs(a - c) / (24 * 60 * 60 * 1000);
    return delta <= WINDOW_DAYS;
  }

  /**
   * Read cached zmanim for a calendar day if location matches and entry exists.
   */
  static async get(
    date: Date,
    location: { latitude: number; longitude: number } | LocationObject | null
  ): Promise<ExtendedZmanim | null> {
    if (!location) return null;
    const coords =
      'coords' in location
        ? { latitude: location.coords.latitude, longitude: location.coords.longitude }
        : location;
    const payload = await readPayload();
    if (!payload) return null;
    if (payload.locationKey !== locationKey(coords.latitude, coords.longitude)) return null;
    const entry = payload.days[dateKey(date)];
    if (!entry) return null;
    return hydrateZmanim(entry);
  }

  /**
   * Prefetch and persist today ±7 days for the given location.
   * Safe to call often; concurrent calls share one in-flight warm.
   */
  static async warm(
    location: { latitude: number; longitude: number; altitude?: number | null } | LocationObject | null,
    centerDate: Date = new Date()
  ): Promise<void> {
    if (!location) return;
    if (this.warming) {
      await this.warming;
      return;
    }

    this.warming = this.doWarm(location, centerDate).finally(() => {
      this.warming = null;
    });
    await this.warming;
  }

  private static async doWarm(
    location: { latitude: number; longitude: number; altitude?: number | null } | LocationObject,
    centerDate: Date
  ): Promise<void> {
    const loc = toLocationObject(location);
    const lat = loc.coords.latitude;
    const lon = loc.coords.longitude;
    const key = locationKey(lat, lon);
    const center = startOfLocalDay(centerDate);
    const centerStr = dateKey(center);

    const existing = await readPayload();
    // Skip recompute if same location + same calendar day already warmed.
    if (
      existing &&
      existing.locationKey === key &&
      existing.centerDate === centerStr &&
      Object.keys(existing.days).length >= WINDOW_DAYS * 2 + 1
    ) {
      return;
    }

    const days: Record<string, SerializedExtendedZmanim> = {};
    for (let offset = -WINDOW_DAYS; offset <= WINDOW_DAYS; offset++) {
      const day = addDays(center, offset);
      const zmanim = await ZmanimService.calculateExtendedZmanim(day, loc);
      days[dateKey(day)] = serializeZmanim(zmanim);
    }

    await writePayload({
      locationKey: key,
      centerDate: centerStr,
      days,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Cache-first lookup for calendar: hit local window, otherwise calculate.
   * If the day is in-window and missing (stale/partial cache), store it.
   */
  static async getOrCalculate(
    date: Date,
    location: { latitude: number; longitude: number; altitude?: number | null } | LocationObject | null
  ): Promise<ExtendedZmanim> {
    const cached = await this.get(date, location);
    if (cached) return cached;

    const loc = location ? toLocationObject(location) : null;
    const zmanim = await ZmanimService.calculateExtendedZmanim(date, loc);

    if (location && this.isInWindow(date)) {
      try {
        const coords =
          'coords' in location
            ? { latitude: location.coords.latitude, longitude: location.coords.longitude }
            : location;
        const payload = (await readPayload()) ?? {
          locationKey: locationKey(coords.latitude, coords.longitude),
          centerDate: dateKey(new Date()),
          days: {},
          updatedAt: new Date().toISOString(),
        };
        if (payload.locationKey === locationKey(coords.latitude, coords.longitude)) {
          payload.days[dateKey(date)] = serializeZmanim(zmanim);
          payload.updatedAt = new Date().toISOString();
          await writePayload(payload);
        }
      } catch {}
    }

    return zmanim;
  }

  static async clear(): Promise<void> {
    try {
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      await AsyncStorage.removeItem(CACHE_KEY);
    } catch {}
  }
}
