/**
 * Build offline weekday Maariv packs from Sefaria (Ashkenaz + Sfard).
 *
 * Usage:
 *   node scripts/build-maariv-offline.mjs
 *   node scripts/build-maariv-offline.mjs --nusach=sfard
 *   node scripts/build-maariv-offline.mjs --nusach=both
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '../src/content/siddur/maariv');
const SEFARIA = 'https://www.sefaria.org/api/texts';

const AMIDA_BRACHOT_ASHKENAZ = [
  'Patriarchs',
  'Divine Might',
  'Holiness of God',
  'Knowledge',
  'Repentance',
  'Forgiveness',
  'Redemption',
  'Healing',
  'Prosperity',
  'Gathering the Exiles',
  'Justice',
  'Against Enemies',
  'The Righteous',
  'Rebuilding Jerusalem',
  'Kingdom of David',
  'Response to Prayer',
  'Temple Service',
  'Thanksgiving',
  'Peace',
  'Concluding Passage',
];

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

/** One Sefaria leaf → one reader paragraph (internal \n\n become single \n). */
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

function writeTs(outDir, fileName, exportName, payload, headerNote) {
  const body = `/**
 * Auto-generated offline Maariv (${headerNote}).
 * Re-run: node scripts/build-maariv-offline.mjs
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

const ASH_PREFIX = 'Siddur Ashkenaz, Weekday, Maariv, ';

const ASHKENAZ_GROUPS = {
  maariv_shema: [
    'Vehu Rachum',
    'Barchu',
    'Blessings of the Shema, First Blessing before Shema',
    'Blessings of the Shema, Second Blessing before Shema',
    'Blessings of the Shema, Shema',
    'Blessings of the Shema, First Blessing after Shema',
    'Blessings of the Shema, Second Blessing after Shema',
    'Blessings of the Shema, Third Blessing after Shema',
  ],
  maariv_amidah: AMIDA_BRACHOT_ASHKENAZ.map((name) => `Amidah, ${name}`),
  maariv_aleinu: ['Alenu', 'LeDavid'],
  maariv_motzaei: [
    "Additions for Motza'ei Shabbat, Viyehi Noam",
    "Additions for Motza'ei Shabbat, Veyiten Lekha",
  ],
  maariv_omer: ['Sefirat HaOmer'],
};

async function buildAshkenaz() {
  const OUT = path.join(ROOT, 'ashkenaz');
  console.log('\n=== Ashkenaz Maariv ===');
  const sections = {};
  const sources = {};
  for (const [key, tails] of Object.entries(ASHKENAZ_GROUPS)) {
    console.log(key);
    const got = await fetchMany(tails.map((t) => ASH_PREFIX + t));
    sections[key] = { key, hebrew: got.hebrew, english: got.english };
    sources[key] = got.sources;
  }
  writeTs(OUT, 'raw.ts', 'MAARIV_ASHKENAZ_RAW', sections, 'Ashkenaz weekday');
  writeTs(
    OUT,
    'meta.ts',
    'MAARIV_OFFLINE_META',
    {
      nusach: 'ashkenaz',
      service: 'maariv',
      builtAt: new Date().toISOString(),
      source: 'Sefaria',
      attribution: 'Texts provided by Sefaria (sefaria.org) under CC-BY-SA — Siddur Ashkenaz',
      sections: Object.keys(ASHKENAZ_GROUPS),
      amidahBrachot: AMIDA_BRACHOT_ASHKENAZ,
      sources,
    },
    'Ashkenaz weekday'
  );
}

async function buildSefard() {
  const OUT = path.join(ROOT, 'sefard');
  console.log('\n=== Sefard / Sfard Maariv ===');
  const groups = {
    maariv_shema: ['Siddur Sefard, Weekday Maariv, The Shema'],
    maariv_amidah: ['Siddur Sefard, Weekday Maariv, Amidah'],
    maariv_motzaei: ['Siddur Sefard, Weekday Maariv, Motzaei Shabbat'],
    maariv_omer: ['Siddur Sefard, Weekday Maariv, Sefirat HaOmer'],
  };

  const sections = {};
  const sources = {};
  for (const [key, refs] of Object.entries(groups)) {
    console.log(key);
    const got = await fetchMany(refs);
    sections[key] = { key, hebrew: got.hebrew, english: got.english };
    sources[key] = got.sources;
  }

  console.log('maariv_aleinu (Sefard Shacharit Aleinu + L\'David)…');
  const aleinuCandidates = [
    ['Siddur Sefard, Weekday Shacharit, Aleinu', 'Siddur Sefard, Weekday Shacharit, L\'David Hashem'],
    ['Siddur Ashkenaz, Weekday, Maariv, Alenu', 'Siddur Ashkenaz, Weekday, Maariv, LeDavid'],
    ['Siddur Ashkenaz, Weekday, Shacharit, Concluding Prayers, Alenu'],
  ];
  let aleinu = { hebrew: '', english: '', sources: [] };
  for (const refs of aleinuCandidates) {
    const got = await fetchMany(refs);
    if (got.hebrew) {
      aleinu = got;
      break;
    }
  }
  sections.maariv_aleinu = { key: 'maariv_aleinu', hebrew: aleinu.hebrew, english: aleinu.english };
  sources.maariv_aleinu = aleinu.sources;

  writeTs(OUT, 'raw.ts', 'MAARIV_SEFARD_RAW', sections, 'Sefard/Sfard weekday');
  writeTs(
    OUT,
    'meta.ts',
    'MAARIV_OFFLINE_META',
    {
      nusach: 'sfard',
      service: 'maariv',
      builtAt: new Date().toISOString(),
      source: 'Sefaria',
      attribution: 'Texts provided by Sefaria (sefaria.org) under CC-BY-SA — Siddur Sefard',
      sections: Object.keys(sections),
      note:
        'Bundled RAW from Siddur Sefard Weekday Maariv. Aleinu/L\'David from Weekday Shacharit (Sefard Maariv tree has no standalone Aleinu). OfflineMaarivService applies shared Amidah pipeline + calendar gates.',
      sources,
    },
    'Sefard/Sfard weekday'
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
  if (nusach === 'ashkenaz' || nusach === 'both') await buildAshkenaz();
  if (nusach === 'sfard' || nusach === 'sefard' || nusach === 'both') await buildSefard();
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
