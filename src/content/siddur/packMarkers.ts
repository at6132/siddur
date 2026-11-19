/**
 * Local pack markers — mark seasonal / foldout spans in raw.ts (no phrase hunting).
 *
 * Syntax (plain text, stripped before display):
 *   {{gate:aseret}}…{{/gate}}
 *   {{gate:tachanun}}…{{/gate}}
 *   {{fold:birchot_expansion}}…{{/fold}}
 *
 * Gate ids: aseret | tachanun | fast_or_aseret | rosh_chodesh | ledavid |
 *           monday_thursday | yaaleh | al_hanissim | omer | motzaei_shabbat
 *
 * When the gate is false, the block is removed. When true, markers are stripped
 * and the inner text is highlighted (seasonalHighlight).
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
  | 'motzaei_shabbat';

const GATE_RE = /\{\{gate:([a-z_]+)\}\}([\s\S]*?)\{\{\/gate\}\}/gi;
const FOLD_RE = /\{\{fold:([a-z_]+)\}\}([\s\S]*?)\{\{\/fold\}\}/gi;
const ANY_MARKER_RE = /\{\{(?:\/)?(?:gate|fold):?[a-z_]*\}\}/gi;

export type PackGateCtx = {
  date: Date;
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
};

export function buildPackGateCtx(date: Date = new Date()): PackGateCtx {
  const al = JewishCalendarService.isAlHanissim(date);
  return {
    date,
    aseret: JewishCalendarService.isAseretYemeiTeshuva(date),
    tachanun: JewishCalendarService.isTachanunSaid(date),
    fastOrAseret:
      JewishCalendarService.isFastDay(date) || JewishCalendarService.isAseretYemeiTeshuva(date),
    roshChodesh: JewishCalendarService.isRoshChodesh(date),
    ledavidSeason: JewishCalendarService.isLedavidAfterTefillahSeason(date),
    mondayThursday: date.getDay() === 1 || date.getDay() === 4,
    yaaleh: JewishCalendarService.isYaalehVyavoDay(date),
    alHanissim: al === 'chanukah' || al === 'purim',
    omer: JewishCalendarService.isOmerPeriod(date),
    motzaeiShabbat: date.getDay() === 6,
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
};

export type AppliedPackMarkers = {
  hebrew: string;
  english: string;
  /** Spans in the final hebrew string to highlight */
  highlightSpans: { start: number; end: number; label?: string }[];
  folds: Record<string, { hebrew: string; english: string }>;
};

/**
 * Apply gate/fold markers. Safe on packs with no markers (pass-through).
 */
export function applyPackMarkers(
  hebrew: string,
  english: string,
  ctx: PackGateCtx = buildPackGateCtx()
): AppliedPackMarkers {
  const folds: Record<string, { hebrew: string; english: string }> = {};
  const highlightSpans: AppliedPackMarkers['highlightSpans'] = [];

  const applyGates = (text: string, trackHighlights: boolean): string => {
    let out = '';
    let last = 0;
    const re = new RegExp(GATE_RE.source, 'gi');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      out += text.slice(last, m.index);
      const id = m[1].toLowerCase();
      const inner = m[2].replace(/^\n+|\n+$/g, '');
      if (gateOpen(id, ctx)) {
        if (trackHighlights && inner.trim()) {
          const start = out.length;
          out += inner;
          highlightSpans.push({
            start,
            end: out.length,
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

  const extractFolds = (text: string): string => {
    let out = text;
    const re = new RegExp(FOLD_RE.source, 'gi');
    let m: RegExpExecArray | null;
    const collected: { id: string; inner: string; full: string }[] = [];
    while ((m = re.exec(text)) !== null) {
      collected.push({ id: m[1].toLowerCase(), inner: m[2].trim(), full: m[0] });
    }
    for (const c of collected) {
      if (!folds[c.id]) folds[c.id] = { hebrew: '', english: '' };
      folds[c.id].hebrew = c.inner;
      out = out.replace(c.full, '');
    }
    return out.replace(/\n{3,}/g, '\n\n').trim();
  };

  let h = extractFolds(hebrew);
  let e = english || '';
  // English folds: same ids if present
  {
    const re = new RegExp(FOLD_RE.source, 'gi');
    let m: RegExpExecArray | null;
    while ((m = re.exec(e)) !== null) {
      const id = m[1].toLowerCase();
      if (!folds[id]) folds[id] = { hebrew: '', english: '' };
      folds[id].english = m[2].trim();
      e = e.replace(m[0], '');
    }
  }

  h = applyGates(h, true);
  e = applyGates(e, false);

  // Strip any leftover malformed markers
  h = h.replace(ANY_MARKER_RE, '');
  e = e.replace(ANY_MARKER_RE, '');

  return {
    hebrew: h.replace(/\n{3,}/g, '\n\n').trim(),
    english: e.replace(/\n{3,}/g, '\n\n').trim(),
    highlightSpans,
    folds,
  };
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
