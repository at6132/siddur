import type { ShacharitNusachId, ShacharitOfflinePack } from './packTypes';
import { SHACHARIT_ASHKENAZ_PACK } from './ashkenaz/pack';
import { SHACHARIT_SEFARD_PACK } from './sefard/pack';

export function getShacharitOfflinePack(nusach: ShacharitNusachId = 'ashkenaz'): ShacharitOfflinePack {
  return nusach === 'sfard' ? SHACHARIT_SEFARD_PACK : SHACHARIT_ASHKENAZ_PACK;
}
