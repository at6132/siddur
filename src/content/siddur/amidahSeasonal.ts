/**
 * Weekday Amidah — day/season-gated liturgy catalog + highlight segment marking.
 *
 * Shared by Shacharit, Mincha, and Maariv (Ashkenaz + Sfard). Text gating still runs
 * through AmidahTextPipeline; this module is the registry + Yaaleh occasion trim +
 * reader highlight helpers. Slot opts suppress inserts that do not belong to that tefilla
 * (e.g. נחם Mincha-only; אתה חוננתנו Maariv Motzaei Shabbat-only).
 *
 * Day boundaries: device-local Gregorian → `new HDate(date)` (no sunset flip).
 */

import { JewishCalendarService } from '../../core/calendar/JewishCalendar';
import type { PrayerTextSegment } from '../../services/SefariaService';

export type AmidahSlot = 'shacharit' | 'mincha' | 'maariv';

export type AmidahSeasonalKind =
  | 'gevuros_swap'
  | 'birkas_hashanim_swap'
  | 'yaaleh_veyavo'
  | 'al_hanissim'
  | 'aneinu'
  | 'nachem'
  | 'aseret_insertions'
  | 'aseret_chatimot'
  | 'peace_bracha_fast'
  | 'havdalah_atah_chonantanu';

export type AmidahSeasonalCatalogEntry = {
  id: AmidahSeasonalKind;
  name: string;
  hebrewFocus: string;
  where: string;
  when: string;
  gate: string;
  /**
   * true = only on certain days (highlight the whole insert when present).
   * false = year-round swap of a short phrase (no highlight box — always one of two).
   */
  dayOnlyInsert: boolean;
  /** Which Amidah slots may show this insert */
  slots: readonly AmidahSlot[];
  locationNote?: string;
  dayBoundaryNote: string;
};

