import fs from 'node:fs';

const t = fs.readFileSync('src/content/siddur/maariv/ashkenaz/raw.ts', 'utf8');
const re =
  /"maariv_amidah"\s*:\s*\{\s*"key"\s*:\s*"maariv_amidah"\s*,\s*"hebrew"\s*:\s*"((?:\\.|[^"\\\\])*)"/;
const m = t.match(re);
const h = m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
const strip = (s) => s.replace(/[\u0591-\u05C7]/g, '');
const s = strip(h);

for (const open of ['נקדישך', 'נעריצך', 'נקדש', 'קדוש קדוש קדוש', 'בחזרת']) {
  let from = 0;
  let n = 0;
  while (true) {
    const i = s.indexOf(open, from);
    if (i === -1) break;
    n++;
    console.log(open, 'at', i, '→', JSON.stringify(s.slice(Math.max(0, i - 30), i + open.length + 40)));
    from = i + 1;
    if (n > 5) break;
  }
  if (n === 0) console.log(open, 'none');
}

// Simulate extractAmidahKedushaFoldout start/end + slot split consequences
function findStart(stripped) {
  for (const open of ['נקדישך', 'נעריצך', 'נקדש']) {
    const i = stripped.indexOf(open);
    if (i !== -1) return { open, i };
  }
  const thrice = stripped.indexOf('קדוש קדוש קדוש');
  if (thrice !== -1) return { open: 'thrice', i: thrice };
  return { open: null, i: -1 };
}

const start = findStart(s);
console.log('\nchosen start', start);

if (start.i !== -1) {
  // crude end: לדור ודור … הקדוש within 2800
  const fullLed = s.indexOf('לדור ודור', start.i);
  console.log('לדור ודור after start', fullLed, 'delta', fullLed - start.i);
  // Modim also has אתה הוא לדור ודור!
  const modim = s.indexOf('מודים אנחנו לך');
  console.log('modim at', modim);
  console.log('Would kedusha foldout swallow through Modim ledor?', fullLed > modim);

  // Find (האל|המלך) הקדוש after ledor
  if (fullLed !== -1) {
    const slice = s.slice(fullLed, Math.min(s.length, fullLed + 750));
    const chatima = slice.match(/(?:האל|המלך)\s*הקדוש/g);
    console.log('chatimot in window', chatima);
  }
}
