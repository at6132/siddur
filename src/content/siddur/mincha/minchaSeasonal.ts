/**
 * Mincha seasonal helpers — re-exports shared Amidah seasonal module.
 * Prefer importing from `../amidahSeasonal` for new code.
 */

export {
  MINCHA_SEASONAL_CATALOG,
  getActiveMinchaDayOnlyInserts,
  segmentHebrewWithSeasonalHighlights,
  trimYaalehVeyavoToTodaysPhrase,
} from '../amidahSeasonal';
export type {
  AmidahSeasonalCatalogEntry as MinchaSeasonalCatalogEntry,
  AmidahSeasonalKind as MinchaSeasonalKind,
  ActiveMinchaSeasonal,
} from '../amidahSeasonal';
