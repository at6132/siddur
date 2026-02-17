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
  hallelAnenuTime: string; // HH:MM
  shabbosReminders: boolean;
  shabbosMinutesBefore: number;
  shabbosComingTime: string; // HH:MM - Friday afternoon "Shabbos coming" reminder
  roshChodesh: boolean;
  roshChodeshTime: string; // HH:MM
  fastDays: boolean;
  fastDaysTime: string; // HH:MM
  
  // Counting
  sefirasHaomer: boolean;
  sefirasHaomerTime: string;
  
  // Daily Gratitude
  dailyGratitude: boolean;
  dailyGratitudeTime: string; // HH:MM
  
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

/** Screen name for deep link when user taps the reminder (e.g. 'Home', 'TehillimList', 'Gratitude') */
export type CustomReminderOpenToScreen =
  | 'Home'
  | 'TehillimList'
  | 'Gratitude'
  | 'Habits'
  | 'Omer'
  | 'Calendar'
  | 'DailyGoals'
  | 'HubOverview'
  | 'Settings'
  | 'Library';

export interface CustomReminder {
  id: string;
  title: string;
  message: string;
  time: string; // HH:MM AM/PM format
  enabled: boolean;
  days: ('sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat')[]; // Which days to remind
  /** Where in the app to open when user taps the notification. Default 'Home'. */
  openToScreen?: CustomReminderOpenToScreen;
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
  hallelAnenuTime: '08:00',
  shabbosReminders: true,
  shabbosMinutesBefore: 30,
  shabbosComingTime: '14:00',
  roshChodesh: true,
  roshChodeshTime: '08:00',
  fastDays: true,
  fastDaysTime: '08:00',
  sefirasHaomer: true,
  sefirasHaomerTime: '20:30',
  dailyGratitude: false,
  dailyGratitudeTime: '20:00',
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
  { value: 'sefiras_haomer', label: 'Sefiras HaOmer' },
  { value: 'brachos', label: 'Mindful Brachos' },
  { value: 'gratitude', label: 'Daily Gratitude' },
];
