/**
 * Tracks notification/reminder preference changes and syncs opt-in snapshots
 * to the analytics profile (non-PII) so the dashboard can show "how many people
 * use tefillin / Shabbos / … reminders".
 */

import type { NotificationPreferences, UserPreferences, DisplayPreferences } from '../types/preferences';
import { track } from './AnalyticsClient';
import { getAnonymousId, setUserProfile } from './IdentityService';
import { syncProfileToBackend } from './api';
import { PRODUCT_EVENTS } from './types';

const BOOLEAN_REMINDER_KEYS: Array<keyof NotificationPreferences> = [
  'enabled',
  'dailyTehillim',
  'minchaTime',
  'hallelAnenu',
  'shabbosReminders',
  'roshChodesh',
  'fastDays',
  'sefirasHaomer',
  'dailyGratitude',
  'tefillinReminder',
  'shekiyaReminder',
  'daveningAddOns',
  'daveningAddOnsYaalehVyavo',
  'daveningAddOnsAlHanissim',
  'daveningAddOnsMashivVtenTal',
  'daveningAddOnsAneinu',
  'daveningAddOnsNachem',
  'daveningAddOnsAvinuMalkeinu',
  'daveningAddOnsSelichos',
  'customCountdowns',
  'shabbosClockEnabled',
];

const TIME_OR_NUMBER_KEYS: Array<keyof NotificationPreferences> = [
  'dailyTehillimTime',
  'minchaMinutesBefore',
  'hallelAnenuTime',
  'shabbosMinutesBefore',
  'shabbosComingTime',
  'roshChodeshTime',
  'fastDaysTime',
  'sefirasHaomerTime',
  'dailyGratitudeTime',
  'tefillinReminderMode',
  'tefillinReminderTime',
  'tefillinReminderMinutesBeforeShekiya',
  'shekiyaMinutesBefore',
  'daveningAddOnsYaalehVyavoTime',
  'daveningAddOnsAlHanissimTime',
  'daveningAddOnsMashivVtenTalTime',
  'daveningAddOnsAneinuTime',
  'daveningAddOnsNachemTime',
  'daveningAddOnsAvinuMalkeinuTime',
  'daveningAddOnsSelichosTime',
  'shabbosClockTime',
  'shabbosClockRingDurationMin',
  'shabbosClockRingDurationSec',
];

/** Flat non-PII reminder opt-in flags for identity profile + dashboard. */
export function buildReminderProfileSnapshot(
  n: NotificationPreferences | null | undefined,
  customReminderCount = 0
): Record<string, string | number | boolean> {
  if (!n) {
    return { custom_reminder_count: customReminderCount };
  }
  return {
    reminder_master_enabled: Boolean(n.enabled),
    reminder_shacharis: Boolean(n.prayerReminders?.shacharis?.enabled),
    reminder_mincha_prayer: Boolean(n.prayerReminders?.mincha?.enabled),
    reminder_maariv: Boolean(n.prayerReminders?.maariv?.enabled),
    reminder_daily_tehillim: Boolean(n.dailyTehillim),
    reminder_mincha_before_sunset: Boolean(n.minchaTime),
    reminder_hallel_anenu: Boolean(n.hallelAnenu),
    reminder_shabbos: Boolean(n.shabbosReminders),
    reminder_rosh_chodesh: Boolean(n.roshChodesh),
    reminder_fast_days: Boolean(n.fastDays),
    reminder_omer: Boolean(n.sefirasHaomer),
    reminder_gratitude: Boolean(n.dailyGratitude),
    reminder_tefillin: Boolean(n.tefillinReminder),
    reminder_tefillin_mode: n.tefillinReminderMode || 'fixed',
    reminder_shekiya: Boolean(n.shekiyaReminder),
    reminder_davening_addons: Boolean(n.daveningAddOns),
    reminder_yaaleh_vyavo: Boolean(n.daveningAddOnsYaalehVyavo),
    reminder_al_hanissim: Boolean(n.daveningAddOnsAlHanissim),
    reminder_mashiv_vten_tal: Boolean(n.daveningAddOnsMashivVtenTal),
    reminder_aneinu: Boolean(n.daveningAddOnsAneinu),
    reminder_nachem: Boolean(n.daveningAddOnsNachem),
    reminder_avinu_malkeinu: Boolean(n.daveningAddOnsAvinuMalkeinu),
    reminder_selichos: Boolean(n.daveningAddOnsSelichos),
    reminder_custom_countdowns: Boolean(n.customCountdowns),
    reminder_shabbos_clock: Boolean(n.shabbosClockEnabled),
    reminder_shabbos_minutes_before: Number(n.shabbosMinutesBefore) || 0,
    reminder_shekiya_minutes_before: Number(n.shekiyaMinutesBefore) || 0,
    custom_reminder_count: customReminderCount,
  };
}

