import fs from 'node:fs';

const t = fs.readFileSync('src/content/siddur/maariv/ashkenaz/raw.ts', 'utf8');
const re =
  /"maariv_amidah"\s*:\s*\{\s*"key"\s*:\s*"maariv_amidah"\s*,\s*"hebrew"\s*:\s*"((?:\\.|[^"\\])*)"/;
const m = t.match(re);
const h = m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
const strip = (s) => s.replace(/[\u0591-\u05C7]/g, '');
const s = strip(h);

const idx = s.indexOf('מודים אנחנו לך');
console.log('modim at', idx);
console.log('around:\n', s.slice(Math.max(0, idx - 80), idx + 400));
console.log('\nhas אלהי כל בשר', /אלהי\s+כל\s+בשר/.test(s));
console.log('has אלוהי כל בשר', /אלוהי\s+כל\s+בשר/.test(s));
console.log('has ברוך אל ההודאות', /ברוך\s+אל\s+ההודאות/.test(s));
console.log('has מגן אברהם', /מגן\s+אברהם/.test(s));
console.log('has נקדיש/נקדש/thrice', /נקדישך|נעריצך|נקדש|קדוש קדוש קדוש|בחזרת/.test(s));

// Also check sefard
const t2 = fs.readFileSync('src/content/siddur/maariv/sefard/raw.ts', 'utf8');
const m2 = t2.match(
  /"maariv_amidah"\s*:\s*\{\s*"key"\s*:\s*"maariv_amidah"\s*,\s*"hebrew"\s*:\s*"((?:\\.|[^"\\])*)"/
);
const h2 = m2[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
const s2 = strip(h2);
console.log('\n--- SEFARD ---');
console.log('start', s2.replace(/\s+/g, ' ').slice(0, 100));
console.log('modim count', (s2.match(/מודים אנחנו לך/g) || []).length);
console.log('has אלהי כל בשר', /אלהי\s+כל\s+בשר/.test(s2));
console.log('has kedusha markers', /נקדישך|נעריצך|נקדש|קדוש קדוש קדוש|בחזרת/.test(s2));
console.log('first modim idx', s2.indexOf('מודים אנחנו לך'), '/', s2.length);
