/**
 * Shacharis content sets — declarative foldout / seasonal / highlight / omit rules.
 *
 * Source of truth for liturgy is the edited offline raw packs. This catalog says
 * how blocks behave by day (omit, swap, highlight) and which rarely-said blocks
 * attach as foldouts. Prefer editing raw text + adding a set here over runtime strippers.
 */

import { JewishCalendarService } from '../../../core/calendar/JewishCalendar';
import { stripLibrarySeasonalRubrics } from '../librarySeasonal';
import type { ShacharitSectionKey } from './packTypes';

export type ShacharitContentSetKind =
  | 'foldout'
  | 'seasonal_show'
  | 'seasonal_swap'
  | 'highlight'
  | 'omit';

export type ShacharitContentGateCtx = {
  date: Date;
  tachanun: boolean;
  aseret: boolean;
  roshChodesh: boolean;
  ledavidSeason: boolean;
  fastOrAseret: boolean;
  mondayThursday: boolean;
};

export type ShacharitContentSet = {
  id: string;
  /** Section whose text is affected (or the foldout source section). */
  section: ShacharitSectionKey;
  kind: ShacharitContentSetKind;
  name: string;
  /** Foldout title shown in the reader */
  label?: string;
  /** Where a foldout attaches in the main scroll */
  attachTo?: ShacharitSectionKey;
  /**
   * For omit / seasonal_show: keep the matched block only when this returns true.
   * For foldout: usually always true (available collapsed).
   */
  when?: (ctx: ShacharitContentGateCtx) => boolean;
  /** Hebrew match against a paragraph (nikkud-stripped). */
  match?: RegExp;
  note?: string;
};

function stripNik(s: string): string {
  return s.replace(/[\u0591-\u05C7]/g, '').replace(/\u05BE/g, ' ');
}

const NIK = '[\\u0591-\\u05C7]*';
const SP = '[\\s\\u05BE\\u200e\\u200f]*';

/** Psalm 130 (ממעמקים) — Aseret insert after Yishtabach. */
const MIMAAMAKIM_HE_RE = new RegExp(
  `ש${NIK}י${NIK}ר${SP}ה${NIK}מ${NIK}ע${NIK}ל${NIK}ו${NIK}ת${SP}מ${NIK}מ${NIK}ע${NIK}מ${NIK}ק${NIK}י${NIK}ם[\\s\\S]*?ע${NIK}ו${NIK}נ${NIK}ו${NIK}ת${NIK}י${NIK}ו\\s*:?`,
  'u'
);

const ASERET_MOSIFIN_HE_RE = new RegExp(
  `ב${NIK}ע${NIK}ש${NIK}ר${NIK}ת${SP}י${NIK}מ${NIK}י${SP}ת${NIK}ש${NIK}ו${NIK}ב${NIK}ה${SP}מ${NIK}ו${NIK}ס${NIK}י${NIK}פ${NIK}י${NIK}ן\\s*:?\\s*`,
  'gu'
);

/** Instructional "ואומר" / "ואומר ה" before Chatzi Kaddish. */
const VAOMER_BEFORE_KADDISH_RE = new RegExp(
  `ו${NIK}א${NIK}ו${NIK}מ${NIK}ר${SP}ה?${SP}(?=י${NIK}ת${NIK}ג${NIK}ד${NIK}ל)`,
  'gu'
);

const MIMAAMAKIM_EN_RE =
  /(?:A\s+)?Song of Ascents\.?\s*Out of the depths[\s\S]*?(?:iniquities|transgressions)\.?/i;

/**
 * Pesukei D'Zimra — Aseret Psalm 130:
 * always delete the rubric + "ואומר" cue; keep the psalm only on Aseret.
 * Chatzi Kaddish after it stays year-round.
 */
