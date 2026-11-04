/**
 * Tehillim Service — bundled Psalms 1–150 (Sefaria CC-BY-SA).
 */

import { SefariaService } from '../../services/SefariaService';
import { TehillimChapter, DAILY_TEHILLIM, DAY_OF_WEEK_TEHILLIM, TEHILLIM_BOOKS } from './types';
import { TEHILLIM_CHAPTERS } from './chapters';
import { TEHILLIM_OFFLINE_CHAPTERS } from './offline/raw';
import { JewishCalendarService } from '../../core/calendar/JewishCalendar';

export class TehillimService {
  private static cachedChapters: Map<number, TehillimChapter> = new Map();
  private static isInitialized = false;

  private static hydrateFromBundle(): void {
    for (const [num, raw] of Object.entries(TEHILLIM_OFFLINE_CHAPTERS)) {
      const n = Number(num);
      this.cachedChapters.set(n, {
        number: raw.number,
        hebrewNumber: raw.hebrewNumber,
        title: this.getChapterTitle(n),
        titleHebrew: raw.title,
        bookNumber: this.getBookForChapter(n),
        themes: this.getChapterThemes(n),
        occasions: this.getChapterOccasions(n),
        verses: raw.verses.map((v) => ({
          number: v.number,
          hebrew: v.hebrew,
          english: v.english,
        })),
      });
    }
    for (const [num, chapter] of Object.entries(TEHILLIM_CHAPTERS)) {
      if (!this.cachedChapters.has(Number(num))) {
        this.cachedChapters.set(Number(num), chapter);
      }
    }
  }

