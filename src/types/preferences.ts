/**
 * User preferences and settings types
 */

import { Nusach } from './nusach';

export type SpiritualGoal =
  | 'tehillim'
  | 'mincha'
  | 'neshama'
  | 'sefiras_haomer'
  | 'custom';

export interface NotificationPreferences {
  dailyTehillim: boolean;
  minchaTime: boolean;
  hallelAnenu: boolean;
  shabbosReminders: boolean;
  sefirasHaomer: boolean; // Auto-enabled during Omer
}

export interface UserPreferences {
  nusach: Nusach;
  spiritualGoals: SpiritualGoal[];
  notifications: NotificationPreferences;
  location?: {
    latitude: number;
    longitude: number;
  };
  hasCompletedOnboarding: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  dailyTehillim: true,
  minchaTime: true,
  hallelAnenu: true,
  shabbosReminders: true,
  sefirasHaomer: true,
};

export const SPIRITUAL_GOAL_OPTIONS: { value: SpiritualGoal; label: string }[] =
  [
    { value: 'tehillim', label: 'Tehillim' },
    { value: 'mincha', label: 'Mincha' },
    { value: 'neshama', label: 'Neshama / 40-day commitment' },
    { value: 'sefiras_haomer', label: 'Sefiras HaOmer' },
  ];

