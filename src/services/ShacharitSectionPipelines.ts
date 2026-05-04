/**
 * Weekday Shacharit — **ordered string pipelines** for siddur sections fetched in `SefariaService.fetchSiddurSection`,
 * mirroring the “one registry + stable step ids” pattern used for Mincha / Amidah (`AmidahTextPipeline.ts`).
 *
 * **English:** Steps still take/return `english` for API compatibility; we are not investing in English edits for now
 * (typically pass-through or best-effort). Focus new work on Hebrew only.
 *
 * ## Amidah (all tefillot)
 * Shacharit / Mincha / Maariv Amidah still uses `applyWeekdayAmidahTextPipeline` with `amidahSlot` — not duplicated here.
 *
 * ## How to add, remove, or calendar-gate a Shacharit-only cut
 * 1. Put Shacharit-only string rules in `ShacharitTextRules.ts` (Mincha does not import that file).
 * 2. Prefer shared helpers in `MinchaTextRules.ts` only when the same rule applies to bentching / multiple tefillot.
 * 3. Add a `ShacharitSiddurPipelineStep` to `SHACHARIT_SIDDUR_PIPELINE_STEPS[sectionKey]` with a stable `id` and a one-line `description`.
 * 4. Use `ctx.date` (and `ctx.nusach`) for calendar / nusach logic — avoid `new Date()` inside individual steps.
 * 5. Keep order intentional (broad cuts → smaller normalizations).
 *
 * ## Segment-phase work
 * Some sections still tweak `hebrewSegments` after the join (e.g. Tefillas ha-Derech in `SefariaService`). Migrate those
 * into `{ hebrew, english }` steps here when practical so all string cuts live in one place.
 */

import { stripFullKaddishShalemBeforeAleinu } from './MinchaTextRules';
import {
  collapseNetilatYadayimChatimaGapBeforeNextBaruch,
  enforceBreakAfterHameichinMitzadeiGaverBeforeSheasaLiKolTzorki,
  collapseSefariaParagraphBreaksToSingleNewline,
  enforceDoubleBreakAfterVaaniAvarchemBeforeEluDevarim,
  enforceDoubleBreakAfterKenegedKulamBeforeHanotenLasechvi,
  fixVenehiyehTzetzaeiDuplication,
  joinBirkatHaTorahAmorLahemWithYevarechecha,
  joinBirkatHaTorahLaasokDivreiTorahWithVehaarevNa,
  moveModehAniAndBirchasTzitzisBeforeNetilasYadayim,
  removeSeparatorAfterHamachazirNeshamotBeforeLaasok,
  removeBirchosHatorahTishaAvYomKippurInstruction,
  removeShacharitPreparatoryPreTefillahZoharBundle,
} from './ShacharitTextRules';

export type ShacharitSiddurPipelineContext = {
  /** One wall-clock instant for the whole pipeline (avoid midnight drift between steps). */
  date: Date;
  nusach: 'ashkenaz' | 'sfard';
};

export type ShacharitSiddurPipelineStep = {
  id: string;
  description: string;
  apply: (
    hebrew: string,
    english: string,
    ctx: ShacharitSiddurPipelineContext
  ) => { hebrew: string; english: string };
};

/**
 * Per-`sectionKey` ordered steps. Keys with no entry (or empty array) are left to raw Sefaria + `SefariaService` only.
 * Add keys such as `pesukei_dzimra`, `birchot_hashachar`, etc. when you introduce section-specific rules.
 */
export const SHACHARIT_SIDDUR_PIPELINE_STEPS: Partial<
  Record<string, readonly ShacharitSiddurPipelineStep[]>
