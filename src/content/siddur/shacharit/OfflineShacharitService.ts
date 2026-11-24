/**
 * Offline weekday Shacharit (client-only).
 * resolvePack(nusach) → layout polish → {{gate}}/{{fold}} markers → reader
 */

import type { PrayerTextData } from '../prayerTextTypes';
import { JewishCalendarService } from '../../../core/calendar/JewishCalendar';
import { UserPreferencesService } from '../../../storage/UserPreferences';
import { applyShacharitSiddurSectionPipeline } from '../../../services/ShacharitSectionPipelines';
import type { ShacharitNusachId, ShacharitOfflinePack, ShacharitSectionKey } from './packTypes';
import { getShacharitOfflinePack } from './resolvePack';
import { getActiveAmidahDayOnlyInserts } from '../amidahSeasonal';
import { resolveMarkedPrayerText } from '../resolveMarkedText';

export type { ShacharitSectionKey };

/**
 * Sfard Sefaria dump put Keriat Shema (+ after-blessings) inside `yotzer_or` and left
 * `shema` empty. Split at Habocher / Shema so both reader sections have content.
 */
function splitYotzerOrAndShemaIfNeeded(
  pack: ShacharitOfflinePack
): { yotzer: { hebrew: string; english: string }; shema: { hebrew: string; english: string } } | null {
  const yot = pack.sections.yotzer_or;
  const shema = pack.sections.shema;
  if (!yot?.hebrew?.trim() || shema?.hebrew?.trim()) return null;

  const stripNik = (s: string) => s.replace(/[\u0591-\u05C7]/g, '');
  const flat = stripNik(yot.hebrew);
  const preferred = ['יחיד אומר', 'אל מלך נאמן'];
  let cutFlat = -1;
  for (const m of preferred) {
    const i = flat.indexOf(m);
    if (i !== -1 && (cutFlat === -1 || i < cutFlat)) cutFlat = i;
  }
  if (cutFlat < 0) {
    const i = flat.indexOf('שמע ישראל');
    if (i !== -1) cutFlat = i;
  }
  if (cutFlat < 0) return null;

  const toOrig: number[] = [];
  for (let i = 0; i < yot.hebrew.length; i++) {
    if (!/[\u0591-\u05C7]/.test(yot.hebrew[i])) toOrig.push(i);
  }
  const cutOrig = toOrig[Math.min(cutFlat, toOrig.length - 1)] ?? cutFlat;

  let yHeb = yot.hebrew.slice(0, cutOrig).replace(/\n{3,}/g, '\n\n').trim();
  const sHeb = yot.hebrew.slice(cutOrig).replace(/\n{3,}/g, '\n\n').trim();
  if (yHeb.length < 80 || sHeb.length < 80) return null;

  const vaomer = yHeb.search(
    /ו[ְ]?א[וֹֹ]?מ[ֵ]?ר[\s\S]{0,12}ש[ׁ]?מ[ַ]?ע[\s\S]{0,8}י[ִ]?ש[ׂ]?ר[ָ]?א[ֵ]?ל/
  );
  if (vaomer > 80) {
    yHeb = yHeb.slice(0, vaomer).replace(/\n{3,}/g, '\n\n').trim();
  }

  let yEng = yot.english ?? '';
  let sEng = '';
  let engCut = yEng.search(/\n\(?Almighty, faithful King\)?/i);
  if (engCut < 80) engCut = yEng.search(/Hear,?\s+Israel|Hear\s+O\s+Israel/i);
  if (engCut > 80) {
    sEng = yEng.slice(engCut).trim();
    yEng = yEng.slice(0, engCut).trim();
  }

  return {
    yotzer: { hebrew: yHeb, english: yEng },
    shema: { hebrew: sHeb, english: sEng },
  };
}

