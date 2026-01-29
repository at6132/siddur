/**
 * Siddur Service
 * Main service for accessing prayer content with dynamic variations
 * 
 * Attribution: Texts provided by Sefaria (sefaria.org)
 */

import { Nusach } from '../../types/nusach';
import { DaveningChanges } from '../../types/calendar';
import { SefariaService, SefariaText } from '../../services/SefariaService';
import { PrayerText, Prayer, PrayerSection, ServiceType } from './types';
import { AMIDAH_INSERTIONS, YAALEH_VEYAVO_DAYS } from './amidah-insertions';
import { SHEMONEH_ESREI_BRACHOS, AmidahBracha } from './shemoneh-esrei';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SIDDUR_CACHE_KEY = '@siddur_content_cache';

export interface SiddurContext {
  nusach: Nusach;
  daveningChanges: DaveningChanges;
  isIsrael: boolean;
  service: ServiceType;
}

export interface SiddurSection {
  id: string;
  name: string;
  nameHebrew: string;
  content: PrayerText[];
  instructions?: string;
}

export class SiddurService {
  private static cache: Map<string, SefariaText> = new Map();
  private static isInitialized = false;

  /**
   * Initialize the service
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const cached = await AsyncStorage.getItem(SIDDUR_CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        this.cache = new Map(Object.entries(data));
      }
    } catch (e) {
      console.warn('Error loading siddur cache:', e);
    }

    this.isInitialized = true;
  }

  /**
   * Get a siddur section from Sefaria
   */
  static async getSection(
    sectionId: string,
    nusach: Nusach = 'ashkenaz'
  ): Promise<SiddurSection | null> {
    await this.initialize();

    const cacheKey = `${nusach}_${sectionId}`;
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      return this.formatSection(sectionId, cached);
    }

    // Map section IDs to Sefaria refs
    const sectionMap = this.getSectionMapping(nusach);
    const sefariaRef = sectionMap[sectionId];
    
    if (!sefariaRef) {
      return this.getBuiltInSection(sectionId, nusach);
    }

    try {
      const data = await SefariaService.fetchText(sefariaRef);
      if (data) {
        this.cache.set(cacheKey, data);
        await this.saveCache();
        return this.formatSection(sectionId, data);
      }
    } catch (e) {
      console.warn(`Error fetching section ${sectionId}:`, e);
    }

