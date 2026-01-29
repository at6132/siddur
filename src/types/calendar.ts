/**
 * Calendar and zmanim types
 */

import { Nusach } from './nusach';

export interface Zmanim {
  shacharis: Date;
  mincha: Date;
  maariv: Date;
  shabbosStart: Date | null;
  shabbosEnd: Date | null;
  candleLighting: Date | null;
}

export interface ExtendedZmanim extends Zmanim {
  alosHashachar: Date;      // Dawn - 72 minutes before sunrise (astronomical twilight)
  misheyakir: Date;         // Earliest time for tallis/tefillin
  sunrise: Date;            // Hanetz hachama
  sofZmanShemaGRA: Date;    // Latest Shema (GRA - 3 hours after sunrise)
  sofZmanShemaMA: Date;     // Latest Shema (Magen Avraham - 3 hours after alos)
  sofZmanShmoneEsreiGRA: Date; // Latest Shemoneh Esrei (GRA)
  sofZmanShmoneEsreiMA: Date;  // Latest Shemoneh Esrei (MA)
  chatzos: Date;            // Midday
  minchaGedola: Date;       // Earliest Mincha (30 min after chatzos)
  minchaKetana: Date;       // "Small" Mincha (2.5 hours before sunset)
  plagHamincha: Date;       // 1.25 hours before sunset
  sunset: Date;             // Shkiah
  tzeis: Date;              // Nightfall (3 stars visible)
  tzeisRT: Date;            // Nightfall (Rabbeinu Tam - 72 min after sunset)
  shaahZmanis: number;      // Length of halachic hour in minutes (GRA)
  shaahZmanisMA: number;    // Length of halachic hour in minutes (MA)
}

export interface DaveningChanges {
  // Amidah insertions
  mashivHaruach: boolean;      // "Mashiv haruach u'morid hageshem" (winter)
  moridHatal: boolean;         // "Morid hatal" (summer - Sefard/Edot Mizrach only)
  vtenBracha: boolean;         // "V'ten bracha" (summer)
  vtenTalUmatar: boolean;      // "V'ten tal u'matar" (winter)
  yaalehVeyavo: boolean;       // Rosh Chodesh, Chol Hamoed, Yom Tov
  alHanissim: boolean;         // Chanukah and Purim
  aneinu: boolean;             // Fast days (in Shmoneh Esrei)
  nachem: boolean;             // Tisha B'Av only

  // Additional prayers
  hallel: 'full' | 'half' | false;  // Full, half (without bracha), or none
  hallelWithBracha: boolean;        // Whether to say bracha on Hallel
  tachanun: boolean;                // Whether to say Tachanun
  lamnatzeiach: boolean;            // Psalm 20 before U'va L'tzion
  avinuMalkeinu: boolean;           // Avinu Malkeinu
  selichos: boolean;                // Selichos
  kinos: boolean;                   // Kinos (Tisha B'Av)

  // Torah reading
  torahReading: boolean;
  maftir: string | null;
  haftarah: string | null;

  // Special additions
  musaf: 'regular' | 'roshChodesh' | 'yomTov' | 'roshHashana' | 'yomKippur' | false;
  kedushaType: 'regular' | 'shabbos' | 'yomTov' | 'yamimNoraim';

  // Reason/context
  reason?: string;  // e.g., "Rosh Chodesh Nisan", "Chol Hamoed Pesach"
}

export interface SpiritualCue {
  text: string;
  type: 'tehillim' | 'renewal' | 'reflection' | 'gratitude' | 'other';
}

export interface SpecialDay {
  name: string;
  hebrewName: string;
  type: 'yomTov' | 'fastDay' | 'roshChodesh' | 'cholHamoed' | 'chanukah' | 'purim' | 'omer' | 'specialShabbos' | 'minor';
  description?: string;
}

export interface DayInfo {
  // Date info
  jewishDate: string;         // Format: "15 Nisan 5784"
  jewishDateShort: string;    // Format: "15 Nisan"
  hebrewDate: string;         // Hebrew: "ט״ו ניסן תשפ״ד"
  gregorianDate: Date;
  dayOfWeek: number;          // 0-6 (Sunday-Saturday)
  dayOfWeekHebrew: string;    // יום ראשון, etc.

  // Day type flags
  isShabbos: boolean;
  isYomTov: boolean;
  isFastDay: boolean;
  isCholHamoed: boolean;
  isRoshChodesh: boolean;
  isErevShabbos: boolean;
  isErevYomTov: boolean;
  isMoedKatan: boolean;       // Minor holiday (Chanukah, Purim, etc.)

  // Special day info
  specialDays: SpecialDay[];
  parsha?: string;
  parshaHebrew?: string;
  holiday?: string;
  holidayHebrew?: string;

  // Zmanim and prayer changes
  zmanim: Zmanim;
  extendedZmanim?: ExtendedZmanim;
  daveningChanges: DaveningChanges;
  spiritualCue?: SpiritualCue;

  // Omer
  omerDay?: number;           // 1-49, undefined if not Omer period
  omerWeek?: number;          // 1-7
  omerDayInWeek?: number;     // 1-7
  omerSefira?: string;        // "Chesed sheb'Chesed", etc.

  // Season
  season: 'winter' | 'summer';  // For mashiv haruach/tal u'matar
  isAfterPesach: boolean;
  isAfterSheminiAtzeres: boolean;
  isAfterDecember4th: boolean;  // For tal u'matar in diaspora
}

export interface CalendarContext {
  nusach: Nusach;
  location?: {
    latitude: number;
    longitude: number;
  };
  isIsrael: boolean;
  timezone?: string;
}

// Hebrew month names
export const HEBREW_MONTHS = [
  'Nisan', 'Iyar', 'Sivan', 'Tammuz', 'Av', 'Elul',
  'Tishrei', 'Cheshvan', 'Kislev', 'Teves', 'Shevat', 'Adar',
  'Adar I', 'Adar II'
] as const;

export const HEBREW_MONTHS_HEBREW = [
  'ניסן', 'אייר', 'סיון', 'תמוז', 'אב', 'אלול',
  'תשרי', 'חשון', 'כסלו', 'טבת', 'שבט', 'אדר',
  'אדר א׳', 'אדר ב׳'
] as const;

export const DAYS_OF_WEEK_HEBREW = [
  'יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי',
  'יום חמישי', 'יום שישי', 'שבת קודש'
] as const;

export type HebrewMonth = typeof HEBREW_MONTHS[number];
