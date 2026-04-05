/**
 * Omer Calculator
 * Calculates the day of the Omer count with sefiros
 */

import type { LocationObject } from 'expo-location';
import { HDate, months } from '@hebcal/core';
import { ZmanimService } from '../zmanim/ZmanimService';

// The 7 sefiros (middos) of the Omer
const SEFIROS = [
  'Chesed',      // Loving-kindness
  'Gevurah',     // Strength/Discipline
  'Tiferes',     // Harmony/Beauty
  'Netzach',     // Victory/Endurance
  'Hod',         // Splendor/Humility
  'Yesod',       // Foundation/Connection
  'Malchus',     // Sovereignty/Leadership
] as const;

const SEFIROS_HEBREW = [
  'חסד',
  'גבורה',
  'תפארת',
  'נצח',
  'הוד',
  'יסוד',
  'מלכות',
] as const;

const SEFIROS_MEANINGS = [
  'Loving-kindness',
  'Strength & Discipline',
  'Harmony & Beauty',
  'Victory & Endurance',
  'Splendor & Humility',
  'Foundation & Connection',
  'Sovereignty & Leadership',
] as const;

// Hebrew number words for Omer counting
const HEBREW_DAYS = [
  '', 'אחד', 'שנים', 'שלשה', 'ארבעה', 'חמשה', 'ששה', 'שבעה', 'שמונה', 'תשעה', 'עשרה',
  'אחד עשר', 'שנים עשר', 'שלשה עשר', 'ארבעה עשר', 'חמשה עשר', 'ששה עשר', 'שבעה עשר',
  'שמונה עשר', 'תשעה עשר', 'עשרים', 'עשרים ואחד', 'עשרים ושנים', 'עשרים ושלשה',
  'עשרים וארבעה', 'עשרים וחמשה', 'עשרים וששה', 'עשרים ושבעה', 'עשרים ושמונה',
  'עשרים ותשעה', 'שלשים', 'שלשים ואחד', 'שלשים ושנים', 'שלשים ושלשה',
  'שלשים וארבעה', 'שלשים וחמשה', 'שלשים וששה', 'שלשים ושבעה', 'שלשים ושמונה',
  'שלשים ותשעה', 'ארבעים', 'ארבעים ואחד', 'ארבעים ושנים', 'ארבעים ושלשה',
  'ארבעים וארבעה', 'ארבעים וחמשה', 'ארבעים וששה', 'ארבעים ושבעה', 'ארבעים ושמונה',
  'ארבעים ותשעה'
];

const HEBREW_WEEKS = ['', 'שבוע אחד', 'שני שבועות', 'שלשה שבועות', 'ארבעה שבועות', 'חמשה שבועות', 'ששה שבועות', 'שבעה שבועות'];
const HEBREW_DAYS_IN_WEEK = ['', 'יום אחד', 'שני ימים', 'שלשה ימים', 'ארבעה ימים', 'חמשה ימים', 'ששה ימים'];

export interface OmerInfo {
  day: number;
  week: number;
  dayInWeek: number;
  sefira: string;
  sefiraHebrew: string;
  weekSefira: string;
  daySefira: string;
  weekSefiraHebrew: string;
  daySefiraHebrew: string;
  meaning: string;
}

export class OmerCalculator {
  /**
   * Core Omer index from a Hebrew calendar date (16 Nisan = day 1 … 5 Sivan = day 49).
   */
  private static omerDayFromHebrewDate(hd: HDate): number | null {
    const hyear = hd.getFullYear();
    const abs = hd.abs();

    const beginOmer = HDate.hebrew2abs(hyear, months.NISAN, 16);
    const endOmer = HDate.hebrew2abs(hyear, months.SIVAN, 5);

    if (abs < beginOmer || abs > endOmer) {
      return null;
    }

    const omerDay = abs - beginOmer + 1;
    if (omerDay < 1 || omerDay > 49) {
      return null;
    }

    return omerDay;
  }

  /**
   * Omer day for a moment in time.
   * @param sunset - Shkiah for this **civil** day (from zmanim). When `date` is at or
   *   after sunset, the halachic Hebrew day has advanced vs Hebcal's plain `new HDate(date)`
   *   (which ignores clock time), so we use the next Hebrew day — fixes "shows 2, should be 3"
   *   on weeknights after sunset.
   */
  static getOmerDay(date: Date = new Date(), sunset?: Date | null): number | null {
    let hd = new HDate(date);
    if (
      sunset &&
      !Number.isNaN(sunset.getTime()) &&
      date.getTime() >= sunset.getTime()
    ) {
      hd = hd.add(1, 'days');
    }
    return this.omerDayFromHebrewDate(hd);
  }

