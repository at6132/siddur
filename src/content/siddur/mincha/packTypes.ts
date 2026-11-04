/**
 * Per-nusach Mincha pack policy — small flags for the shared Amidah pipeline.
 * Put pack text next to policy under ashkenaz/ / sefard/; do not fork the whole pipeline.
 */

export type MinchaNusachId = 'ashkenaz' | 'sfard';

export type MinchaNusachPolicy = {
  id: MinchaNusachId;
  /**
   * Summer Gevuros: true = keep מוריד הטל (Sfard / many Israel minhagim);
   * false = summer silence (classic diaspora Ashkenaz).
   */
  sayMoridHatalInSummer: boolean;
  /**
   * Mincha only: on public fast drop שלום רב and keep שים שלום (Ashkenaz dual from Sefaria).
   * Set false if a pack always uses one peace text without that swap.
   */
  minchaPeaceBrachaSwapOnPublicFast: boolean;
};

export type MinchaBundledSection = {
  key: string;
  hebrew: string;
  english: string;
};

export type MinchaOfflinePack = {
  policy: MinchaNusachPolicy;
  sections: {
    /** Sfard Mincha only — weekday קרבנות before Ashrei. */
    korbanot?: MinchaBundledSection;
    ashrei: MinchaBundledSection;
    amidah: MinchaBundledSection;
    aleinu: MinchaBundledSection;
  };
  attribution: string;
};
