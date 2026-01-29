/**
 * Jewish Calendar Service
 * Wraps hebcal for Jewish date calculations
 */

import { HDate, HebrewCalendar, Event } from 'hebcal';

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
    const monthName = hdate.getMonthName('en');
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
   * Check if date is Yom Tov
   */
  static isYomTov(date: Date = new Date()): boolean {
    const events = HebrewCalendar.getHolidaysOnDate(date);
    return events.some((event) => event.getFlags() & Event.YOM_TOV);
  }

  /**
   * Check if date is a fast day
   */
  static isFastDay(date: Date = new Date()): boolean {
    const events = HebrewCalendar.getHolidaysOnDate(date);
    return events.some((event) => event.getFlags() & Event.MINOR_FAST);
  }

  /**
   * Check if date is Chol Hamoed
   */
  static isCholHamoed(date: Date = new Date()): boolean {
    const events = HebrewCalendar.getHolidaysOnDate(date);
    return events.some((event) => event.getFlags() & Event.CHOL_HAMOED);
  }

  /**
   * Get Parsha for a given date
   */
  static getParsha(date: Date = new Date()): string | undefined {
    const events = HebrewCalendar.getHolidaysOnDate(date);
    const parsha = events.find((event) => event.getFlags() & Event.SPECIAL_SHABBAT);
    return parsha?.getDesc('en');
  }

  /**
   * Get holiday name for a given date
   */
  static getHoliday(date: Date = new Date()): string | undefined {
    const events = HebrewCalendar.getHolidaysOnDate(date);
    const yomTov = events.find((event) => event.getFlags() & Event.YOM_TOV);
    return yomTov?.getDesc('en');
  }
}

