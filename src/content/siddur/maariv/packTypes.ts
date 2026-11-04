/**
 * Offline weekday Maariv packs — Ashkenaz / Sfard.
 * Nusach diffs = bundled text + shared Mincha amidah policy flags.
 */

import type { MinchaNusachId, MinchaNusachPolicy } from '../mincha/packTypes';

export type MaarivNusachId = MinchaNusachId;

export type MaarivSectionKey =
  | 'maariv_shema'
  | 'maariv_amidah'
  | 'maariv_aleinu'
  | 'maariv_motzaei'
  | 'maariv_omer';

export type MaarivBundledSection = {
  key: string;
  hebrew: string;
  english: string;
};

export type MaarivOfflinePack = {
  policy: MinchaNusachPolicy;
  attribution: string;
  sections: Partial<Record<MaarivSectionKey, MaarivBundledSection>>;
};
