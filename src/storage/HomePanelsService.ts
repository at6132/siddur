/**
 * Home Panels Service
 * Manages customizable panels on the home screen
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type PanelSize = 'half' | 'full';

export interface HomePanel {
  id: string;
  type: PanelType;
  order: number;
  visible: boolean;
  size: PanelSize;
  config?: Record<string, any>;
}

export type PanelType = string; // Allow any panel type for flexibility

export type PanelCategory = 'essential' | 'calendar' | 'prayer' | 'learning' | 'personal' | 'tracking' | 'community';

export interface PanelDefinition {
  type: PanelType;
  name: string;
  description: string;
  icon: string;
  category: PanelCategory;
  defaultSize: PanelSize;
  isPremium?: boolean;
  /** Short help text shown when user taps ? on the panel in the marketplace */
  explanation?: string;
}

// All available panels – two sizes only: half (shorter) or full (taller); all full width
export const PANEL_DEFINITIONS: PanelDefinition[] = [
  // === ESSENTIAL ===
  { type: 'date', name: 'Date Card', description: 'Hebrew and Gregorian date with special day info', icon: '📅', category: 'essential', defaultSize: 'full', explanation: 'Shows today\'s Hebrew and secular date, and highlights special days (Rosh Chodesh, fast days, etc.).' },
  { type: 'greeting', name: 'Greeting', description: 'Personalized time-based greeting', icon: '👋', category: 'essential', defaultSize: 'half', explanation: 'A friendly good morning/afternoon/evening greeting to start your day.' },
  // === CALENDAR ===
  { type: 'zmanim', name: 'Zmanim', description: 'Sunrise, sunset, and key times', icon: '🌅', category: 'calendar', defaultSize: 'full', explanation: 'Key halachic times for today: sunrise, sunset, zmanim. Tap to open the full calendar.' },
  { type: 'shabbos_times', name: 'Shabbos Times', description: 'Candle lighting and Havdalah', icon: '🕯️', category: 'calendar', defaultSize: 'full', explanation: 'This week\'s candle lighting and Havdalah times. Tap for the full calendar.' },
  { type: 'weekly_parsha', name: 'Weekly Parsha', description: 'This week\'s Torah portion', icon: '📜', category: 'calendar', defaultSize: 'half', explanation: 'Shows the current week\'s Torah portion. Tap to open the calendar.' },
  { type: 'candle_lighting', name: 'Candle Lighting', description: 'Countdown to candle lighting', icon: '🕯️', category: 'calendar', defaultSize: 'half', explanation: 'Countdown until candle lighting time. Tap to open the calendar.' },
  { type: 'fast_day_info', name: 'Fast Day Progress', description: 'Fast start/end with progress bar', icon: '🌙', category: 'calendar', defaultSize: 'full', explanation: 'On fast days, shows start/end times and a progress bar. Tap for the calendar.' },
  { type: 'omer_counter', name: 'Omer Counter', description: 'Sefiras HaOmer day count', icon: '🌾', category: 'calendar', defaultSize: 'full', explanation: 'Shows which day of the Omer we are. Tap to open the calendar.' },
  { type: 'rosh_chodesh', name: 'Rosh Chodesh', description: 'New month info and molad', icon: '🌙', category: 'calendar', defaultSize: 'half', explanation: 'Rosh Chodesh and molad info. Tap to open the calendar.' },
  { type: 'hebrew_birthday', name: 'Hebrew Birthday', description: 'Countdown to your Hebrew birthday', icon: '🎂', category: 'calendar', defaultSize: 'half', explanation: 'Countdown to your Hebrew birthday (set in Settings). Tap for calendar.' },
  { type: 'yahrzeit', name: 'Yahrzeit', description: 'Today\'s gedolim yahrzeit', icon: '🕯️', category: 'calendar', defaultSize: 'full', explanation: 'Shows whose yahrzeit it is today from a database of holy rabbis. Cycles by year so different years show different rabbis. Tap to open the calendar.' },
  { type: 'moon_phase', name: 'Moon Phase', description: 'Current lunar phase', icon: '🌙', category: 'calendar', defaultSize: 'half', explanation: 'Current moon phase. Tap to open the calendar.' },
  
  // === PRAYER ===
  { type: 'tehillim_progress', name: 'Daily Tehillim', description: 'Track your Tehillim progress', icon: '📖', category: 'prayer', defaultSize: 'full', explanation: 'Tracks your daily Tehillim. Tap to open Tehillim and continue where you left off.' },
  { type: 'davening_note', name: 'Davening Note', description: 'Hallel, Tachanun changes', icon: '✨', category: 'prayer', defaultSize: 'full', explanation: 'Shows today\'s davening changes (e.g. Hallel, Tachanun). Tap to open the calendar.' },
  
  // === LEARNING ===
  { type: 'daf_yomi', name: 'Daf Yomi', description: 'Daily Talmud page', icon: '📚', category: 'learning', defaultSize: 'half', explanation: 'Today\'s Daf Yomi. Tap to open the Library for learning.' },
  { type: 'nach_yomi', name: 'Nach Yomi', description: 'Today\'s Nach chapter', icon: '📖', category: 'learning', defaultSize: 'half', explanation: 'Today\'s Nach Yomi chapter. Tap to open the Library.' },
  { type: 'mishna_yomis', name: 'Mishna Yomi', description: 'Today\'s Mishna', icon: '📕', category: 'learning', defaultSize: 'half', explanation: 'Today\'s Mishna Yomi. Tap to open the Library.' },
  { type: 'parsha_summary', name: 'Parsha Summary', description: 'Weekly parsha overview', icon: '📜', category: 'learning', defaultSize: 'full', explanation: 'Summary of the weekly parsha. Tap to open the Library.' },
  { type: 'mussar', name: 'Daily Mussar', description: 'Character improvement', icon: '💎', category: 'learning', defaultSize: 'full', explanation: 'Daily mussar (character) teaching. Tap to open the Library.' },
  { type: 'rambam_daily', name: 'Rambam Daily', description: 'Rambam Yomi (3 chapters/day)', icon: '📕', category: 'learning', defaultSize: 'half', explanation: 'Today\'s Rambam Yomi (Mishneh Torah). Tap to open today\'s 3 chapters.' },
  { type: 'chumash_daily', name: 'Shneyim Mikra VeChad Targum', description: 'Twice Scripture, once Targum', icon: '📜', category: 'learning', defaultSize: 'half', explanation: 'Shneyim Mikra VeChad Targum – read each verse twice in Hebrew, once in Targum. Tap to open.' },
  { type: 'word_of_day', name: 'Hebrew Word', description: 'Learn a new Hebrew word', icon: 'א', category: 'learning', defaultSize: 'half', explanation: 'A new Hebrew word to learn each day. Tap to open the Library.' },
  { type: 'torah_thought', name: 'Torah Thought', description: 'Daily Torah insight', icon: '💡', category: 'learning', defaultSize: 'full', explanation: 'Daily Torah thought or insight. Tap to open the Library.' },
  { type: 'zohar', name: 'Daily Zohar', description: 'Kabbalistic wisdom', icon: '🌟', category: 'learning', defaultSize: 'half', explanation: 'Daily Zohar portion. Tap to open the Library.' },
  { type: 'jewish_history', name: 'On This Day', description: 'Jewish history today', icon: '📜', category: 'learning', defaultSize: 'full', explanation: 'Jewish history that happened on this date. Tap to open the Library.' },
  { type: 'gedolim_story', name: 'Gedolim Story', description: 'Stories of great rabbis', icon: '👤', category: 'learning', defaultSize: 'full', explanation: 'Stories of gedolim. Tap to open the Library.' },
  { type: 'mitzvah_of_day', name: 'Mitzvah of the Day', description: 'Focus on one mitzvah', icon: '⭐', category: 'learning', defaultSize: 'half', explanation: 'One mitzvah to focus on today. Tap to open the Library.' },
  { type: 'middah_of_week', name: 'Middah of the Week', description: 'Character trait focus', icon: '💪', category: 'learning', defaultSize: 'half', explanation: 'Weekly character trait (middah) to work on. Tap to open the Library.' },
  
  // === PERSONAL ===
  { type: 'inspiration_quote', name: 'Daily Inspiration', description: 'Uplifting Torah quotes', icon: '💭', category: 'personal', defaultSize: 'full', explanation: 'A daily Torah quote for inspiration. Shown on your home screen.' },
  { type: 'gratitude', name: 'Daily Gratitude', description: 'Write what you\'re thankful for', icon: '🙏', category: 'personal', defaultSize: 'full', explanation: 'Log what you\'re grateful for. Tap to open notes or settings.' },
  // === TRACKING ===
  { type: 'tehillim_stats', name: 'Tehillim Stats', description: 'Your Tehillim statistics', icon: '📊', category: 'tracking', defaultSize: 'full', explanation: 'Stats for your Tehillim completion. Tap to open Tehillim and see more.' },
  { type: 'brachos_counter', name: 'Brachos Counter', description: '100 brachos daily', icon: '💯', category: 'tracking', defaultSize: 'half', explanation: 'Track toward 100 brachos a day. Tap to add brachos or open the Library.' },
  { type: 'tzedakah_tracker', name: 'Tzedakah Tracker', description: 'Track your giving', icon: '💰', category: 'tracking', defaultSize: 'half', explanation: 'Log tzedakah. Tap to add an entry or view history.' },
  { type: 'habits', name: 'Habit Tracker', description: 'Build good habits', icon: '✓', category: 'tracking', defaultSize: 'full', explanation: 'Track daily habits (davening, learning, etc.). Tap to check off or edit.' },
  
  // === COMMUNITY ===
  { type: 'minyan_times', name: 'Minyan Times', description: 'Local minyan schedule', icon: '🏛️', category: 'community', defaultSize: 'full', explanation: 'Shows minyan times for your shul (set in Settings). Tap to open Settings or calendar.' },
  { type: 'shul_announcements', name: 'Shul News', description: 'Community announcements', icon: '📢', category: 'community', defaultSize: 'full', explanation: 'Announcements from your shul. Tap to open or add your shul in Settings.' },
  { type: 'shiurim', name: 'Shiurim', description: 'Upcoming classes', icon: '🎓', category: 'community', defaultSize: 'full', explanation: 'Upcoming shiurim and classes. Tap to open or add in Settings.' },
  { type: 'tehillim_group', name: 'Tehillim Group', description: 'Say Tehillim with others', icon: '👥', category: 'community', defaultSize: 'full', explanation: 'Connect with others saying Tehillim. Tap to open Tehillim or group settings.' },
  { type: 'simchas', name: 'Simchas', description: 'Community celebrations', icon: '🎊', category: 'community', defaultSize: 'full', explanation: 'Upcoming simchas in the community. Tap to view or add in Settings.' },
  { type: 'chesed_opportunities', name: 'Chesed Opportunities', description: 'Ways to help others', icon: '🤝', category: 'community', defaultSize: 'full', explanation: 'Chesed opportunities and volunteer needs. Tap to open or add in Settings.' },
  { type: 'dvar_torah_share', name: 'Share Dvar Torah', description: 'Share Torah thoughts', icon: '💬', category: 'community', defaultSize: 'half', explanation: 'Share a dvar Torah with others. Tap to open the Library or share.' },
  { type: 'prayer_request', name: 'Prayer Requests', description: 'Community prayers', icon: '🙏', category: 'community', defaultSize: 'full', explanation: 'Community prayer requests. Tap to view or add a name in Settings.' },
];

