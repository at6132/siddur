import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
  '..'
);

function stripNik(s) {
  return s.replace(/[\u0591-\u05C7]/g, '');
}
function unescapeTsString(s) {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}
function extractSection(src, key) {
  const re = new RegExp(
    `"key"\\s*:\\s*"${key}"[\\s\\S]*?"hebrew"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`,
    'm'
  );
  const m = src.match(re);
  return unescapeTsString(m[1]);
}
function findStrip(h, n) {
  return stripNik(h).indexOf(stripNik(n));
}
function mapStripToOrig(h, stripIdx) {
  let si = 0;
  for (let i = 0; i < h.length; i++) {
    if (/[\u0591-\u05C7]/.test(h[i])) continue;
    if (si === stripIdx) return i;
    si++;
  }
  return -1;
}

for (const pack of ['ashkenaz', 'sefard']) {
  const src = fs.readFileSync(path.join(ROOT, `src/content/siddur/shacharit/${pack}/raw.ts`), 'utf8');
  const h = extractSection(src, 'tachanun');
  const st = stripNik(h);
  const vehu = findStrip(h, 'והוא רחום');
  const shomer = findStrip(h, 'שומר ישראל');
  const avinu = findStrip(h, 'אבינו מלכנו חטאנו');
  console.log('\n', pack, 'avinu', avinu, 'vehu', vehu, 'shomer', shomer);
  // text between vehu and shomer start/end
  const vo = mapStripToOrig(h, vehu);
  const so = mapStripToOrig(h, shomer);
  console.log('between vehu→shomer len', so - vo);
  console.log('just before shomer:', JSON.stringify(h.slice(so - 100, so + 80)));
  // after first shomer - is there more shomer?
  const shomer2 = st.indexOf('שומר ישראל', shomer + 5);
  console.log('second shomer@', shomer2);
  // what's after first major shomer block - look for end of mon/thu
  // typically ends before שומר ישראל daily
  console.log('from shomer 250:', JSON.stringify(st.slice(shomer, shomer + 250)));
  // Avinu aseret rubric lines
  const rubric = findStrip(h, 'בעשרת ימי תשובה');
  console.log('aseret rubric in avinu@', rubric);
  if (rubric >= 0) {
    const ro = mapStripToOrig(h, rubric);
    console.log('rubric ctx:', JSON.stringify(h.slice(ro - 40, ro + 120)));
  }
  // English Avinu / Monday
  const eRe = new RegExp(
    `"key"\\s*:\\s*"tachanun"[\\s\\S]*?"english"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`,
    'm'
  );
  const em = src.match(eRe);
  const e = unescapeTsString(em[1]);
  console.log('en Our Father?', /Our Father, our King|Avinu Malkeinu/i.test(e));
  console.log('en He being merciful?', /He,? being merciful|And He,? being merciful|Vehu rachum/i.test(e));
  console.log('en Monday?', /Monday|Thursday|On Mondays/i.test(e));
  const ei = e.search(/Our Father,?\s+our King|Avinu/i);
  const ej = e.search(/He,? being merciful|And He is merciful|Vehu/i);
  console.log('en avinu@', ei, 'vehu@', ej);
  if (ei >= 0) console.log('en avinu snip', JSON.stringify(e.slice(ei, ei + 80)));
  if (ej >= 0) console.log('en vehu snip', JSON.stringify(e.slice(ej, ej + 80)));
}

// ashrei english lamenatzeach
for (const pack of ['ashkenaz', 'sefard']) {
  const src = fs.readFileSync(path.join(ROOT, `src/content/siddur/shacharit/${pack}/raw.ts`), 'utf8');
  const eRe = new RegExp(
    `"key"\\s*:\\s*"ashrei"[\\s\\S]*?"english"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`,
    'm'
  );
  const e = unescapeTsString(src.match(eRe)[1]);
  const i = e.search(/For the Conductor|To the chief Musician|Lamnatzeach|May Adonoy answer you/i);
  console.log(pack, 'ashrei en lamenatzeach@', i, i >= 0 ? JSON.stringify(e.slice(i, i + 60)) : '');
  const j = e.search(/And a redeemer shall come|Uva letzion|And there shall come to Zion/i);
  console.log('  uva en@', j);
}

// korbanot english
for (const pack of ['ashkenaz', 'sefard']) {
  const src = fs.readFileSync(path.join(ROOT, `src/content/siddur/shacharit/${pack}/raw.ts`), 'utf8');
  const eRe = new RegExp(
    `"key"\\s*:\\s*"korbanot"[\\s\\S]*?"english"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`,
    'm'
  );
  const e = unescapeTsString(src.match(eRe)[1]);
  console.log(pack, 'korbanot en len', e.length, 'Rosh Chodesh?', /Rosh Chodesh|new moons/i.test(e));
}
