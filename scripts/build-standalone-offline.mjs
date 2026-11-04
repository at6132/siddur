/**
 * Build offline standalone siddur packs (Ashkenaz + Sfard):
 * Asher Yatzar, Tefillas HaDerech, Bentching, Bedtime Shema,
 * plus shared-ref extras (Modeh Ani, Netilas, Birchos HaTorah).
 *
 * Usage:
 *   node scripts/build-standalone-offline.mjs
 *   node scripts/build-standalone-offline.mjs --nusach=sfard
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '../src/content/siddur/standalone');
const SEFARIA = 'https://www.sefaria.org/api/texts';

function toStr(v) {
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.map((x) => toStr(x)).join('\n\n');
  if (v && typeof v === 'object' && 'text' in v) return String(v.text);
  return String(v ?? '');
}

function tidyRaw(s) {
  let t = String(s ?? '').replace(/\r\n/g, '\n');
  t = t.replace(
    /<sup\b[^>]*class="[^"]*footnote-marker[^"]*"[^>]*>[\s\S]*?<\/sup>\s*<i\b[^>]*class="[^"]*footnote[^"]*"[^>]*>[\s\S]*?<\/i>/gi,
    ''
  );
  t = t.replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi, '');
  t = t.replace(/<i\b[^>]*class="[^"]*footnote[^"]*"[^>]*>[\s\S]*?<\/i>/gi, '');
  t = t.replace(/<br\s*\/?>/gi, '\n');
  t = t.replace(/<\/p>/gi, '\n\n');
  t = t.replace(/<\/div>/gi, '\n');
  t = t.replace(/<\/?[a-zA-Z][^>]*>/g, '');
  t = t
    .replace(/&nbsp;/gi, ' ')
    .replace(/&thinsp;/gi, ' ')
    .replace(/&#x2009;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
  t = t.replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n');
  t = t.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

const KEEP_UNVOCALIZED =
  /(?:^|[\s:״"'‘’])(יאמר|יברך|יניח|ועונין|שליח צבור|בלחש|וכורך)(?:\s|$|:)|בראש חודש|נשים אומרות|בעשי"?ת|בקיץ|בחורף|^ג["״]פ|יום ראשון|יום שני|יום שלישי|יום רביעי|יום חמישי|יום ששי|יום שישי|שיר של יום|קודם שיהדק|קודם שמהדק|אחר שיהדק|ואח["״]כ/;
const COMMENTARY_MARK =
  /אבודרהם|ערוה|ערוך השלחן|ערוך השולחן|טור או|לבוש|מגן אברהם|קיצשו|שו"ע|שו״ע|שער הכונות|דה"ח|דה״ח|א"ר סי|צפורן|כתב בספר|המנהג הפשוט|צריך לכוין|צריך לאומרו|יש לאומרו|צריך שיכוין|מזמור זה|מזמור לתודה יש|פיוט |מיוחס|הטעם ש|אין להפסיק|אמרו חכמים|קבעו ל|יש מי ש|יש שאין|לפיכך יאמר|אומרים פרשת|תקנו לומר|בויברך|המתפלל צריך|נהגו לומר/;

function isUnvocalizedNote(line) {
  const t = line.trim();
  if (!t || KEEP_UNVOCALIZED.test(t)) return false;
  const heb = (t.match(/[\u05D0-\u05EA]/g) || []).length;
  const nik = (t.match(/[\u0591-\u05C7]/g) || []).length;
  if (heb < 2) return false;
  const noNik = nik === 0 || nik / heb < 0.08;
  if (!noNik) return false;
  if (COMMENTARY_MARK.test(t)) return true;
  return heb <= 36 && !/[.:׃]/.test(t.slice(-1));
}

function stripInstructionLines(s) {
  return String(s || '')
    .split('\n')
    .filter((line) => !isUnvocalizedNote(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function formatLeaf(he) {
  return stripInstructionLines(tidyRaw(he).replace(/\n{2,}/g, '\n').trim());
}

function joinLeaves(parts) {
  return parts
    .map((p) => (p || '').trim())
    .filter(Boolean)
    .join('\n\n');
}

async function fetchSefaria(ref) {
  const encodings = [encodeURIComponent(ref), encodeURIComponent(ref.replace(/ /g, '_'))];
  for (const enc of encodings) {
    const url = `${SEFARIA}/${enc}?context=0`;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const json = await res.json();
      const hebrew = formatLeaf(toStr(json.he ?? json.hebrew));
      const english = formatLeaf(toStr(json.text ?? json.en ?? json.english));
      if (hebrew) {
        console.log(`  OK ${ref} (${hebrew.length} he)`);
        return { hebrew, english, ref };
      }
    } catch (e) {
      console.warn(`  fail ${ref}`, e.message || e);
    }
  }
  console.warn(`  MISS ${ref}`);
  return null;
}

async function fetchMany(refs) {
  const he = [];
  const en = [];
  const used = [];
  for (const ref of refs) {
    const part = await fetchSefaria(ref);
    if (!part) continue;
    he.push(part.hebrew);
    en.push(part.english);
    used.push(ref);
  }
  return { hebrew: joinLeaves(he), english: joinLeaves(en), sources: used };
}

/** Try each candidate list until one returns Hebrew. */
async function fetchFirstWorking(candidateLists) {
  for (const refs of candidateLists) {
    const got = await fetchMany(refs);
    if (got.hebrew) return got;
  }
  return { hebrew: '', english: '', sources: [] };
}

