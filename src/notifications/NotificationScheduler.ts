/**
 * Notification Scheduler
 * Schedules notifications based on calendar and user preferences
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { NotificationContentService } from './NotificationContent';
import { CalendarEngine } from '../core/calendar/CalendarEngine';
import { JewishCalendarService } from '../core/calendar/JewishCalendar';
import { UserPreferences } from '../types/preferences';
import { CalendarContext } from '../types/calendar';
import { OmerCalculator } from '../core/omer/OmerCalculator';

// Check if we're on a native platform (not web)
const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

/** Day id to JS getDay(): sun=0, mon=1, ..., sat=6 */
const DAY_ID_TO_DOW: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

/** Parse "9:00 AM" / "8:30 PM" to 24h hour and minute */
function parseTime12h(timeStr: string): { hour: number; minute: number } {
  const m = /^\s*(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM)?\s*$/i.exec((timeStr || '').trim());
  if (!m) return { hour: 9, minute: 0 };
  let h = parseInt(m[1], 10);
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  const pm = (m[3] || '').toUpperCase() === 'PM';
  if (h === 12) h = pm ? 12 : 0;
  else if (pm) h += 12;
  return { hour: h, minute: min };
}

/** Parse "09:00" / "20:30" to hour and minute */
function parseTime24h(hhmm: string): { hour: number; minute: number } {
  const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm || '').trim());
  if (!m) return { hour: 9, minute: 0 };
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return { hour: h, minute: min };
}

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

    // Daily Tehillim (use user's time)
    if (preferences.notifications.dailyTehillim) {
      await this.scheduleDailyTehillim(preferences);
    }

    // Daily prayer reminders at user-chosen times (Shacharis, Mincha, Maariv)
    await this.schedulePrayerReminders(preferences);

    // Contextual: Hallel / Anenu
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

    // Omer (use user's time)
    if (preferences.notifications.sefirasHaomer) {
      const omerDay = OmerCalculator.getOmerDay();
      if (omerDay !== null) {
        await this.scheduleOmerReminder(omerDay, preferences);
      }
    }

    // Neshama reminder
    if (preferences.spiritualGoals.includes('neshama')) {
      await this.scheduleNeshamaReminder();
    }

    // Rosh Chodesh & Fast Days
    if (preferences.notifications.roshChodesh || preferences.notifications.fastDays) {
      await this.scheduleRoshChodeshAndFastDays(preferences, context);
    }

    // Custom reminders (user-created, with days + time)
    if (preferences.customReminders?.length) {
      await this.scheduleCustomReminders(preferences);
    }
  }

  /**
   * Schedule daily Tehillim reminder at user's chosen time
   */
  private static async scheduleDailyTehillim(preferences: UserPreferences): Promise<void> {
    const content = NotificationContentService.getDailyTehillimContent();
    const { hour, minute } = parseTime24h(
      preferences.notifications.dailyTehillimTime || '09:00'
    );
    const trigger = {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    };
    await scheduleSafe({ content, trigger });
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
   * Schedule Omer reminder at user's chosen time
   */
  private static async scheduleOmerReminder(
    omerDay: number,
    preferences: UserPreferences
  ): Promise<void> {
    const content = NotificationContentService.getOmerContent(omerDay);
    const { hour, minute } = parseTime24h(
      preferences.notifications.sefirasHaomerTime || '20:30'
    );
    const trigger = {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
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
   * Schedule daily prayer reminders (Shacharis, Mincha, Maariv) at user-chosen times
   */
  private static async schedulePrayerReminders(preferences: UserPreferences): Promise<void> {
    const pr = preferences.notifications.prayerReminders;
    if (!pr) return;

    const items: Array<{ key: 'shacharis' | 'mincha' | 'maariv'; title: string; body: string }> = [
      { key: 'shacharis', title: 'Shacharis', body: 'A gentle reminder for Shacharis' },
      { key: 'mincha', title: 'Mincha', body: 'A gentle reminder for Mincha' },
      { key: 'maariv', title: 'Maariv', body: 'A gentle reminder for Maariv' },
    ];

    for (const { key, title, body } of items) {
      const reminder = pr[key];
      if (!reminder?.enabled) continue;
      const { hour, minute } = parseTime12h(reminder.time || '9:00 AM');
      const content = {
        title,
        body,
        data: { screen: 'home', action: key },
      };
      await scheduleSafe({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });
    }
  }

  /**
   * Schedule custom reminders (user-created) for the next 4 weeks on selected days
   */
  private static async scheduleCustomReminders(preferences: UserPreferences): Promise<void> {
    const reminders = preferences.customReminders || [];
    const enabled = reminders.filter((r) => r.enabled);
    if (enabled.length === 0) return;

    const now = new Date();
    for (const reminder of enabled) {
      const { hour, minute } = parseTime12h(reminder.time);
      const content = NotificationContentService.getCustomReminderContent(
        reminder.title,
        reminder.message,
        reminder.id
      );
      const dayDows = reminder.days.map((d) => DAY_ID_TO_DOW[d] ?? 0);

      // Schedule next 4 weeks of occurrences on selected weekdays
      for (let dayOffset = 0; dayOffset < 28; dayOffset++) {
        const d = new Date(now);
        d.setDate(d.getDate() + dayOffset);
        d.setHours(hour, minute, 0, 0);
        if (!dayDows.includes(d.getDay())) continue;
        if (!isFutureDate(d)) continue;
        await scheduleSafe({
          content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: d,
          },
        });
      }
    }
  }

  /**
   * Schedule Rosh Chodesh and Fast Day reminders for the next 60 days
   */
  private static async scheduleRoshChodeshAndFastDays(
    preferences: UserPreferences,
    context: CalendarContext
  ): Promise<void> {
    const reminderHour = 8;
    const reminderMinute = 0;

    for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
      const d = new Date();
      d.setDate(d.getDate() + dayOffset);
      d.setHours(reminderHour, reminderMinute, 0, 0);
      if (!isFutureDate(d)) continue;

      if (preferences.notifications.roshChodesh && JewishCalendarService.isRoshChodesh(d)) {
        const content = NotificationContentService.getRoshChodeshContent();
        await scheduleSafe({
          content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: d,
          },
        });
      }
      if (preferences.notifications.fastDays && JewishCalendarService.isFastDay(d)) {
        const content = NotificationContentService.getFastDayContent();
        await scheduleSafe({
          content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: d,
          },
        });
      }
    }
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

