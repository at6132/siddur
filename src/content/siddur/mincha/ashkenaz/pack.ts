import type { MinchaOfflinePack } from '../packTypes';
import { MINCHA_ALEINU_RAW } from './aleinu';
import { MINCHA_AMIDAH_RAW } from './amidah';
import { MINCHA_ASHREI_RAW } from './ashrei';
import { MINCHA_OFFLINE_META } from './meta';
import { MINCHA_ASHKENAZ_POLICY } from './policy';

/** Complete offline Ashkenaz Mincha pack (text + policy). */
export const MINCHA_ASHKENAZ_PACK: MinchaOfflinePack = {
  policy: MINCHA_ASHKENAZ_POLICY,
  attribution: MINCHA_OFFLINE_META.attribution,
  sections: {
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
