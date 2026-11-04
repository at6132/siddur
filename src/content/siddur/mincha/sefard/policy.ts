/**
 * Nusach Sfard / Sefard Mincha weekday.
 * - Gevuros: מוריד הטל in summer (not silence).
 * - Peace: Siddur Sefard Mincha has שים שלום only (no שלום רב dual) — do not run
 *   the Ashkenaz public-fast peace swap that would wipe the only peace bracha.
 */
import type { MinchaNusachPolicy } from '../packTypes';

export const MINCHA_SEFARD_POLICY: MinchaNusachPolicy = {
  id: 'sfard',
  sayMoridHatalInSummer: true,
  minchaPeaceBrachaSwapOnPublicFast: false,
};
