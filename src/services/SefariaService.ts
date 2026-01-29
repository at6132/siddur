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

export interface PrayerTextData {
  hebrew: string;
  english: string;
  transliteration?: string;
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

  // ==========================================
  // SIDDUR SECTIONS - Mapped to Sefaria refs
  // ==========================================

  /**
   * Sefaria reference mapping for Siddur Ashkenaz
   * Based on: https://www.sefaria.org/Siddur_Ashkenaz
   */
  static SIDDUR_ASHKENAZ_REFS: { [key: string]: string } = {
    // Morning
    'modeh_ani': 'Siddur Ashkenaz, Weekday, Shacharit, Preparatory Prayers, Modeh Ani',
    'netilas_yadayim': 'Siddur Ashkenaz, Weekday, Shacharit, Preparatory Prayers, Washing the Hands',
    'asher_yatzar': 'Siddur Ashkenaz, Weekday, Shacharit, Preparatory Prayers, Asher Ysatisfactionatzar',
    'elokai_neshama': 'Siddur Ashkenaz, Weekday, Shacharit, Preparatory Prayers, Elohai Neshamah',
    'birchos_hatorah': 'Siddur Ashkenaz, Weekday, Shacharit, Preparatory Prayers, Birchot HaTorah',
    'birchos_hashachar': 'Siddur Ashkenaz, Weekday, Shacharit, Preparatory Prayers, Birchot HaShachar',
    'akedah': 'Siddur Ashkenaz, Weekday, Shacharit, Preparatory Prayers, The Binding of Isaac',
    'korbanos': 'Siddur Ashkenaz, Weekday, Shacharit, Preparatory Prayers, Korbanot',
    
    // Pesukei Dezimra
    'hodu': 'Siddur Ashkenaz, Weekday, Shacharit, Pesukei Dezimra, Hodu',
    'baruch_sheamar': 'Siddur Ashkenaz, Weekday, Shacharit, Pesukei Dezimra, Baruch She\'amar',
    'mizmor_letodah': 'Siddur Ashkenaz, Weekday, Shacharit, Pesukei Dezimra, Mizmor Letodah',
    'yehi_chevod': 'Siddur Ashkenaz, Weekday, Shacharit, Pesukei Dezimra, Yehi Chevod',
    'ashrei': 'Siddur Ashkenaz, Weekday, Shacharit, Pesukei Dezimra, Ashrei',
    'hallelukahs': 'Siddur Ashkenaz, Weekday, Shacharit, Pesukei Dezimra, Hallelukahs',
    'vayevarech_david': 'Siddur Ashkenaz, Weekday, Shacharit, Pesukei Dezimra, Vayevarech David',
    'az_yashir': 'Siddur Ashkenaz, Weekday, Shacharit, Pesukei Dezimra, Az Yashir',
    'yishtabach': 'Siddur Ashkenaz, Weekday, Shacharit, Pesukei Dezimra, Yishtabach',
    
    // Shema and its Blessings
    'birchos_kriyas_shema': 'Siddur Ashkenaz, Weekday, Shacharit, Shema',
    'shema': 'Siddur Ashkenaz, Weekday, Shacharit, Shema, Shema',
    
    // Amidah
    'amidah_shacharis': 'Siddur Ashkenaz, Weekday, Shacharit, Amidah',
    'amidah_mincha': 'Siddur Ashkenaz, Weekday, Mincha, Amidah',
    'amidah_maariv': 'Siddur Ashkenaz, Weekday, Maariv, Amidah',
    
    // Tachanun
    'tachanun': 'Siddur Ashkenaz, Weekday, Shacharit, Tachanun',
    'vidui': 'Siddur Ashkenaz, Weekday, Shacharit, Tachanun, Vidui and 13 Middot',
    'nefilas_apayim': 'Siddur Ashkenaz, Weekday, Shacharit, Tachanun, Nefilat Apayim',
    
    // Conclusion
    'ashrei_uva_letzion': 'Siddur Ashkenaz, Weekday, Shacharit, Concluding Prayers, Ashrei',
    'uva_letzion': 'Siddur Ashkenaz, Weekday, Shacharit, Concluding Prayers, Uva Letzion',
    'aleinu': 'Siddur Ashkenaz, Weekday, Shacharit, Concluding Prayers, Aleinu',
    
    // Mincha
    'ashrei_mincha': 'Siddur Ashkenaz, Weekday, Mincha, Ashrei',
    
    // Maariv
    'maariv_intro': 'Siddur Ashkenaz, Weekday, Maariv, Vehu Rachum',
    'birchos_kriyas_shema_maariv': 'Siddur Ashkenaz, Weekday, Maariv, Shema',
    
    // Bedtime Shema
    'krias_shema_al_hamita': 'Siddur Ashkenaz, Weekday, Bedtime Shema',
    
    // Blessings
    'birchas_hamazon': 'Siddur Ashkenaz, Birkat Hamazon, Birkat Hamazon',
    'al_hamichya': 'Siddur Ashkenaz, Birkat Hamazon, Bracha Me\'ein Shalosh',
    
    // Shabbat
    'kabbalas_shabbos': 'Siddur Ashkenaz, Shabbat, Kabbalat Shabbat',
    'lecha_dodi': 'Siddur Ashkenaz, Shabbat, Kabbalat Shabbat, Lecha Dodi',
    'maariv_shabbos': 'Siddur Ashkenaz, Shabbat, Maariv for Shabbat',
    'kiddush_friday': 'Siddur Ashkenaz, Shabbat, Kiddush for Shabbat Evening',
    'shacharis_shabbos': 'Siddur Ashkenaz, Shabbat, Shacharit for Shabbat',
    'musaf_shabbos': 'Siddur Ashkenaz, Shabbat, Mussaf for Shabbat',
    'kiddush_shabbos_day': 'Siddur Ashkenaz, Shabbat, Kiddush for Shabbat Day',
    'mincha_shabbos': 'Siddur Ashkenaz, Shabbat, Mincha for Shabbat',
    
    // Havdalah
    'havdalah': 'Siddur Ashkenaz, Shabbat, Havdalah',
    
    // Hallel
    'hallel': 'Siddur Ashkenaz, Festivals, Hallel',
    
    // Festivals
    'kiddush_yom_tov': 'Siddur Ashkenaz, Festivals, Kiddush for Festivals',
    'amidah_yom_tov': 'Siddur Ashkenaz, Festivals, Amidah for Festivals',
    
    // High Holidays
    'avinu_malkeinu': 'Siddur Ashkenaz, Rosh Hashanah, Avinu Malkeinu',
    
    // Special insertions - these may need direct text
    'yaaleh_veyavo': 'Siddur Ashkenaz, Festivals, Amidah for Festivals, Yaaleh Veyavo',
    'al_hanissim_chanukah': 'Siddur Ashkenaz, Chanukah, Al HaNissim',
    'al_hanissim_purim': 'Siddur Ashkenaz, Purim, Al HaNissim',
  };

