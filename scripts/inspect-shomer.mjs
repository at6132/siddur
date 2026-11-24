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
  return s.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}
function extract(src, key) {
  return unescapeTsString(
    src.match(new RegExp(`"key"\\s*:\\s*"${key}"[\\s\\S]*?"hebrew"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, 'm'))[1]
  );
}
function findAll(st, n) {
  const out = [];
  let i = 0;
  while (true) {
    const j = st.indexOf(n, i);
    if (j < 0) break;
    out.push(j);
    i = j + 1;
  }
  return out;
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
  const h = extract(
    fs.readFileSync(path.join(ROOT, `src/content/siddur/shacharit/${pack}/raw.ts`), 'utf8'),
    'tachanun'
  );
  const st = stripNik(h);
  const hits = findAll(st, 'שומר ישראל');
  console.log('\n', pack, 'shomer hits', hits);
  for (const hi of hits) {
    console.log(' @', hi, JSON.stringify(st.slice(hi, hi + 60)));
  }
  // Prefer שמור שארית
  const daily = st.indexOf('שומר ישראל שמור שארית');
  console.log('daily@', daily);
  // Also check for ויאמר דוד which appeared as para 3 in ashkenaz
  console.log('ויאמר דוד@', st.indexOf('ויאמר דוד'));
  console.log('רחום וחנון@', st.indexOf('רחום וחנון'));
  // ending of mon/thu before daily shomer
  if (daily > 0) {
    const o = mapStripToOrig(h, daily);
    console.log('before daily:', JSON.stringify(h.slice(o - 80, o + 40)));
  }
}

// sefard ashrei - lamenatzeach is INSIDE para 0 with ashrei! Need careful wrap
for (const pack of ['ashkenaz', 'sefard']) {
  const h = extract(
    fs.readFileSync(path.join(ROOT, `src/content/siddur/shacharit/${pack}/raw.ts`), 'utf8'),
    'ashrei'
  );
  const st = stripNik(h);
  const lam = st.search(/למנצח\s*מזמור\s*לדוד/);
  const uva = st.indexOf('ובא לציון');
  console.log(pack, 'ashrei lam@', lam, 'uva@', uva);
  console.log('lam ctx', JSON.stringify(st.slice(Math.max(0, lam - 40), lam + 40)));
}

// concluding: where does friday song end (before barchi)
for (const pack of ['ashkenaz', 'sefard']) {
  const h = extract(
    fs.readFileSync(path.join(ROOT, `src/content/siddur/shacharit/${pack}/raw.ts`), 'utf8'),
    'concluding'
  );
  const st = stripNik(h);
  const song0 = st.indexOf('היום יום ראשון');
  const barchi = st.indexOf('ברכי נפשי');
  console.log(pack, 'song0', song0, 'barchi', barchi);
  console.log('between friday end and barchi:', JSON.stringify(st.slice(barchi - 120, barchi + 20)));
}

// birchot english expansion
for (const pack of ['ashkenaz', 'sefard']) {
  const src = fs.readFileSync(path.join(ROOT, `src/content/siddur/shacharit/${pack}/raw.ts`), 'utf8');
  const e = unescapeTsString(
    src.match(new RegExp(`"key"\\s*:\\s*"birchot_hashachar"[\\s\\S]*?"english"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, 'm'))[1]
  );
  const i = e.search(/Our God and God of our fathers,? remember us|Eloheinu.*remember/i);
  console.log(pack, 'birchot en expansion@', i, i >= 0 ? JSON.stringify(e.slice(i, i + 70)) : '');
}
