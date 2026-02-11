/**
 * App usage streak - consecutive days the user opened the app
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { toLocalDateString } from '../utils/dateUtils';

const STREAK_OPEN_DATES_KEY = '@app_streak_open_dates';

function dateKey(date: Date = new Date()): string {
  return toLocalDateString(date);
}

/** Record that the app was opened today (call from Home when focused) */
export async function recordAppOpen(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STREAK_OPEN_DATES_KEY);
    const dates: string[] = raw ? JSON.parse(raw) : [];
    const today = dateKey();
    if (!dates.includes(today)) {
      dates.push(today);
      dates.sort();
      await AsyncStorage.setItem(STREAK_OPEN_DATES_KEY, JSON.stringify(dates));
    }
  } catch (e) {
    console.warn('StreakService.recordAppOpen error:', e);
  }
}

/** Number of consecutive days (including today) that the app was opened */
export async function getAppStreak(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(STREAK_OPEN_DATES_KEY);
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
    console.warn('StreakService.getAppStreak error:', e);
    return 0;
  }
}
