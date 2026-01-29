/**
 * Widget Data Service
 * Provides data to iOS widgets via App Groups and shared storage
 */

import { CalendarEngine } from '../core/calendar/CalendarEngine';
import { UserPreferencesService } from '../storage/UserPreferences';
import { CalendarContext } from '../types/calendar';
import { OmerCalculator } from '../core/omer/OmerCalculator';
import { StorageService } from '../storage/StorageService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WidgetData {
  jewishDate: string;
  jewishDateShort: string;
  spiritualCue?: string;
  minchaTime?: string;
  isShabbos: boolean;
  omerDay?: number;
  omerCounted: boolean;
  hasHabitMark: boolean;
}

/**
 * Update widget data in shared storage
 * This will be read by iOS widgets via App Groups
 */
export class WidgetDataService {
  private static readonly WIDGET_DATA_KEY = 'widget_data';

  /**
   * Refresh and save widget data
   */
  static async updateWidgetData(): Promise<void> {
    try {
      const preferences = await UserPreferencesService.getPreferences();
      if (!preferences) return;

      const context: CalendarContext = {
        nusach: preferences.nusach,
        location: preferences.location,
      };

      const dayInfo = await CalendarEngine.getTodayInfo(context);
      const omerDay = OmerCalculator.getOmerDay();
      const omerCounts = await StorageService.getOmerCounts();
      const habitMarks = await StorageService.getHabitMarks();
      const todayKey = this.getTodayKey();

      const widgetData: WidgetData = {
        jewishDate: dayInfo.jewishDate,
        jewishDateShort: dayInfo.jewishDateShort,
        spiritualCue: dayInfo.spiritualCue?.text,
        minchaTime: dayInfo.zmanim.mincha.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        }),
        isShabbos: dayInfo.isShabbos,
        omerDay: omerDay || undefined,
        omerCounted: omerDay ? (omerCounts?.[omerDay] ?? false) : false,
        hasHabitMark: habitMarks?.[todayKey] ?? false,
      };

      // Save to AsyncStorage (in production, also save to App Group)
      await AsyncStorage.setItem(
        this.WIDGET_DATA_KEY,
        JSON.stringify(widgetData)
      );

      // In production, also write to App Group shared container:
      // const sharedDefaults = new UserDefaults(suiteName: "group.com.siddur.app")
      // sharedDefaults.set(JSON.stringify(widgetData), forKey: "widget_data")
    } catch (error) {
      console.error('Error updating widget data:', error);
    }
  }

  /**
   * Get current widget data
   */
  static async getWidgetData(): Promise<WidgetData | null> {
    try {
      const data = await AsyncStorage.getItem(this.WIDGET_DATA_KEY);
      if (!data) return null;
      return JSON.parse(data) as WidgetData;
    } catch (error) {
      console.error('Error getting widget data:', error);
      return null;
    }
  }

  private static getTodayKey(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