/** Full inventory of Amidah seasonal / day-specific liturgy we configure. */
export const AMIDAH_SEASONAL_CATALOG: readonly AmidahSeasonalCatalogEntry[] = [
  {
    id: 'gevuros_swap',
    name: 'Mashiv Haruach (Ashkenaz) / summer silence',
    hebrewFocus: 'משיב הרוח ומוריד הגשם ↔ (Ashkenaz summer: silence; Sfard: מוריד הטל)',
    where: 'Gevuros (2nd bracha)',
    when:
      'Winter (Mashiv): from 22 Tishrei through 14 Nisan. Summer Ashkenaz: neither phrase. (Traditional switch is Musaf; we use the Hebrew calendar day for simplicity.)',
    gate: 'pack.policy.sayMoridHatalInSummer + JewishCalendarService.isMashivHaruach',
    dayOnlyInsert: false,
    slots: ['shacharit', 'mincha', 'maariv'],
    dayBoundaryNote: 'Local device date → HDate. No sunset flip.',
  },
  {
    id: 'peace_bracha_fast',
    name: 'Shalom Rav vs Sim Shalom (Mincha)',
    hebrewFocus: 'שלום רב ↔ שים שלום',
    where: 'Last bracha (peace)',
    when: 'Ashkenaz weekday Mincha: שלום רב; public-fast Mincha: שים שלום instead.',
    gate: 'JewishCalendarService.isFastDay + amidahSlot mincha + pack.policy.minchaPeaceBrachaSwapOnPublicFast',
    dayOnlyInsert: true,
    slots: ['mincha'],
    dayBoundaryNote: 'Local Hebrew day (same as Aneinu).',
  },
  {
    id: 'birkas_hashanim_swap',
    name: "V'ten Bracha / V'ten Tal U'Matar",
    hebrewFocus: 'ותן ברכה ↔ ותן טל ומטר לברכה',
    where: "Birkat HaShanim (9th bracha)",
    when:
      "Rain request (טל ומטר) in winter request season; otherwise summer 'ותן ברכה'. Ends 15 Nisan (Pesach).",
    gate: 'JewishCalendarService.isVtenTalUmatar(date, isIsrael)',
    dayOnlyInsert: false,
    slots: ['shacharit', 'mincha', 'maariv'],
    locationNote:
      'Israel: from 7 Cheshvan. Diaspora: from 4 Dec (5 Dec when the following civil year is a leap year). isIsrael from device lat/lon bbox (29.3–33.5N, 34.05–35.9E).',
    dayBoundaryNote: 'Local civil + Hebrew date. Diaspora Dec start uses local midnight, not Maariv.',
  },
  {
    id: 'yaaleh_veyavo',
    name: "Yaaleh V'Yavo",
    hebrewFocus: 'יעלה ויבא',
    where: 'Temple service / Retzei (avodah)',
    when:
      'Rosh Chodesh; Chol HaMoed; Yom Kippur; Pesach 15–16; Shavuot 6–7; Sukkot 15–16 + Chol + Hoshanah Rabbah; Shemini Atzeret / Simchat Torah 22–23 Tishrei.',
    gate: 'JewishCalendarService.isYaalehVyavoDay + getYaalehVyavoPhrase (today’s occasion line)',
    dayOnlyInsert: true,
    slots: ['shacharit', 'mincha', 'maariv'],
    dayBoundaryNote: 'Local Hebrew day. Multi-occasion phrases collapsed to today’s line when detectable.',
  },
  {
    id: 'al_hanissim',
    name: 'Al HaNissim',
    hebrewFocus: 'על הנסים (חנוכה / פורים)',
    where: 'Modim (Thanksgiving)',
    when: 'Chanukah (8 days) or Purim / Shushan Purim (14–15 Adar; Adar II in leap years).',
    gate: "JewishCalendarService.isAlHanissim → 'chanukah' | 'purim' | false",
    dayOnlyInsert: true,
    slots: ['shacharit', 'mincha', 'maariv'],
    dayBoundaryNote: 'Chanukah day count uses Kislev length so day 8 is never an extra Tevet day.',
  },
  {
    id: 'aneinu',
    name: 'Aneinu',
    hebrewFocus: 'עננו',
    where: 'Shomea Tefilla (before chatima on public fasts)',
    when:
      'Public fasts (silent Amidah): mainly Mincha. Packs may omit from Shacharit (individual minhag); never Maariv.',
    gate: 'JewishCalendarService.isFastDay + amidahSlot !== maariv',
    dayOnlyInsert: true,
    slots: ['shacharit', 'mincha'],
    dayBoundaryNote: 'Local Hebrew day; postponed fasts (Gedaliah / 17 Tammuz / Tisha B’Av / Ta’anit Esther).',
  },
  {
    id: 'nachem',
    name: 'Nachem',
    hebrewFocus: 'נחם … מנחם ציון ובונה ירושלים',
    where: 'Boneh Yerushalayim (only Mincha on the fast)',
    when: 'Tisha B’Av afternoon (incl. postponed day). Not Shacharit / Maariv.',
    gate: "isTishaBAv && amidahSlot === 'mincha'",
    dayOnlyInsert: true,
    slots: ['mincha'],
    dayBoundaryNote: 'Mincha-only gate in AmidahTextPipeline + postponed 9→10 Av.',
  },
  {
    id: 'aseret_insertions',
    name: 'Aseret Yemei Teshuva insertions',
    hebrewFocus: 'זכרנו / מי כמוך אב הרחמן (and related lines)',
    where: 'Scattered (esp. first brachot / Zochreinu)',
    when: '1–10 Tishrei (Rosh Hashana through Yom Kippur inclusive).',
    gate: 'JewishCalendarService.isAseretYemeiTeshuva',
    dayOnlyInsert: true,
    slots: ['shacharit', 'mincha', 'maariv'],
    dayBoundaryNote: 'Full Tishrei 1–10 on local HDate.',
  },
  {
    id: 'aseret_chatimot',
    name: 'Aseret chatimot',
    hebrewFocus: 'המלך הקדוש / המלך המשפט',
    where: '3rd & 4th bracha endings (vs year-round האל הקדוש / מלך אוהב…)',
    when: '1–10 Tishrei',
    gate: 'JewishCalendarService.isAseretYemeiTeshuva',
    dayOnlyInsert: true,
    slots: ['shacharit', 'mincha', 'maariv'],
    dayBoundaryNote: 'Local HDate Tishrei 1–10.',
  },
  {
    id: 'havdalah_atah_chonantanu',
    name: 'Atah Chonantanu (Motzaei Shabbat)',
    hebrewFocus: 'אתה חוננתנו',
    where: 'Chonen HaDaat (4th bracha)',
    when: 'Maariv on Saturday night only (weekday Maariv after Shabbat).',
    gate: 'date.getDay() === 6 && amidahSlot === maariv',
    dayOnlyInsert: true,
    slots: ['maariv'],
    dayBoundaryNote: 'Civil Saturday (Motzaei Shabbat Maariv), not Hebrew-day sunset flip.',
  },
];