// Default panel configuration (normal home layout)
const DEFAULT_PANELS: HomePanel[] = [
  { id: 'date-1', type: 'date', order: 0, visible: true, size: 'full' },
  { id: 'zmanim-1', type: 'zmanim', order: 1, visible: true, size: 'full' },
  { id: 'tehillim-1', type: 'tehillim_progress', order: 2, visible: true, size: 'full' },
  { id: 'davening-1', type: 'davening_note', order: 3, visible: true, size: 'full' },
  { id: 'inspiration-1', type: 'inspiration_quote', order: 4, visible: true, size: 'full' },
];

/** Set to true to load every widget on home for testing; set back to false when done. */
const TESTING_ALL_WIDGETS = false;

const PANELS_STORAGE_KEY = '@home_panels';
const DEBUG_PANELS = true;
const log = (tag: string, ...args: any[]) => {
  if (DEBUG_PANELS) console.log(`[HomePanelsService ${tag}]`, ...args);
};

export class HomePanelsService {
  /**
   * Get all configured panels
   */
  static async getPanels(): Promise<HomePanel[]> {
    try {
      if (TESTING_ALL_WIDGETS) {
        log('getPanels', 'TESTING_ALL_WIDGETS: returning all', DEFAULT_PANELS.length);
        return DEFAULT_PANELS;
      }
      const stored = await AsyncStorage.getItem(PANELS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const filtered = parsed.filter((p: HomePanel) => !['weather', 'location', 'favorites', 'recent', 'search', 'zmanim_full', 'havdalah', 'upcoming_holidays', 'halacha_yomis', 'sunrise_sunset', 'mini_calendar', 'month_view', 'shacharis', 'mincha', 'maariv', 'brachos', 'bentching', 'bedtime_shema', 'modeh_ani', 'travelers_prayer', 'prayer_for_sick', 'tehillim_for_sick', 'shema', 'asher_yatzar', 'tefillin_reminder', 'tzitzis_check', 'kapitel', 'tanya', 'chitas', 'yehi_ratzon', 'daf_yomi_date', 'halacha_daily', 'quick_actions', 'names_to_daven'].includes(p.type));
        if (filtered.length !== parsed.length) {
          filtered.forEach((p: HomePanel, i: number) => p.order = i);
          await this.savePanels(filtered);
        }
        // Migrate old size values to half | full
        const migrated = filtered.map((p: HomePanel) => {
          const size = p.size as string;
          if (size !== 'half' && size !== 'full') {
            p.size = size === 'large' ? 'full' : 'half';
          }
          return p;
        });
        log('getPanels', 'from storage', migrated.length, migrated.map((p: HomePanel) => p.id));
        return migrated;
      }
      log('getPanels', 'no storage, using DEFAULT_PANELS');
    } catch (e) {
      console.warn('Error loading panels:', e);
    }
    return DEFAULT_PANELS;
  }

