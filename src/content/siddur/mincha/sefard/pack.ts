import type { MinchaOfflinePack } from '../packTypes';
import { MINCHA_ALEINU_RAW } from './aleinu';
import { MINCHA_AMIDAH_RAW } from './amidah';
import { MINCHA_ASHREI_RAW } from './ashrei';
import { MINCHA_KORBANOT_RAW } from './korbanot';
import { MINCHA_OFFLINE_META } from './meta';
import { MINCHA_SEFARD_POLICY } from './policy';

/** Complete offline Nusach Sefard / Sfard Mincha pack (text + policy). */
export const MINCHA_SEFARD_PACK: MinchaOfflinePack = {
  policy: MINCHA_SEFARD_POLICY,
  attribution: MINCHA_OFFLINE_META.attribution,
  sections: {
    korbanot: {
      key: MINCHA_KORBANOT_RAW.key,
      hebrew: MINCHA_KORBANOT_RAW.hebrew,
      english: MINCHA_KORBANOT_RAW.english,
    },
    ashrei: {
      key: MINCHA_ASHREI_RAW.key,
      hebrew: MINCHA_ASHREI_RAW.hebrew,
      english: MINCHA_ASHREI_RAW.english,
    },
    amidah: {
      key: MINCHA_AMIDAH_RAW.key,
      hebrew: MINCHA_AMIDAH_RAW.hebrew,
      english: MINCHA_AMIDAH_RAW.english,
    },
    aleinu: {
      key: MINCHA_ALEINU_RAW.key,
      hebrew: MINCHA_ALEINU_RAW.hebrew,
      english: MINCHA_ALEINU_RAW.english,
    },
  },
};
