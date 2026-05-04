/**
 * Sefaria API Service
 * Fetches Jewish texts from Sefaria's open API
 *
 * Sefaria texts are under Creative Commons (CC-BY-SA)
 * Attribution: "Texts provided by Sefaria (sefaria.org)"
 *
 * API: https://www.sefaria.org/api (legacy) and https://www.sefaria.org/api/v3/texts (v3)
 *
 * SIDDUR API LANDSCAPE (as of 2024):
 * - Sefaria is the only full, free, programmatic siddur API with complete liturgy and
 *   seasonal content (Amidah insertions, festivals, etc.). We use v3 first, then legacy.
 * - Seasonal changes (mashiv haruach, morid hatal, tal/geshem, yaaleh veyavo, al hanissim)
 *   are driven by our app calendar + fetchAmidahInsertions(); the API has the texts,
 *   we choose which refs to show by date.
 * - Optional fallback: Sefaria JSON export (full Siddur Ashkenaz) at
 *   https://github.com/Sefaria/Sefaria-Export/tree/master/json/Liturgy/Siddur/Siddur%20Ashkenaz
 *   and https://huggingface.co/Sefaria/database_export — same content, static files.
 * - Open Siddur (opensiddur.org) has rich liturgy and seasonal organization but no
 *   simple REST API for "get siddur for date X"; it's a toolkit for building custom siddurim.
 * - Hebcal (hebcal.com) provides calendar/leyning/holidays, not full prayer text.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { JewishCalendarService } from '../core/calendar/JewishCalendar';
import { UserPreferencesService } from '../storage/UserPreferences';
import {
  removeParagraphTitles,
  AMIDAH_BRACHA_TITLES,
  extractAmidahKedushaFoldout,
  extractModimDerabananFoldout,
  stripAmidahEpilogueKaddishLedavid,
  trimAlHanissimInsertionByCalendar,
  splitMinchaAmidahBeforeStandaloneAleinu,
  extractBirchosHashacharExpansionFoldout,
} from './MinchaTextRules';
import { applyWeekdayAmidahTextPipeline } from './AmidahTextPipeline';
import { applyShacharitSiddurSectionPipeline } from './ShacharitSectionPipelines';

const SEFARIA_API_BASE = 'https://www.sefaria.org/api';
const SEFARIA_V3_TEXTS = 'https://www.sefaria.org/api/v3/texts';
const CACHE_PREFIX = '@sefaria_cache_v5_';
const CACHE_EXPIRY_DAYS = 30;
/** Max wait per request so we never hang on "Loading prayers..." */
const FETCH_TIMEOUT_MS = 12_000;
const MODEH_ANI_APPENDIX =
  'רֵאשִׁית חָכְמָה יִרְאַת יְהֹוָה, שֵֽׂכֶל טוֹב לְכָל־עֹשֵׂיהֶם, תְּהִלָּתוֹ עוֹמֶֽדֶת לָעַד: בָּרוּךְ שֵׁם כְּבוֹד מַלְכוּתוֹ לְעוֹלָם וָעֶד:';

export interface SefariaText {
  hebrew: string | string[];
  english?: string | string[];
  hebrewTitle?: string;
  ref?: string;
}

export interface SefariaVerse {
  number: number;
  hebrew: string;
  english: string;
}

export interface TehillimChapterData {
  chapter: number;
  hebrewNumber: string;
  title: string;
  verses: SefariaVerse[];
}

export interface PrayerTextSegment {
  text: string;
  italic: boolean;
}

export interface PrayerTextData {
  hebrew: string;
  english: string;
  transliteration?: string;
  /** When present, instructions from Sefaria (<i>, <small>) are marked for italic/smaller rendering. */
  hebrewSegments?: PrayerTextSegment[];
  englishSegments?: PrayerTextSegment[];
  /** Amidah only: text before kedushaFoldout when the foldout is spliced between גבורות and אתה קדוש. */
  hebrewBeforeKedushaFoldout?: string;
  englishBeforeKedushaFoldout?: string;
  hebrewBeforeKedushaFoldoutSegments?: PrayerTextSegment[];
  englishBeforeKedushaFoldoutSegments?: PrayerTextSegment[];
  /** Amidah only: Chazaras ha-shatz Kedushah block (collapsible "קדושה" in the reader). */
  kedushaFoldout?: PrayerTextData;
  /** Amidah only: text before `modimDerabananFoldout` when that block is spliced out of Modim. */
  hebrewBeforeModimDerabananFoldout?: string;
  englishBeforeModimDerabananFoldout?: string;
  hebrewBeforeModimDerabananFoldoutSegments?: PrayerTextSegment[];
  englishBeforeModimDerabananFoldoutSegments?: PrayerTextSegment[];
  /** Amidah only: Modim deRabbanan paragraph (collapsible "מודים דרבנן" in the reader). */
  modimDerabananFoldout?: PrayerTextData;
  /** Birchot HaShachar only: optional long Zichronos / Akeda expansion (collapsible "הרחבת ברכות השחר"). */
  birchosHashacharExpansionFoldout?: PrayerTextData;
  hebrewBeforeBirchosHashacharExpansionFoldout?: string;
  englishBeforeBirchosHashacharExpansionFoldout?: string;
  hebrewBeforeBirchosHashacharExpansionFoldoutSegments?: PrayerTextSegment[];
  englishBeforeBirchosHashacharExpansionFoldoutSegments?: PrayerTextSegment[];
}

/** Fetch with timeout; throws on timeout or non-OK. */
function fetchWithTimeout(url: string, ms: number = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(id));
}

export class SefariaService {
  /** Rough bbox for Israel: ותן טל ומטר from 7 Cheshvan; outside = diaspora (Dec 4/5). */
  private static isLikelyIsraelLocation(loc?: { latitude: number; longitude: number }): boolean {
    if (!loc) return false;
    const { latitude: lat, longitude: lon } = loc;
    return lat >= 29.3 && lat <= 33.5 && lon >= 34.05 && lon <= 35.9;
  }

  /**
   * Fetch a text from Sefaria API (tries v3 first, then legacy). Times out after FETCH_TIMEOUT_MS.
   */
  static async fetchText(ref: string): Promise<SefariaText | null> {
    const cached = await this.getFromCache(ref);
    if (cached) {
      return cached;
    }

    // Sefaria: comma+space ref works best (test script confirmed). Then underscore. Period fails for Siddur.
    const encodedRef = encodeURIComponent(ref);
    const trefUnderscore = ref.replace(/ /g, '_');
    const encodedTrefUnderscore = encodeURIComponent(trefUnderscore);

    // Try legacy first (returns he/text directly); then v3
    const encodingsToTry = [
      { enc: encodedRef, label: 'comma+space' },
      { enc: encodedTrefUnderscore, label: 'underscore' },
    ];
    for (const { enc, label } of encodingsToTry) {
      try {
        const url = `${SEFARIA_API_BASE}/texts/${enc}?context=0`;
        const response = await fetchWithTimeout(url);
        if (response.ok) {
          const data = await response.json();
          const result =
            this.normalizeSefariaResponse(data, ref) ??
            ({
              hebrew: data.he ?? data.text,
              english: data.text,
              hebrewTitle: data.heTitle,
              ref: data.ref,
            } as SefariaText);
          if (result && (result.hebrew || result.english)) {
            const cleaned = this.stripEndMarkersFromSefariaText(result);
            await this.saveToCache(ref, cleaned);
            return cleaned;
          }
          console.warn(`Sefaria [legacy]: ref="${ref}" OK but no hebrew/english in response (encoding: ${label})`);
        } else {
          console.warn(`Sefaria [legacy]: ref="${ref}" status=${response.status} encoding=${label} url=${url}`);
        }
      } catch (e) {
        const msg = e instanceof Error && e.name === 'AbortError' ? 'timeout' : String(e);
        console.warn(`Sefaria [legacy]: ref="${ref}" encoding=${label} ${msg}`);
      }
    }
    for (const { enc, label } of encodingsToTry) {
      try {
        const url = `${SEFARIA_V3_TEXTS}/${enc}`;
        const v3Response = await fetchWithTimeout(url);
        if (v3Response.ok) {
          const data = await v3Response.json();
          const result = this.normalizeSefariaResponse(data, ref);
          if (result && (result.hebrew || result.english)) {
            const cleaned = this.stripEndMarkersFromSefariaText(result);
            await this.saveToCache(ref, cleaned);
            return cleaned;
          }
          console.warn(`Sefaria [v3]: ref="${ref}" OK but no hebrew/english in response (encoding: ${label})`);
        } else {
          console.warn(`Sefaria [v3]: ref="${ref}" status=${v3Response.status} encoding=${label} url=${url}`);
        }
      } catch (e) {
        const msg = e instanceof Error && e.name === 'AbortError' ? 'timeout' : String(e);
        console.warn(`Sefaria [v3]: ref="${ref}" encoding=${label} ${msg}`);
      }
    }
    console.warn(`Sefaria: could not load ref="${ref}" (tried legacy + v3, both encodings, ${FETCH_TIMEOUT_MS}ms timeout)`);
    return null;
  }

  /**
   * Normalize v3 (or similar) API response to SefariaText
   */
  private static normalizeSefariaResponse(data: any, ref: string): SefariaText | null {
    let hebrew: string | string[] = '';
    let english: string | string[] = '';
    const hebrewTitle = data.heTitle ?? data.title?.he ?? undefined;

    if (data.he != null && data.text != null) {
      hebrew = data.he;
      english = data.text;
    } else if (data.contents != null) {
      const c = data.contents;
      hebrew = c.he ?? c.hebrew ?? '';
      english = c.en ?? c.text ?? c.english ?? '';
    } else if (data.he != null) {
      hebrew = data.he;
      english = data.en ?? data.text ?? '';
    } else {
      return null;
    }

    // Range refs return array of chapters, each chapter = array of verses. Flatten to array of strings (one per chapter).
    const flattenSegments = (v: string | string[]): string | string[] => {
      if (typeof v === 'string') return v;
      if (!Array.isArray(v) || v.length === 0) return v;
      const first = v[0];
      if (Array.isArray(first)) {
        return v.map((ch) => (Array.isArray(ch) ? ch.join(' ') : String(ch)));
      }
      return v;
    };
    hebrew = flattenSegments(hebrew);
    english = flattenSegments(english);

    return {
      hebrew,
      english,
      hebrewTitle,
      ref: data.ref ?? ref,
    };
  }

