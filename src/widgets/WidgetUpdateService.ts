/**
 * Widget Update Service
 * Handles updating widgets when app data changes
 */

import { WidgetDataService } from './WidgetDataService';
import { CalendarEngine } from '../core/calendar/CalendarEngine';
import { UserPreferencesService } from '../storage/UserPreferences';
import { CalendarContext } from '../types/calendar';

export class WidgetUpdateService {
  /**
   * Update widgets when app becomes active
   */
  static async updateOnAppActive(): Promise<void> {
    await WidgetDataService.updateWidgetData();
  }

  /**
   * Update widgets when preferences change
   */
  static async updateOnPreferencesChange(): Promise<void> {
    await WidgetDataService.updateWidgetData();
  }

  /**
   * Update widgets when habit is marked
   */
  static async updateOnHabitMark(): Promise<void> {
    await WidgetDataService.updateWidgetData();
  }

  /**
   * Update widgets when Omer is counted
   */
  static async updateOnOmerCount(): Promise<void> {
    await WidgetDataService.updateWidgetData();
  }

  /**
   * Schedule periodic widget updates
   */
  static async schedulePeriodicUpdates(): Promise<void> {
    // Update widgets every hour
    setInterval(async () => {
      await WidgetDataService.updateWidgetData();
    }, 60 * 60 * 1000);
  }
}
