import fs from 'node:fs';

const t = fs.readFileSync('src/content/siddur/maariv/ashkenaz/raw.ts', 'utf8');
const re =
  /"maariv_amidah"\s*:\s*\{\s*"key"\s*:\s*"maariv_amidah"\s*,\s*"hebrew"\s*:\s*"((?:\\.|[^"\\])*)"/;
const m = t.match(re);
if (!m) {
  console.error('no amidah');
  process.exit(1);
}
const h = m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
const strip = (s) =>
  s
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
console.log('start', strip(h).slice(0, 100));
console.log('gates', (h.match(/\{\{gate:/g) || []).length);
console.log('folds', (h.match(/\{\{fold:/g) || []).length);
console.log('בחזרת', /בחזרת/.test(h));
console.log('mashiv', /\{\{gate:mashiv\}\}/.test(h));
console.log('yaaleh', /\{\{gate:yaaleh\}\}/.test(h));
console.log('al_hanissim', /\{\{gate:al_hanissim\}\}/.test(h));
console.log('STARTS_MODIM', /^מודים/.test(strip(h)));
