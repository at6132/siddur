/**
 * Daily Tehillim Progress Tracker
 * Tracks which chapters have been read each day for the monthly Tehillim cycle
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DAILY_TEHILLIM } from '../content/tehillim/types';

const TEHILLIM_PROGRESS_KEY = '@tehillim_daily_progress';

interface DailyProgress {
  date: string; // YYYY-MM-DD
  chaptersCompleted: number[];
  totalChapters: number[];
  lastUpdated: number;
}

export class DailyTehillimTracker {
  /**
   * Get today's date key
   */
  private static getDateKey(date: Date = new Date()): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Get today's chapters based on day of month
   */
  static getTodaysChapters(date: Date = new Date()): number[] {
    const dayOfMonth = date.getDate();
    // If it's day 30 or 31, use day 30's chapters (last day gets remaining)
    const effectiveDay = Math.min(dayOfMonth, 30);
    return DAILY_TEHILLIM[effectiveDay] || [];
  }

  /**
   * Get current progress for today
   */
  static async getTodaysProgress(): Promise<{
    chaptersCompleted: number[];
    totalChapters: number[];
    percentComplete: number;
    chaptersRemaining: number[];
  }> {
    const dateKey = this.getDateKey();
    const totalChapters = this.getTodaysChapters();
    
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
            ? Math.round((progress.chaptersCompleted.length / totalChapters.length) * 100)
            : 0;
            
          return {
            chaptersCompleted: progress.chaptersCompleted,
            totalChapters,
            percentComplete,
            chaptersRemaining,
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
    };
  }

  /**
   * Mark a chapter as completed
   */
  static async markChapterComplete(chapter: number): Promise<void> {
    const dateKey = this.getDateKey();
    const totalChapters = this.getTodaysChapters();
    
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
      }
    } catch (e) {
      console.warn('Error saving Tehillim progress:', e);
    }
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
    const totalChapters = this.getTodaysChapters();
    
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

    if (percent === 100) {
      return "You've completed today's Tehillim! ✨";
    }

    if (percent === 0) {
      if (hour < 12) {
        return `Start your day with Tehillim • ${remaining} chapters`;
      } else if (hour < 18) {
        return `${remaining} chapters waiting for you`;
      } else {
        return `Still time to begin • ${remaining} chapters`;
      }
    }

    if (hour >= 20 && percent < 100) {
      return `Almost done! ${remaining} chapters left tonight`;
    }

    if (percent >= 80) {
      return `So close! Just ${remaining} more to go`;
    }

    if (percent >= 50) {
      return `Halfway there • ${remaining} chapters remaining`;
    }

    return `Keep going • ${percent}% complete`;
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
