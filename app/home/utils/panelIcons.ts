import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export type PanelIconName = ComponentProps<typeof Ionicons>['name'];

/**
 * Presentation-only icon map for home panels.
 * HomePanelsService definitions still carry legacy emoji `icon` strings; screens
 * render these Ionicons instead and never show the emoji.
 */
const PANEL_ICONS: Record<string, PanelIconName> = {
  date: 'calendar-outline',
  greeting: 'sunny-outline',
  zmanim: 'time-outline',
  shabbos_times: 'flame-outline',
  weekly_parsha: 'document-text-outline',
  candle_lighting: 'flame-outline',
  fast_day_info: 'moon-outline',
  omer_counter: 'ellipsis-horizontal-circle-outline',
  rosh_chodesh: 'moon-outline',
  hebrew_birthday: 'gift-outline',
  yahrzeit: 'flame-outline',
  moon_phase: 'moon-outline',
  tehillim_progress: 'book-outline',
  davening_note: 'sparkles-outline',
  daf_yomi: 'library-outline',
  nach_yomi: 'book-outline',
  mishna_yomis: 'bookmark-outline',
  parsha_summary: 'document-text-outline',
  mussar: 'diamond-outline',
  rambam_daily: 'bookmark-outline',
  chumash_daily: 'document-text-outline',
  word_of_day: 'text-outline',
  torah_thought: 'bulb-outline',
  zohar: 'star-outline',
  jewish_history: 'hourglass-outline',
  gedolim_story: 'person-outline',
  mitzvah_of_day: 'star-outline',
  middah_of_week: 'fitness-outline',
  inspiration_quote: 'chatbubble-ellipses-outline',
  gratitude: 'heart-outline',
  tehillim_stats: 'stats-chart-outline',
  brachos_counter: 'checkmark-done-outline',
  tzedakah_tracker: 'cash-outline',
  habits: 'checkmark-circle-outline',
  minyan_times: 'business-outline',
  shul_announcements: 'megaphone-outline',
  shiurim: 'school-outline',
  tehillim_group: 'people-outline',
  simchas: 'sparkles-outline',
  chesed_opportunities: 'hand-left-outline',
  dvar_torah_share: 'chatbubble-outline',
  prayer_request: 'heart-outline',
};

const CATEGORY_ICONS: Record<string, PanelIconName> = {
  essential: 'star-outline',
  calendar: 'calendar-outline',
  prayer: 'heart-outline',
  learning: 'library-outline',
  personal: 'person-outline',
  tracking: 'stats-chart-outline',
  community: 'people-outline',
};

export function getPanelIconName(type: string): PanelIconName {
  return PANEL_ICONS[type] ?? 'apps-outline';
}

export function getCategoryIconName(category: string): PanelIconName {
  return CATEGORY_ICONS[category] ?? 'apps-outline';
}
