/**
 * Sefaria API Service
 * Fetches Jewish texts from Sefaria's open API (Tanakh, Talmud, etc.).
 *
 * Weekday siddur liturgy is offline (local packs via Offline*Service).
 * Sefaria texts are under Creative Commons (CC-BY-SA).
 * Attribution: "Texts provided by Sefaria (sefaria.org)"
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PrayerTextData, PrayerTextSegment } from '../content/siddur/prayerTextTypes';

export type { PrayerTextData, PrayerTextSegment };

const SEFARIA_API_BASE = 'https://www.sefaria.org/api';
const SEFARIA_V3_TEXTS = 'https://www.sefaria.org/api/v3/texts';
const CACHE_PREFIX = '@sefaria_cache_v5_';
const CACHE_EXPIRY_DAYS = 30;
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

  

  /**
   * Retired: weekday liturgy is offline-only (Offline*Service packs).
   * Kept as a no-op so old call sites fail closed instead of hitting the API.
   */
  static async fetchSiddurSection(
    sectionKey: string,
    nusach: 'ashkenaz' | 'sfard' = 'ashkenaz'
  ): Promise<PrayerTextData | null> {
    console.warn(
      `SefariaService.fetchSiddurSection retired (use Offline*Service). key=${sectionKey} nusach=${nusach}`
    );
    return null;
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
    _service: 'shacharis' | 'mincha' | 'maariv' | 'musaf',
    _isShabbos: boolean = false,
    _nusach: 'ashkenaz' | 'sfard' = 'ashkenaz'
  ): Promise<{ sections: { key: string; title: string; hebrewTitle: string }[] }> {
    return { sections: [] };
  }

  /** @deprecated Offline*Service.getSections owns weekday lists. */
  static getFlatSectionsForFullScroll(
    _service: 'shacharis' | 'mincha' | 'maariv'
  ): { key: string; title: string; hebrewTitle: string }[] {
    return [];
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
