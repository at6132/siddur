import fs from 'node:fs';

const t = fs.readFileSync('src/content/siddur/maariv/ashkenaz/raw.ts', 'utf8');

function section(key) {
  const re = new RegExp(
    `"${key}"\\s*:\\s*\\{\\s*"key"\\s*:\\s*"${key}"\\s*,\\s*"hebrew"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`
  );
  const m = t.match(re);
  if (!m) return '';
  return m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
}

function strip(s) {
  return s.replace(/[\u0591-\u05C7]/g, '').replace(/\s+/g, ' ').trim();
}

for (const key of ['maariv_shema', 'maariv_amidah', 'maariv_aleinu']) {
  const h = section(key);
  const s = strip(h);
  console.log(key, 'len', h.length, 'start:', s.slice(0, 100));
  console.log('  Avot', /אלהינו ואלהי אבותינו/.test(s));
  console.log('  Modim count', (s.match(/מודים אנחנו לך/g) || []).length);
  console.log('  Nekadesh-ish', /נקדש|נקדישך|קדוש קדוש קדוש/.test(s));
  console.log('  first modim idx', s.indexOf('מודים אנחנו לך'), '/', s.length);
  console.log('  Ata Chonen idx', s.search(/אתה חונן/));
  console.log('  Ata Kadosh idx', s.indexOf('אתה קדוש'));
}
