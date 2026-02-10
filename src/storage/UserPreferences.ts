/**
 * User Preferences Storage
 * High-level interface for managing user preferences
 */

import { StorageService } from './StorageService';
import {
  UserPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
  DEFAULT_DISPLAY_PREFERENCES,
  CustomCountdown,
  CustomReminder,
  DisplayPreferences,
} from '../types/preferences';
import { Nusach } from '../types/nusach';

export class UserPreferencesService {
  private static readonly STORAGE_KEY = 'userPreferences';

  static async getPreferences(): Promise<UserPreferences | null> {
    const prefs = await StorageService.getUserPreferences();
    
    // Ensure all new fields have defaults
    if (prefs) {
      if (!prefs.notifications) {
        prefs.notifications = DEFAULT_NOTIFICATION_PREFERENCES;
      } else {
        // Merge with defaults for any missing fields
        prefs.notifications = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...prefs.notifications };
      }
      if (!prefs.display) {
        prefs.display = DEFAULT_DISPLAY_PREFERENCES;
      } else {
        prefs.display = { ...DEFAULT_DISPLAY_PREFERENCES, ...prefs.display };
      }
      if (!prefs.customCountdowns) {
        prefs.customCountdowns = [];
      }
      if (!prefs.customReminders) {
        prefs.customReminders = [];
      }
    }
    
    return prefs;
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
    if (!updated.display) {
      updated.display = DEFAULT_DISPLAY_PREFERENCES;
    } else {
      updated.display = { ...DEFAULT_DISPLAY_PREFERENCES, ...updated.display };
    }
    if (!updated.customCountdowns) {
      updated.customCountdowns = [];
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

  static async setDisplayPreferences(
    display: Partial<DisplayPreferences>
  ): Promise<boolean> {
    const existing = await this.getPreferences();
    return this.savePreferences({
      display: {
        ...existing?.display,
        ...display,
      } as DisplayPreferences,
    });
  }

  static async setHebrewBirthday(birthday: { day: number; month: number } | null): Promise<boolean> {
    return this.savePreferences({ hebrewBirthday: birthday ?? undefined });
  }

  static async setLocation(location: {
    latitude: number;
    longitude: number;
    cityName?: string;
  }): Promise<boolean> {
    return this.savePreferences({ location });
  }

  static async addCustomCountdown(countdown: CustomCountdown): Promise<boolean> {
    const existing = await this.getPreferences();
    const countdowns = existing?.customCountdowns || [];
    countdowns.push(countdown);
    return this.savePreferences({ customCountdowns: countdowns });
  }

  static async updateCustomCountdown(id: string, updates: Partial<CustomCountdown>): Promise<boolean> {
    const existing = await this.getPreferences();
    const countdowns = existing?.customCountdowns || [];
    const index = countdowns.findIndex(c => c.id === id);
    if (index >= 0) {
      countdowns[index] = { ...countdowns[index], ...updates };
      return this.savePreferences({ customCountdowns: countdowns });
    }
    return false;
  }

  static async deleteCustomCountdown(id: string): Promise<boolean> {
    const existing = await this.getPreferences();
    const countdowns = (existing?.customCountdowns || []).filter(c => c.id !== id);
    return this.savePreferences({ customCountdowns: countdowns });
  }

  // Custom Reminder Management
  static async addCustomReminder(reminder: CustomReminder): Promise<boolean> {
    const existing = await this.getPreferences();
    const reminders = existing?.customReminders || [];
    reminders.push(reminder);
    return this.savePreferences({ customReminders: reminders });
  }

  static async updateCustomReminder(id: string, updates: Partial<CustomReminder>): Promise<boolean> {
    const existing = await this.getPreferences();
    const reminders = existing?.customReminders || [];
    const index = reminders.findIndex(r => r.id === id);
    if (index >= 0) {
      reminders[index] = { ...reminders[index], ...updates };
      return this.savePreferences({ customReminders: reminders });
    }
    return false;
  }

  static async deleteCustomReminder(id: string): Promise<boolean> {
    const existing = await this.getPreferences();
    const reminders = (existing?.customReminders || []).filter(r => r.id !== id);
    return this.savePreferences({ customReminders: reminders });
  }

  static async getCustomReminders(): Promise<CustomReminder[]> {
    const existing = await this.getPreferences();
    return existing?.customReminders || [];
  }

  static async setAutoscrollSpeed(speed: number): Promise<boolean> {
    return this.savePreferences({ autoscrollSpeed: speed });
  }

  static async markOnboardingComplete(): Promise<boolean> {
    return this.savePreferences({ hasCompletedOnboarding: true });
  }

  static async hasCompletedOnboarding(): Promise<boolean> {
    const prefs = await this.getPreferences();
    return prefs?.hasCompletedOnboarding ?? false;
  }
}
