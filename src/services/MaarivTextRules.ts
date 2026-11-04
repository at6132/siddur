/**
 * String transforms used only by weekday Maariv (`OfflineMaarivService`).
 * Shacharit / Mincha paths do not import this module.
 */

function stripNik(s: string): string {
  return s.replace(/[\u0591-\u05C7]/g, '').replace(/\u05BE/g, ' ');
}

function splitParas(s: string): string[] {
  return s
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function keepParas(hebrew: string, english: string, keep: boolean[]): { hebrew: string; english: string } {
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

const KEEP_UNVOCALIZED_LINE =
  /(?:^|[\s:״"'‘’])(יאמר|יברך|יניח|ועונין|שליח צבור|בלחש|וכורך)(?:\s|$|:)|בראש חודש|נשים אומרות|בעשי"?ת|בקיץ|בחורף|^ג["״]פ|יום ראשון|יום שני|יום שלישי|יום רביעי|יום חמישי|יום ששי|יום שישי|שיר של יום/;

const SEFARIA_COMMENTARY_MARK =
  /אבודרהם|ערוה|ערוך השלחן|ערוך השולחן|טור או|לבוש|מגן אברהם|קיצשו|שו"ע|שו״ע|שער הכונות|דה"ח|דה״ח|א"ר סי|צפורן|כתב בספר|המנהג הפשוט|צריך לכוין|צריך לאומרו|יש לאומרו|צריך שיכוין|מזמור זה|פיוט |מיוחס|הטעם ש|אין להפסיק|אמרו חכמים|קבעו ל|יש מי ש|יש שאין|לפיכך יאמר|אומרים פרשת|תקנו לומר|המתפלל צריך|נהגו לומר|אם נזכר|שכח ולא|טעה ולא|אינו חוזר|חוזר לראש|חוזר ומתחיל/;

function isUnvocalizedSefariaNote(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (KEEP_UNVOCALIZED_LINE.test(t)) return false;
  const heb = (t.match(/[\u05D0-\u05EA]/g) || []).length;
  const nik = (t.match(/[\u0591-\u05C7]/g) || []).length;
  if (heb < 2) return false;
  const noNik = nik === 0 || nik / heb < 0.08;
  if (!noNik) return false;
  if (SEFARIA_COMMENTARY_MARK.test(t)) return true;
  return heb <= 36 && !/[.:׃]/.test(t.slice(-1));
}

/**
 * Drop Sefaria Hebrew commentary / ikkar headings that sit on their own lines (no nikkud).
 * Blank lines are kept so paragraph gaps (`\n\n`) survive into the reader.
 */
export function stripMaarivInstructionLines(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  const lines = hebrew.split('\n');
  const kept: string[] = [];
  for (const line of lines) {
    if (line.trim().length === 0) {
      kept.push('');
      continue;
    }
    if (isUnvocalizedSefariaNote(line)) continue;
    kept.push(line);
  }
  const out = kept
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { hebrew: out, english };
}

/**
 * Remove a Chatzi Kaddish / Kaddish Shalem block (יתגדל … ואימרו אמן).
 */
export function stripMaarivKaddishBlock(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  const stripNikkud = (s: string) => s.replace(/[\u0591-\u05C7]/g, '');
  let he = hebrew;
  let en = english;
  const stripped = stripNikkud(he);
  const startMarkers = [
    'ואומר החזן חצי קדיש',
    'החזן אומר חצי קדיש',
    'השליח ציבור אומר חצי קדיש',
    'הש"ץ אומר קדיש',
    'חצי קדיש',
    'קדיש שלם',
    'יתגדל',
  ];
  let startStripped = -1;
  for (const m of startMarkers) {
    const i = stripped.indexOf(m);
    if (i !== -1 && (startStripped === -1 || i < startStripped)) startStripped = i;
  }
  if (startStripped === -1) return { hebrew: he, english: en };

  const prevNewline = stripped.lastIndexOf('\n', startStripped);
  if (prevNewline !== -1) {
    const linePrefix = stripped.slice(prevNewline + 1, startStripped).trim();
    if (linePrefix.length === 0) startStripped = prevNewline + 1;
  }

  const endMarkers = ['ואמרו אמן', 'ואמרו: אמן', 'אמן:'];
  let lastAmenStripped = -1;
  let usedEndMarkerLen = 0;
  for (const endMarker of endMarkers) {
    let pos = stripped.indexOf(endMarker, startStripped);
    while (pos !== -1) {
      if (pos > lastAmenStripped) {
        lastAmenStripped = pos;
        usedEndMarkerLen = endMarker.length;
      }
      pos = stripped.indexOf(endMarker, pos + 1);
    }
  }
  if (lastAmenStripped === -1) return { hebrew: he, english: en };
  let endStripped = lastAmenStripped + usedEndMarkerLen;
  while (endStripped < stripped.length && /[:\s.]/.test(stripped[endStripped])) endStripped++;
  const nextPara = stripped.indexOf('\n\n', endStripped);
  const endOfBlockStripped = nextPara === -1 ? stripped.length : nextPara + 2;

  const strippedToOriginal: number[] = [];
  for (let i = 0; i < he.length; i++) {
    if (!/[\u0591-\u05C7]/.test(he[i])) strippedToOriginal.push(i);
  }
  const startOriginal = strippedToOriginal[startStripped] ?? startStripped;
  const endOriginal =
    endOfBlockStripped > 0 && endOfBlockStripped <= strippedToOriginal.length
      ? strippedToOriginal[endOfBlockStripped - 1] + 1
      : he.length;

  he = (he.slice(0, startOriginal).trimEnd() + '\n\n' + he.slice(endOriginal).trimStart())
    .replace(/\n\n\n+/g, '\n\n')
    .trim();

  if (en) {
    const engKaddish =
      /\b(?:The\s+leader|The\s+chazan|Chazan|leader)\s+(?:says?|recites?)\s+(?:Half\s+|Full\s+)?Kaddish\s*:?/i;
    const altKaddish = /\b(?:Half|Full)\s+Kaddish\s*:?/i;
    const m = en.match(engKaddish) || en.match(altKaddish);
    if (m && m.index !== undefined) {
      let lastAmenEn = -1;
      let idx = en.indexOf('Amen', m.index);
      while (idx !== -1) {
        lastAmenEn = idx + 4;
        while (lastAmenEn < en.length && /[.!:\s]/.test(en[lastAmenEn])) lastAmenEn++;
        idx = en.indexOf('Amen', lastAmenEn);
      }
      if (lastAmenEn !== -1) {
        const nextEn = en.indexOf('\n\n', lastAmenEn);
        const endEnBlock = nextEn === -1 ? en.length : nextEn + 2;
        en = (en.slice(0, m.index).trimEnd() + '\n\n' + en.slice(endEnBlock).trimStart())
          .replace(/\n\n\n+/g, '\n\n')
          .trim();
      }
    }
  }

  return { hebrew: he, english: en };
}

function isLedavidPara(st: string): boolean {
  return /לדוד\s+יהוה\s+אורי|אורי\s+וישעי/.test(st) && /מזמור\s+לדוד|לדוד/.test(st);
}

/**
 * Motzaei Shabbat Havdalah insert in חונן הדעת (`אתה חוננתנו` … before `חננו מאתך`).
 * Keep only on Saturday (weekday Maariv after Shabbat).
 */
export function removeMaarivHavdalahAtahChonantanuUnlessSaturday(
  hebrew: string,
  english: string,
  date: Date
): { hebrew: string; english: string } {
  if (date.getDay() === 6) return { hebrew, english };
  const nik = '[\\u0591-\\u05C7]*';
  const sp = '[\\s\\u200e\\u200f\\u200b]*';
  const start = `א${nik}ת${nik}ה${sp}ח${nik}ו${nik}נ${nik}נ${nik}ת${nik}נ${nik}ו`;
  const endBefore = `ח${nik}נ${nik}נ${nik}ו${sp}מ${nik}א${nik}ת${nik}ך`;
  const re = new RegExp(`${start}[\\s\\S]*?(?=${endBefore})`, 'u');
  const out = hebrew.replace(re, '').replace(/\n{3,}/g, '\n\n').trim();
  return { hebrew: out, english };
}

/**
 * Drop leftover Sefaria cue lines that survive nikkud-ratio filtering.
 */
export function stripMaarivKnownInstructionParagraphs(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  const drop =
    /יש להפסיק מעט בין אחד|יש לצרף|בחזרת הש["״]ץ אומרים כאן קדושה|מנהג טוב לומר אחר כל תפלה מזמור לדוד/;
  const hp = splitParas(hebrew);
  const keep = hp.map((p) => !drop.test(stripNik(p)));
  if (keep.every(Boolean)) return { hebrew, english };
  return keepParas(hebrew, english, keep);
}

/**
 * Calendar-shape weekday Maariv extras (paragraphs = Sefaria leaves joined by \\n\\n).
 */
export function applyMaarivSectionCalendarGates(
  sectionKey: string,
  hebrew: string,
  english: string,
  _date: Date,
  opts: { ledavidSeason: boolean }
): { hebrew: string; english: string } {
  if (sectionKey === 'maariv_aleinu' && !opts.ledavidSeason) {
    const hp = splitParas(hebrew);
    const keep = hp.map((p) => !isLedavidPara(stripNik(p)));
    if (keep.some((k) => k === false)) return keepParas(hebrew, english, keep);
  }
  return { hebrew, english };
}
