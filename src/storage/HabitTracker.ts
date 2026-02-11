/**
 * Habit Tracker Storage
 * Manages habit marking without streaks or pressure
 */

import { toLocalDateString } from '../utils/dateUtils';
import { StorageService } from './StorageService';

export class HabitTracker {
  /**
   * Format date as YYYY-MM-DD for consistent storage (local timezone)
   */
  private static formatDate(date: Date): string {
    return toLocalDateString(date);
  }

  /**
   * Check if a habit was marked on a specific date
   */
  static async isMarked(date: Date): Promise<boolean> {
    const marks = await StorageService.getHabitMarks();
    const dateKey = this.formatDate(date);
    return marks?.[dateKey] ?? false;
  }

  /**
   * Mark a habit for a specific date
   */
  static async mark(date: Date, marked: boolean = true): Promise<boolean> {
    const dateKey = this.formatDate(date);
    return StorageService.markHabit(dateKey, marked);
  }

  /**
   * Get all marked dates (for calendar visualization)
   */
  static async getMarkedDates(): Promise<Set<string>> {
    const marks = await StorageService.getHabitMarks();
    if (!marks) return new Set();
    return new Set(Object.keys(marks).filter((key) => marks[key]));
  }

  /**
   * Check if habit was marked today
   */
  static async isMarkedToday(): Promise<boolean> {
    return this.isMarked(new Date());
  }

  /**
   * Mark habit for today
   */
  static async markToday(marked: boolean = true): Promise<boolean> {
    return this.mark(new Date(), marked);
  }

  /**
   * Count of days marked in a date range (inclusive).
   */
  static async getMarkedCountInRange(start: Date, end: Date): Promise<number> {
    const marks = await StorageService.getHabitMarks();
    if (!marks) return 0;
    const startStr = this.formatDate(start);
    const endStr = this.formatDate(end);
    return Object.keys(marks).filter(
      (key) => marks[key] && key >= startStr && key <= endStr
    ).length;
  }
}

