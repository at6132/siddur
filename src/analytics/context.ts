/**
 * Build common event context: device, app version, locale, etc.
 * No PII; platform-safe.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type { EventCommon } from './types';

const ENV = (Constants.expoConfig?.extra?.environment as string) || (__DEV__ ? 'dev' : 'prod');
const RELEASE_CHANNEL = (Constants.expoConfig?.extra?.releaseChannel as string) || (Constants.appOwnership === 'expo' ? 'expo_go' : 'appstore');

function getAppVersion(): string {
  return Constants.expoConfig?.version ?? Constants.manifest?.version ?? '1.0.0';
}

function getBuildNumber(): string {
  const native = Constants.expoConfig?.ios?.buildNumber ?? Constants.expoConfig?.android?.versionCode ?? Constants.manifest?.extra?.expoClient?.extra?.build ?? '';
  return String(native || '0');
}

function getPlatform(): 'ios' | 'android' | 'web' {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

function getDeviceModel(): string {
  const d = Constants.expoConfig?.extra?.deviceModel ?? (Platform as any).select?.({ ios: 'iOS', android: 'Android', default: 'Unknown' });
  if (typeof d === 'string') return d;
  return Platform.OS === 'web' ? 'Web' : Platform.OS;
}

export async function getNetworkType(): Promise<'wifi' | 'cellular' | 'offline' | 'unknown'> {
  try {
    const { getNetworkStateAsync } = await import('expo-network');
    const state = await getNetworkStateAsync();
    if (!state.isConnected) return 'offline';
    if (state.type === 1) return 'wifi'; // WIFI
    if (state.type === 2 || state.type === 3) return 'cellular'; // CELLULAR
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

export function getLocale(): string {
  try {
    const locale = (Constants.expoConfig?.extra?.locale as string) ?? 'en';
    return String(locale).replace(/_/g, '-');
  } catch {
    return 'en';
  }
}

export function getTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
  } catch {
    return 'UTC';
  }
}

export interface ContextInput {
  anonymous_id: string;
  user_id: string | null;
  session_id: string;
  screen_name?: string | null;
  referrer?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
}

export async function buildCommonContext(input: ContextInput): Promise<Omit<EventCommon, 'event_name' | 'event_time_utc' | 'event_uuid' | 'event_schema_version'>> {
  const network_type = await getNetworkType();
  return {
    anonymous_id: input.anonymous_id,
    user_id: input.user_id,
    session_id: input.session_id,
    app_version: getAppVersion(),
    build_number: getBuildNumber(),
    platform: getPlatform(),
    os_version: Platform.Version?.toString?.() ?? '0',
    device_model: getDeviceModel(),
    network_type,
    carrier: null,
    locale: getLocale(),
    timezone: getTimezone(),
    country: null,
    environment: ENV as 'dev' | 'staging' | 'prod',
    release_channel: (RELEASE_CHANNEL as EventCommon['release_channel']) || 'appstore',
    referrer: input.referrer ?? null,
    utm_source: input.utm_source ?? null,
    utm_medium: input.utm_medium ?? null,
    utm_campaign: input.utm_campaign ?? null,
    screen_name: input.screen_name ?? null,
  };
}
