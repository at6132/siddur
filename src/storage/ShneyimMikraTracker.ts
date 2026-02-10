/**
 * Shneyim Mikra VeChad Targum Progress Tracker
 * Tracks which aliyot have been completed for the current week's parsha.
 * One aliyah per day: Sun=1, Mon=2, ..., Sat=7.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@shneyim_mikra_progress';

interface WeekProgress {
  parsha: string;
  weekStart: string; // YYYY-MM-DD of Sunday
  aliyotCompleted: number[];
  lastUpdated: number;
}

function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d.toISOString().split('T')[0];
}

export class ShneyimMikraTracker {
  static async getProgress(parsha: string): Promise<{
    aliyotCompleted: number[];
    percentComplete: number;
    nextAliyah: number | null;
  }> {
    const weekStart = getWeekStart();
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const progress: WeekProgress = JSON.parse(stored);
        if (progress.parsha === parsha && progress.weekStart === weekStart) {
          const completed = progress.aliyotCompleted;
          const percent = Math.round((completed.length / 7) * 100);
          const next = [1, 2, 3, 4, 5, 6, 7].find((a) => !completed.includes(a)) ?? null;
          return { aliyotCompleted: completed, percentComplete: percent, nextAliyah: next };
        }
      }
    } catch (e) {
      console.warn('ShneyimMikraTracker getProgress error:', e);
    }
    return { aliyotCompleted: [], percentComplete: 0, nextAliyah: 1 };
  }

  static async markAliyahComplete(parsha: string, aliyah: number): Promise<void> {
    const weekStart = getWeekStart();
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      let progress: WeekProgress;

      if (stored) {
        progress = JSON.parse(stored);
        if (progress.parsha !== parsha || progress.weekStart !== weekStart) {
          progress = { parsha, weekStart, aliyotCompleted: [], lastUpdated: Date.now() };
        }
      } else {
        progress = { parsha, weekStart, aliyotCompleted: [], lastUpdated: Date.now() };
      }

      if (!progress.aliyotCompleted.includes(aliyah)) {
        progress.aliyotCompleted.push(aliyah);
        progress.aliyotCompleted.sort((a, b) => a - b);
        progress.lastUpdated = Date.now();
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
      }
    } catch (e) {
      console.warn('ShneyimMikraTracker markComplete error:', e);
    }
  }
}
