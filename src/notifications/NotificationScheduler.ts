/**
 * Notification Scheduler
 * Schedules notifications based on calendar and user preferences
 */

import { Platform } from 'react-native';
import type { LocationObject } from 'expo-location';
import * as Notifications from 'expo-notifications';
import {
  AndroidImportance,
  AndroidNotificationPriority,
  setNotificationChannelAsync,
} from 'expo-notifications';
import { EXPO_WEEKLY_SATURDAY, SHABBOS_CLOCK_ANDROID_CHANNEL, SHABBOS_CLOCK_BUNDLE_SOUND } from './shabbosClockConstants';
import { NotificationContentService } from './NotificationContent';
import { CalendarEngine } from '../core/calendar/CalendarEngine';
import { JewishCalendarService } from '../core/calendar/JewishCalendar';
import { UserPreferences } from '../types/preferences';
import { CalendarContext } from '../types/calendar';
import { OmerCalculator } from '../core/omer/OmerCalculator';
import { ZmanimService } from '../core/zmanim/ZmanimService';
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

function preferencesToLocation(preferences: UserPreferences): LocationObject | null {
  const loc = preferences.location;
  if (!loc) return null;
  return {
    coords: {
      latitude: loc.latitude,
      longitude: loc.longitude,
      altitude: null,
      accuracy: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: Date.now(),
  } as LocationObject;
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

    // Erev Shabbos clock — runs even if master notifications are off
    if (preferences.notifications.shabbosClockEnabled) {
      await this.scheduleShabbosClock(preferences, context);
    }

    // If master switch is off, only Shabbos clock (above) was scheduled
    if (!preferences.notifications.enabled) {
      return;
    }

    // Schedule custom reminders FIRST so they are not dropped by iOS 64-notification limit
    if (preferences.customReminders?.length) {
      await this.scheduleCustomReminders(preferences);
    }

    // Daily Tehillim (use user's time)
    if (preferences.notifications.dailyTehillim) {
      await this.scheduleDailyTehillim(preferences);
    }

    // Daily prayer reminders at user-chosen times (Shacharis, Mincha, Maariv)
    await this.schedulePrayerReminders(preferences);

    // Hallel / Anenu: one DATE trigger per applicable day (not DAILY — that would repeat after Rosh Chodesh etc.)
    if (preferences.notifications.hallelAnenu) {
      await this.scheduleHallelAndAnenuReminders(preferences);
    }

    if (preferences.notifications.shabbosReminders) {
      await this.scheduleShabbosReminders(preferences, context);
    }

    // Omer: one notification per evening during the Omer window (correct day in each alert)
    if (preferences.notifications.sefirasHaomer) {
      await this.scheduleOmerReminders(preferences);
    }

    // Rosh Chodesh & Fast Days
    if (preferences.notifications.roshChodesh || preferences.notifications.fastDays) {
      await this.scheduleRoshChodeshAndFastDays(preferences, context);
    }

    // Davening add-ons: Yaaleh V'Yavo days and Al HaNisim (Chanukah, Purim) — morning reminders
    if (preferences.notifications.daveningAddOns) {
      await this.scheduleDaveningAddOns(preferences, context);
    }

    // Daily Gratitude
    if (preferences.notifications.dailyGratitude) {
      await this.scheduleDailyGratitude(preferences);
    }

    // Shekiya (sunset) reminder — N minutes before sunset each day
    if (preferences.notifications.shekiyaReminder) {
      await this.scheduleShekiyaReminder(preferences, context);
    }

    // Streak reminders (invisible, not in settings — nudge if about to lose streak)
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
   * Schedule Hallel and Anenu (fast day) reminders for the next 60 days at the user's time.
   * Uses DATE triggers only on calendar days that need them — unlike DAILY, which would keep firing after Rosh Chodesh.
   */
  private static async scheduleHallelAndAnenuReminders(
    preferences: UserPreferences
  ): Promise<void> {
    const { hour, minute } = parseTime24h(
      preferences.notifications.hallelAnenuTime || '08:00'
    );

    for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
      const day = new Date();
      day.setDate(day.getDate() + dayOffset);

      if (JewishCalendarService.getHallelType(day)) {
        const triggerDate = new Date(day);
        triggerDate.setHours(hour, minute, 0, 0);
        if (isFutureDate(triggerDate)) {
          await scheduleSafe({
            content: NotificationContentService.getHallelContent(),
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: triggerDate,
            },
          });
        }
      }

      if (JewishCalendarService.isFastDay(day)) {
        const triggerDate = new Date(day);
        triggerDate.setHours(hour, minute, 0, 0);
        if (isFutureDate(triggerDate)) {
          await scheduleSafe({
            content: NotificationContentService.getAnenuContent(),
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
   * Schedule Shabbos reminders (both zman-based: relative to candle lighting time).
   * - "Shabbos coming" = 60 min before candle lighting, says "Shabbos is coming — candle lighting at X"
   * - "Candle lighting" = N min before (from preferences, e.g. 18), says "Candle lighting at X"
   */
  private static async scheduleShabbosReminders(
    preferences: UserPreferences,
    context: CalendarContext
  ): Promise<void> {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 5=Fri
    // Next Friday
    let daysToAdd = (5 - dayOfWeek + 7) % 7;
    if (daysToAdd === 0 && now.getHours() >= 12) daysToAdd = 7; // if already Friday afternoon, do next week
    const fridayDate = new Date(now);
    fridayDate.setDate(fridayDate.getDate() + daysToAdd);
    const fridayInfo = await CalendarEngine.getDayInfo(fridayDate, context);
    const candleLighting = fridayInfo?.zmanim?.candleLighting;
    if (!candleLighting || !(candleLighting instanceof Date)) return;

    const minsBeforeCandle = preferences.notifications.shabbosMinutesBefore ?? 18;

    // "Shabbos coming" — 60 minutes before candle lighting (zman-based)
    const shabbosComingAt = new Date(candleLighting.getTime() - 60 * 60000);
    if (isFutureDate(shabbosComingAt)) {
      await scheduleSafe({
        content: NotificationContentService.getShabbosComingContent(fridayInfo),
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: shabbosComingAt,
        },
      });
    }

    // "Candle lighting" — N min before candle lighting (e.g. 18 min), says "Candle lighting at X"
    const candleReminderAt = new Date(candleLighting.getTime() - minsBeforeCandle * 60000);
    if (isFutureDate(candleReminderAt)) {
      await scheduleSafe({
        content: NotificationContentService.getCandleLightingContent(fridayInfo),
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: candleReminderAt,
        },
      });
    }
  }

  /** Next N Fridays at local noon (for zmanim / Erev Shabbos prep) */
  private static getUpcomingFridays(count: number): Date[] {
    const out: Date[] = [];
    const now = new Date();
    const dayOfWeek = now.getDay();
    let daysToAdd = (5 - dayOfWeek + 7) % 7;
    if (daysToAdd === 0) {
      if (now.getHours() >= 21) daysToAdd = 7;
    }
    const first = new Date(now);
    first.setDate(first.getDate() + daysToAdd);
    first.setHours(12, 0, 0, 0);
    for (let i = 0; i < count; i++) {
      const d = new Date(first);
      d.setDate(d.getDate() + i * 7);
      d.setHours(12, 0, 0, 0);
      out.push(d);
    }
    return out;
  }

  private static addMinutesToTime(
    hour: number,
    minute: number,
    add: number
  ): { hour: number; minute: number } {
    const total = hour * 60 + minute + add;
    const norm = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
    return { hour: Math.floor(norm / 60), minute: norm % 60 };
  }

  private static async ensureShabbosClockAndroidChannel(): Promise<void> {
    if (Platform.OS !== 'android') return;
    try {
      await setNotificationChannelAsync(SHABBOS_CLOCK_ANDROID_CHANNEL, {
        name: 'Shabbos alarm',
        description: 'Loud Shabbos morning wake alarm (bundled sound)',
        importance: AndroidImportance.MAX,
        sound: SHABBOS_CLOCK_BUNDLE_SOUND,
        enableVibrate: true,
        vibrationPattern: [0, 500, 200, 500, 200, 500, 200, 1000],
      });
    } catch (e) {
      console.warn('Shabbos clock Android channel failed:', e);
    }
  }

  private static shabbosClockAlarmRequestContent(chimeIndex: number, chimeTotal: number) {
    const c = NotificationContentService.getShabbosClockAlarmContent(chimeIndex, chimeTotal);
    return {
      title: c.title!,
      body: c.body!,
      data: c.data,
      sound: SHABBOS_CLOCK_BUNDLE_SOUND,
      priority: AndroidNotificationPriority.MAX,
      vibrate: [0, 500, 200, 500, 200, 1000, 200, 1500],
      interruptionLevel: 'timeSensitive' as const,
    };
  }

  /**
   * Erev Shabbos: prep 30 min before candle (zmanim) — “tomorrow morning” + ringer + airplane.
   * Shabbos: loud weekly wake alarm, only for “ring for” length; refills future preps on reschedule.
   */
  private static async scheduleShabbosClock(
    preferences: UserPreferences,
    context: CalendarContext
  ): Promise<void> {
    await this.ensureShabbosClockAndroidChannel();

    const n = preferences.notifications;
    const { hour, minute } = parseTime24h(n.shabbosClockTime || '08:00');
    let dMin = Math.floor(n.shabbosClockRingDurationMin ?? 1);
    let dSec = Math.floor(n.shabbosClockRingDurationSec ?? 0);
    dMin = Math.max(0, Math.min(5, dMin));
    dSec = Math.max(0, Math.min(59, dSec));
    if (dMin === 5) dSec = 0;
    let totalSec = dMin * 60 + dSec;
    if (totalSec < 15) totalSec = 15;
    if (totalSec > 300) totalSec = 300;
    const ringChimeCount = Math.min(5, Math.max(1, Math.ceil(totalSec / 60)));

    const alarmLabel = (() => {
      const t = new Date();
      t.setHours(hour, minute, 0, 0);
      return t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    })();

    const prepWeeks = 24;
    let prepIdx = 0;
    for (const friday of this.getUpcomingFridays(prepWeeks)) {
      const fridayInfo = await CalendarEngine.getDayInfo(friday, context);
      const candle = fridayInfo?.zmanim?.candleLighting;
      if (candle && candle instanceof Date) {
        const prepAt = new Date(candle.getTime() - 30 * 60000);
        if (isFutureDate(prepAt)) {
          const prep = NotificationContentService.getShabbosClockPrepContent(alarmLabel);
          await scheduleSafe({
            identifier: `shabbos_clock_prep_w${prepIdx++}`,
            content: { ...prep, sound: true },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: prepAt,
            },
          });
        }
      }
    }

    for (let m = 0; m < ringChimeCount; m++) {
      if (hour * 60 + minute + m >= 24 * 60) break;
      const t = this.addMinutesToTime(hour, minute, m);
      await scheduleSafe({
        identifier: `shabbos_clock_alarm_${m}`,
        content: this.shabbosClockAlarmRequestContent(m + 1, ringChimeCount),
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          channelId: Platform.OS === 'android' ? SHABBOS_CLOCK_ANDROID_CHANNEL : undefined,
          weekday: EXPO_WEEKLY_SATURDAY,
          hour: t.hour,
          minute: t.minute,
        },
      });
    }
  }

  /**
   * Schedule Omer reminders at nightfall (tzeit) for each evening in the Omer
   * period over the next ~60 days — aligned with when the app enables counting.
   * Uses DATE triggers so title/body match that night's count.
   */
  private static async scheduleOmerReminders(preferences: UserPreferences): Promise<void> {
    const location = preferencesToLocation(preferences);
    const now = new Date();
    for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
      const noon = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + dayOffset,
        12,
        0,
        0,
        0
      );
      const ext = await ZmanimService.calculateExtendedZmanim(noon, location);
      const tzeis = ext.tzeis;
      if (!tzeis || Number.isNaN(tzeis.getTime())) continue;
      if (!isFutureDate(tzeis)) continue;
      const omerDay = await OmerCalculator.getOmerNightToCountAsync(tzeis, location);
      if (omerDay === null) continue;
      const content = NotificationContentService.getOmerContent(omerDay);
      await scheduleSafe({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: tzeis,
        },
      });
    }
  }

  /**
   * Schedule daily prayer reminders (Shacharis, Mincha, Maariv) at user-chosen times
   */
  private static async schedulePrayerReminders(preferences: UserPreferences): Promise<void> {
    const pr = preferences.notifications.prayerReminders;
    if (!pr) return;

    const items: Array<{ key: 'shacharis' | 'mincha' | 'maariv'; title: string; body: string }> = [
      { key: 'shacharis', title: 'Shacharis', body: 'Time for Shacharis' },
      { key: 'mincha', title: 'Mincha', body: 'Time for Mincha' },
      { key: 'maariv', title: 'Maariv', body: 'Time for Maariv' },
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
      // Ensure body is non-empty (required by some platforms)
      if (!content.body || content.body.trim() === '') {
        content.body = content.title || 'Reminder';
      }
      const dayDows = reminder.days.map((d) => DAY_ID_TO_DOW[d] ?? 0);
      if (dayDows.length === 0) continue;

      // Schedule next 4 weeks of occurrences on selected weekdays
      for (let dayOffset = 0; dayOffset < 28; dayOffset++) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hour, minute, 0, 0);
        if (!dayDows.includes(d.getDay())) continue;
        if (!isFutureDate(d)) continue;
        await scheduleSafe({
          content: { ...content, data: { ...content.data } },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(d.getTime()),
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
   * Schedule Davening add-ons: morning notifications for Yaaleh V'Yavo, Al HaNisim, Mashiv/V'ten Tal, Aneinu, Nachem, Avinu Malkeinu, Selichos (next 60 days).
   */
  private static async scheduleDaveningAddOns(
    preferences: UserPreferences,
    _context: CalendarContext
  ): Promise<void> {
    const yaalehTime = parseTime24h(
      preferences.notifications.daveningAddOnsYaalehVyavoTime ?? '08:00'
    );
    const alHanissimTime = parseTime24h(
      preferences.notifications.daveningAddOnsAlHanissimTime ?? '08:00'
    );
    const mashivTime = parseTime24h(
      preferences.notifications.daveningAddOnsMashivVtenTalTime ?? '08:00'
    );
    const aneinuTime = parseTime24h(
      preferences.notifications.daveningAddOnsAneinuTime ?? '08:00'
    );
    const nachemTime = parseTime24h(
      preferences.notifications.daveningAddOnsNachemTime ?? '08:00'
    );
    const avinuTime = parseTime24h(
      preferences.notifications.daveningAddOnsAvinuMalkeinuTime ?? '08:00'
    );
    const selichosTime = parseTime24h(
      preferences.notifications.daveningAddOnsSelichosTime ?? '08:00'
    );

    // Mashiv HaRuach / V'ten Tal: only first 7 days after the winter switch.
    // Summer (Morid HaTal): only first 7 days after the summer switch.
    // Both use the same preference and time.
    if (preferences.notifications.daveningAddOnsMashivVtenTal) {
      for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
        const day = new Date();
        day.setDate(day.getDate() + dayOffset);

        if (JewishCalendarService.isInFirst7DaysOfWinter(day)) {
          const triggerDate = new Date(day);
          triggerDate.setHours(mashivTime.hour, mashivTime.minute, 0, 0);
          if (isFutureDate(triggerDate)) {
            await scheduleSafe({
              content: NotificationContentService.getMashivVtenTalContent(),
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: triggerDate,
              },
            });
          }
        }

        if (JewishCalendarService.isInFirst7DaysOfSummer(day)) {
          const triggerDate = new Date(day);
          triggerDate.setHours(mashivTime.hour, mashivTime.minute, 0, 0);
          if (isFutureDate(triggerDate)) {
            await scheduleSafe({
              content: NotificationContentService.getSummerDaveningContent(),
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: triggerDate,
              },
            });
          }
        }
      }
    }

    for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
      const day = new Date();
      day.setDate(day.getDate() + dayOffset);

      if (
        preferences.notifications.daveningAddOnsYaalehVyavo &&
        JewishCalendarService.isYaalehVyavoDay(day)
      ) {
        const triggerDate = new Date(day);
        triggerDate.setHours(yaalehTime.hour, yaalehTime.minute, 0, 0);
        if (isFutureDate(triggerDate)) {
          await scheduleSafe({
            content: NotificationContentService.getYaalehVyavoContent(),
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: triggerDate,
            },
          });
        }
      }

      const alHanissim = JewishCalendarService.isAlHanissim(day);
      if (preferences.notifications.daveningAddOnsAlHanissim && alHanissim) {
        const triggerDate = new Date(day);
        triggerDate.setHours(alHanissimTime.hour, alHanissimTime.minute, 0, 0);
        if (isFutureDate(triggerDate)) {
          await scheduleSafe({
            content: NotificationContentService.getAlHanissimContent(alHanissim),
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: triggerDate,
            },
          });
        }
      }

      if (
        preferences.notifications.daveningAddOnsAneinu &&
        JewishCalendarService.isFastDay(day)
      ) {
        const triggerDate = new Date(day);
        triggerDate.setHours(aneinuTime.hour, aneinuTime.minute, 0, 0);
        if (isFutureDate(triggerDate)) {
          await scheduleSafe({
            content: NotificationContentService.getAneinuContent(),
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: triggerDate,
            },
          });
        }
      }

      if (
        preferences.notifications.daveningAddOnsNachem &&
        JewishCalendarService.isTishaBAv(day)
      ) {
        const triggerDate = new Date(day);
        triggerDate.setHours(nachemTime.hour, nachemTime.minute, 0, 0);
        if (isFutureDate(triggerDate)) {
          await scheduleSafe({
            content: NotificationContentService.getNachemContent(),
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: triggerDate,
            },
          });
        }
      }

      const isAvinuDay =
        JewishCalendarService.isAseretYemeiTeshuva(day) ||
        JewishCalendarService.isFastDay(day);
      if (preferences.notifications.daveningAddOnsAvinuMalkeinu && isAvinuDay) {
        const triggerDate = new Date(day);
        triggerDate.setHours(avinuTime.hour, avinuTime.minute, 0, 0);
        if (isFutureDate(triggerDate)) {
          await scheduleSafe({
            content: NotificationContentService.getAvinuMalkeinuContent(),
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: triggerDate,
            },
          });
        }
      }

      if (
        preferences.notifications.daveningAddOnsSelichos &&
        JewishCalendarService.isSelichosPeriod(day)
      ) {
        const triggerDate = new Date(day);
        triggerDate.setHours(selichosTime.hour, selichosTime.minute, 0, 0);
        if (isFutureDate(triggerDate)) {
          await scheduleSafe({
            content: NotificationContentService.getSelichosContent(),
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
   * Schedule Shekiya (sunset) reminder for the next 7 days — N minutes before sunset (zman-based).
   */
  private static async scheduleShekiyaReminder(
    preferences: UserPreferences,
    context: CalendarContext
  ): Promise<void> {
    const minsBefore = Math.max(1, Math.min(120, preferences.notifications.shekiyaMinutesBefore ?? 15));
    for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
      const date = new Date();
      date.setDate(date.getDate() + dayOffset);
      const dayInfo = await CalendarEngine.getDayInfo(date, context);
      const sunset = dayInfo?.extendedZmanim?.sunset;
      if (!sunset || !(sunset instanceof Date)) continue;
      const triggerAt = new Date(sunset.getTime() - minsBefore * 60000);
      if (!isFutureDate(triggerAt)) continue;
      const content = NotificationContentService.getShekiyaContent(dayInfo);
      await scheduleSafe({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerAt,
        },
      });
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
   * yesterday but not today, schedule one reminder for 8 PM today.
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

