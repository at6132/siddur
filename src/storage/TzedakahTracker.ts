/**
 * Tzedakah Tracker – log donations (amount, organization, date).
 * Supports total for past month (widget) and full history with sort/filter.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@tzedakah_entries';

export interface TzedakahEntry {
  id: string;
  amount: number;
  organization: string;
  date: string; // YYYY-MM-DD
  createdAt: number; // timestamp when added
}

export type TzedakahSortBy = 'date' | 'organization' | 'amount';
export type TzedakahFilterPeriod = 'month' | 'three_months' | 'year' | 'all';

function generateId(): string {
  return `tz_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function getPastMonthStart(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export class TzedakahTracker {
  static async getAllEntries(): Promise<TzedakahEntry[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const entries: TzedakahEntry[] = raw ? JSON.parse(raw) : [];
      return entries.sort((a, b) => b.createdAt - a.createdAt);
    } catch (e) {
      console.warn('TzedakahTracker getAllEntries error:', e);
      return [];
    }
  }

  static async addEntry(amount: number, organization: string, date?: Date): Promise<TzedakahEntry> {
    const d = date || new Date();
    const dateStr = d.toISOString().split('T')[0];
    const entry: TzedakahEntry = {
      id: generateId(),
      amount,
      organization: organization.trim() || 'Other',
      date: dateStr,
      createdAt: Date.now(),
    };
    try {
      const entries = await this.getAllEntries();
      entries.unshift(entry);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      return entry;
    } catch (e) {
      console.warn('TzedakahTracker addEntry error:', e);
      throw e;
    }
  }

  /** Total amount given in the past 30 days (for widget). */
  static async getTotalPastMonth(): Promise<number> {
    const entries = await this.getAllEntries();
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const cutoffStr = monthAgo.toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];
    return entries
      .filter((e) => e.date >= cutoffStr && e.date <= todayStr)
      .reduce((sum, e) => sum + e.amount, 0);
  }

  /** Total for a date range (inclusive). */
  static async getTotalForDateRange(start: Date, end: Date): Promise<number> {
    const entries = await this.getAllEntries();
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    return entries
      .filter((e) => e.date >= startStr && e.date <= endStr)
      .reduce((sum, e) => sum + e.amount, 0);
  }

  /** Total for a given period. */
  static getTotalForPeriod(entries: TzedakahEntry[], period: TzedakahFilterPeriod): number {
    if (period === 'all') return entries.reduce((s, e) => s + e.amount, 0);
    const now = new Date();
    let start = new Date(now);
    if (period === 'month') start.setMonth(start.getMonth() - 1);
    else if (period === 'three_months') start.setMonth(start.getMonth() - 3);
    else if (period === 'year') start.setFullYear(start.getFullYear() - 1);
    const startStr = start.toISOString().split('T')[0];
    return entries.filter((e) => e.date >= startStr).reduce((s, e) => s + e.amount, 0);
  }

  static sortEntries(entries: TzedakahEntry[], sortBy: TzedakahSortBy): TzedakahEntry[] {
    const copy = [...entries];
    if (sortBy === 'date') copy.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
    else if (sortBy === 'organization') copy.sort((a, b) => a.organization.localeCompare(b.organization) || b.createdAt - a.createdAt);
    else if (sortBy === 'amount') copy.sort((a, b) => b.amount - a.amount);
    return copy;
  }

  static filterEntriesByPeriod(entries: TzedakahEntry[], period: TzedakahFilterPeriod): TzedakahEntry[] {
    if (period === 'all') return entries;
    const now = new Date();
    let start = new Date(now);
    if (period === 'month') start.setMonth(start.getMonth() - 1);
    else if (period === 'three_months') start.setMonth(start.getMonth() - 3);
    else if (period === 'year') start.setFullYear(start.getFullYear() - 1);
    const startStr = start.toISOString().split('T')[0];
    return entries.filter((e) => e.date >= startStr);
  }

  static async deleteEntry(id: string): Promise<void> {
    const entries = await this.getAllEntries();
    const filtered = entries.filter((e) => e.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }
}
