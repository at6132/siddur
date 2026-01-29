/**
 * Notification Service
 * Main interface for notification management
 */

import { NotificationScheduler } from './NotificationScheduler';
import { UserPreferences } from '../types/preferences';
import { CalendarContext } from '../types/calendar';
import { UserPreferencesService } from '../storage/UserPreferences';

export class NotificationService {
  /**
   * Initialize and schedule all notifications
   */
  static async initialize(): Promise<boolean> {
    // Request permissions
    const hasPermission = await NotificationScheduler.requestPermissions();
    if (!hasPermission) {
      return false;
    }

    // Get user preferences
    const preferences = await UserPreferencesService.getPreferences();
    if (!preferences) {
      return false; // No preferences yet, will schedule after onboarding
    }

    // Build calendar context
    const context: CalendarContext = {
      nusach: preferences.nusach,
      location: preferences.location,
    };

    // Schedule notifications
    await NotificationScheduler.scheduleNotifications(preferences, context);

    return true;
  }

  /**
   * Reschedule notifications (call when preferences change)
   */
  static async reschedule(): Promise<void> {
    const preferences = await UserPreferencesService.getPreferences();
    if (!preferences) {
      return;
    }

    const context: CalendarContext = {
      nusach: preferences.nusach,
      location: preferences.location,
    };

    await NotificationScheduler.scheduleNotifications(preferences, context);
  }

  /**
   * Cancel all notifications
   */
  static async cancelAll(): Promise<void> {
    await NotificationScheduler.cancelAllNotifications();
  }

  /**
   * Check if notifications are enabled
   */
  static async hasPermission(): Promise<boolean> {
    return NotificationScheduler.requestPermissions();
  }
}

