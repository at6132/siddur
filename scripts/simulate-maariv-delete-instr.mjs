import fs from 'node:fs';

function hebPat(plain) {
  return plain
    .split('')
    .map((ch) => {
      if (/\s/.test(ch)) return '[\\s\\u05BE\\u200e\\u200f]*';
      if (/[א-ת]/.test(ch)) return ch + '[\\u0591-\\u05C7]*';
      return ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('');
}

function tidy(h) {
  return h.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+\n/g, '\n').trim();
}

const lineStart = '(?:^|(?:\\r?\\n)+|\\s+)';
const hebDeletes = [
  new RegExp(
    `${lineStart}${hebPat('אם טעה וסיים האל הקדוש')}[\\s\\S]*?(?:${hebPat('ובימות השנה')}[\\s\\S]*?)?${hebPat('אינו חוזר')}\\.?`,
    'gu'
  ),
  new RegExp(
    `${lineStart}${hebPat('בכל השנה אם אמר המלך המשפט')}[\\s\\S]*?${hebPat('אין מחזירין אותו')}\\.?`,
    'gu'
  ),
  new RegExp(
    `${lineStart}${hebPat('אם טעה ואמר מלך אוהב צדקה ומשפט')}[\\s\\S]*?${hebPat('אין מחזירין אותו')}\\.?`,
    'gu'
  ),
  new RegExp(
    `${lineStart}${hebPat('טעה ולא אמר בחורף משיב הרוח')}[\\s\\S]*?(?:${hebPat('לראש התפלה')}\\.?|${hebPat('קיצור שו"ע')}[^\\n]*)`,
    'gu'
  ),
  new RegExp(
    `${lineStart}${hebPat('אם לא אמר זכרנו')}[\\s\\S]*?(?:\\(דה["״]ח\\)|${hebPat('אינו חוזר')}\\.?|${hebPat('חוזר לראש')}[^\\n]*|${hebPat('מלך עוזר')}[^\\n]*)`,
    'gu'
  ),
  new RegExp(
    `${lineStart}${hebPat('שכח ולא אמר יעלה ויבא')}[\\s\\S]*?(?:${hebPat('חוזר לראש התפלה')}\\.?|${hebPat('מחזיר שכינתו')}[^\\n]*)`,
    'gu'
  ),
  new RegExp(
    `${lineStart}(?:${hebPat('בחנוכה ופורים')}[^\\n]{0,40})?${hebPat('שכח לומר על הנסים')}[\\s\\S]*?(?:${hebPat('אינו חוזר')}\\.?|דה["״]ח[^\\n]*)`,
    'gu'
  ),
  new RegExp(
    `${lineStart}${hebPat('כשאומר מודים כורע')}[\\s\\S]*?(?:${hebPat('כאגמון')}[^\\n]*|או["״]?ח\\s*קיג[^\\n]*)`,
    'gu'
  ),
  new RegExp(
    `${lineStart}${hebPat('כשיגיע שליח')}\\s+צ[\\u0591-\\u05C7]*י?[\\u0591-\\u05C7]*${hebPat('בור')}[\\s\\S]*?(?:${hebPat('אבודרהם')}[^\\n]*|${hebPat('הודאה קטנה')}[^\\n]*)`,
    'gu'
  ),
  new RegExp(
    `${lineStart}${hebPat('יהי רצון מלפניך')}[\\s\\S]{0,500}?פ[\\u0591-\\u05C7]*ל[\\u0591-\\u05C7]*ו[\\u0591-\\u05C7]*נ[\\u0591-\\u05C7]*י[\\u0591-\\u05C7]*[\\s\\S]{0,120}?${hebPat('בתוך שאר חולי ישראל')}\\s*[:׃]?`,
    'gu'
  ),
];

function load(nusach) {
  const t = fs.readFileSync(`src/content/siddur/maariv/${nusach}/raw.ts`, 'utf8');
  const re =
    /"maariv_amidah"\s*:\s*\{\s*"key"\s*:\s*"maariv_amidah"\s*,\s*"hebrew"\s*:\s*"((?:\\.|[^"\\])*)"/;
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

for (const nusach of ['ashkenaz', 'sefard']) {
  let h = load(nusach);
  console.log('\n====', nusach, 'before', h.length, preview(h));
  for (let i = 0; i < hebDeletes.length; i++) {
    const before = h;
    h = h.replace(hebDeletes[i], '\n');
    if (h !== before) {
      console.log('regex', i, 'changed len', before.length, '->', h.length);
      console.log('  now start', preview(h));
      const mod = h.replace(/[\u0591-\u05C7]/g, '').indexOf('מודים אנחנו לך');
      const avot = h.replace(/[\u0591-\u05C7]/g, '').indexOf('אלהי אברהם');
      console.log('  avot idx', avot, 'modim idx', mod);
    }
  }
  h = tidy(h);
  console.log('FINAL', h.length, preview(h));
  console.log('STARTS_MODIM', /^מודים/.test(preview(h)));
}
