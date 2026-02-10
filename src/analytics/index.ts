/**
 * Analytics: identity, events, lifecycle. No PII in payloads.
 */

export * from './types';
export * from './IdentityService';
export * from './context';
export * from './AnalyticsClient';
export { syncProfileToBackend, mergeIdentityOnBackend } from './api';
export { bootstrapLifecycle, startSessionEnd } from './lifecycle';

import { Analytics } from './AnalyticsClient';
import { LIFECYCLE_EVENTS, SCREEN_EVENTS, ONBOARDING_EVENTS, RELIABILITY_EVENTS, featureEntry, featureAction, featureSuccess, featureError } from './types';

export const analytics = Analytics;

export const events = {
  lifecycle: LIFECYCLE_EVENTS,
  screen: SCREEN_EVENTS,
  onboarding: ONBOARDING_EVENTS,
  reliability: RELIABILITY_EVENTS,
  feature: { entry: featureEntry, action: featureAction, success: featureSuccess, error: featureError },
};
