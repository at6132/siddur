/**
 * Analytics client with durable offline cache.
 * Events persist to AsyncStorage immediately; flush when online / on reconnect.
 * Idempotent via event_uuid; no PII in payloads.
 */

import type { AnalyticsEvent } from './types';
import { EVENT_SCHEMA_VERSION, RELIABILITY_EVENTS } from './types';
import { getIdentity } from './IdentityService';
import { buildCommonContext } from './context';

const QUEUE_KEY = 'analytics_event_queue';
const MAX_QUEUE = 500;
const FLUSH_BATCH = 20;
const PERIODIC_FLUSH_MS = 30_000;

function eventUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** In-memory mirror of the durable queue (source of truth is AsyncStorage). */
let queue: Record<string, unknown>[] = [];
let queueLoaded = false;
let queueLoadPromise: Promise<void> | null = null;
let flushing = false;
let syncStarted = false;
let wasOffline = false;
let networkSubscription: { remove: () => void } | null = null;
let periodicTimer: ReturnType<typeof setInterval> | null = null;

let currentScreen: string | null = null;
let lastScreenName: string | null = null;
let lastScreenAt: number = 0;

export function setCurrentScreen(screen: string | null): void {
  currentScreen = screen;
}

/** For screen_view: get previous screen and time on it, then set current to newScreen */
export function getPreviousScreenInfo(newScreen: string | null): {
  previous_screen: string | null;
  time_on_previous_screen_ms: number;
} {
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

/** Ensure durable queue is loaded into memory once. */
async function ensureQueueLoaded(): Promise<void> {
  if (queueLoaded) return;
  if (queueLoadPromise) {
    await queueLoadPromise;
    return;
  }
  queueLoadPromise = (async () => {
    const stored = await getStoredQueue();
    if (stored.length > 0) {
      const seen = new Set(queue.map((e) => String(e.event_uuid ?? '')));
      for (const item of stored) {
        const id = String(item.event_uuid ?? '');
        if (id && seen.has(id)) continue;
        queue.push(item);
        if (id) seen.add(id);
      }
      if (queue.length > MAX_QUEUE) {
        queue = queue.slice(-MAX_QUEUE);
      }
    }
    queueLoaded = true;
  })();
  try {
    await queueLoadPromise;
  } finally {
    queueLoadPromise = null;
  }
}

async function persistQueue(): Promise<void> {
  await setStoredQueue(queue);
}

async function isOnline(): Promise<boolean> {
  try {
    const Network = await import('expo-network');
    const state = await Network.getNetworkStateAsync();
    if (state.isConnected === false) return false;
    if (state.isInternetReachable === false) return false;
    return true;
  } catch {
    // If we cannot probe, still attempt flush (fetch will fail and re-queue).
    return true;
  }
}

/** Track an event; persists locally immediately, then flushes when online. */
export async function track(
  event_name: string,
  properties: Record<string, unknown> = {}
): Promise<void> {
  try {
    await ensureQueueLoaded();
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
    if (queue.length > MAX_QUEUE) {
      queue = queue.slice(-MAX_QUEUE);
    }
    await persistQueue();

    if (queue.length >= FLUSH_BATCH && (await isOnline())) {
      await flush();
    }
  } catch (e) {
    console.warn('[Analytics] track failed:', e);
  }
}

/**
 * Flush durable queue to backend in batches.
 * On network/HTTP failure, remaining events stay cached for later sync.
 */
export async function flush(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    await ensureQueueLoaded();
    if (queue.length === 0) return;

    const endpoint = await getEndpoint();
    if (!endpoint) {
      // No endpoint configured; keep events cached locally.
      await persistQueue();
      return;
    }

    if (!(await isOnline())) {
      wasOffline = true;
      await persistQueue();
      return;
    }

    while (queue.length > 0) {
      const toSend = queue.slice(0, FLUSH_BATCH);
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events: toSend }),
        });
        if (!res.ok) {
          await persistQueue();
          // HTTP errors only (not offline) — avoid recursive flood while disconnected.
          queueReliabilityError(endpoint, res.status, `http_${res.status}`);
          return;
        }
        const sentIds = new Set(
          toSend.map((e) => String(e.event_uuid ?? '')).filter(Boolean)
        );
        queue = queue.filter((e) => !sentIds.has(String(e.event_uuid ?? '')));
        // Drop any without uuid that were in this batch (shouldn't happen).
        if (sentIds.size === 0) {
          queue = queue.slice(toSend.length);
        }
        await persistQueue();
      } catch (err) {
        wasOffline = true;
        await persistQueue();
        // Network failure: keep cache; do not enqueue api_error (expected offline).
        if (__DEV__) {
          console.warn(
            '[Analytics] flush deferred (offline/network):',
            err instanceof Error ? err.message : err
          );
        }
        return;
      }
    }
  } finally {
    flushing = false;
  }
}

function queueReliabilityError(
  endpoint: string,
  statusCode: number,
  errorCode: string
): void {
  // Fire-and-forget; track itself persists. Skip if we somehow recurse during flush.
  if (flushing) {
    // Defer until after current flush ends so we don't interleave.
    setTimeout(() => {
      track(RELIABILITY_EVENTS.API_ERROR, {
        endpoint: endpoint ?? '/api/events',
        method: 'POST',
        status_code: statusCode,
        error_code: errorCode,
        retry_count: 0,
      }).catch(() => {});
    }, 0);
    return;
  }
  track(RELIABILITY_EVENTS.API_ERROR, {
    endpoint: endpoint ?? '/api/events',
    method: 'POST',
    status_code: statusCode,
    error_code: errorCode,
    retry_count: 0,
  }).catch(() => {});
}

/** Load persisted queue into memory and flush if online. */
export async function loadAndFlush(): Promise<void> {
  queueLoaded = false;
  queueLoadPromise = null;
  await ensureQueueLoaded();
  await flush();
}

/**
 * Start offline sync: load cache, flush if online, listen for reconnect + periodic flush.
 * Safe to call once from lifecycle bootstrap.
 */
export async function startOfflineSync(): Promise<void> {
  if (syncStarted) {
    await loadAndFlush();
    return;
  }
  syncStarted = true;

  await loadAndFlush();

  try {
    const Network = await import('expo-network');
    const initial = await Network.getNetworkStateAsync();
    wasOffline = initial.isConnected === false || initial.isInternetReachable === false;

    networkSubscription?.remove();
    networkSubscription = Network.addNetworkStateListener((state) => {
      const online =
        state.isConnected !== false && state.isInternetReachable !== false;
      if (online) {
        if (wasOffline) {
          wasOffline = false;
          flush().catch(() => {});
        }
      } else {
        wasOffline = true;
      }
    });
  } catch (e) {
    if (__DEV__) {
      console.warn('[Analytics] network listener unavailable:', e);
    }
  }

  if (periodicTimer) clearInterval(periodicTimer);
  periodicTimer = setInterval(() => {
    if (queue.length > 0) {
      flush().catch(() => {});
    }
  }, PERIODIC_FLUSH_MS);
}

/** Pending cached event count (for diagnostics). */
export async function getPendingEventCount(): Promise<number> {
  await ensureQueueLoaded();
  return queue.length;
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
  startOfflineSync,
  getPendingEventCount,
  setCurrentScreen,
  getCurrentScreen,
};
