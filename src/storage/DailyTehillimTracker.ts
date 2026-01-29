/**
 * Daily Tehillim Progress Tracker
 * Tracks which chapters have been read each day
 * 
 * Default: Traditional 7-day weekly cycle (complete whole Tehillim each week)
 * - Yom Rishon (Sunday): 1-29
 * - Yom Sheni (Monday): 30-50
 * - Yom Shlishi (Tuesday): 51-72
 * - Yom Revii (Wednesday): 73-89
 * - Yom Chamishi (Thursday): 90-106
 * - Yom Shishi (Friday): 107-119
 * - Shabbos (Saturday): 120-150
 * 
 * Users can customize to set a smaller daily goal if needed.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  WEEKLY_TEHILLIM, 
  DAILY_TEHILLIM, 
  HEBREW_DAY_NAMES,
  TehillimGoalType,
  TehillimSettings 
} from '../content/tehillim/types';

const TEHILLIM_PROGRESS_KEY = '@tehillim_daily_progress';
const TEHILLIM_SETTINGS_KEY = '@tehillim_settings';
const TEHILLIM_CUSTOM_PROGRESS_KEY = '@tehillim_custom_progress';

interface DailyProgress {
  date: string; // YYYY-MM-DD
  chaptersCompleted: number[];
  totalChapters: number[];
  lastUpdated: number;
}

interface CustomProgress {
  currentChapter: number; // Where user is in the 150 chapters for custom mode
  lastUpdated: number;
}

const DEFAULT_SETTINGS: TehillimSettings = {
  goalType: 'weekly',
  customChaptersPerDay: 5,
};

export class DailyTehillimTracker {
  /**
   * Get today's date key
   */
  private static getDateKey(date: Date = new Date()): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Get current settings
   */
  static async getSettings(): Promise<TehillimSettings> {
    try {
      const stored = await AsyncStorage.getItem(TEHILLIM_SETTINGS_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Error reading Tehillim settings:', e);
    }
    return DEFAULT_SETTINGS;
  }

  /**
   * Save settings
   */
  static async saveSettings(settings: TehillimSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(TEHILLIM_SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Error saving Tehillim settings:', e);
    }
  }

  /**
   * Get day name for display
   */
  static getDayName(date: Date = new Date()): string {
    return HEBREW_DAY_NAMES[date.getDay()];
  }

  /**
   * Get today's chapters based on goal type
   */
  static async getTodaysChapters(date: Date = new Date()): Promise<number[]> {
    const settings = await this.getSettings();
    
    switch (settings.goalType) {
      case 'weekly':
        // Traditional 7-day cycle
        return WEEKLY_TEHILLIM[date.getDay()] || [];
      
      case 'monthly':
        // 30-day cycle based on day of month
        const dayOfMonth = date.getDate();
        const effectiveDay = Math.min(dayOfMonth, 30);
        return DAILY_TEHILLIM[effectiveDay] || [];
      
      case 'custom':
        // Custom number of chapters per day, continuing where user left off
        return this.getCustomChaptersForToday(settings.customChaptersPerDay || 5);
      
      default:
        return WEEKLY_TEHILLIM[date.getDay()] || [];
    }
  }

  /**
   * Get custom chapters for today (continuing cycle)
   */
  private static async getCustomChaptersForToday(chaptersPerDay: number): Promise<number[]> {
    try {
      const stored = await AsyncStorage.getItem(TEHILLIM_CUSTOM_PROGRESS_KEY);
      let startChapter = 1;
      
      if (stored) {
        const customProgress: CustomProgress = JSON.parse(stored);
        startChapter = customProgress.currentChapter;
        
        // Check if it's a new day - if so, we continue from where we left off
        // The currentChapter already points to where we should start today
      }
      
      // Generate today's chapters
      const chapters: number[] = [];
      for (let i = 0; i < chaptersPerDay; i++) {
        const chapter = ((startChapter - 1 + i) % 150) + 1; // Wrap around at 150
        chapters.push(chapter);
      }
      
      return chapters;
    } catch (e) {
      console.warn('Error getting custom chapters:', e);
      return Array.from({ length: chaptersPerDay }, (_, i) => i + 1);
    }
  }

  /**
   * Get current progress for today
   */
  static async getTodaysProgress(): Promise<{
    chaptersCompleted: number[];
    totalChapters: number[];
    percentComplete: number;
    chaptersRemaining: number[];
    dayName: string;
    goalType: TehillimGoalType;
  }> {
    const dateKey = this.getDateKey();
    const settings = await this.getSettings();
    const totalChapters = await this.getTodaysChapters();
    const dayName = this.getDayName();
    
    try {
      const stored = await AsyncStorage.getItem(TEHILLIM_PROGRESS_KEY);
      if (stored) {
        const progress: DailyProgress = JSON.parse(stored);
        
        // Check if it's the same day
        if (progress.date === dateKey) {
          const chaptersRemaining = totalChapters.filter(
            ch => !progress.chaptersCompleted.includes(ch)
          );
          const percentComplete = totalChapters.length > 0
            ? Math.round((progress.chaptersCompleted.filter(ch => totalChapters.includes(ch)).length / totalChapters.length) * 100)
            : 0;
            
          return {
            chaptersCompleted: progress.chaptersCompleted.filter(ch => totalChapters.includes(ch)),
            totalChapters,
            percentComplete,
            chaptersRemaining,
            dayName,
            goalType: settings.goalType,
          };
        }
      }
    } catch (e) {
      console.warn('Error reading Tehillim progress:', e);
    }

    // No progress for today
    return {
      chaptersCompleted: [],
      totalChapters,
      percentComplete: 0,
      chaptersRemaining: totalChapters,
      dayName,
      goalType: settings.goalType,
    };
  }

  /**
   * Mark a chapter as completed
   */
  static async markChapterComplete(chapter: number): Promise<void> {
    const dateKey = this.getDateKey();
    const totalChapters = await this.getTodaysChapters();
    const settings = await this.getSettings();
    
    try {
      const stored = await AsyncStorage.getItem(TEHILLIM_PROGRESS_KEY);
      let progress: DailyProgress;
      
      if (stored) {
        progress = JSON.parse(stored);
        
        // If different day, reset
        if (progress.date !== dateKey) {
          progress = {
            date: dateKey,
            chaptersCompleted: [],
            totalChapters,
            lastUpdated: Date.now(),
          };
        }
      } else {
        progress = {
          date: dateKey,
          chaptersCompleted: [],
          totalChapters,
          lastUpdated: Date.now(),
        };
      }

      // Add chapter if not already completed
      if (!progress.chaptersCompleted.includes(chapter)) {
        progress.chaptersCompleted.push(chapter);
        progress.lastUpdated = Date.now();
        await AsyncStorage.setItem(TEHILLIM_PROGRESS_KEY, JSON.stringify(progress));
        
        // For custom mode, update the current chapter pointer when all today's chapters are done
        if (settings.goalType === 'custom') {
          const remaining = totalChapters.filter(ch => !progress.chaptersCompleted.includes(ch));
          if (remaining.length === 0) {
            // All today's chapters completed, set next starting point
            const maxChapter = Math.max(...totalChapters);
            const nextChapter = (maxChapter % 150) + 1;
            await this.saveCustomProgress(nextChapter);
          }
        }
      }
    } catch (e) {
      console.warn('Error saving Tehillim progress:', e);
    }
  }

  /**
   * Save custom progress pointer
   */
  private static async saveCustomProgress(currentChapter: number): Promise<void> {
    const customProgress: CustomProgress = {
      currentChapter,
      lastUpdated: Date.now(),
    };
    await AsyncStorage.setItem(TEHILLIM_CUSTOM_PROGRESS_KEY, JSON.stringify(customProgress));
  }

  /**
   * Mark multiple chapters as completed
   */
  static async markChaptersComplete(chapters: number[]): Promise<void> {
    for (const chapter of chapters) {
      await this.markChapterComplete(chapter);
    }
  }

  /**
   * Get the next chapter to read
   */
  static async getNextChapter(): Promise<number | null> {
    const progress = await this.getTodaysProgress();
    return progress.chaptersRemaining.length > 0 ? progress.chaptersRemaining[0] : null;
  }

  /**
   * Reset today's progress
   */
  static async resetTodaysProgress(): Promise<void> {
    const dateKey = this.getDateKey();
    const totalChapters = await this.getTodaysChapters();
    
    const progress: DailyProgress = {
      date: dateKey,
      chaptersCompleted: [],
      totalChapters,
      lastUpdated: Date.now(),
    };
    
    await AsyncStorage.setItem(TEHILLIM_PROGRESS_KEY, JSON.stringify(progress));
  }

  /**
   * Check if today's Tehillim is complete
   */
  static async isComplete(): Promise<boolean> {
    const progress = await this.getTodaysProgress();
    return progress.chaptersRemaining.length === 0 && progress.totalChapters.length > 0;
  }

  /**
   * Get motivational message based on progress and time of day
   */
  static async getMotivationalMessage(): Promise<string> {
    const progress = await this.getTodaysProgress();
    const hour = new Date().getHours();
    const percent = progress.percentComplete;
    const remaining = progress.chaptersRemaining.length;
    const total = progress.totalChapters.length;

    if (percent === 100) {
      return `${progress.dayName}'s Tehillim complete! ✨`;
    }

    if (percent === 0) {
      if (hour < 12) {
        return `${progress.dayName}: ${total} chapters • Start your day`;
      } else if (hour < 18) {
        return `${progress.dayName}: ${total} chapters waiting`;
      } else {
        return `${remaining} chapters left for ${progress.dayName}`;
      }
    }

    if (hour >= 20 && percent < 100) {
      return `Almost done! ${remaining} chapters left tonight`;
    }

    if (percent >= 80) {
      return `So close! Just ${remaining} more to go`;
    }

    if (percent >= 50) {
      return `Halfway through ${progress.dayName} • ${remaining} left`;
    }

    return `${progress.dayName} • ${percent}% complete`;
  }

  /**
   * Get goal description
   */
  static async getGoalDescription(): Promise<string> {
    const settings = await this.getSettings();
    switch (settings.goalType) {
      case 'weekly':
        return 'Complete Tehillim every week';
      case 'monthly':
        return 'Complete Tehillim every month';
      case 'custom':
        return `${settings.customChaptersPerDay} chapters per day`;
      default:
        return 'Weekly cycle';
    }
  }

  /**
   * Get streak info (consecutive days completed)
   */
  static async getStreak(): Promise<number> {
    // For future implementation - track multi-day streaks
    const isComplete = await this.isComplete();
    return isComplete ? 1 : 0;
  }
}
