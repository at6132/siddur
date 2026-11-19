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
import { splitBirchotHashacharCoreAndExpansion } from '../../../services/ShacharitTextRules';
import type { PrayerTextData, PrayerTextSegment } from '../prayerTextTypes';
import { JewishCalendarService } from '../../../core/calendar/JewishCalendar';
import { UserPreferencesService } from '../../../storage/UserPreferences';
import type { ShacharitNusachId, ShacharitOfflinePack, ShacharitSectionKey } from './packTypes';
import { getShacharitOfflinePack } from './resolvePack';
import {
  applyShacharitContentSets,
  buildShacharitGateCtx,
} from './shacharitContentSets';
import {
  getActiveAmidahDayOnlyInserts,
  trimYaalehVeyavoToTodaysPhrase,
} from '../amidahSeasonal';
import { prepareLibrarySeasonalText } from '../librarySeasonal';

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
  // Prefer real Shema start — earliest "שמע ישראל" can be an instructional "ואומר שמע ישראל"
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

  // Drop trailing "ואומר שמע ישראל…" instruction after Habocher chatima
  const vaomer = yHeb.search(/ו[ְ]?א[וֹֹ]?מ[ֵ]?ר[\s\S]{0,12}ש[ׁ]?מ[ַ]?ע[\s\S]{0,8}י[ִ]?ש[ׂ]?ר[ָ]?א[ֵ]?ל/);
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

function segs(text: string): PrayerTextSegment[] {
  return [{ text, italic: false }];
}

function withSegments(
  hebrew: string,
  english: string,
  date?: Date,
  isIsrael?: boolean
): PrayerTextData & { folds?: Record<string, { hebrew: string; english: string }> } {
  if (date == null) {
    const h = hebrew.replace(/\n{3,}/g, '\n\n').trim();
    const e = (english || '').replace(/\n{3,}/g, '\n\n').trim();
    return {
      hebrew: h,
      english: e,
      hebrewSegments: markSefataiParagraphSmall(segs(h)),
      englishSegments: markSefataiParagraphSmall(segs(e)),
      folds: {},
    };
  }
  const prepared = prepareLibrarySeasonalText(hebrew, english, date, {
    amidahSlot: 'shacharit',
    isIsrael,
  });
  return {
    hebrew: prepared.hebrew,
    english: prepared.english,
    hebrewSegments: markSefataiParagraphSmall(prepared.hebrewSegments),
    englishSegments: markSefataiParagraphSmall(segs(prepared.english)),
    folds: prepared.folds,
  };
}

