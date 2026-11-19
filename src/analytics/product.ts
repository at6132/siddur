/**
 * Product analytics helpers: track meaningful actions with a consistent `feature` prop.
 */

import { track } from './AnalyticsClient';
import { featureAction, featureSuccess, type FeatureKey } from './types';

/** Track a product action; always attaches `feature` for "who uses what" rollups. */
export function trackProduct(
  eventName: string,
  feature: FeatureKey,
  properties: Record<string, unknown> = {}
): void {
  void track(eventName, { feature, ...properties });
}

/** Track a feature action (feature_<name>_action) with optional action name. */
export function trackFeatureAction(
  feature: FeatureKey,
  action: string,
  properties: Record<string, unknown> = {}
): void {
  void track(featureAction(feature), { feature, action, ...properties });
}

/** Track a feature success (feature_<name>_success). */
export function trackFeatureSuccess(
  feature: FeatureKey,
  action: string,
  properties: Record<string, unknown> = {}
): void {
  void track(featureSuccess(feature), { feature, action, ...properties });
}