  /**
   * Save panels configuration
   */
  static async savePanels(panels: HomePanel[]): Promise<void> {
    if (TESTING_ALL_WIDGETS) return; // don't overwrite saved layout while testing
    try {
      await AsyncStorage.setItem(PANELS_STORAGE_KEY, JSON.stringify(panels));
    } catch (e) {
      console.warn('Error saving panels:', e);
    }
  }

  /**
   * Add a new panel
   */
  static async addPanel(type: PanelType, config?: Record<string, any>): Promise<void> {
    const panels = await this.getPanels();
    const definition = PANEL_DEFINITIONS.find(p => p.type === type);
    
    const newPanel: HomePanel = {
      id: `${type}-${Date.now()}`,
      type,
      order: panels.length,
      visible: true,
      size: definition?.defaultSize || 'half',
      config,
    };
    
    panels.push(newPanel);
    await this.savePanels(panels);
  }

  /** Panel types that cannot be removed (always on home when relevant). */
  static readonly UNREMOVABLE_TYPES = ['davening_note', 'fast_day_info', 'omer_counter', 'rosh_chodesh'] as const;

  /**
   * Remove a panel
   */
  static async removePanel(panelId: string): Promise<void> {
    log('removePanel', 'called', panelId);
    const panels = await this.getPanels();
    const panel = panels.find(p => p.id === panelId);
    if (panel && this.UNREMOVABLE_TYPES.includes(panel.type as any)) {
      log('removePanel', 'blocked - unremovable type', panel.type);
      return;
    }
    log('removePanel', 'before filter', panels.length, panels.map(p => p.id));
    const filtered = panels.filter(p => p.id !== panelId);
    log('removePanel', 'after filter', filtered.length, filtered.map(p => p.id));
    filtered.forEach((p, i) => p.order = i);
    await this.savePanels(filtered);
    log('removePanel', 'savePanels done');
  }

