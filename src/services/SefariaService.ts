/**
 * Sefaria API Service
 * Fetches Jewish texts from Sefaria's open API
 * 
 * Sefaria texts are under Creative Commons (CC-BY-SA)
 * Attribution: "Texts provided by Sefaria (sefaria.org)"
 * 
 * API Documentation: https://www.sefaria.org/api
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const SEFARIA_API_BASE = 'https://www.sefaria.org/api';
const CACHE_PREFIX = '@sefaria_cache_';
const CACHE_EXPIRY_DAYS = 30;

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

export class SefariaService {
  /**
   * Fetch a text from Sefaria API
   */
  static async fetchText(ref: string): Promise<SefariaText | null> {
    // Check cache first
    const cached = await this.getFromCache(ref);
    if (cached) {
      return cached;
    }

    try {
      const encodedRef = encodeURIComponent(ref);
      const response = await fetch(`${SEFARIA_API_BASE}/texts/${encodedRef}?context=0`);
      
      if (!response.ok) {
        console.warn(`Sefaria API error for ${ref}: ${response.status}`);
        return null;
      }

      const data = await response.json();
      
      const result: SefariaText = {
        hebrew: data.he || data.text,
        english: data.text,
        hebrewTitle: data.heTitle,
        ref: data.ref,
      };

      // Cache the result
      await this.saveToCache(ref, result);
      
      return result;
    } catch (error) {
      console.error(`Error fetching from Sefaria: ${error}`);
      return null;
    }
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
   * Fetch Siddur section
   * Sefaria has siddur content under "Siddur Ashkenaz" and "Siddur Edot HaMizrach"
   */
  static async fetchSiddurSection(
    section: string,
    nusach: 'ashkenaz' | 'sfard' = 'ashkenaz'
  ): Promise<SefariaText | null> {
    // Sefaria siddur references
    const siddurBase = nusach === 'ashkenaz' 
      ? 'Siddur Ashkenaz' 
      : 'Siddur Edot HaMizrach'; // Note: Sfard is similar to Edot HaMizrach in structure
    
    const ref = `${siddurBase}, ${section}`;
    return this.fetchText(ref);
  }

  /**
   * Fetch Shemoneh Esrei
   */
  static async fetchShemonehEsrei(
    service: 'shacharis' | 'mincha' | 'maariv' | 'shabbos',
    nusach: 'ashkenaz' | 'sfard' = 'ashkenaz'
  ): Promise<SefariaText | null> {
    const siddurBase = nusach === 'ashkenaz' 
      ? 'Siddur Ashkenaz' 
      : 'Siddur Edot HaMizrach';
    
    // Map service to Sefaria section names
    const sectionMap: { [key: string]: string } = {
      shacharis: 'Weekday, Shacharit, Amidah',
      mincha: 'Weekday, Mincha, Amidah',
      maariv: 'Weekday, Maariv, Amidah',
      shabbos: 'Shabbat, Shacharit, Amidah',
    };
    
    const section = sectionMap[service];
    if (!section) return null;
    
    return this.fetchSiddurSection(section, nusach);
  }

  /**
   * Get available Siddur sections
   */
  static getSiddurSections(): { id: string; name: string; hebrewName: string }[] {
    return [
      { id: 'modeh_ani', name: 'Modeh Ani', hebrewName: 'מודה אני' },
      { id: 'birchos_hashachar', name: 'Morning Blessings', hebrewName: 'ברכות השחר' },
      { id: 'pesukei_dezimra', name: 'Pesukei D\'Zimra', hebrewName: 'פסוקי דזמרה' },
      { id: 'shema', name: 'Shema', hebrewName: 'קריאת שמע' },
      { id: 'shemoneh_esrei', name: 'Shemoneh Esrei', hebrewName: 'שמונה עשרה' },
      { id: 'tachanun', name: 'Tachanun', hebrewName: 'תחנון' },
      { id: 'ashrei', name: 'Ashrei', hebrewName: 'אשרי' },
      { id: 'aleinu', name: 'Aleinu', hebrewName: 'עלינו' },
      { id: 'mincha', name: 'Mincha', hebrewName: 'מנחה' },
      { id: 'maariv', name: 'Maariv', hebrewName: 'מעריב' },
      { id: 'krias_shema_al_hamita', name: 'Bedtime Shema', hebrewName: 'קריאת שמע על המטה' },
      { id: 'birchas_hamazon', name: 'Grace After Meals', hebrewName: 'ברכת המזון' },
      { id: 'kiddush', name: 'Kiddush', hebrewName: 'קידוש' },
      { id: 'havdalah', name: 'Havdalah', hebrewName: 'הבדלה' },
      { id: 'hallel', name: 'Hallel', hebrewName: 'הלל' },
    ];
  }

  /**
   * Clean HTML tags from Sefaria text
   */
  private static cleanHtml(text: string): string {
    if (!text) return '';
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace nbsp
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  /**
   * Convert number to Hebrew letters
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
