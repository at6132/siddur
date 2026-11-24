/**
 * Library-wide seasonal liturgy — pack markers only.
 *
 * Day-only inserts / swaps / foldouts live in raw packs as {{gate}} / {{fold}}.
 * No Sefaria phrase hunting.
 */

import type { PrayerTextSegment } from './prayerTextTypes';
import type { AmidahSlot } from './amidahSeasonal';
import {
  applyPackMarkers,
  buildPackGateCtx,
  mergeMarkerHighlights,
  spansFromOpenedGates,
} from './packMarkers';

/** @deprecated Rubric stripping removed — clean packs at edit time. */
export function stripLibrarySeasonalRubrics(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  return { hebrew, english };
}

export function segmentLibrarySeasonalHighlights(
  hebrew: string,
  date: Date = new Date(),
  opts?: { amidahSlot?: AmidahSlot; isIsrael?: boolean }
): PrayerTextSegment[] {
  const marked = applyPackMarkers(
    hebrew,
    '',
    buildPackGateCtx(date, opts?.isIsrael ?? false)
  );
  return mergeMarkerHighlights(
    marked.hebrew,
    undefined,
    spansFromOpenedGates(marked.hebrew, marked.openedGateSnippets)
  );
}

/** Apply pack markers and segment with gate highlights. */
export function prepareLibrarySeasonalText(
  hebrew: string,
  english: string,
  date: Date = new Date(),
  opts?: { amidahSlot?: AmidahSlot; isIsrael?: boolean }
): {
  hebrew: string;
  english: string;
  hebrewSegments: PrayerTextSegment[];
  folds: ReturnType<typeof applyPackMarkers>['folds'];
} {
  const marked = applyPackMarkers(
    hebrew,
    english,
    buildPackGateCtx(date, opts?.isIsrael ?? false)
  );
  return {
    hebrew: marked.hebrew,
    english: marked.english,
    hebrewSegments: mergeMarkerHighlights(
      marked.hebrew,
      undefined,
      spansFromOpenedGates(marked.hebrew, marked.openedGateSnippets)
    ),
    folds: marked.folds,
  };
}
