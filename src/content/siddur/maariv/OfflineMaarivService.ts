/**
 * Offline weekday Maariv (client-only).
 * resolvePack(nusach) → calendar gates + Amidah shared pipeline → reader
 */

import { applyWeekdayAmidahTextPipeline } from '../../../services/AmidahTextPipeline';
import {
  AMIDAH_BRACHA_TITLES,
  ensureBaruchAtahParagraphBreaks,
  extractAmidahKedushaFoldout,
  extractModimDerabananFoldout,
  markSefataiParagraphSmall,
  removeParagraphTitles,
  splitMinchaAmidahBeforeStandaloneAleinu,
  stripAmidahEpilogueKaddishLedavid,
  stripFullKaddishShalemBeforeAleinu,
  trimAlHanissimInsertionByCalendar,
} from '../../../services/MinchaTextRules';
import {
  applyMaarivSectionCalendarGates,
  removeMaarivHavdalahAtahChonantanuUnlessSaturday,
  stripMaarivInstructionLines,
  stripMaarivKaddishBlock,
  stripMaarivKnownInstructionParagraphs,
} from '../../../services/MaarivTextRules';
import type { PrayerTextData, PrayerTextSegment } from '../../../services/SefariaService';
import { JewishCalendarService } from '../../../core/calendar/JewishCalendar';
import { UserPreferencesService } from '../../../storage/UserPreferences';
import type { MaarivNusachId, MaarivOfflinePack, MaarivSectionKey } from './packTypes';
import { getMaarivOfflinePack } from './resolvePack';
import {
  getActiveAmidahDayOnlyInserts,
  segmentHebrewWithSeasonalHighlights,
  trimYaalehVeyavoToTodaysPhrase,
} from '../amidahSeasonal';

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

function segs(text: string): PrayerTextSegment[] {
  return [{ text, italic: false }];
}

function withSegments(hebrew: string, english: string, date?: Date): PrayerTextData {
  const h = hebrew.replace(/\n{3,}/g, '\n\n').trim();
  const e = (english || '').replace(/\n{3,}/g, '\n\n').trim();
  const hebrewSegments = markSefataiParagraphSmall(
    date != null
      ? segmentHebrewWithSeasonalHighlights(h, date, { amidahSlot: 'maariv' })
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
      segmentHebrewWithSeasonalHighlights(hebrew, date, { amidahSlot: 'maariv' })
    );
  }
  return markSefataiParagraphSmall(segs(hebrew));
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
    const omer = JewishCalendarService.isOmerPeriod(date);
    return CORE_SECTIONS.filter((s) => {
      if (!pack.sections[s.key]?.hebrew?.trim()) return false;
      if (s.key === 'maariv_motzaei' && !motzaei) return false;
      if (s.key === 'maariv_omer' && !omer) return false;
      return true;
    });
  }

  static async getSection(
    sectionKey: string,
    options?: { date?: Date; nusach?: MaarivNusachId }
  ): Promise<PrayerTextData | null> {
    const date = options?.date ?? new Date();
    let nusach: MaarivNusachId = options?.nusach ?? 'ashkenaz';
    if (options?.nusach == null) {
      try {
        const prefs = await UserPreferencesService.getPreferences();
        if (prefs?.nusach === 'sfard' || prefs?.nusach === 'ashkenaz') nusach = prefs.nusach;
      } catch {
        /* default */
      }
    }
    const pack = getMaarivOfflinePack(nusach);
    const raw = pack.sections[sectionKey as MaarivSectionKey];
    if (!raw?.hebrew?.trim()) return null;

    if (sectionKey === 'maariv_amidah') {
      return this.getAmidah(date, pack);
    }

    let hebrew = raw.hebrew;
    let english = raw.english ?? '';
    const strippedNotes = stripMaarivInstructionLines(hebrew, english);
    hebrew = strippedNotes.hebrew;
    english = strippedNotes.english;
    const known = stripMaarivKnownInstructionParagraphs(hebrew, english);
    hebrew = known.hebrew;
    english = known.english;

    if (sectionKey === 'maariv_shema' || sectionKey === 'maariv_aleinu') {
      const noKaddish =
        sectionKey === 'maariv_aleinu'
          ? stripFullKaddishShalemBeforeAleinu(hebrew, english)
          : stripMaarivKaddishBlock(hebrew, english);
      hebrew = noKaddish.hebrew;
      english = noKaddish.english;
      const trailing = stripMaarivKaddishBlock(hebrew, english);
      hebrew = trailing.hebrew;
      english = trailing.english;
    }

    const cal = applyMaarivSectionCalendarGates(sectionKey, hebrew, english, date, {
      ledavidSeason: JewishCalendarService.isLedavidAfterTefillahSeason(date),
    });
    const spaced = ensureBaruchAtahParagraphBreaks(cal.hebrew, cal.english);
    return withSegments(spaced.hebrew, spaced.english);
  }

  private static async getAmidah(date: Date, pack: MaarivOfflinePack): Promise<PrayerTextData> {
    let israelForRain = false;
    try {
      const prefs = await UserPreferencesService.getPreferences();
      israelForRain = isLikelyIsraelLocation(prefs?.location);
    } catch {
      /* diaspora */
    }
    const raw = pack.sections.maariv_amidah!;
    const notes = stripMaarivInstructionLines(raw.hebrew, raw.english ?? '');
    const titles = removeParagraphTitles(notes.hebrew, notes.english, AMIDAH_BRACHA_TITLES);
    const noHavdalah = removeMaarivHavdalahAtahChonantanuUnlessSaturday(
      titles.hebrew,
      titles.english,
      date
    );
    const piped = applyWeekdayAmidahTextPipeline(noHavdalah.hebrew, noHavdalah.english, {
      date,
      israelForRainInsertion: israelForRain,
      amidahSlot: 'maariv',
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
    const noAleinu = splitMinchaAmidahBeforeStandaloneAleinu(hebrew, english);
    hebrew = noAleinu.hebrew;
    english = noAleinu.english;
    const noKaddish = stripMaarivKaddishBlock(hebrew, english);
    hebrew = noKaddish.hebrew;
    english = noKaddish.english;

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
