/**
 * Siddur Service
 * Main service for accessing prayer content - ALL content from Sefaria API
 * 
 * Attribution: Texts provided by Sefaria (sefaria.org)
 */

import { Nusach } from '../../types/nusach';
import { DaveningChanges } from '../../types/calendar';
import { SefariaService, PrayerTextData } from '../../services/SefariaService';
import { ServiceType } from './types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const INSERTIONS_CACHE_KEY = '@siddur_insertions_cache';

export interface SiddurContext {
  nusach: Nusach;
  daveningChanges: DaveningChanges;
  isIsrael: boolean;
  service: ServiceType;
}

export interface PrayerSection {
  key: string;
  title: string;
  hebrewTitle: string;
  content?: PrayerTextData;
  instructions?: string;
  skip?: boolean;
  skipReason?: string;
}

interface AmidahInsertions {
  mashivHaruach: PrayerTextData;
  moridHatal: PrayerTextData;
  vtenBracha: PrayerTextData;
  vtenTalUmatar: PrayerTextData;
  yaalehVeyavo: PrayerTextData;
  alHanissimChanukah: PrayerTextData;
  alHanissimPurim: PrayerTextData;
  aneinu: PrayerTextData;
}

export class SiddurService {
  private static insertionsCache: AmidahInsertions | null = null;
  private static isInitialized = false;

  /**
   * Initialize and load cached insertions
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const cached = await AsyncStorage.getItem(INSERTIONS_CACHE_KEY);
      if (cached) {
        this.insertionsCache = JSON.parse(cached);
      }
    } catch (e) {
      console.warn('Error loading insertions cache:', e);
    }

    // Pre-fetch insertions if not cached
    if (!this.insertionsCache) {
      await this.loadInsertions();
    }

    this.isInitialized = true;
  }

  /**
   * Load Amidah insertions from Sefaria
   */
  private static async loadInsertions(): Promise<void> {
    try {
      this.insertionsCache = await SefariaService.fetchAmidahInsertions();
      await AsyncStorage.setItem(INSERTIONS_CACHE_KEY, JSON.stringify(this.insertionsCache));
    } catch (e) {
      console.warn('Error loading insertions:', e);
    }
  }

  /**
   * Get a prayer section content from Sefaria
   */
  static async getSection(
    sectionKey: string,
    nusach: Nusach = 'ashkenaz'
  ): Promise<PrayerTextData | null> {
    return SefariaService.fetchSiddurSection(sectionKey, nusach);
  }

  /**
   * Get complete davening structure for a service
   */
  static async getDaveningStructure(
    service: ServiceType,
    context: SiddurContext
  ): Promise<PrayerSection[]> {
    const isShabbos = context.daveningChanges.isShabbos || false;
    const structure = await SefariaService.fetchDaveningService(service, isShabbos, context.nusach);
    
    // Add skip logic based on context
    return structure.sections.map(section => {
      const prayerSection: PrayerSection = {
        key: section.key,
        title: section.title,
        hebrewTitle: section.hebrewTitle,
      };

      // Tachanun skip logic
      if (section.key === 'tachanun' && !context.daveningChanges.tachanun) {
        prayerSection.skip = true;
        prayerSection.skipReason = context.daveningChanges.reason || 'No Tachanun today';
      }

      // Add Hallel if needed
      if (section.key === 'hallel' && !context.daveningChanges.hallel) {
        prayerSection.skip = true;
      }

      return prayerSection;
    });
  }

  /**
   * Get the appropriate Gevuros insertion (2nd bracha)
   */
  static async getGevurosInsertion(context: SiddurContext): Promise<PrayerTextData> {
    await this.initialize();
    
    if (context.daveningChanges.mashivHaruach) {
      return this.insertionsCache?.mashivHaruach || {
        hebrew: 'מַשִּׁיב הָרוּחַ וּמוֹרִיד הַגֶּשֶׁם',
        english: 'Who causes the wind to blow and the rain to fall',
      };
    }
    
    if (context.nusach === 'sfard' && context.daveningChanges.moridHatal) {
      return this.insertionsCache?.moridHatal || {
        hebrew: 'מוֹרִיד הַטַּל',
        english: 'Who causes the dew to fall',
      };
    }
    
    return { hebrew: '', english: '' };
  }

  /**
   * Get the appropriate Birkas Hashanim text (9th bracha)
   */
  static async getBirkasHashanimText(context: SiddurContext): Promise<PrayerTextData> {
    await this.initialize();
    
    if (context.daveningChanges.vtenTalUmatar) {
      return this.insertionsCache?.vtenTalUmatar || {
        hebrew: 'וְתֵן טַל וּמָטָר לִבְרָכָה',
        english: 'And bestow dew and rain for blessing',
      };
    }
    
    return this.insertionsCache?.vtenBracha || {
      hebrew: 'וְתֵן בְּרָכָה',
      english: 'And bestow blessing',
    };
  }

