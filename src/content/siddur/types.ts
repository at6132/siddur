/**
 * Siddur Types
 * Type definitions for prayer content structure
 */

export interface PrayerText {
  hebrew: string;
  english?: string;
  transliteration?: string;
}

export interface PrayerSection {
  id: string;
  name: string;
  nameHebrew: string;
  content: PrayerText[];
  instructions?: string;
}

export interface Prayer {
  id: string;
  name: string;
  nameHebrew: string;
  category: PrayerCategory;
  sections: PrayerSection[];
  conditions?: PrayerConditions;
}

export interface PrayerConditions {
  shabbos?: boolean;
  yomTov?: boolean;
  weekday?: boolean;
  roshChodesh?: boolean;
  fastDay?: boolean;
  chanukah?: boolean;
  purim?: boolean;
  omer?: boolean;
  elul?: boolean;
  asereYemeiTeshuva?: boolean;
}

export type PrayerCategory = 
  | 'morning'
  | 'afternoon'
  | 'evening'
  | 'shabbos'
  | 'yomTov'
  | 'special'
  | 'blessings';

export type ServiceType = 
  | 'shacharis'
  | 'mincha'
  | 'maariv'
  | 'musaf';

export interface DaveningService {
  type: ServiceType;
  sections: string[];
  specialAdditions?: string[];
}

export interface SeasonalVariation {
  id: string;
  name: string;
  startCondition: string;
  endCondition: string;
  affectedPrayers: string[];
  insertionPoint: string;
  text: PrayerText;
}

// Amidah-specific types
export interface AmidahBracha {
  number: number;
  name: string;
  nameHebrew: string;
  theme: string;
  hasInsertion?: boolean;
  insertionType?: 'gevuros' | 'birkas_hashanim' | 'yaaleh_veyavo' | 'al_hanissim' | 'aneinu';
}

export const AMIDAH_BRACHOS: AmidahBracha[] = [
  { number: 1, name: 'Avos', nameHebrew: 'אבות', theme: 'Patriarchs' },
  { number: 2, name: 'Gevuros', nameHebrew: 'גבורות', theme: 'Divine Might', hasInsertion: true, insertionType: 'gevuros' },
  { number: 3, name: 'Kedushas Hashem', nameHebrew: 'קדושת השם', theme: 'Holiness of God' },
  { number: 4, name: 'Binah', nameHebrew: 'בינה', theme: 'Knowledge' },
  { number: 5, name: 'Teshuvah', nameHebrew: 'תשובה', theme: 'Repentance' },
  { number: 6, name: 'Selichah', nameHebrew: 'סליחה', theme: 'Forgiveness' },
  { number: 7, name: 'Geulah', nameHebrew: 'גאולה', theme: 'Redemption' },
  { number: 8, name: 'Refuah', nameHebrew: 'רפואה', theme: 'Healing' },
  { number: 9, name: 'Birkas Hashanim', nameHebrew: 'ברכת השנים', theme: 'Prosperity', hasInsertion: true, insertionType: 'birkas_hashanim' },
  { number: 10, name: 'Kibbutz Galuyos', nameHebrew: 'קיבוץ גלויות', theme: 'Ingathering of Exiles' },
  { number: 11, name: 'Din', nameHebrew: 'דין', theme: 'Justice' },
  { number: 12, name: 'Birkas HaMinim', nameHebrew: 'ברכת המינים', theme: 'Against Heresy' },
  { number: 13, name: 'Tzaddikim', nameHebrew: 'צדיקים', theme: 'The Righteous' },
  { number: 14, name: 'Yerushalayim', nameHebrew: 'ירושלים', theme: 'Jerusalem' },
  { number: 15, name: 'Malchus Beis David', nameHebrew: 'מלכות בית דוד', theme: 'Davidic Kingdom' },
  { number: 16, name: 'Shomea Tefillah', nameHebrew: 'שומע תפילה', theme: 'Hearing Prayer', hasInsertion: true, insertionType: 'aneinu' },
  { number: 17, name: 'Avodah', nameHebrew: 'עבודה', theme: 'Temple Service', hasInsertion: true, insertionType: 'yaaleh_veyavo' },
  { number: 18, name: 'Hodaah', nameHebrew: 'הודאה', theme: 'Thanksgiving', hasInsertion: true, insertionType: 'al_hanissim' },
  { number: 19, name: 'Birkas Kohanim/Shalom', nameHebrew: 'ברכת כהנים/שלום', theme: 'Peace' },
];
