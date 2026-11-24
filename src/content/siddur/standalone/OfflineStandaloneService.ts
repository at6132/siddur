/**
 * Offline standalone siddur texts (client-only).
 * resolvePack(nusach) → {{gate}}/{{fold}} markers → reader
 */

import type { PrayerTextData } from '../prayerTextTypes';
import { UserPreferencesService } from '../../../storage/UserPreferences';
import type { StandaloneNusachId, StandaloneOfflinePack, StandaloneSectionKey } from './packTypes';
import { getStandaloneOfflinePack } from './resolvePack';
import { resolveMarkedPrayerText } from '../resolveMarkedText';
import { applyTefilasHaderechPipeline } from '../../../services/StandaloneTextRules';

export type { StandaloneSectionKey };

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
    const date = options?.date ?? new Date();
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

    const { folds: _f, ...content } = resolveMarkedPrayerText(raw.hebrew, raw.english ?? '', {
      date,
    });
    return content;
  }

  private static getTefilasHaderech(
    pack: StandaloneOfflinePack,
    nusach: 'ashkenaz' | 'sfard' = 'ashkenaz'
  ): PrayerTextData {
    const raw = pack.sections.tefilas_haderech!;
    const piped = applyTefilasHaderechPipeline(raw.hebrew, raw.english ?? '', nusach);
    const { folds: _f, ...content } = resolveMarkedPrayerText(piped.hebrew, piped.english, {
      date: new Date(),
    });
    return content;
  }
}