export function applyPesukeiDzimraAseretMimaamakim(
  hebrew: string,
  english: string,
  aseret: boolean
): { hebrew: string; english: string } {
  let h = hebrew.replace(ASERET_MOSIFIN_HE_RE, '');
  let e = (english || '')
    .replace(/During the Ten Days of Penitence\s*:?\s*/gi, '')
    .replace(/In the Ten Days of Repentance[,:]?\s*(?:we\s+add[:]?)\s*/gi, '')
    .replace(/Ten Days of Penitence\s*:?\s*/gi, '');

  if (!aseret) {
    h = h.replace(MIMAAMAKIM_HE_RE, '');
    e = e.replace(MIMAAMAKIM_EN_RE, '');
  }

  h = h.replace(VAOMER_BEFORE_KADDISH_RE, '');
  e = e.replace(/\bAnd (?:he |one )?says?\s*(?=(?:May His|Magnified|Yitgadal))/gi, '');

  return {
    hebrew: h.replace(/\n{3,}/g, '\n\n').trim(),
    english: e.replace(/\n{3,}/g, '\n\n').trim(),
  };
}

function splitParas(s: string): string[] {
  return s.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

function keepParas(
  hebrew: string,
  english: string,
  keep: boolean[]
): { hebrew: string; english: string } {
  const hp = splitParas(hebrew);
  const ep = splitParas(english);
  const hOut: string[] = [];
  const eOut: string[] = [];
  for (let i = 0; i < hp.length; i++) {
    if (keep[i] !== false) {
      hOut.push(hp[i]);
      if (ep[i]) eOut.push(ep[i]);
    }
  }
  return { hebrew: hOut.join('\n\n'), english: eOut.join('\n\n') };
}

const WEEKDAY_SONG_LABELS = [
  'יום ראשון',
  'יום שני',
  'יום שלישי',
  'יום רביעי',
  'יום חמישי',
  'יום ששי',
  'יום שישי',
] as const;

function pickSongOfTheDay(hebrew: string, date: Date): string {
  const st = stripNik(hebrew);
  const today = [
    'יום ראשון',
    'יום שני',
    'יום שלישי',
    'יום רביעי',
    'יום חמישי',
    'יום שישי',
    'שבת',
  ][date.getDay()];
  if (!today || today === 'שבת') return hebrew;
  const hits: { label: string; index: number }[] = [];
  for (const label of WEEKDAY_SONG_LABELS) {
    const i = st.indexOf(label);
    if (i !== -1) hits.push({ label, index: i });
  }
  hits.sort((a, b) => a.index - b.index);
  if (hits.length < 2) return hebrew;
  const want = today === 'יום שישי' ? ['יום ששי', 'יום שישי'] : [today];
  const startHit = hits.find((h) => want.includes(h.label));
  if (!startHit) return hebrew;
  const next = hits.find((h) => h.index > startHit.index);
  const origLabel = hebrew.search(new RegExp(startHit.label.replace(/ /g, '[\\s\\u05BE]+')));
  if (origLabel === -1) return hebrew.slice(startHit.index, next ? next.index : st.length);
  const nextOrig =
    next != null ? hebrew.search(new RegExp(next.label.replace(/ /g, '[\\s\\u05BE]+'))) : -1;
  const slice = hebrew.slice(
    origLabel,
    nextOrig !== -1 && nextOrig > origLabel ? nextOrig : hebrew.length
  );
  return slice.trim() || hebrew;
}

const ENG_WEEKDAY_SONG_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
] as const;

function pickSongOfTheDayEnglish(english: string, date: Date): string {
  if (!english?.trim()) return english;
  const day = date.getDay();
  if (day === 6) return english;
  const today = ENG_WEEKDAY_SONG_LABELS[day];
  const hits: { label: string; index: number }[] = [];
  for (const label of ENG_WEEKDAY_SONG_LABELS) {
    const re = new RegExp(`\\b(?:On\\s+)?${label}\\b|\\b${label}\\s*(?:'s)?\\s*(?:Psalm|Song)`, 'i');
    const m = english.match(re);
    if (m?.index != null) hits.push({ label, index: m.index });
  }
  hits.sort((a, b) => a.index - b.index);
  if (hits.length < 2) return english;
  const startHit = hits.find((h) => h.label === today);
  if (!startHit) return english;
  const next = hits.find((h) => h.index > startHit.index);
  return english.slice(startHit.index, next ? next.index : english.length).trim() || english;
}

