/**
 * Offline standalone siddur packs — Asher Yatzar, Tefillas HaDerech,
 * Bentching, Bedtime Shema, plus shared-ref extras.
 */

import type { MinchaNusachId, MinchaNusachPolicy } from '../mincha/packTypes';

export type StandaloneNusachId = MinchaNusachId;

export type StandaloneSectionKey =
  | 'asher_yatzar'
  | 'netilas_yadayim'
  | 'modeh_ani'
  | 'birchos_hatorah'
  | 'tefilas_haderech'
  | 'birchas_hamazon'
  | 'al_hamichya'
  | 'krias_shema_al_hamita';

export type StandaloneBundledSection = {
  key: string;
  hebrew: string;
  english: string;
};

export type StandaloneOfflinePack = {
  policy: MinchaNusachPolicy;
  attribution: string;
  sections: Partial<Record<StandaloneSectionKey, StandaloneBundledSection>>;
};