function trackChange(
  setting: string,
  previous: unknown,
  next: unknown,
  extra: Record<string, unknown> = {}
): void {
  void track(PRODUCT_EVENTS.REMINDER_SETTING_CHANGED, {
    feature: 'reminders',
    setting,
    previous: previous == null ? null : String(previous),
    next: next == null ? null : String(next),
    ...extra,
  });
}

/** Diff previous vs next notification prefs and emit one event per changed field. */
export function trackNotificationPreferenceDiff(
  previous: NotificationPreferences | null | undefined,
  next: NotificationPreferences
): void {
  if (!previous) {
    void track(PRODUCT_EVENTS.REMINDERS_CONFIGURED, {
      feature: 'reminders',
      source: 'initial_save',
    });
    return;
  }

  for (const key of BOOLEAN_REMINDER_KEYS) {
    if (previous[key] !== next[key]) {
      trackChange(String(key), previous[key], next[key], { value_type: 'boolean' });
    }
  }

  for (const key of TIME_OR_NUMBER_KEYS) {
    if (previous[key] !== next[key]) {
      trackChange(String(key), previous[key], next[key], { value_type: 'value' });
    }
  }

  const prayerKeys = ['shacharis', 'mincha', 'maariv'] as const;
  for (const pk of prayerKeys) {
    const prevP = previous.prayerReminders?.[pk];
    const nextP = next.prayerReminders?.[pk];
    if (prevP?.enabled !== nextP?.enabled) {
      trackChange(`prayerReminders.${pk}.enabled`, prevP?.enabled, nextP?.enabled, {
        value_type: 'boolean',
        prayer: pk,
      });
    }
    if (prevP?.time !== nextP?.time) {
      trackChange(`prayerReminders.${pk}.time`, prevP?.time, nextP?.time, {
        value_type: 'value',
        prayer: pk,
      });
    }
  }
}

/** Persist reminder opt-ins to local + backend profile. */
export async function syncReminderProfile(prefs: UserPreferences | null | undefined): Promise<void> {
  if (!prefs) return;
  const snapshot = buildReminderProfileSnapshot(
    prefs.notifications,
    prefs.customReminders?.length ?? 0
  );
  await setUserProfile(snapshot as any);
  const anonymousId = await getAnonymousId();
  await syncProfileToBackend(anonymousId, snapshot);
}

export async function trackAndSyncNotificationChange(
  previous: NotificationPreferences | null | undefined,
  next: NotificationPreferences,
  fullPrefs?: UserPreferences | null
): Promise<void> {
  trackNotificationPreferenceDiff(previous, next);
  if (fullPrefs) {
    await syncReminderProfile({ ...fullPrefs, notifications: next });
  } else {
    const snapshot = buildReminderProfileSnapshot(next, fullPrefs?.customReminders?.length ?? 0);
    await setUserProfile(snapshot as any);
    const anonymousId = await getAnonymousId();
    await syncProfileToBackend(anonymousId, snapshot);
  }
}

export function trackDisplaySettingChanged(
  key: keyof DisplayPreferences | string,
  value: unknown
): void {
  void track(PRODUCT_EVENTS.DISPLAY_SETTING_CHANGED, {
    feature: 'settings',
    setting: String(key),
    next: value == null ? null : String(value),
  });
}

export function trackHomePanelChanged(
  action: 'add' | 'remove' | 'toggle_visibility' | 'reorder' | 'resize' | 'reset',
  panelType?: string
): void {
  void track(PRODUCT_EVENTS.HOME_PANEL_CHANGED, {
    feature: 'customize_home',
    action,
    panel_type: panelType ?? null,
  });
}

export function trackLibraryItemOpened(itemId: string, itemKind: string, extra: Record<string, unknown> = {}): void {
  void track(PRODUCT_EVENTS.LIBRARY_ITEM_OPENED, {
    feature: 'library',
    item_id: itemId,
    item_kind: itemKind,
    ...extra,
  });
}

export function trackCustomReminderChanged(
  action: 'add' | 'update' | 'delete' | 'toggle',
  extra: Record<string, unknown> = {}
): void {
  void track(PRODUCT_EVENTS.CUSTOM_REMINDER_CHANGED, {
    feature: 'custom_reminder',
    action,
    ...extra,
  });
}