/** @deprecated Prefer AMIDAH_SEASONAL_CATALOG — kept for Mincha re-exports. */
export const MINCHA_SEASONAL_CATALOG = AMIDAH_SEASONAL_CATALOG.filter((e) =>
  e.slots.includes('mincha')
);

export type MinchaSeasonalKind = AmidahSeasonalKind;
export type MinchaSeasonalCatalogEntry = AmidahSeasonalCatalogEntry;

function stripNikkud(s: string): string {
  return s.replace(/[\u0591-\u05C7]/g, '');
}

function buildDenikkudMap(s: string): { flat: string; orig: number[] } {
  let flat = '';
  const orig: number[] = [];
  for (let i = 0; i < s.length; i++) {
    if (/[\u0591-\u05C7]/.test(s[i])) continue;
    flat += s[i];
    orig.push(i);
  }
  return { flat, orig };
}

function mapSpan(orig: number[], flatStart: number, flatEnd: number, fullLen: number): [number, number] {
  const a = orig[flatStart] ?? flatStart;
  const b =
    flatEnd <= 0
      ? a
      : flatEnd >= orig.length
        ? fullLen
        : (orig[flatEnd - 1] ?? fullLen) + 1;
  return [a, b];
}

export type ActiveAmidahSeasonal = {
  kind: AmidahSeasonalKind;
  label: string;
};

export type ActiveMinchaSeasonal = ActiveAmidahSeasonal;

export type AmidahSeasonalOpts = {
  amidahSlot?: AmidahSlot;
  isIsrael?: boolean;
};

/** Which day-only inserts are live for `date` + Amidah slot. */
export function getActiveAmidahDayOnlyInserts(
  date: Date = new Date(),
  opts?: AmidahSeasonalOpts
): ActiveAmidahSeasonal[] {
  void opts?.isIsrael;
  const slot: AmidahSlot = opts?.amidahSlot ?? 'mincha';
  const out: ActiveAmidahSeasonal[] = [];

  if (JewishCalendarService.isYaalehVyavoDay(date)) {
    const phrase = JewishCalendarService.getYaalehVyavoPhrase(date);
    out.push({
      kind: 'yaaleh_veyavo',
      label: phrase ? `יעלה ויבא · ${phrase}` : 'יעלה ויבא',
    });
  }
  const al = JewishCalendarService.isAlHanissim(date);
  if (al === 'chanukah') out.push({ kind: 'al_hanissim', label: 'על הנסים · חנוכה' });
  if (al === 'purim') out.push({ kind: 'al_hanissim', label: 'על הנסים · פורים' });

  if (JewishCalendarService.isFastDay(date) && slot !== 'maariv') {
    out.push({ kind: 'aneinu', label: 'עננו' });
    if (slot === 'mincha') {
      out.push({ kind: 'peace_bracha_fast', label: 'שים שלום (תענית)' });
    }
  }
  if (JewishCalendarService.isTishaBAv(date) && slot === 'mincha') {
    out.push({ kind: 'nachem', label: 'נחם' });
  }
  if (JewishCalendarService.isAseretYemeiTeshuva(date)) {
    out.push({ kind: 'aseret_insertions', label: 'עשי״ת · תוספות' });
    out.push({ kind: 'aseret_chatimot', label: 'עשי״ת · חתימות' });
  }
  if (slot === 'maariv' && date.getDay() === 6) {
    out.push({ kind: 'havdalah_atah_chonantanu', label: 'אתה חוננתנו' });
  }
  return out;
}

/** Mincha convenience wrapper (same as getActiveAmidahDayOnlyInserts with mincha slot). */
export function getActiveMinchaDayOnlyInserts(
  date: Date = new Date(),
  opts?: { isIsrael?: boolean }
): ActiveMinchaSeasonal[] {
  return getActiveAmidahDayOnlyInserts(date, { amidahSlot: 'mincha', isIsrael: opts?.isIsrael });
}

/**
 * Prefer today’s Yaaleh occasion line if multi-option Sefaria lines remain.
 * Leaves full block if we cannot confidently split.
 */
