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
   * Schedule if permission is already granted. Never shows the system dialog.
   */
  static async initialize(): Promise<boolean> {
    const hasPermission = await NotificationScheduler.hasPermission();
    if (!hasPermission) {
      return false;
    }

    const preferences = await UserPreferencesService.getPreferences();
    if (!preferences) {
      return false;
    }

    const context: CalendarContext = {
      nusach: preferences.nusach,
      location: preferences.location,
    };

    await NotificationScheduler.scheduleNotifications(preferences, context);
    return true;
  }

  /**
   * Reschedule notifications (call when preferences change).
   * Pass optional preferences to use immediately (e.g. after adding a custom reminder) so notifications take effect without toggling.
   */
  static async reschedule(preferences?: UserPreferences): Promise<void> {
    const prefs = preferences ?? await UserPreferencesService.getPreferences();
    if (!prefs) {
      return;
    }

    const context: CalendarContext = {
      nusach: prefs.nusach,
      location: prefs.location,
    };

    await NotificationScheduler.scheduleNotifications(prefs, context);
  }

  /**
   * Cancel all notifications
   */
  static async cancelAll(): Promise<void> {
    await NotificationScheduler.cancelAllNotifications();
  }

  /** Check only — does not prompt. */
  static async hasPermission(): Promise<boolean> {
    return NotificationScheduler.hasPermission();
  }

  /** User-initiated prompt only. Does not schedule. */
  static async requestPermissions(): Promise<boolean> {
    return NotificationScheduler.requestPermissions();
  }

  /**
   * User-initiated prompt (onboarding). If allowed, schedule all defaults.
   */
  static async requestPermissionsAndSchedule(): Promise<boolean> {
    const granted = await NotificationScheduler.requestPermissions();
    if (granted) {
      await this.reschedule();
    }
    return granted;
  }
}
