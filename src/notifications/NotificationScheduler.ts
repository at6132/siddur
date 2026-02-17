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
import { toLocalDateString } from '../utils/dateUtils';
import { GratitudeTracker } from '../storage/GratitudeTracker';
import { DailyTehillimTracker } from '../storage/DailyTehillimTracker';
import { HabitTracker } from '../storage/HabitTracker';

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

    // Contextual: Hallel / Anenu (user's time)
    if (preferences.notifications.hallelAnenu) {
      if (todayInfo.daveningChanges.hallel) {
        await this.scheduleHallel(preferences);
      }
      if (todayInfo.daveningChanges.anenu) {
        await this.scheduleAnenu(preferences);
      }
    }

    if (preferences.notifications.shabbosReminders) {
      if (todayInfo.isShabbos || todayInfo.zmanim.shabbosStart) {
        await this.scheduleShabbosReminders(todayInfo, preferences);
      }
    }

    // Omer (use user's time)
    if (preferences.notifications.sefirasHaomer) {
      const omerDay = OmerCalculator.getOmerDay();
      if (omerDay !== null) {
        await this.scheduleOmerReminder(omerDay, preferences);
      }
    }

    // Rosh Chodesh & Fast Days
    if (preferences.notifications.roshChodesh || preferences.notifications.fastDays) {
      await this.scheduleRoshChodeshAndFastDays(preferences, context);
    }

    // Daily Gratitude
    if (preferences.notifications.dailyGratitude) {
      await this.scheduleDailyGratitude(preferences);
    }

    // Custom reminders (user-created, with days + time + openToScreen)
    if (preferences.customReminders?.length) {
      await this.scheduleCustomReminders(preferences);
    }

    // Streak reminders (invisible, not in settings - gentle nudge if about to lose streak)
    await this.scheduleStreakReminders();
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
   * Schedule Hallel reminder at user's chosen time
   */
  private static async scheduleHallel(preferences: UserPreferences): Promise<void> {
    const content = NotificationContentService.getHallelContent();
    const { hour, minute } = parseTime24h(
      preferences.notifications.hallelAnenuTime || '08:00'
    );
    await scheduleSafe({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  }

  /**
   * Schedule Anenu reminder (fast days) at user's chosen time
   */
  private static async scheduleAnenu(preferences: UserPreferences): Promise<void> {
    const content = NotificationContentService.getAnenuContent();
    const { hour, minute } = parseTime24h(
      preferences.notifications.hallelAnenuTime || '08:00'
    );
    await scheduleSafe({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  }

  /**
   * Schedule Shabbos reminders (Friday "coming" at user time + candle lighting N min before)
   */
  private static async scheduleShabbosReminders(
    dayInfo: any,
    preferences: UserPreferences
  ): Promise<void> {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 5=Fri
    const { hour: comingHour, minute: comingMinute } = parseTime24h(
      preferences.notifications.shabbosComingTime || '14:00'
    );

    // Next Friday at user's chosen time. If today is Fri and before that time, use today.
    let daysToAdd = (5 - dayOfWeek + 7) % 7;
    if (daysToAdd === 0 && (now.getHours() > comingHour || (now.getHours() === comingHour && now.getMinutes() >= comingMinute)))
      daysToAdd = 7;
    const fridayAfternoon = new Date(now);
    fridayAfternoon.setDate(fridayAfternoon.getDate() + daysToAdd);
    fridayAfternoon.setHours(comingHour, comingMinute, 0, 0);

    if (isFutureDate(fridayAfternoon)) {
      await scheduleSafe({
        content: NotificationContentService.getShabbosComingContent(dayInfo),
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fridayAfternoon,
        },
      });
    }

    // Candle lighting reminder (N min before, from preferences)
    const minsBefore = preferences.notifications.shabbosMinutesBefore ?? 30;
    const candleLighting = dayInfo?.zmanim?.candleLighting;
    if (candleLighting instanceof Date) {
      const candleTime = new Date(candleLighting.getTime() - minsBefore * 60000);
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
        data: { screen: 'Home', action: key },
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
        reminder.id,
        reminder.openToScreen
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
    const roshChodeshTime = parseTime24h(preferences.notifications.roshChodeshTime || '08:00');
    const fastDaysTime = parseTime24h(preferences.notifications.fastDaysTime || '08:00');

    for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
      const day = new Date();
      day.setDate(day.getDate() + dayOffset);

      if (preferences.notifications.roshChodesh && JewishCalendarService.isRoshChodesh(day)) {
        const triggerDate = new Date(day);
        triggerDate.setHours(roshChodeshTime.hour, roshChodeshTime.minute, 0, 0);
        if (isFutureDate(triggerDate)) {
          await scheduleSafe({
            content: NotificationContentService.getRoshChodeshContent(),
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: triggerDate,
            },
          });
        }
      }
      if (preferences.notifications.fastDays && JewishCalendarService.isFastDay(day)) {
        const triggerDate = new Date(day);
        triggerDate.setHours(fastDaysTime.hour, fastDaysTime.minute, 0, 0);
        if (isFutureDate(triggerDate)) {
          await scheduleSafe({
            content: NotificationContentService.getFastDayContent(),
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: triggerDate,
            },
          });
        }
      }
    }
  }

  /**
   * Schedule Daily Gratitude reminder at user's chosen time
   */
  private static async scheduleDailyGratitude(preferences: UserPreferences): Promise<void> {
    const content = NotificationContentService.getDailyGratitudeContent();
    const { hour, minute } = parseTime24h(
      preferences.notifications.dailyGratitudeTime || '20:00'
    );
    await scheduleSafe({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  }

  /**
   * Schedule streak nudges (invisible in settings). If user did Tehillim/Gratitude/Habits
   * yesterday but not today, schedule one gentle reminder for 8 PM today.
   */
  private static async scheduleStreakReminders(): Promise<void> {
    const now = new Date();
    const today = toLocalDateString(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = toLocalDateString(yesterday);
    const reminderHour = 20;
    const reminderMinute = 0;
    const triggerDate = new Date(now);
    triggerDate.setHours(reminderHour, reminderMinute, 0, 0);
    if (!isFutureDate(triggerDate)) return;

    try {
      // Tehillim: did yesterday, not today
      const tehillimDidYesterday =
        (await DailyTehillimTracker.getCompletedDaysInRange(yesterday, yesterday)) > 0;
      const tehillimDoneToday = await DailyTehillimTracker.isComplete();
      if (tehillimDidYesterday && !tehillimDoneToday) {
        await scheduleSafe({
          content: NotificationContentService.getStreakReminderContent('tehillim'),
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(triggerDate.getTime()),
          },
        });
      }
    } catch (e) {
      console.warn('Streak reminder (Tehillim) check failed:', e);
    }

    try {
      // Gratitude: most recent entry was yesterday
      const entries = await GratitudeTracker.getAllEntries();
      const dates = [...new Set(entries.map((e) => e.date))].sort((a, b) => b.localeCompare(a));
      if (dates.length > 0 && dates[0] === yesterdayStr) {
        await scheduleSafe({
          content: NotificationContentService.getStreakReminderContent('gratitude'),
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(triggerDate.getTime()),
          },
        });
      }
    } catch (e) {
      console.warn('Streak reminder (Gratitude) check failed:', e);
    }

    try {
      // Habits: marked yesterday, not today
      const marked = await HabitTracker.getMarkedDates();
      if (marked.has(yesterdayStr) && !marked.has(today)) {
        await scheduleSafe({
          content: NotificationContentService.getStreakReminderContent('habits'),
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(triggerDate.getTime()),
          },
        });
      }
    } catch (e) {
      console.warn('Streak reminder (Habits) check failed:', e);
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

