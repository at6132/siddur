/**
 * Offline weekday Shacharit packs — Ashkenaz / Sfard.
 * Nusach diffs = bundled text + shared Mincha amidah policy flags.
 */

import type { MinchaNusachId, MinchaNusachPolicy } from '../mincha/packTypes';

export type ShacharitNusachId = MinchaNusachId;

export type ShacharitSectionKey =
  | 'tallit'
  | 'tefillin'
  | 'preparatory'
  | 'birchot_hashachar'
  | 'korbanot'
  | 'pesukei_dzimra'
  | 'yotzer_or'
  | 'shema'
  | 'amidah'
  | 'tachanun'
  | 'ashrei'
  | 'concluding'
  | 'torah_reading';

export type ShacharitBundledSection = {
  key: string;
  hebrew: string;
  english: string;
};

export type ShacharitOfflinePack = {
  policy: MinchaNusachPolicy;
  attribution: string;
  sections: Partial<Record<ShacharitSectionKey, ShacharitBundledSection>>;
};
