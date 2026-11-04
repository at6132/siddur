/**
 * Location is When In Use only. Prompt only when the user taps a location feature.
 */

import { Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import { LocationRefreshService } from './LocationRefreshService';

export const LOCATION_USAGE_DESCRIPTION =
  'Siddur uses your location while you use the app to calculate zmanim, schedule sunset-based reminders, and point Mizrach toward Jerusalem. Location stays on your device.';

export const LOCATION_REQUIRED_MESSAGE =
  "This doesn't work until you allow Location. Tap to allow.";

export const LOCATION_TIME_PLACEHOLDER = '--';

/** User tapped a zmanim/Mizrach empty state. Request once, or open Settings if already denied. */
export async function requestLocationFromUser(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Location.getForegroundPermissionsAsync();
  if (current.status === 'granted') {
    await LocationRefreshService.refreshAndSave();
    return true;
  }
  if (current.status === 'undetermined') {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      await LocationRefreshService.refreshAndSave();
      return true;
    }
    return false;
  }
  await Linking.openSettings();
  return false;
}
