/**
 * Local pack markers — mark seasonal / foldout spans in raw.ts (no phrase hunting).
 *
 * Syntax (plain text, stripped before display):
 *   {{gate:aseret}}…{{/gate}}
 *   {{gate:tachanun}}…{{/gate}}
 *   {{fold:birchot_expansion}}…{{/fold}}
 *
 * Gate ids: aseret | tachanun | fast_or_aseret | rosh_chodesh | ledavid |
 *           monday_thursday | yaaleh | al_hanissim | omer | motzaei_shabbat |
 *           mashiv | morid_tal | vten_bracha | vten_tal | chanukah | purim |
 *           aneinu | nachem | year_round |
 *           sunday | monday | tuesday | wednesday | thursday | friday |
 *           yaaleh_rosh_chodesh | yaaleh_pesach | yaaleh_sukkot |
 *           yaaleh_shavuot | yaaleh_yom_kippur | yaaleh_shemini
 *
 * When the gate is false, the block is removed. When true, markers are stripped.
 * Only *seasonal insert* gates (aseret, yaaleh, …) get a reader pin highlight.
 * Default-most-days omit gates (tachanun, year_round, weekday song, …) show as
 * normal text when open — no pin box.
 */

import { JewishCalendarService } from '../../core/calendar/JewishCalendar';
import type { PrayerTextSegment } from './prayerTextTypes';

export type PackGateId =
  | 'aseret'
  | 'tachanun'
  | 'fast_or_aseret'
  | 'rosh_chodesh'
  | 'ledavid'
  | 'monday_thursday'
  | 'yaaleh'
  | 'al_hanissim'
  | 'omer'
  | 'motzaei_shabbat'
  | 'mashiv'
  | 'morid_tal'
  | 'vten_bracha'
  | 'vten_tal'
  | 'chanukah'
  | 'purim'
  | 'aneinu'
  | 'nachem'
  | 'year_round'
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'yaaleh_rosh_chodesh'
  | 'yaaleh_pesach'
  | 'yaaleh_sukkot'
  | 'yaaleh_shavuot'
  | 'yaaleh_yom_kippur'
  | 'yaaleh_shemini';

const GATE_RE = /\{\{gate:([a-z_]+)\}\}([\s\S]*?)\{\{\/gate\}\}/gi;
const FOLD_RE = /\{\{fold:([a-z_]+)\}\}([\s\S]*?)\{\{\/fold\}\}/gi;
const ANY_MARKER_RE = /\{\{(?:\/)?(?:gate|fold):?[a-z_]*\}\}/gi;

export type PackGateCtx = {
  date: Date;
  isIsrael: boolean;
  aseret: boolean;
  tachanun: boolean;
  fastOrAseret: boolean;
  roshChodesh: boolean;
  ledavidSeason: boolean;
  mondayThursday: boolean;
  yaaleh: boolean;
  alHanissim: boolean;
  omer: boolean;
  motzaeiShabbat: boolean;
  mashiv: boolean;
  moridTal: boolean;
  vtenBracha: boolean;
  vtenTal: boolean;
  chanukah: boolean;
  purim: boolean;
  aneinu: boolean;
  nachem: boolean;
  yearRound: boolean;
  yaalehRoshChodesh: boolean;
  yaalehPesach: boolean;
  yaalehSukkot: boolean;
  yaalehShavuot: boolean;
  yaalehYomKippur: boolean;
  yaalehShemini: boolean;
  sunday: boolean;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
};

