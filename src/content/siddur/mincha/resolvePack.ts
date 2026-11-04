import type { MinchaNusachId, MinchaNusachPolicy, MinchaOfflinePack } from './packTypes';
import { MINCHA_ASHKENAZ_PACK } from './ashkenaz/pack';
import { MINCHA_ASHKENAZ_POLICY } from './ashkenaz/policy';
import { MINCHA_SEFARD_PACK } from './sefard/pack';
import { MINCHA_SEFARD_POLICY } from './sefard/policy';

/** Policy for pipeline steps (online + offline). */
export function getMinchaNusachPolicy(nusach: MinchaNusachId = 'ashkenaz'): MinchaNusachPolicy {
  return nusach === 'sfard' ? MINCHA_SEFARD_POLICY : MINCHA_ASHKENAZ_POLICY;
}

/**
 * Offline Mincha pack for the user's selected nusach.
 * Ashkenaz and Sfard ship separate bundled text; pipeline applies shared calendar rules
 * with pack.policy flags (e.g. מוריד הטל).
 */
export function getMinchaOfflinePack(nusach: MinchaNusachId = 'ashkenaz'): MinchaOfflinePack {
  return nusach === 'sfard' ? MINCHA_SEFARD_PACK : MINCHA_ASHKENAZ_PACK;
}