/** Full inventory of Shacharis content sets (foldouts + day gates). */
export const SHACHARIT_CONTENT_SETS: readonly ShacharitContentSet[] = [
  // —— Foldouts (collapsed by default in the reader) ——
  {
    id: 'foldout_korbanot',
    section: 'korbanot',
    kind: 'foldout',
    name: 'Korbanot',
    label: 'קרבנות',
    attachTo: 'birchot_hashachar',
    note: 'Rarely said weekday; main flow is Brachos → Pesukei. Built in OfflineShacharitService.',
  },
  {
    id: 'foldout_birchos_hashachar_expansion',
    section: 'birchot_hashachar',
    kind: 'foldout',
    name: 'Birchot HaShachar expansion (Akedah / sovereignty)',
    label: 'הרחבת ברכות השחר',
    attachTo: 'birchot_hashachar',
    note: 'Split at אלהינו…זכרנו בזכרון טוב. Reader already renders this foldout.',
  },
  {
    id: 'foldout_kedusha',
    section: 'amidah',
    kind: 'foldout',
    name: 'Chazaras ha-shatz Kedushah',
    label: 'קדושה',
    attachTo: 'amidah',
    note: 'extractAmidahKedushaFoldout in Amidah path.',
  },
  {
    id: 'foldout_modim_derabanan',
    section: 'amidah',
    kind: 'foldout',
    name: 'Modim deRabbanan',
    label: 'מודים דרבנן',
    attachTo: 'amidah',
    note: 'extractModimDerabananFoldout in Amidah path.',
  },

  // —— Omit / show by day ——
  {
    id: 'omit_pesukei_mimaamakim_outside_aseret',
    section: 'pesukei_dzimra',
    kind: 'seasonal_show',
    name: 'Psalm 130 (ממעמקים) outside Aseret',
    when: (ctx) => ctx.aseret,
    note:
      'Not paragraph-omit (psalm is mid-blob with Yishtabach/Kaddish). Mid-string gate in applyShacharitContentSets.',
  },
  {
    id: 'omit_tachanun_avinu_outside_fast_aseret',
    section: 'tachanun',
    kind: 'omit',
    name: 'Avinu Malkeinu outside fast / Aseret',
    match: /אבינו\s+מלכנו/,
    when: (ctx) => ctx.fastOrAseret,
  },
  {
    id: 'omit_tachanun_mon_thu_block',
    section: 'tachanun',
    kind: 'omit',
    name: 'Monday/Thursday long tachanun (והוא רחום)',
    match: /והוא\s+רחום|ליום\s+שני|יום\s+שני\s+וחמישי/,
    when: (ctx) => ctx.mondayThursday,
  },
  {
    id: 'omit_ashrei_lamenatzeach_no_tachanun',
    section: 'ashrei',
    kind: 'omit',
    name: 'Lamenatzeach when no Tachanun',
    match: /למנצח/,
    when: (ctx) => ctx.tachanun,
  },
  {
    id: 'omit_korbanot_rosh_chodesh_addon',
    section: 'korbanot',
    kind: 'omit',
    name: 'Korbanot Rosh Chodesh add-on',
    match: /בראש\s+חודש\s+מוסיפים|ובראשי\s+חדשיכם/,
    when: (ctx) => ctx.roshChodesh,
  },
  {
    id: 'omit_concluding_barchi_nafshi',
    section: 'concluding',
    kind: 'omit',
    name: 'Barchi Nafshi (Rosh Chodesh)',
    match: /ברכי\s+נפשי/,
    when: (ctx) => ctx.roshChodesh,
  },
  {
    id: 'omit_concluding_ledavid',
    section: 'concluding',
    kind: 'omit',
    name: 'LeDavid Ori (Elul–Hoshana Rabbah season)',
    match: /לדוד\s+יהוה\s+אורי[\s\S]*אורי\s+וישעי/,
    when: (ctx) => ctx.ledavidSeason,
  },
  {
    id: 'seasonal_swap_song_of_the_day',
    section: 'concluding',
    kind: 'seasonal_swap',
    name: 'Song of the day — keep today only',
    match: /שיר\s+של\s+יום|יום\s+ראשון/,
    note: 'Applied specially in applyShacharitContentSets (pickSongOfTheDay).',
  },

  // —— Highlight (Amidah day inserts — shared amidahSeasonal) ——
  {
    id: 'highlight_amidah_day_inserts',
    section: 'amidah',
    kind: 'highlight',
    name: 'Amidah day-only inserts',
    note: 'segmentHebrewWithSeasonalHighlights / AMIDAH_SEASONAL_CATALOG (dayOnlyInsert).',
  },
];

