/**
 * User Preferences Storage
 * High-level interface for managing user preferences
 */

import { StorageService } from './StorageService';
import {
  UserPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from '../types/preferences';
import { Nusach } from '../types/nusach';

export class UserPreferencesService {
  private static readonly STORAGE_KEY = 'userPreferences';

  static async getPreferences(): Promise<UserPreferences | null> {
    return StorageService.getUserPreferences();
  }

  static async savePreferences(
    preferences: Partial<UserPreferences>
  ): Promise<boolean> {
    const existing = await this.getPreferences();
    const updated: UserPreferences = {
      ...existing,
      ...preferences,
    } as UserPreferences;

    // Ensure defaults
    if (!updated.notifications) {
      updated.notifications = DEFAULT_NOTIFICATION_PREFERENCES;
    }
    if (!updated.hasCompletedOnboarding) {
      updated.hasCompletedOnboarding = false;
    }

    return StorageService.saveUserPreferences(updated);
  }

  static async setNusach(nusach: Nusach): Promise<boolean> {
    return this.savePreferences({ nusach });
  }

  static async setSpiritualGoals(goals: string[]): Promise<boolean> {
    return this.savePreferences({ spiritualGoals: goals as any[] });
  }

  static async setNotificationPreferences(
    notifications: Partial<UserPreferences['notifications']>
  ): Promise<boolean> {
    const existing = await this.getPreferences();
    return this.savePreferences({
      notifications: {
        ...existing?.notifications,
        ...notifications,
      } as UserPreferences['notifications'],
    });
  }

  static async setLocation(location: {
    latitude: number;
    longitude: number;
  }): Promise<boolean> {
    return this.savePreferences({ location });
  }

  static async markOnboardingComplete(): Promise<boolean> {
    return this.savePreferences({ hasCompletedOnboarding: true });
  }

  static async hasCompletedOnboarding(): Promise<boolean> {
    const prefs = await this.getPreferences();
    return prefs?.hasCompletedOnboarding ?? false;
  }
}

