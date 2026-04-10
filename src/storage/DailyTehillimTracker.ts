/**
 * Daily Tehillim Progress Tracker
 * Tracks which chapters have been read each day
 *
 * Weekly: Traditional 7-day cycle (complete whole Tehillim each week) — global week.
 *
 * Monthly: Follows the global monthly Tehillim cycle so everyone says the same portion that day.
 * Uses Hebrew calendar only: knows which months have 29 vs 30 days; on the last day of a
 * 29-day month, portions 29 and 30 are combined (same as Hebcal/Chabad). Day 1 = portion 1, … day 30 = portion 30.
 * "This month" = current Hebrew month; progress resets at Rosh Chodesh.
 *
 * Users can also choose custom daily goal or "whenever you can".
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { JewishCalendarService } from '../core/calendar/JewishCalendar';
import { toLocalDateString } from '../utils/dateUtils';
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
const TEHILLIM_COMPLETED_DAYS_KEY = '@tehillim_completed_days';
const TEHILLIM_WPM_READINGS_KEY = '@tehillim_wpm_readings';
const TEHILLIM_WHENEVER_COMPLETED_KEY = '@tehillim_whenever_completed';
const TEHILLIM_WHENEVER_DAYS_KEY = '@tehillim_whenever_days'; // dates when user did at least 1 perek in whenever mode
const TEHILLIM_WEEKLY_COMPLETED_KEY = '@tehillim_weekly_completed';
const TEHILLIM_MONTHLY_COMPLETED_KEY = '@tehillim_monthly_completed';
const TEHILLIM_FULL_BOOK_COMPLETIONS_KEY = '@tehillim_full_book_completions_count';

const ALL_CHAPTERS = Array.from({ length: 150 }, (_, i) => i + 1);

/** Sunday-based week key (YYYY-MM-DD of Sunday) */
function getWeekKey(date: Date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return toLocalDateString(d);
}

/** Hebrew month key for the global monthly Tehillim cycle (e.g. "5784-7" = Tishrei 5784). */
function getHebrewMonthKey(date: Date = new Date()): string {
  const hdate = JewishCalendarService.getJewishDate(date);
  return `${hdate.getFullYear()}-${hdate.getMonth()}`;
}

/** Day of Hebrew month (1–30) for the global monthly Tehillim cycle. Same schedule worldwide (Hebcal/Chabad). */
function getHebrewDayOfMonth(date: Date = new Date()): number {
  const hdate = JewishCalendarService.getJewishDate(date);
  const day = hdate.getDate();
  return Math.min(day, 30);
}

/** Today's chapters for monthly cycle. On last day of a 29-day Hebrew month, portions 29+30 are combined (same as everyone). */
function getMonthlyChaptersForDate(date: Date = new Date()): number[] {
  const day = getHebrewDayOfMonth(date);
  const daysInMonth = JewishCalendarService.getDaysInHebrewMonth(date);
  if (day === 29 && daysInMonth === 29) {
    const p29 = DAILY_TEHILLIM[29] || [];
    const p30 = DAILY_TEHILLIM[30] || [];
    return [...p29, ...p30];
  }
  return DAILY_TEHILLIM[day] || [];
}

const MAX_WPM_READINGS = 50;

interface WpmReading {
  wpm: number;
  date: string;
}

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