export function trimYaalehVeyavoToTodaysPhrase(hebrew: string, date: Date = new Date()): string {
  if (!JewishCalendarService.isYaalehVyavoDay(date)) return hebrew;
  const phrase = JewishCalendarService.getYaalehVyavoPhrase(date);
  if (!phrase) return hebrew;

  const { flat, orig } = buildDenikkudMap(hebrew);
  const startCandidates = ['יעלה ויבא', 'יעלה ויבוא', 'בראש חודש ובחול המועד'];
  let iStart = -1;
  for (const c of startCandidates) {
    const i = flat.indexOf(c);
    if (i !== -1 && (iStart === -1 || i < iStart)) iStart = i;
  }
  if (iStart === -1) return hebrew;

  const endMarkers = ['כי אליך עינינו כי אל מלך חנון ורחום אתה', 'חנון ורחום אתה'];
  let iEnd = -1;
  for (const m of endMarkers) {
    const i = flat.indexOf(m, iStart);
    if (i !== -1) {
      iEnd = i + m.length;
      break;
    }
  }
  if (iEnd <= iStart) return hebrew;

  const [o0, o1] = mapSpan(orig, iStart, iEnd, hebrew.length);
  const block = hebrew.slice(o0, o1);
  const lines = block.split(/\n+/);
  if (lines.length < 3) return hebrew;

  const phraseFlat = phrase.replace(/\s+/g, '');
  const kept = lines.filter((line) => {
    const f = stripNikkud(line).replace(/\s+/g, '');
    if (!/ביום|בחג|בראש|בשמיני|בראשון/.test(f)) return true;
    return f.includes(phraseFlat) || f.includes(phrase.replace(/\s+/g, ''));
  });
  if (kept.length === 0 || kept.length === lines.length) return hebrew;
  const newBlock = kept.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return hebrew.slice(0, o0) + newBlock + hebrew.slice(o1);
}

type Span = { start: number; end: number; kind: AmidahSeasonalKind; label: string };

