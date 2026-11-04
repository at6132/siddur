/**
 * Pipelines for offline standalone siddur texts (Tefillas HaDerech, bedtime cleanup).
 * Birkat Hamazon calendar/trim stays in SiddurReaderScreen.trimBirkatHamazon.
 */

import type { PrayerTextSegment } from './SefariaService';

function stripNikkud(s: string): string {
  return s.replace(/[\u0591-\u05C7]/g, '');
}

function startAtYehiRatzon(hebrew: string, english: string): { hebrew: string; english: string } {
  const stripped = stripNikkud(hebrew);
  const yehi = stripped.search(/יהי\s+רצון/);
  if (yehi <= 0) return { hebrew, english };
  const toOrig: number[] = [];
  for (let i = 0; i < hebrew.length; i++) {
    if (!/[\u0591-\u05C7]/.test(hebrew[i])) toOrig.push(i);
  }
  const start = toOrig[yehi] ?? 0;
  let en = english;
  const enYehi = english.search(/May it be (?:Your|thy) will/i);
  if (enYehi > 0) en = english.slice(enYehi);
  return { hebrew: hebrew.slice(start).trim(), english: en.trim() };
}

export function applyTefilasHaderechPipeline(
  hebrewIn: string,
  englishIn: string,
  nusach: 'ashkenaz' | 'sfard'
): { hebrew: string; english: string; hebrewSegments: PrayerTextSegment[]; englishSegments: PrayerTextSegment[] } {
  const started = startAtYehiRatzon(hebrewIn, englishIn);
  let hebrew = started.hebrew;
  let english = started.english;
  let finalHebrewSegments: PrayerTextSegment[] = [{ text: hebrew, italic: false }];
  let finalEnglishSegments: PrayerTextSegment[] = [{ text: english, italic: false }];

  const parenWithColon = '(אם דעתו לחזור מיד אומר: וְתַחְזִירֵנוּ לְשָׁלוֹם): ';
  hebrew = hebrew.replace(/\s*[[(]\s*אם דעתו לחזור מיד אומר[:\s]+וְ?תַ?חְ?זִ?יר[ניוּ]* לְשָׁלוֹם\s*[\])]\s*/g, ' ' + parenWithColon);
  hebrew = hebrew.replace(/\s*\(\s*אם דעתו לחזור מיד אומר וְתַחְזִירֵנוּ לְשָׁלוֹם\s*\)\s*/g, ' ' + parenWithColon);
  const idx = hebrew.indexOf(parenWithColon);
  if (idx !== -1) {
    finalHebrewSegments = [
      { text: hebrew.slice(0, idx), italic: false },
      { text: parenWithColon, italic: true },
      { text: hebrew.slice(idx + parenWithColon.length), italic: false },
    ];
  }

  const enMatch = english.match(/\s*\(\s*(If one intends to return immediately[^)]+)\)\s*/i);
  if (enMatch) {
    const enParenWithColon = '(' + enMatch[1].trim() + '): ';
    english = english.replace(/\s*\(\s*If one intends to return immediately[^)]+\)\s*/gi, ' ' + enParenWithColon);
    const enIdx = english.indexOf(enParenWithColon);
    if (enIdx !== -1) {
      finalEnglishSegments = [
        { text: english.slice(0, enIdx), italic: false },
        { text: enParenWithColon, italic: true },
        { text: english.slice(enIdx + enParenWithColon.length), italic: false },
      ];
    }
  }

  const lefiNusachSefard = 'לפי נוסח ספרד';
  if (nusach === 'ashkenaz') {
    finalHebrewSegments = finalHebrewSegments.filter((seg) => !seg.text.includes(lefiNusachSefard));
    finalEnglishSegments = finalEnglishSegments.filter(
      (seg) => !/according to Sfard nusach|according to Sefard nusach/i.test(seg.text)
    );
  } else {
    finalHebrewSegments = finalHebrewSegments
      .map((seg) => ({
        text: seg.text.replace(lefiNusachSefard, ' ').replace(/\s{2,}/g, ' ').trim(),
        italic: seg.text.includes(lefiNusachSefard) ? false : seg.italic,
      }))
      .filter((seg) => seg.text.length > 0)
      .map((seg) => ({
        ...seg,
        text: seg.text.replace('תְּפִלָּה:', 'תְּפִלָּה:\n\n'),
      }));
    finalEnglishSegments = finalEnglishSegments
      .map((seg) => ({
        text: seg.text.replace(/\s*\(?according to Sfard nusach[^)]*\)?\s*/gi, ' ').replace(/\s{2,}/g, ' ').trim(),
        italic: /according to Sfard nusach/i.test(seg.text) ? false : seg.italic,
      }))
      .filter((seg) => seg.text.length > 0);
  }

  const cutHebrew = (seg: PrayerTextSegment) => {
    const nikkudEnd = seg.text.indexOf('תְּפִלָּה:');
    if (nikkudEnd !== -1) {
      return { text: seg.text.slice(0, nikkudEnd + 'תְּפִלָּה:'.length), italic: seg.italic };
    }
    const stripped = stripNikkud(seg.text);
    const lastShomea = Math.max(stripped.lastIndexOf('שומע תפלה'), stripped.lastIndexOf('שומע תפילה'));
    if (lastShomea === -1) return seg;
    const rest = stripped.slice(lastShomea);
    const word = rest.match(/^שומע תפל[הי]ה?:?/)?.[0] ?? 'שומע תפלה';
    const toOrig: number[] = [];
    for (let i = 0; i < seg.text.length; i++) {
      if (!/[\u0591-\u05C7]/.test(seg.text[i])) toOrig.push(i);
    }
    const endStripped = lastShomea + word.length;
    let end = (toOrig[endStripped - 1] ?? endStripped - 1) + 1;
    while (end < seg.text.length && /[\u0591-\u05C7:]/.test(seg.text[end])) end++;
    return { text: seg.text.slice(0, end), italic: seg.italic };
  };
  let done = false;
  finalHebrewSegments = finalHebrewSegments
    .map((seg) => {
      if (done) return null;
      const out = cutHebrew(seg);
      if (out.text.length < seg.text.length) done = true;
      return out;
    })
    .filter((s): s is PrayerTextSegment => s != null);

  const enEnd = /who hears prayer\.?/i;
  const cutEnglish = (seg: PrayerTextSegment) => {
    const m = seg.text.match(enEnd);
    if (!m) return seg;
    const i = (m.index ?? 0) + m[0].length;
    return { text: seg.text.slice(0, i), italic: seg.italic };
  };
  done = false;
  finalEnglishSegments = finalEnglishSegments
    .map((seg) => {
      if (done) return null;
      const out = cutEnglish(seg);
      if (out.text.length < seg.text.length) done = true;
      return out;
    })
    .filter((s): s is PrayerTextSegment => s != null);

  hebrew = finalHebrewSegments.map((s) => s.text).join('').replace(/\n\s*\n/g, '\n\n').trim();
  english = finalEnglishSegments.map((s) => s.text).join('').replace(/\n\s*\n/g, '\n\n').trim();
  return { hebrew, english, hebrewSegments: finalHebrewSegments, englishSegments: finalEnglishSegments };
}
