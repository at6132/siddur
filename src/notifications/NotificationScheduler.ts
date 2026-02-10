/**
 * Notification Scheduler
 * Schedules notifications based on calendar and user preferences
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { NotificationConfig, NotificationType } from './types';
import { NotificationContentService } from './NotificationContent';
import { CalendarEngine } from '../core/calendar/CalendarEngine';
import { UserPreferences } from '../types/preferences';
import { CalendarContext } from '../types/calendar';
import { OmerCalculator } from '../core/omer/OmerCalculator';

// Check if we're on a native platform (not web)
const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

/** iOS rejects dates in the past - ensure trigger is at least 60s in the future */
function isFutureDate(date: Date): boolean {
  return date.getTime() > Date.now() + 60 * 1000;
}

/** Schedule notification safely - catches iOS/Android trigger errors */
async function scheduleSafe(
  request: Parameters<typeof Notifications.scheduleNotificationAsync>[0]
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync(request);
  } catch (e) {
    console.warn('Notification schedule failed:', e);
  }
}

// Configure notification handler (only on native)
if (isNative) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false, // No red badges per PRD
    }),
  });
}

export class NotificationScheduler {
  /**
   * Cancel all existing notifications
   */
  static async cancelAllNotifications(): Promise<void> {
    if (!isNative) return; // Skip on web
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Schedule all notifications based on user preferences and calendar
   */
  static async scheduleNotifications(
    preferences: UserPreferences,
    context: CalendarContext
  ): Promise<void> {
    if (!isNative) return; // Skip scheduling on web

    // Cancel existing notifications first
    await this.cancelAllNotifications();

    // If master switch is off, don't schedule anything
    if (!preferences.notifications.enabled) {
      return;
    }

    // Get today's info
    const todayInfo = await CalendarEngine.getTodayInfo(context);

    // Schedule daily notifications
    if (preferences.notifications.dailyTehillim) {
      await this.scheduleDailyTehillim();
    }

    if (preferences.notifications.minchaTime) {
      await this.scheduleMincha(todayInfo);
    }

    // Schedule contextual notifications
    if (preferences.notifications.hallelAnenu) {
      if (todayInfo.daveningChanges.hallel) {
        await this.scheduleHallel(todayInfo);
      }
      if (todayInfo.daveningChanges.anenu) {
        await this.scheduleAnenu(todayInfo);
      }
    }

    if (preferences.notifications.shabbosReminders) {
      if (todayInfo.isShabbos || todayInfo.zmanim.shabbosStart) {
        await this.scheduleShabbosReminders(todayInfo);
      }
    }

    // Schedule Omer notifications if in Omer period
    if (preferences.notifications.sefirasHaomer) {
      const omerDay = OmerCalculator.getOmerDay();
      if (omerDay !== null) {
        await this.scheduleOmerReminder(omerDay);
      }
    }

    // Schedule Neshama reminder if user has that goal
    if (preferences.spiritualGoals.includes('neshama')) {
      await this.scheduleNeshamaReminder();
    }
  }

  /**
   * Schedule daily Tehillim reminder (morning)
   */
  private static async scheduleDailyTehillim(): Promise<void> {
    const content = NotificationContentService.getDailyTehillimContent();
    const trigger = {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 9,
      minute: 0,
    };

    await scheduleSafe({ content, trigger });
  }

  /**
   * Schedule Mincha reminder
   */
  private static async scheduleMincha(dayInfo: any): Promise<void> {
    const minchaTime = dayInfo?.zmanim?.mincha;
    if (!minchaTime || !(minchaTime instanceof Date)) return;

    const content = NotificationContentService.getMinchaContent(dayInfo);

    // Schedule for today and next 7 days - only if trigger is in the future
    for (let i = 0; i <= 7; i++) {
      const baseDate = new Date(minchaTime);
      baseDate.setDate(baseDate.getDate() + i);
      const triggerDate = new Date(baseDate.getTime() - 15 * 60000);

      if (!isFutureDate(triggerDate)) continue;

      await scheduleSafe({
        content: i === 0 ? content : {
          ...content,
          body: `Mincha is at ${baseDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })}`,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });
    }
  }

  /**
   * Schedule Hallel reminder
   */
  private static async scheduleHallel(dayInfo: any): Promise<void> {
    const content = NotificationContentService.getHallelContent();
    const trigger = {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 8,
      minute: 0,
    };

    await scheduleSafe({ content, trigger });
  }

  /**
   * Schedule Anenu reminder (fast days)
   */
  private static async scheduleAnenu(dayInfo: any): Promise<void> {
    const content = NotificationContentService.getAnenuContent();
    const trigger = {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 8,
      minute: 0,
    };

    await scheduleSafe({ content, trigger });
  }

  /**
   * Schedule Shabbos reminders
   */
  private static async scheduleShabbosReminders(dayInfo: any): Promise<void> {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 5=Fri

    // Next Friday 2 PM (day 5). If today is Fri and before 2 PM, use today.
    let daysToAdd = (5 - dayOfWeek + 7) % 7;
    if (daysToAdd === 0 && now.getHours() >= 14) daysToAdd = 7;
    const fridayAfternoon = new Date(now);
    fridayAfternoon.setDate(fridayAfternoon.getDate() + daysToAdd);
    fridayAfternoon.setHours(14, 0, 0, 0);

    if (isFutureDate(fridayAfternoon)) {
      await scheduleSafe({
        content: NotificationContentService.getShabbosComingContent(dayInfo),
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fridayAfternoon,
        },
      });
    }

    // Candle lighting reminder (30 min before)
    const candleLighting = dayInfo?.zmanim?.candleLighting;
    if (candleLighting instanceof Date) {
      const candleTime = new Date(candleLighting.getTime() - 30 * 60000);
      if (isFutureDate(candleTime)) {
        await scheduleSafe({
          content: NotificationContentService.getCandleLightingContent(dayInfo),
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: candleTime,
          },
        });
      }
    }
  }

  /**
   * Schedule Omer reminder (nightly after tzeis)
   */
  private static async scheduleOmerReminder(omerDay: number): Promise<void> {
    const content = NotificationContentService.getOmerContent(omerDay);
    const trigger = {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
    };

    await scheduleSafe({ content, trigger });
  }

  /**
   * Schedule Neshama reminder
   */
  private static async scheduleNeshamaReminder(): Promise<void> {
    const content = NotificationContentService.getNeshamaContent();
    const trigger = {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 10,
      minute: 0,
    };

    await scheduleSafe({ content, trigger });
  }

  /**
   * Request notification permissions
   */
  static async requestPermissions(): Promise<boolean> {
    if (!isNative) return true; // Skip permission check on web
    
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  }
}