  /**
   * Fetch a siddur section
   */
  static async fetchSiddurSection(
    sectionKey: string,
    nusach: 'ashkenaz' | 'sfard' = 'ashkenaz'
  ): Promise<PrayerTextData | null> {
    // For now, primarily support Ashkenaz (Sefaria's main siddur)
    // Sfard variations handled by specific overrides
    const refs = this.SIDDUR_ASHKENAZ_REFS;
    const ref = refs[sectionKey];
    
    if (!ref) {
      console.warn(`No Sefaria ref for section: ${sectionKey}`);
      return null;
    }

    const data = await this.fetchText(ref);
    if (!data) return null;

    // Combine array into single text block
    const hebrew = Array.isArray(data.hebrew) 
      ? data.hebrew.map(s => this.cleanHtml(s)).join('\n\n')
      : this.cleanHtml(data.hebrew);
      
    const english = Array.isArray(data.english)
      ? data.english.map(s => this.cleanHtml(s)).join('\n\n')
      : this.cleanHtml(data.english || '');

    return { hebrew, english };
  }

  /**
   * Fetch Amidah insertions (seasonal prayers)
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
    // These are the key insertions that change based on season/day
    // Fetched from Sefaria where available, fallback to reliable hardcoded

    const mashivHaruach = await this.fetchText('Siddur Ashkenaz, Weekday, Shacharit, Amidah, Gevurot 1');
    const yaalehVeyavo = await this.fetchSiddurSection('yaaleh_veyavo');
    const alHanissimChanukah = await this.fetchSiddurSection('al_hanissim_chanukah');
    const alHanissimPurim = await this.fetchSiddurSection('al_hanissim_purim');

    return {
      mashivHaruach: {
        hebrew: 'מַשִּׁיב הָרוּחַ וּמוֹרִיד הַגֶּשֶׁם',
        english: 'Who causes the wind to blow and the rain to fall',
      },
      moridHatal: {
        hebrew: 'מוֹרִיד הַטַּל',
        english: 'Who causes the dew to fall',
      },
      vtenBracha: {
        hebrew: 'וְתֵן בְּרָכָה',
        english: 'And bestow blessing',
      },
      vtenTalUmatar: {
        hebrew: 'וְתֵן טַל וּמָטָר לִבְרָכָה',
        english: 'And bestow dew and rain for blessing',
      },
      yaalehVeyavo: yaalehVeyavo || {
        hebrew: 'יַעֲלֶה וְיָבֹא וְיַגִּיעַ וְיֵרָאֶה וְיֵרָצֶה וְיִשָּׁמַע וְיִפָּקֵד וְיִזָּכֵר זִכְרוֹנֵנוּ וּפִקְדוֹנֵנוּ, וְזִכְרוֹן אֲבוֹתֵינוּ, וְזִכְרוֹן מָשִׁיחַ בֶּן דָּוִד עַבְדֶּךָ, וְזִכְרוֹן יְרוּשָׁלַיִם עִיר קָדְשֶׁךָ, וְזִכְרוֹן כָּל עַמְּךָ בֵּית יִשְׂרָאֵל לְפָנֶיךָ, לִפְלֵיטָה לְטוֹבָה, לְחֵן וּלְחֶסֶד וּלְרַחֲמִים, לְחַיִּים וּלְשָׁלוֹם בְּיוֹם [DAY]',
        english: 'May there arise and come, reach and be seen, accepted and heard, recalled and remembered before You, the remembrance of us, the remembrance of our ancestors, the remembrance of the Messiah son of David Your servant, the remembrance of Jerusalem Your holy city, and the remembrance of all Your people the house of Israel, for deliverance, well-being, grace, loving-kindness and compassion, life and peace, on this day of [DAY]',
      },
      alHanissimChanukah: alHanissimChanukah || {
        hebrew: 'עַל הַנִּסִּים וְעַל הַפֻּרְקָן וְעַל הַגְּבוּרוֹת וְעַל הַתְּשׁוּעוֹת וְעַל הַמִּלְחָמוֹת שֶׁעָשִׂיתָ לַאֲבוֹתֵינוּ בַּיָּמִים הָהֵם בַּזְּמַן הַזֶּה. בִּימֵי מַתִּתְיָהוּ בֶּן יוֹחָנָן כֹּהֵן גָּדוֹל חַשְׁמוֹנַאי וּבָנָיו...',
        english: 'For the miracles, and for the salvation, and for the mighty deeds, and for the victories, and for the battles which You performed for our ancestors in those days, at this time. In the days of Matityahu son of Yochanan, the High Priest, the Hasmonean, and his sons...',
      },
      alHanissimPurim: alHanissimPurim || {
        hebrew: 'עַל הַנִּסִּים וְעַל הַפֻּרְקָן וְעַל הַגְּבוּרוֹת וְעַל הַתְּשׁוּעוֹת וְעַל הַמִּלְחָמוֹת שֶׁעָשִׂיתָ לַאֲבוֹתֵינוּ בַּיָּמִים הָהֵם בַּזְּמַן הַזֶּה. בִּימֵי מָרְדְּכַי וְאֶסְתֵּר בְּשׁוּשַׁן הַבִּירָה...',
        english: 'For the miracles, and for the salvation, and for the mighty deeds, and for the victories, and for the battles which You performed for our ancestors in those days, at this time. In the days of Mordechai and Esther in Shushan the capital...',
      },
      aneinu: {
        hebrew: 'עֲנֵנוּ יְיָ עֲנֵנוּ בְּיוֹם צוֹם תַּעֲנִיתֵנוּ כִּי בְצָרָה גְדוֹלָה אֲנָחְנוּ...',
        english: 'Answer us, Lord, answer us on this day of our fast, for we are in great distress...',
      },
    };
  }

  /**
   * Get the complete structure of a davening service
   */
  static async fetchDaveningService(
    service: 'shacharis' | 'mincha' | 'maariv' | 'musaf',
    isShabbos: boolean = false,
    nusach: 'ashkenaz' | 'sfard' = 'ashkenaz'
  ): Promise<{ sections: { key: string; title: string; hebrewTitle: string }[] }> {
    // Return the structure - actual content fetched per section
    if (service === 'shacharis') {
      if (isShabbos) {
        return {
          sections: [
            { key: 'modeh_ani', title: 'Modeh Ani', hebrewTitle: 'מודה אני' },
            { key: 'birchos_hashachar', title: 'Morning Blessings', hebrewTitle: 'ברכות השחר' },
            { key: 'pesukei_dezimra', title: 'Pesukei D\'Zimra', hebrewTitle: 'פסוקי דזמרה' },
            { key: 'nishmas', title: 'Nishmas', hebrewTitle: 'נשמת' },
            { key: 'birchos_kriyas_shema', title: 'Blessings of Shema', hebrewTitle: 'ברכות קריאת שמע' },
            { key: 'shema', title: 'Shema', hebrewTitle: 'שמע' },
            { key: 'amidah_shabbos', title: 'Amidah', hebrewTitle: 'עמידה' },
            { key: 'hallel', title: 'Hallel', hebrewTitle: 'הלל' },
            { key: 'torah_reading', title: 'Torah Reading', hebrewTitle: 'קריאת התורה' },
            { key: 'musaf', title: 'Musaf', hebrewTitle: 'מוסף' },
            { key: 'aleinu', title: 'Aleinu', hebrewTitle: 'עלינו' },
          ],
        };
      }
      return {
        sections: [
          { key: 'modeh_ani', title: 'Modeh Ani', hebrewTitle: 'מודה אני' },
          { key: 'birchos_hashachar', title: 'Morning Blessings', hebrewTitle: 'ברכות השחר' },
          { key: 'korbanos', title: 'Korbanos', hebrewTitle: 'קרבנות' },
          { key: 'pesukei_dezimra', title: 'Pesukei D\'Zimra', hebrewTitle: 'פסוקי דזמרה' },
          { key: 'birchos_kriyas_shema', title: 'Blessings of Shema', hebrewTitle: 'ברכות קריאת שמע' },
          { key: 'shema', title: 'Shema', hebrewTitle: 'שמע' },
          { key: 'amidah_shacharis', title: 'Amidah', hebrewTitle: 'עמידה' },
          { key: 'tachanun', title: 'Tachanun', hebrewTitle: 'תחנון' },
          { key: 'ashrei_uva_letzion', title: 'Ashrei & Uva L\'Tzion', hebrewTitle: 'אשרי ובא לציון' },
          { key: 'aleinu', title: 'Aleinu', hebrewTitle: 'עלינו' },
        ],
      };
    }

    if (service === 'mincha') {
      return {
        sections: [
          { key: 'ashrei_mincha', title: 'Ashrei', hebrewTitle: 'אשרי' },
          { key: 'amidah_mincha', title: 'Amidah', hebrewTitle: 'עמידה' },
          { key: 'tachanun', title: 'Tachanun', hebrewTitle: 'תחנון' },
          { key: 'aleinu', title: 'Aleinu', hebrewTitle: 'עלינו' },
        ],
      };
    }

    if (service === 'maariv') {
      return {
        sections: [
          { key: 'maariv_intro', title: 'Vehu Rachum', hebrewTitle: 'והוא רחום' },
          { key: 'birchos_kriyas_shema_maariv', title: 'Blessings of Shema', hebrewTitle: 'ברכות קריאת שמע' },
          { key: 'shema', title: 'Shema', hebrewTitle: 'שמע' },
          { key: 'amidah_maariv', title: 'Amidah', hebrewTitle: 'עמידה' },
          { key: 'aleinu', title: 'Aleinu', hebrewTitle: 'עלינו' },
        ],
      };
    }

    // Musaf
    return {
      sections: [
        { key: 'musaf_amidah', title: 'Musaf Amidah', hebrewTitle: 'עמידת מוסף' },
        { key: 'aleinu', title: 'Aleinu', hebrewTitle: 'עלינו' },
      ],
    };
  }

  /**
   * Clean HTML tags from Sefaria text
   */
  private static cleanHtml(text: string): string {
    if (!text) return '';
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/<br\s*\/?>/gi, '\n') // Convert br to newlines
      .replace(/&nbsp;/g, ' ') // Replace nbsp
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
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