export function buildPackGateCtx(
  date: Date = new Date(),
  isIsrael: boolean = false
): PackGateCtx {
  const al = JewishCalendarService.isAlHanissim(date);
  const mashiv = JewishCalendarService.isMashivHaruach(date);
  const vtenTal = JewishCalendarService.isVtenTalUmatar(date, isIsrael);
  const yaalehPhrase = JewishCalendarService.getYaalehVyavoPhrase(date);
  const aseret = JewishCalendarService.isAseretYemeiTeshuva(date);
  return {
    date,
    isIsrael,
    aseret,
    tachanun: JewishCalendarService.isTachanunSaid(date),
    fastOrAseret: JewishCalendarService.isFastDay(date) || aseret,
    roshChodesh: JewishCalendarService.isRoshChodesh(date),
    ledavidSeason: JewishCalendarService.isLedavidAfterTefillahSeason(date),
    mondayThursday: date.getDay() === 1 || date.getDay() === 4,
    yaaleh: JewishCalendarService.isYaalehVyavoDay(date),
    alHanissim: al === 'chanukah' || al === 'purim',
    omer: JewishCalendarService.isOmerPeriod(date),
    motzaeiShabbat: date.getDay() === 6,
    mashiv,
    moridTal: !mashiv,
    vtenBracha: !vtenTal,
    vtenTal,
    chanukah: al === 'chanukah',
    purim: al === 'purim',
    aneinu: JewishCalendarService.isFastDay(date),
    nachem: JewishCalendarService.isTishaBAv(date),
    yearRound: !aseret,
    yaalehRoshChodesh: yaalehPhrase === 'ראש החודש',
    yaalehPesach: yaalehPhrase === 'חג המצות',
    yaalehSukkot: yaalehPhrase === 'חג הסוכות',
    yaalehShavuot: yaalehPhrase === 'חג השבועות',
    yaalehYomKippur: yaalehPhrase === 'הכפורים',
    yaalehShemini: yaalehPhrase === 'שמיני עצרת',
    sunday: date.getDay() === 0,
    monday: date.getDay() === 1,
    tuesday: date.getDay() === 2,
    wednesday: date.getDay() === 3,
    thursday: date.getDay() === 4,
    friday: date.getDay() === 5,
  };
}

function gateOpen(id: string, ctx: PackGateCtx): boolean {
  switch (id as PackGateId) {
    case 'aseret':
      return ctx.aseret;
    case 'tachanun':
      return ctx.tachanun;
    case 'fast_or_aseret':
      return ctx.fastOrAseret;
    case 'rosh_chodesh':
      return ctx.roshChodesh;
    case 'ledavid':
      return ctx.ledavidSeason;
    case 'monday_thursday':
      return ctx.mondayThursday;
    case 'yaaleh':
      return ctx.yaaleh;
    case 'al_hanissim':
      return ctx.alHanissim;
    case 'omer':
      return ctx.omer;
    case 'motzaei_shabbat':
      return ctx.motzaeiShabbat;
    case 'mashiv':
      return ctx.mashiv;
    case 'morid_tal':
      return ctx.moridTal;
    case 'vten_bracha':
      return ctx.vtenBracha;
    case 'vten_tal':
      return ctx.vtenTal;
    case 'chanukah':
      return ctx.chanukah;
    case 'purim':
      return ctx.purim;
    case 'aneinu':
      return ctx.aneinu;
    case 'nachem':
      return ctx.nachem;
    case 'year_round':
      return ctx.yearRound;
    case 'yaaleh_rosh_chodesh':
      return ctx.yaalehRoshChodesh;
    case 'yaaleh_pesach':
      return ctx.yaalehPesach;
    case 'yaaleh_sukkot':
      return ctx.yaalehSukkot;
    case 'yaaleh_shavuot':
      return ctx.yaalehShavuot;
    case 'yaaleh_yom_kippur':
      return ctx.yaalehYomKippur;
    case 'yaaleh_shemini':
      return ctx.yaalehShemini;
    case 'sunday':
      return ctx.sunday;
    case 'monday':
      return ctx.monday;
    case 'tuesday':
      return ctx.tuesday;
    case 'wednesday':
      return ctx.wednesday;
    case 'thursday':
      return ctx.thursday;
    case 'friday':
      return ctx.friday;
    default:
      return true;
  }
}

const GATE_LABELS: Partial<Record<PackGateId, string>> = {
  aseret: 'עשי״ת',
  tachanun: 'תחנון',
  fast_or_aseret: 'תענית / עשי״ת',
  rosh_chodesh: 'ראש חודש',
  ledavid: 'לדוד אורי',
  monday_thursday: 'ב׳ / ה׳',
  yaaleh: 'יעלה ויבא',
  al_hanissim: 'על הנסים',
  omer: 'ספירת העומר',
  motzaei_shabbat: 'מוצאי שבת',
  mashiv: 'משיב הרוח',
  morid_tal: 'מוריד הטל',
  vten_bracha: 'ותן ברכה',
  vten_tal: 'ותן טל ומטר',
  chanukah: 'חנוכה',
  purim: 'פורים',
  aneinu: 'עננו',
  nachem: 'נחם',
  year_round: 'כל השנה',
  yaaleh_rosh_chodesh: 'ר״ח',
  yaaleh_pesach: 'פסח',
  yaaleh_sukkot: 'סוכות',
  yaaleh_shavuot: 'שבועות',
  yaaleh_yom_kippur: 'יוה״כ',
  yaaleh_shemini: 'שמיני עצרת',
  sunday: 'יום א׳',
  monday: 'יום ב׳',
  tuesday: 'יום ג׳',
  wednesday: 'יום ד׳',
  thursday: 'יום ה׳',
  friday: 'יום ו׳',
};

