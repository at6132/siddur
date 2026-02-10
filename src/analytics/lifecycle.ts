/**
 * App lifecycle analytics: app_install, app_open, session_start/end, background/foreground.
 * Call bootstrap() once when app is ready; call startSessionEnd() on background/unload.
 */

import { AppState, AppStateStatus } from 'react-native';
import { getFirstOpenAt, setFirstOpenAt, setLastSeenAt, getAnonymousId, getUserProfile } from './IdentityService';
import { getTimezone } from './context';
import { track, flush, loadAndFlush } from './AnalyticsClient';
import { syncProfileToBackend } from './api';
import { LIFECYCLE_EVENTS, RELIABILITY_EVENTS } from './types';

const KEY_PREVIOUS_APP_VERSION = 'analytics_previous_app_version';
const KEY_SESSION_STARTED_AT = 'analytics_session_started_at';

async function getStored(key: string): Promise<string | null> {
  try {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

async function setStored(key: string, value: string): Promise<void> {
  try {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem(key, value);
  } catch {}
}

/** Call once when app is ready (after splash/fonts). coldStartMs = time from app launch to now. */
export async function bootstrapLifecycle(coldStartMs?: number): Promise<void> {
  try {
    if (typeof coldStartMs === 'number') {
      await track(RELIABILITY_EVENTS.APP_START_TIME, { cold_start_ms: coldStartMs });
    }
    const now = new Date().toISOString();
    const firstOpen = await getFirstOpenAt();

    if (!firstOpen) {
      await setFirstOpenAt(now);
      await setLastSeenAt(now);
      await track(LIFECYCLE_EVENTS.APP_INSTALL, {});
    } else {
      const prevVersion = await getStored(KEY_PREVIOUS_APP_VERSION);
      const { default: Constants } = await import('expo-constants');
      const currentVersion = Constants.expoConfig?.version ?? '1.0.0';
      const currentBuild = String(Constants.expoConfig?.ios?.buildNumber ?? Constants.expoConfig?.android?.versionCode ?? '0');
      if (prevVersion && prevVersion !== `${currentVersion}-${currentBuild}`) {
        await track(LIFECYCLE_EVENTS.APP_UPDATE, {
          previous_app_version: prevVersion.split('-')[0],
          previous_build_number: prevVersion.split('-')[1] ?? '',
        });
      }
      await setStored(KEY_PREVIOUS_APP_VERSION, `${currentVersion}-${currentBuild}`);
      await setLastSeenAt(now);
    }

    await track(LIFECYCLE_EVENTS.APP_OPEN, {});
    await track(LIFECYCLE_EVENTS.SESSION_START, {});
    await setStored(KEY_SESSION_STARTED_AT, String(Date.now()));

    AppState.addEventListener('change', onAppStateChange);

    await loadAndFlush();

    const anonymousId = await getAnonymousId();
    const profile = await getUserProfile();
    const timezone = getTimezone();
    await syncProfileToBackend(anonymousId, {
      last_seen_at: now,
      first_open_at: firstOpen || now,
      timezone,
      ...profile,
    });
  } catch (e) {
    console.warn('[Analytics] lifecycle bootstrap failed:', e);
  }
}

function onAppStateChange(nextState: AppStateStatus): void {
  if (nextState === 'background') {
    track(LIFECYCLE_EVENTS.APP_BACKGROUND, {}).then(() => endSession());
  } else if (nextState === 'active') {
    track(LIFECYCLE_EVENTS.APP_FOREGROUND, {});
  }
}

async function endSession(): Promise<void> {
  try {
    const started = await getStored(KEY_SESSION_STARTED_AT);
    const durationMs = started ? Math.max(0, Date.now() - parseInt(started, 10)) : 0;
    await track(LIFECYCLE_EVENTS.SESSION_END, { session_duration_ms: durationMs });
    await track(LIFECYCLE_EVENTS.APP_CLOSE, {});
    await flush();
  } catch (e) {
    console.warn('[Analytics] session end failed:', e);
  }
}

/** Call when app is about to close (e.g. before back button exit on Android). Best-effort. */
export function startSessionEnd(): void {
  endSession();
}
