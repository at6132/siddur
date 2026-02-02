/**
 * Home Panels Service
 * Manages customizable panels on the home screen
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface HomePanel {
  id: string;
  type: PanelType;
  order: number;
  visible: boolean;
  size: 'small' | 'medium' | 'large';
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
  defaultSize: 'small' | 'medium' | 'large';
  isPremium?: boolean;
}

// All available panels - 100+ options
export const PANEL_DEFINITIONS: PanelDefinition[] = [
  // === ESSENTIAL ===
  { type: 'date', name: 'Date Card', description: 'Hebrew and Gregorian date with special day info', icon: '📅', category: 'essential', defaultSize: 'medium' },
  { type: 'quick_actions', name: 'Quick Actions', description: 'Fast access to calendar, library, settings', icon: '⚡', category: 'essential', defaultSize: 'small' },
  { type: 'greeting', name: 'Greeting', description: 'Personalized time-based greeting', icon: '👋', category: 'essential', defaultSize: 'small' },
  { type: 'weather', name: 'Weather', description: 'Current weather for your location', icon: '🌤️', category: 'essential', defaultSize: 'small' },
  { type: 'location', name: 'Location', description: 'Your current city for zmanim', icon: '📍', category: 'essential', defaultSize: 'small' },
  { type: 'favorites', name: 'Favorites', description: 'Quick access to your favorites', icon: '⭐', category: 'essential', defaultSize: 'medium' },
  { type: 'recent', name: 'Recently Opened', description: 'Continue where you left off', icon: '🕐', category: 'essential', defaultSize: 'medium' },
  { type: 'search', name: 'Quick Search', description: 'Search prayers and texts', icon: '🔍', category: 'essential', defaultSize: 'small' },
  
  // === CALENDAR ===
  { type: 'zmanim', name: 'Zmanim', description: 'Sunrise, sunset, and key times', icon: '🌅', category: 'calendar', defaultSize: 'medium' },
  { type: 'zmanim_full', name: 'Full Zmanim', description: 'All halachic times for today', icon: '⏰', category: 'calendar', defaultSize: 'large' },
  { type: 'shabbos_times', name: 'Shabbos Times', description: 'Candle lighting and Havdalah', icon: '🕯️', category: 'calendar', defaultSize: 'medium' },
  { type: 'weekly_parsha', name: 'Weekly Parsha', description: 'This week\'s Torah portion', icon: '📜', category: 'calendar', defaultSize: 'small' },
  { type: 'candle_lighting', name: 'Candle Lighting', description: 'Countdown to candle lighting', icon: '🕯️', category: 'calendar', defaultSize: 'small' },
  { type: 'havdalah', name: 'Havdalah', description: 'Countdown to Havdalah time', icon: '✨', category: 'calendar', defaultSize: 'small' },
  { type: 'fast_day_info', name: 'Fast Day Progress', description: 'Fast start/end with progress bar', icon: '🌙', category: 'calendar', defaultSize: 'medium' },
  { type: 'omer_counter', name: 'Omer Counter', description: 'Sefiras HaOmer day count', icon: '🌾', category: 'calendar', defaultSize: 'medium' },
  { type: 'rosh_chodesh', name: 'Rosh Chodesh', description: 'New month info and molad', icon: '🌙', category: 'calendar', defaultSize: 'small' },
  { type: 'upcoming_holidays', name: 'Upcoming Holidays', description: 'Next Jewish holidays', icon: '🎉', category: 'calendar', defaultSize: 'medium' },
  { type: 'hebrew_birthday', name: 'Hebrew Birthday', description: 'Countdown to your Hebrew birthday', icon: '🎂', category: 'calendar', defaultSize: 'small' },
  { type: 'yahrzeit', name: 'Yahrzeits', description: 'Upcoming yahrzeits to remember', icon: '🕯️', category: 'calendar', defaultSize: 'medium' },
  { type: 'daf_yomi_date', name: 'Daf Yomi Date', description: 'Today\'s Daf Yomi page', icon: '📚', category: 'calendar', defaultSize: 'small' },
  { type: 'nach_yomi', name: 'Nach Yomi', description: 'Today\'s Nach chapter', icon: '📖', category: 'calendar', defaultSize: 'small' },
  { type: 'mishna_yomis', name: 'Mishna Yomis', description: 'Today\'s Mishna', icon: '📕', category: 'calendar', defaultSize: 'small' },
  { type: 'halacha_yomis', name: 'Halacha Yomis', description: 'Today\'s Halacha', icon: '⚖️', category: 'calendar', defaultSize: 'small' },
  { type: 'sunrise_sunset', name: 'Sun Times', description: 'Sunrise and sunset times', icon: '☀️', category: 'calendar', defaultSize: 'small' },
  { type: 'moon_phase', name: 'Moon Phase', description: 'Current lunar phase', icon: '🌙', category: 'calendar', defaultSize: 'small' },
  { type: 'mini_calendar', name: 'Mini Calendar', description: 'Week view with Jewish dates', icon: '🗓️', category: 'calendar', defaultSize: 'medium' },
  { type: 'month_view', name: 'Month View', description: 'Current month at a glance', icon: '📆', category: 'calendar', defaultSize: 'large' },
  
  // === PRAYER ===
  { type: 'tehillim_progress', name: 'Daily Tehillim', description: 'Track your Tehillim progress', icon: '📖', category: 'prayer', defaultSize: 'medium' },
  { type: 'davening_note', name: 'Davening Note', description: 'Hallel, Tachanun changes', icon: '✨', category: 'prayer', defaultSize: 'small' },
  { type: 'shacharis', name: 'Shacharis', description: 'Quick access to morning prayers', icon: '🌅', category: 'prayer', defaultSize: 'small' },
  { type: 'mincha', name: 'Mincha', description: 'Quick access to afternoon prayers', icon: '☀️', category: 'prayer', defaultSize: 'small' },
  { type: 'maariv', name: 'Maariv', description: 'Quick access to evening prayers', icon: '🌙', category: 'prayer', defaultSize: 'small' },
  { type: 'brachos', name: 'Brachos', description: 'Quick bracha finder', icon: '🙏', category: 'prayer', defaultSize: 'small' },
  { type: 'bentching', name: 'Bentching', description: 'Grace after meals', icon: '🍞', category: 'prayer', defaultSize: 'small' },
  { type: 'bedtime_shema', name: 'Bedtime Shema', description: 'Shema before sleep', icon: '😴', category: 'prayer', defaultSize: 'small' },
  { type: 'modeh_ani', name: 'Modeh Ani', description: 'Morning gratitude prayer', icon: '🌄', category: 'prayer', defaultSize: 'small' },
  { type: 'travelers_prayer', name: 'Tefillas HaDerech', description: 'Traveler\'s prayer', icon: '✈️', category: 'prayer', defaultSize: 'small' },
  { type: 'prayer_for_sick', name: 'Mi Shebeirach', description: 'Prayer for the sick', icon: '💝', category: 'prayer', defaultSize: 'small' },
  { type: 'tehillim_for_sick', name: 'Tehillim for Sick', description: 'Psalms for healing', icon: '🙏', category: 'prayer', defaultSize: 'small' },
  { type: 'shema', name: 'Shema', description: 'The Shema prayer', icon: '✡️', category: 'prayer', defaultSize: 'small' },
  { type: 'asher_yatzar', name: 'Asher Yatzar', description: 'Blessing after bathroom', icon: '💧', category: 'prayer', defaultSize: 'small' },
  { type: 'tefillin_reminder', name: 'Tefillin Reminder', description: 'Did you put on Tefillin?', icon: '📿', category: 'prayer', defaultSize: 'small' },
  { type: 'tzitzis_check', name: 'Tzitzis Check', description: 'Daily tzitzis reminder', icon: '🧵', category: 'prayer', defaultSize: 'small' },
  { type: 'kapitel', name: 'Today\'s Kapitel', description: 'Tehillim for your age', icon: '📖', category: 'prayer', defaultSize: 'small' },
  { type: 'tanya', name: 'Daily Tanya', description: 'Today\'s Tanya portion', icon: '📕', category: 'prayer', defaultSize: 'small' },
  { type: 'chitas', name: 'Chitas', description: 'Chumash, Tehillim, Tanya', icon: '📚', category: 'prayer', defaultSize: 'medium' },
  { type: 'yehi_ratzon', name: 'Yehi Ratzon', description: 'Daily intentions', icon: '🌟', category: 'prayer', defaultSize: 'small' },
  
  // === LEARNING ===
  { type: 'daf_yomi', name: 'Daf Yomi', description: 'Daily Talmud page', icon: '📚', category: 'learning', defaultSize: 'medium' },
  { type: 'parsha_summary', name: 'Parsha Summary', description: 'Weekly parsha overview', icon: '📜', category: 'learning', defaultSize: 'medium' },
  { type: 'halacha_daily', name: 'Daily Halacha', description: 'Learn one halacha daily', icon: '⚖️', category: 'learning', defaultSize: 'medium' },
  { type: 'mussar', name: 'Daily Mussar', description: 'Character improvement', icon: '💎', category: 'learning', defaultSize: 'medium' },
  { type: 'pirkei_avos', name: 'Pirkei Avos', description: 'Ethics of our fathers', icon: '📖', category: 'learning', defaultSize: 'medium' },
  { type: 'rambam_daily', name: 'Rambam Daily', description: 'Daily Maimonides study', icon: '📕', category: 'learning', defaultSize: 'small' },
  { type: 'mishnah_berurah', name: 'Mishna Berurah', description: 'Daily Halacha study', icon: '📗', category: 'learning', defaultSize: 'small' },
  { type: 'chumash_daily', name: 'Daily Chumash', description: 'Torah with Rashi', icon: '📜', category: 'learning', defaultSize: 'small' },
  { type: 'word_of_day', name: 'Hebrew Word', description: 'Learn a new Hebrew word', icon: 'א', category: 'learning', defaultSize: 'small' },
  { type: 'torah_thought', name: 'Torah Thought', description: 'Daily Torah insight', icon: '💡', category: 'learning', defaultSize: 'medium' },
  { type: 'chassidus', name: 'Daily Chassidus', description: 'Chassidic teachings', icon: '✨', category: 'learning', defaultSize: 'medium' },
  { type: 'zohar', name: 'Daily Zohar', description: 'Kabbalistic wisdom', icon: '🌟', category: 'learning', defaultSize: 'small' },
  { type: 'tehillim_meaning', name: 'Tehillim Meaning', description: 'Understand the Psalms', icon: '📖', category: 'learning', defaultSize: 'medium' },
  { type: 'jewish_history', name: 'On This Day', description: 'Jewish history today', icon: '📜', category: 'learning', defaultSize: 'medium' },
  { type: 'gedolim_story', name: 'Gedolim Story', description: 'Stories of great rabbis', icon: '👤', category: 'learning', defaultSize: 'medium' },
  { type: 'mitzvah_of_day', name: 'Mitzvah of the Day', description: 'Focus on one mitzvah', icon: '⭐', category: 'learning', defaultSize: 'small' },
  { type: 'middah_of_week', name: 'Middah of the Week', description: 'Character trait focus', icon: '💪', category: 'learning', defaultSize: 'small' },
  
  // === PERSONAL ===
  { type: 'inspiration_quote', name: 'Daily Inspiration', description: 'Uplifting Torah quotes', icon: '💭', category: 'personal', defaultSize: 'medium' },
  { type: 'custom_reminders', name: 'Custom Reminders', description: 'Your personal reminders', icon: '🔔', category: 'personal', defaultSize: 'medium' },
  { type: 'custom_countdown', name: 'Custom Countdown', description: '40-day commitments, milestones', icon: '⏳', category: 'personal', defaultSize: 'small' },
  { type: 'gratitude', name: 'Daily Gratitude', description: 'Write what you\'re thankful for', icon: '🙏', category: 'personal', defaultSize: 'medium' },
  { type: 'journal', name: 'Spiritual Journal', description: 'Daily reflections', icon: '📝', category: 'personal', defaultSize: 'medium' },
  { type: 'goals', name: 'Spiritual Goals', description: 'Track your growth goals', icon: '🎯', category: 'personal', defaultSize: 'medium' },
  { type: 'intentions', name: 'Daily Intentions', description: 'Set your kavanah for today', icon: '🌟', category: 'personal', defaultSize: 'small' },
  { type: 'chesed_tracker', name: 'Chesed Tracker', description: 'Log acts of kindness', icon: '💝', category: 'personal', defaultSize: 'small' },
  { type: 'prayer_notes', name: 'Prayer Notes', description: 'Personal tefillos', icon: '📋', category: 'personal', defaultSize: 'medium' },
  { type: 'names_to_daven', name: 'Names to Daven For', description: 'People to pray for', icon: '💕', category: 'personal', defaultSize: 'medium' },
  { type: 'affirmation', name: 'Daily Affirmation', description: 'Positive Torah thoughts', icon: '💪', category: 'personal', defaultSize: 'small' },
  { type: 'mood_tracker', name: 'Mood Tracker', description: 'Track your daily mood', icon: '😊', category: 'personal', defaultSize: 'small' },
  { type: 'notes', name: 'Quick Notes', description: 'Jot down thoughts', icon: '📝', category: 'personal', defaultSize: 'small' },
  { type: 'bookmarks', name: 'Bookmarks', description: 'Saved prayers and texts', icon: '🔖', category: 'personal', defaultSize: 'medium' },
  
  // === TRACKING ===
  { type: 'streak', name: 'Daily Streak', description: 'Track your consistency', icon: '🔥', category: 'tracking', defaultSize: 'small' },
  { type: 'tehillim_stats', name: 'Tehillim Stats', description: 'Your Tehillim statistics', icon: '📊', category: 'tracking', defaultSize: 'medium' },
  { type: 'davening_streak', name: 'Davening Streak', description: 'Days in a row davening', icon: '📈', category: 'tracking', defaultSize: 'small' },
  { type: 'learning_time', name: 'Learning Time', description: 'Track daily learning', icon: '⏱️', category: 'tracking', defaultSize: 'small' },
  { type: 'weekly_summary', name: 'Weekly Summary', description: 'Your week in review', icon: '📋', category: 'tracking', defaultSize: 'medium' },
  { type: 'monthly_goals', name: 'Monthly Goals', description: 'Track monthly progress', icon: '🎯', category: 'tracking', defaultSize: 'medium' },
  { type: 'mitzvah_counter', name: 'Mitzvah Counter', description: 'Count your mitzvos', icon: '✅', category: 'tracking', defaultSize: 'small' },
  { type: 'brachos_counter', name: 'Brachos Counter', description: '100 brachos daily', icon: '💯', category: 'tracking', defaultSize: 'small' },
  { type: 'tzedakah_tracker', name: 'Tzedakah Tracker', description: 'Track your giving', icon: '💰', category: 'tracking', defaultSize: 'small' },
  { type: 'achievements', name: 'Achievements', description: 'Milestones reached', icon: '🏆', category: 'tracking', defaultSize: 'medium' },
  { type: 'habits', name: 'Habit Tracker', description: 'Build good habits', icon: '✓', category: 'tracking', defaultSize: 'medium' },
  
  // === COMMUNITY ===
  { type: 'minyan_times', name: 'Minyan Times', description: 'Local minyan schedule', icon: '🏛️', category: 'community', defaultSize: 'medium' },
  { type: 'shul_announcements', name: 'Shul News', description: 'Community announcements', icon: '📢', category: 'community', defaultSize: 'medium' },
  { type: 'shiurim', name: 'Shiurim', description: 'Upcoming classes', icon: '🎓', category: 'community', defaultSize: 'medium' },
  { type: 'tehillim_group', name: 'Tehillim Group', description: 'Say Tehillim with others', icon: '👥', category: 'community', defaultSize: 'medium' },
  { type: 'simchas', name: 'Simchas', description: 'Community celebrations', icon: '🎊', category: 'community', defaultSize: 'medium' },
  { type: 'chesed_opportunities', name: 'Chesed Opportunities', description: 'Ways to help others', icon: '🤝', category: 'community', defaultSize: 'medium' },
  { type: 'dvar_torah_share', name: 'Share Dvar Torah', description: 'Share Torah thoughts', icon: '💬', category: 'community', defaultSize: 'small' },
  { type: 'prayer_request', name: 'Prayer Requests', description: 'Community prayers', icon: '🙏', category: 'community', defaultSize: 'medium' },
];

// Default panel configuration
const DEFAULT_PANELS: HomePanel[] = [
  { id: 'date-1', type: 'date', order: 0, visible: true, size: 'medium' },
  { id: 'zmanim-1', type: 'zmanim', order: 1, visible: true, size: 'medium' },
  { id: 'tehillim-1', type: 'tehillim_progress', order: 2, visible: true, size: 'medium' },
  { id: 'davening-1', type: 'davening_note', order: 3, visible: true, size: 'small' },
  { id: 'parsha-1', type: 'weekly_parsha', order: 4, visible: true, size: 'small' },
  { id: 'inspiration-1', type: 'inspiration_quote', order: 5, visible: true, size: 'medium' },
  { id: 'fast-1', type: 'fast_day_info', order: 6, visible: true, size: 'medium' },
];

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
      const stored = await AsyncStorage.getItem(PANELS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        log('getPanels', 'from storage', parsed.length, parsed.map((p: HomePanel) => p.id));
        return parsed;
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
      size: definition?.defaultSize || 'medium',
      config,
    };
    
    panels.push(newPanel);
    await this.savePanels(panels);
  }

  /**
   * Remove a panel
   */
  static async removePanel(panelId: string): Promise<void> {
    log('removePanel', 'called', panelId);
    const panels = await this.getPanels();
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
  static async updatePanelSize(panelId: string, size: 'small' | 'medium' | 'large'): Promise<void> {
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