  /**
   * Strip Sefaria end-of-section markers from a full SefariaText (hebrew/english can be string or string[]).
   */
  private static stripEndMarkersFromSefariaText(data: SefariaText): SefariaText {
    const strip = (v: string | string[]): string | string[] => {
      if (typeof v === 'string') return this.stripSefariaEndMarkers(v);
      return v.map((s) => this.stripSefariaEndMarkers(s));
    };
    return {
      ...data,
      hebrew: strip(data.hebrew),
      english: data.english != null ? strip(data.english) : undefined,
    };
  }

  /**
   * Fetch a complete Tehillim chapter
   */
  static async fetchTehillimChapter(chapter: number): Promise<TehillimChapterData | null> {
    const ref = `Psalms.${chapter}`;
    const data = await this.fetchText(ref);
    
    if (!data) return null;

    const hebrewVerses = Array.isArray(data.hebrew) ? data.hebrew : [data.hebrew];
    const englishVerses = Array.isArray(data.english) ? data.english : [data.english];

    const verses: SefariaVerse[] = hebrewVerses.map((heb, index) => ({
      number: index + 1,
      hebrew: this.cleanHtml(heb),
      english: this.cleanHtml(englishVerses[index] || ''),
    }));

    return {
      chapter,
      hebrewNumber: this.numberToHebrew(chapter),
      title: data.hebrewTitle || `תהלים ${this.numberToHebrew(chapter)}`,
      verses,
    };
  }

