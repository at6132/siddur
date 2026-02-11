/**
 * Davening streak - consecutive days the user opened the siddur (davened)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { toLocalDateString } from '../utils/dateUtils';

const DAVENING_DATES_KEY = '@davening_streak_dates';

function dateKey(date: Date = new Date()): string {
  return toLocalDateString(date);
}

/** Record that the user davened today (call when SiddurReader is focused) */
export async function recordDaveningToday(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(DAVENING_DATES_KEY);
    const dates: string[] = raw ? JSON.parse(raw) : [];
    const today = dateKey();
    if (!dates.includes(today)) {
      dates.push(today);
      dates.sort();
      await AsyncStorage.setItem(DAVENING_DATES_KEY, JSON.stringify(dates));
    }
  } catch (e) {
    console.warn('DaveningStreakService.recordDaveningToday error:', e);
  }
}

/** Number of consecutive days (including today) that the user davened */
export async function getDaveningStreak(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(DAVENING_DATES_KEY);
    const dates: string[] = raw ? JSON.parse(raw) : [];
    if (dates.length === 0) return 0;

    const today = dateKey();
    if (!dates.includes(today)) return 0;

    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const key = dateKey(d);
      if (dates.includes(key)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  } catch (e) {
    console.warn('DaveningStreakService.getDaveningStreak error:', e);
    return 0;
  }
}
