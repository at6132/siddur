/**
 * Omer Calculator
 * Calculates the day of the Omer count
 */

import { HDate } from 'hebcal';

export class OmerCalculator {
  /**
   * Get the current Omer day (1-49) or null if not in Omer period
   */
  static getOmerDay(date: Date = new Date()): number | null {
    const hdate = new HDate(date);
    const year = hdate.getFullYear();

    // Pesach starts on 15 Nisan
    const pesachStart = new HDate(15, 1, year); // 1 = Nisan
    const pesachStartGregorian = pesachStart.greg();

    // Shavuos is 50 days after Pesach (Omer is days 1-49)
    const shavuos = new HDate(6, 3, year); // 3 = Sivan, 6th day
    const shavuosGregorian = shavuos.greg();

    // Check if date is between Pesach and Shavuos
    if (date < pesachStartGregorian || date >= shavuosGregorian) {
      return null;
    }

    // Calculate days since Pesach
    const daysSincePesach = Math.floor(
      (date.getTime() - pesachStartGregorian.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Omer day is 1-indexed (first day of Pesach = day 1 of Omer)
    const omerDay = daysSincePesach + 1;

    // Return null if outside Omer period (shouldn't happen, but safety check)
    if (omerDay < 1 || omerDay > 49) {
      return null;
    }

    return omerDay;
  }

  /**
   * Get the week number of the Omer (1-7)
   */
  static getOmerWeek(omerDay: number): number {
    return Math.ceil(omerDay / 7);
  }

  /**
   * Check if we're currently in the Omer period
   */
  static isOmerPeriod(date: Date = new Date()): boolean {
    return this.getOmerDay(date) !== null;
  }

  /**
   * Get Omer blessing text (Hebrew + transliteration)
   */
  static getOmerBlessing(omerDay: number): {
    hebrew: string;
    transliteration: string;
    english: string;
  } {
    const week = this.getOmerWeek(omerDay);
    const dayInWeek = ((omerDay - 1) % 7) + 1;

    return {
      hebrew: `היום ${omerDay} יום${omerDay === 1 ? '' : 'ים'} לעומר`,
      transliteration: `Hayom ${omerDay} yom${omerDay === 1 ? '' : 'im'} la'omer`,
      english: `Today is day ${omerDay} of the Omer`,
    };
  }
}

