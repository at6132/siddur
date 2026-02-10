/**
 * Daily Gratitude – log gratitude entries (text + date). List by date, no total.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@gratitude_entries';

export interface GratitudeEntry {
  id: string;
  text: string;
  date: string; // YYYY-MM-DD
  createdAt: number;
}

function generateId(): string {
  return `gr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export class GratitudeTracker {
  static async getAllEntries(): Promise<GratitudeEntry[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const entries: GratitudeEntry[] = raw ? JSON.parse(raw) : [];
      return entries.sort((a, b) => b.createdAt - a.createdAt);
    } catch (e) {
      console.warn('GratitudeTracker getAllEntries error:', e);
      return [];
    }
  }

  static async addEntry(text: string, date?: Date): Promise<GratitudeEntry> {
    const d = date || new Date();
    const dateStr = d.toISOString().split('T')[0];
    const entry: GratitudeEntry = {
      id: generateId(),
      text: text.trim() || 'Grateful',
      date: dateStr,
      createdAt: Date.now(),
    };
    try {
      const entries = await this.getAllEntries();
      entries.unshift(entry);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      return entry;
    } catch (e) {
      console.warn('GratitudeTracker addEntry error:', e);
      throw e;
    }
  }

  static async deleteEntry(id: string): Promise<void> {
    const entries = await this.getAllEntries();
    const filtered = entries.filter((e) => e.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }

  /** Consecutive days (including today) with at least one entry. */
  static async getStreak(): Promise<number> {
    const entries = await this.getAllEntries();
    const datesWithEntry = [...new Set(entries.map((e) => e.date))].sort((a, b) => b.localeCompare(a));
    if (datesWithEntry.length === 0) return 0;
    const today = new Date().toISOString().split('T')[0];
    if (datesWithEntry[0] !== today) return 0;
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const key = d.toISOString().split('T')[0];
      if (datesWithEntry.includes(key)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }
}
