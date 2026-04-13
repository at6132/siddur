const ref = 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Amidah';
const url = `https://www.sefaria.org/api/texts/${ref}?context=0`;
const r = await fetch(url);
const j = await r.json();
const he = Array.isArray(j.he) ? j.he.flat(Infinity).join('\n\n') : String(j.he ?? '');
const flat = he.replace(/[\u0591-\u05C7]/g, '');
const i = flat.indexOf('בימותהחמה');
console.log('status', r.status, 'index', i, 'len', he.length);
if (i === -1) {
  console.log('no ותן stripped');
  process.exit(0);
}
const start = Math.max(0, i - 100);
console.log(he.slice(start, start + 900));