interface PeriodProgress {
  periodKey: string;
  chapters: number[];
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
    return toLocalDateString(date);
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
   * Save settings. When switching to "whenever" mode, transfers progress from the
   * current mode (weekly/monthly/custom) into the whenever-completed set.
   */
  static async saveSettings(settings: TehillimSettings): Promise<void> {
    try {
      if (settings.goalType === 'whenever') {
        const previous = await this.getSettings();
        let toTransfer: number[] = [];
        if (previous.goalType === 'weekly') {
          toTransfer = await this.getWeeklyCompleted();
        } else if (previous.goalType === 'monthly') {
          toTransfer = await this.getMonthlyCompleted();
        } else if (previous.goalType === 'custom') {
          const n = await this.getCustomCycleCompleted();
          toTransfer = Array.from({ length: n }, (_, i) => i + 1);
        }
        if (toTransfer.length > 0) {
          const existing = await this.getWheneverCompleted();
          const merged = [...new Set([...existing, ...toTransfer])].filter(
            (c) => c >= 1 && c <= 150
          );
          await this.saveWheneverCompleted(merged);
          await this.addWheneverCompletedDay(this.getDateKey());
        }
      }
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
   * Get today's chapters based on goal type.
   * For 'whenever' mode there is no daily set — use getWheneverCompleted() for progress.
   */
  static async getTodaysChapters(date: Date = new Date()): Promise<number[]> {
    const settings = await this.getSettings();
    
    switch (settings.goalType) {
      case 'weekly':
        return WEEKLY_TEHILLIM[date.getDay()] || [];
      case 'monthly':
        return getMonthlyChaptersForDate(date);
      case 'custom':
        return this.getCustomChaptersForToday(settings.customChaptersPerDay || 5);
      case 'whenever':
        return []; // No daily list; progress is % of all 150
      default:
        return WEEKLY_TEHILLIM[date.getDay()] || [];
    }
  }

  /**
   * Get the set of chapter numbers completed in "whenever" mode (persistent, any order).
   */
  static async getWheneverCompleted(): Promise<number[]> {
    try {
      const raw = await AsyncStorage.getItem(TEHILLIM_WHENEVER_COMPLETED_KEY);
      if (!raw) return [];
      const arr: number[] = JSON.parse(raw);
      return Array.isArray(arr) ? arr.filter((n) => Number.isInteger(n) && n >= 1 && n <= 150) : [];
    } catch (e) {
      console.warn('Error reading whenever-completed Tehillim:', e);
      return [];
    }
  }

  /**
   * Save whenever-mode completed chapters.
   */
  private static async saveWheneverCompleted(chapters: number[]): Promise<void> {
    const deduped = [...new Set(chapters)].filter((n) => n >= 1 && n <= 150).sort((a, b) => a - b);
    await AsyncStorage.setItem(TEHILLIM_WHENEVER_COMPLETED_KEY, JSON.stringify(deduped));
  }

  /**
   * Get chapters completed this week (weekly mode). Resets if week changed.
   * Backfills from today's daily progress if weekly storage is empty (same week).
   */
  private static async getWeeklyCompleted(): Promise<number[]> {
    const weekKey = getWeekKey();
    try {
      const raw = await AsyncStorage.getItem(TEHILLIM_WEEKLY_COMPLETED_KEY);
      if (raw) {
        const data: PeriodProgress = JSON.parse(raw);
        if (data.periodKey === weekKey && Array.isArray(data.chapters)) return data.chapters;
      }
      const dateKey = this.getDateKey();
      const stored = await AsyncStorage.getItem(TEHILLIM_PROGRESS_KEY);
      if (stored) {
        const progress: DailyProgress = JSON.parse(stored);
        if (progress.date === dateKey && progress.chaptersCompleted?.length > 0) {
          const chapters = [...new Set(progress.chaptersCompleted)].filter((n) => n >= 1 && n <= 150);
          await AsyncStorage.setItem(
            TEHILLIM_WEEKLY_COMPLETED_KEY,
            JSON.stringify({ periodKey: weekKey, chapters })
          );
          return chapters;
        }
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  private static async addWeeklyCompleted(chapter: number): Promise<void> {
    const weekKey = getWeekKey();
    const chapters = await this.getWeeklyCompleted();
    if (chapters.includes(chapter)) return;
    chapters.push(chapter);
    await AsyncStorage.setItem(
      TEHILLIM_WEEKLY_COMPLETED_KEY,
      JSON.stringify({ periodKey: weekKey, chapters })
    );
  }

  /**
   * Get chapters completed this month (monthly mode). Resets if month changed.
   * Backfills from today's daily progress if monthly storage is empty (same month).
   */
  private static async getMonthlyCompleted(): Promise<number[]> {
    const monthKey = getHebrewMonthKey();
    try {
      const raw = await AsyncStorage.getItem(TEHILLIM_MONTHLY_COMPLETED_KEY);
      if (raw) {
        const data: PeriodProgress = JSON.parse(raw);
        if (data.periodKey === monthKey && Array.isArray(data.chapters)) return data.chapters;
      }
      const dateKey = this.getDateKey();
      const stored = await AsyncStorage.getItem(TEHILLIM_PROGRESS_KEY);
      if (stored) {
        const progress: DailyProgress = JSON.parse(stored);
        if (progress.date === dateKey && progress.chaptersCompleted?.length > 0) {
          const chapters = [...new Set(progress.chaptersCompleted)].filter((n) => n >= 1 && n <= 150);
          await AsyncStorage.setItem(
            TEHILLIM_MONTHLY_COMPLETED_KEY,
            JSON.stringify({ periodKey: monthKey, chapters })
          );
          return chapters;
        }
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  private static async addMonthlyCompleted(chapter: number): Promise<void> {
    const monthKey = getHebrewMonthKey();
    const chapters = await this.getMonthlyCompleted();
    if (chapters.includes(chapter)) return;
    chapters.push(chapter);
    await AsyncStorage.setItem(
      TEHILLIM_MONTHLY_COMPLETED_KEY,
      JSON.stringify({ periodKey: monthKey, chapters })
    );
  }

  /**
   * Get number of chapters completed in custom cycle (1..currentChapter-1).
   */
  private static async getCustomCycleCompleted(): Promise<number> {
    try {
      const raw = await AsyncStorage.getItem(TEHILLIM_CUSTOM_PROGRESS_KEY);
      if (!raw) return 0;
      const p: CustomProgress = JSON.parse(raw);
      return Math.max(0, (p.currentChapter || 1) - 1);
    } catch (e) {
      return 0;
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
   * Get current progress for today (or for "whenever" mode: overall % of 150 completed).
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

    // "Whenever you can" mode: progress = % of all 150 perakim completed (any order)
    if (settings.goalType === 'whenever') {
      const completed = await this.getWheneverCompleted();
      const chaptersRemaining = ALL_CHAPTERS.filter((ch) => !completed.includes(ch));
      const percentComplete = Math.round((completed.length / 150) * 100);
      return {
        chaptersCompleted: completed,
        totalChapters: [...ALL_CHAPTERS],
        percentComplete,
        chaptersRemaining,
        dayName: 'Tehillim',
        goalType: 'whenever',
      };
    }

    const totalChapters = await this.getTodaysChapters();
    const dayName = this.getDayName();

    try {
      const stored = await AsyncStorage.getItem(TEHILLIM_PROGRESS_KEY);
      if (stored) {
        const progress: DailyProgress = JSON.parse(stored);

        if (progress.date === dateKey) {
          const chaptersRemaining = totalChapters.filter(
            (ch) => !progress.chaptersCompleted.includes(ch)
          );
          const percentComplete =
            totalChapters.length > 0
              ? Math.round(
                  (progress.chaptersCompleted.filter((ch) => totalChapters.includes(ch)).length /
                    totalChapters.length) *
                    100
                )
              : 0;

          return {
            chaptersCompleted: progress.chaptersCompleted.filter((ch) =>
              totalChapters.includes(ch)
            ),
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
   * Overall Tehillim progress (X of 150) for the current period.
   * Used by the home/widget to show "how much of Tehillim was done" in any mode.
   */
  static async getOverallTehillimProgress(): Promise<{
    completed: number;
    total: number;
    label: string;
    percentComplete: number;
  }> {
    const total = 150;
    const settings = await this.getSettings();
    switch (settings.goalType) {
      case 'whenever': {
        const completed = await this.getWheneverCompleted();
        return {
          completed: completed.length,
          total,
          label: 'perakim',
          percentComplete: Math.round((completed.length / total) * 100),
        };
      }
      case 'weekly': {
        const chapters = await this.getWeeklyCompleted();
        return {
          completed: chapters.length,
          total,
          label: 'this week',
          percentComplete: Math.round((chapters.length / total) * 100),
        };
      }
      case 'monthly': {
        const chapters = await this.getMonthlyCompleted();
        return {
          completed: chapters.length,
          total,
          label: 'this month',
          percentComplete: Math.round((chapters.length / total) * 100),
        };
      }
      case 'custom': {
        const completed = await this.getCustomCycleCompleted();
        return {
          completed,
          total,
          label: 'in cycle',
          percentComplete: Math.round((completed / total) * 100),
        };
      }
      default: {
        const chapters = await this.getWeeklyCompleted();
        return {
          completed: chapters.length,
          total,
          label: 'this week',
          percentComplete: Math.round((chapters.length / total) * 100),
        };
      }
    }
  }

  /**
   * Record a WPM reading (called when user completes a chapter with timing)
   */
  private static async addWpmReading(wpm: number): Promise<void> {
    if (!Number.isFinite(wpm) || wpm <= 0 || wpm > 1000) return;
    try {
      const dateKey = this.getDateKey();
      const raw = await AsyncStorage.getItem(TEHILLIM_WPM_READINGS_KEY);
      const readings: WpmReading[] = raw ? JSON.parse(raw) : [];
      readings.push({ wpm: Math.round(wpm), date: dateKey });
      const trimmed = readings.slice(-MAX_WPM_READINGS);
      await AsyncStorage.setItem(TEHILLIM_WPM_READINGS_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('Error saving WPM reading:', e);
    }
  }

  /**
   * Get average words-per-minute across recent readings
   */
  static async getAverageWPM(): Promise<number | null> {
    try {
      const raw = await AsyncStorage.getItem(TEHILLIM_WPM_READINGS_KEY);
      const readings: WpmReading[] = raw ? JSON.parse(raw) : [];
      if (readings.length === 0) return null;
      const sum = readings.reduce((s, r) => s + r.wpm, 0);
      return Math.round(sum / readings.length);
    } catch (e) {
      console.warn('Error reading WPM:', e);
      return null;
    }
  }

  /**
   * How many times the user has finished all 150 perakim in the current goal mode
   * (increments automatically when you complete the last perek of a full book).
   */
  static async getFullTehillimCompletionsCount(): Promise<number> {
    try {
      const raw = await AsyncStorage.getItem(TEHILLIM_FULL_BOOK_COMPLETIONS_KEY);
      const n = raw != null ? parseInt(raw, 10) : 0;
      return Number.isFinite(n) && n >= 0 ? n : 0;
    } catch (e) {
      console.warn('Error reading full Tehillim completions count:', e);
      return 0;
    }
  }

  private static async bumpFullTehillimCompletionsCount(): Promise<void> {
    try {
      const n = await this.getFullTehillimCompletionsCount();
      await AsyncStorage.setItem(TEHILLIM_FULL_BOOK_COMPLETIONS_KEY, String(n + 1));
    } catch (e) {
      console.warn('Error bumping full Tehillim completions count:', e);
    }
  }

  /**
   * Clear all progress for the current "full book" run (checkmarks / weekly set / etc.)
   * without incrementing the lifetime full-book counter.
   */
  static async resetCurrentBookProgress(): Promise<void> {
    const settings = await this.getSettings();
    try {
      if (settings.goalType === 'whenever') {
        await this.resetWheneverProgress();
      } else if (settings.goalType === 'weekly') {
        const weekKey = getWeekKey();
        await AsyncStorage.setItem(
          TEHILLIM_WEEKLY_COMPLETED_KEY,
          JSON.stringify({ periodKey: weekKey, chapters: [] })
        );
      } else if (settings.goalType === 'monthly') {
        const monthKey = getHebrewMonthKey();
        await AsyncStorage.setItem(
          TEHILLIM_MONTHLY_COMPLETED_KEY,
          JSON.stringify({ periodKey: monthKey, chapters: [] })
        );
      } else if (settings.goalType === 'custom') {
        await this.resetCustomProgress();
      }
      await this.resetTodaysProgress();
    } catch (e) {
      console.warn('Error resetting current book progress:', e);
    }
  }

  private static async recordFullTehillimFinishedAndRestart(): Promise<void> {
    await this.bumpFullTehillimCompletionsCount();
    await this.resetCurrentBookProgress();
  }

  /**
   * Mark a chapter as completed
   * @param readingSession optional { durationMinutes, wordCount } for WPM calculation
   */
  static async markChapterComplete(
    chapter: number,
    readingSession?: { durationMinutes: number; wordCount: number }
  ): Promise<void> {
    if (chapter < 1 || chapter > 150) return;

    const settings = await this.getSettings();

    // "Whenever you can" mode: persist to overall completed set (any order)
    if (settings.goalType === 'whenever') {
      try {
        const completed = await this.getWheneverCompleted();
        if (completed.includes(chapter)) return;
        completed.push(chapter);
        await this.saveWheneverCompleted(completed);
        await this.addWheneverCompletedDay(this.getDateKey());
        if (
          readingSession &&
          readingSession.durationMinutes > 0 &&
          readingSession.wordCount > 0
        ) {
          const wpm = readingSession.wordCount / readingSession.durationMinutes;
          await this.addWpmReading(wpm);
        }
      } catch (e) {
        console.warn('Error saving whenever Tehillim progress:', e);
      }
      return;
    }

    const dateKey = this.getDateKey();
    const totalChapters = await this.getTodaysChapters();

    try {
      const stored = await AsyncStorage.getItem(TEHILLIM_PROGRESS_KEY);
      let progress: DailyProgress;

      if (stored) {
        progress = JSON.parse(stored);

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

      if (!progress.chaptersCompleted.includes(chapter)) {
        progress.chaptersCompleted.push(chapter);
        progress.lastUpdated = Date.now();
        await AsyncStorage.setItem(TEHILLIM_PROGRESS_KEY, JSON.stringify(progress));

        if (settings.goalType === 'weekly') {
          await this.addWeeklyCompleted(chapter);
        } else if (settings.goalType === 'monthly') {
          await this.addMonthlyCompleted(chapter);
        }

        if (
          readingSession &&
          readingSession.durationMinutes > 0 &&
          readingSession.wordCount > 0
        ) {
          const wpm = readingSession.wordCount / readingSession.durationMinutes;
          await this.addWpmReading(wpm);
        }

        if (settings.goalType === 'custom') {
          const remaining = totalChapters.filter(
            (ch) => !progress.chaptersCompleted.includes(ch)
          );
          if (remaining.length === 0) {
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
   * Get the next chapter to read. For "whenever" mode returns first remaining (by number).
   */
  static async getNextChapter(): Promise<number | null> {
    const progress = await this.getTodaysProgress();
    if (progress.chaptersRemaining.length === 0) return null;
    return Math.min(...progress.chaptersRemaining);
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
   * Reset "whenever you can" progress (clear all completed perakim in whenever mode).
   */
  static async resetWheneverProgress(): Promise<void> {
    await AsyncStorage.removeItem(TEHILLIM_WHENEVER_COMPLETED_KEY);
    await AsyncStorage.removeItem(TEHILLIM_WHENEVER_DAYS_KEY);
  }

  /**
   * Reset custom daily goal progress (start cycle from chapter 1 again).
   */
  static async resetCustomProgress(): Promise<void> {
    await AsyncStorage.removeItem(TEHILLIM_CUSTOM_PROGRESS_KEY);
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
    const isWhenever = progress.goalType === 'whenever';

    if (percent === 100) {
      return isWhenever ? 'All 150 perakim complete! ✨' : `${progress.dayName}'s Tehillim complete! ✨`;
    }

    if (isWhenever) {
      if (percent === 0) return 'Say Tehillim whenever you can • Open any perek';
      if (percent >= 80) return `Almost there! ${remaining} perakim left`;
      if (percent >= 50) return `${total - remaining} of 150 done • ${remaining} to go`;
      return `${percent}% of Tehillim complete • Say any perek when you have time`;
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
      case 'whenever':
        return 'Say Tehillim whenever you can • Any perek, any order';
      default:
        return 'Weekly cycle';
    }
  }

  /**
   * Add today to "whenever mode" completed-days list (days with at least 1 perek).
   */
  private static async addWheneverCompletedDay(dateKeyStr: string): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(TEHILLIM_WHENEVER_DAYS_KEY);
      const dates: string[] = raw ? JSON.parse(raw) : [];
      if (!dates.includes(dateKeyStr)) {
        dates.push(dateKeyStr);
        dates.sort();
        await AsyncStorage.setItem(TEHILLIM_WHENEVER_DAYS_KEY, JSON.stringify(dates));
      }
    } catch (e) {
      console.warn('Error saving whenever Tehillim day:', e);
    }
  }

  /**
   * Count days in range when user completed at least 1 perek (whenever mode).
   */
  private static async getWheneverCompletedDaysInRange(start: Date, end: Date): Promise<number> {
    try {
      const raw = await AsyncStorage.getItem(TEHILLIM_WHENEVER_DAYS_KEY);
      const dates: string[] = raw ? JSON.parse(raw) : [];
      const startStr = toLocalDateString(start);
      const endStr = toLocalDateString(end);
      return dates.filter((d) => d >= startStr && d <= endStr).length;
    } catch (e) {
      return 0;
    }
  }

  /**
   * Add a date to the completed-days list (for streak)
   */
  private static async addCompletedDay(dateKeyStr: string): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(TEHILLIM_COMPLETED_DAYS_KEY);
      const dates: string[] = raw ? JSON.parse(raw) : [];
      if (!dates.includes(dateKeyStr)) {
        dates.push(dateKeyStr);
        dates.sort();
        await AsyncStorage.setItem(TEHILLIM_COMPLETED_DAYS_KEY, JSON.stringify(dates));
      }
    } catch (e) {
      console.warn('Error saving Tehillim completed day:', e);
    }
  }

  /**
   * Count completed days within a date range (inclusive).
   * For "whenever" mode: a day counts if user did at least 1 perek that day.
   */
  static async getCompletedDaysInRange(start: Date, end: Date): Promise<number> {
    try {
      const settings = await this.getSettings();
      if (settings.goalType === 'whenever') {
        return this.getWheneverCompletedDaysInRange(start, end);
      }
      const raw = await AsyncStorage.getItem(TEHILLIM_COMPLETED_DAYS_KEY);
      const dates: string[] = raw ? JSON.parse(raw) : [];
      const startStr = toLocalDateString(start);
      const endStr = toLocalDateString(end);
      return dates.filter((d) => d >= startStr && d <= endStr).length;
    } catch (e) {
      console.warn('Error reading Tehillim completed days in range:', e);
      return 0;
    }
  }

  /**
   * Get streak info (consecutive days completed, including today).
   * For "whenever" mode: a day counts if user did at least 1 perek that day.
   */
  static async getStreak(): Promise<number> {
    try {
      const today = this.getDateKey();
      const settings = await this.getSettings();

      if (settings.goalType === 'whenever') {
        let raw = await AsyncStorage.getItem(TEHILLIM_WHENEVER_DAYS_KEY);
        let dates: string[] = raw ? JSON.parse(raw) : [];
        if (!dates.includes(today)) return 0;
        let streak = 0;
        const d = new Date();
        for (let i = 0; i < 365; i++) {
          const key = toLocalDateString(d);
          if (dates.includes(key)) {
            streak++;
            d.setDate(d.getDate() - 1);
          } else {
            break;
          }
        }
        return streak;
      }

      const isTodayComplete = await this.isComplete();
      let raw = await AsyncStorage.getItem(TEHILLIM_COMPLETED_DAYS_KEY);
      let dates: string[] = raw ? JSON.parse(raw) : [];
      if (isTodayComplete && !dates.includes(today)) {
        await this.addCompletedDay(today);
        dates = [...dates, today].sort();
      }
      if (dates.length === 0 || !dates.includes(today)) return 0;

      let streak = 0;
      const d = new Date();
      for (let i = 0; i < 365; i++) {
        const key = toLocalDateString(d);
        if (dates.includes(key)) {
          streak++;
          d.setDate(d.getDate() - 1);
        } else {
          break;
        }
      }
      return streak;
    } catch (e) {
      console.warn('Error reading Tehillim streak:', e);
      return 0;
    }
  }
}
