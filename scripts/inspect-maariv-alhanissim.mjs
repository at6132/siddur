import fs from 'node:fs';

const t = fs.readFileSync('src/content/siddur/maariv/ashkenaz/raw.ts', 'utf8');
const re =
  /"maariv_amidah"\s*:\s*\{\s*"key"\s*:\s*"maariv_amidah"\s*,\s*"hebrew"\s*:\s*"((?:\\.|[^"\\])*)"/;
const m = t.match(re);
const h = m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
const strip = (s) =>
  s
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/\u05BE/g, ' ')
    .replace(/[\u200e\u200f\u200c\u200d]/g, '');

const s = strip(h);
const iAl = s.indexOf('על הנסים ועל הפרקן');
console.log('al at', iAl);
console.log(s.slice(iAl, iAl + 900));
console.log('\n--- veal candidates after al ---');
for (const n of ['ועל הכל', 'ועל הכול', 'ועל כולם', 'ועל כלם', 'וכל החיים', 'שים שלום']) {
  console.log(n, s.indexOf(n, iAl));
}

// Also check if 'ועל כל' appears earlier in amidah (false close)
let pos = 0;
let n = 0;
while (n < 20) {
  const j = s.indexOf('ועל כל', pos);
  if (j === -1) break;
  console.log('ועל כל at', j, JSON.stringify(s.slice(j, j + 50)));
  pos = j + 1;
  n++;
}

const start = s.indexOf('בחזרת');
console.log('\nkedusha instruction at', start);
pos = start;
n = 0;
while (n < 10) {
  const i = s.indexOf('לדור ודור', pos);
  if (i === -1) break;
  console.log('ledor', i, 'delta', i - start, JSON.stringify(s.slice(i - 20, i + 40)));
  pos = i + 1;
  n++;
}
