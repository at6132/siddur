/**
 * Offline weekday Maariv (client-only).
 * resolvePack(nusach) → {{gate}}/{{fold}} markers → reader
 * maariv_omer: tonight’s count only (OmerCalculator), not the 49-day pack dump.
 */

import type { LocationObject } from 'expo-location';
import type { PrayerTextData } from '../prayerTextTypes';
import { JewishCalendarService } from '../../../core/calendar/JewishCalendar';
import { OmerCalculator } from '../../../core/omer/OmerCalculator';
import { ZmanimService } from '../../../core/zmanim/ZmanimService';
import { UserPreferencesService } from '../../../storage/UserPreferences';
import { buildMaarivOmerLiturgy } from '../../omer/maarivOmerLiturgy';
import type { MaarivNusachId, MaarivSectionKey } from './packTypes';
import { getMaarivOfflinePack } from './resolvePack';
import { getActiveAmidahDayOnlyInserts } from '../amidahSeasonal';
import { resolveMarkedPrayerText } from '../resolveMarkedText';

export type { MaarivSectionKey };

const CORE_SECTIONS: { key: MaarivSectionKey; title: string; hebrewTitle: string }[] = [
  { key: 'maariv_shema', title: 'The Shema', hebrewTitle: 'קריאת שמע' },
  { key: 'maariv_amidah', title: 'Amidah', hebrewTitle: 'עמידה' },
  { key: 'maariv_motzaei', title: "Motza'ei Shabbat", hebrewTitle: 'מוצאי שבת' },
  { key: 'maariv_omer', title: 'Sefirat HaOmer', hebrewTitle: 'ספירת העומר' },
  { key: 'maariv_aleinu', title: 'Aleinu', hebrewTitle: 'עלינו' },
];

function isLikelyIsraelLocation(loc?: { latitude: number; longitude: number }): boolean {
  if (!loc) return false;
  const { latitude: lat, longitude: lon } = loc;
  return lat >= 29.3 && lat <= 33.5 && lon >= 34.05 && lon <= 35.9;
}

function prefsLocationToObject(
  loc?: { latitude: number; longitude: number } | null
): LocationObject | null {
  if (!loc) return null;
  return {
    coords: {
      latitude: loc.latitude,
      longitude: loc.longitude,
      altitude: null,
      accuracy: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: Date.now(),
  } as LocationObject;
}

export class OfflineMaarivService {
  static getAttribution(nusach: MaarivNusachId = 'ashkenaz'): string {
    return getMaarivOfflinePack(nusach).attribution;
  }

  static getActiveSeasonalInserts(date: Date = new Date()) {
    return getActiveAmidahDayOnlyInserts(date, { amidahSlot: 'maariv' });
  }

  static getSections(
    nusach: MaarivNusachId = 'ashkenaz',
    date: Date = new Date()
  ): { key: string; title: string; hebrewTitle: string }[] {
    const pack = getMaarivOfflinePack(nusach);
    const motzaei = date.getDay() === 6;
    const omer = JewishCalendarService.isOmerPeriod(date) || OmerCalculator.isOmerPeriod(date);
    return CORE_SECTIONS.filter((s) => {
      if (s.key === 'maariv_omer') {
        if (!omer) return false;
        return true;
      }
      if (!pack.sections[s.key]?.hebrew?.trim()) return false;
      if (s.key === 'maariv_motzaei' && !motzaei) return false;
      return true;
    });
  }

  static async getSection(
    sectionKey: string,
    options?: { date?: Date; nusach?: MaarivNusachId }
  ): Promise<PrayerTextData | null> {
    const date = options?.date ?? new Date();
    let nusach: MaarivNusachId = options?.nusach ?? 'ashkenaz';
    let prefsLoc: { latitude: number; longitude: number } | undefined;
    if (options?.nusach == null) {
      try {
        const prefs = await UserPreferencesService.getPreferences();
        if (prefs?.nusach === 'sfard' || prefs?.nusach === 'ashkenaz') nusach = prefs.nusach;
        prefsLoc = prefs?.location;
      } catch {
        /* default */
      }
    } else {
      try {
        const prefs = await UserPreferencesService.getPreferences();
        prefsLoc = prefs?.location;
      } catch {
        /* ignore */
      }
    }

    if (sectionKey === 'maariv_omer') {
      return this.getOmerSection(date, prefsLoc);
    }

    const pack = getMaarivOfflinePack(nusach);
    const raw = pack.sections[sectionKey as MaarivSectionKey];
    if (!raw?.hebrew?.trim()) return null;

    const israel = isLikelyIsraelLocation(prefsLoc);

    const resolved = resolveMarkedPrayerText(raw.hebrew, raw.english ?? '', {
      date,
      isIsrael: israel,
    });
    const { folds: _folds, ...content } = resolved;
    return content;
  }

  /** Tonight’s blessing + count + Harachaman (same wording source as Omer practice). */
  private static async getOmerSection(
    date: Date,
    prefsLoc?: { latitude: number; longitude: number }
  ): Promise<PrayerTextData | null> {
    const locationObj = prefsLocationToObject(prefsLoc ?? null);
    const ext = await ZmanimService.calculateExtendedZmanim(date, locationObj);
    const sunset =
      ext.sunset instanceof Date && !Number.isNaN(ext.sunset.getTime()) ? ext.sunset : null;
    const tzeis =
      ext.tzeis instanceof Date && !Number.isNaN(ext.tzeis.getTime()) ? ext.tzeis : null;
    const omerDay = OmerCalculator.getOmerNightToCount(date, sunset, tzeis);
    if (omerDay == null) return null;
    const liturgy = buildMaarivOmerLiturgy(omerDay);
    if (!liturgy) return null;
    return {
      hebrew: liturgy.hebrew,
      english: liturgy.english,
    };
  }
}
