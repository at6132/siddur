/**
 * Analytics client: track(name, props), queue, flush to backend.
 * Idempotent events via event_uuid; no PII in payloads.
 */

import type { AnalyticsEvent } from './types';
import { EVENT_SCHEMA_VERSION, RELIABILITY_EVENTS } from './types';
import { getIdentity } from './IdentityService';
import { buildCommonContext } from './context';

const QUEUE_KEY = 'analytics_event_queue';
const MAX_QUEUE = 100;
const FLUSH_BATCH = 20;

function eventUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let queue: Record<string, unknown>[] = [];
let currentScreen: string | null = null;
let lastScreenName: string | null = null;
let lastScreenAt: number = 0;

export function setCurrentScreen(screen: string | null): void {
  currentScreen = screen;
}

/** For screen_view: get previous screen and time on it, then set current to newScreen */
export function getPreviousScreenInfo(newScreen: string | null): { previous_screen: string | null; time_on_previous_screen_ms: number } {
  const now = Date.now();
  const timeOnPrevious = lastScreenAt > 0 ? now - lastScreenAt : 0;
  const prev = lastScreenName;
  lastScreenName = newScreen;
  lastScreenAt = now;
  currentScreen = newScreen;
  return { previous_screen: prev, time_on_previous_screen_ms: timeOnPrevious };
}

export function getCurrentScreen(): string | null {
  return currentScreen;
}

/** Track an event; adds common fields and queues for flush */
export async function track(
  event_name: string,
  properties: Record<string, unknown> = {}
): Promise<void> {
  try {
    const identity = await getIdentity();
    const common = await buildCommonContext({
      anonymous_id: identity.anonymous_id,
      user_id: identity.user_id,
      session_id: identity.session_id,
      screen_name: currentScreen,
    });
    const event: AnalyticsEvent = {
      ...common,
      event_name,
      event_time_utc: new Date().toISOString(),
      event_uuid: eventUuid(),
      event_schema_version: EVENT_SCHEMA_VERSION,
      ...properties,
    };
    queue.push(event as Record<string, unknown>);
    if (queue.length >= FLUSH_BATCH) {
      await flush();
    }
  } catch (e) {
    console.warn('[Analytics] track failed:', e);
  }
}

async function getStoredQueue(): Promise<Record<string, unknown>[]> {
  try {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, unknown>[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function setStoredQueue(items: Record<string, unknown>[]): Promise<void> {
  try {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-MAX_QUEUE)));
  } catch {}
}

/** Flush in-memory queue to backend and persist remainder */
export async function flush(): Promise<void> {
  if (queue.length === 0) return;
  const toSend = queue.splice(0, FLUSH_BATCH);
  const endpoint = await getEndpoint();
  if (endpoint) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: toSend }),
      });
      if (!res.ok) {
        queue.unshift(...toSend);
        await persistQueue();
        track(RELIABILITY_EVENTS.API_ERROR, {
          endpoint: endpoint ?? '/api/events',
          method: 'POST',
          status_code: res.status,
          retry_count: 0,
        }).catch(() => {});
        return;
      }
    } catch (err) {
      queue.unshift(...toSend);
      await persistQueue();
      track(RELIABILITY_EVENTS.API_ERROR, {
        endpoint: endpoint ?? '/api/events',
        method: 'POST',
        status_code: 0,
        error_code: err instanceof Error ? err.message : 'network_error',
        retry_count: 0,
      }).catch(() => {});
      return;
    }
  }
  await persistQueue();
}

async function persistQueue(): Promise<void> {
  const existing = await getStoredQueue();
  const combined = [...existing, ...queue].slice(-MAX_QUEUE);
  await setStoredQueue(combined);
  queue = [];
}

/** Load persisted queue into memory and flush */
export async function loadAndFlush(): Promise<void> {
  const stored = await getStoredQueue();
  if (stored.length > 0) {
    queue = [...stored];
    await setStoredQueue([]);
  }
  await flush();
}

export async function getEndpoint(): Promise<string | null> {
  try {
    const { default: Constants } = await import('expo-constants');
    const extra = (Constants.expoConfig as any)?.extra;
    const u =
      (typeof extra?.analyticsUrl === 'string' && extra.analyticsUrl) ||
      (typeof process !== 'undefined' && (process as any).env?.EXPO_PUBLIC_ANALYTICS_URL) ||
      (typeof process !== 'undefined' && (process as any).env?.REACT_APP_ANALYTICS_URL) ||
      (typeof global !== 'undefined' && (global as any).__ANALYTICS_URL__);
    if (typeof u === 'string' && u.length > 0) {
      const base = u.replace(/\/$/, '');
      return `${base}/api/events`;
    }
  } catch {}
  return null;
}

export const Analytics = {
  track,
  flush,
  loadAndFlush,
  setCurrentScreen,
  getCurrentScreen,
};
