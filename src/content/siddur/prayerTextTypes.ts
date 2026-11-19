/**
 * Shared prayer text shapes for offline siddur packs + reader.
 * (Formerly lived on SefariaService — packs are local now.)
 */

export type PrayerTextSegment = {
  text: string;
  italic: boolean;
  /** Day-only insert — soft highlight box in the reader. */
  seasonalHighlight?: boolean;
  /** Short label above a seasonal highlight when present. */
  seasonalLabel?: string;
};

export type PrayerTextData = {
  hebrew: string;
  english: string;
  transliteration?: string;
  hebrewSegments?: PrayerTextSegment[];
  englishSegments?: PrayerTextSegment[];
  hebrewBeforeKedushaFoldout?: string;
  englishBeforeKedushaFoldout?: string;
  hebrewBeforeKedushaFoldoutSegments?: PrayerTextSegment[];
  englishBeforeKedushaFoldoutSegments?: PrayerTextSegment[];
  kedushaFoldout?: PrayerTextData;
  hebrewBeforeModimDerabananFoldout?: string;
  englishBeforeModimDerabananFoldout?: string;
  hebrewBeforeModimDerabananFoldoutSegments?: PrayerTextSegment[];
  englishBeforeModimDerabananFoldoutSegments?: PrayerTextSegment[];
  modimDerabananFoldout?: PrayerTextData;
  birchosHashacharExpansionFoldout?: PrayerTextData;
  hebrewBeforeBirchosHashacharExpansionFoldout?: string;
  englishBeforeBirchosHashacharExpansionFoldout?: string;
  hebrewBeforeBirchosHashacharExpansionFoldoutSegments?: PrayerTextSegment[];
  englishBeforeBirchosHashacharExpansionFoldoutSegments?: PrayerTextSegment[];
  korbanotFoldout?: PrayerTextData;
};
