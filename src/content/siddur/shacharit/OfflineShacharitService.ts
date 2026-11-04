/**
 * Offline weekday Shacharit (client-only).
 * resolvePack(nusach) → section pipeline + calendar gates → Amidah shared pipeline → reader
 */

import { applyWeekdayAmidahTextPipeline } from '../../../services/AmidahTextPipeline';
import {
  AMIDAH_BRACHA_TITLES,
  ensureBaruchAtahParagraphBreaks,
  extractAmidahKedushaFoldout,
  extractBirchosHashacharExpansionFoldout,
  extractModimDerabananFoldout,
  markSefataiParagraphSmall,
  removeParagraphTitles,
  stripAmidahEpilogueKaddishLedavid,
  trimAlHanissimInsertionByCalendar,
} from '../../../services/MinchaTextRules';
import { applyShacharitSiddurSectionPipeline } from '../../../services/ShacharitSectionPipelines';
import {
  applyShacharitSectionCalendarGates,
  splitBirchotHashacharCoreAndExpansion,
  stripSefariaInstructionLines,
} from '../../../services/ShacharitTextRules';
import type { PrayerTextData, PrayerTextSegment } from '../../../services/SefariaService';
import { JewishCalendarService } from '../../../core/calendar/JewishCalendar';
import { UserPreferencesService } from '../../../storage/UserPreferences';
import type { ShacharitNusachId, ShacharitOfflinePack, ShacharitSectionKey } from './packTypes';
import { getShacharitOfflinePack } from './resolvePack';
import {
  getActiveAmidahDayOnlyInserts,
  segmentHebrewWithSeasonalHighlights,
  trimYaalehVeyavoToTodaysPhrase,
} from '../amidahSeasonal';

export type { ShacharitSectionKey };

/**
 * Sfard Sefaria dump put Keriat Shema (+ after-blessings) inside `yotzer_or` and left
 * `shema` empty. Split at Habocher / Shema so both reader sections have content —
 * same liturgy, correct grouping.
 */
