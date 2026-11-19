/**
 * Library-wide seasonal liturgy helpers (not Amidah-only).
 *
 * Pattern:
 * 1. Apply local pack markers `{{gate:…}}` / `{{fold:…}}` (preferred)
 * 2. Strip leftover printed rubrics (safety for uncleaned dumps)
 * 3. Amidah calendar highlights via amidahSeasonal (dual-text swaps stay in body)
 *
 * Day-only highlights outside Amidah come from pack gate markers — not phrase hunting.
 */

import type { PrayerTextSegment } from './prayerTextTypes';
import {
  segmentHebrewWithSeasonalHighlights,
  type AmidahSlot,
} from './amidahSeasonal';
import {
  applyPackMarkers,
  buildPackGateCtx,
  mergeMarkerHighlights,
} from './packMarkers';

const NIK = '[\\u0591-\\u05C7]*';
const SP = '[\\s\\u05BE\\u200e\\u200f]*';

/**
 * Always delete seasonal / day-label rubrics that are not said aloud.
 * Safe across Shacharit / Mincha / Maariv / standalone (does not remove prayer body).
 */
export function stripLibrarySeasonalRubrics(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  let h = hebrew;
  let e = english || '';

  const hebRubrics: RegExp[] = [
    new RegExp(
      `(?:^|[\\n\\r]+)${SP}ב${NIK}ע${NIK}ש${NIK}ר${NIK}ת${SP}י${NIK}מ${NIK}י${SP}ת${NIK}ש${NIK}ו${NIK}ב${NIK}ה${SP}:?${SP}(?=\\n|א|$)`,
      'gmu'
    ),
    new RegExp(
      `(?:^|[\\n\\r]+)${SP}ב${NIK}ע${NIK}ש${NIK}י${NIK}["״\\u05F4]?${NIK}ת${NIK}${SP}:?${SP}(?=\\n|[א-ת]|$)`,
      'gmu'
    ),
    new RegExp(`(?:^|[\\n\\r]+)${SP}מ${NIK}ו${NIK}ס${NIK}י${NIK}פ${NIK}י${NIK}[נן]${NIK}${SP}:?${SP}`, 'gmu'),
    new RegExp(
      `ב${NIK}ר${NIK}א${NIK}ש${SP}ח${NIK}ו${NIK}ד${NIK}ש${SP}ו${NIK}ב${NIK}ח${NIK}ו${NIK}ל${SP}ה${NIK}מ${NIK}ו${NIK}ע${NIK}ד${SP}א${NIK}ו${NIK}מ${NIK}ר${NIK}י${NIK}ם${SP}כ${NIK}א${NIK}ן[\\s\\S]{0,40}?י${NIK}ע${NIK}ל${NIK}ה${SP}ו${NIK}י${NIK}ב${NIK}[או]${NIK}["״']?${SP}`,
      'gu'
    ),
    new RegExp(`ב${NIK}ש${NIK}ב${NIK}ת${SP}מ${NIK}ו${NIK}ס${NIK}י${NIK}פ${NIK}י${NIK}ם${NIK}${SP}:?${SP}`, 'gu'),
    new RegExp(
      `מ${NIK}נ${NIK}ה${NIK}ג${SP}ט${NIK}ו${NIK}ב${SP}ל${NIK}ו${NIK}מ${NIK}ר[\\s\\S]{0,80}?מ${NIK}ז${NIK}מ${NIK}ו${NIK}ר${SP}ל${NIK}ד${NIK}ו${NIK}ד[\\s\\S]{0,120}?(?=\\n\\n|ל${NIK}ד${NIK}ו${NIK}ד|$)`,
      'gu'
    ),
  ];

  for (const re of hebRubrics) {
    h = h.replace(re, '\n\n');
  }

  e = e
    .replace(/During the Ten Days of Penitence\s*:?\s*/gi, '')
    .replace(/In the Ten Days of Repentance[,:]?\s*(?:we\s+add[:]?)\s*/gi, '')
    .replace(/Ten Days of Penitence\s*:?\s*/gi, '')
    .replace(/On Rosh Chodesh (?:and Chol HaMoed )?one says[^\n.]{0,80}\.?/gi, '')
    .replace(/On Shabbat (?:we |one )?add(?:s)?:?\s*/gi, '')
    .replace(/It is a good custom to recite[^\n]{0,120}LeDavid[^\n]{0,80}\.?/gi, '')
    .replace(/\bWe add:?\s*/gi, '');

  return {
    hebrew: h.replace(/\n{3,}/g, '\n\n').trim(),
    english: e.replace(/\n{3,}/g, '\n\n').trim(),
  };
}

/**
 * Amidah seasonal highlights only (library day-only inserts use `{{gate:…}}` markers).
 */
export function segmentLibrarySeasonalHighlights(
  hebrew: string,
  date: Date = new Date(),
  opts?: { amidahSlot?: AmidahSlot; isIsrael?: boolean }
): PrayerTextSegment[] {
  return segmentHebrewWithSeasonalHighlights(hebrew, date, opts);
}

/** Strip rubrics, apply pack markers, segment with Amidah + marker highlights. */
export function prepareLibrarySeasonalText(
  hebrew: string,
  english: string,
  date: Date = new Date(),
  opts?: { amidahSlot?: AmidahSlot; isIsrael?: boolean }
): {
  hebrew: string;
  english: string;
  hebrewSegments: PrayerTextSegment[];
  folds: Record<string, { hebrew: string; english: string }>;
} {
  const marked = applyPackMarkers(hebrew, english, buildPackGateCtx(date));
  const stripped = stripLibrarySeasonalRubrics(marked.hebrew, marked.english);
  const h = stripped.hebrew.replace(/\n{3,}/g, '\n\n').trim();
  const e = stripped.english.replace(/\n{3,}/g, '\n\n').trim();
  const base = segmentHebrewWithSeasonalHighlights(h, date, opts);
  return {
    hebrew: h,
    english: e,
    hebrewSegments: mergeMarkerHighlights(h, base, marked.highlightSpans),
    folds: marked.folds,
  };
}