export function buildShacharitGateCtx(date: Date): ShacharitContentGateCtx {
  return {
    date,
    tachanun: JewishCalendarService.isTachanunSaid(date),
    aseret: JewishCalendarService.isAseretYemeiTeshuva(date),
    roshChodesh: JewishCalendarService.isRoshChodesh(date),
    ledavidSeason: JewishCalendarService.isLedavidAfterTefillahSeason(date),
    fastOrAseret:
      JewishCalendarService.isFastDay(date) || JewishCalendarService.isAseretYemeiTeshuva(date),
    mondayThursday: date.getDay() === 1 || date.getDay() === 4,
  };
}

export function getShacharitFoldoutsForSection(
  sectionKey: ShacharitSectionKey
): readonly ShacharitContentSet[] {
  return SHACHARIT_CONTENT_SETS.filter(
    (s) => s.kind === 'foldout' && (s.attachTo === sectionKey || s.section === sectionKey)
  );
}

/**
 * Apply omit / seasonal_swap sets for a section. Foldouts and Amidah highlights
 * are handled elsewhere (service + amidahSeasonal).
 */
export function applyShacharitContentSets(
  sectionKey: string,
  hebrew: string,
  english: string,
  ctx: ShacharitContentGateCtx
): { hebrew: string; english: string } {
  let h = hebrew;
  let e = english;

  const omitSets = SHACHARIT_CONTENT_SETS.filter(
    (s) => s.kind === 'omit' && s.section === sectionKey && s.match
  );

  if (omitSets.length) {
    const hp = splitParas(h);
    if (hp.length) {
      // Special: Ashkenaz tachanun leaf-index fallback when match is ambiguous
      if (sectionKey === 'tachanun' && hp.length >= 4) {
        const keep = hp.map((_, i) => {
          if (i === 1 && !ctx.fastOrAseret) return false;
          if (i === 2 && !ctx.mondayThursday) return false;
          return true;
        });
        ({ hebrew: h, english: e } = keepParas(h, e, keep));
      } else if (sectionKey === 'ashrei' && hp.length >= 3) {
        const keep = hp.map((p, i) => {
          const st = stripNik(p);
          if ((i === 1 || /למנצח/.test(st)) && !ctx.tachanun) {
            return i === 1 ? false : !/למנצח\s+מזמור/.test(st);
          }
          return true;
        });
        ({ hebrew: h, english: e } = keepParas(h, e, keep));
      } else {
        const keep = hp.map((p) => {
          const st = stripNik(p);
          for (const set of omitSets) {
            if (!set.match?.test(st)) continue;
            const show = set.when?.(ctx) ?? true;
            if (!show) return false;
          }
          return true;
        });
        if (keep.some((k) => k === false)) {
          ({ hebrew: h, english: e } = keepParas(h, e, keep));
        }
      }
    }
  }

  // Pesukei ממעמקים (Aseret): delete rubric always; keep psalm only on Aseret; strip "ואומר" before Kaddish
  if (sectionKey === 'pesukei_dzimra') {
    ({ hebrew: h, english: e } = applyPesukeiDzimraAseretMimaamakim(h, e, ctx.aseret));
  }

  // Song of the day swap (Hebrew + English)
  if (sectionKey === 'concluding') {
    const hp = splitParas(h);
    const ep = splitParas(e);
    const hOut: string[] = [];
    const eOut: string[] = [];
    for (let i = 0; i < hp.length; i++) {
      const st = stripNik(hp[i]);
      const isSong = /שיר\s+של\s+יום|יום\s+ראשון/.test(st) && /יום\s+שני/.test(st);
      if (isSong) {
        hOut.push(pickSongOfTheDay(hp[i], ctx.date));
        if (ep[i]) eOut.push(pickSongOfTheDayEnglish(ep[i], ctx.date));
        continue;
      }
      hOut.push(hp[i]);
      if (ep[i]) eOut.push(ep[i]);
    }
    h = hOut.join('\n\n');
    e = eOut.join('\n\n');
  }

  // Always drop leftover seasonal rubrics after omit/swap
  return stripLibrarySeasonalRubrics(h, e);
}