function findBlockSpans(hebrew: string, date: Date, slot: AmidahSlot): Span[] {
  const { flat, orig } = buildDenikkudMap(hebrew);
  const spans: Span[] = [];

  const pushIf = (startFlat: number, endFlat: number, kind: AmidahSeasonalKind, label: string) => {
    if (startFlat < 0 || endFlat <= startFlat) return;
    const [start, end] = mapSpan(orig, startFlat, endFlat, hebrew.length);
    if (end > start) spans.push({ start, end, kind, label });
  };

  if (JewishCalendarService.isYaalehVyavoDay(date)) {
    let iStart = flat.indexOf('יעלה ויבא');
    if (iStart === -1) iStart = flat.indexOf('יעלה ויבוא');
    if (iStart !== -1) {
      const endM = 'חנון ורחום אתה';
      let iEnd = flat.indexOf(endM, iStart);
      if (iEnd !== -1) iEnd += endM.length;
      else iEnd = Math.min(flat.length, iStart + 800);
      const phrase = JewishCalendarService.getYaalehVyavoPhrase(date);
      pushIf(iStart, iEnd, 'yaaleh_veyavo', phrase ? `יעלה ויבא · ${phrase}` : 'יעלה ויבא');
    }
  }

  const al = JewishCalendarService.isAlHanissim(date);
  if (al) {
    const iStart = flat.indexOf('ועל הנסים') !== -1 ? flat.indexOf('ועל הנסים') : flat.indexOf('על הנסים');
    if (iStart !== -1) {
      let iEnd = flat.indexOf('ועל הכל', iStart + 4);
      if (iEnd === -1) iEnd = flat.indexOf('וכל החיים', iStart + 4);
      if (iEnd === -1) iEnd = Math.min(flat.length, iStart + 1200);
      pushIf(
        iStart,
        iEnd,
        'al_hanissim',
        al === 'chanukah' ? 'על הנסים · חנוכה' : 'על הנסים · פורים'
      );
    }
  }

  if (JewishCalendarService.isFastDay(date) && slot !== 'maariv') {
    let iStart = flat.indexOf('עננו יהוה');
    if (iStart === -1) iStart = flat.indexOf('עננו ה');
    if (iStart === -1) iStart = flat.indexOf('עננו');
    if (iStart !== -1) {
      let iEnd = flat.indexOf('העונה לעמו ישראל בעת צרה', iStart);
      if (iEnd !== -1) iEnd += 'העונה לעמו ישראל בעת צרה'.length;
      else {
        iEnd = flat.indexOf('פודה ומציל', iStart);
        if (iEnd !== -1) iEnd = Math.min(flat.length, iEnd + 40);
        else iEnd = Math.min(flat.length, iStart + 500);
      }
      const paraStart = flat.lastIndexOf('\n\n', iStart);
      const s = paraStart === -1 ? iStart : paraStart + 2;
      pushIf(s, iEnd, 'aneinu', 'עננו');
    }
  }

  if (JewishCalendarService.isTishaBAv(date) && slot === 'mincha') {
    let iStart = flat.indexOf('נחם');
    if (iStart !== -1) {
      let iEnd = flat.indexOf('מנחם ציון ובונה ירושלים', iStart);
      if (iEnd !== -1) iEnd += 'מנחם ציון ובונה ירושלים'.length;
      else iEnd = Math.min(flat.length, iStart + 700);
      pushIf(iStart, iEnd, 'nachem', 'נחם');
    }
  }

  if (JewishCalendarService.isFastDay(date) && slot === 'mincha') {
    const iStart = flat.indexOf('שים שלום');
    if (iStart !== -1) {
      // Through chatima / next blank-ish end of peace bracha
      let iEnd = flat.indexOf('המברך את עמו ישראל בשלום', iStart);
      if (iEnd !== -1) iEnd += 'המברך את עמו ישראל בשלום'.length;
      else iEnd = Math.min(flat.length, iStart + 600);
      pushIf(iStart, iEnd, 'peace_bracha_fast', 'שים שלום (תענית)');
    }
  }

  if (slot === 'maariv' && date.getDay() === 6) {
    const iStart = flat.indexOf('אתה חוננתנו');
    if (iStart !== -1) {
      let iEnd = flat.indexOf('חננו מאתך', iStart);
      if (iEnd === -1) iEnd = Math.min(flat.length, iStart + 500);
      pushIf(iStart, iEnd, 'havdalah_atah_chonantanu', 'אתה חוננתנו');
    }
  }

  if (JewishCalendarService.isAseretYemeiTeshuva(date)) {
    for (const { needle, label } of [
      { needle: 'זכרנו לחיים', label: 'זכרנו לחיים' },
      { needle: 'מי כמוך אב הרחמן', label: 'מי כמוך אב הרחמן' },
      { needle: 'וכתוב לחיים', label: 'וכתוב לחיים' },
      { needle: 'המלך הקדוש', label: 'המלך הקדוש' },
      { needle: 'המלך המשפט', label: 'המלך המשפט' },
    ] as const) {
      let pos = 0;
      while (true) {
        const i = flat.indexOf(needle, pos);
        if (i === -1) break;
        pushIf(i, i + needle.length, 'aseret_insertions', label);
        pos = i + needle.length;
      }
    }
  }

  spans.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: Span[] = [];
  for (const s of spans) {
    const last = merged[merged.length - 1];
    if (last && s.start < last.end) {
      last.end = Math.max(last.end, s.end);
      continue;
    }
    merged.push({ ...s });
  }
  return merged;
}

/**
 * Split Hebrew into segments; day-only inserts marked with seasonalHighlight + label.
 */
export function segmentHebrewWithSeasonalHighlights(
  hebrew: string,
  date: Date = new Date(),
  opts?: AmidahSeasonalOpts
): PrayerTextSegment[] {
  if (!hebrew.trim()) return [{ text: '', italic: false }];
  const slot: AmidahSlot = opts?.amidahSlot ?? 'mincha';
  const spans = findBlockSpans(hebrew, date, slot);
  if (spans.length === 0) return [{ text: hebrew, italic: false }];

  const segs: PrayerTextSegment[] = [];
  let cursor = 0;
  for (const s of spans) {
    if (s.start > cursor) {
      segs.push({ text: hebrew.slice(cursor, s.start), italic: false });
    }
    segs.push({
      text: hebrew.slice(s.start, s.end),
      italic: false,
      seasonalHighlight: true,
      seasonalLabel: s.label,
    });
    cursor = s.end;
  }
  if (cursor < hebrew.length) {
    segs.push({ text: hebrew.slice(cursor), italic: false });
  }
  return segs.filter((s) => s.text.length > 0);
}