const CORE_SECTIONS: { key: ShacharitSectionKey; title: string; hebrewTitle: string }[] = [
  { key: 'tallit', title: 'Tallit', hebrewTitle: 'טלית' },
  { key: 'tefillin', title: 'Tefillin', hebrewTitle: 'תפילין' },
  { key: 'birchot_hashachar', title: 'Morning Blessings', hebrewTitle: 'ברכות השחר' },
  { key: 'korbanot', title: 'Korbanot', hebrewTitle: 'קרבנות' },
  { key: 'pesukei_dzimra', title: "Pesukei D'Zimra", hebrewTitle: 'פסוקי דזמרה' },
  { key: 'yotzer_or', title: 'Blessings of the Shema', hebrewTitle: 'ברכות קריאת שמע' },
  { key: 'shema', title: 'The Shema', hebrewTitle: 'קריאת שמע' },
  { key: 'amidah', title: 'Amidah', hebrewTitle: 'עמידה' },
  { key: 'tachanun', title: 'Tachanun', hebrewTitle: 'תחנון' },
  { key: 'torah_reading', title: 'Torah Reading', hebrewTitle: 'קריאת התורה' },
  { key: 'ashrei', title: 'Ashrei', hebrewTitle: 'אשרי' },
  { key: 'concluding', title: 'Concluding Prayers', hebrewTitle: 'סיום' },
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

function fromMarked(hebrew: string, english: string, date: Date, isIsrael: boolean): PrayerTextData {
  const { folds: _f, ...content } = resolveMarkedPrayerText(hebrew, english, {
    date,
    isIsrael,
  });
  return content;
}

export class OfflineShacharitService {
  static getAttribution(nusach: ShacharitNusachId = 'ashkenaz'): string {
    return getShacharitOfflinePack(nusach).attribution;
  }

  static getActiveSeasonalInserts(date: Date = new Date()) {
    return getActiveAmidahDayOnlyInserts(date, { amidahSlot: 'shacharit' });
  }

  static getSections(
    nusach: ShacharitNusachId = 'ashkenaz',
    date: Date = new Date()
  ): { key: string; title: string; hebrewTitle: string }[] {
    const pack = getShacharitOfflinePack(nusach);
    const tachanun = JewishCalendarService.isTachanunSaid(date);
    const monThu = date.getDay() === 1 || date.getDay() === 4;
    const shemaSplit = splitYotzerOrAndShemaIfNeeded(pack);
    return CORE_SECTIONS.filter((s) => {
      if (s.key === 'korbanot') return false;
      const hasRaw = Boolean(pack.sections[s.key]?.hebrew?.trim());
      const hasSplitShema = s.key === 'shema' && Boolean(shemaSplit?.shema.hebrew?.trim());
      const hasSplitYotzer = s.key === 'yotzer_or' && Boolean(shemaSplit?.yotzer.hebrew?.trim());
      if (!hasRaw && !hasSplitShema && !hasSplitYotzer) return false;
      if (s.key === 'tachanun' && !tachanun) return false;
      if (s.key === 'torah_reading' && !monThu) return false;
      return true;
    });
  }

  static async getSection(
    sectionKey: string,
    options?: { date?: Date; nusach?: ShacharitNusachId }
  ): Promise<PrayerTextData | null> {
    const date = options?.date ?? new Date();
    let nusach: ShacharitNusachId = options?.nusach ?? 'ashkenaz';
    if (options?.nusach == null) {
      try {
        const prefs = await UserPreferencesService.getPreferences();
        if (prefs?.nusach === 'sfard' || prefs?.nusach === 'ashkenaz') nusach = prefs.nusach;
      } catch {
        /* default */
      }
    }
    const pack = getShacharitOfflinePack(nusach);
    const israel = await resolveIsrael();

    let raw = pack.sections[sectionKey as ShacharitSectionKey];
    const split = splitYotzerOrAndShemaIfNeeded(pack);
    if (split) {
      if (sectionKey === 'yotzer_or') raw = { key: 'yotzer_or', ...split.yotzer };
      if (sectionKey === 'shema') raw = { key: 'shema', ...split.shema };
    }
    if (!raw?.hebrew?.trim()) return null;

    let hebrew = raw.hebrew;
    let english = raw.english ?? '';

    ({ hebrew, english } = applyShacharitSiddurSectionPipeline(sectionKey, hebrew, english, {
      date,
      nusach: nusach === 'sfard' ? 'sfard' : 'ashkenaz',
    }));

    // שיר של יום: per-weekday {{gate:sunday}}…{{gate:friday}} in concluding packs.
    const content = fromMarked(hebrew, english, date, israel);

    if (sectionKey === 'birchot_hashachar') {
      const korbanotRaw = pack.sections.korbanot;
      const korbanotFoldout =
        content.korbanotFoldout ??
        (korbanotRaw?.hebrew?.trim()
          ? fromMarked(korbanotRaw.hebrew, korbanotRaw.english ?? '', date, israel)
          : undefined);
      return {
        ...content,
        ...(korbanotFoldout?.hebrew?.trim() ? { korbanotFoldout } : {}),
      };
    }

    return content;
  }
}
