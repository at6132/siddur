/**
 * Offline standalone siddur texts (client-only).
 * resolvePack(nusach) → tefilas/bedtime pipelines → reader
 */

import { markSefataiParagraphSmall } from '../../../services/MinchaTextRules';
import { stripMaarivKaddishBlock } from '../../../services/MaarivTextRules';
import { stripSefariaInstructionLines } from '../../../services/ShacharitTextRules';
import { applyTefilasHaderechPipeline } from '../../../services/StandaloneTextRules';
import type { PrayerTextData, PrayerTextSegment } from '../../../services/SefariaService';
import { UserPreferencesService } from '../../../storage/UserPreferences';
import type { StandaloneNusachId, StandaloneOfflinePack, StandaloneSectionKey } from './packTypes';
import { getStandaloneOfflinePack } from './resolvePack';

export type { StandaloneSectionKey };

function segs(text: string): PrayerTextSegment[] {
  return [{ text, italic: false }];
}

function withSegments(hebrew: string, english: string): PrayerTextData {
  const h = hebrew.replace(/\n{3,}/g, '\n\n').trim();
  const e = (english || '').replace(/\n{3,}/g, '\n\n').trim();
  return {
    hebrew: h,
    english: e,
    hebrewSegments: markSefataiParagraphSmall(segs(h)),
    englishSegments: markSefataiParagraphSmall(segs(e)),
  };
}

export class OfflineStandaloneService {
  static getAttribution(nusach: StandaloneNusachId = 'ashkenaz'): string {
    return getStandaloneOfflinePack(nusach).attribution;
  }

  static hasSection(sectionKey: string, nusach: StandaloneNusachId = 'ashkenaz'): boolean {
    const pack = getStandaloneOfflinePack(nusach);
    return !!pack.sections[sectionKey as StandaloneSectionKey]?.hebrew?.trim();
  }

  static async getSection(
    sectionKey: string,
    options?: { date?: Date; nusach?: StandaloneNusachId }
  ): Promise<PrayerTextData | null> {
    let nusach: StandaloneNusachId = options?.nusach ?? 'ashkenaz';
    if (options?.nusach == null) {
      try {
        const prefs = await UserPreferencesService.getPreferences();
        if (prefs?.nusach === 'sfard' || prefs?.nusach === 'ashkenaz') nusach = prefs.nusach;
      } catch {
        /* default */
      }
    }
    const pack = getStandaloneOfflinePack(nusach);
    const raw = pack.sections[sectionKey as StandaloneSectionKey];
    if (!raw?.hebrew?.trim()) return null;

    if (sectionKey === 'tefilas_haderech') {
      return this.getTefilasHaderech(pack, nusach);
    }

    let hebrew = raw.hebrew;
    let english = raw.english ?? '';
    const stripped = stripSefariaInstructionLines(hebrew, english);
    hebrew = stripped.hebrew;
    english = stripped.english;

    if (sectionKey === 'krias_shema_al_hamita') {
      const noKaddish = stripMaarivKaddishBlock(hebrew, english);
      hebrew = noKaddish.hebrew;
      english = noKaddish.english;
    }

    return withSegments(hebrew, english);
  }

  private static getTefilasHaderech(
    pack: StandaloneOfflinePack,
    nusach: StandaloneNusachId
  ): PrayerTextData | null {
    const raw = pack.sections.tefilas_haderech;
    if (!raw?.hebrew?.trim()) return null;
    const stripped = stripSefariaInstructionLines(raw.hebrew, raw.english ?? '');
    const piped = applyTefilasHaderechPipeline(stripped.hebrew, stripped.english, nusach);
    return {
      hebrew: piped.hebrew,
      english: piped.english,
      hebrewSegments: markSefataiParagraphSmall(piped.hebrewSegments),
      englishSegments: markSefataiParagraphSmall(piped.englishSegments),
    };
  }
}