function splitYotzerOrAndShemaIfNeeded(
  pack: ShacharitOfflinePack
): { yotzer: { hebrew: string; english: string }; shema: { hebrew: string; english: string } } | null {
  const yot = pack.sections.yotzer_or;
  const shema = pack.sections.shema;
  if (!yot?.hebrew?.trim() || shema?.hebrew?.trim()) return null;

  const stripNik = (s: string) => s.replace(/[\u0591-\u05C7]/g, '');
  const flat = stripNik(yot.hebrew);
  const markers = ['יחיד אומר', 'אל מלך נאמן', 'שמע ישראל'];
  let cutFlat = -1;
  for (const m of markers) {
    const i = flat.indexOf(m);
    if (i !== -1 && (cutFlat === -1 || i < cutFlat)) cutFlat = i;
  }
  if (cutFlat < 0) return null;

  // Prefer cutting after Habocher chatima when it precedes Shema
  const habocher = flat.lastIndexOf('הבוחר בעמו ישראל באהבה', cutFlat);
  if (habocher !== -1) {
    const afterChatima = habocher + 'הבוחר בעמו ישראל באהבה'.length;
    // skip trailing colon / spaces on flat
    let end = afterChatima;
    while (end < cutFlat && /[:\s]/.test(flat[end] || '')) end++;
    cutFlat = end;
  }

  const toOrig: number[] = [];
  for (let i = 0; i < yot.hebrew.length; i++) {
    if (!/[\u0591-\u05C7]/.test(yot.hebrew[i])) toOrig.push(i);
  }
  const cutOrig = toOrig[Math.min(cutFlat, toOrig.length - 1)] ?? cutFlat;

  const yHeb = yot.hebrew.slice(0, cutOrig).replace(/\n{3,}/g, '\n\n').trim();
  const sHeb = yot.hebrew.slice(cutOrig).replace(/\n{3,}/g, '\n\n').trim();
  if (yHeb.length < 80 || sHeb.length < 80) return null;

  let yEng = yot.english ?? '';
  let sEng = '';
  const engCut = yEng.search(/Hear,?\s+Israel|Hear\s+O\s+Israel/i);
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
  { key: 'preparatory', title: 'Preparatory Prayers', hebrewTitle: 'הכנות' },
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

function segs(text: string): PrayerTextSegment[] {
  return [{ text, italic: false }];
}

function withSegments(hebrew: string, english: string, date?: Date): PrayerTextData {
  const h = hebrew.replace(/\n{3,}/g, '\n\n').trim();
  const e = (english || '').replace(/\n{3,}/g, '\n\n').trim();
  const hebrewSegments = markSefataiParagraphSmall(
    date != null
      ? segmentHebrewWithSeasonalHighlights(h, date, { amidahSlot: 'shacharit' })
      : segs(h)
  );
  return {
    hebrew: h,
    english: e,
    hebrewSegments,
    englishSegments: markSefataiParagraphSmall(segs(e)),
  };
}

function markPiece(hebrew: string | undefined, date?: Date): PrayerTextSegment[] | undefined {
  if (!hebrew?.trim()) return undefined;
  if (date != null) {
    return markSefataiParagraphSmall(
      segmentHebrewWithSeasonalHighlights(hebrew, date, { amidahSlot: 'shacharit' })
    );
  }
  return markSefataiParagraphSmall(segs(hebrew));
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
    if (sectionKey === 'amidah') {
      return this.getAmidah(date, pack);
    }

    let raw = pack.sections[sectionKey as ShacharitSectionKey];
    const split = splitYotzerOrAndShemaIfNeeded(pack);
    if (split) {
      if (sectionKey === 'yotzer_or') raw = { key: 'yotzer_or', ...split.yotzer };
      if (sectionKey === 'shema') raw = { key: 'shema', ...split.shema };
    }
    if (!raw?.hebrew?.trim()) return null;

    let hebrew = raw.hebrew;
    let english = raw.english ?? '';
    const strippedNotes = stripSefariaInstructionLines(hebrew, english);
    hebrew = strippedNotes.hebrew;
    english = strippedNotes.english;
    const piped = applyShacharitSiddurSectionPipeline(sectionKey, hebrew, english, { date, nusach });
    hebrew = piped.hebrew;
    english = piped.english;

    const cal = applyShacharitSectionCalendarGates(sectionKey, hebrew, english, date, {
      tachanun: JewishCalendarService.isTachanunSaid(date),
      aseret: JewishCalendarService.isAseretYemeiTeshuva(date),
      roshChodesh: JewishCalendarService.isRoshChodesh(date),
      ledavidSeason: JewishCalendarService.isLedavidAfterTefillahSeason(date),
      fastOrAseret:
        JewishCalendarService.isFastDay(date) || JewishCalendarService.isAseretYemeiTeshuva(date),
      mondayThursday: date.getDay() === 1 || date.getDay() === 4,
    });
    hebrew = cal.hebrew;
    english = cal.english;

    // Sfard continuous blobs: restore paragraph gaps before each ברוך אתה
    const spaced = ensureBaruchAtahParagraphBreaks(hebrew, english);
    hebrew = spaced.hebrew;
    english = spaced.english;

    const content = withSegments(hebrew, english);

    if (sectionKey === 'birchot_hashachar') {
      const paraSplit = splitBirchotHashacharCoreAndExpansion(hebrew, english);
      const bhSplit =
        paraSplit ??
        (() => {
          const loc = extractBirchosHashacharExpansionFoldout(hebrew, english);
          if (!loc?.beforeHebrew?.trim() || !loc.foldoutHebrew?.trim()) return null;
          if (loc.beforeHebrew.trim().length < 80) return null;
          return {
            beforeHebrew: loc.beforeHebrew,
            beforeEnglish: loc.beforeEnglish,
            foldoutHebrew: loc.foldoutHebrew,
            foldoutEnglish: loc.foldoutEnglish,
          };
        })();
      if (bhSplit?.foldoutHebrew?.trim() && bhSplit.beforeHebrew.trim()) {
        const beforeH = bhSplit.beforeHebrew.trim();
        const beforeE = bhSplit.beforeEnglish.trim();
        return {
          ...content,
          hebrew: '',
          english: '',
          hebrewSegments: [],
          hebrewBeforeBirchosHashacharExpansionFoldout: beforeH,
          englishBeforeBirchosHashacharExpansionFoldout: beforeE || undefined,
          hebrewBeforeBirchosHashacharExpansionFoldoutSegments: markSefataiParagraphSmall(segs(beforeH)),
          birchosHashacharExpansionFoldout: {
            hebrew: bhSplit.foldoutHebrew.trim(),
            english: bhSplit.foldoutEnglish?.trim() ?? '',
          },
        };
      }
    }

    return content;
  }

  private static async getAmidah(date: Date, pack: ShacharitOfflinePack): Promise<PrayerTextData> {
    let israelForRain = false;
    try {
      const prefs = await UserPreferencesService.getPreferences();
      israelForRain = isLikelyIsraelLocation(prefs?.location);
    } catch {
      /* diaspora */
    }
    const raw = pack.sections.amidah!;
    const notes = stripSefariaInstructionLines(raw.hebrew, raw.english ?? '');
    const titles = removeParagraphTitles(notes.hebrew, notes.english, AMIDAH_BRACHA_TITLES);
    const piped = applyWeekdayAmidahTextPipeline(titles.hebrew, titles.english, {
      date,
      israelForRainInsertion: israelForRain,
      amidahSlot: 'shacharit',
      policy: pack.policy,
    });

    let hebrew = trimYaalehVeyavoToTodaysPhrase(piped.hebrew, date);
    let english = piped.english;
    const kedushaSplit = extractAmidahKedushaFoldout(hebrew, english);
    const avosBlob = `${kedushaSplit.mainHebrewBeforeFoldout || ''}\n${kedushaSplit.mainHebrew || ''}`;
    const kedushaSplitKeepsAvos = /מגן\s+אברהם/.test(avosBlob.replace(/[\u0591-\u05C7]/g, ''));
    if (kedushaSplitKeepsAvos) {
      hebrew = kedushaSplit.mainHebrew;
      english = kedushaSplit.mainEnglish;
    }
    const epilogued = stripAmidahEpilogueKaddishLedavid(hebrew, english, date);
    hebrew = epilogued.hebrew;
    english = epilogued.english;

    let hebrewBeforeKedushaFoldout = kedushaSplitKeepsAvos
      ? kedushaSplit.mainHebrewBeforeFoldout?.trim() || undefined
      : undefined;
    if (hebrewBeforeKedushaFoldout) {
      hebrewBeforeKedushaFoldout = trimYaalehVeyavoToTodaysPhrase(hebrewBeforeKedushaFoldout, date);
    }

    let hebrewBeforeModimDerabananFoldout: string | undefined;
    let englishBeforeModimDerabananFoldout: string | undefined;
    let modimDerabananFoldout: PrayerTextData | undefined;
    const modimSplit = extractModimDerabananFoldout(hebrew, english);
    if (modimSplit.foldoutHebrew?.trim()) {
      const prefixTrim = trimAlHanissimInsertionByCalendar(
        modimSplit.prefixHebrew,
        modimSplit.prefixEnglish ?? '',
        date
      );
      hebrewBeforeModimDerabananFoldout = trimYaalehVeyavoToTodaysPhrase(prefixTrim.hebrew, date);
      englishBeforeModimDerabananFoldout = prefixTrim.english;
      modimDerabananFoldout = {
        hebrew: modimSplit.foldoutHebrew.trim(),
        english: modimSplit.foldoutEnglish?.trim() ?? '',
      };
      hebrew = modimSplit.suffixHebrew.trim();
      english = modimSplit.suffixEnglish.trim();
    }

    hebrew = trimYaalehVeyavoToTodaysPhrase(hebrew, date);
    const content = withSegments(hebrew, english, date);
    return {
      ...content,
      hebrewBeforeKedushaFoldout,
      englishBeforeKedushaFoldout: kedushaSplitKeepsAvos
        ? kedushaSplit.mainEnglishBeforeFoldout?.trim() || undefined
        : undefined,
      hebrewBeforeKedushaFoldoutSegments: markPiece(hebrewBeforeKedushaFoldout, date),
      kedushaFoldout:
        kedushaSplitKeepsAvos && kedushaSplit.kedushaHebrew?.trim()
          ? {
              hebrew: kedushaSplit.kedushaHebrew.trim(),
              english: kedushaSplit.kedushaEnglish?.trim() ?? '',
            }
          : undefined,
      hebrewBeforeModimDerabananFoldout,
      englishBeforeModimDerabananFoldout,
      hebrewBeforeModimDerabananFoldoutSegments: markPiece(hebrewBeforeModimDerabananFoldout, date),
      modimDerabananFoldout,
    };
  }
}
