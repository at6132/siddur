/**
 * Analytics backend API helpers: sync profile, merge identity on login.
 * Uses same base URL as event ingestion (analyticsUrl / EXPO_PUBLIC_ANALYTICS_URL).
 */

async function getBaseUrl(): Promise<string | null> {
  try {
    const { default: Constants } = await import('expo-constants');
    const extra = (Constants.expoConfig as any)?.extra;
    const u =
      (typeof extra?.analyticsUrl === 'string' && extra.analyticsUrl) ||
      (typeof process !== 'undefined' && (process as any).env?.EXPO_PUBLIC_ANALYTICS_URL) ||
      (typeof process !== 'undefined' && (process as any).env?.REACT_APP_ANALYTICS_URL);
    if (typeof u === 'string' && u.length > 0) return u.replace(/\/$/, '');
  } catch {}
  return null;
}

/** Sync non-PII profile (last_seen_at, etc.) to backend. Call on app open. */
export async function syncProfileToBackend(
  anonymousId: string,
  profile: { last_seen_at?: string; first_open_at?: string; timezone?: string; [key: string]: unknown }
): Promise<void> {
  const base = await getBaseUrl();
  if (!base) return;
  try {
    await fetch(`${base}/api/identities/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anonymous_id: anonymousId, profile }),
    });
  } catch (e) {
    console.warn('[Analytics] syncProfileToBackend failed:', e);
  }
}

/** Call after signup/login to merge anonymous_id → user_id on the backend. */
export async function mergeIdentityOnBackend(
  anonymousId: string,
  userId: string,
  profile?: Record<string, unknown>
): Promise<void> {
  const base = await getBaseUrl();
  if (!base) return;
  try {
    await fetch(`${base}/api/identities/merge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anonymous_id: anonymousId, user_id: userId, profile: profile || {} }),
    });
  } catch (e) {
    console.warn('[Analytics] mergeIdentityOnBackend failed:', e);
  }
}