> = {
  birchot_hashachar: [
    {
      id: 'move_modeh_ani_and_tzitzis_before_netilas',
      description:
        'Ensure מודה אני and ברכת ציצית are before על נטילת ידים within morning blessings flow',
      apply: (h, e) => moveModehAniAndBirchasTzitzisBeforeNetilasYadayim(h, e),
    },
    {
      id: 'remove_separator_after_hamachazir_before_laasok',
      description:
        'Remove thin separator artifact between ...מֵתִים: and ...לַעֲסֹק בְּדִבְרֵי תוֹרָה',
      apply: (h, e) => removeSeparatorAfterHamachazirNeshamotBeforeLaasok(h, e),
    },
    {
      id: 'double_break_keneged_kulam_to_hanoten_lasechvi',
      description:
        'Keep paragraph break between כְּנֶגֶד כֻּלָּם: and בָּרוּךְ...הַנּוֹתֵן לַשֶּׂכְוִי',
      apply: (h, e) => enforceDoubleBreakAfterKenegedKulamBeforeHanotenLasechvi(h, e),
    },
    {
      id: 'break_hameichin_mitzadei_gaver_to_sheasa_li_kol_tzorki',
      description:
        'Keep line break between הַמֵּכִין מִצְעֲדֵי גָבֶר: and בָּרוּךְ...שֶׁעָשָׂה לִי כָּל צָרְכִּי',
      apply: (h, e) => enforceBreakAfterHameichinMitzadeiGaverBeforeSheasaLiKolTzorki(h, e),
    },
  ],
  netilas_yadayim: [
    {
      id: 'collapse_chatima_gap_before_next_baruch',
      description:
        'Single line break between נטילת ידים chatima and the next בָּרוּךְ (avoid Sefaria \\n\\n / <br><br> paragraph gap)',
      apply: (h, e) => collapseNetilatYadayimChatimaGapBeforeNextBaruch(h, e),
    },
  ],
  birchos_hatorah: [
    {
      id: 'collapse_paragraph_breaks_to_single_newline',
      description:
        'Avoid reader paragraph gaps: collapse Sefaria \\n\\n / <br><br> / </p><p> to one \\n between Birchot HaTorah units',
      apply: (h, e) => collapseSefariaParagraphBreaksToSingleNewline(h, e),
    },
    {
      id: 'remove_tisha_av_yom_kippur_ein_omerim_note',
      description:
        'Remove Sefaria note בט׳ אב ויוה״כ אין אומרים ברכה זו (and ט׳ באב / optional ביום variants)',
      apply: (h, e) => removeBirchosHatorahTishaAvYomKippurInstruction(h, e),
    },
    {
      id: 'join_laasok_divrei_torah_colon_with_vehaarev_na',
      description:
        'No line between לַעֲסֹק בְּדִבְרֵי תוֹרָה: and וְהַעֲרֶב נָא (Sefaria break → single space)',
      apply: (h, e) => joinBirkatHaTorahLaasokDivreiTorahWithVehaarevNa(h, e),
    },
    {
      id: 'join_amor_lahem_colon_with_yevarechecha',
      description:
        'No line between …בְּנֵי יִשְׂרָאֵל אָמוֹר לָהֶם: and יְבָרֶכְךָ יְהֹוָה וְיִשְׁמְרֶךָ (Sefaria break → single space)',
      apply: (h, e) => joinBirkatHaTorahAmorLahemWithYevarechecha(h, e),
    },
    {
      id: 'fix_venehiyeh_tzetzaei_duplication',
      description:
        'Fix duplicated wording: וְצֶאֱצָאֵי צֶאֱצָאֵינוּ עַמְּךָ → וְצֶאֱצָאֵי עַמְּךָ',
      apply: (h, e) => fixVenehiyehTzetzaeiDuplication(h, e),
    },
    {
      id: 'double_break_vaani_avarchem_to_elu_devarim',
      description:
        'Keep paragraph break between וַאֲנִי אַבָרְכֵם: and אֵלּוּ דְבָרִים (force \\n\\n)',
      apply: (h, e) => enforceDoubleBreakAfterVaaniAvarchemBeforeEluDevarim(h, e),
    },
  ],
  preparatory: [
    {
      id: 'move_modeh_ani_and_tzitzis_before_netilas',
      description:
        'Ensure מודה אני and ברכת ציצית are before על נטילת ידים when Sefaria places them in preparatory block',
      apply: (h, e) => moveModehAniAndBirchasTzitzisBeforeNetilasYadayim(h, e),
    },
    {
      id: 'remove_separator_after_hamachazir_before_laasok',
      description:
        'Remove thin separator artifact between ...מֵתִים: and ...לַעֲסֹק בְּדִבְרֵי תוֹרָה in preparatory flow',
      apply: (h, e) => removeSeparatorAfterHamachazirNeshamotBeforeLaasok(h, e),
    },
    {
      id: 'double_break_keneged_kulam_to_hanoten_lasechvi',
      description:
        'Keep paragraph break between כְּנֶגֶד כֻּלָּם: and בָּרוּךְ...הַנּוֹתֵן לַשֶּׂכְוִי in preparatory flow',
      apply: (h, e) => enforceDoubleBreakAfterKenegedKulamBeforeHanotenLasechvi(h, e),
    },
    {
      id: 'break_hameichin_mitzadei_gaver_to_sheasa_li_kol_tzorki',
      description:
        'Keep line break between הַמֵּכִין מִצְעֲדֵי גָבֶר: and בָּרוּךְ...שֶׁעָשָׂה לִי כָּל צָרְכִּי in preparatory flow',
      apply: (h, e) => enforceBreakAfterHameichinMitzadeiGaverBeforeSheasaLiKolTzorki(h, e),
    },
    {
      id: 'remove_pre_tefillah_zohar_elimelech_bundle',
      description:
        'Drop Sefaria block תפילה קודם התפילה through עצה זו אינה מועילה…קריאת שמע (Noam Elimelech + Zohar tikkunim + kavanos + note)',
      apply: (h, e) => removeShacharitPreparatoryPreTefillahZoharBundle(h, e),
    },
  ],
  concluding: [
    {
      id: 'strip_full_kaddish_before_aleinu',
      description:
        'Remove הש"ץ אומר קדיש שלם and the full Kaddish block before עלינו לשבח (Shacharit concluding)',
      apply: (h, e) => stripFullKaddishShalemBeforeAleinu(h, e),
    },
  ],
  mincha_aleinu: [
    {
      id: 'strip_full_kaddish_before_aleinu',
      description: 'Same Kaddish strip as Shacharit concluding (Mincha Aleinu ref)',
      apply: (h, e) => stripFullKaddishShalemBeforeAleinu(h, e),
    },
  ],
};