function writeTs(outDir, fileName, exportName, payload, headerNote) {
  const body = `/**
 * Auto-generated offline standalone siddur (${headerNote}).
 * Re-run: node scripts/build-standalone-offline.mjs
 * Source: Sefaria (CC-BY-SA) — https://sefaria.org
 */

export const ${exportName} = ${JSON.stringify(payload, null, 2)} as const;
`;
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, fileName), body, 'utf8');
  console.log(
    `wrote ${path.relative(ROOT, path.join(outDir, fileName))} ~${Math.round(Buffer.byteLength(body, 'utf8') / 1024)} KB`
  );
}

const SECTION_KEYS = [
  'asher_yatzar',
  'netilas_yadayim',
  'modeh_ani',
  'birchos_hatorah',
  'tefilas_haderech',
  'birchas_hamazon',
  'al_hamichya',
  'krias_shema_al_hamita',
];

const ASHKENAZ_GROUPS = {
  asher_yatzar: [['Siddur Ashkenaz, Weekday, Shacharit, Preparatory Prayers, Asher Yatzar']],
  netilas_yadayim: [['Siddur Ashkenaz, Weekday, Shacharit, Preparatory Prayers, Netilat Yadayim']],
  modeh_ani: [['Siddur Ashkenaz, Weekday, Shacharit, Preparatory Prayers, Modeh Ani']],
  birchos_hatorah: [
    ['Siddur Ashkenaz, Weekday, Shacharit, Preparatory Prayers, Torah Blessings'],
    ['Siddur Ashkenaz, Weekday, Shacharit, Torah Reading, Reading from Sefer, Birkat HaTorah'],
  ],
  tefilas_haderech: [['Siddur Ashkenaz, Berachot, Tefillat HaDerech']],
  birchas_hamazon: [['Siddur Ashkenaz, Berachot, Birkat HaMazon']],
  al_hamichya: [['Siddur Ashkenaz, Berachot, Birkat Hanehenin, Eating, Brachot Achronot, Al Hamichyah']],
  krias_shema_al_hamita: [
    ["Siddur Ashkenaz, Weekday, Maariv, Keri'at Shema al Hamita"],
    ['Siddur Sefard, Bedtime Shema'],
  ],
};

const SEFARD_GROUPS = {
  asher_yatzar: [['Siddur Ashkenaz, Weekday, Shacharit, Preparatory Prayers, Asher Yatzar']],
  netilas_yadayim: [['Siddur Ashkenaz, Weekday, Shacharit, Preparatory Prayers, Netilat Yadayim']],
  modeh_ani: [
    ['Siddur Sefard, Upon Arising, Modeh Ani'],
    ['Siddur Ashkenaz, Weekday, Shacharit, Preparatory Prayers, Modeh Ani'],
  ],
  birchos_hatorah: [
    ['Siddur Sefard, Weekday Shacharit, Blessings on Torah'],
    ['Siddur Ashkenaz, Weekday, Shacharit, Preparatory Prayers, Torah Blessings'],
  ],
  tefilas_haderech: [
    ["Siddur Sefard, Blessings, Traveler's Prayer"],
    ['Siddur Ashkenaz, Berachot, Tefillat HaDerech'],
  ],
  birchas_hamazon: [
    ['Siddur Sefard, Birchat HaMazon, Birchat HaMazon'],
    ['Siddur Ashkenaz, Berachot, Birkat HaMazon'],
  ],
  al_hamichya: [
    ["Siddur Sefard, Blessings, Me'ein Shalosh"],
    ['Siddur Ashkenaz, Berachot, Birkat Hanehenin, Eating, Brachot Achronot, Al Hamichyah'],
  ],
  krias_shema_al_hamita: [
    ['Siddur Sefard, Bedtime Shema'],
    ["Siddur Ashkenaz, Weekday, Maariv, Keri'at Shema al Hamita"],
  ],
};

async function buildNusach(label, outName, groups, attributionNusach) {
  const OUT = path.join(ROOT, outName);
  console.log(`\n=== ${label} standalone ===`);
  const sections = {};
  const sources = {};
  for (const key of SECTION_KEYS) {
    console.log(key);
    const got = await fetchFirstWorking(groups[key]);
    sections[key] = { key, hebrew: got.hebrew, english: got.english };
    sources[key] = got.sources;
    if (!got.hebrew) console.warn(`  EMPTY ${key}`);
  }
  writeTs(OUT, 'raw.ts', `STANDALONE_${outName.toUpperCase()}_RAW`, sections, `${label}`);
  writeTs(
    OUT,
    'meta.ts',
    'STANDALONE_OFFLINE_META',
    {
      nusach: outName === 'sefard' ? 'sfard' : 'ashkenaz',
      service: 'standalone',
      builtAt: new Date().toISOString(),
      source: 'Sefaria',
      attribution: `Texts provided by Sefaria (sefaria.org) under CC-BY-SA — Siddur ${attributionNusach}`,
      sections: SECTION_KEYS,
      sources,
    },
    label
  );
}

function parseArgs(argv) {
  let nusach = 'both';
  for (const a of argv) {
    if (a.startsWith('--nusach=')) nusach = a.slice('--nusach='.length).trim();
  }
  return { nusach };
}

async function main() {
  const { nusach } = parseArgs(process.argv.slice(2));
  if (nusach === 'ashkenaz' || nusach === 'both') {
    await buildNusach('Ashkenaz', 'ashkenaz', ASHKENAZ_GROUPS, 'Ashkenaz');
  }
  if (nusach === 'sfard' || nusach === 'sefard' || nusach === 'both') {
    await buildNusach('Sefard / Sfard', 'sefard', SEFARD_GROUPS, 'Sefard');
  }
  if (!['ashkenaz', 'sfard', 'sefard', 'both'].includes(nusach)) {
    console.error('Unknown --nusach=', nusach);
    process.exit(1);
  }
  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
