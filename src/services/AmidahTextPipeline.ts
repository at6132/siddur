/**
 * @deprecated Legacy Sefaria phrase-parser pipeline.
 *
 * Liturgy is local packs with {{gate}} / {{fold}} markers.
 * Use `resolveMarkedPrayerText` / `applyPackMarkers` instead.
 *
 * This module remains only as a no-op so any stray import does not crash.
 */

import type { MinchaNusachPolicy } from '../content/siddur/mincha/packTypes';
import { MINCHA_ASHKENAZ_POLICY } from '../content/siddur/mincha/ashkenaz/policy';

export type WeekdayAmidahPipelineContext = {
  date: Date;
  israelForRainInsertion?: boolean;
  amidahSlot?: 'shacharit' | 'mincha' | 'maariv';
  policy?: MinchaNusachPolicy;
};

export type WeekdayAmidahPipelineStep = {
  id: string;
  description: string;
  apply: (
    hebrew: string,
    english: string,
    ctx: WeekdayAmidahPipelineContext
  ) => { hebrew: string; english: string };
};

/** Empty — markers own calendar shaping. */
export const WEEKDAY_AMIDAH_PIPELINE_STEPS: readonly WeekdayAmidahPipelineStep[] = [];

export function applyWeekdayAmidahTextPipeline(
  hebrew: string,
  english: string,
  _ctx: WeekdayAmidahPipelineContext
): { hebrew: string; english: string } {
  return { hebrew, english };
}

export function defaultAmidahPipelinePolicy(): MinchaNusachPolicy {
  return MINCHA_ASHKENAZ_POLICY;
}
