/**
 * Weekday Amidah (Shacharit / Mincha / Maariv) — **single ordered pipeline** from Sefaria raw text
 * to reader-ready Hebrew/English (before `extractAmidahKedushaFoldout` in `SefariaService`).
 *
 * ## How to add, remove, or calendar-gate a change
 * 1. Implement `{ hebrew, english } → { hebrew, english }` in `MinchaTextRules.ts` (or a small helper).
 * 2. Add one entry to `WEEKDAY_AMIDAH_PIPELINE_STEPS` with a stable `id` and a one-line `description`.
 * 3. For “only on / except on” days, use `ctx.date` (and optional `ctx.israelForRainInsertion`) with
 *    `JewishCalendarService` inside your `apply` — do not call `new Date()` inside scattered rules.
 * 4. Keep order intentional: broad paragraph drops → inline strips → collapses → seasonal → refuah clause strip.
 *
 * ## Caller
 * `SefariaService.fetchSiddurSection` for `amidah` | `mincha_amidah` | `maariv_amidah` only.
 *
 * ## Other Shacharit / siddur sections
 * Non-Amidah Shacharit string cuts (e.g. concluding Aleinu / Kaddish) live in `ShacharitSectionPipelines.ts`.
 *
 * **English:** Same shape as Shacharit pipelines — `english` is carried for compatibility; Hebrew is what we maintain.
 */

import {
  normalizeSefariaAmidahSource,
  stripEtSemachVeguParenthetical,
  removeRoshChodeshCholHamoedYaalehInstruction,
  removeYaalehVeyavoBlockUnlessApplicable,
  collapseYaalehVeyavoInternalLineBreaks,
  collapseYaalehHolidayOptionLineBreaks,
  removeAseretYemeiTeshuvaBlockIfNotToday,
  removeMeiChamochaForgottenInstructionNote,
  removeZochreinuTaanitHalachaParagraphs,
  removeYaalehVeyavoForgottenHalachaParagraphs,
  removeModimBowingInstructionParagraphs,
  removeAlHanissimForgottenHalachaParagraphs,
  trimAlHanissimInsertionByCalendar,
  removeMisplacedVealKolAmchaLemishmeretParagraph,
  removeMashivHaruachInstructionParagraph,
  removeHaElHaKadoshTayaInstructionParagraph,
  removeMelechHamishpatAseretInstructionParagraph,
  collapseLmaanShmoToMelechOzerBreak,
  collapseKiElMelechKadoshAtahToBarchuHaElHaKadoshBreak,
  collapseUmatzmichYesuahToNeemanLehachayotMetimBreak,
  collapseRachamimTzedekMishpatToBarchuMelechOhevBreak,
  applyAseretThirdBlessingHaMelechHaKadosh,
  applyAmidahAneinuPublicFast,
  removeBirkatKohanimTaanitTziburInsertion,
  removeRefuahAruchaUmarpeClause,
  applyGevurosSeasonalMoridOrMashiv,
  applyBirkasHashanimSeasonalVtenBrachaOrTalUmatar,
  applyNachemTishaBAvBonehYerushalayim,
  collapseBarchuBonehYerushalayimToMeheraTachinBreak,
  collapseChanenuShomeaTefilaBreak,
  collapseBeRovOzShalomToBarchuBreak,
} from './MinchaTextRules';

export type WeekdayAmidahPipelineContext = {
  /** One wall-clock instant for the whole pipeline (avoid midnight drift between steps). */
  date: Date;
  /**
   * When true, ותן טל ומטר follows Israel (7 Cheshvan); when false, diaspora (Dec 4/5).
   * Inferred from saved location in `SefariaService` (rough bbox), not a separate setting.
   */
  israelForRainInsertion?: boolean;
  /** Which Amidah fetch (נחם is Mincha on Tisha B'Av only). */
  amidahSlot?: 'shacharit' | 'mincha' | 'maariv';
};

export type WeekdayAmidahPipelineStep = {
  id: string;
  description: string;
  apply: (
    hebrew: string,
    english: string,
    ctx: WeekdayAmidahPipelineContext
  ) => { hebrew: string; english: string };
};

