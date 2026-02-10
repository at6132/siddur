/**
 * 100 brachos a day counter - track daily brachos count (resets each day)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const BRACHOS_KEY_PREFIX = '@brachos_count_';

/** Approximate brachos in each tefilla (for "Add Shacharis / Mincha / Maariv" quick-add). */
export const BRACHOS_PER_TEFILLA = {
  shacharis: 50,  // Birchot Hashachar, Pesukei D'Zimra, Kriat Shema + brachos, Amidah
  mincha: 19,     // Amidah
  maariv: 21,     // 2 brachos before Shema + Amidah
} as const;

function dateKey(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

function storageKey(date?: Date): string {
  return BRACHOS_KEY_PREFIX + dateKey(date ?? new Date());
}

/** Get brachos count for a specific date */
export async function getBrachosCountForDate(date: Date): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(date));
    if (raw == null) return 0;
    const n = parseInt(raw, 10);
    return isNaN(n) ? 0 : Math.max(0, n);
  } catch (e) {
    console.warn('BrachosCounterService.getBrachosCountForDate error:', e);
    return 0;
  }
}

/** Get today's brachos count */
export async function getBrachosCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(storageKey());
    if (raw == null) return 0;
    const n = parseInt(raw, 10);
    return isNaN(n) ? 0 : Math.max(0, n);
  } catch (e) {
    console.warn('BrachosCounterService.getBrachosCount error:', e);
    return 0;
  }
}

/** Add one bracha (or add delta). Returns new count. */
export async function addBrachos(delta: number = 1): Promise<number> {
  const count = await getBrachosCount();
  const newCount = Math.min(100, Math.max(0, count + delta));
  try {
    await AsyncStorage.setItem(storageKey(), String(newCount));
  } catch (e) {
    console.warn('BrachosCounterService.addBrachos error:', e);
  }
  return newCount;
}

/** Set today's count explicitly (e.g. from a form). Returns new count. */
export async function setBrachosCount(count: number): Promise<number> {
  const n = Math.min(100, Math.max(0, Math.round(count)));
  try {
    await AsyncStorage.setItem(storageKey(), String(n));
  } catch (e) {
    console.warn('BrachosCounterService.setBrachosCount error:', e);
  }
  return n;
}

/** Total brachos across a date range (inclusive). Goal per day is 100; for week/month we show sum. */
export async function getBrachosTotalForRange(start: Date, end: Date): Promise<number> {
  let total = 0;
  const d = new Date(start);
  d.setHours(0, 0, 0, 0);
  const endTime = new Date(end).setHours(23, 59, 59, 999);
  while (d.getTime() <= endTime) {
    total += await getBrachosCountForDate(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return total;
}
