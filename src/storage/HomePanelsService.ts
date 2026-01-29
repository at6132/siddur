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

export type PanelType = 
  | 'date'
  | 'tehillim_progress'
  | 'zmanim'
  | 'quick_actions'
  | 'davening_note'
  | 'omer_counter'
  | 'custom_countdown'
  | 'inspiration_quote'
  | 'shabbos_times'
  | 'weekly_parsha'
  | 'candle_lighting'
  | 'fast_day_info';

export interface PanelDefinition {
  type: PanelType;
  name: string;
  description: string;
  icon: string;
  category: 'essential' | 'calendar' | 'prayer' | 'personal';
  defaultSize: 'small' | 'medium' | 'large';
  isPremium?: boolean;
}

// All available panels
export const PANEL_DEFINITIONS: PanelDefinition[] = [
  {
    type: 'date',
    name: 'Date Card',
    description: 'Hebrew and Gregorian date with special day info',
    icon: '📅',
    category: 'essential',
    defaultSize: 'medium',
  },
  {
    type: 'tehillim_progress',
    name: 'Daily Tehillim',
    description: 'Track your daily Tehillim progress',
    icon: '📖',
    category: 'prayer',
    defaultSize: 'medium',
  },
  {
    type: 'zmanim',
    name: 'Zmanim',
    description: 'Sunrise, sunset, and key prayer times',
    icon: '🌅',
    category: 'calendar',
    defaultSize: 'small',
  },
  {
    type: 'quick_actions',
    name: 'Quick Actions',
    description: 'Fast access to calendar, Tehillim, settings',
    icon: '⚡',
    category: 'essential',
    defaultSize: 'small',
  },
  {
    type: 'davening_note',
    name: 'Davening Note',
    description: 'Hallel, Tachanun, and other daily changes',
    icon: '✨',
    category: 'prayer',
    defaultSize: 'small',
  },
  {
    type: 'omer_counter',
    name: 'Omer Counter',
    description: 'Sefiras HaOmer day and week count',
    icon: '🌾',
    category: 'calendar',
    defaultSize: 'medium',
  },
  {
    type: 'custom_countdown',
    name: 'Custom Countdown',
    description: '40-day Nishmas, personal milestones',
    icon: '⏳',
    category: 'personal',
    defaultSize: 'small',
  },
  {
    type: 'inspiration_quote',
    name: 'Daily Inspiration',
    description: 'Uplifting Torah quotes and thoughts',
    icon: '💭',
    category: 'personal',
    defaultSize: 'medium',
  },
  {
    type: 'shabbos_times',
    name: 'Shabbos Times',
    description: 'Candle lighting and Havdalah times',
    icon: '🕯️',
    category: 'calendar',
    defaultSize: 'medium',
  },
  {
    type: 'weekly_parsha',
    name: 'Weekly Parsha',
    description: 'This week\'s Torah portion',
    icon: '📜',
    category: 'calendar',
    defaultSize: 'small',
  },
  {
    type: 'candle_lighting',
    name: 'Candle Lighting',
    description: 'Countdown to candle lighting on Friday',
    icon: '🕯️',
    category: 'calendar',
    defaultSize: 'small',
  },
  {
    type: 'fast_day_info',
    name: 'Fast Day Info',
    description: 'Fast start/end times on fast days',
    icon: '🌙',
    category: 'calendar',
    defaultSize: 'medium',
  },
];

// Default panel configuration
const DEFAULT_PANELS: HomePanel[] = [
  { id: 'date-1', type: 'date', order: 0, visible: true, size: 'medium' },
  { id: 'tehillim-1', type: 'tehillim_progress', order: 1, visible: true, size: 'medium' },
  { id: 'zmanim-1', type: 'zmanim', order: 2, visible: true, size: 'small' },
  { id: 'quick-1', type: 'quick_actions', order: 3, visible: true, size: 'small' },
  { id: 'davening-1', type: 'davening_note', order: 4, visible: true, size: 'small' },
];

const PANELS_STORAGE_KEY = '@home_panels';

export class HomePanelsService {
  /**
   * Get all configured panels
   */
  static async getPanels(): Promise<HomePanel[]> {
    try {
      const stored = await AsyncStorage.getItem(PANELS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
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
    const panels = await this.getPanels();
    const filtered = panels.filter(p => p.id !== panelId);
    // Reorder remaining panels
    filtered.forEach((p, i) => p.order = i);
    await this.savePanels(filtered);
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