  /**
   * Update panel order
   */
  static async reorderPanels(panelIds: string[]): Promise<void> {
    const panels = await this.getPanels();
    const reordered = panelIds.map((id, index) => {
      const panel = panels.find(p => p.id === id);
      if (panel) {
        panel.order = index;
      }
      return panel;
    }).filter(Boolean) as HomePanel[];
    
    await this.savePanels(reordered);
  }

  /**
   * Toggle panel visibility
   */
  static async togglePanelVisibility(panelId: string): Promise<void> {
    const panels = await this.getPanels();
    const panel = panels.find(p => p.id === panelId);
    if (panel) {
      panel.visible = !panel.visible;
      await this.savePanels(panels);
    }
  }

  /**
   * Update panel config
   */
  static async updatePanelConfig(panelId: string, config: Record<string, any>): Promise<void> {
    const panels = await this.getPanels();
    const panel = panels.find(p => p.id === panelId);
    if (panel) {
      panel.config = { ...panel.config, ...config };
      await this.savePanels(panels);
    }
  }

  /**
   * Update panel size
   */
  static async updatePanelSize(panelId: string, size: PanelSize): Promise<void> {
    log('updatePanelSize', panelId, size);
    const panels = await this.getPanels();
    const panel = panels.find(p => p.id === panelId);
    if (panel) {
      panel.size = size;
      await this.savePanels(panels);
      log('updatePanelSize', 'done');
    } else {
      log('updatePanelSize', 'panel not found');
    }
  }

  /**
   * Reset to default panels
   */
  static async resetToDefault(): Promise<void> {
    await this.savePanels(DEFAULT_PANELS);
  }

  /**
   * Get panel definition
   */
  static getPanelDefinition(type: PanelType): PanelDefinition | undefined {
    return PANEL_DEFINITIONS.find(p => p.type === type);
  }

  /**
   * Get panels by category
   */
  static getPanelsByCategory(category: PanelDefinition['category']): PanelDefinition[] {
    return PANEL_DEFINITIONS.filter(p => p.category === category);
  }
}
