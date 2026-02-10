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

const SEFARIA_API_BASE = 'https://www.sefaria.org/api';
const SEFARIA_V3_TEXTS = 'https://www.sefaria.org/api/v3/texts';
const CACHE_PREFIX = '@sefaria_cache_';
const CACHE_EXPIRY_DAYS = 30;
/** Max wait per request so we never hang on "Loading prayers..." */
const FETCH_TIMEOUT_MS = 12_000;

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
}

/** Fetch with timeout; throws on timeout or non-OK. */
function fetchWithTimeout(url: string, ms: number = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(id));
}

export class SefariaService {
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
            await this.saveToCache(ref, result);
            return result;
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
            await this.saveToCache(ref, result);
            return result;
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

    return {
      hebrew,
      english,
      hebrewTitle,
      ref: data.ref ?? ref,
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
    mincha_tachanun: 'Siddur Ashkenaz, Weekday, Mincha, Tachanun',
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
    pesukei_dzimra: 'Siddur Sefard, Weekday Shacharit, Blessings on Torah',
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
    mincha_tachanun: 'Siddur Sefard, Weekday Mincha, Tachanun',
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
      { key: 'mincha_tachanun', title: 'Tachanun', hebrewTitle: 'תחנון' },
    ],
    maariv: [
      { key: 'maariv_shema', title: 'The Shema', hebrewTitle: 'קריאת שמע' },
      { key: 'maariv_amidah', title: 'Amidah', hebrewTitle: 'עמידה' },
    ],
  };

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

    console.log(`Sefaria: fetchSiddurSection sectionKey="${sectionKey}" nusach=${nusach} ref="${ref}"`);
    let data = await this.fetchText(ref);

    // Fallback to Ashkenaz for Sefard when Sefard ref fails (Siddur Sefard structure differs)
    if (!data && nusach === 'sfard' && ashkenazRef) {
      console.log(`Sefaria: sfard ref failed, falling back to Ashkenaz ref="${ashkenazRef}"`);
      data = await this.fetchText(ashkenazRef);
    }
    if (!data) return null;

    try {
      const rawHebrewStr = Array.isArray(data.hebrew) ? data.hebrew.join('\n') : (data.hebrew ?? '');
      const rawEnglishStr = Array.isArray(data.english) ? (data.english ?? []).join('\n') : (data.english ?? '');
      const straight = (s: string) => s.replace(/\n\s*\n/g, '\n').trim();

      const hebrewSegments = this.parseInstructionSegments(rawHebrewStr).map((seg) => ({
        text: straight(seg.text),
        italic: seg.italic,
      }));
      const englishSegments = this.parseInstructionSegments(rawEnglishStr).map((seg) => ({
        text: straight(seg.text),
        italic: seg.italic,
      }));

      const hebrew = hebrewSegments.map((s) => s.text).join('').replace(/\n\s*\n/g, '\n').trim();
      const english = englishSegments.map((s) => s.text).join('').replace(/\n\s*\n/g, '\n').trim();

      return {
        hebrew,
        english,
        hebrewSegments: hebrewSegments.length > 0 ? hebrewSegments : undefined,
        englishSegments: englishSegments.length > 0 ? englishSegments : undefined,
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
    return text
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
      .trim();
  }

  /**
   * Clean HTML but preserve paragraph breaks for prayer text. Safe: never throws.
   */
  static cleanHtmlForPrayer(text: unknown): string {
    if (text == null) return '';
    const s = typeof text === 'string' ? text : String(text);
    return s
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
      .trim();
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
