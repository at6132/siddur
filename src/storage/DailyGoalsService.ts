/**
 * Daily Goals – per-day goals: add in the morning, check off at night, look back at history.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { toLocalDateString } from '../utils/dateUtils';

const STORAGE_KEY = '@daily_goals';

export interface DailyGoalItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

export interface DailyGoalsDay {
  date: string; // YYYY-MM-DD
  goals: DailyGoalItem[];
  updatedAt: number;
}

function dateKey(d: Date = new Date()): string {
  return toLocalDateString(d);
}

function generateId(): string {
  return `goal_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export class DailyGoalsService {
  private static async getRaw(): Promise<Record<string, DailyGoalsDay>> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn('DailyGoalsService getRaw error:', e);
      return {};
    }
  }

  private static async setRaw(data: Record<string, DailyGoalsDay>): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  /** Get goals for a specific date */
  static async getForDate(date: Date): Promise<DailyGoalItem[]> {
    const key = dateKey(date);
    const data = await this.getRaw();
    const day = data[key];
    return day?.goals ?? [];
  }

  /** Get today's goals */
  static async getToday(): Promise<DailyGoalItem[]> {
    return this.getForDate(new Date());
  }

  /** Add a goal for a date. Returns the new list. */
  static async addGoal(date: Date, text: string): Promise<DailyGoalItem[]> {
    const key = dateKey(date);
    const data = await this.getRaw();
    const existing = data[key] ?? { date: key, goals: [], updatedAt: 0 };
    const goal: DailyGoalItem = {
      id: generateId(),
      text: text.trim() || 'Goal',
      completed: false,
      createdAt: Date.now(),
    };
    existing.goals.push(goal);
    existing.updatedAt = Date.now();
    data[key] = existing;
    await this.setRaw(data);
    return existing.goals;
  }

  /** Toggle completed for a goal by id */
  static async toggleGoal(date: Date, goalId: string): Promise<DailyGoalItem[]> {
    const key = dateKey(date);
    const data = await this.getRaw();
    const day = data[key];
    if (!day) return [];
    const goal = day.goals.find((g) => g.id === goalId);
    if (goal) {
      goal.completed = !goal.completed;
      day.updatedAt = Date.now();
      await this.setRaw(data);
    }
    return day.goals;
  }

  /** Remove a goal by id */
  static async removeGoal(date: Date, goalId: string): Promise<DailyGoalItem[]> {
    const key = dateKey(date);
    const data = await this.getRaw();
    const day = data[key];
    if (!day) return [];
    day.goals = day.goals.filter((g) => g.id !== goalId);
    day.updatedAt = Date.now();
    if (day.goals.length === 0) delete data[key];
    else data[key] = day;
    await this.setRaw(data);
    return day.goals;
  }

  /** Get list of dates that have goals (newest first), for history view */
  static async getDatesWithGoals(limit: number = 60): Promise<string[]> {
    const data = await this.getRaw();
    const dates = Object.keys(data)
      .filter((k) => data[k].goals.length > 0)
      .sort((a, b) => b.localeCompare(a));
    return dates.slice(0, limit);
  }

  /** Get a single day's data for history detail */
  static async getDay(dateStr: string): Promise<DailyGoalsDay | null> {
    const data = await this.getRaw();
    return data[dateStr] ?? null;
  }

  /** Summary for today: { total, completed } */
  static async getTodaySummary(): Promise<{ total: number; completed: number }> {
    const goals = await this.getToday();
    const completed = goals.filter((g) => g.completed).length;
    return { total: goals.length, completed };
  }

  /** For a date range: how many days had all goals completed (days with at least one goal). */
  static async getRangeSummary(start: Date, end: Date): Promise<{ daysCompleted: number; totalDays: number }> {
    const data = await this.getRaw();
    const startTime = new Date(start).setHours(0, 0, 0, 0);
    const endTime = new Date(end).setHours(23, 59, 59, 999);
    let daysCompleted = 0;
    const d = new Date(start);
    d.setHours(0, 0, 0, 0);
    while (d.getTime() <= endTime) {
      const key = dateKey(d);
      const day = data[key];
      if (day && day.goals.length > 0 && day.goals.every((g) => g.completed)) {
        daysCompleted++;
      }
      d.setDate(d.getDate() + 1);
    }
    const totalDays = Math.round((endTime - startTime) / (24 * 60 * 60 * 1000)) + 1;
    return { daysCompleted, totalDays };
  }

  /** Consecutive days (including today) where all goals were completed. */
  static async getCompletionStreak(): Promise<number> {
    const data = await this.getRaw();
    const dates = Object.keys(data)
      .filter((k) => data[k].goals.length > 0)
      .sort((a, b) => b.localeCompare(a));
    if (dates.length === 0) return 0;
    const today = dateKey(new Date());
    if (dates[0] !== today) return 0;
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const key = dateKey(d);
      const day = data[key];
      if (!day || day.goals.length === 0) break;
      const allDone = day.goals.every((g) => g.completed);
      if (!allDone) break;
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  /** List of days with completed/total for history list (one read). */
  static async getHistorySummaries(limit: number = 60): Promise<{ dateStr: string; completed: number; total: number }[]> {
    const data = await this.getRaw();
    return Object.keys(data)
      .filter((k) => data[k].goals.length > 0)
      .sort((a, b) => b.localeCompare(a))
      .slice(0, limit)
      .map((dateStr) => {
        const day = data[dateStr];
        const completed = day.goals.filter((g) => g.completed).length;
        return { dateStr, completed, total: day.goals.length };
      });
  }
}
