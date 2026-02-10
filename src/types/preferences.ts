import { Nusach } from './nusach';

export type ThemePreference = 'system' | 'light' | 'dark';

export type SpiritualGoal = 
  | 'tehillim' 
  | 'mincha' 
  | 'neshama'
  | 'sefiras_haomer'
  | 'brachos'
  | 'gratitude'
  | 'other';

export interface PrayerReminder {
  enabled: boolean;
  time: string; // HH:MM AM/PM format
}

export interface PrayerReminders {
  shacharis: PrayerReminder;
  mincha: PrayerReminder;
  maariv: PrayerReminder;
}

export interface NotificationPreferences {
  // Master switch
  enabled: boolean;
  
  // Daily Prayer Reminders
  prayerReminders: PrayerReminders;
  
  // Tehillim
  dailyTehillim: boolean;
  dailyTehillimTime: string; // HH:MM format
  minchaTime: boolean;
  minchaMinutesBefore: number; // minutes before sunset
  
  // Special days
  hallelAnenu: boolean;
  shabbosReminders: boolean;
  shabbosMinutesBefore: number;
  roshChodesh: boolean;
  fastDays: boolean;
  
  // Counting
  sefirasHaomer: boolean;
  sefirasHaomerTime: string;
  
  // Custom countdowns
  customCountdowns: boolean;
}

export interface CustomCountdown {
  id: string;
  name: string;
  type: 'tehillim_40' | 'nishmas' | 'custom';
  totalDays: number;
  startDate: string; // ISO date
  chaptersPerDay?: number[];
  notificationTime: string;
  isActive: boolean;
}

export interface CustomReminder {
  id: string;
  title: string;
  message: string;
  time: string; // HH:MM AM/PM format
  enabled: boolean;
  days: ('sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat')[]; // Which days to remind
}

export interface DisplayPreferences {
  textSize: 'xsmall' | 'small' | 'medium' | 'large';
  showTransliteration: boolean;
  hebrewFont: 'default' | 'traditional';
  themePreference: ThemePreference;
}

export interface UserPreferences {
  nusach: Nusach;
  spiritualGoals: SpiritualGoal[];
  notifications: NotificationPreferences;
  display: DisplayPreferences;
  customCountdowns: CustomCountdown[];
  customReminders: CustomReminder[];
  location?: {
    latitude: number;
    longitude: number;
    cityName?: string;
  };
  hasCompletedOnboarding: boolean;
  /** Autoscroll speed multiplier (0.5–2) for siddur reader */
  autoscrollSpeed?: number;
  /** Hebrew birthday for countdown widget: day (1-30) and month (1-13 hebcal) */
  hebrewBirthday?: { day: number; month: number };
}

export const DEFAULT_PRAYER_REMINDERS: PrayerReminders = {
  shacharis: { enabled: false, time: '7:00 AM' },
  mincha: { enabled: false, time: '1:00 PM' },
  maariv: { enabled: false, time: '8:00 PM' },
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  prayerReminders: DEFAULT_PRAYER_REMINDERS,
  dailyTehillim: true,
  dailyTehillimTime: '09:00',
  minchaTime: true,
  minchaMinutesBefore: 30,
  hallelAnenu: true,
  shabbosReminders: true,
  shabbosMinutesBefore: 18,
  roshChodesh: true,
  fastDays: true,
  sefirasHaomer: true,
  sefirasHaomerTime: '20:30',
  customCountdowns: true,
};

export const DEFAULT_DISPLAY_PREFERENCES: DisplayPreferences = {
  textSize: 'medium',
  showTransliteration: false,
  hebrewFont: 'default',
  themePreference: 'system',
};

export const SPIRITUAL_GOAL_OPTIONS: { value: SpiritualGoal; label: string }[] = [
  { value: 'tehillim', label: 'Daily Tehillim' },
  { value: 'mincha', label: 'Davening Mincha' },
  { value: 'neshama', label: '40-Day Commitment' },
  { value: 'sefiras_haomer', label: 'Sefiras HaOmer' },
  { value: 'brachos', label: 'Mindful Brachos' },
  { value: 'gratitude', label: 'Daily Gratitude' },
];