export const WEEKDAY_AMIDAH_PIPELINE_STEPS: readonly WeekdayAmidahPipelineStep[] = [
  {
    id: 'normalize_html',
    description: 'Strip Sefaria HTML; preserve <br> as newlines (plain text for all following rules)',
    apply: (h, e) => normalizeSefariaAmidahSource(h, e),
  },
  {
    id: 'strip_et_semach_vegu',
    description: 'Remove parenthetical (את צמח וגו׳) citation from amidah',
    apply: (h, e) => stripEtSemachVeguParenthetical(h, e),
  },
  {
    id: 'remove_rosh_chodesh_chol_hamoed_yaaleh_label',
    description:
      'Remove Sefaria line בראש חודש ובחול המועד אומרים זה: (instruction before יעלה ויבא)',
    apply: (h, e) => removeRoshChodeshCholHamoedYaalehInstruction(h, e),
  },
  {
    id: 'remove_yaaleh_veyavo_when_not_said',
    description:
      'Remove full יעלה ויבא paragraph on days we do not say it (Sefaria always includes the insertion text)',
    apply: (h, e, ctx) => removeYaalehVeyavoBlockUnlessApplicable(h, e, ctx.date),
  },
  {
    id: 'collapse_yaaleh_veyavo_one_paragraph',
    description:
      'Join internal line breaks in יעלה ויבא (אלהינו… through כי אליך עינינו…חנון ורחום אתה) into one paragraph',
    apply: (h, e) => collapseYaalehVeyavoInternalLineBreaks(h, e),
  },
  {
    id: 'collapse_yaaleh_holiday_option_lines',
    description:
      'Join paragraph breaks between …טובים ולשלום ביום and זכרנו (לר"ח / לפסח / לסכות) so the reader does not stack huge gaps',
    apply: (h, e) => collapseYaalehHolidayOptionLineBreaks(h, e),
  },
  {
    id: 'aseret_insertions',
    description: 'Aseret Yemei Teshuva: remove or trim inline/paragraph מי כמוך אב / זכרנו by calendar',
    apply: (h, e, ctx) => removeAseretYemeiTeshuvaBlockIfNotToday(h, e, ctx.date),
  },
  {
    id: 'mei_chamocha_forgotten_note',
    description: 'Always remove halacha note אם שכח לומר מי כמוך…',
    apply: (h, e) => removeMeiChamochaForgottenInstructionNote(h, e),
  },
  {
    id: 'zochreinu_halacha_paragraph',
    description:
      'Always remove standalone halacha אם לא אמר זכרנו… / וכתוב… / בעשי"ת אומרים בספר חיים… חיי אדם (ועוד)',
    apply: (h, e) => removeZochreinuTaanitHalachaParagraphs(h, e),
  },
  {
    id: 'yaaleh_veyavo_forgotten_halacha',
    description:
      'Remove halacha block שכח ולא אמר יעלה ויבא (רצה / יהיו לרצון / המחזיר שכינתו לציון / חוזר לראש)',
    apply: (h, e) => removeYaalehVeyavoForgottenHalachaParagraphs(h, e),
  },
  {
    id: 'modim_bowing_halacha',
    description:
      'Remove מודים halacha: כשאומר מודים כורע כאגמון (או"ח קיג) and כשיגיע שליח צבור… הודאה קטנה (אבודרהם)',
    apply: (h, e) => removeModimBowingInstructionParagraphs(h, e),
  },
  {
    id: 'al_hanissim_forgotten_halacha',
    description:
      'Remove halacha paragraph בחנוכה ופורים אומרים על הנסים — שכח לומר… מברכת הטוב שמך… אינו חוזר (דה״ח)',
    apply: (h, e) => removeAlHanissimForgottenHalachaParagraphs(h, e),
  },
  {
    id: 'trim_al_hanissim_by_calendar',
    description:
      'ועל הנסים: per ctx.date (isAlHanissim) — Chanukah or Purim paragraph + intro, or remove insertion off-season; cache keeps full Sefaria text',
    apply: (h, e, ctx) => trimAlHanissimInsertionByCalendar(h, e, ctx.date),
  },
  {
    id: 'remove_misplaced_veal_kol_amcha',
    description:
      'Modim: drop stray `וְעַל כָּל עַמְּךָ … לְמִשְׁמֶרֶת שָׁלוֹם` before `וְכֹל הַחַיִּים` or `שִים שָׁלוֹם` (mis-anchor / duplicate tail)',
    apply: (h, e) => removeMisplacedVealKolAmchaLemishmeretParagraph(h, e),
  },
  {
    id: 'mashiv_haruach_halacha',
    description: 'Always remove Mashiv Haruach mistake halacha paragraph',
    apply: (h, e) => removeMashivHaruachInstructionParagraph(h, e),
  },
  {
    id: 'hael_hakadosh_mistake_halacha',
    description: 'Always remove האל הקדוש vs המלך הקדוש mistake halacha paragraph',
    apply: (h, e) => removeHaElHaKadoshTayaInstructionParagraph(h, e),
  },
  {
    id: 'melech_hamishpat_halacha',
    description:
      'Always remove המלך המשפט vs מלך אוהב צדקה ומשפט (בכל השנה / בעשי"ת) mistake halacha paragraph',
    apply: (h, e) => removeMelechHamishpatAseretInstructionParagraph(h, e),
  },
  {
    id: 'collapse_lmaan_melech',
    description: 'Collapse break between למען שמו באהבה and מלך עוזר',
    apply: (h, e) => collapseLmaanShmoToMelechOzerBreak(h, e),
  },
  {
    id: 'collapse_ki_el_barchu',
    description: 'Collapse break between כי אל מלך… and ברוך אתה האל הקדוש',
    apply: (h, e) => collapseKiElMelechKadoshAtahToBarchuHaElHaKadoshBreak(h, e),
  },
  {
    id: 'collapse_matzmich_neeman',
    description: 'Collapse break between ומצמיח ישועה and ונאמן אתה להחיות מתים',
    apply: (h, e) => collapseUmatzmichYesuahToNeemanLehachayotMetimBreak(h, e),
  },
  {
    id: 'collapse_rachamim_mishpat_to_barchu_melech_ohev',
    description:
      'Collapse break between …וברחמים וצדקנו בצדק ובמשפט and ברוך אתה … מלך אוהב (Din bracha chatima)',
    apply: (h, e) => collapseRachamimTzedekMishpatToBarchuMelechOhevBreak(h, e),
  },
  {
    id: 'aseret_hamelech_hakadosh',
    description:
      'Aseret: strip בעשי"ת מסיים sample; replace האל→המלך (3rd bracha) and מלך אוהב צדקה ומשפט→המלך המשפט (4th) on Aseret only',
    apply: (h, e, ctx) => applyAseretThirdBlessingHaMelechHaKadosh(h, e, ctx.date),
  },
  {
    id: 'aneinu_public_fast',
    description: 'Remove עננו block except fast days; on fast days strip בתענית ציבור… instruction only',
    apply: (h, e, ctx) => applyAmidahAneinuPublicFast(h, e, ctx.date),
  },
  {
    id: 'birkat_kohanim_taanit_tzibur_note',
    description:
      'Remove Sefaria block בתענית ציבור… ברכת כהנים (אלהינו… / יברכך… / אדיר במרום…) — halacha note, not silent Amidah',
    apply: (h, e) => removeBirkatKohanimTaanitTziburInsertion(h, e),
  },
  {
    id: 'nachem_tisha_bav_boneh_yerushalayim',
    description:
      'Strip Sefaria נחם (במנחת תשעה באב) except Mincha on 9 Av; then strip label + duplicate בונה ירושלים chatima',
    apply: (h, e, ctx) => applyNachemTishaBAvBonehYerushalayim(h, e, ctx.date, ctx.amidahSlot),
  },
  {
    id: 'collapse_boneh_yerushalayim_mehera_tachin',
    description:
      'Collapse break between בָּרוּךְ … בּוֹנֵה יְרוּשָׁלַיִם: and מְהֵרָה לְתוֹכָהּ תָּכִין: (either order)',
    apply: (h, e) => collapseBarchuBonehYerushalayimToMeheraTachinBreak(h, e),
  },
  {
    id: 'collapse_chanenu_shomea_tefila',
    description:
      'Collapse break between חננו ועננו ושמע תפילתנו and כי אתה שומע תפילת (Shomea Tefillah)',
    apply: (h, e) => collapseChanenuShomeaTefilaBreak(h, e),
  },
  {
    id: 'collapse_brov_oz_shalom_to_barchu',
    description:
      'Collapse line/paragraph break after (ברוב עוז ושלום). and before ברוך אתה (Sim Shalom / Shomea Tefillah chatima)',
    apply: (h, e) => collapseBeRovOzShalomToBarchuBreak(h, e),
  },
  {
    id: 'refuah_arucha_phrase',
    description: 'Refuah: strip ארוכה…מכותינו; רפואה שלמה after והעלה (petition→chatimah order unchanged)',
    apply: (h, e) => removeRefuahAruchaUmarpeClause(h, e),
  },
  {
    id: 'gevuros_seasonal_morid',
    description: 'Gevuros: seasonal מוריד הטל / משיב הרוח and line joins by calendar',
    apply: (h, e, ctx) => applyGevurosSeasonalMoridOrMashiv(h, e, ctx.date),
  },
  {
    id: 'birkas_hashanim_seasonal_vten',
    description:
      'Birkas Hashanim: בימות החמה/בימות הגשמים (or בקיץ/בחורף) dual ותן ברכה vs ותן טל ומטר by isVtenTalUmatar',
    apply: (h, e, ctx) =>
      applyBirkasHashanimSeasonalVtenBrachaOrTalUmatar(
        h,
        e,
        ctx.date,
        ctx.israelForRainInsertion ?? false
      ),
  },
];

/** Stable ids for tests / logging */
export const WEEKDAY_AMIDAH_PIPELINE_STEP_IDS: readonly string[] = WEEKDAY_AMIDAH_PIPELINE_STEPS.map((s) => s.id);

export function applyWeekdayAmidahTextPipeline(
  hebrew: string,
  english: string,
  ctx: WeekdayAmidahPipelineContext
): { hebrew: string; english: string } {
  let he = hebrew;
  let en = english;
  for (const step of WEEKDAY_AMIDAH_PIPELINE_STEPS) {
    const out = step.apply(he, en, ctx);
    he = out.hebrew;
    en = out.english;
  }
  return { hebrew: he, english: en };
}