  /**
   * Fetch all 150 Tehillim chapters (with progress callback)
   */
  static async fetchAllTehillim(
    onProgress?: (current: number, total: number) => void
  ): Promise<Map<number, TehillimChapterData>> {
    const chapters = new Map<number, TehillimChapterData>();
    
    for (let i = 1; i <= 150; i++) {
      const chapter = await this.fetchTehillimChapter(i);
      if (chapter) {
        chapters.set(i, chapter);
      }
      if (onProgress) {
        onProgress(i, 150);
      }
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return chapters;
  }

  /**
   * Fetch a single daf (page) of Talmud from Sefaria.
   * Ref format: "TractateName DafNumbera" or "TractateName DafNumberb" (e.g. "Berakhot 5a").
   */
  static async fetchTalmudPage(
    tractate: string,
    daf: number,
    side: 'a' | 'b'
  ): Promise<SefariaText | null> {
    const ref = `${tractate} ${daf}${side}`;
    return this.fetchText(ref);
  }

  // ==========================================
  // SIDDUR SECTIONS - Sefaria refs, main sections only, straight lines
  // ==========================================

  /** Siddur Ashkenaz – main section refs (Weekday Shacharit, Mincha, Maariv). */
  static SIDDUR_ASHKENAZ_REFS: { [key: string]: string } = {
    // Shacharis
    preparatory: 'Siddur Ashkenaz, Weekday, Shacharit, Preparatory Prayers',
    birchot_hashachar: 'Siddur Ashkenaz, Weekday, Shacharit, Birkot HaShachar',
    pesukei_dzimra: 'Siddur Ashkenaz, Weekday, Shacharit, Pesukei D\'Zimra',
    yotzer_or: 'Siddur Ashkenaz, Weekday, Shacharit, Blessings of the Shema',
    shema: 'Siddur Ashkenaz, Weekday, Shacharit, The Shema',
    amidah: 'Siddur Ashkenaz, Weekday, Shacharit, Amidah',
    tachanun: 'Siddur Ashkenaz, Weekday, Shacharit, Tachanun',
    ashrei: 'Siddur Ashkenaz, Weekday, Shacharit, Ashrei',
    concluding: 'Siddur Ashkenaz, Weekday, Shacharit, Concluding Prayers',
    // Mincha
    mincha_korbanot: 'Siddur Ashkenaz, Weekday, Mincha, Korbanot',
    mincha_ashrei: 'Siddur Ashkenaz, Weekday, Mincha, Ashrei',
    mincha_amidah: 'Siddur Ashkenaz, Weekday, Mincha, Amidah',
    /** Same Aleinu as Shacharit concluding child ref (Mincha blob may omit it after processing). */
    mincha_aleinu: 'Siddur Ashkenaz, Weekday, Shacharit, Concluding Prayers, Alenu',
    // Maariv
    maariv_shema: 'Siddur Ashkenaz, Weekday, Maariv, The Shema',
    maariv_amidah: 'Siddur Ashkenaz, Weekday, Maariv, Amidah',
    // Brachos / standalone
    netilas_yadayim: 'Siddur Ashkenaz, Weekday, Shacharit, Preparatory Prayers, Netilat Yadayim',
    asher_yatzar: 'Siddur Ashkenaz, Weekday, Shacharit, Preparatory Prayers, Asher Yatzar',
    birchos_hatorah: 'Siddur Ashkenaz, Weekday, Shacharit, Torah Reading, Reading from Sefer, Birkat HaTorah',
    modeh_ani: 'Siddur Ashkenaz, Weekday, Shacharit, Preparatory Prayers, Modeh Ani',
    tefilas_haderech: 'Siddur Ashkenaz, Berachot, Tefillat HaDerech',
    birchas_hamazon: 'Siddur Ashkenaz, Berachot, Birkat HaMazon',
    al_hamichya: 'Siddur Ashkenaz, Berachot, Birkat Hanehenin, Eating, Brachot Achronot, Al Hamichyah',
    krias_shema_al_hamita: 'Siddur Sefard, Bedtime Shema',
    kabbalas_shabbos: 'Siddur Ashkenaz, Kabbalat Shabbat',
    lecha_dodi: 'Siddur Ashkenaz, Kabbalat Shabbat, Lekha Dodi',
    kiddush_friday: 'Siddur Ashkenaz, Kiddush, Friday Night',
    kiddush_shabbos_day: 'Siddur Ashkenaz, Kiddush, Shabbat Day',
    havdalah: 'Siddur Ashkenaz, Havdalah',
  };

  /** Siddur Sefard – main section refs. */
  static SIDDUR_SEFARD_REFS: { [key: string]: string } = {
    // Shacharis
    preparatory: 'Siddur Sefard, Upon Arising, Introductory Prayers',
    birchot_hashachar: 'Siddur Sefard, Weekday Shacharit, Morning Blessings',
    /** Sefaria has no dedicated Sfard PDZ node here; Ashkenaz PDZ is used (Sfard slot was wrongly Birchot HaTorah). */
    pesukei_dzimra: 'Siddur Ashkenaz, Weekday, Shacharit, Pesukei D\'Zimra',
    yotzer_or: 'Siddur Sefard, Weekday Shacharit, Morning Prayer',
    shema: 'Siddur Sefard, Weekday Shacharit, The Shema',
    amidah: 'Siddur Sefard, Weekday Shacharit, Amidah',
    tachanun: 'Siddur Sefard, Weekday Shacharit, Tachanun',
    ashrei: 'Siddur Sefard, Weekday Shacharit, Ashrei',
    concluding: 'Siddur Sefard, Weekday Shacharit, Aleinu',
    // Mincha
    mincha_korbanot: 'Siddur Sefard, Weekday Mincha, Korbanot',
    mincha_ashrei: 'Siddur Sefard, Weekday Mincha, Ashrei',
    mincha_amidah: 'Siddur Sefard, Weekday Mincha, Amidah',
    mincha_aleinu: 'Siddur Ashkenaz, Weekday, Shacharit, Concluding Prayers, Alenu',
    // Maariv
    maariv_shema: 'Siddur Sefard, Weekday Maariv, The Shema',
    maariv_amidah: 'Siddur Sefard, Weekday Maariv, Amidah',
    // Brachos / standalone – Siddur Sefard lacks these; use Ashkenaz refs (same text)
    netilas_yadayim: 'Siddur Ashkenaz, Weekday, Shacharit, Preparatory Prayers, Netilat Yadayim',
    asher_yatzar: 'Siddur Ashkenaz, Weekday, Shacharit, Preparatory Prayers, Asher Yatzar',
    birchos_hatorah: 'Siddur Ashkenaz, Weekday, Shacharit, Torah Reading, Reading from Sefer, Birkat HaTorah',
    modeh_ani: 'Siddur Sefard, Upon Arising, Modeh Ani',
    tefilas_haderech: 'Siddur Sefard, Berachot, Tefillat HaDerech',
    birchas_hamazon: 'Siddur Ashkenaz, Berachot, Birkat HaMazon',
    al_hamichya: 'Siddur Ashkenaz, Berachot, Birkat Hanehenin, Eating, Brachot Achronot, Al Hamichyah',
    krias_shema_al_hamita: 'Siddur Sefard, Bedtime Shema',
    kabbalas_shabbos: 'Siddur Sefard, Kabbalat Shabbat',
    lecha_dodi: 'Siddur Sefard, Kabbalat Shabbat, Lekha Dodi',
    kiddush_friday: 'Siddur Sefard, Kiddush, Friday Night',
    kiddush_shabbos_day: 'Siddur Sefard, Kiddush, Shabbat Day',
    havdalah: 'Siddur Sefard, Havdalah',
  };

  /** Main sections per service: key, title, hebrewTitle. No subsections. */
  private static SIDDUR_MAIN_SECTIONS: {
    shacharis: { key: string; title: string; hebrewTitle: string }[];
    mincha: { key: string; title: string; hebrewTitle: string }[];
    maariv: { key: string; title: string; hebrewTitle: string }[];
  } = {
    shacharis: [
      { key: 'preparatory', title: 'Preparatory Prayers', hebrewTitle: 'הכנות' },
      { key: 'birchot_hashachar', title: 'Morning Blessings', hebrewTitle: 'ברכות השחר' },
      { key: 'pesukei_dzimra', title: 'Pesukei D\'Zimra', hebrewTitle: 'פסוקי דזמרה' },
      { key: 'yotzer_or', title: 'Blessings of the Shema', hebrewTitle: 'ברכות קריאת שמע' },
      { key: 'shema', title: 'The Shema', hebrewTitle: 'קריאת שמע' },
      { key: 'amidah', title: 'Amidah', hebrewTitle: 'עמידה' },
      { key: 'tachanun', title: 'Tachanun', hebrewTitle: 'תחנון' },
      { key: 'ashrei', title: 'Ashrei', hebrewTitle: 'אשרי' },
      { key: 'concluding', title: 'Concluding Prayers', hebrewTitle: 'סיום' },
    ],
    mincha: [
      { key: 'mincha_korbanot', title: 'Korbanot', hebrewTitle: 'קרבנות' },
      { key: 'mincha_ashrei', title: 'Ashrei', hebrewTitle: 'אשרי' },
      { key: 'mincha_amidah', title: 'Amidah', hebrewTitle: 'עמידה' },
      { key: 'mincha_aleinu', title: 'Aleinu', hebrewTitle: 'עלינו' },
    ],
    maariv: [
      { key: 'maariv_shema', title: 'The Shema', hebrewTitle: 'קריאת שמע' },
      { key: 'maariv_amidah', title: 'Amidah', hebrewTitle: 'עמידה' },
    ],
  };

  /**
   * Sefaria's Mincha Korbanot ref returns Korbanot + Ashrei in one blob.
   * Split at the first paragraph that starts with "אשרי" so we can show Korbanot only in the collapsible
   * and Ashrei as its own section.
   */
  private static splitMinchaKorbanotAshrei(
    rawHebrew: string,
    rawEnglish: string
  ): { korbanotHebrew: string; korbanotEnglish: string; ashreiHebrew: string; ashreiEnglish: string } {
    const stripNikkud = (s: string) => s.replace(/[\u0591-\u05C7]/g, '');
    const hebParas = rawHebrew.split(/\n\s*\n/);
    const engParas = rawEnglish.split(/\n\s*\n/);
    let ashreiIdx = -1;
    for (let i = 0; i < hebParas.length; i++) {
      const trimmed = hebParas[i].trim();
      const start = stripNikkud(trimmed);
      if (start.startsWith('אשרי')) {
        ashreiIdx = i;
        break;
      }
    }
    if (ashreiIdx < 0) {
      return {
        korbanotHebrew: rawHebrew,
        korbanotEnglish: rawEnglish,
        ashreiHebrew: '',
        ashreiEnglish: '',
      };
    }
    const korbanotHebrew = hebParas.slice(0, ashreiIdx).join('\n\n').trim();
    const ashreiHebrew = hebParas.slice(ashreiIdx).join('\n\n').trim();
    const engIdx = Math.min(ashreiIdx, engParas.length);
    const korbanotEnglish = engParas.slice(0, engIdx).join('\n\n').trim();
    const ashreiEnglish = engParas.slice(engIdx).join('\n\n').trim();
    return { korbanotHebrew, korbanotEnglish, ashreiHebrew, ashreiEnglish };
  }

  /**
   * Fetch a siddur section from Sefaria. Returns straight text (single newlines only).
   * For Sefard, falls back to Ashkenaz refs when Sefard refs fail (Sefaria's Siddur Sefard
   * has a different structure; Netilat Yadayim, Asher Yatzar, Birkot HaTorah etc. use same text).
   */
  static async fetchSiddurSection(
    sectionKey: string,
    nusach: 'ashkenaz' | 'sfard' = 'ashkenaz'
  ): Promise<PrayerTextData | null> {
    const refs = nusach === 'sfard' ? this.SIDDUR_SEFARD_REFS : this.SIDDUR_ASHKENAZ_REFS;
    const ashkenazRef = this.SIDDUR_ASHKENAZ_REFS[sectionKey];
    let ref = refs[sectionKey];

    if (!ref) {
      console.warn(`Sefaria: no ref for sectionKey="${sectionKey}" nusach=${nusach}`);
      return null;
    }

    // Mincha Ashrei: Sefaria has Ashrei inside Korbanot ref; fetch the combined content and split in code
    if (sectionKey === 'mincha_ashrei') {
      ref = refs['mincha_korbanot'] ?? ref;
    }

    console.log(`Sefaria: fetchSiddurSection sectionKey="${sectionKey}" nusach=${nusach} ref="${ref}"`);
    let data = await this.fetchText(ref);

    // Fallback to Ashkenaz for Sefard when Sefard ref fails (Siddur Sefard structure differs)
    if (!data && nusach === 'sfard' && ashkenazRef) {
      console.log(`Sefaria: sfard ref failed, falling back to Ashkenaz ref="${ashkenazRef}"`);
      data = await this.fetchText(ashkenazRef);
    }
    if (!data) return null;

    try {
      let amidahKedushaFoldout: PrayerTextData | undefined;
      let amidahKedushaPrefixHebrew: string | undefined;
      let amidahKedushaPrefixEnglish: string | undefined;
      let amidahModimDerabananFoldout: PrayerTextData | undefined;
      let amidahModimPrefixHebrew: string | undefined;
      let amidahModimPrefixEnglish: string | undefined;
      let birchosHashacharExpansionFoldout: PrayerTextData | undefined;
      let hebrewBeforeBirchosHashacharExpansionFoldout: string | undefined;
      let englishBeforeBirchosHashacharExpansionFoldout: string | undefined;
      let hebrewBeforeBirchosHashacharExpansionFoldoutSegments: PrayerTextSegment[] | undefined;
      let englishBeforeBirchosHashacharExpansionFoldoutSegments: PrayerTextSegment[] | undefined;
      // Ensure we have plain strings; flatten nested arrays (Sefaria can return [[ "p1", "p2" ], [ "p3" ]])
      const toStr = (v: unknown): string => {
        if (typeof v === 'string') return v;
        if (Array.isArray(v)) {
          return v.map((x) => toStr(x)).join('\n\n');
        }
        if (v && typeof v === 'object' && 'text' in v) return String((v as { text: string }).text);
        return String(v ?? '');
      };
      let rawHebrewStr = toStr(data.hebrew);
      let rawEnglishStr = toStr(data.english);
      // Amidah: remove bracha title lines (אבות, גבורות, etc.) – shared list in MinchaTextRules
      if (sectionKey === 'amidah' || sectionKey === 'maariv_amidah' || sectionKey === 'mincha_amidah') {
        const stripped = removeParagraphTitles(rawHebrewStr, rawEnglishStr, AMIDAH_BRACHA_TITLES);
        rawHebrewStr = stripped.hebrew;
        rawEnglishStr = stripped.english;
        const amidahDate = new Date();
        let israelForRain = false;
        try {
          const prefs = await UserPreferencesService.getPreferences();
          israelForRain = SefariaService.isLikelyIsraelLocation(prefs?.location);
        } catch {
          /* default diaspora */
        }
        const amidahSlot: 'shacharit' | 'mincha' | 'maariv' =
          sectionKey === 'mincha_amidah' ? 'mincha' : sectionKey === 'maariv_amidah' ? 'maariv' : 'shacharit';
        const piped = applyWeekdayAmidahTextPipeline(rawHebrewStr, rawEnglishStr, {
          date: amidahDate,
          israelForRainInsertion: israelForRain,
          amidahSlot,
        });
        rawHebrewStr = piped.hebrew;
        rawEnglishStr = piped.english;
        const kedushaSplit = extractAmidahKedushaFoldout(rawHebrewStr, rawEnglishStr);
        rawHebrewStr = kedushaSplit.mainHebrew;
        rawEnglishStr = kedushaSplit.mainEnglish;
        if (kedushaSplit.mainHebrewBeforeFoldout?.trim()) {
          amidahKedushaPrefixHebrew = kedushaSplit.mainHebrewBeforeFoldout.trim();
          amidahKedushaPrefixEnglish = kedushaSplit.mainEnglishBeforeFoldout?.trim() ?? '';
        }
        if (kedushaSplit.kedushaHebrew?.trim()) {
          amidahKedushaFoldout = {
            hebrew: kedushaSplit.kedushaHebrew.trim(),
            english: kedushaSplit.kedushaEnglish?.trim() ?? '',
          };
        }
        const epilogued = stripAmidahEpilogueKaddishLedavid(rawHebrewStr, rawEnglishStr, amidahDate);
        rawHebrewStr = epilogued.hebrew;
        rawEnglishStr = epilogued.english;
        const modimSplit = extractModimDerabananFoldout(rawHebrewStr, rawEnglishStr);
        if (modimSplit.foldoutHebrew?.trim()) {
          amidahModimPrefixHebrew = modimSplit.prefixHebrew;
          amidahModimPrefixEnglish = modimSplit.prefixEnglish;
          const prefixTrim = trimAlHanissimInsertionByCalendar(
            amidahModimPrefixHebrew,
            amidahModimPrefixEnglish ?? '',
            amidahDate
          );
          amidahModimPrefixHebrew = prefixTrim.hebrew;
          amidahModimPrefixEnglish = prefixTrim.english;
          amidahModimDerabananFoldout = {
            hebrew: modimSplit.foldoutHebrew.trim(),
            english: modimSplit.foldoutEnglish?.trim() ?? '',
          };
          rawHebrewStr = modimSplit.suffixHebrew.trim();
          rawEnglishStr = modimSplit.suffixEnglish.trim();
        }
      }
      // Shacharit-style siddur string pipelines (per sectionKey); see `ShacharitSectionPipelines.ts`
      const siddurSectionCtxDate = new Date();
      const shacharitPiped = applyShacharitSiddurSectionPipeline(sectionKey, rawHebrewStr, rawEnglishStr, {
        date: siddurSectionCtxDate,
        nusach,
      });
      rawHebrewStr = shacharitPiped.hebrew;
      rawEnglishStr = shacharitPiped.english;
      // Shacharis guarantee: if netilas text is present but מודה אני / ציצית are missing,
      // prepend them from dedicated refs so they always appear before "על נטילת ידים".
      if (sectionKey === 'birchot_hashachar' || sectionKey === 'preparatory') {
        const stripNikkud = (s: string) => s.replace(/[\u0591-\u05C7]/g, '');
        const hNorm = stripNikkud(rawHebrewStr);
        const hasNetilas = /על\s+נטילת\s+יד/.test(hNorm);
        if (hasNetilas) {
          const hasModehAni = /מודה\s+אני/.test(hNorm);
          const hasTzitzis = /ציצית/.test(hNorm);
          const prependHebrew: string[] = [];
          const prependEnglish: string[] = [];

          if (!hasModehAni) {
            const modehRef =
              (nusach === 'sfard' ? this.SIDDUR_SEFARD_REFS.modeh_ani : this.SIDDUR_ASHKENAZ_REFS.modeh_ani) ??
              this.SIDDUR_ASHKENAZ_REFS.modeh_ani;
            if (modehRef) {
              const mData = await this.fetchText(modehRef);
              if (mData) {
                let mH = toStr(mData.hebrew).trim();
                const mE = toStr(mData.english).trim();
                const mNoNik = mH.replace(/[\u0591-\u05C7]/g, '');
                if (mH && !/ראשית\s+חכמה/.test(mNoNik)) {
                  mH = `${mH}\n${MODEH_ANI_APPENDIX}`;
                }
                if (mH) prependHebrew.push(mH);
                if (mE) prependEnglish.push(mE);
              }
            }
          }

          if (!hasTzitzis) {
            const tzitzisRef = 'Siddur Ashkenaz, Weekday, Shacharit, Preparatory Prayers, Tzitzit';
            const tData = await this.fetchText(tzitzisRef);
            if (tData) {
              const tH = toStr(tData.hebrew).trim();
              const tE = toStr(tData.english).trim();
              if (tH) prependHebrew.push(tH);
              if (tE) prependEnglish.push(tE);
            }
          }

          if (prependHebrew.length > 0) {
            rawHebrewStr = `${prependHebrew.join('\n\n')}\n\n${rawHebrewStr.trimStart()}`;
          }
          if (prependEnglish.length > 0) {
            rawEnglishStr = `${prependEnglish.join('\n\n')}\n\n${rawEnglishStr.trimStart()}`;
          }
        }
      }
      // Always remove the printed note "בט' אב ויוה\"כ אין אומרים ברכה זו" (and close variants)
      // regardless of which Shacharis subsection Sefaria currently places it in.
      {
        const nik = '[\\u0591-\\u05C7]*';
        const gap = '(?:\\s|<[^>]+>|<br\\s*\\/?>)*';
        const q = `['"׳״\\u05F3\\u05F4\\u2018\\u2019\\u201C\\u201D]?`;
        const bAv = `(?:ב${nik}י${nik}ו${nik}ם${gap})?(?:ב${nik}ט${q}${gap}א${nik}ב|ט${q}${gap}ב${nik}א${nik}ב)`;
        const yk = `ו${nik}י${nik}ו${nik}ה${q}${nik}כ`;
        const note = `א${nik}י${nik}נ${gap}א${nik}ו${nik}מ${nik}ר${nik}י${nik}ם${gap}ב${nik}ר${nik}כ${nik}ה${gap}ז${nik}ו`;
        const re = new RegExp(`${bAv}${gap}${yk}${gap}${note}\\s*[:׃.]?`, 'gu');
        rawHebrewStr = rawHebrewStr.replace(re, '').replace(/\n{3,}/g, '\n\n').trim();
      }
      // Mincha: split Korbanot vs Ashrei (Chatzi Kaddish removal is done in the reader, same as Bentching)
      if (sectionKey === 'mincha_korbanot' || sectionKey === 'mincha_ashrei') {
        const split = this.splitMinchaKorbanotAshrei(rawHebrewStr, rawEnglishStr);
        if (sectionKey === 'mincha_korbanot') {
          rawHebrewStr = split.korbanotHebrew;
          rawEnglishStr = split.korbanotEnglish;
        } else {
          rawHebrewStr = split.ashreiHebrew;
          rawEnglishStr = split.ashreiEnglish;
        }
      }
      // Preserve paragraph breaks (\n\n) for readability (e.g. Tefillas HaDerech)
      const normalizeParagraphs = (s: string) => s.replace(/\n\s*\n/g, '\n\n').trim();

      // Shacharis optional long Zichronos / Akeda block (Birkot HaShachar only):
      // split on the **raw** API string *before* parseInstructionSegments so Sefaria <i>/<small>
      // boundaries cannot prevent matching. Must **not** run on Pesukei D'Zimra etc.: the start phrase
      // can appear as a substring there and would empty the main body (foldout is reader-specific).
      if (
        (sectionKey === 'birchot_hashachar' || sectionKey === 'preparatory') &&
        !birchosHashacharExpansionFoldout?.hebrew?.trim()
      ) {
        const bhSplit = extractBirchosHashacharExpansionFoldout(rawHebrewStr, rawEnglishStr);
        if (bhSplit) {
          const nP = (s: string) => s.replace(/\n\s*\n/g, '\n\n').trim();
          if (bhSplit.beforeHebrew.trim()) {
            hebrewBeforeBirchosHashacharExpansionFoldout = nP(bhSplit.beforeHebrew);
            englishBeforeBirchosHashacharExpansionFoldout = nP(bhSplit.beforeEnglish);
            hebrewBeforeBirchosHashacharExpansionFoldoutSegments = this.parseInstructionSegments(
              hebrewBeforeBirchosHashacharExpansionFoldout
            ).map((seg) => ({
              text: normalizeParagraphs(seg.text),
              italic: seg.italic,
            }));
            englishBeforeBirchosHashacharExpansionFoldoutSegments = englishBeforeBirchosHashacharExpansionFoldout.trim()
              ? this.parseInstructionSegments(englishBeforeBirchosHashacharExpansionFoldout).map((seg) => ({
                  text: normalizeParagraphs(seg.text),
                  italic: seg.italic,
                }))
              : undefined;
          }
          const foldHSeg = this.parseInstructionSegments(bhSplit.foldoutHebrew).map((seg) => ({
            text: normalizeParagraphs(seg.text),
            italic: seg.italic,
          }));
          const foldESeg = bhSplit.foldoutEnglish.trim()
            ? this.parseInstructionSegments(bhSplit.foldoutEnglish).map((seg) => ({
                text: normalizeParagraphs(seg.text),
                italic: seg.italic,
              }))
            : undefined;
          birchosHashacharExpansionFoldout = {
            hebrew: foldHSeg.map((s) => s.text).join('').replace(/\n\s*\n/g, '\n\n').trim(),
            english: (foldESeg ?? []).map((s) => s.text).join('').replace(/\n\s*\n/g, '\n\n').trim(),
            hebrewSegments: foldHSeg,
            englishSegments: foldESeg,
          };
          rawHebrewStr = bhSplit.beforeHebrew.trim()
            ? nP(`${bhSplit.beforeHebrew.trimEnd()}\n\n${bhSplit.mainHebrew.trimStart()}`)
            : nP(bhSplit.mainHebrew);
          rawEnglishStr = bhSplit.beforeEnglish.trim()
            ? nP(`${bhSplit.beforeEnglish.trimEnd()}\n\n${bhSplit.mainEnglish.trimStart()}`)
            : nP(bhSplit.mainEnglish);
        }
      }

      const hebrewSegments = this.parseInstructionSegments(rawHebrewStr).map((seg) => ({
        text: normalizeParagraphs(seg.text),
        italic: seg.italic,
      }));
      const englishSegments = this.parseInstructionSegments(rawEnglishStr).map((seg) => ({
        text: normalizeParagraphs(seg.text),
        italic: seg.italic,
      }));

      let finalHebrewBeforeKedushaSegments: PrayerTextSegment[] | undefined;
      let finalEnglishBeforeKedushaSegments: PrayerTextSegment[] | undefined;
      if (amidahKedushaPrefixHebrew) {
        finalHebrewBeforeKedushaSegments = this.parseInstructionSegments(amidahKedushaPrefixHebrew).map((seg) => ({
          text: normalizeParagraphs(seg.text),
          italic: seg.italic,
        }));
        if (amidahKedushaPrefixEnglish?.trim()) {
          finalEnglishBeforeKedushaSegments = this.parseInstructionSegments(amidahKedushaPrefixEnglish).map((seg) => ({
            text: normalizeParagraphs(seg.text),
            italic: seg.italic,
          }));
        }
      }

      if (amidahKedushaFoldout) {
        const khSeg = this.parseInstructionSegments(amidahKedushaFoldout.hebrew).map((seg) => ({
          text: normalizeParagraphs(seg.text),
          italic: seg.italic,
        }));
        const keRaw = amidahKedushaFoldout.english;
        const keSeg = keRaw.trim()
          ? this.parseInstructionSegments(keRaw).map((seg) => ({
              text: normalizeParagraphs(seg.text),
              italic: seg.italic,
            }))
          : undefined;
        amidahKedushaFoldout = {
          hebrew: khSeg.map((s) => s.text).join('').replace(/\n\s*\n/g, '\n\n').trim(),
          english: (keSeg ?? []).map((s) => s.text).join('').replace(/\n\s*\n/g, '\n\n').trim(),
          hebrewSegments: khSeg,
          englishSegments: keSeg,
        };
      }

      let finalHebrewBeforeModimSegments: PrayerTextSegment[] | undefined;
      let finalEnglishBeforeModimSegments: PrayerTextSegment[] | undefined;
      if (amidahModimPrefixHebrew?.trim()) {
        finalHebrewBeforeModimSegments = this.parseInstructionSegments(amidahModimPrefixHebrew).map((seg) => ({
          text: normalizeParagraphs(seg.text),
          italic: seg.italic,
        }));
        if (amidahModimPrefixEnglish?.trim()) {
          finalEnglishBeforeModimSegments = this.parseInstructionSegments(amidahModimPrefixEnglish).map((seg) => ({
            text: normalizeParagraphs(seg.text),
            italic: seg.italic,
          }));
        }
      }

      if (amidahModimDerabananFoldout) {
        const mhSeg = this.parseInstructionSegments(amidahModimDerabananFoldout.hebrew).map((seg) => ({
          text: normalizeParagraphs(seg.text),
          italic: seg.italic,
        }));
        const meRaw = amidahModimDerabananFoldout.english;
        const meSeg = meRaw.trim()
          ? this.parseInstructionSegments(meRaw).map((seg) => ({
              text: normalizeParagraphs(seg.text),
              italic: seg.italic,
            }))
          : undefined;
        amidahModimDerabananFoldout = {
          hebrew: mhSeg.map((s) => s.text).join('').replace(/\n\s*\n/g, '\n\n').trim(),
          english: (meSeg ?? []).map((s) => s.text).join('').replace(/\n\s*\n/g, '\n\n').trim(),
          hebrewSegments: mhSeg,
          englishSegments: meSeg,
        };
      }

      let hebrew = hebrewSegments.map((s) => s.text).join('').replace(/\n\s*\n/g, '\n\n').trim();
      let english = englishSegments.map((s) => s.text).join('').replace(/\n\s*\n/g, '\n\n').trim();
      let finalHebrewSegments = hebrewSegments;
      let finalEnglishSegments = englishSegments;

      // Birkat Hamazon: start from first bracha and optional middle cut; never throw so section always loads
      if (sectionKey === 'birchas_hamazon') {
        try {
        const stripNikkud = (s: string) => s.replace(/[\u0591-\u05C7]/g, '');
        // Allow optional nikkud (U+0591–U+05C7) between letters
        const nik = '[\\u0591-\\u05C7]*';
        const feedRe = new RegExp(
          `ה${nik}ז${nik}ן${nik}\\s+א${nik}ת${nik}\\s+ה${nik}ע${nik}ו?${nik}ל${nik}ם`,
          'u'
        );
        const brachaStartRe = new RegExp(
          `ב${nik}ר${nik}וּ?${nik}ךְ?${nik}\\s+א${nik}ת${nik}ָּ?${nik}ה${nik}`,
          'gu'
        );
        const feedMatch = hebrew.match(feedRe);
        if (feedMatch && feedMatch.index !== undefined) {
          const beforeFeed = hebrew.slice(0, feedMatch.index);
          let lastStart = -1;
          let m: RegExpExecArray | null;
          brachaStartRe.lastIndex = 0;
          while ((m = brachaStartRe.exec(beforeFeed)) !== null) lastStart = m.index;
          if (lastStart >= 0) {
            hebrew = hebrew.slice(lastStart);
            finalHebrewSegments = [{ text: hebrew, italic: false }];
          }
        } else {
          // Fallback: strip nikkud and search
          const strippedHeb = stripNikkud(hebrew);
          const feedIdx = strippedHeb.search(/הזן\s+את\s+העולם/);
          if (feedIdx !== -1) {
            const beforeStripped = strippedHeb.slice(0, feedIdx);
            const brachaStartStripped = beforeStripped.lastIndexOf('ברוך אתה');
            if (brachaStartStripped !== -1) {
              const strippedToOriginal: number[] = [];
              for (let i = 0; i < hebrew.length; i++) {
                if (!/[\u0591-\u05C7]/.test(hebrew[i])) strippedToOriginal.push(i);
              }
              const originalStart = strippedToOriginal[brachaStartStripped] ?? 0;
              hebrew = hebrew.slice(originalStart);
              finalHebrewSegments = [{ text: hebrew, italic: false }];
            }
          } else {
            // Last resort: start from first "ברוך אתה" in the text
            const firstBaruch = hebrew.search(new RegExp(`ב${nik}ר${nik}וּ?${nik}ךְ?${nik}\\s+א${nik}ת${nik}ָּ?${nik}ה${nik}`, 'u'));
            if (firstBaruch > 0) {
              hebrew = hebrew.slice(firstBaruch);
              finalHebrewSegments = [{ text: hebrew, italic: false }];
            }
          }
        }
        // English: trim to same bracha
        const feedEnRe = /Who\s+(?:nourishes|feeds)\s+(?:the\s+entire\s+)?(?:world|whole\s+world)/i;
        const feedEn = english.search(feedEnRe);
        if (feedEn !== -1) {
          const beforeFeed = english.slice(0, feedEn);
          const blessed = beforeFeed.lastIndexOf('Blessed are You');
          if (blessed !== -1) {
            english = english.slice(blessed);
            finalEnglishSegments = [{ text: english, italic: false }];
          }
        } else {
          const blessedOnly = english.indexOf('Blessed are You');
          if (blessedOnly !== -1) {
            const afterFirst = english.slice(blessedOnly);
            if (afterFirst.search(/Who\s+(?:nourishes|feeds)/i) !== -1) {
              english = afterFirst;
              finalEnglishSegments = [{ text: english, italic: false }];
            }
          }
        }
        // Cut between end of first bracha and "נודה לך", put Nodeh on new line. Only look between "הזן" and "נודה".
        const strippedHeb = stripNikkud(hebrew);
        let nodehStartStripped = strippedHeb.indexOf('נודה לך');
        if (nodehStartStripped === -1) nodehStartStripped = strippedHeb.indexOf('נודה ');
        if (nodehStartStripped === -1) nodehStartStripped = strippedHeb.indexOf('נודה');
        let endFirstBrachaStripped = -1;
        const hazanIdx = strippedHeb.indexOf('הזן');
        if (nodehStartStripped > 0 && hazanIdx !== -1 && nodehStartStripped > hazanIdx) {
          const between = strippedHeb.slice(hazanIdx, nodehStartStripped);
          const idxKol = Math.max(
            between.lastIndexOf('העולם כולו'),
            between.lastIndexOf('כולו'),
            between.lastIndexOf('הכול'),
            between.lastIndexOf('הכל')
          );
          if (idxKol !== -1) {
            const rest = between.slice(idxKol);
            const word = rest.match(/^(העולם\s+כולו|כולו|הכול|הכל)\s*[:.,]?\s*/)?.[0] ?? rest.slice(0, 8);
            endFirstBrachaStripped = hazanIdx + idxKol + word.length;
          } else if (between.includes('\n\n')) {
            endFirstBrachaStripped = hazanIdx + between.indexOf('\n\n') + 2;
          }
        }
        if (nodehStartStripped > 0 && endFirstBrachaStripped > 0 && endFirstBrachaStripped < nodehStartStripped) {
          const strippedToOriginal: number[] = [];
          for (let i = 0; i < hebrew.length; i++) {
            if (!/[\u0591-\u05C7]/.test(hebrew[i])) strippedToOriginal.push(i);
          }
          const endOriginal = strippedToOriginal[endFirstBrachaStripped] ?? endFirstBrachaStripped;
          const startOriginal = strippedToOriginal[nodehStartStripped] ?? nodehStartStripped;
          hebrew = hebrew.slice(0, endOriginal).trimEnd() + '\n\n' + hebrew.slice(startOriginal);
          finalHebrewSegments = [{ text: hebrew, italic: false }];
        }
        const nodehEnMatch = english.match(/\b(We\s+(?:will\s+)?(?:give\s+thanks|thank)\s+You|Nodeh\s+lecha)/i);
        const nodehStartEn = nodehEnMatch ? (nodehEnMatch.index ?? -1) : -1;
        if (nodehStartEn !== -1 && nodehStartEn > 0) {
          const beforeNodeh = english.slice(0, nodehStartEn);
          const endM = beforeNodeh.match(/(?:world|all|everything|whole\s+world)\.?\s*$/i);
          const endEn = endM ? beforeNodeh.lastIndexOf(endM[0]) + endM[0].length : -1;
          if (endEn > 0 && endEn < nodehStartEn) {
            english = english.slice(0, endEn).trimEnd() + '\n\n' + english.slice(nodehStartEn);
            finalEnglishSegments = [{ text: english, italic: false }];
          }
        }
        // Al HaNissim: by date show nothing / Chanukah only / Purim only (shared with amidah pipeline)
        const alTrim = trimAlHanissimInsertionByCalendar(hebrew, english, new Date());
        hebrew = alTrim.hebrew;
        english = alTrim.english;
        finalHebrewSegments = [{ text: hebrew, italic: false }];
        finalEnglishSegments = [{ text: english, italic: false }];
        // Remove "בונה ירושלים דוד ושלמה תקנוה..." paragraph through "וכן'." / "וכו'."
        const strippedBoneh = stripNikkud(hebrew);
        const bonehStart = strippedBoneh.indexOf('בונה ירושלים');
        if (bonehStart !== -1) {
          const afterBoneh = strippedBoneh.slice(bonehStart);
          const endMatch = afterBoneh.match(/[\s\S]*?(?:וכן['']\.?|וכו['']\.?)/);
          if (endMatch) {
            const endStripped = bonehStart + endMatch[0].length;
            const strippedToOriginal: number[] = [];
            for (let i = 0; i < hebrew.length; i++) {
              if (!/[\u0591-\u05C7]/.test(hebrew[i])) strippedToOriginal.push(i);
            }
            const startOriginal = strippedToOriginal[bonehStart] ?? bonehStart;
            const lastStrippedIdx = endStripped - 1;
            let endOriginal = (strippedToOriginal[lastStrippedIdx] ?? lastStrippedIdx) + 1;
            while (endOriginal < hebrew.length && /[\u0591-\u05C7]/.test(hebrew[endOriginal])) endOriginal++;
            hebrew = (hebrew.slice(0, startOriginal).trimEnd() + '\n\n' + hebrew.slice(endOriginal).trimStart()).trim();
            finalHebrewSegments = [{ text: hebrew, italic: false }];
          }
        }
        // Remove Shabbat addition: "בשבת מוסיפים:" through "וּבַעַל הַנֶּחָמוֹת:"
        const strippedShabbos = stripNikkud(hebrew);
        const shabbosStart = strippedShabbos.indexOf('בשבת מוסיפים');
        if (shabbosStart !== -1) {
          const afterShabbos = strippedShabbos.slice(shabbosStart);
          const endMatch = afterShabbos.match(/[\s\S]*?ובעל הנחמות:?/);
          if (endMatch) {
            const endStripped = shabbosStart + endMatch[0].length;
            const strippedToOriginal: number[] = [];
            for (let i = 0; i < hebrew.length; i++) {
              if (!/[\u0591-\u05C7]/.test(hebrew[i])) strippedToOriginal.push(i);
            }
            const startOriginal = strippedToOriginal[shabbosStart] ?? shabbosStart;
            const lastStrippedIdx = endStripped - 1;
            let endOriginal = (strippedToOriginal[lastStrippedIdx] ?? lastStrippedIdx) + 1;
            while (endOriginal < hebrew.length && /[\u0591-\u05C7]/.test(hebrew[endOriginal])) endOriginal++;
            hebrew = (hebrew.slice(0, startOriginal).trimEnd() + '\n\n' + hebrew.slice(endOriginal).trimStart()).trim();
            finalHebrewSegments = [{ text: hebrew, italic: false }];
          }
        }
        // Remove halacha paragraph: "שכח לומר רצה..." through "דיני שכחה:"
        const strippedHalacha = stripNikkud(hebrew);
        const halachaStart = strippedHalacha.indexOf('שכח לומר');
        if (halachaStart !== -1) {
          const afterHalacha = strippedHalacha.slice(halachaStart);
          const endMatch = afterHalacha.match(/[\s\S]*?דיני שכחה:?/);
          if (endMatch) {
            const endStripped = halachaStart + endMatch[0].length;
            const strippedToOriginal: number[] = [];
            for (let i = 0; i < hebrew.length; i++) {
              if (!/[\u0591-\u05C7]/.test(hebrew[i])) strippedToOriginal.push(i);
            }
            const startOriginal = strippedToOriginal[halachaStart] ?? halachaStart;
            const lastStrippedIdx = endStripped - 1;
            let endOriginal = (strippedToOriginal[lastStrippedIdx] ?? lastStrippedIdx) + 1;
            while (endOriginal < hebrew.length && /[\u0591-\u05C7]/.test(hebrew[endOriginal])) endOriginal++;
            if (endOriginal < hebrew.length && hebrew[endOriginal] === ':') endOriginal += 1;
            hebrew = (hebrew.slice(0, startOriginal).trimEnd() + '\n\n' + hebrew.slice(endOriginal).trimStart()).trim();
            finalHebrewSegments = [{ text: hebrew, italic: false }];
          }
        }
        // Remove "הטוב והמטיב ביבנה תקנוה..." through "שנתנו לקבורה."
        const strippedTov = stripNikkud(hebrew);
        let tovStart = strippedTov.indexOf('הטוב והמטיב ביבנה');
        if (tovStart === -1) {
          const alt = strippedTov.indexOf('הטוב והמטיב');
          if (alt !== -1 && strippedTov.slice(alt).includes('תקנוה')) tovStart = alt;
        }
        if (tovStart !== -1) {
          const afterTov = strippedTov.slice(tovStart);
          const endMatch = afterTov.match(/[\s\S]*?שנתנו לקבורה\.?/);
          if (endMatch) {
            const endStripped = tovStart + endMatch[0].length;
            const strippedToOriginal: number[] = [];
            for (let i = 0; i < hebrew.length; i++) {
              if (!/[\u0591-\u05C7]/.test(hebrew[i])) strippedToOriginal.push(i);
            }
            const startOriginal = strippedToOriginal[tovStart] ?? tovStart;
            const lastStrippedIdx = endStripped - 1;
            let endOriginal = (strippedToOriginal[lastStrippedIdx] ?? lastStrippedIdx) + 1;
            while (endOriginal < hebrew.length && /[\u0591-\u05C7]/.test(hebrew[endOriginal])) endOriginal++;
            if (endOriginal < hebrew.length && hebrew[endOriginal] === '.') endOriginal += 1;
            hebrew = (hebrew.slice(0, startOriginal).trimEnd() + '\n\n' + hebrew.slice(endOriginal).trimStart()).trim();
            finalHebrewSegments = [{ text: hebrew, italic: false }];
          }
        }
        hebrew = hebrew.replace(/[\u200E-\u200F\u202A-\u202E]/g, '');
        hebrew = hebrew.replace(/(וּבְכָל־)\s*ת[\u0591-\u05C7]*ע(\s+)(?=וּבְכָל\s|שָׁעָה)/g, '$1עֵת$2');
        hebrew = hebrew.replace(/עֵת(\s+)(?=וּבְכָל\s)/g, 'עֵת\u2060$1');
        hebrew = hebrew.replace(/(ר[\u0591-\u05C7]*ח[\u0591-\u05C7]*ם)(\s+)(י[\u0591-\u05C7]*ה[\u0591-\u05C7]*ו[\u0591-\u05C7]*ה)/g, '$1 נָא$2$3');
        finalHebrewSegments = [{ text: hebrew, italic: false }];
        } catch (e) {
          console.warn('Sefaria: birchas_hamazon trim failed, using full text', e);
        }
      }

      // Tefillas HaDerech: parenthetical (אם דעתו לחזור...) stays on one line, add colon, render as grey instruction
      if (sectionKey === 'tefilas_haderech') {
        const paren = '(אם דעתו לחזור מיד אומר וְתַחְזִירֵנוּ לְשָׁלוֹם)';
        const parenWithColon = '(אם דעתו לחזור מיד אומר: וְתַחְזִירֵנוּ לְשָׁלוֹם): ';
        // Remove line breaks around parenthetical and add colon after it
        hebrew = hebrew.replace(/\s*\(\s*אם דעתו לחזור מיד אומר וְתַחְזִירֵנוּ לְשָׁלוֹם\s*\)\s*/g, ' ' + parenWithColon);
        const idx = hebrew.indexOf(parenWithColon);
        if (idx !== -1) {
          const before = hebrew.slice(0, idx);
          const after = hebrew.slice(idx + parenWithColon.length);
          finalHebrewSegments = [
            { text: before, italic: false },
            { text: parenWithColon, italic: true },
            { text: after, italic: false },
          ];
        }
        // English: same idea — parenthetical instruction on one line with colon, grey/italic
        const enMatch = english.match(/\s*\(\s*(If one intends to return immediately[^)]+)\)\s*/i);
        if (enMatch) {
          const enParenWithColon = '(' + enMatch[1].trim() + '): ';
          english = english.replace(/\s*\(\s*If one intends to return immediately[^)]+\)\s*/gi, ' ' + enParenWithColon);
          const enIdx = english.indexOf(enParenWithColon);
          if (enIdx !== -1) {
            finalEnglishSegments = [
              { text: english.slice(0, enIdx), italic: false },
              { text: enParenWithColon, italic: true },
              { text: english.slice(enIdx + enParenWithColon.length), italic: false },
            ];
          }
        }

        // לפי נוסח ספרד: Ashkenaz = remove italic explanation entirely; Sfard = remove the label, keep "יי" as normal
        const lefiNusachSefard = 'לפי נוסח ספרד';
        if (nusach === 'ashkenaz') {
          finalHebrewSegments = finalHebrewSegments.filter((seg) => !seg.text.includes(lefiNusachSefard));
          finalEnglishSegments = finalEnglishSegments.filter((seg) => !/according to Sfard nusach|according to Sefard nusach/i.test(seg.text));
        } else {
          // Sfard: strip "לפי נוסח ספרד" and replace with space so "יי שׁוֹמֵעַ תְּפִלָּה" is normal bracha with space before Name
          finalHebrewSegments = finalHebrewSegments
            .map((seg) => ({
              text: seg.text.replace(lefiNusachSefard, ' ').replace(/\s{2,}/g, ' ').trim(),
              italic: seg.text.includes(lefiNusachSefard) ? false : seg.italic,
            }))
            .filter((seg) => seg.text.length > 0);
          // Line break after תְּפִלָּה: so next section (verses) starts on new paragraph
          finalHebrewSegments = finalHebrewSegments.map((seg) => ({
            ...seg,
            text: seg.text.replace('תְּפִלָּה:', 'תְּפִלָּה:\n\n'),
          }));
          finalEnglishSegments = finalEnglishSegments
            .map((seg) => ({
              text: seg.text.replace(/\s*\(?according to Sfard nusach[^)]*\)?\s*/gi, ' ').replace(/\s{2,}/g, ' ').trim(),
              italic: /according to Sfard nusach/i.test(seg.text) ? false : seg.italic,
            }))
            .filter((seg) => seg.text.length > 0);
        }
        // Remove everything after תְּפִלָּה: (verses etc. — user wants only the bracha)
        const tefilaEnd = 'תְּפִלָּה:';
        const cutHebrew = (seg: { text: string; italic: boolean }) => {
          const i = seg.text.indexOf(tefilaEnd);
          if (i === -1) return seg;
          return { text: seg.text.slice(0, i + tefilaEnd.length), italic: seg.italic };
        };
        let done = false;
        finalHebrewSegments = finalHebrewSegments
          .map((seg) => {
            if (done) return null;
            const out = cutHebrew(seg);
            if (out.text.length < seg.text.length) done = true;
            return out;
          })
          .filter((s): s is { text: string; italic: boolean } => s != null);

        const enEnd = /who hears prayer\.?/i;
        const cutEnglish = (seg: { text: string; italic: boolean }) => {
          const m = seg.text.match(enEnd);
          if (!m) return seg;
          const i = (m.index ?? 0) + m[0].length;
          return { text: seg.text.slice(0, i), italic: seg.italic };
        };
        done = false;
        finalEnglishSegments = finalEnglishSegments
          .map((seg) => {
            if (done) return null;
            const out = cutEnglish(seg);
            if (out.text.length < seg.text.length) done = true;
            return out;
          })
          .filter((s): s is { text: string; italic: boolean } => s != null);

        hebrew = finalHebrewSegments.map((s) => s.text).join('').replace(/\n\s*\n/g, '\n\n').trim();
        english = finalEnglishSegments.map((s) => s.text).join('').replace(/\n\s*\n/g, '\n\n').trim();
      }

