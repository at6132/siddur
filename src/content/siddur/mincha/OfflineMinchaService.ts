/**
 * Offline Mincha (client-only).
 *
 * Flow: resolvePack(nusach) → pipeline(date, location, policy) → foldouts → reader
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
import type { PrayerTextData, PrayerTextSegment } from '../../../services/SefariaService';
import { UserPreferencesService } from '../../../storage/UserPreferences';
import type { MinchaNusachId, MinchaOfflinePack } from './packTypes';
import { getMinchaOfflinePack } from './resolvePack';
import {
  getActiveAmidahDayOnlyInserts,
  segmentHebrewWithSeasonalHighlights,
  trimYaalehVeyavoToTodaysPhrase,
} from '../amidahSeasonal';

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

function segs(text: string): PrayerTextSegment[] {
  return [{ text, italic: false }];
}

function withSegments(hebrew: string, english: string, date?: Date): PrayerTextData {
  const h = hebrew.replace(/\n{3,}/g, '\n\n').trim();
  const e = (english || '').replace(/\n{3,}/g, '\n\n').trim();
  const hebrewSegments = markSefataiParagraphSmall(
    date != null
      ? segmentHebrewWithSeasonalHighlights(h, date, { amidahSlot: 'mincha' })
      : segs(h)
  );
  return {
    hebrew: h,
    english: e,
    hebrewSegments,
    englishSegments: markSefataiParagraphSmall(segs(e)),
  };
}

function markPiece(hebrew: string | undefined, date: Date): PrayerTextSegment[] | undefined {
  if (!hebrew?.trim()) return undefined;
  return markSefataiParagraphSmall(
    segmentHebrewWithSeasonalHighlights(hebrew, date, { amidahSlot: 'mincha' })
  );
}

function stripChatziKaddish(hebrew: string, english: string): { hebrew: string; english: string } {
  const stripNikkud = (s: string) => s.replace(/[\u0591-\u05C7]/g, '');
  let he = hebrew;
  let en = english;
  const stripped = stripNikkud(he);
  const startMarkers = [
    'ואומר החזן חצי קדיש',
    'החזן אומר חצי קדיש',
    'השליח ציבור אומר חצי קדיש',
    'חצי קדיש',
    'יתגדל',
  ];
  let startStripped = -1;
  for (const m of startMarkers) {
    const i = stripped.indexOf(m);
    if (i !== -1 && (startStripped === -1 || i < startStripped)) startStripped = i;
  }
  if (startStripped === -1) return { hebrew: he, english: en };

  const prevNewline = stripped.lastIndexOf('\n', startStripped);
  if (prevNewline !== -1) {
    const linePrefix = stripped.slice(prevNewline + 1, startStripped).trim();
    if (linePrefix.length === 0) startStripped = prevNewline + 1;
  }

  const endMarkers = ['ואמרו אמן', 'ואמרו: אמן', 'אמן:'];
  let lastAmenStripped = -1;
  let usedEndMarkerLen = 0;
  for (const endMarker of endMarkers) {
    let pos = stripped.indexOf(endMarker, startStripped);
    while (pos !== -1) {
      if (pos > lastAmenStripped) {
        lastAmenStripped = pos;
        usedEndMarkerLen = endMarker.length;
      }
      pos = stripped.indexOf(endMarker, pos + 1);
    }
  }
  if (lastAmenStripped === -1) return { hebrew: he, english: en };
  let endStripped = lastAmenStripped + usedEndMarkerLen;
  while (endStripped < stripped.length && /[:\s.]/.test(stripped[endStripped])) endStripped++;
  const nextPara = stripped.indexOf('\n\n', endStripped);
  const endOfBlockStripped = nextPara === -1 ? stripped.length : nextPara + 2;

  const strippedToOriginal: number[] = [];
  for (let i = 0; i < he.length; i++) {
    if (!/[\u0591-\u05C7]/.test(he[i])) strippedToOriginal.push(i);
  }
  const startOriginal = strippedToOriginal[startStripped] ?? startStripped;
  const endOriginal =
    endOfBlockStripped > 0 && endOfBlockStripped <= strippedToOriginal.length
      ? strippedToOriginal[endOfBlockStripped - 1] + 1
      : he.length;

  he = (he.slice(0, startOriginal).trimEnd() + '\n\n' + he.slice(endOriginal).trimStart())
    .replace(/\n\n\n+/g, '\n\n')
    .trim();

  if (en) {
    const engKaddish =
      /\b(?:The\s+leader|The\s+chazan|Chazan|leader)\s+(?:says?|recites?)\s+(?:Half\s+)?Kaddish\s*:?/i;
    const altKaddish = /\bHalf\s+Kaddish\s*:?/i;
    const m = en.match(engKaddish) || en.match(altKaddish);
    if (m && m.index !== undefined) {
      let lastAmenEn = -1;
      let idx = en.indexOf('Amen', m.index);
      while (idx !== -1) {
        lastAmenEn = idx + 4;
        while (lastAmenEn < en.length && /[.!:\s]/.test(en[lastAmenEn])) lastAmenEn++;
        idx = en.indexOf('Amen', lastAmenEn);
      }
      if (lastAmenEn !== -1) {
        const nextEn = en.indexOf('\n\n', lastAmenEn);
        const endEnBlock = nextEn === -1 ? en.length : nextEn + 2;
        en = (en.slice(0, m.index).trimEnd() + '\n\n' + en.slice(endEnBlock).trimStart())
          .replace(/\n\n\n+/g, '\n\n')
          .trim();
      }
    }
  }

  return { hebrew: he, english: en };
}

export class OfflineMinchaService {
  static getAttribution(nusach: MinchaNusachId = 'ashkenaz'): string {
    return getMinchaOfflinePack(nusach).attribution;
  }

  /**
   * Offline Mincha sections for the reader. Sfard prepends קרבנות (collapsed before Ashrei).
   */
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

    if (sectionKey === 'mincha_ashrei') {
      const cleaned = stripChatziKaddish(pack.sections.ashrei.hebrew, pack.sections.ashrei.english);
      const spaced = ensureBaruchAtahParagraphBreaks(cleaned.hebrew, cleaned.english);
      return withSegments(spaced.hebrew, spaced.english);
    }

    if (sectionKey === 'mincha_aleinu') {
      const stripped = stripFullKaddishShalemBeforeAleinu(
        pack.sections.aleinu.hebrew,
        pack.sections.aleinu.english
      );
      const spaced = ensureBaruchAtahParagraphBreaks(stripped.hebrew, stripped.english);
      return withSegments(spaced.hebrew, spaced.english);
    }

    if (sectionKey === 'mincha_amidah') {
      return this.getAmidah(date, pack);
    }

    if (sectionKey === 'mincha_korbanot') {
      const raw = pack.sections.korbanot;
      if (!raw?.hebrew?.trim()) return withSegments('', '');
      const spaced = ensureBaruchAtahParagraphBreaks(raw.hebrew, raw.english ?? '');
      return withSegments(spaced.hebrew, spaced.english);
    }

    return null;
  }

  private static async getAmidah(date: Date, pack: MinchaOfflinePack): Promise<PrayerTextData> {
    let israelForRain = false;
    try {
      const prefs = await UserPreferencesService.getPreferences();
      israelForRain = isLikelyIsraelLocation(prefs?.location);
    } catch {
      /* diaspora */
    }

    const titles = removeParagraphTitles(
      pack.sections.amidah.hebrew,
      pack.sections.amidah.english,
      AMIDAH_BRACHA_TITLES
    );

    const piped = applyWeekdayAmidahTextPipeline(titles.hebrew, titles.english, {
      date,
      israelForRainInsertion: israelForRain,
      amidahSlot: 'mincha',
      policy: pack.policy,
    });

    let hebrew = trimYaalehVeyavoToTodaysPhrase(piped.hebrew, date);
    let english = piped.english;

    const kedushaSplit = extractAmidahKedushaFoldout(hebrew, english);
    hebrew = kedushaSplit.mainHebrew;
    english = kedushaSplit.mainEnglish;

    let hebrewBeforeKedushaFoldout = kedushaSplit.mainHebrewBeforeFoldout?.trim() || undefined;
    if (hebrewBeforeKedushaFoldout) {
      hebrewBeforeKedushaFoldout = trimYaalehVeyavoToTodaysPhrase(hebrewBeforeKedushaFoldout, date);
    }
    const englishBeforeKedushaFoldout = kedushaSplit.mainEnglishBeforeFoldout?.trim() || undefined;
    const kedushaFoldout = kedushaSplit.kedushaHebrew?.trim()
      ? {
          hebrew: kedushaSplit.kedushaHebrew.trim(),
          english: kedushaSplit.kedushaEnglish?.trim() ?? '',
        }
      : undefined;

    const epilogued = stripAmidahEpilogueKaddishLedavid(hebrew, english, date);
    hebrew = epilogued.hebrew;
    english = epilogued.english;

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
      hebrewBeforeModimDerabananFoldout = prefixTrim.hebrew;
      englishBeforeModimDerabananFoldout = prefixTrim.english;
      modimDerabananFoldout = {
        hebrew: modimSplit.foldoutHebrew.trim(),
        english: modimSplit.foldoutEnglish?.trim() ?? '',
      };
      hebrew = modimSplit.suffixHebrew.trim();
      english = modimSplit.suffixEnglish.trim();
    }

    hebrew = trimYaalehVeyavoToTodaysPhrase(hebrew, date);
    const noAleinu = splitMinchaAmidahBeforeStandaloneAleinu(hebrew, english);
    const cleaned = stripChatziKaddish(noAleinu.hebrew, noAleinu.english);
    const content = withSegments(cleaned.hebrew, cleaned.english, date);

    return {
      ...content,
      hebrewBeforeKedushaFoldout,
      englishBeforeKedushaFoldout,
      hebrewBeforeKedushaFoldoutSegments: markPiece(hebrewBeforeKedushaFoldout, date),
      englishBeforeKedushaFoldoutSegments: englishBeforeKedushaFoldout
        ? markSefataiParagraphSmall(segs(englishBeforeKedushaFoldout))
        : undefined,
      kedushaFoldout,
      hebrewBeforeModimDerabananFoldout,
      englishBeforeModimDerabananFoldout,
      hebrewBeforeModimDerabananFoldoutSegments: markPiece(hebrewBeforeModimDerabananFoldout, date),
      englishBeforeModimDerabananFoldoutSegments: englishBeforeModimDerabananFoldout
        ? markSefataiParagraphSmall(segs(englishBeforeModimDerabananFoldout))
        : undefined,
      modimDerabananFoldout,
    };
  }
}