    return this.getBuiltInSection(sectionId, nusach);
  }

  /**
   * Get Sefaria reference mapping for sections
   */
  private static getSectionMapping(nusach: Nusach): { [key: string]: string } {
    const base = nusach === 'ashkenaz' ? 'Siddur Ashkenaz' : 'Siddur Edot HaMizrach';
    
    return {
      'modeh_ani': `${base}, Weekday, Shacharit, Preparatory Prayers, Modeh Ani`,
      'birchos_hashachar': `${base}, Weekday, Shacharit, Preparatory Prayers, Birchot HaShachar`,
      'pesukei_dezimra': `${base}, Weekday, Shacharit, Pesukei Dezimra`,
      'baruch_sheamar': `${base}, Weekday, Shacharit, Pesukei Dezimra, Baruch She'amar`,
      'ashrei': `${base}, Weekday, Shacharit, Pesukei Dezimra, Ashrei`,
      'yishtabach': `${base}, Weekday, Shacharit, Pesukei Dezimra, Yishtabach`,
      'shema': `${base}, Weekday, Shacharit, Shema`,
      'shemoneh_esrei_shacharis': `${base}, Weekday, Shacharit, Amidah`,
      'tachanun': `${base}, Weekday, Shacharit, Tachanun`,
      'aleinu': `${base}, Weekday, Shacharit, Concluding Prayers, Aleinu`,
      'shemoneh_esrei_mincha': `${base}, Weekday, Mincha, Amidah`,
      'shemoneh_esrei_maariv': `${base}, Weekday, Maariv, Amidah`,
      'krias_shema_al_hamita': `${base}, Weekday, Maariv, Bedtime Shema`,
      'birchas_hamazon': `${base}, Birkat Hamazon`,
      'hallel': `${base}, Festivals, Hallel`,
    };
  }

  /**
   * Format Sefaria data into our section format
   */
  private static formatSection(sectionId: string, data: SefariaText): SiddurSection {
    const sectionInfo = this.getSectionInfo(sectionId);
    
    const hebrewContent = Array.isArray(data.hebrew) ? data.hebrew : [data.hebrew];
    const englishContent = Array.isArray(data.english) ? data.english : [data.english];

    const content: PrayerText[] = hebrewContent.map((heb, index) => ({
      hebrew: this.cleanText(heb),
      english: this.cleanText(englishContent[index] || ''),
    }));

    return {
      id: sectionId,
      name: sectionInfo.name,
      nameHebrew: sectionInfo.nameHebrew,
      content,
      instructions: sectionInfo.instructions,
    };
  }

  /**
   * Get section metadata
   */
  private static getSectionInfo(sectionId: string): { name: string; nameHebrew: string; instructions?: string } {
    const sections: { [key: string]: { name: string; nameHebrew: string; instructions?: string } } = {
      'modeh_ani': { name: 'Modeh Ani', nameHebrew: 'מודה אני', instructions: 'Said immediately upon waking' },
      'birchos_hashachar': { name: 'Morning Blessings', nameHebrew: 'ברכות השחר' },
      'pesukei_dezimra': { name: 'Verses of Praise', nameHebrew: 'פסוקי דזמרה' },
      'baruch_sheamar': { name: 'Baruch She\'amar', nameHebrew: 'ברוך שאמר', instructions: 'Stand while reciting' },
      'ashrei': { name: 'Ashrei', nameHebrew: 'אשרי' },
      'yishtabach': { name: 'Yishtabach', nameHebrew: 'ישתבח' },
      'shema': { name: 'Shema', nameHebrew: 'קריאת שמע', instructions: 'Cover eyes for first verse' },
      'shemoneh_esrei_shacharis': { name: 'Shemoneh Esrei - Shacharis', nameHebrew: 'שמונה עשרה - שחרית', instructions: 'Stand with feet together, face Jerusalem' },
      'tachanun': { name: 'Tachanun', nameHebrew: 'תחנון', instructions: 'Lean head on arm' },
      'aleinu': { name: 'Aleinu', nameHebrew: 'עלינו', instructions: 'Stand and bow' },
      'shemoneh_esrei_mincha': { name: 'Shemoneh Esrei - Mincha', nameHebrew: 'שמונה עשרה - מנחה' },
      'shemoneh_esrei_maariv': { name: 'Shemoneh Esrei - Maariv', nameHebrew: 'שמונה עשרה - מעריב' },
      'krias_shema_al_hamita': { name: 'Bedtime Shema', nameHebrew: 'קריאת שמע על המטה' },
      'birchas_hamazon': { name: 'Grace After Meals', nameHebrew: 'ברכת המזון' },
      'hallel': { name: 'Hallel', nameHebrew: 'הלל' },
    };
    return sections[sectionId] || { name: sectionId, nameHebrew: sectionId };
  }

  /**
   * Get built-in section when Sefaria unavailable
   */
  private static getBuiltInSection(sectionId: string, nusach: Nusach): SiddurSection {
    const sectionInfo = this.getSectionInfo(sectionId);
    
    // Return placeholder with our built-in content
    return {
      id: sectionId,
      name: sectionInfo.name,
      nameHebrew: sectionInfo.nameHebrew,
      content: [{
        hebrew: this.getBuiltInHebrew(sectionId),
        english: this.getBuiltInEnglish(sectionId),
      }],
      instructions: sectionInfo.instructions,
    };
  }

  /**
   * Get built-in Hebrew text for key prayers
   */
  private static getBuiltInHebrew(sectionId: string): string {
    const texts: { [key: string]: string } = {
      'modeh_ani': 'מוֹדֶה אֲנִי לְפָנֶיךָ מֶלֶךְ חַי וְקַיָּם, שֶׁהֶחֱזַרְתָּ בִּי נִשְׁמָתִי בְּחֶמְלָה. רַבָּה אֱמוּנָתֶךָ.',
      'shema': 'שְׁמַע יִשְׂרָאֵל יְיָ אֱלֹהֵינוּ יְיָ אֶחָד.',
      'ashrei': 'אַשְׁרֵי יוֹשְׁבֵי בֵיתֶךָ, עוֹד יְהַלְלוּךָ סֶּלָה.',
    };
    return texts[sectionId] || `[${sectionId}]`;
  }

  /**
   * Get built-in English text for key prayers
   */
  private static getBuiltInEnglish(sectionId: string): string {
    const texts: { [key: string]: string } = {
      'modeh_ani': 'I give thanks before You, living and eternal King, that You have returned my soul within me with compassion. Great is Your faithfulness.',
      'shema': 'Hear, O Israel, the Lord is our God, the Lord is One.',
      'ashrei': 'Fortunate are those who dwell in Your house; they will continue to praise You, Selah.',
    };
    return texts[sectionId] || '';
  }

  /**
   * Clean HTML and format text
   */
  private static cleanText(text: string): string {
    if (!text) return '';
    return text
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  /**
   * Get the appropriate text for Gevuros (2nd bracha)
   */
  static getGevurosInsertion(context: SiddurContext): PrayerText {
    if (context.daveningChanges.mashivHaruach) {
      return AMIDAH_INSERTIONS.mashivHaruach;
    }
    if (context.nusach !== 'ashkenaz' && context.daveningChanges.moridHatal) {
      return AMIDAH_INSERTIONS.moridHatal;
    }
    return { hebrew: '', english: '' };
  }

  /**
   * Get the appropriate text for Birkas Hashanim (9th bracha)
   */
  static getBirkasHashanimText(context: SiddurContext): PrayerText {
    if (context.daveningChanges.vtenTalUmatar) {
      return AMIDAH_INSERTIONS.vtenTalUmatar;
    }
    return AMIDAH_INSERTIONS.vtenBracha;
  }

  /**
   * Get Ya'aleh V'Yavo with the appropriate day inserted
   */
  static getYaalehVeyavo(dayType: keyof typeof YAALEH_VEYAVO_DAYS): PrayerText {
    const dayText = YAALEH_VEYAVO_DAYS[dayType];
    const base = AMIDAH_INSERTIONS.yaalehVeyavo;
    
    return {
      ...base,
      hebrew: base.hebrew.replace(/\[.*?\]/, dayText),
    };
  }

  /**
   * Get Al Hanissim for the appropriate holiday
   */
  static getAlHanissim(holiday: 'chanukah' | 'purim'): PrayerText {
    if (holiday === 'chanukah') {
      return AMIDAH_INSERTIONS.alHanissimChanukah;
    }
    return AMIDAH_INSERTIONS.alHanissimPurim;
  }

  /**
   * Get complete Amidah structure with all insertions for current context
   */
  static getAmidah(context: SiddurContext): AmidahBracha[] {
    return [...SHEMONEH_ESREI_BRACHOS];
  }

  /**
   * Get instructions for what's different in davening today
   */
  static getDaveningInstructions(context: SiddurContext): string[] {
    const instructions: string[] = [];
    const changes = context.daveningChanges;

    if (changes.mashivHaruach) {
      instructions.push('Say "Mashiv haruach u\'morid hageshem" in the 2nd bracha');
    } else if (changes.moridHatal && context.nusach !== 'ashkenaz') {
      instructions.push('Say "Morid hatal" in the 2nd bracha');
    }

    if (changes.vtenTalUmatar) {
      instructions.push('Say "V\'ten tal u\'matar livracha" in the 9th bracha');
    }

    if (changes.yaalehVeyavo) {
      instructions.push(`Say Ya'aleh V'Yavo in the 17th bracha (${changes.reason || 'Rosh Chodesh/Yom Tov'})`);
    }

    if (changes.alHanissim) {
      const holiday = changes.alHanissim === 'chanukah' ? 'Chanukah' : 'Purim';
      instructions.push(`Say Al Hanissim for ${holiday} in the 18th bracha`);
    }

    if (changes.aneinu) {
      instructions.push('Say Aneinu (fast day insertion)');
    }

    if (changes.hallel === 'full') {
      instructions.push('Say full Hallel with a bracha');
    } else if (changes.hallel === 'half') {
      instructions.push('Say half Hallel (without bracha on Rosh Chodesh)');
    }

    if (!changes.tachanun) {
      instructions.push('No Tachanun today');
    }

    if (changes.musaf) {
      instructions.push(`Say Musaf (${changes.musaf})`);
    }

    return instructions;
  }

  /**
   * Get a summary of today's davening
   */
  static getDaveningSummary(context: SiddurContext): {
    title: string;
    highlights: string[];
    specialPrayers: string[];
  } {
    const changes = context.daveningChanges;
    const highlights: string[] = [];
    const specialPrayers: string[] = [];

    if (changes.reason) {
      highlights.push(changes.reason);
    }

    if (changes.hallel === 'full') {
      specialPrayers.push('Full Hallel');
    } else if (changes.hallel === 'half') {
      specialPrayers.push('Half Hallel');
    }

    if (changes.musaf) {
      specialPrayers.push('Musaf');
    }

    if (changes.alHanissim) {
      specialPrayers.push('Al Hanissim');
    }

    if (changes.yaalehVeyavo) {
      specialPrayers.push('Ya\'aleh V\'Yavo');
    }

    if (!changes.tachanun) {
      highlights.push('No Tachanun');
    }

    return {
      title: changes.reason || 'Regular Day',
      highlights,
      specialPrayers,
    };
  }

  /**
   * Get all available services for a day
   */
  static getAvailableServices(context: SiddurContext): ServiceType[] {
    const services: ServiceType[] = ['shacharis', 'mincha', 'maariv'];
    
    if (context.daveningChanges.musaf) {
      services.splice(1, 0, 'musaf');
    }
    
    return services;
  }

  /**
   * Save cache
   */
  private static async saveCache(): Promise<void> {
    try {
      const cacheObj: { [key: string]: SefariaText } = {};
      for (const [key, value] of this.cache.entries()) {
        cacheObj[key] = value;
      }
      await AsyncStorage.setItem(SIDDUR_CACHE_KEY, JSON.stringify(cacheObj));
    } catch (e) {
      console.warn('Error saving siddur cache:', e);
    }
  }

  /**
   * Get Sefaria attribution
   */
  static getAttribution(): { text: string; url: string } {
    return SefariaService.getAttribution();
  }
}
