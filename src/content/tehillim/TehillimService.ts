/**
 * Tehillim Service
 * Service for accessing and navigating Tehillim content
 */

import { TehillimChapter, TehillimVerse, DAILY_TEHILLIM, DAY_OF_WEEK_TEHILLIM, TEHILLIM_BOOKS } from './types';
import { getTehillimChapter, getAvailableChapters, TEHILLIM_CHAPTERS } from './chapters';

export class TehillimService {
  /**
   * Get a specific chapter
   */
  static getChapter(number: number): TehillimChapter | null {
    if (number < 1 || number > 150) return null;
    return getTehillimChapter(number);
  }

  /**
   * Get chapters for today's date (monthly cycle)
   */
  static getTodaysChapters(date: Date = new Date()): number[] {
    const dayOfMonth = date.getDate();
    // Handle months with less than 30 days
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
    for (const [num, chapter] of Object.entries(TEHILLIM_CHAPTERS)) {
      if (chapter.themes.some(t => t.toLowerCase().includes(theme.toLowerCase()))) {
        chapters.push(Number(num));
      }
    }
    return chapters.sort((a, b) => a - b);
  }

  /**
   * Get chapters for specific occasions
   */
  static getChaptersByOccasion(occasion: string): number[] {
    const chapters: number[] = [];
    for (const [num, chapter] of Object.entries(TEHILLIM_CHAPTERS)) {
      if (chapter.occasions?.some(o => o.toLowerCase().includes(occasion.toLowerCase()))) {
        chapters.push(Number(num));
      }
    }
    return chapters.sort((a, b) => a - b);
  }

  /**
   * Get chapters for healing/refuah
   */
  static getRefuahChapters(): number[] {
    // Traditional chapters said for healing
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
   * Get chapters for a yahrtzeit or mourning
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
   * Get book info for a chapter
   */
  static getBookForChapter(chapterNumber: number): number {
    if (chapterNumber <= 41) return 1;
    if (chapterNumber <= 72) return 2;
    if (chapterNumber <= 89) return 3;
    if (chapterNumber <= 106) return 4;
    return 5;
  }

  /**
   * Format a verse for display
   */
  static formatVerse(verse: TehillimVerse, showNumber: boolean = true): string {
    if (showNumber) {
      return `${verse.number}. ${verse.hebrew}`;
    }
    return verse.hebrew;
  }

  /**
   * Get the full Hebrew text of a chapter
   */
  static getChapterHebrewText(number: number): string {
    const chapter = this.getChapter(number);
    if (!chapter) return '';
    return chapter.verses.map(v => v.hebrew).join('\n\n');
  }

  /**
   * Get the full English text of a chapter
   */
  static getChapterEnglishText(number: number): string {
    const chapter = this.getChapter(number);
    if (!chapter) return '';
    return chapter.verses.map(v => v.english || '').join('\n\n');
  }

  /**
   * Search for a word/phrase in Tehillim
   */
  static search(query: string): { chapter: number; verse: number; text: string }[] {
    const results: { chapter: number; verse: number; text: string }[] = [];
    const lowerQuery = query.toLowerCase();

    for (const [num, chapter] of Object.entries(TEHILLIM_CHAPTERS)) {
      for (const verse of chapter.verses) {
        if (
          verse.hebrew.includes(query) ||
          verse.english?.toLowerCase().includes(lowerQuery) ||
          verse.transliteration?.toLowerCase().includes(lowerQuery)
        ) {
          results.push({
            chapter: Number(num),
            verse: verse.number,
            text: verse.hebrew,
          });
        }
      }
    }

    return results;
  }

  /**
   * Get suggested chapters based on context
   */
  static getSuggestedChapters(context: {
    isShabbos?: boolean;
    isYomTov?: boolean;
    isFastDay?: boolean;
    dayOfWeek?: number;
  }): { chapters: number[]; reason: string }[] {
    const suggestions: { chapters: number[]; reason: string }[] = [];

    // Shir Shel Yom
    if (context.dayOfWeek !== undefined) {
      suggestions.push({
        chapters: [DAY_OF_WEEK_TEHILLIM[context.dayOfWeek]],
        reason: 'Today\'s Psalm (Shir Shel Yom)',
      });
    }

    // Fast day
    if (context.isFastDay) {
      suggestions.push({
        chapters: [6, 13, 22, 102],
        reason: 'Fast Day Tehillim',
      });
    }

    // Shabbos
    if (context.isShabbos) {
      suggestions.push({
        chapters: [92, 93, 29],
        reason: 'Shabbos Tehillim',
      });
    }

    // Always suggest protection chapters
    suggestions.push({
      chapters: [23, 91, 121],
      reason: 'Popular Daily Chapters',
    });

    return suggestions;
  }
}
