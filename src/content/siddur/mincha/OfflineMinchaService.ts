/**
 * Offline Mincha (client-only).
 * resolvePack(nusach) → {{gate}}/{{fold}} markers → reader
 */

import type { PrayerTextData } from '../prayerTextTypes';
import { UserPreferencesService } from '../../../storage/UserPreferences';
import type { MinchaNusachId } from './packTypes';
import { getMinchaOfflinePack } from './resolvePack';
import { getActiveAmidahDayOnlyInserts } from '../amidahSeasonal';
import { resolveMarkedPrayerText } from '../resolveMarkedText';

export type MinchaOfflineSectionKey =
  | 'mincha_korbanot'
  | 'mincha_ashrei'
  | 'mincha_amidah'
  | 'mincha_aleinu';

const KORBANOT_SECTION = {
  key: 'mincha_korbanot' as const,
  title: 'Korbanot',
  hebrewTitle: 'קרבנות',
};

const SECTIONS: { key: MinchaOfflineSectionKey; title: string; hebrewTitle: string }[] = [
  { key: 'mincha_ashrei', title: 'Ashrei', hebrewTitle: 'אשרי' },
  { key: 'mincha_amidah', title: 'Amidah', hebrewTitle: 'עמידה' },
  { key: 'mincha_aleinu', title: 'Aleinu', hebrewTitle: 'עלינו' },
];

function isLikelyIsraelLocation(loc?: { latitude: number; longitude: number }): boolean {
  if (!loc) return false;
  const { latitude: lat, longitude: lon } = loc;
  return lat >= 29.3 && lat <= 33.5 && lon >= 34.05 && lon <= 35.9;
}

async function resolveIsrael(): Promise<boolean> {
  try {
    const prefs = await UserPreferencesService.getPreferences();
    return isLikelyIsraelLocation(prefs?.location);
  } catch {
    return false;
  }
}

function fromPack(
  hebrew: string,
  english: string,
  date: Date,
  isIsrael: boolean
): PrayerTextData {
  const { folds: _f, ...content } = resolveMarkedPrayerText(hebrew, english, {
    date,
    isIsrael,
  });
  return content;
}

export class OfflineMinchaService {
  static getAttribution(nusach: MinchaNusachId = 'ashkenaz'): string {
    return getMinchaOfflinePack(nusach).attribution;
  }

  static getSections(nusach: MinchaNusachId = 'ashkenaz'): {
    key: string;
    title: string;
    hebrewTitle: string;
  }[] {
    const pack = getMinchaOfflinePack(nusach);
    const hasKorbanot = Boolean(pack.sections.korbanot?.hebrew?.trim());
    return hasKorbanot ? [KORBANOT_SECTION, ...SECTIONS] : [...SECTIONS];
  }

  static getActiveSeasonalInserts(date: Date = new Date()) {
    return getActiveAmidahDayOnlyInserts(date, { amidahSlot: 'mincha' });
  }

  static async getSection(
    sectionKey: string,
    options?: { date?: Date; nusach?: MinchaNusachId }
  ): Promise<PrayerTextData | null> {
    const date = options?.date ?? new Date();
    let nusach: MinchaNusachId = options?.nusach ?? 'ashkenaz';
    if (options?.nusach == null) {
      try {
        const prefs = await UserPreferencesService.getPreferences();
        if (prefs?.nusach === 'sfard' || prefs?.nusach === 'ashkenaz') {
          nusach = prefs.nusach;
        }
      } catch {
        /* keep default */
      }
    }
    const pack = getMinchaOfflinePack(nusach);
    const israel = await resolveIsrael();

    if (sectionKey === 'mincha_ashrei') {
      return fromPack(pack.sections.ashrei.hebrew, pack.sections.ashrei.english, date, israel);
    }
    if (sectionKey === 'mincha_aleinu') {
      return fromPack(pack.sections.aleinu.hebrew, pack.sections.aleinu.english, date, israel);
    }
    if (sectionKey === 'mincha_amidah') {
      return fromPack(pack.sections.amidah.hebrew, pack.sections.amidah.english, date, israel);
    }
    if (sectionKey === 'mincha_korbanot') {
      const raw = pack.sections.korbanot;
      if (!raw?.hebrew?.trim()) return fromPack('', '', date, israel);
      return fromPack(raw.hebrew, raw.english ?? '', date, israel);
    }
    return null;
  }
}
