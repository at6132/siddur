/**
 * Notification Scheduler
 * Schedules notifications based on calendar and user preferences
 */

import * as Notifications from 'expo-notifications';
import { NotificationConfig, NotificationType } from './types';
import { NotificationContentService } from './NotificationContent';
import { CalendarEngine } from '../core/calendar/CalendarEngine';
import { UserPreferences } from '../types/preferences';
import { CalendarContext } from '../types/calendar';
import { OmerCalculator } from '../core/omer/OmerCalculator';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false, // No red badges per PRD
  }),
});

export class NotificationScheduler {
  /**
   * Cancel all existing notifications
   */
  static async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Schedule all notifications based on user preferences and calendar
   */
  static async scheduleNotifications(
    preferences: UserPreferences,
    context: CalendarContext
  ): Promise<void> {
    // Cancel existing notifications first
    await this.cancelAllNotifications();

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
      hour: 9, // 9 AM
      minute: 0,
      repeats: true,
    };

    await Notifications.scheduleNotificationAsync({
      content,
      trigger,
    });
  }

  /**
   * Schedule Mincha reminder
   */
  private static async scheduleMincha(dayInfo: any): Promise<void> {
    const content = NotificationContentService.getMinchaContent(dayInfo);
    const minchaTime = dayInfo.zmanim.mincha;

    // Schedule for today
    const trigger = new Date(minchaTime.getTime() - 15 * 60000); // 15 min before

    await Notifications.scheduleNotificationAsync({
      content,
      trigger,
    });

    // Schedule recurring (will need to reschedule daily based on zmanim)
    // For now, schedule for next 7 days
    for (let i = 1; i <= 7; i++) {
      const futureDate = new Date(minchaTime);
      futureDate.setDate(futureDate.getDate() + i);
      const futureTrigger = new Date(futureDate.getTime() - 15 * 60000);

      await Notifications.scheduleNotificationAsync({
        content: {
          ...content,
          body: `Mincha is at ${futureDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })}`,
        },
        trigger: futureTrigger,
      });
    }
  }

  /**
   * Schedule Hallel reminder
   */
  private static async scheduleHallel(dayInfo: any): Promise<void> {
    const content = NotificationContentService.getHallelContent();
    const trigger = {
      hour: 8,
      minute: 0,
    };

    await Notifications.scheduleNotificationAsync({
      content,
      trigger,
    });
  }

  /**
   * Schedule Anenu reminder (fast days)
   */
  private static async scheduleAnenu(dayInfo: any): Promise<void> {
    const content = NotificationContentService.getAnenuContent();
    const trigger = {
      hour: 8,
      minute: 0,
    };

    await Notifications.scheduleNotificationAsync({
      content,
      trigger,
    });
  }

  /**
   * Schedule Shabbos reminders
   */
  private static async scheduleShabbosReminders(dayInfo: any): Promise<void> {
    // Shabbos coming reminder (Friday afternoon)
    const shabbosComingContent =
      NotificationContentService.getShabbosComingContent(dayInfo);
    const fridayAfternoon = new Date();
    fridayAfternoon.setHours(14, 0, 0); // 2 PM Friday

    await Notifications.scheduleNotificationAsync({
      content: shabbosComingContent,
      trigger: fridayAfternoon,
    });

    // Candle lighting reminder
    if (dayInfo.zmanim.candleLighting) {
      const candleContent =
        NotificationContentService.getCandleLightingContent(dayInfo);
      const candleTime = new Date(
        dayInfo.zmanim.candleLighting.getTime() - 30 * 60000
      ); // 30 min before

      await Notifications.scheduleNotificationAsync({
        content: candleContent,
        trigger: candleTime,
      });
    }
  }

  /**
   * Schedule Omer reminder (nightly after tzeis)
   */
  private static async scheduleOmerReminder(omerDay: number): Promise<void> {
    const content = NotificationContentService.getOmerContent(omerDay);
    // Schedule for evening (after tzeis - simplified to 8 PM)
    const trigger = {
      hour: 20,
      minute: 0,
    };

    await Notifications.scheduleNotificationAsync({
      content,
      trigger,
    });
  }

  /**
   * Schedule Neshama reminder
   */
  private static async scheduleNeshamaReminder(): Promise<void> {
    const content = NotificationContentService.getNeshamaContent();
    const trigger = {
      hour: 10,
      minute: 0,
      repeats: true,
    };

    await Notifications.scheduleNotificationAsync({
      content,
      trigger,
    });
  }

  /**
   * Request notification permissions
   */
  static async requestPermissions(): Promise<boolean> {
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

