import type { ShacharitOfflinePack, ShacharitSectionKey } from '../packTypes';
import { MINCHA_SEFARD_POLICY } from '../../mincha/sefard/policy';
import { SHACHARIT_OFFLINE_META } from './meta';
import { SHACHARIT_SEFARD_RAW } from './raw';

function sec(key: ShacharitSectionKey) {
  const raw = SHACHARIT_SEFARD_RAW[key];
  return { key, hebrew: raw.hebrew, english: raw.english };
}

export const SHACHARIT_SEFARD_PACK: ShacharitOfflinePack = {
  policy: MINCHA_SEFARD_POLICY,
  attribution: SHACHARIT_OFFLINE_META.attribution,
  sections: {
    tallit: sec('tallit'),
    tefillin: sec('tefillin'),
    preparatory: sec('preparatory'),
    birchot_hashachar: sec('birchot_hashachar'),
    korbanot: sec('korbanot'),
    pesukei_dzimra: sec('pesukei_dzimra'),
    yotzer_or: sec('yotzer_or'),
    shema: sec('shema'),
    amidah: sec('amidah'),
    tachanun: sec('tachanun'),
    ashrei: sec('ashrei'),
    concluding: sec('concluding'),
    torah_reading: sec('torah_reading'),
  },
};
