/**
 * Notification types and definitions
 */

export type NotificationType =
  | 'daily_tehillim'
  | 'mincha_time'
  | 'hallel'
  | 'anenu'
  | 'shabbos_coming'
  | 'candle_lighting'
  | 'shabbos_clock_prep'
  | 'shabbos_clock_alarm'
  | 'sefiras_haomer'
  | 'neshama_reminder';

export interface NotificationConfig {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  scheduledTime: Date;
  data?: Record<string, any>;
}

export interface NotificationContent {
  title: string;
  body: string;
  data?: Record<string, any>;
}