  /**
   * Night number shown in the UI (home tile, big digit). Before today's tzeit it uses today's
   * local noon with sunset — so we do not jump to the next number at civil sunset while still
   * waiting for nightfall; the label stays on N until tzeit, then moves to the next night.
   */
  static getDisplayOmerDay(
    now: Date,
    sunset: Date | null | undefined,
    tzeis: Date | null | undefined
  ): number | null {
    const s =
      sunset instanceof Date && !Number.isNaN(sunset.getTime()) ? sunset : null;
    const t =
      tzeis instanceof Date && !Number.isNaN(tzeis.getTime()) ? tzeis : null;
    if (t && now.getTime() < t.getTime()) {
      const noon = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        12,
        0,
        0,
        0
      );
      return this.getOmerDay(noon, s);
    }
    return this.getOmerDay(now, s);
  }

  /**
   * Night index for storage / "tap to count" after tzeit. Before tzeit, the night that opens at
   * the upcoming tzeit (so you can say "night 4 in 19h" while the UI still shows night 3).
   */
  static getOmerNightToCount(
    now: Date,
    sunset: Date | null | undefined,
    tzeis: Date | null | undefined
  ): number | null {
    const s =
      sunset instanceof Date && !Number.isNaN(sunset.getTime()) ? sunset : null;
    const t =
      tzeis instanceof Date && !Number.isNaN(tzeis.getTime()) ? tzeis : null;
    if (t && now.getTime() < t.getTime()) {
      return this.getOmerDay(t, s);
    }
    return this.getOmerDay(now, s);
  }

  /**
   * "Caught up" for UI: after tzeit, you marked tonight's {@link getOmerNightToCount}.
   * Before tzeit, you marked the night that already passed ({@code counts[countNight - 1]}),
   * not {@code counts[displayNight]} (display can still be yesterday's number while countNight is next).
   */
  static isOmerCaughtUp(
    afterTzeit: boolean,
    countNight: number | null,
    counts: Record<number, boolean> | null | undefined
  ): boolean {
    if (countNight == null) return false;
    if (afterTzeit) return !!counts?.[countNight];
    if (countNight <= 1) return false;
    return !!counts?.[countNight - 1];
  }

  /**
   * Same as getOmerDay but uses location-based zmanim for sunset (or defaults).
   */
  static async getOmerDayAsync(
    date: Date = new Date(),
    location: LocationObject | null,
  ): Promise<number | null> {
    const ext = await ZmanimService.calculateExtendedZmanim(date, location);
    return OmerCalculator.getOmerDay(date, ext.sunset ?? null);
  }

  static async getDisplayOmerDayAsync(
    date: Date = new Date(),
    location: LocationObject | null,
  ): Promise<number | null> {
    const ext = await ZmanimService.calculateExtendedZmanim(date, location);
    return this.getDisplayOmerDay(date, ext.sunset ?? null, ext.tzeis ?? null);
  }

  static async getOmerNightToCountAsync(
    date: Date = new Date(),
    location: LocationObject | null,
  ): Promise<number | null> {
    const ext = await ZmanimService.calculateExtendedZmanim(date, location);
    return this.getOmerNightToCount(date, ext.sunset ?? null, ext.tzeis ?? null);
  }

  /**
   * Get comprehensive Omer information for a day
   */
  static getOmerInfo(omerDay: number): OmerInfo | null {
    if (omerDay < 1 || omerDay > 49) return null;

    const week = Math.ceil(omerDay / 7);
    const dayInWeek = ((omerDay - 1) % 7) + 1;

    // Get sefira - week determines the "sheb" part, day determines the main sefirah
    const weekSefiraIndex = week - 1;
    const daySefiraIndex = dayInWeek - 1;

    const weekSefira = SEFIROS[weekSefiraIndex];
    const daySefira = SEFIROS[daySefiraIndex];
    const sefira = `${daySefira} sheb'${weekSefira}`;

    const weekSefiraHebrew = SEFIROS_HEBREW[weekSefiraIndex];
    const daySefiraHebrew = SEFIROS_HEBREW[daySefiraIndex];
    const sefiraHebrew = `${daySefiraHebrew} שב${weekSefiraHebrew}`;

    // Get meaning
    const dayMeaning = SEFIROS_MEANINGS[daySefiraIndex];
    const weekMeaning = SEFIROS_MEANINGS[weekSefiraIndex];
    const meaning = `${dayMeaning} within ${weekMeaning}`;

    return {
      day: omerDay,
      week,
      dayInWeek,
      sefira,
      sefiraHebrew,
      weekSefira,
      daySefira,
      weekSefiraHebrew,
      daySefiraHebrew,
      meaning,
    };
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
   * Get description of Omer day for display
   */
  static getOmerDescription(omerDay: number): string {
    if (omerDay < 1 || omerDay > 49) return '';
    
    const info = this.getOmerInfo(omerDay);
    if (!info) return '';

    const week = info.week;
    const dayInWeek = info.dayInWeek;

    if (week === 1) {
      return `Day ${omerDay} of the Omer`;
    }

    const weeksText = week === 1 ? '1 week' : `${week} weeks`;
    const daysText = dayInWeek === 0 ? '' : dayInWeek === 1 ? ' and 1 day' : ` and ${dayInWeek} days`;
    
    return `Day ${omerDay} (${weeksText}${daysText})`;
  }

  /**
   * Get full Omer blessing text
   */
  static getOmerBlessing(omerDay: number): {
    blessing: string;
    blessingHebrew: string;
    count: string;
    countHebrew: string;
    sefira: string;
    sefiraHebrew: string;
  } {
    const info = this.getOmerInfo(omerDay);
    if (!info) {
      return {
        blessing: '',
        blessingHebrew: '',
        count: '',
        countHebrew: '',
        sefira: '',
        sefiraHebrew: '',
      };
    }

    const blessing = 'Baruch Atah Adonai, Eloheinu Melech haolam, asher kid\'shanu b\'mitzvotav v\'tzivanu al sefirat ha\'omer.';
    const blessingHebrew = 'בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ עַל סְפִירַת הָעֹמֶר.';

    // Build count text
    let count: string;
    let countHebrew: string;

    if (omerDay < 7) {
      const dayWord = omerDay === 1 ? 'day' : 'days';
      count = `Today is ${omerDay} ${dayWord} of the Omer.`;
      const hebrewDayWord = omerDay === 1 ? 'יום' : 'ימים';
      countHebrew = `הַיּוֹם ${HEBREW_DAYS[omerDay]} ${hebrewDayWord} לָעֹמֶר.`;
    } else if (omerDay % 7 === 0) {
      // Exact weeks
      const weeks = omerDay / 7;
      const weekWord = weeks === 1 ? 'week' : 'weeks';
      count = `Today is ${omerDay} days, which are ${weeks} ${weekWord} of the Omer.`;
      countHebrew = `הַיּוֹם ${HEBREW_DAYS[omerDay]} יוֹם, שֶׁהֵם ${HEBREW_WEEKS[weeks]} לָעֹמֶר.`;
    } else {
      // Weeks and days
      const weeks = Math.floor(omerDay / 7);
      const days = omerDay % 7;
      const weekWord = weeks === 1 ? 'week' : 'weeks';
      const dayWord = days === 1 ? 'day' : 'days';
      count = `Today is ${omerDay} days, which are ${weeks} ${weekWord} and ${days} ${dayWord} of the Omer.`;
      countHebrew = `הַיּוֹם ${HEBREW_DAYS[omerDay]} יוֹם, שֶׁהֵם ${HEBREW_WEEKS[weeks]} ו${HEBREW_DAYS_IN_WEEK[days]} לָעֹמֶר.`;
    }

    return {
      blessing,
      blessingHebrew,
      count,
      countHebrew,
      sefira: info.sefira,
      sefiraHebrew: info.sefiraHebrew,
    };
  }

  /**
   * Get meditation/kavanah for the day's sefira
   */
  static getSefirahMeditation(omerDay: number): {
    title: string;
    meditation: string;
    question: string;
  } | null {
    const info = this.getOmerInfo(omerDay);
    if (!info) return null;

    const meditations: { [key: string]: { meditation: string; question: string } } = {
      'Chesed': {
        meditation: 'Focus on acts of loving-kindness and generosity. How can you give without expecting anything in return?',
        question: 'What act of kindness can I do today?',
      },
      'Gevurah': {
        meditation: 'Focus on discipline and setting healthy boundaries. Strength comes from knowing when to say no.',
        question: 'Where do I need more discipline in my life?',
      },
      'Tiferes': {
        meditation: 'Focus on finding balance and harmony. True beauty emerges when opposites are balanced.',
        question: 'How can I bring more harmony to my relationships?',
      },
      'Netzach': {
        meditation: 'Focus on perseverance and determination. Victory comes to those who persist.',
        question: 'What goal have I been putting off that I should pursue?',
      },
      'Hod': {
        meditation: 'Focus on humility and gratitude. True splendor comes from recognizing our place in the greater whole.',
        question: 'What am I grateful for today?',
      },
      'Yesod': {
        meditation: 'Focus on connection and building strong foundations. All growth requires a solid base.',
        question: 'How can I strengthen my most important relationships?',
      },
      'Malchus': {
        meditation: 'Focus on leadership and taking responsibility. True sovereignty comes from serving others.',
        question: 'How can I take more responsibility in my life?',
      },
    };

    const dayMeditation = meditations[info.daySefira];
    const weekContext = info.weekSefira;

    return {
      title: `${info.daySefira} within ${weekContext}`,
      meditation: dayMeditation?.meditation || '',
      question: dayMeditation?.question || '',
    };
  }
}