/**
 * Gates that pin-highlight when open (day-only / seasonal inserts & swaps).
 * Omit-only defaults (tachanun / year_round / weekday song / …) are intentionally
 * absent — they still show/hide, but read as normal body text when present.
 */
const HIGHLIGHT_WHEN_OPEN = new Set<PackGateId>([
  'aseret',
  'fast_or_aseret',
  'rosh_chodesh',
  'ledavid',
  'monday_thursday',
  'yaaleh',
  'al_hanissim',
  'omer',
  'motzaei_shabbat',
  'mashiv',
  'morid_tal',
  'vten_bracha',
  'vten_tal',
  'chanukah',
  'purim',
  'aneinu',
  'nachem',
  'yaaleh_rosh_chodesh',
  'yaaleh_pesach',
  'yaaleh_sukkot',
  'yaaleh_shavuot',
  'yaaleh_yom_kippur',
  'yaaleh_shemini',
]);

function gateShouldHighlight(id: string): boolean {
  return HIGHLIGHT_WHEN_OPEN.has(id as PackGateId);
}

export type PackFoldPiece = {
  hebrew: string;
  english: string;
  /** Text before this fold (gated stream). */
  prefixHebrew?: string;
  suffixHebrew?: string;
  prefixEnglish?: string;
  suffixEnglish?: string;
};

export type AppliedPackMarkers = {
  hebrew: string;
  english: string;
  /** Spans in the gated stream (before fold peel) — prefer `openedGateSnippets` after peels. */
  highlightSpans: { start: number; end: number; label?: string }[];
  /** Open gate inners (for re-highlighting after fold peel). */
  openedGateSnippets: { text: string; label?: string }[];
  folds: Record<string, PackFoldPiece>;
};

/**
 * Apply gate/fold markers. Safe on packs with no markers (pass-through).
 * Order: resolve {{gate}} first (including inside folds), then peel {{fold}} left-to-right
 * so kedusha / modim_derabanan keep prefix + suffix for the reader.
 * Optional `isIsrael` rebuilds rain gates (vten_*) when it differs from `ctx.isIsrael`.
 */
