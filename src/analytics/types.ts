/**
 * Analytics event schema and identity types.
 * No PII in event payloads; hashed identifiers only when needed.
 */

export const EVENT_SCHEMA_VERSION = '1.0';

/** Identity: distinct_id merges anonymous_id → user_id on login */
export interface IdentityState {
  anonymous_id: string;
  user_id: string | null;
  device_id: string;
  distinct_id: string;
  is_logged_in: boolean;
  session_id: string;
}

/** User profile properties (non-PII, stored server-side) */
export interface UserProfileProperties {
  account_created_at?: string; // ISO UTC
  first_open_at?: string;
  last_seen_at?: string;
  country?: string;
  region?: string;
  timezone?: string;
  app_language?: string;
  push_opt_in?: boolean;
  email_verified?: boolean;
  plan_tier?: 'free' | 'pro' | string;
  acquisition_channel?: 'testflight' | 'appstore' | 'referral' | string;
}

/** Common fields attached to every event */
export interface EventCommon {
  event_name: string;
  event_time_utc: string; // ISO
  event_uuid: string;
  event_schema_version: string;
  anonymous_id: string;
  user_id: string | null;
  session_id: string;
  app_version: string;
  build_number: string;
  platform: 'ios' | 'android' | 'web';
  os_version: string;
  device_model: string;
  network_type: 'wifi' | 'cellular' | 'offline' | 'unknown';
  carrier: string | null;
  locale: string;
  timezone: string;
  country: string | null;
  environment: 'dev' | 'staging' | 'prod';
  release_channel: 'expo_go' | 'eas_dev' | 'testflight' | 'appstore' | 'web';
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  screen_name: string | null;
}

export type AnalyticsEvent = EventCommon & Record<string, unknown>;

/** Lifecycle */
export const LIFECYCLE_EVENTS = {
  APP_INSTALL: 'app_install',
  APP_OPEN: 'app_open',
  APP_BACKGROUND: 'app_background',
  APP_FOREGROUND: 'app_foreground',
  APP_CLOSE: 'app_close',
  SESSION_START: 'session_start',
  SESSION_END: 'session_end',
  APP_UPDATE: 'app_update',
} as const;

/** Screen */
export const SCREEN_EVENTS = {
  SCREEN_VIEW: 'screen_view',
} as const;

/** Onboarding */
export const ONBOARDING_EVENTS = {
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_STEP_VIEWED: 'onboarding_step_viewed',
  ONBOARDING_STEP_COMPLETED: 'onboarding_step_completed',
  ONBOARDING_SKIPPED: 'onboarding_skipped',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  SIGNUP_STARTED: 'signup_started',
  SIGNUP_SUCCESS: 'signup_success',
  SIGNUP_FAILED: 'signup_failed',
  LOGIN_STARTED: 'login_started',
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  PERMISSION_PROMPT_SHOWN: 'permission_prompt_shown',
  PERMISSION_RESPONSE: 'permission_response',
} as const;

/** Feature usage pattern: feature_<name>_entry | _action | _success | _error */
export function featureEntry(name: string) { return `feature_${name}_entry`; }
export function featureAction(name: string) { return `feature_${name}_action`; }
export function featureSuccess(name: string) { return `feature_${name}_success`; }
export function featureError(name: string) { return `feature_${name}_error`; }

/** Reliability */
export const RELIABILITY_EVENTS = {
  CRASH_DETECTED: 'crash_detected',
  API_ERROR: 'api_error',
  UI_ERROR: 'ui_error',
  VALIDATION_ERROR: 'validation_error',
  APP_START_TIME: 'app_start_time',
  SCREEN_RENDER_TIME: 'screen_render_time',
  NETWORK_REQUEST: 'network_request',
} as const;

/** Tehillim (private & shared completion) */
export const TEHILLIM_EVENTS = {
  PEREK_COMPLETED: 'tehillim_perek_completed',
} as const;