function markPiece(
  hebrew: string | undefined,
  date?: Date,
  isIsrael?: boolean
): PrayerTextSegment[] | undefined {
  if (!hebrew?.trim()) return undefined;
  if (date == null) return markSefataiParagraphSmall(segs(hebrew));
  const prepared = prepareLibrarySeasonalText(hebrew, '', date, {
    amidahSlot: 'shacharit',
    isIsrael,
  });
  return markSefataiParagraphSmall(prepared.hebrewSegments);
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
      // Korbanot lives as a foldout on ברכות השחר (not a main scroll section).
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
    const piped = applyShacharitSiddurSectionPipeline(sectionKey, hebrew, english, { date, nusach });
    hebrew = piped.hebrew;
    english = piped.english;

    const gateCtx = buildShacharitGateCtx(date);
    const gated = applyShacharitContentSets(sectionKey, hebrew, english, gateCtx);
    hebrew = gated.hebrew;
    english = gated.english;

    // Sfard continuous blobs: restore paragraph gaps before each ברוך אתה
    const spaced = ensureBaruchAtahParagraphBreaks(hebrew, english);
    hebrew = spaced.hebrew;
    english = spaced.english;

    const content = withSegments(hebrew, english, date);

    if (sectionKey === 'birchot_hashachar') {
      const korbanotFoldout = this.buildKorbanotFoldout(pack, date, nusach);

      const markerFold = content.folds?.birchot_expansion;
      if (markerFold?.hebrew?.trim() && content.hebrew.trim()) {
        const beforeH = content.hebrew.trim();
        const beforeE = content.english.trim();
        const { folds: _folds, ...rest } = content;
        return {
          ...rest,
          hebrew: '',
          english: '',
          hebrewSegments: [],
          hebrewBeforeBirchosHashacharExpansionFoldout: beforeH,
          englishBeforeBirchosHashacharExpansionFoldout: beforeE || undefined,
          hebrewBeforeBirchosHashacharExpansionFoldoutSegments: markSefataiParagraphSmall(segs(beforeH)),
          birchosHashacharExpansionFoldout: {
            hebrew: markerFold.hebrew.trim(),
            english: markerFold.english?.trim() ?? '',
          },
          ...(korbanotFoldout ? { korbanotFoldout } : {}),
        };
      }

      // Prefer mid-string locator (אלהינו…זכרנו); paragraph split when \n\n-separated
      const loc = extractBirchosHashacharExpansionFoldout(hebrew, english);
      const paraSplit = splitBirchotHashacharCoreAndExpansion(hebrew, english);
      const bhSplit =
        loc?.beforeHebrew?.trim() &&
        loc.foldoutHebrew?.trim() &&
        loc.beforeHebrew.trim().length >= 80
          ? {
              beforeHebrew: loc.beforeHebrew,
              beforeEnglish: loc.beforeEnglish,
              foldoutHebrew: loc.foldoutHebrew,
              foldoutEnglish: loc.foldoutEnglish,
            }
          : paraSplit;
      if (bhSplit?.foldoutHebrew?.trim() && bhSplit.beforeHebrew.trim()) {
        const beforeH = bhSplit.beforeHebrew.trim();
        const beforeE = bhSplit.beforeEnglish.trim();
        const { folds: _fBh, ...restBh } = content;
        return {
          ...restBh,
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
          ...(korbanotFoldout ? { korbanotFoldout } : {}),
        };
      }

      const { folds: _f2, ...rest2 } = content;
      return {
        ...rest2,
        ...(korbanotFoldout ? { korbanotFoldout } : {}),
      };
    }

    const { folds: _f3, ...rest3 } = content;
    return rest3;
  }

  /** Korbanot foldout on ברכות השחר (see SHACHARIT_CONTENT_SETS foldout_korbanot). */
  private static buildKorbanotFoldout(
    pack: ShacharitOfflinePack,
    date: Date,
    nusach: ShacharitNusachId
  ): PrayerTextData | undefined {
    const raw = pack.sections.korbanot;
    if (!raw?.hebrew?.trim()) return undefined;
    let hebrew = raw.hebrew;
    let english = raw.english ?? '';
    const piped = applyShacharitSiddurSectionPipeline('korbanot', hebrew, english, { date, nusach });
    hebrew = piped.hebrew;
    english = piped.english;
    const gated = applyShacharitContentSets('korbanot', hebrew, english, buildShacharitGateCtx(date));
    const spaced = ensureBaruchAtahParagraphBreaks(gated.hebrew, gated.english);
    const out = withSegments(spaced.hebrew, spaced.english, date);
    const { folds: _f, ...rest } = out;
    return rest.hebrew.trim() ? rest : undefined;
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
    const titles = removeParagraphTitles(raw.hebrew, raw.english ?? '', AMIDAH_BRACHA_TITLES);
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
    const content = withSegments(hebrew, english, date, israelForRain);
    return {
      ...content,
      hebrewBeforeKedushaFoldout,
      englishBeforeKedushaFoldout: kedushaSplitKeepsAvos
        ? kedushaSplit.mainEnglishBeforeFoldout?.trim() || undefined
        : undefined,
      hebrewBeforeKedushaFoldoutSegments: markPiece(
        hebrewBeforeKedushaFoldout,
        date,
        israelForRain
      ),
      kedushaFoldout:
        kedushaSplitKeepsAvos && kedushaSplit.kedushaHebrew?.trim()
          ? {
              hebrew: kedushaSplit.kedushaHebrew.trim(),
              english: kedushaSplit.kedushaEnglish?.trim() ?? '',
            }
          : undefined,
      hebrewBeforeModimDerabananFoldout,
      englishBeforeModimDerabananFoldout,
      hebrewBeforeModimDerabananFoldoutSegments: markPiece(
        hebrewBeforeModimDerabananFoldout,
        date,
        israelForRain
      ),
      modimDerabananFoldout,
    };
  }
}
