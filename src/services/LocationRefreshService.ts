/**
 * Refreshes and persists the user's location for zmanim / notifications.
 * Safe to call on every app open — no-ops on web, denied permission, or GPS errors.
 */

import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { UserPreferencesService } from '../storage/UserPreferences';

export type SavedLocation = {
  latitude: number;
  longitude: number;
  cityName?: string;
};

/** Rough check: ~100m in lat/lon degrees. */
function locationChangedMeaningfully(
  prev: { latitude: number; longitude: number } | undefined,
  next: { latitude: number; longitude: number }
): boolean {
  if (!prev) return true;
  const dLat = Math.abs(prev.latitude - next.latitude);
  const dLon = Math.abs(prev.longitude - next.longitude);
  return dLat > 0.001 || dLon > 0.001;
}

async function resolveCityName(latitude: number, longitude: number): Promise<string | undefined> {
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (place?.city) return place.city;
    if (place?.subregion) return place.subregion;
    if (place?.region) return place.region;
  } catch {
    // Ignore geocoding errors
  }
  return undefined;
}

export class LocationRefreshService {
  private static inFlight: Promise<SavedLocation | null> | null = null;

  /**
   * Request GPS (if permitted), reverse-geocode when possible, and save to preferences.
   * Concurrent calls share one in-flight request.
   */
  static async refreshAndSave(): Promise<SavedLocation | null> {
    if (Platform.OS === 'web') {
      return null;
    }

    if (this.inFlight) {
      return this.inFlight;
    }

    this.inFlight = this.doRefresh().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private static async doRefresh(): Promise<SavedLocation | null> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        // Don't prompt on every open — only update when already allowed
        return null;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      const preferences = await UserPreferencesService.getPreferences();
      const prev = preferences?.location;
      const cityName =
        (await resolveCityName(latitude, longitude)) ?? prev?.cityName ?? 'Current Location';

      const next: SavedLocation = { latitude, longitude, cityName };
      await UserPreferencesService.setLocation(next);

      if (locationChangedMeaningfully(prev, next)) {
        try {
          const { NotificationService } = await import('../notifications/NotificationService');
          await NotificationService.reschedule();
        } catch (e) {
          console.warn('Failed to reschedule notifications after location update:', e);
        }
      }

      return next;
    } catch (e) {
      console.log('Location refresh skipped:', e);
      return null;
    }
  }
}