      // Amidah: render "כי שם ה' אקרא... אדוני שפתי תפתח" in smaller text
      let hebrewBeforeKedushaFoldout: string | undefined;
      let englishBeforeKedushaFoldout: string | undefined;
      let hebrewBeforeKedushaFoldoutSegments: PrayerTextSegment[] | undefined;
      let englishBeforeKedushaFoldoutSegments: PrayerTextSegment[] | undefined;
      let hebrewBeforeModimDerabananFoldout: string | undefined;
      let englishBeforeModimDerabananFoldout: string | undefined;
      let hebrewBeforeModimDerabananFoldoutSegments: PrayerTextSegment[] | undefined;
      let englishBeforeModimDerabananFoldoutSegments: PrayerTextSegment[] | undefined;
      if (sectionKey === 'amidah' || sectionKey === 'maariv_amidah' || sectionKey === 'mincha_amidah') {
        if (finalHebrewBeforeKedushaSegments?.length) {
          finalHebrewBeforeKedushaSegments = this.markSefataiParagraphSmall(finalHebrewBeforeKedushaSegments);
        }
        if (finalEnglishBeforeKedushaSegments?.length) {
          finalEnglishBeforeKedushaSegments = this.markSefataiParagraphSmall(finalEnglishBeforeKedushaSegments);
        }
        if (finalHebrewBeforeModimSegments?.length) {
          finalHebrewBeforeModimSegments = this.markSefataiParagraphSmall(finalHebrewBeforeModimSegments);
        }
        if (finalEnglishBeforeModimSegments?.length) {
          finalEnglishBeforeModimSegments = this.markSefataiParagraphSmall(finalEnglishBeforeModimSegments);
        }
        finalHebrewSegments = this.markSefataiParagraphSmall(finalHebrewSegments);
        finalEnglishSegments = this.markSefataiParagraphSmall(finalEnglishSegments);
        const collapseParaBreaks = (s: string) =>
          s.replace(/\n\s*\n/g, '\n\n').replace(/\n{3,}/g, '\n\n').trim();
        hebrew = collapseParaBreaks(finalHebrewSegments.map((s) => s.text).join(''));
        english = collapseParaBreaks(finalEnglishSegments.map((s) => s.text).join(''));
        if (finalHebrewBeforeKedushaSegments?.length) {
          hebrewBeforeKedushaFoldout = collapseParaBreaks(
            finalHebrewBeforeKedushaSegments.map((s) => s.text).join('')
          );
          hebrewBeforeKedushaFoldoutSegments = finalHebrewBeforeKedushaSegments;
        }
        if (finalEnglishBeforeKedushaSegments?.length) {
          englishBeforeKedushaFoldout = collapseParaBreaks(
            finalEnglishBeforeKedushaSegments.map((s) => s.text).join('')
          );
          englishBeforeKedushaFoldoutSegments = finalEnglishBeforeKedushaSegments;
        }
        if (finalHebrewBeforeModimSegments?.length) {
          hebrewBeforeModimDerabananFoldout = collapseParaBreaks(
            finalHebrewBeforeModimSegments.map((s) => s.text).join('')
          );
          hebrewBeforeModimDerabananFoldoutSegments = finalHebrewBeforeModimSegments;
        }
        if (finalEnglishBeforeModimSegments?.length) {
          englishBeforeModimDerabananFoldout = collapseParaBreaks(
            finalEnglishBeforeModimSegments.map((s) => s.text).join('')
          );
          englishBeforeModimDerabananFoldoutSegments = finalEnglishBeforeModimSegments;
        }
        if (sectionKey === 'mincha_amidah') {
          const splitAleinu = splitMinchaAmidahBeforeStandaloneAleinu(hebrew, english);
          hebrew = splitAleinu.hebrew;
          english = splitAleinu.english;
          finalHebrewSegments = [{ text: hebrew, italic: false }];
          finalEnglishSegments = [{ text: english, italic: false }];
        }
      }

