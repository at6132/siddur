/**
 * Tehillim Service
 * Service for accessing Tehillim content from Sefaria
 * 
 * Attribution: Texts provided by Sefaria (sefaria.org)
 */

import { SefariaService, TehillimChapterData, SefariaVerse } from '../../services/SefariaService';
import { TehillimChapter, TehillimVerse, DAILY_TEHILLIM, DAY_OF_WEEK_TEHILLIM, TEHILLIM_BOOKS } from './types';
import { TEHILLIM_CHAPTERS } from './chapters';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TEHILLIM_CACHE_KEY = '@tehillim_full_cache';

export class TehillimService {
  private static cachedChapters: Map<number, TehillimChapter> = new Map();
  private static isInitialized = false;

  /**
   * Initialize the service - load cached data
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const cached = await AsyncStorage.getItem(TEHILLIM_CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        this.cachedChapters = new Map(Object.entries(data).map(([k, v]) => [Number(k), v as TehillimChapter]));
      }
    } catch (e) {
      console.warn('Error loading Tehillim cache:', e);
    }

    // Load bundled chapters as fallback
    for (const [num, chapter] of Object.entries(TEHILLIM_CHAPTERS)) {
      if (!this.cachedChapters.has(Number(num))) {
        this.cachedChapters.set(Number(num), chapter);
      }
    }

    this.isInitialized = true;
  }

  /**
   * Get a specific chapter - tries Sefaria first, falls back to local
   */
  static async getChapter(number: number): Promise<TehillimChapter | null> {
    if (number < 1 || number > 150) return null;
    
    await this.initialize();

    // Check cache first
    if (this.cachedChapters.has(number)) {
      return this.cachedChapters.get(number)!;
    }

    // Try to fetch from Sefaria
    try {
      const sefariaData = await SefariaService.fetchTehillimChapter(number);
      if (sefariaData) {
        const chapter = this.convertSefariaToTehillim(sefariaData);
        this.cachedChapters.set(number, chapter);
        await this.saveCache();
        return chapter;
      }
    } catch (e) {
      console.warn(`Error fetching chapter ${number} from Sefaria:`, e);
    }

    // Return placeholder if nothing available
    return this.getPlaceholderChapter(number);
  }

  /**
   * Get chapter synchronously (from cache only)
   */
  static getChapterSync(number: number): TehillimChapter | null {
    if (number < 1 || number > 150) return null;
    
    if (this.cachedChapters.has(number)) {
      return this.cachedChapters.get(number)!;
    }

    // Check bundled chapters
    if (TEHILLIM_CHAPTERS[number]) {
      return TEHILLIM_CHAPTERS[number];
    }

    return this.getPlaceholderChapter(number);
  }

  /**
   * Pre-fetch all chapters from Sefaria (call this in background)
   */
  static async prefetchAll(
    onProgress?: (current: number, total: number) => void
  ): Promise<void> {
    for (let i = 1; i <= 150; i++) {
      if (!this.cachedChapters.has(i)) {
        try {
          const sefariaData = await SefariaService.fetchTehillimChapter(i);
          if (sefariaData) {
            const chapter = this.convertSefariaToTehillim(sefariaData);
            this.cachedChapters.set(i, chapter);
          }
        } catch (e) {
          console.warn(`Error prefetching chapter ${i}:`, e);
        }
      }
      if (onProgress) {
        onProgress(i, 150);
      }
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    await this.saveCache();
  }

  /**
   * Get chapters for today's date (monthly cycle)
   */
  static getTodaysChapters(date: Date = new Date()): number[] {
    const dayOfMonth = date.getDate();
    const effectiveDay = Math.min(dayOfMonth, 30);
    return DAILY_TEHILLIM[effectiveDay] || [];
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
   * Convert Sefaria data format to our TehillimChapter format
   */
  private static convertSefariaToTehillim(data: TehillimChapterData): TehillimChapter {
    return {
      number: data.chapter,
      hebrewNumber: data.hebrewNumber,
      title: this.getChapterTitle(data.chapter),
      titleHebrew: data.title,
      bookNumber: this.getBookForChapter(data.chapter),
      themes: this.getChapterThemes(data.chapter),
      occasions: this.getChapterOccasions(data.chapter),
      verses: data.verses.map(v => ({
        number: v.number,
        hebrew: v.hebrew,
        english: v.english,
      })),
    };
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
   * Save cache to AsyncStorage
   */
  private static async saveCache(): Promise<void> {
    try {
      const cacheObj: { [key: number]: TehillimChapter } = {};
      for (const [num, chapter] of this.cachedChapters.entries()) {
        cacheObj[num] = chapter;
      }
      await AsyncStorage.setItem(TEHILLIM_CACHE_KEY, JSON.stringify(cacheObj));
    } catch (e) {
      console.warn('Error saving Tehillim cache:', e);
    }
  }

  /**
   * Get Sefaria attribution (required by license)
   */
  static getAttribution(): { text: string; url: string } {
    return SefariaService.getAttribution();
  }
}
