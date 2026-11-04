import type { MaarivNusachId, MaarivOfflinePack } from './packTypes';
import { MAARIV_ASHKENAZ_PACK } from './ashkenaz/pack';
import { MAARIV_SEFARD_PACK } from './sefard/pack';

export function getMaarivOfflinePack(nusach: MaarivNusachId = 'ashkenaz'): MaarivOfflinePack {
  return nusach === 'sfard' ? MAARIV_SEFARD_PACK : MAARIV_ASHKENAZ_PACK;
}