      // Final hard-kill for the printed note:
      // "בט' אב ויוה\"כ אין אומרים ברכה זו" (and close punctuation/quote variants).
      // Do this at the assembled text/segment layer so it cannot leak through formatting paths.
      {
        const stripNoNik = (s: string) => s.replace(/[\u0591-\u05C7]/g, '');
        const collapse = (s: string) => s.replace(/\n{3,}/g, '\n\n').trim();
        const noteRe =
          /(?:ב\s*)?ט['׳״"”]?\s*אב\s*ו\s*יוה['׳״"”]?\s*כ\s*אין\s*אומרים\s*ברכה\s*זו\s*[:׃.]?/gu;
        const stripNoteText = (s: string) =>
          collapse(
            s
              .replace(noteRe, '')
              .replace(/\n?[^\n]*אין\s*אומרים\s*ברכה\s*זו\s*[:׃.]?\n?/gu, '\n')
          );
        const isNoteSegment = (txt: string) => {
          const t = stripNoNik(txt).replace(/\s+/g, ' ').trim();
          return /אין אומרים ברכה זו/.test(t) && (/אב/.test(t) || /יוה.?כ/.test(t));
        };

        hebrew = stripNoteText(hebrew);
        finalHebrewSegments = finalHebrewSegments
          .map((seg) => ({ ...seg, text: stripNoteText(seg.text) }))
          .filter((seg) => seg.text.trim().length > 0 && !isNoteSegment(seg.text));

        if (birchosHashacharExpansionFoldout?.hebrew) {
          let bhSeg = birchosHashacharExpansionFoldout.hebrewSegments;
          if (bhSeg?.length) {
            bhSeg = bhSeg
              .map((seg) => ({ ...seg, text: stripNoteText(seg.text) }))
              .filter((seg) => seg.text.trim().length > 0 && !isNoteSegment(seg.text));
          }
          birchosHashacharExpansionFoldout = {
            ...birchosHashacharExpansionFoldout,
            hebrew: stripNoteText(birchosHashacharExpansionFoldout.hebrew),
            hebrewSegments: bhSeg,
          };
        }
      }

      // Remove visual separator artifacts (thin divider lines) that Sefaria sometimes emits as
      // standalone instruction segments/paragraphs.
      {
        const isSeparatorOnly = (txt: string) => {
          const t = txt
            .replace(/[\u0591-\u05C7]/g, '')
            .replace(/\s+/g, '')
            .replace(/[<>{}\[\]()]/g, '');
          return t.length > 0 && /^[\-־_—–=~·•|\\/:\u2500-\u257F\u23AF.,"'׳״`]+$/u.test(t);
        };
        const stripSeparatorLines = (s: string) =>
          s
            .split(/\n/)
            .filter((line) => !isSeparatorOnly(line))
            .join('\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        hebrew = stripSeparatorLines(hebrew);
        finalHebrewSegments = finalHebrewSegments
          .map((seg) => ({ ...seg, text: stripSeparatorLines(seg.text) }))
          .filter((seg) => seg.text.trim().length > 0 && !isSeparatorOnly(seg.text));

        if (birchosHashacharExpansionFoldout?.hebrew) {
          let bhSeg = birchosHashacharExpansionFoldout.hebrewSegments;
          if (bhSeg?.length) {
            bhSeg = bhSeg
              .map((seg) => ({ ...seg, text: stripSeparatorLines(seg.text) }))
              .filter((seg) => seg.text.trim().length > 0 && !isSeparatorOnly(seg.text));
          }
          birchosHashacharExpansionFoldout = {
            ...birchosHashacharExpansionFoldout,
            hebrew: stripSeparatorLines(birchosHashacharExpansionFoldout.hebrew),
            hebrewSegments: bhSeg,
          };
        }
      }

      // Final guarantee: if Tzitzis appears before Netilas but Modeh Ani is missing, prepend Modeh Ani.
      if (sectionKey === 'birchot_hashachar' || sectionKey === 'preparatory') {
        const stripNoNik = (s: string) => s.replace(/[\u0591-\u05C7]/g, '');
        const hNoNik = stripNoNik(hebrew);
        const netIdx = hNoNik.search(/על\s+נטילת\s+יד/);
        const tzIdx = hNoNik.search(/ציצית/);
        const modehIdx = hNoNik.search(/מודה\s+אני/);
        const needsModeh =
          netIdx > 0 &&
          tzIdx >= 0 &&
          tzIdx < netIdx &&
          (modehIdx === -1 || modehIdx > tzIdx);
        if (needsModeh) {
          const modehAniText =
            'מוֹדֶה אֲנִי לְפָנֶֽיךָ מֶֽלֶךְ חַי וְקַיָּם שֶׁהֶחֱזַֽרְתָּ בִּי נִשְׁמָתִי בְּחֶמְלָה, רַבָּה אֱמוּנָתֶֽךָ:' +
            '\n' +
            MODEH_ANI_APPENDIX;
          hebrew = `${modehAniText}\n\n${hebrew.trimStart()}`;
          finalHebrewSegments = [{ text: hebrew, italic: false }];
        }
      }

      return {
        hebrew,
        english,
        hebrewSegments: finalHebrewSegments.length > 0 ? finalHebrewSegments : undefined,
        englishSegments: finalEnglishSegments.length > 0 ? finalEnglishSegments : undefined,
        ...(hebrewBeforeKedushaFoldout != null
          ? {
              hebrewBeforeKedushaFoldout,
              englishBeforeKedushaFoldout,
              hebrewBeforeKedushaFoldoutSegments,
              englishBeforeKedushaFoldoutSegments,
            }
          : {}),
        ...(hebrewBeforeModimDerabananFoldout != null
          ? {
              hebrewBeforeModimDerabananFoldout,
              englishBeforeModimDerabananFoldout,
              hebrewBeforeModimDerabananFoldoutSegments,
              englishBeforeModimDerabananFoldoutSegments,
            }
          : {}),
        ...(amidahKedushaFoldout ? { kedushaFoldout: amidahKedushaFoldout } : {}),
        ...(amidahModimDerabananFoldout ? { modimDerabananFoldout: amidahModimDerabananFoldout } : {}),
        ...(birchosHashacharExpansionFoldout?.hebrew?.trim()
          ? {
              birchosHashacharExpansionFoldout,
              ...(hebrewBeforeBirchosHashacharExpansionFoldout != null
                ? {
                    hebrewBeforeBirchosHashacharExpansionFoldout,
                    englishBeforeBirchosHashacharExpansionFoldout,
                    hebrewBeforeBirchosHashacharExpansionFoldoutSegments,
                    englishBeforeBirchosHashacharExpansionFoldoutSegments,
                  }
                : {}),
            }
          : {}),
      };
    } catch {
      return null;
    }
  }

  /**
   * Amidah insertions (seasonal). Blank until content layer is rebuilt.
   */
  static async fetchAmidahInsertions(): Promise<{
    mashivHaruach: PrayerTextData;
    moridHatal: PrayerTextData;
    vtenBracha: PrayerTextData;
    vtenTalUmatar: PrayerTextData;
    yaalehVeyavo: PrayerTextData;
    alHanissimChanukah: PrayerTextData;
    alHanissimPurim: PrayerTextData;
    aneinu: PrayerTextData;
  }> {
    const empty: PrayerTextData = { hebrew: '', english: '' };
    return {
      mashivHaruach: empty,
      moridHatal: empty,
      vtenBracha: empty,
      vtenTalUmatar: empty,
      yaalehVeyavo: empty,
      alHanissimChanukah: empty,
      alHanissimPurim: empty,
      aneinu: empty,
    };
  }

  /**
   * Davening service structure – main sections only from Sefaria.
   */
  static async fetchDaveningService(
    service: 'shacharis' | 'mincha' | 'maariv' | 'musaf',
    _isShabbos: boolean = false,
    _nusach: 'ashkenaz' | 'sfard' = 'ashkenaz'
  ): Promise<{ sections: { key: string; title: string; hebrewTitle: string }[] }> {
    if (service === 'musaf') return { sections: [] };
    const list = this.SIDDUR_MAIN_SECTIONS[service] ?? [];
    return { sections: [...list] };
  }

  /** Flat section list for full-scroll – main sections only. */
  static getFlatSectionsForFullScroll(
    service: 'shacharis' | 'mincha' | 'maariv'
  ): { key: string; title: string; hebrewTitle: string }[] {
    const list = this.SIDDUR_MAIN_SECTIONS[service] ?? [];
    return [...list];
  }

  /**
   * Clean HTML tags from Sefaria text
   */
  private static cleanHtml(text: string): string {
    if (!text) return '';
    return this.stripSefariaEndMarkers(
      text
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/<br\s*\/?>/gi, '\n') // Convert br to newlines
        .replace(/&nbsp;/g, ' ')
        .replace(/&thinsp;/g, ' ') // Thin space (Sefaria uses in Tehillim)
        .replace(/&#x2009;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()
    );
  }

  /**
   * Remove Sefaria end-of-section markers (e.g. {פ} end of perek, {ס} end of verse).
   * Handles braces/parens, optional niqqud, and cached data. Call at display time to clean any source.
   * Also removes English variants like {P}, (P), {S}.
   */
  static stripSefariaEndMarkers(text: string): string {
    if (!text) return '';
    return text
      .replace(/\s*[{\[\(]\s*[פס][\u0591-\u05C7]*\s*[}\]\)]\s*/g, '')
      .replace(/\s*[{\[\(]\s*[PSps]\s*[}\]\)]\s*/g, '')
      .trim();
  }

  /**
   * Decode common HTML entities in Sefaria text (e.g. &nbsp; &thinsp;) so they don't show as literal.
   */
  static decodeHtmlEntities(text: string): string {
    if (!text) return '';
    return text
      .replace(/&nbsp;/g, ' ')
      .replace(/&thinsp;/g, ' ')
      .replace(/&#x2009;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/\u2009/g, ' ');
  }

  /**
   * Clean HTML but preserve paragraph breaks for prayer text. Safe: never throws.
   */
  static cleanHtmlForPrayer(text: unknown): string {
    if (text == null) return '';
    const s = typeof text === 'string' ? text : String(text);
    return this.stripSefariaEndMarkers(
      s
        .replace(/<[^>]*>/g, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/&nbsp;/g, ' ')
        .replace(/&thinsp;/g, ' ')
        .replace(/&#x2009;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/[ \t]+/g, ' ')
        .replace(/\n\s*\n\s*/g, '\n\n')
        .trim()
    );
  }

  /**
   * Mark the "כי שם ה' אקרא... אדוני שפתי תפתח" paragraph as smaller (italic) in Amidah segments.
   * Works for both Hebrew and English (detects by content).
   */
  private static markSefataiParagraphSmall(segs: PrayerTextSegment[]): PrayerTextSegment[] {
    const stripNikkud = (s: string) => s.replace(/[\u0591-\u05C7]/g, '');
    const full = segs.map((s) => s.text).join('');
    const stripped = stripNikkud(full);
    let startStripped: number;
    let endStripped: number;
    const isLikelyEnglish = !/[\u0590-\u05FF]/.test(stripped.slice(0, Math.min(200, stripped.length)));
    if (isLikelyEnglish) {
      startStripped = stripped.search(/Lord,?\s*open\s+my\s+lips|Open\s+my\s+lips/i);
      if (startStripped === -1) startStripped = stripped.search(/When I call out the name/i);
      if (startStripped === -1) return segs;
      const praiseMatch = stripped.slice(startStripped).match(/Your\s+praise\.?/i);
      endStripped = praiseMatch
        ? startStripped + (stripped.slice(startStripped).indexOf(praiseMatch[0]) + praiseMatch[0].length)
        : stripped.length;
    } else {
      const startMarker = 'כי שם';
      const endMarker = 'תהלתך';
      startStripped = stripped.indexOf(startMarker);
      if (startStripped === -1) startStripped = stripped.indexOf('שפתי תפתח');
      if (startStripped === -1) return segs;
      endStripped = stripped.indexOf(endMarker, startStripped);
      if (endStripped === -1) return segs;
      endStripped += endMarker.length;
      while (endStripped < stripped.length && /[:\s\u0591-\u05C7]/.test(stripped[endStripped])) endStripped++;
    }
    const strippedToOriginal: number[] = [];
    for (let i = 0; i < full.length; i++) {
      if (!/[\u0591-\u05C7]/.test(full[i])) strippedToOriginal.push(i);
    }
    const startOriginal = strippedToOriginal[startStripped] ?? startStripped;
    const endOriginal =
      endStripped > 0 && endStripped <= strippedToOriginal.length
        ? (strippedToOriginal[endStripped - 1] ?? endStripped - 1) + 1
        : full.length;
    const before = full.slice(0, startOriginal);
    let phrase = full.slice(startOriginal, endOriginal);
    let after = full.slice(endOriginal);
    // Avoid huge vertical gap: trim extra newlines/spaces between "תהלתך:" and "בָּרוּךְ אַתָּה..."
    phrase = phrase.replace(/[\n\r\t\u0020]+$/g, '');
    after = after.replace(/^[\n\r\t\u0020]+/g, '');
    const out: PrayerTextSegment[] = [];
    if (before.trim()) out.push({ text: before, italic: false });
    if (phrase.trim()) out.push({ text: phrase, italic: true });
    if (after.trim()) out.push({ text: after, italic: false });
    return out.length > 0 ? out : segs;
  }

  /**
   * Parse raw Sefaria HTML into segments, preserving <i> and <small> as instruction (italic).
   * Sefaria uses these for footnotes and halachic instructions. Safe: never throws.
   */
  static parseInstructionSegments(raw: unknown): PrayerTextSegment[] {
    if (raw == null) return [];
    const s = (typeof raw === 'string' ? raw : String(raw))
      .replace(/<br\s*\/?>/gi, '\n');
    const segments: PrayerTextSegment[] = [];
    const regex = /<i[^>]*>([\s\S]*?)<\/i>|<small[^>]*>([\s\S]*?)<\/small>/gi;
    let lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(s)) !== null) {
      if (m.index > lastIndex) {
        const normal = s.slice(lastIndex, m.index);
        const cleaned = this.cleanHtmlForPrayer(normal);
        if (cleaned) segments.push({ text: cleaned, italic: false });
      }
      const inner = (m[1] ?? m[2] ?? '').trim();
      const cleanedInner = this.cleanHtmlForPrayer(inner);
      if (cleanedInner) segments.push({ text: cleanedInner, italic: true });
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < s.length) {
      const tail = this.cleanHtmlForPrayer(s.slice(lastIndex));
      if (tail) segments.push({ text: tail, italic: false });
    }
    return segments.length > 0 ? segments : [{ text: this.cleanHtmlForPrayer(s), italic: false }];
  }

  /**
   * Convert number to Hebrew letters
   */
  static numberToHebrew(num: number): string {
    const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
    const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
    const hundreds = ['', 'ק', 'ר', 'ש', 'ת'];
    
    if (num === 15) return 'ט״ו';
    if (num === 16) return 'ט״ז';
    
    let result = '';
    let n = num;
    
    if (n >= 100) {
      result += hundreds[Math.floor(n / 100)];
      n %= 100;
    }
    if (n >= 10) {
      result += tens[Math.floor(n / 10)];
      n %= 10;
    }
    if (n > 0) {
      result += ones[n];
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
   * Cache management
   */
  private static async getFromCache(ref: string): Promise<SefariaText | null> {
    try {
      const cacheKey = CACHE_PREFIX + ref.replace(/[^a-zA-Z0-9]/g, '_');
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (!cached) return null;
      
      const { data, timestamp } = JSON.parse(cached);
      const expiryTime = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
      
      if (Date.now() - timestamp > expiryTime) {
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }
      
      return data;
    } catch {
      return null;
    }
  }

  private static async saveToCache(ref: string, data: SefariaText): Promise<void> {
    try {
      const cacheKey = CACHE_PREFIX + ref.replace(/[^a-zA-Z0-9]/g, '_');
      await AsyncStorage.setItem(cacheKey, JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.warn('Failed to cache Sefaria data:', error);
    }
  }

  /**
   * Clear all cached Sefaria data
   */
  static async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const sefariaKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
      await AsyncStorage.multiRemove(sefariaKeys);
    } catch (error) {
      console.warn('Failed to clear Sefaria cache:', error);
    }
  }

  /**
   * Get Sefaria attribution text (required by license)
   */
  static getAttribution(): { text: string; url: string } {
    return {
      text: 'Texts provided by Sefaria',
      url: 'https://www.sefaria.org',
    };
  }
}