export function applyPackMarkers(
  hebrew: string,
  english: string,
  ctx: PackGateCtx = buildPackGateCtx(),
  isIsrael?: boolean
): AppliedPackMarkers {
  const resolved =
    isIsrael === undefined || isIsrael === ctx.isIsrael
      ? ctx
      : buildPackGateCtx(ctx.date, isIsrael);

  const folds: Record<string, PackFoldPiece> = {};
  const highlightSpans: AppliedPackMarkers['highlightSpans'] = [];
  const openedGateSnippets: AppliedPackMarkers['openedGateSnippets'] = [];

  const applyGates = (text: string, trackHighlights: boolean): string => {
    let out = '';
    let last = 0;
    const re = new RegExp(GATE_RE.source, 'gi');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      out += text.slice(last, m.index);
      const id = m[1].toLowerCase();
      const inner = m[2].replace(/^\n+|\n+$/g, '');
      if (gateOpen(id, resolved)) {
        if (trackHighlights && gateShouldHighlight(id) && inner.trim()) {
          const start = out.length;
          out += inner;
          highlightSpans.push({
            start,
            end: out.length,
            label: GATE_LABELS[id as PackGateId],
          });
          openedGateSnippets.push({
            text: inner,
            label: GATE_LABELS[id as PackGateId],
          });
        } else {
          out += inner;
        }
      }
      last = m.index + m[0].length;
    }
    out += text.slice(last);
    return out.replace(/\n{3,}/g, '\n\n');
  };

  /**
   * Peel folds left-to-right. Each fold's prefix/suffix is relative to the stream
   * after earlier folds were removed (so kedusha then modim → modim.prefix is the
   * between-block, not Avot). Final main = all prefixes + last suffix.
   */
  const peelFolds = (text: string, lang: 'hebrew' | 'english'): string => {
    let stream = text;
    const prefixes: string[] = [];
    const re = new RegExp(FOLD_RE.source, 'gi');
    let m: RegExpExecArray | null;
    while ((m = re.exec(stream)) !== null) {
      const id = m[1].toLowerCase();
      const inner = m[2].trim();
      const prefix = stream.slice(0, m.index).replace(/\n{3,}/g, '\n\n').trimEnd();
      const suffix = stream
        .slice(m.index + m[0].length)
        .replace(/\n{3,}/g, '\n\n')
        .trimStart();
      if (!folds[id]) folds[id] = { hebrew: '', english: '' };
      if (lang === 'hebrew') {
        folds[id].hebrew = inner;
        folds[id].prefixHebrew = prefix;
        folds[id].suffixHebrew = suffix;
      } else {
        folds[id].english = inner;
        folds[id].prefixEnglish = prefix;
        folds[id].suffixEnglish = suffix;
      }
      prefixes.push(prefix);
      stream = suffix;
      re.lastIndex = 0;
    }
    return [...prefixes, stream]
      .filter((p) => p.trim())
      .join('\n\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  // Gates first so fold inners are calendar-shaped too
  let h = applyGates(hebrew, true);
  let e = applyGates(english || '', false);

  h = peelFolds(h, 'hebrew');
  e = peelFolds(e, 'english');

  // Mid-body folds (kedusha / modim): main stream should be the last suffix chain.
  // peelFolds already concatenates prefix+suffix into `h`/`e` for unknown consumers;
  // resolveMarkedText prefers fold.prefix/suffix fields when present.

  h = h.replace(ANY_MARKER_RE, '');
  e = e.replace(ANY_MARKER_RE, '');

  return {
    hebrew: h.replace(/\n{3,}/g, '\n\n').trim(),
    english: e.replace(/\n{3,}/g, '\n\n').trim(),
    highlightSpans,
    openedGateSnippets,
    folds,
  };
}

/** Locate opened gate snippets inside a post-peel string for reader highlights. */
export function spansFromOpenedGates(
  hebrew: string,
  snippets: AppliedPackMarkers['openedGateSnippets']
): AppliedPackMarkers['highlightSpans'] {
  const spans: AppliedPackMarkers['highlightSpans'] = [];
  for (const sn of snippets) {
    const needle = sn.text.trim();
    if (!needle || needle.length < 2) continue;
    let from = 0;
    while (from < hebrew.length) {
      const i = hebrew.indexOf(needle, from);
      if (i === -1) break;
      spans.push({ start: i, end: i + needle.length, label: sn.label });
      from = i + needle.length;
    }
  }
  spans.sort((a, b) => a.start - b.start || b.end - a.end);
  return spans;
}

/** Merge marker highlight spans onto existing segments (or build from plain text). */
export function mergeMarkerHighlights(
  hebrew: string,
  baseSegments: PrayerTextSegment[] | undefined,
  spans: AppliedPackMarkers['highlightSpans']
): PrayerTextSegment[] {
  if (!spans.length) {
    return baseSegments?.length ? baseSegments : [{ text: hebrew, italic: false }];
  }

  // Flatten base to plain if needed, then re-segment with all highlight ranges
  type R = { start: number; end: number; label?: string };
  const ranges: R[] = [...spans];
  if (baseSegments?.some((s) => s.seasonalHighlight)) {
    let pos = 0;
    for (const seg of baseSegments) {
      if (seg.seasonalHighlight) {
        ranges.push({ start: pos, end: pos + seg.text.length, label: seg.seasonalLabel });
      }
      pos += seg.text.length;
    }
  }
  ranges.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: R[] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r.start < last.end) {
      last.end = Math.max(last.end, r.end);
      if (!last.label && r.label) last.label = r.label;
      continue;
    }
    merged.push({ ...r });
  }

  const out: PrayerTextSegment[] = [];
  let cursor = 0;
  for (const r of merged) {
    if (r.start > cursor) out.push({ text: hebrew.slice(cursor, r.start), italic: false });
    out.push({
      text: hebrew.slice(r.start, r.end),
      italic: false,
      seasonalHighlight: true,
      seasonalLabel: r.label,
    });
    cursor = r.end;
  }
  if (cursor < hebrew.length) out.push({ text: hebrew.slice(cursor), italic: false });
  return out.filter((s) => s.text.length > 0);
}

/** True if pack text still uses legacy (no markers) — callers may keep phrase fallbacks. */
export function packHasMarkers(text: string): boolean {
  return /\{\{(?:gate|fold):/i.test(text);
}
