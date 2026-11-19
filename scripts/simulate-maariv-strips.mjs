import fs from 'node:fs';

const SEFARIA_COMMENTARY_MARK =
  /אבודרהם|ערוה|ערוך השלחן|ערוך השולחן|טור או|לבוש|מגן אברהם|קיצשו|שו"ע|שו״ע|שער הכונות|דה"ח|דה״ח|א"ר סי|צפורן|כתב בספר|המנהג הפשוט|צריך לכוין|צריך לאומרו|יש לאומרו|צריך שיכוין|מזמור זה|פיוט |מיוחס|הטעם ש|אין להפסיק|אמרו חכמים|קבעו ל|יש מי ש|יש שאין|לפיכך יאמר|אומרים פרשת|תקנו לומר|המתפלל צריך|נהגו לומר|אם נזכר|שכח ולא|טעה ולא|אינו חוזר|חוזר לראש|חוזר ומתחיל/;

const KEEP_UNVOCALIZED_LINE =
  /(?:^|[\s:״"'‘’])(יאמר|יברך|יניח|ועונין|שליח צבור|בלחש|וכורך)(?:\s|$|:)|בראש חודש|נשים אומרות|בעשי"?ת|בקיץ|בחורף|^ג["״]פ|יום ראשון|יום שני|יום שלישי|יום רביעי|יום חמישי|יום ששי|יום שישי|שיר של יום/;

function isUnvocalizedSefariaNote(line) {
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

function stripMaarivInstructionLines(hebrew) {
  const lines = hebrew.split('\n');
  const kept = [];
  const dropped = [];
  for (const line of lines) {
    if (line.trim().length === 0) {
      kept.push('');
      continue;
    }
    if (isUnvocalizedSefariaNote(line)) {
      dropped.push(line.slice(0, 100));
      continue;
    }
    kept.push(line);
  }
  return {
    hebrew: kept.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
    dropped,
  };
}

function stripKaddish(hebrew) {
  const stripNikkud = (s) => s.replace(/[\u0591-\u05C7]/g, '');
  let he = hebrew;
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
  let which = null;
  for (const m of startMarkers) {
    const i = stripped.indexOf(m);
    if (i !== -1 && (startStripped === -1 || i < startStripped)) {
      startStripped = i;
      which = m;
    }
  }
  if (startStripped === -1) return { hebrew: he, which: null, startStripped: -1 };
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
  if (lastAmenStripped === -1) return { hebrew: he, which, startStripped, noAmen: true };
  let endStripped = lastAmenStripped + usedEndMarkerLen;
  const nextPara = stripped.indexOf('\n\n', endStripped);
  const endOfBlockStripped = nextPara === -1 ? stripped.length : nextPara + 2;
  const strippedToOriginal = [];
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
  return {
    hebrew: he,
    which,
    startStripped,
    removedLen: endOriginal - startOriginal,
    startPreview: stripNikkud(hebrew).slice(startStripped, startStripped + 40),
  };
}

function load(key, nusach = 'ashkenaz') {
  const t = fs.readFileSync(`src/content/siddur/maariv/${nusach}/raw.ts`, 'utf8');
  const re = new RegExp(
    `"${key}"\\s*:\\s*\\{\\s*"key"\\s*:\\s*"${key}"\\s*,\\s*"hebrew"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`
  );
  const m = t.match(re);
  return m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
}

function preview(s) {
  return s
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

for (const key of ['maariv_shema', 'maariv_amidah']) {
  const raw = load(key);
  console.log('\n====', key, 'raw len', raw.length, 'start', preview(raw));
  const notes = stripMaarivInstructionLines(raw);
  console.log('after notes len', notes.hebrew.length, 'dropped', notes.dropped.length);
  notes.dropped.slice(0, 15).forEach((d, i) => console.log('  drop', i, preview(d)));
  console.log('after notes start', preview(notes.hebrew));
  const kad = stripKaddish(notes.hebrew);
  console.log(
    'kaddish which',
    kad.which,
    'start',
    kad.startStripped,
    'removedLen',
    kad.removedLen,
    'noAmen',
    kad.noAmen
  );
  console.log('after kaddish start', preview(kad.hebrew), 'len', kad.hebrew.length);
  console.log('modim idx', preview(kad.hebrew).includes('מודים'), 'first modim', kad.hebrew.replace(/[\u0591-\u05C7]/g, '').indexOf('מודים אנחנו לך'));
}
