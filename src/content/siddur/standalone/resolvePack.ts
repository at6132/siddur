import type { StandaloneNusachId, StandaloneOfflinePack } from './packTypes';
import { STANDALONE_ASHKENAZ_PACK } from './ashkenaz/pack';
import { STANDALONE_SEFARD_PACK } from './sefard/pack';

export function getStandaloneOfflinePack(nusach: StandaloneNusachId = 'ashkenaz'): StandaloneOfflinePack {
  return nusach === 'sfard' ? STANDALONE_SEFARD_PACK : STANDALONE_ASHKENAZ_PACK;
}
