/**
 * Siddur Content Types
 * Type definitions for prayer content
 */

import { Nusach } from '../../types/nusach';

export interface PrayerText {
  hebrew: string;
  transliteration?: string;
  english?: string;
  instructions?: string;
}

export interface PrayerSection {
  id: string;
  name: string;
  nameHebrew: string;
  prayers: Prayer[];
}

export interface Prayer {
  id: string;
  name: string;
  nameHebrew: string;
  category: PrayerCategory;
  text: PrayerText;
  
  // Variants for different nusachot
  variants?: {
    [key in Nusach]?: Partial<PrayerText>;
  };
  
  // Conditional content
  conditions?: PrayerConditions;
  
  // Dynamic sections that change based on time/season
  dynamicSections?: DynamicSection[];
  
  // Related prayers/additions
  additions?: PrayerAddition[];
}

export interface PrayerConditions {
  // When to say this prayer
  shabbos?: boolean;
  yomTov?: boolean;
  weekday?: boolean;
  fastDay?: boolean;
  roshChodesh?: boolean;
  cholHamoed?: boolean;
  chanukah?: boolean;
  purim?: boolean;
  
  // Time of day
  shacharis?: boolean;
  mincha?: boolean;
  maariv?: boolean;
  
  // Season
  summer?: boolean;
  winter?: boolean;
  
  // Special conditions
  afterChatzos?: boolean;
  beforeSunset?: boolean;
}

export interface DynamicSection {
  id: string;
  name: string;
  
  // Which version to use based on conditions
  versions: {
    condition: string;  // e.g., 'winter', 'summer', 'roshChodesh'
    text: PrayerText;
  }[];
  
  // Position in the prayer where this goes
  insertAfter?: string;
  insertBefore?: string;
  replaces?: string;
}

export interface PrayerAddition {
  id: string;
  name: string;
  nameHebrew: string;
  text: PrayerText;
  condition: string;  // When to add this
  position: 'before' | 'after' | 'replace';
  targetPrayerId?: string;
}

export type PrayerCategory = 
  | 'birchos_hashachar'    // Morning blessings
  | 'pesukei_dezimra'      // Verses of praise
  | 'shema_uvirchoseha'    // Shema and its blessings
  | 'shemoneh_esrei'       // Amidah
  | 'tachanun'             // Supplications
  | 'krias_hatorah'        // Torah reading
  | 'hallel'               // Hallel
  | 'musaf'                // Additional service
  | 'concluding'           // Concluding prayers
  | 'mincha'               // Afternoon service
  | 'maariv'               // Evening service
  | 'shabbos'              // Shabbos-specific
  | 'yomtov'               // Holiday-specific
  | 'birchas_hamazon'      // Grace after meals
  | 'bedtime_shema'        // Bedtime Shema
  | 'other';

export type ServiceType = 'shacharis' | 'mincha' | 'maariv' | 'musaf';

export interface DaveningService {
  type: ServiceType;
  name: string;
  nameHebrew: string;
  sections: PrayerSection[];
}

// Season-dependent text variations
export interface SeasonalVariation {
  winter: string;
  summer: string;
}

export interface AmidahInsertions {
  // Second bracha (Gevuros)
  mashivHaruach: PrayerText;      // Winter: מַשִּׁיב הָרוּחַ וּמוֹרִיד הַגֶּשֶׁם
  moridHatal: PrayerText;          // Summer: מוֹרִיד הַטָּל (Sefard/Edot Mizrach)
  
  // Ninth bracha (Birkas Hashanim)
  vtenBracha: PrayerText;          // Summer: וְתֵן בְּרָכָה
  vtenTalUmatar: PrayerText;       // Winter: וְתֵן טַל וּמָטָר לִבְרָכָה
  
  // Additions
  yaalehVeyavo: PrayerText;        // Rosh Chodesh, Yom Tov, Chol Hamoed
  alHanissimChanukah: PrayerText;  // Chanukah
  alHanissimPurim: PrayerText;     // Purim
  aneinu: PrayerText;              // Fast days
  nachem: PrayerText;              // Tisha B'Av
}
