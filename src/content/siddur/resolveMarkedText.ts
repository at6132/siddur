/**
 * Resolve local pack text: {{gate}} / {{fold}} only — no Sefaria phrase parsers.
 */

import { markSefataiParagraphSmall } from '../../services/MinchaTextRules';
import type { PrayerTextData, PrayerTextSegment } from './prayerTextTypes';
import {
  applyPackMarkers,
  buildPackGateCtx,
  mergeMarkerHighlights,
  spansFromOpenedGates,
  type AppliedPackMarkers,
} from './packMarkers';

function segs(text: string): PrayerTextSegment[] {
  return [{ text, italic: false }];
}

export type ResolveMarkedOpts = {
  date?: Date;
  isIsrael?: boolean;
  /** When true, run markSefataiParagraphSmall on hebrew segments. */
  markSefatai?: boolean;
};

export type ResolvedMarkedText = PrayerTextData & {
  folds: AppliedPackMarkers['folds'];
};

/**
 * Apply pack markers and map known folds onto reader PrayerTextData fields.
 */
export function resolveMarkedPrayerText(
  hebrew: string,
  english: string,
  opts: ResolveMarkedOpts = {}
): ResolvedMarkedText {
  const date = opts.date ?? new Date();
  const isIsrael = opts.isIsrael ?? false;
  const marked = applyPackMarkers(hebrew, english || '', buildPackGateCtx(date, isIsrael));
  const folds = marked.folds;

  let mainHe = marked.hebrew;
  let mainEn = marked.english;

  let hebrewBeforeKedushaFoldout: string | undefined;
  let englishBeforeKedushaFoldout: string | undefined;
  let kedushaFoldout: PrayerTextData | undefined;

  let hebrewBeforeModimDerabananFoldout: string | undefined;
  let englishBeforeModimDerabananFoldout: string | undefined;
  let modimDerabananFoldout: PrayerTextData | undefined;

  let hebrewBeforeBirchosHashacharExpansionFoldout: string | undefined;
  let englishBeforeBirchosHashacharExpansionFoldout: string | undefined;
  let birchosHashacharExpansionFoldout: PrayerTextData | undefined;

  let korbanotFoldout: PrayerTextData | undefined;

  const ked = folds.kedusha;
  const mod = folds.modim_derabanan;
  const bh = folds.birchot_expansion ?? folds.birchos_hashachar_expansion;
  const kor = folds.korbanot;

  if (ked?.hebrew?.trim()) {
    hebrewBeforeKedushaFoldout = ked.prefixHebrew?.trim() || undefined;
    englishBeforeKedushaFoldout = ked.prefixEnglish?.trim() || undefined;
    kedushaFoldout = { hebrew: ked.hebrew.trim(), english: ked.english?.trim() ?? '' };
  }
  if (mod?.hebrew?.trim()) {
    hebrewBeforeModimDerabananFoldout = mod.prefixHebrew?.trim() || undefined;
    englishBeforeModimDerabananFoldout = mod.prefixEnglish?.trim() || undefined;
    modimDerabananFoldout = {
      hebrew: mod.hebrew.trim(),
      english: mod.english?.trim() ?? '',
    };
  }
  if (bh?.hebrew?.trim()) {
    hebrewBeforeBirchosHashacharExpansionFoldout = bh.prefixHebrew?.trim() || undefined;
    englishBeforeBirchosHashacharExpansionFoldout = bh.prefixEnglish?.trim() || undefined;
    birchosHashacharExpansionFoldout = {
      hebrew: bh.hebrew.trim(),
      english: bh.english?.trim() ?? '',
    };
  }
  if (kor?.hebrew?.trim()) {
    korbanotFoldout = { hebrew: kor.hebrew.trim(), english: kor.english?.trim() ?? '' };
  }

  // Main body = last peeled suffix (modim > kedusha > birchot), else full gated text.
  if (mod?.hebrew?.trim()) {
    mainHe = (mod.suffixHebrew ?? mainHe).trim();
    mainEn = (mod.suffixEnglish ?? mainEn).trim();
  } else if (ked?.hebrew?.trim()) {
    mainHe = (ked.suffixHebrew ?? mainHe).trim();
    mainEn = (ked.suffixEnglish ?? mainEn).trim();
  } else if (bh?.hebrew?.trim() && bh.suffixHebrew != null) {
    mainHe = bh.suffixHebrew.trim();
    mainEn = (bh.suffixEnglish ?? mainEn).trim();
  }

  mainHe = mainHe.replace(/\n{3,}/g, '\n\n').trim();
  mainEn = mainEn.replace(/\n{3,}/g, '\n\n').trim();

  const mainSpans = spansFromOpenedGates(mainHe, marked.openedGateSnippets);
  let hebrewSegments = mergeMarkerHighlights(mainHe, undefined, mainSpans);
  if (opts.markSefatai !== false) {
    hebrewSegments = markSefataiParagraphSmall(hebrewSegments);
  }
  const englishSegments = markSefataiParagraphSmall(segs(mainEn));

  const markPiece = (he?: string): PrayerTextSegment[] | undefined => {
    if (!he?.trim()) return undefined;
    return opts.markSefatai !== false ? markSefataiParagraphSmall(segs(he)) : segs(he);
  };

  return {
    hebrew: mainHe,
    english: mainEn,
    hebrewSegments,
    englishSegments,
    hebrewBeforeKedushaFoldout,
    englishBeforeKedushaFoldout,
    hebrewBeforeKedushaFoldoutSegments: markPiece(hebrewBeforeKedushaFoldout),
    kedushaFoldout,
    hebrewBeforeModimDerabananFoldout,
    englishBeforeModimDerabananFoldout,
    hebrewBeforeModimDerabananFoldoutSegments: markPiece(hebrewBeforeModimDerabananFoldout),
    modimDerabananFoldout,
    hebrewBeforeBirchosHashacharExpansionFoldout,
    englishBeforeBirchosHashacharExpansionFoldout,
    hebrewBeforeBirchosHashacharExpansionFoldoutSegments: markPiece(
      hebrewBeforeBirchosHashacharExpansionFoldout
    ),
    birchosHashacharExpansionFoldout,
    korbanotFoldout,
    folds,
  };
}
