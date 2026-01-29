/**
 * Siddur Service
 * Main service for accessing prayer content with dynamic variations
 */

import { Nusach } from '../../types/nusach';
import { DaveningChanges } from '../../types/calendar';
import { PrayerText } from './types';
import { AMIDAH_INSERTIONS, YAALEH_VEYAVO_DAYS } from './amidah-insertions';
import { SHEMONEH_ESREI_BRACHOS, AmidahBracha } from './shemoneh-esrei';

export interface SiddurContext {
  nusach: Nusach;
  daveningChanges: DaveningChanges;
  isIsrael: boolean;
  service: 'shacharis' | 'mincha' | 'maariv' | 'musaf';
}

export class SiddurService {
  /**
   * Get the appropriate text for Gevuros (2nd bracha)
   */
  static getGevurosInsertion(context: SiddurContext): PrayerText {
    if (context.daveningChanges.mashivHaruach) {
      return AMIDAH_INSERTIONS.mashivHaruach;
    }
    // Sefard and Edot Mizrach say Morid Hatal in summer
    if (context.nusach !== 'ashkenaz' && context.daveningChanges.moridHatal) {
      return AMIDAH_INSERTIONS.moridHatal;
    }
    // Ashkenaz says nothing special in summer
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
   * Get complete Amidah with all insertions for current context
   */
  static getAmidah(context: SiddurContext): AmidahBracha[] {
    const brachos = [...SHEMONEH_ESREI_BRACHOS];
    
    // Add context-specific modifications
    // This would be expanded to include all the dynamic content
    
    return brachos;
  }

  /**
   * Check if Tachanun is said for current context
   */
  static isTachanunSaid(context: SiddurContext): boolean {
    return context.daveningChanges.tachanun;
  }

  /**
   * Get Hallel type for current context
   */
  static getHallelType(context: SiddurContext): 'full' | 'half' | false {
    return context.daveningChanges.hallel;
  }

  /**
   * Get instructions for what's different in davening today
   */
  static getDaveningInstructions(context: SiddurContext): string[] {
    const instructions: string[] = [];
    const changes = context.daveningChanges;

    // Gevuros
    if (changes.mashivHaruach) {
      instructions.push('Say "Mashiv haruach u\'morid hageshem" in the 2nd bracha');
    } else if (changes.moridHatal && context.nusach !== 'ashkenaz') {
      instructions.push('Say "Morid hatal" in the 2nd bracha');
    }

    // Birkas Hashanim
    if (changes.vtenTalUmatar) {
      instructions.push('Say "V\'ten tal u\'matar livracha" in the 9th bracha');
    } else {
      instructions.push('Say "V\'ten bracha" in the 9th bracha');
    }

    // Ya'aleh V'Yavo
    if (changes.yaalehVeyavo) {
      instructions.push(`Say Ya'aleh V'Yavo in the 17th bracha (${changes.reason || 'Rosh Chodesh/Yom Tov'})`);
    }

    // Al Hanissim
    if (changes.alHanissim) {
      const holiday = changes.alHanissim === 'chanukah' ? 'Chanukah' : 'Purim';
      instructions.push(`Say Al Hanissim for ${holiday} in the 18th bracha`);
    }

    // Aneinu
    if (changes.aneinu) {
      instructions.push('Say Aneinu (fast day insertion)');
    }

    // Nachem
    if (changes.nachem) {
      instructions.push('Say Nachem in the 14th bracha (Tisha B\'Av Mincha)');
    }

    // Hallel
    if (changes.hallel === 'full') {
      instructions.push('Say full Hallel with a bracha');
    } else if (changes.hallel === 'half') {
      instructions.push('Say half Hallel (without bracha on Rosh Chodesh)');
    }

    // Tachanun
    if (!changes.tachanun) {
      instructions.push('No Tachanun today');
    }

    // Musaf
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
}
