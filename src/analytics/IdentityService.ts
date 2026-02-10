/**
 * Identity: anonymous_id, user_id, device_id, distinct_id, session_id, is_logged_in.
 * Persists anonymous_id and device_id; merges to user_id on login.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { IdentityState, UserProfileProperties } from './types';

const KEY_ANONYMOUS_ID = 'analytics_anonymous_id';
const KEY_DEVICE_ID = 'analytics_device_id';
const KEY_USER_ID = 'analytics_user_id';
const KEY_IS_LOGGED_IN = 'analytics_is_logged_in';
const KEY_FIRST_OPEN_AT = 'analytics_first_open_at';
const KEY_PROFILE = 'analytics_user_profile';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let cachedIdentity: IdentityState | null = null;
let cachedProfile: UserProfileProperties | null = null;

export async function getAnonymousId(): Promise<string> {
  let id = await AsyncStorage.getItem(KEY_ANONYMOUS_ID);
  if (!id) {
    id = generateId();
    await AsyncStorage.setItem(KEY_ANONYMOUS_ID, id);
  }
  return id;
}

export async function getDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(KEY_DEVICE_ID);
  if (!id) {
    id = generateId();
    await AsyncStorage.setItem(KEY_DEVICE_ID, id);
  }
  return id;
}

export async function getUserId(): Promise<string | null> {
  return AsyncStorage.getItem(KEY_USER_ID);
}

export async function getIsLoggedIn(): Promise<boolean> {
  const v = await AsyncStorage.getItem(KEY_IS_LOGGED_IN);
  return v === 'true';
}

export async function getSessionId(): Promise<string> {
  if (cachedIdentity?.session_id) return cachedIdentity.session_id;
  const id = generateId();
  if (cachedIdentity) cachedIdentity.session_id = id;
  return id;
}

export async function getIdentity(): Promise<IdentityState> {
  if (cachedIdentity) return cachedIdentity;
  const [anonymous_id, device_id, user_id, is_logged_in] = await Promise.all([
    getAnonymousId(),
    getDeviceId(),
    getUserId(),
    getIsLoggedIn(),
  ]);
  const session_id = generateId();
  const distinct_id = is_logged_in && user_id ? user_id : anonymous_id;
  cachedIdentity = {
    anonymous_id,
    user_id,
    device_id,
    distinct_id,
    is_logged_in,
    session_id,
  };
  return cachedIdentity;
}

/** Call after login/signup to set user_id and merge identity */
export async function setUserId(userId: string): Promise<void> {
  await AsyncStorage.setItem(KEY_USER_ID, userId);
  await AsyncStorage.setItem(KEY_IS_LOGGED_IN, 'true');
  cachedIdentity = null;
}

/** Call on logout */
export async function clearUserId(): Promise<void> {
  await AsyncStorage.removeItem(KEY_USER_ID);
  await AsyncStorage.setItem(KEY_IS_LOGGED_IN, 'false');
  cachedIdentity = null;
}

/** New session (e.g. each app open) */
export function newSession(): void {
  cachedIdentity = null;
}

export async function getFirstOpenAt(): Promise<string | null> {
  return AsyncStorage.getItem(KEY_FIRST_OPEN_AT);
}

export async function setFirstOpenAt(iso: string): Promise<void> {
  await AsyncStorage.setItem(KEY_FIRST_OPEN_AT, iso);
}

export async function getUserProfile(): Promise<UserProfileProperties | null> {
  if (cachedProfile) return cachedProfile;
  try {
    const raw = await AsyncStorage.getItem(KEY_PROFILE);
    if (!raw) return null;
    cachedProfile = JSON.parse(raw) as UserProfileProperties;
    return cachedProfile;
  } catch {
    return null;
  }
}

export async function setUserProfile(updates: Partial<UserProfileProperties>): Promise<void> {
  const current = (await getUserProfile()) || {};
  const next = { ...current, ...updates };
  cachedProfile = next;
  await AsyncStorage.setItem(KEY_PROFILE, JSON.stringify(next));
}

/** Update last_seen_at (and optionally sync to backend); call on app open */
export async function setLastSeenAt(iso?: string): Promise<void> {
  const now = iso || new Date().toISOString();
  await setUserProfile({ last_seen_at: now });
}
