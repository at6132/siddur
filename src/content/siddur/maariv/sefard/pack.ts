import type { MaarivOfflinePack, MaarivSectionKey } from '../packTypes';
import { MINCHA_SEFARD_POLICY } from '../../mincha/sefard/policy';
import { MAARIV_OFFLINE_META } from './meta';
import { MAARIV_SEFARD_RAW } from './raw';

function sec(key: MaarivSectionKey) {
  const raw = MAARIV_SEFARD_RAW[key];
  return { key, hebrew: raw.hebrew, english: raw.english };
}

export const MAARIV_SEFARD_PACK: MaarivOfflinePack = {
  policy: MINCHA_SEFARD_POLICY,
  attribution: MAARIV_OFFLINE_META.attribution,
  sections: {
    maariv_shema: sec('maariv_shema'),
    maariv_amidah: sec('maariv_amidah'),
    maariv_aleinu: sec('maariv_aleinu'),
    maariv_motzaei: sec('maariv_motzaei'),
    maariv_omer: sec('maariv_omer'),
  },
};