  /** Load bundled Tehillim (no network). */
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;
    this.hydrateFromBundle();
    this.isInitialized = true;
  }

  static async getChapter(number: number): Promise<TehillimChapter | null> {
    if (number < 1 || number > 150) return null;
    await this.initialize();
    return this.cachedChapters.get(number) ?? this.getPlaceholderChapter(number);
  }

  static getChapterSync(number: number): TehillimChapter | null {
    if (number < 1 || number > 150) return null;
    if (!this.isInitialized) this.hydrateFromBundle();
    this.isInitialized = true;
    return this.cachedChapters.get(number) ?? TEHILLIM_CHAPTERS[number] ?? this.getPlaceholderChapter(number);
  }

  /** All 150 chapters are bundled; progress callback still fires for callers. */
  static async prefetchAll(
    onProgress?: (current: number, total: number) => void
  ): Promise<void> {
    await this.initialize();
    if (onProgress) onProgress(150, 150);
  }

  /**
   * Get chapters for today (monthly cycle). Follows the global monthly Tehillim cycle: Hebrew day 1–30, and on the last day of a 29-day month, portions 29+30 are combined (same as everyone).
   */
  static getTodaysChapters(date: Date = new Date()): number[] {
    const hdate = JewishCalendarService.getJewishDate(date);
    const day = Math.min(hdate.getDate(), 30);
    const daysInMonth = JewishCalendarService.getDaysInHebrewMonth(date);
    if (day === 29 && daysInMonth === 29) {
      const p29 = DAILY_TEHILLIM[29] || [];
      const p30 = DAILY_TEHILLIM[30] || [];
      return [...p29, ...p30];
    }
    return DAILY_TEHILLIM[day] || [];
  }

  /**
   * Get the Shir Shel Yom (psalm of the day)
   */
  static getShirShelYom(date: Date = new Date()): number {
    const dayOfWeek = date.getDay();
    return DAY_OF_WEEK_TEHILLIM[dayOfWeek] || 24;
  }

  /**
   * Get chapters by theme
   */
  static getChaptersByTheme(theme: string): number[] {
    const chapters: number[] = [];
    for (const [num, chapter] of this.cachedChapters.entries()) {
      if (chapter.themes?.some(t => t.toLowerCase().includes(theme.toLowerCase()))) {
        chapters.push(num);
      }
    }
    return chapters.sort((a, b) => a - b);
  }

  /**
   * Get chapters for healing/refuah
   */
  static getRefuahChapters(): number[] {
    return [6, 13, 20, 22, 23, 30, 32, 38, 41, 51, 69, 86, 88, 91, 102, 103, 118, 121, 130, 142, 143];
  }

  /**
   * Get chapters for protection
   */
  static getProtectionChapters(): number[] {
    return [20, 23, 27, 91, 121, 130];
  }

  /**
   * Get chapters for parnassa (livelihood)
   */
  static getParnassaChapters(): number[] {
    return [23, 34, 36, 62, 65, 67, 85, 104, 121, 136, 145, 147];
  }

  /**
   * Get chapters for comfort/mourning
   */
  static getMourningChapters(): number[] {
    return [16, 17, 23, 49, 91, 119, 121, 130];
  }

  /**
   * Get all 150 chapter numbers
   */
  static getAllChapterNumbers(): number[] {
    return Array.from({ length: 150 }, (_, i) => i + 1);
  }

  /**
   * Get chapters by book number (1-5)
   */
  static getChaptersByBook(bookNumber: number): number[] {
    const book = TEHILLIM_BOOKS.find(b => b.number === bookNumber);
    return book?.chapters || [];
  }

  /**
   * Search for text in Tehillim
   */
  static async search(query: string): Promise<{ chapter: number; verse: number; text: string }[]> {
    const results: { chapter: number; verse: number; text: string }[] = [];
    const lowerQuery = query.toLowerCase();

    for (const [num, chapter] of this.cachedChapters.entries()) {
      for (const verse of chapter.verses) {
        if (
          verse.hebrew?.includes(query) ||
          verse.english?.toLowerCase().includes(lowerQuery)
        ) {
          results.push({
            chapter: num,
            verse: verse.number,
            text: verse.hebrew,
          });
        }
      }
    }

    return results;
  }

  /**
   * Get book number for a chapter
   */
  static getBookForChapter(chapterNumber: number): number {
    if (chapterNumber <= 41) return 1;
    if (chapterNumber <= 72) return 2;
    if (chapterNumber <= 89) return 3;
    if (chapterNumber <= 106) return 4;
    return 5;
  }

  /**
   * Get English title for common chapters
   */
  private static getChapterTitle(chapter: number): string {
    const titles: { [key: number]: string } = {
      1: 'The Way of the Righteous',
      19: 'The Heavens Declare',
      22: 'My God, Why Have You Forsaken Me',
      23: 'The Lord is My Shepherd',
      24: 'The Earth is the Lord\'s',
      27: 'The Lord is My Light',
      34: 'I Will Bless the Lord',
      51: 'Create in Me a Pure Heart',
      90: 'A Prayer of Moses',
      91: 'He Who Dwells in Shelter',
      92: 'A Song for the Sabbath',
      100: 'A Psalm of Thanksgiving',
      119: 'The Longest Psalm',
      121: 'I Lift My Eyes to the Mountains',
      126: 'When the Lord Returns',
      130: 'Out of the Depths',
      137: 'By the Rivers of Babylon',
      145: 'I Will Exalt You',
      150: 'Let Everything Praise',
    };
    return titles[chapter] || `Psalm ${chapter}`;
  }

  /**
   * Get themes for common chapters
   */
  private static getChapterThemes(chapter: number): string[] {
    const themes: { [key: number]: string[] } = {
      1: ['righteousness', 'Torah study'],
      23: ['trust', 'comfort', 'protection'],
      27: ['faith', 'courage', 'seeking God'],
      51: ['repentance', 'forgiveness'],
      91: ['protection', 'faith', 'angels'],
      100: ['gratitude', 'joy', 'praise'],
      121: ['protection', 'help', 'travel'],
      130: ['repentance', 'hope', 'forgiveness'],
      150: ['praise', 'music', 'joy'],
    };
    return themes[chapter] || [];
  }

  /**
   * Get occasions for common chapters
   */
  private static getChapterOccasions(chapter: number): string[] {
    const occasions: { [key: number]: string[] } = {
      23: ['funeral', 'shiva', 'comfort'],
      27: ['Elul', 'High Holidays'],
      91: ['protection', 'before sleep'],
      92: ['Shabbos'],
      100: ['daily', 'thanksgiving'],
      121: ['travel', 'protection'],
      130: ['Aseres Yemei Teshuvah', 'repentance'],
    };
    return occasions[chapter] || [];
  }

  /**
   * Get placeholder chapter when content not available
   */
  private static getPlaceholderChapter(number: number): TehillimChapter {
    return {
      number,
      hebrewNumber: this.numberToHebrew(number),
      bookNumber: this.getBookForChapter(number),
      themes: [],
      verses: [{
        number: 1,
        hebrew: `תהלים פרק ${this.numberToHebrew(number)}`,
        english: `Psalm ${number} - Loading...`,
      }],
    };
  }

  /**
   * Convert number to Hebrew
   */
  private static numberToHebrew(num: number): string {
    const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
    const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
    const hundreds = ['', 'ק', 'ר', 'ש', 'ת'];
    
    if (num === 15) return 'ט״ו';
    if (num === 16) return 'ט״ז';
    
    let result = '';
    if (num >= 100) {
      result += hundreds[Math.floor(num / 100)];
      num %= 100;
    }
    if (num >= 10) {
      result += tens[Math.floor(num / 10)];
      num %= 10;
    }
    if (num > 0) {
      result += ones[num];
    }
    
    if (result.length === 1) return result + '׳';
    if (result.length > 1) return result.slice(0, -1) + '״' + result.slice(-1);
    return result;
  }

  /**
   * Get Sefaria attribution (required by license)
   */
  static getAttribution(): { text: string; url: string } {
    return SefariaService.getAttribution();
  }
}
