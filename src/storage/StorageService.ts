/**
 * Storage Service
 * Wrapper around AsyncStorage for type-safe data persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export class StorageService {
  private static async getItem<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value === null) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Error reading storage key ${key}:`, error);
      return null;
    }
  }

  private static async setItem<T>(key: string, value: T): Promise<boolean> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error writing storage key ${key}:`, error);
      return false;
    }
  }

  private static async removeItem(key: string): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing storage key ${key}:`, error);
      return false;
    }
  }

  // User Preferences
  static async getUserPreferences() {
    return this.getItem('userPreferences');
  }

  static async saveUserPreferences(preferences: any) {
    return this.setItem('userPreferences', preferences);
  }

  // Habit Marks
  static async getHabitMarks() {
    return this.getItem<Record<string, boolean>>('habitMarks');
  }

  static async markHabit(date: string, marked: boolean) {
    const marks = (await this.getHabitMarks()) || {};
    if (marked) {
      marks[date] = true;
    } else {
      delete marks[date];
    }
    return this.setItem('habitMarks', marks);
  }

  // Omer Counts
  static async getOmerCounts() {
    return this.getItem<Record<number, boolean>>('omerCounts');
  }

  static async markOmerDay(day: number, counted: boolean) {
    const counts = (await this.getOmerCounts()) || {};
    if (counted) {
      counts[day] = true;
    } else {
      delete counts[day];
    }
    return this.setItem('omerCounts', counts);
  }

  private static OMER_WIDGET_CD_NIGHT_KEY = '@omer_widget_cd_after_night';
  private static OMER_WIDGET_NEXT_COUNTDOWN_LEGACY = '@omer_widget_next_countdown';

  /**
   * Which Omer night the user last marked complete (widget/Omer). Widget shows "time until next tzeit"
   * only when current getOmerNightToCount === stored + 1 before tzeit. Stale booleans are cleared.
   */
  static async getOmerWidgetCountdownAfterNight(): Promise<number | null> {
    try {
      await AsyncStorage.removeItem(this.OMER_WIDGET_NEXT_COUNTDOWN_LEGACY);
      const v = await AsyncStorage.getItem(this.OMER_WIDGET_CD_NIGHT_KEY);
      if (v == null) return null;
      const n = parseInt(v, 10);
      return Number.isFinite(n) && n >= 1 && n <= 49 ? n : null;
    } catch {
      return null;
    }
  }

  static async setOmerWidgetCountdownAfterNight(night: number | null): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.OMER_WIDGET_NEXT_COUNTDOWN_LEGACY);
      if (night == null || night < 1 || night > 49) {
        await AsyncStorage.removeItem(this.OMER_WIDGET_CD_NIGHT_KEY);
      } else {
        await AsyncStorage.setItem(this.OMER_WIDGET_CD_NIGHT_KEY, String(night));
      }
    } catch (e) {
      console.warn('setOmerWidgetCountdownAfterNight:', e);
    }
  }

  // Tehillim Progress
  static async getTehillimProgress() {
    return this.getItem<Record<number, boolean>>('tehillimProgress');
  }

  static async markTehillimRead(psalm: number, read: boolean) {
    const progress = (await this.getTehillimProgress()) || {};
    if (read) {
      progress[psalm] = true;
    } else {
      delete progress[psalm];
    }
    return this.setItem('tehillimProgress', progress);
  }

  // Clear all data (for testing/reset)
  static async clearAll() {
    try {
      await AsyncStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  }
}