/** Keys that currently have at least one pipeline step (for logging / tests). */
export const SHACHARIT_SIDDUR_PIPELINE_KEYS_WITH_STEPS: readonly string[] = Object.keys(
  SHACHARIT_SIDDUR_PIPELINE_STEPS
).filter((k) => (SHACHARIT_SIDDUR_PIPELINE_STEPS[k]?.length ?? 0) > 0);

/** Flat list of step ids actually registered (sectionKey::id). */
export const SHACHARIT_SIDDUR_PIPELINE_STEP_IDS: readonly string[] = SHACHARIT_SIDDUR_PIPELINE_KEYS_WITH_STEPS.flatMap(
  (sectionKey) =>
    (SHACHARIT_SIDDUR_PIPELINE_STEPS[sectionKey] ?? []).map((s) => `${sectionKey}::${s.id}`)
);

/**
 * Run Shacharit-style siddur string transforms for `sectionKey` when a pipeline is defined.
 * No-op when there is no entry or the step list is empty.
 */
export function applyShacharitSiddurSectionPipeline(
  sectionKey: string,
  hebrew: string,
  english: string,
  ctx: ShacharitSiddurPipelineContext
): { hebrew: string; english: string } {
  const steps = SHACHARIT_SIDDUR_PIPELINE_STEPS[sectionKey];
  if (!steps?.length) return { hebrew, english };
  let he = hebrew;
  let en = english;
  for (const step of steps) {
    const out = step.apply(he, en, ctx);
    he = out.hebrew;
    en = out.english;
  }
  return { hebrew: he, english: en };
}