  /**
   * Get Ya'aleh V'Yavo with day type
   */
  static async getYaalehVeyavo(
    dayType: 'rosh_chodesh' | 'pesach' | 'sukkos' | 'shavuos' | 'rosh_hashana' | 'yom_kippur'
  ): Promise<PrayerTextData> {
    await this.initialize();
    
    const dayNames: { [key: string]: { hebrew: string; english: string } } = {
      rosh_chodesh: { hebrew: 'רֹאשׁ הַחֹדֶשׁ', english: 'Rosh Chodesh' },
      pesach: { hebrew: 'חַג הַמַּצּוֹת', english: 'Passover' },
      sukkos: { hebrew: 'חַג הַסֻּכּוֹת', english: 'Sukkot' },
      shavuos: { hebrew: 'חַג הַשָּׁבֻעוֹת', english: 'Shavuot' },
      rosh_hashana: { hebrew: 'יוֹם הַזִּכָּרוֹן', english: 'the Day of Remembrance' },
      yom_kippur: { hebrew: 'יוֹם הַכִּפֻּרִים', english: 'the Day of Atonement' },
    };

    const base = this.insertionsCache?.yaalehVeyavo || {
      hebrew: 'יַעֲלֶה וְיָבֹא...',
      english: 'May there arise and come...',
    };

    const day = dayNames[dayType] || dayNames.rosh_chodesh;
    
    return {
      hebrew: base.hebrew.replace('[DAY]', day.hebrew).replace(/\[.*?\]/, day.hebrew),
      english: base.english.replace('[DAY]', day.english).replace(/\[.*?\]/, day.english),
    };
  }

  /**
   * Get Al Hanissim for Chanukah or Purim
   */
  static async getAlHanissim(holiday: 'chanukah' | 'purim'): Promise<PrayerTextData> {
    await this.initialize();
    
    if (holiday === 'chanukah') {
      return this.insertionsCache?.alHanissimChanukah || {
        hebrew: 'עַל הַנִּסִּים... בִּימֵי מַתִּתְיָהוּ...',
        english: 'For the miracles... In the days of Matityahu...',
      };
    }
    
    return this.insertionsCache?.alHanissimPurim || {
      hebrew: 'עַל הַנִּסִּים... בִּימֵי מָרְדְּכַי וְאֶסְתֵּר...',
      english: 'For the miracles... In the days of Mordechai and Esther...',
    };
  }

  /**
   * Get Aneinu for fast days
   */
  static async getAneinu(): Promise<PrayerTextData> {
    await this.initialize();
    
    return this.insertionsCache?.aneinu || {
      hebrew: 'עֲנֵנוּ יְיָ עֲנֵנוּ בְּיוֹם צוֹם תַּעֲנִיתֵנוּ...',
      english: 'Answer us, Lord, answer us on this day of our fast...',
    };
  }

  /**
   * Get instructions for what's different in davening today
   */
  static getDaveningInstructions(context: SiddurContext): string[] {
    const instructions: string[] = [];
    const changes = context.daveningChanges;

    if (changes.mashivHaruach) {
      instructions.push('Say "משיב הרוח ומוריד הגשם" in Gevuros (2nd bracha)');
    } else if (changes.moridHatal && context.nusach === 'sfard') {
      instructions.push('Say "מוריד הטל" in Gevuros (2nd bracha)');
    }

    if (changes.vtenTalUmatar) {
      instructions.push('Say "ותן טל ומטר לברכה" in Birkas Hashanim (9th bracha)');
    }

    if (changes.yaalehVeyavo) {
      instructions.push(`Say יעלה ויבא in R'tzei (17th bracha)`);
    }

    if (changes.alHanissim) {
      const holiday = changes.alHanissim === 'chanukah' ? 'Chanukah' : 'Purim';
      instructions.push(`Say על הניסים for ${holiday} in Modim (18th bracha)`);
    }

    if (changes.aneinu) {
      instructions.push('Say עננו (fast day) - in Shomea Tefillah');
    }

    if (changes.hallel === 'full') {
      instructions.push('Say full Hallel with brachos');
    } else if (changes.hallel === 'half') {
      instructions.push('Say half Hallel (skip certain paragraphs)');
    }

    if (!changes.tachanun) {
      instructions.push('Skip Tachanun');
    }

    if (changes.musaf) {
      instructions.push(`Say Musaf - ${changes.musaf}`);
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
    insertions: string[];
  } {
    const changes = context.daveningChanges;
    const highlights: string[] = [];
    const specialPrayers: string[] = [];
    const insertions: string[] = [];

    if (changes.reason) {
      highlights.push(changes.reason);
    }

    // Special prayers
    if (changes.hallel === 'full') {
      specialPrayers.push('Full Hallel');
    } else if (changes.hallel === 'half') {
      specialPrayers.push('Half Hallel');
    }

    if (changes.musaf) {
      specialPrayers.push('Musaf');
    }

    // Insertions
    if (changes.mashivHaruach) {
      insertions.push('Mashiv Haruach');
    }
    if (changes.vtenTalUmatar) {
      insertions.push("V'ten Tal U'matar");
    }
    if (changes.yaalehVeyavo) {
      insertions.push("Ya'aleh V'Yavo");
    }
    if (changes.alHanissim) {
      insertions.push('Al Hanissim');
    }
    if (changes.aneinu) {
      insertions.push('Aneinu');
    }

    // What's different
    if (!changes.tachanun) {
      highlights.push('No Tachanun');
    }

    return {
      title: changes.reason || 'Regular Day',
      highlights,
      specialPrayers,
      insertions,
    };
  }

  /**
   * Get attribution
   */
  static getAttribution(): { text: string; url: string } {
    return SefariaService.getAttribution();
  }
}
