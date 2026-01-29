/**
 * Jewish Calendar Service
 * Wraps hebcal for Jewish date calculations
 */

import { HDate, HebrewCalendar, flags } from '@hebcal/core';

export class JewishCalendarService {
  /**
   * Get Jewish date for a given Gregorian date
   */
  static getJewishDate(date: Date = new Date()): HDate {
    return new HDate(date);
  }

  /**
   * Get Jewish date string (e.g., "15 Nisan 5784")
   */
  static getJewishDateString(date: Date = new Date()): string {
    const hdate = this.getJewishDate(date);
    return hdate.render('en');
  }

  /**
   * Get short Jewish date string (e.g., "15 Nisan")
   */
  static getJewishDateShort(date: Date = new Date()): string {
    const hdate = this.getJewishDate(date);
    const monthName = hdate.getMonthName();
    return `${hdate.getDate()} ${monthName}`;
  }

  /**
   * Check if date is Shabbos
   */
  static isShabbos(date: Date = new Date()): boolean {
    const hdate = this.getJewishDate(date);
    return hdate.getDay() === 6; // 6 = Shabbos
  }

  /**
   * Get holidays on a given date (safely returns empty array)
   */
  private static getHolidays(date: Date): any[] {
    try {
      const hdate = this.getJewishDate(date);
      const events = HebrewCalendar.getHolidaysOnDate(hdate);
      return events || [];
    } catch (e) {
      console.warn('Error getting holidays:', e);
      return [];
    }
  }

  /**
   * Check if date is Yom Tov
   */
  static isYomTov(date: Date = new Date()): boolean {
    const events = this.getHolidays(date);
    if (!events || events.length === 0) return false;
    return events.some((event) => {
      const eventFlags = event.getFlags?.() || 0;
      return (eventFlags & flags.YOM_TOV_ENDS) || (eventFlags & flags.CHAG);
    });
  }

  /**
   * Check if date is a fast day
   */
  static isFastDay(date: Date = new Date()): boolean {
    const events = this.getHolidays(date);
    if (!events || events.length === 0) return false;
    return events.some((event) => {
      const eventFlags = event.getFlags?.() || 0;
      return eventFlags & flags.MINOR_FAST;
    });
  }

  /**
   * Check if date is Chol Hamoed
   */
  static isCholHamoed(date: Date = new Date()): boolean {
    const events = this.getHolidays(date);
    if (!events || events.length === 0) return false;
    return events.some((event) => {
      const eventFlags = event.getFlags?.() || 0;
      return eventFlags & flags.CHOL_HAMOED;
    });
  }

  /**
   * Get Parsha for a given date
   */
  static getParsha(date: Date = new Date()): string | undefined {
    const events = this.getHolidays(date);
    if (!events || events.length === 0) return undefined;
    const parsha = events.find((event) => {
      const eventFlags = event.getFlags?.() || 0;
      return eventFlags & flags.PARSHA_HASHAVUA;
    });
    return parsha?.getDesc?.('en');
  }

  /**
   * Get holiday name for a given date
   */
  static getHoliday(date: Date = new Date()): string | undefined {
    const events = this.getHolidays(date);
    if (!events || events.length === 0) return undefined;
    const yomTov = events.find((event) => {
      const eventFlags = event.getFlags?.() || 0;
      return (eventFlags & flags.YOM_TOV_ENDS) || (eventFlags & flags.CHAG);
    });
    return yomTov?.getDesc?.('en');
  }
}
