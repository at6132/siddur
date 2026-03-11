/**
 * Jewish Calendar Service
 * Comprehensive Jewish calendar calculations using @hebcal/core
 */

import { HDate, HebrewCalendar, flags, months, Locale, getSedra, ParshaEvent } from '@hebcal/core';
import { SpecialDay, DAYS_OF_WEEK_HEBREW } from '../../types/calendar';

// Hebrew number conversion
const HEBREW_NUMERALS: { [key: number]: string } = {
  1: 'א', 2: 'ב', 3: 'ג', 4: 'ד', 5: 'ה', 6: 'ו', 7: 'ז', 8: 'ח', 9: 'ט',
  10: 'י', 20: 'כ', 30: 'ל', 40: 'מ', 50: 'נ', 60: 'ס', 70: 'ע', 80: 'פ', 90: 'צ',
  100: 'ק', 200: 'ר', 300: 'ש', 400: 'ת'
};

export class JewishCalendarService {
  /**
   * Get Jewish date for a given Gregorian date
   */
  static getJewishDate(date: Date = new Date()): HDate {
    return new HDate(date);
  }

  /**
   * Number of days in the Hebrew month containing the given date (29 or 30).
   * Used for the global monthly Tehillim cycle (29-day months combine portions 29+30 on the last day).
   */
  static getDaysInHebrewMonth(date: Date = new Date()): number {
    const hdate = this.getJewishDate(date);
    return HDate.daysInMonth(hdate.getMonth(), hdate.getFullYear());
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
   * Get Hebrew date string (e.g., "ט״ו ניסן תשפ״ד")
   */
  static getHebrewDateString(date: Date = new Date()): string {
    const hdate = this.getJewishDate(date);
    try {
      return hdate.render('he');
    } catch {
      // Fallback if Hebrew locale not available
      const day = this.numberToHebrew(hdate.getDate());
      const month = this.getHebrewMonthName(hdate.getMonth());
      const year = this.numberToHebrewYear(hdate.getFullYear());
      return `${day} ${month} ${year}`;
    }
  }

  /**
   * Get Hebrew date short: day + month in Hebrew only (e.g., "כ״ב אדר" or "כ״ב אדר ב׳")
   * Adar I shows as "אדר" (no א׳); Adar II shows as "אדר ב׳".
   */
  static getHebrewDateShort(date: Date = new Date()): string {
    const hdate = this.getJewishDate(date);
    const day = this.numberToHebrew(hdate.getDate());
    const monthIndex = hdate.getMonth();
    const month = monthIndex === months.ADAR_I ? 'אדר' : this.getHebrewMonthName(monthIndex);
    return `${day} ${month}`;
  }

  /**
   * Get Hebrew day of week
   */
  static getDayOfWeekHebrew(date: Date = new Date()): string {
    const dayIndex = date.getDay();
    return DAYS_OF_WEEK_HEBREW[dayIndex];
  }

  /**
   * Get Hebrew month name
   */
  static getHebrewMonthName(month: number): string {
    const monthNames: { [key: number]: string } = {
      [months.NISAN]: 'ניסן',
      [months.IYYAR]: 'אייר',
      [months.SIVAN]: 'סיון',
      [months.TAMUZ]: 'תמוז',
      [months.AV]: 'אב',
      [months.ELUL]: 'אלול',
      [months.TISHREI]: 'תשרי',
      [months.CHESHVAN]: 'חשון',
      [months.KISLEV]: 'כסלו',
      [months.TEVET]: 'טבת',
      [months.SHVAT]: 'שבט',
      [months.ADAR_I]: 'אדר א׳',
      [months.ADAR_II]: 'אדר ב׳',
    };
    return monthNames[month] || 'אדר';
  }

  /**
   * Convert number to Hebrew numerals
   */
  static numberToHebrew(num: number): string {
    if (num === 15) return 'ט״ו';
    if (num === 16) return 'ט״ז';
    
    let result = '';
    const values = [400, 300, 200, 100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    
    for (const value of values) {
      while (num >= value) {
        result += HEBREW_NUMERALS[value];
        num -= value;
      }
    }
    
    // Add geresh/gershayim
    if (result.length === 1) {
      return result + '׳';
    } else if (result.length > 1) {
      return result.slice(0, -1) + '״' + result.slice(-1);
    }
    return result;
  }

  /**
   * Convert year to Hebrew
   */
  static numberToHebrewYear(year: number): string {
    // Remove the 5000
    const shortYear = year % 1000;
    return 'ה׳' + this.numberToHebrew(shortYear);
  }

  /**
   * Check if date is Shabbos
   */
  static isShabbos(date: Date = new Date()): boolean {
    return date.getDay() === 6;
  }

  /**
   * Check if date is Erev Shabbos (Friday)
   */
  static isErevShabbos(date: Date = new Date()): boolean {
    return date.getDay() === 5;
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
   * Check if date is Rosh Chodesh
   */
  static isRoshChodesh(date: Date = new Date()): boolean {
    const hdate = this.getJewishDate(date);
    const day = hdate.getDate();
    // Rosh Chodesh is the 1st of the month, and sometimes the 30th of the previous month
    if (day === 1) return true;
    if (day === 30) {
      // Check if this month has 30 days (then 30th is also Rosh Chodesh)
      const nextMonth = new HDate(hdate.abs() + 1);
      return nextMonth.getDate() === 1;
    }
    return false;
  }

  /**
   * Check if date is during Aseret Yemei Teshuva (Ten Days of Repentance: 1–10 Tishrei)
   * When we say Zochreinu, Uchtavenu, etc. in the Amidah
   */
  static isAseretYemeiTeshuva(date: Date = new Date()): boolean {
    const hdate = this.getJewishDate(date);
    return hdate.getMonth() === months.TISHREI && hdate.getDate() >= 1 && hdate.getDate() <= 10;
  }

  /**
   * Get Rosh Chodesh name
   */
  static getRoshChodeshName(date: Date = new Date()): string | undefined {
    if (!this.isRoshChodesh(date)) return undefined;
    const hdate = this.getJewishDate(date);
    const day = hdate.getDate();
    
    let monthName: string;
    if (day === 1) {
      monthName = hdate.getMonthName();
    } else {
      // Day 30, Rosh Chodesh of next month
      const nextMonth = new HDate(hdate.abs() + 1);
      monthName = nextMonth.getMonthName();
    }
    return `Rosh Chodesh ${monthName}`;
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
   * Check if date is Erev Yom Tov
   */
  static isErevYomTov(date: Date = new Date()): boolean {
    const events = this.getHolidays(date);
    if (!events || events.length === 0) return false;
    return events.some((event) => {
      const eventFlags = event.getFlags?.() || 0;
      return eventFlags & flags.EREV;
    });
  }

  /**
   * True only when the Hebrew date is one of the known fast days.
   * Used to avoid false positives from Hebcal (e.g. Feb 16 incorrectly flagged).
   */
  private static isKnownFastHebrewDate(hdate: HDate): boolean {
    const month = hdate.getMonth();
    const day = hdate.getDate();
    if (month === months.TISHREI && (day === 3 || day === 10)) return true; // Tzom Gedaliah, Yom Kippur
    if (month === months.TEVET && day === 10) return true; // Asara B'Tevet
    if ((month === months.ADAR_I || month === months.ADAR_II) && (day === 11 || day === 13)) return true; // Ta'anit Esther
    if (month === months.TAMUZ && day === 17) return true; // 17 Tammuz
    if (month === months.AV && day === 9) return true; // Tisha B'Av
    return false;
  }

  /**
   * Check if date is a fast day.
   * Requires both Hebcal to report a fast AND the Hebrew date to be a known fast (avoids false positives).
   */
  static isFastDay(date: Date = new Date()): boolean {
    const hdate = this.getJewishDate(date);
    if (!this.isKnownFastHebrewDate(hdate)) return false;
    const events = this.getHolidays(date);
    if (!events || events.length === 0) return false;
    return events.some((event) => {
      const eventFlags = event.getFlags?.() || 0;
      return (eventFlags & flags.MINOR_FAST) || (eventFlags & flags.MAJOR_FAST);
    });
  }

  /**
   * Check if date is Tisha B'Av
   */
  static isTishaBAv(date: Date = new Date()): boolean {
    const hdate = this.getJewishDate(date);
    return hdate.getMonth() === months.AV && hdate.getDate() === 9;
  }

  /**
   * Check if date is Yom Kippur
   */
  static isYomKippur(date: Date = new Date()): boolean {
    const hdate = this.getJewishDate(date);
    return hdate.getMonth() === months.TISHREI && hdate.getDate() === 10;
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
   * Check if date is during Chanukah
   */
  static isChanukah(date: Date = new Date()): boolean {
    const hdate = this.getJewishDate(date);
    const month = hdate.getMonth();
    const day = hdate.getDate();
    
    // Chanukah: 25 Kislev - 2/3 Teves
    if (month === months.KISLEV && day >= 25) return true;
    if (month === months.TEVET && day <= 3) return true;
    return false;
  }

  /**
   * Get Chanukah day number (1-8)
   */
  static getChanukahDay(date: Date = new Date()): number | undefined {
    if (!this.isChanukah(date)) return undefined;
    const hdate = this.getJewishDate(date);
    const month = hdate.getMonth();
    const day = hdate.getDate();
    
    if (month === months.KISLEV) {
      return day - 24; // 25th = day 1
    } else {
      // Teves - depends on if Kislev had 29 or 30 days
      const kislevDays = HDate.daysInMonth(months.KISLEV, hdate.getFullYear());
      return (kislevDays - 24) + day;
    }
  }

  /**
   * Check if date is Purim or Shushan Purim
   */
  static isPurim(date: Date = new Date()): boolean {
    const hdate = this.getJewishDate(date);
    const month = hdate.getMonth();
    const day = hdate.getDate();
    
    // In a leap year, Purim is in Adar II
    const isLeapYear = HDate.isLeapYear(hdate.getFullYear());
    const purimMonth = isLeapYear ? months.ADAR_II : months.ADAR_I;
    
    if (month === purimMonth && (day === 14 || day === 15)) return true;
    return false;
  }

  /**
   * Check if date is during Selichos period (Elul 21+ or Tishrei 1–9, before Yom Kippur).
   * Ashkenazi: from Sunday before Rosh Hashana; Sefardi: entire Elul. Simplified: Elul 21+ or Tishrei 1–9.
   */
  static isSelichosPeriod(date: Date = new Date()): boolean {
    const hdate = this.getJewishDate(date);
    const month = hdate.getMonth();
    const day = hdate.getDate();
    if (month === 6 && day >= 21) return true; // Elul
    if (month === 7 && day >= 1 && day <= 9) return true; // Tishrei before Yom Kippur
    return false;
  }

  /**
   * Check if date is during the Omer period
   */
  static isOmerPeriod(date: Date = new Date()): boolean {
    const hdate = this.getJewishDate(date);
    const month = hdate.getMonth();
    const day = hdate.getDate();
    
    // Omer: 16 Nisan - 5 Sivan (night before Shavuos)
    if (month === months.NISAN && day >= 16) return true;
    if (month === months.IYYAR) return true;
    if (month === months.SIVAN && day <= 5) return true;
    return false;
  }

  /**
   * Check if Hallel is said (full or half)
   */
  static getHallelType(date: Date = new Date()): 'full' | 'half' | false {
    const hdate = this.getJewishDate(date);
    const month = hdate.getMonth();
    const day = hdate.getDate();
    
    // Full Hallel days
    // Shavuos, Sukkos (first 2 days), Shmini Atzeres/Simchas Torah, all 8 days of Chanukah
    // First night of Pesach (at Seder only, not in davening)
    
    // First 2 days of Sukkos
    if (month === months.TISHREI && (day === 15 || day === 16)) return 'full';
    // Shmini Atzeres / Simchas Torah
    if (month === months.TISHREI && (day === 22 || day === 23)) return 'full';
    // Chanukah
    if (this.isChanukah(date)) return 'full';
    // Shavuos
    if (month === months.SIVAN && (day === 6 || day === 7)) return 'full';
    
    // Half Hallel days
    // Rosh Chodesh
    if (this.isRoshChodesh(date)) return 'half';
    // Last 6 days of Pesach
    if (month === months.NISAN && day >= 17 && day <= 22) return 'half';
    // Chol Hamoed Pesach
    if (month === months.NISAN && day >= 16 && day <= 21) return 'half';
    // First 2 days of Pesach (full in some communities)
    if (month === months.NISAN && (day === 15 || day === 16)) return 'full';
    // Chol Hamoed Sukkos
    if (month === months.TISHREI && day >= 17 && day <= 21) return 'half';
    
    return false;
  }

  /**
   * Check if Tachanun is said
   */
  static isTachanunSaid(date: Date = new Date()): boolean {
    const hdate = this.getJewishDate(date);
    const month = hdate.getMonth();
    const day = hdate.getDate();
    
    // No Tachanun on Shabbos
    if (this.isShabbos(date)) return false;
    
    // No Tachanun on Yom Tov, Chol Hamoed
    if (this.isYomTov(date) || this.isCholHamoed(date)) return false;
    
    // No Tachanun on Rosh Chodesh
    if (this.isRoshChodesh(date)) return false;
    
    // No Tachanun during Chanukah
    if (this.isChanukah(date)) return false;
    
    // No Tachanun on Purim, Shushan Purim
    if (this.isPurim(date)) return false;
    
    // No Tachanun on Tu B'Shvat
    if (month === months.SHVAT && day === 15) return false;
    
    // No Tachanun on Lag B'Omer
    if (month === months.IYYAR && day === 18) return false;
    
    // No Tachanun entire month of Nisan
    if (month === months.NISAN) return false;
    
    // No Tachanun from Rosh Chodesh Sivan through Isru Chag Shavuos (12 Sivan)
    if (month === months.SIVAN && day <= 12) return false;
    
    // No Tachanun on Tisha B'Av
    if (month === months.AV && day === 9) return false;
    
    // No Tachanun on Tu B'Av
    if (month === months.AV && day === 15) return false;
    
    // No Tachanun from Erev Yom Kippur through end of Tishrei
    if (month === months.TISHREI && day >= 9) return false;
    
    // No Tachanun on Isru Chag (day after Yom Tov)
    // 23 Nisan (after Pesach), 7 Sivan (after Shavuos), 23 Tishrei (after Sukkos)
    if (month === months.NISAN && day === 23) return false;
    if (month === months.SIVAN && day === 8) return false;
    if (month === months.TISHREI && day === 24) return false;
    
    return true;
  }

  /**
   * Check if Al Hanissim is said
   */
  static isAlHanissim(date: Date = new Date()): 'chanukah' | 'purim' | false {
    if (this.isChanukah(date)) return 'chanukah';
    if (this.isPurim(date)) return 'purim';
    return false;
  }

  /**
   * Check if Yaaleh V'Yavo is said (Rosh Chodesh, Chol Hamoed, or relevant Yom Tov in Birkat Hamazon).
   */
  static isYaalehVyavoDay(date: Date = new Date()): boolean {
    if (this.isRoshChodesh(date)) return true;
    if (this.isCholHamoed(date)) return true;
    if (this.isYomKippur(date)) return true;
    const hdate = this.getJewishDate(date);
    const month = hdate.getMonth();
    const day = hdate.getDate();
    if (month === months.NISAN && (day === 15 || day === 16)) return true;
    if (month === months.SIVAN && (day === 6 || day === 7)) return true;
    if (month === months.TISHREI && (day === 15 || day === 16 || (day >= 17 && day <= 21) || day === 22 || day === 23)) return true;
    return false;
  }

  /**
   * Phrase (stripped of nikkud) to highlight in the Yaaleh V'Yavo paragraph for the given date. Returns null if not a Yaaleh V'Yavo day.
   */
  static getYaalehVyavoPhrase(date: Date = new Date()): string | null {
    if (!this.isYaalehVyavoDay(date)) return null;
    const hdate = this.getJewishDate(date);
    const month = hdate.getMonth();
    const day = hdate.getDate();
    if (this.isYomKippur(date)) return 'הכפורים';
    if (this.isRoshChodesh(date)) return 'ראש החודש';
    if (month === months.TISHREI && (day === 22 || day === 23)) return 'שמיני עצרת';
    if (month === months.TISHREI && (day >= 15 && day <= 21)) return 'חג הסוכות';
    if (month === months.SIVAN && (day === 6 || day === 7)) return 'חג השבועות';
    if (month === months.NISAN && (day >= 15 && day <= 22)) return 'חג המצות';
    return null;
  }

  /**
   * Get the upcoming Shabbos for a given date.
   * Sunday through Friday → that week's Shabbos (upcoming Saturday).
   * Saturday → same day (this Shabbos).
   */
  private static getUpcomingShabbos(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay(); // 0 Sun .. 6 Sat
    const daysUntilShabbos = day === 6 ? 0 : (6 - day + 7) % 7;
    d.setDate(d.getDate() + daysUntilShabbos);
    return d;
  }

  /**
   * Get Parsha for a given date using Hebcal Sedra API.
   * Always uses the upcoming Shabbos: Sunday–Shabbos = that week's parsha (read on that Shabbos).
   */
  static getParsha(date: Date = new Date()): string | undefined {
    const shabbos = this.getUpcomingShabbos(date);
    const hd = new HDate(shabbos);
    const hyear = hd.getFullYear();
    const sedra = getSedra(hyear, false);
    const result = sedra.lookup(hd);
    try {
      return new ParshaEvent(result).render('en');
    } catch {
      return result.parsha?.join('-') ?? undefined;
    }
  }

  /**
   * Get Parsha in Hebrew (same logic: upcoming Shabbos = this week's parsha).
   */
  static getParshaHebrew(date: Date = new Date()): string | undefined {
    const shabbos = this.getUpcomingShabbos(date);
    const hd = new HDate(shabbos);
    const hyear = hd.getFullYear();
    const sedra = getSedra(hyear, false);
    const result = sedra.lookup(hd);
    try {
      return new ParshaEvent(result).render('he');
    } catch {
      return result.parsha?.join('־') ?? undefined;
    }
  }

  /**
   * Get holiday name for a given date
   */
  static getHoliday(date: Date = new Date()): string | undefined {
    const events = this.getHolidays(date);
    if (!events || events.length === 0) return undefined;
    
    // Priority: Major holiday > Minor holiday > Rosh Chodesh
    const yomTov = events.find((event) => {
      const eventFlags = event.getFlags?.() || 0;
      return (eventFlags & flags.YOM_TOV_ENDS) || (eventFlags & flags.CHAG);
    });
    if (yomTov) return yomTov.getDesc?.('en');
    
    const minor = events.find((event) => {
      const eventFlags = event.getFlags?.() || 0;
      return eventFlags & flags.MINOR_HOLIDAY;
    });
    if (minor) return minor.getDesc?.('en');
    
    // Check Rosh Chodesh
    if (this.isRoshChodesh(date)) {
      return this.getRoshChodeshName(date);
    }
    
    return undefined;
  }

  /**
   * Get all special days for a given date
   */
  static getSpecialDays(date: Date = new Date()): SpecialDay[] {
    const specialDays: SpecialDay[] = [];
    const events = this.getHolidays(date);
    
    // Add Rosh Chodesh
    if (this.isRoshChodesh(date)) {
      const name = this.getRoshChodeshName(date) || 'Rosh Chodesh';
      specialDays.push({
        name,
        hebrewName: 'ראש חודש',
        type: 'roshChodesh',
      });
    }
    
    // Process hebcal events
    for (const event of events) {
      const eventFlags = event.getFlags?.() || 0;
      const desc = event.getDesc?.('en') || '';
      
      if (eventFlags & flags.CHAG) {
        specialDays.push({
          name: desc,
          hebrewName: event.render?.('he') || desc,
          type: 'yomTov',
        });
      } else if (eventFlags & flags.CHOL_HAMOED) {
        specialDays.push({
          name: desc,
          hebrewName: event.render?.('he') || desc,
          type: 'cholHamoed',
        });
      } else if (eventFlags & flags.MINOR_FAST || eventFlags & flags.MAJOR_FAST) {
        specialDays.push({
          name: desc,
          hebrewName: event.render?.('he') || desc,
          type: 'fastDay',
        });
      }
    }
    
    // Add Chanukah
    const chanukahDay = this.getChanukahDay(date);
    if (chanukahDay) {
      specialDays.push({
        name: `Chanukah - Day ${chanukahDay}`,
        hebrewName: `חנוכה - נר ${this.numberToHebrew(chanukahDay)}`,
        type: 'chanukah',
      });
    }
    
    // Add Purim
    if (this.isPurim(date)) {
      const hdate = this.getJewishDate(date);
      const isPurimDay = hdate.getDate() === 14;
      specialDays.push({
        name: isPurimDay ? 'Purim' : 'Shushan Purim',
        hebrewName: isPurimDay ? 'פורים' : 'שושן פורים',
        type: 'purim',
      });
    }
    
    return specialDays;
  }

  /**
   * Determine the current season for prayer changes
   */
  static getSeason(date: Date = new Date()): 'winter' | 'summer' {
    const hdate = this.getJewishDate(date);
    const month = hdate.getMonth();
    const day = hdate.getDate();
    
    // Summer: From Musaf of first day of Pesach until Musaf of Shmini Atzeres
    // Winter: From Musaf of Shmini Atzeres until Musaf of first day of Pesach
    
    // Simplified: Check if we're between Pesach and Shmini Atzeres
    if (month === months.NISAN && day >= 15) return 'summer';
    if (month >= months.IYYAR && month <= months.ELUL) return 'summer';
    if (month === months.TISHREI && day < 22) return 'summer';
    
    return 'winter';
  }

  /**
   * Check if we say Mashiv Haruach (after Shmini Atzeres Musaf until Pesach)
   */
  static isMashivHaruach(date: Date = new Date()): boolean {
    return this.getSeason(date) === 'winter';
  }

  /**
   * Date of the first day of the winter season (22 Tishrei) that contains the given date.
   * Winter: from 22 Tishrei through 14 Nisan. Used for "first 7 days of winter" logic.
   */
  static getFirstDayOfWinterSeason(date: Date = new Date()): Date | null {
    if (this.getSeason(date) !== 'winter') return null;
    const hdate = this.getJewishDate(date);
    const month = hdate.getMonth();
    const year = hdate.getFullYear();
    // Winter spans 22 Tishrei through 14 Nisan. Nisan (day < 15) is still previous Hebrew year's winter.
    const winterStartYear = month === months.NISAN ? year - 1 : year;
    try {
      return new HDate(22, months.TISHREI, winterStartYear).greg();
    } catch {
      return null;
    }
  }

  /**
   * Date of the first day of the summer season (15 Nisan) that contains the given date.
   * Summer: from 15 Nisan through 21 Tishrei. Used for "first 7 days of summer" logic.
   */
  static getFirstDayOfSummerSeason(date: Date = new Date()): Date | null {
    if (this.getSeason(date) !== 'summer') return null;
    const hdate = this.getJewishDate(date);
    const year = hdate.getFullYear();
    try {
      return new HDate(15, months.NISAN, year).greg();
    } catch {
      return null;
    }
  }

  /**
   * True if the given date is one of the first 7 days of the winter season (switch to Mashiv/V'ten Tal).
   */
  static isInFirst7DaysOfWinter(date: Date = new Date()): boolean {
    const start = this.getFirstDayOfWinterSeason(date);
    if (!start) return false;
    const startMidnight = new Date(start);
    startMidnight.setHours(0, 0, 0, 0);
    const dayMidnight = new Date(date);
    dayMidnight.setHours(0, 0, 0, 0);
    const daysSince = Math.round((dayMidnight.getTime() - startMidnight.getTime()) / (1000 * 60 * 60 * 24));
    return daysSince >= 0 && daysSince < 7;
  }

  /**
   * True if the given date is one of the first 7 days of the summer season (switch to Morid HaTal).
   */
  static isInFirst7DaysOfSummer(date: Date = new Date()): boolean {
    const start = this.getFirstDayOfSummerSeason(date);
    if (!start) return false;
    const startMidnight = new Date(start);
    startMidnight.setHours(0, 0, 0, 0);
    const dayMidnight = new Date(date);
    dayMidnight.setHours(0, 0, 0, 0);
    const daysSince = Math.round((dayMidnight.getTime() - startMidnight.getTime()) / (1000 * 60 * 60 * 24));
    return daysSince >= 0 && daysSince < 7;
  }

  /**
   * Check if we say V'ten Tal Umatar (in diaspora: Dec 4th until Pesach)
   */
  static isVtenTalUmatar(date: Date = new Date(), isIsrael: boolean = false): boolean {
    const hdate = this.getJewishDate(date);
    const month = hdate.getMonth();
    const day = hdate.getDate();
    
    // Before Pesach
    if (month === months.NISAN && day >= 15) return false;
    
    if (isIsrael) {
      // In Israel: from 7 Cheshvan
      if (month === months.CHESHVAN && day >= 7) return true;
      if (month === months.KISLEV || month === months.TEVET || 
          month === months.SHVAT || month === months.ADAR_I || 
          month === months.ADAR_II) return true;
      if (month === months.NISAN && day < 15) return true;
    } else {
      // In diaspora: from December 4th (or 5th in year before civil leap year)
      const civilMonth = date.getMonth(); // 0-indexed
      const civilDay = date.getDate();
      const year = date.getFullYear();
      
      // Check if next year is a leap year
      const startDay = ((year + 1) % 4 === 0) ? 5 : 4;
      
      if (civilMonth === 11 && civilDay >= startDay) return true; // December
      if (civilMonth >= 0 && civilMonth <= 2) return true; // Jan-March
      if (month === months.NISAN && day < 15) return true;
    }
    
    return false;
  }

  /**
   * Check if it's a day with Torah reading
   */
  /**
   * Get the next Gregorian date when a Hebrew date (day, month) occurs.
   * Returns null if invalid.
   */
  static getNextHebrewDateOccurrence(hebrewDay: number, hebrewMonth: number): Date | null {
    try {
      const today = new HDate(new Date());
      const currentYear = today.getFullYear();
      let hd = new HDate(hebrewDay, hebrewMonth, currentYear);
      let greg = hd.greg();
      if (greg < new Date()) {
        hd = new HDate(hebrewDay, hebrewMonth, currentYear + 1);
        greg = hd.greg();
      }
      return greg;
    } catch {
      return null;
    }
  }

  /** Days until next occurrence of Hebrew date. Returns null if today is the date or invalid. */
  static daysUntilHebrewDate(hebrewDay: number, hebrewMonth: number): number | null {
    const next = this.getNextHebrewDateOccurrence(hebrewDay, hebrewMonth);
    if (!next) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(next);
    target.setHours(0, 0, 0, 0);
    const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }

  /** Hebrew month names for display (Jewish year order: Nisan first) */
  static HEBREW_MONTH_NAMES: { value: number; label: string }[] = [
    { value: months.NISAN, label: 'Nisan' },
    { value: months.IYYAR, label: 'Iyar' },
    { value: months.SIVAN, label: 'Sivan' },
    { value: months.TAMUZ, label: 'Tammuz' },
    { value: months.AV, label: 'Av' },
    { value: months.ELUL, label: 'Elul' },
    { value: months.TISHREI, label: 'Tishrei' },
    { value: months.CHESHVAN, label: 'Cheshvan' },
    { value: months.KISLEV, label: 'Kislev' },
    { value: months.TEVET, label: 'Tevet' },
    { value: months.SHVAT, label: 'Shevat' },
    { value: months.ADAR_I, label: 'Adar I' },
    { value: months.ADAR_II, label: 'Adar II' },
  ];

  static hasTorahReading(date: Date = new Date()): boolean {
    const dayOfWeek = date.getDay();
    
    // Shabbos always has Torah reading
    if (dayOfWeek === 6) return true;
    
    // Monday and Thursday
    if (dayOfWeek === 1 || dayOfWeek === 4) return true;
    
    // Rosh Chodesh
    if (this.isRoshChodesh(date)) return true;
    
    // Fast days
    if (this.isFastDay(date)) return true;
    
    // Yom Tov and Chol Hamoed
    if (this.isYomTov(date) || this.isCholHamoed(date)) return true;
    
    // Chanukah and Purim
    if (this.isChanukah(date) || this.isPurim(date)) return true;
    
    return false;
  }
}
