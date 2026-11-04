/**
 * Build offline weekday Shacharit packs from Sefaria (Ashkenaz + Sfard).
 *
 * Usage:
 *   node scripts/build-shacharit-offline.mjs
 *   node scripts/build-shacharit-offline.mjs --nusach=sfard
 *   node scripts/build-shacharit-offline.mjs --nusach=both
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '../src/content/siddur/shacharit');
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

/** One Sefaria leaf → one reader paragraph (internal \n\n become single \n). */
function formatLeaf(he) {
  return stripInstructionLines(tidyRaw(he).replace(/\n{2,}/g, '\n').trim());
}

function joinLeaves(parts) {
  return parts.map((p) => (p || '').trim()).filter(Boolean).join('\n\n');
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
 * Auto-generated offline Shacharit (${headerNote}).
 * Re-run: node scripts/build-shacharit-offline.mjs
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

function stripNikkud(s) {
  return s.replace(/[\u0591-\u05C7]/g, '');
}

function splitSefardShema(hebrew, english) {
  const paras = hebrew.split(/\n\s*\n/);
  const eng = english.split(/\n\s*\n/);
  let idx = -1;
  for (let i = 0; i < paras.length; i++) {
    const st = stripNikkud(paras[i].trim());
    if (/^שמע\s+ישראל/.test(st) || st.startsWith('שמע ישראל')) {
      idx = i;
      break;
    }
  }
  if (idx < 0) {
    return { yotzerHebrew: hebrew, yotzerEnglish: english, shemaHebrew: '', shemaEnglish: '' };
  }
  const ei = Math.min(idx, eng.length);
  return {
    yotzerHebrew: paras.slice(0, idx).join('\n\n').trim(),
    yotzerEnglish: eng.slice(0, ei).join('\n\n').trim(),
    shemaHebrew: paras.slice(idx).join('\n\n').trim(),
    shemaEnglish: eng.slice(ei).join('\n\n').trim(),
  };
}

const ASH_PREFIX = 'Siddur Ashkenaz, Weekday, Shacharit, ';

const ASHKENAZ_GROUPS = {
  tallit: ['Preparatory Prayers, Tallit'],
  tefillin: ['Preparatory Prayers, Tefillin'],
  preparatory: [
    'Preparatory Prayers, Modeh Ani',
    'Preparatory Prayers, Netilat Yadayim',
    'Preparatory Prayers, Asher Yatzar',
    'Preparatory Prayers, Elokai Neshama',
    'Preparatory Prayers, Tzitzit',
    'Preparatory Prayers, Torah Blessings',
    'Preparatory Prayers, Torah Study',
    'Preparatory Prayers, Ma Tovu',
    'Preparatory Prayers, Adon Olam',
    'Preparatory Prayers, Yigdal',
  ],
  birchot_hashachar: [
    'Preparatory Prayers, Morning Blessings',
    'Preparatory Prayers, Akedah',
    'Preparatory Prayers, Sovereignty of Heaven',
  ],
  korbanot: [
    'Preparatory Prayers, Korbanot, Kiyor',
    'Preparatory Prayers, Korbanot, Terumat HaDeshen',
    'Preparatory Prayers, Korbanot, Korban HaTamid',
    'Preparatory Prayers, Korbanot, Ketoret',
    'Preparatory Prayers, Korbanot, Order of the Temple Service',
    'Preparatory Prayers, Korbanot, Laws of Sacrifices',
    'Preparatory Prayers, Korbanot, Baraita of Rabbi Yishmael',
  ],
  pesukei_dzimra: [
    'Pesukei Dezimra, Introductory Psalm',
    "Pesukei Dezimra, Barukh She'amar",
    'Pesukei Dezimra, Hodu',
    'Pesukei Dezimra, Mizmor Letoda',
    'Pesukei Dezimra, Yehi Chevod',
    'Pesukei Dezimra, Ashrei',
    'Pesukei Dezimra, Psalm 146',
    'Pesukei Dezimra, Psalm 147',
    'Pesukei Dezimra, Psalm 148',
    'Pesukei Dezimra, Psalm 149',
    'Pesukei Dezimra, Psalm 150',
    'Pesukei Dezimra, Closing Verses',
    'Pesukei Dezimra, Vayevarech David',
    'Pesukei Dezimra, Ata Hu',
    'Pesukei Dezimra, Az Yashir',
    'Pesukei Dezimra, Yishtabach',
    'Pesukei Dezimra, Psalm 130',
  ],
  yotzer_or: [
    'Blessings of the Shema, Barchu',
    'Blessings of the Shema, First Blessing before Shema',
    'Blessings of the Shema, Second Blessing before Shema',
  ],
  shema: ['Blessings of the Shema, Shema', 'Blessings of the Shema, Blessing after Shema'],
  amidah: [
    'Amidah, Patriarchs',
    'Amidah, Divine Might',
    'Amidah, Holiness of God',
    'Amidah, Kedushah',
    'Amidah, Knowledge',
    'Amidah, Repentance',
    'Amidah, Forgiveness',
    'Amidah, Redemption',
    'Amidah, Healing',
    'Amidah, Prosperity',
    'Amidah, Gathering the Exiles',
    'Amidah, Justice',
    'Amidah, Against Enemies',
    'Amidah, The Righteous',
    'Amidah, Rebuilding Jerusalem',
    'Amidah, Kingdom of David',
    'Amidah, Response to Prayer',
    'Amidah, Temple Service',
    'Amidah, Thanksgiving',
    'Amidah, Birkat Kohanim',
    'Amidah, Peace',
    'Amidah, Concluding Passage',
  ],
  tachanun: [
    'Post Amidah, Vidui and 13 Middot',
    'Post Amidah, Avinu Malkenu',
    'Post Amidah, Tachanun, For Monday and Thursday',
    'Post Amidah, Tachanun, Nefilat Apayim',
    'Post Amidah, Tachanun, God of Israel',
    'Post Amidah, Tachanun, Shomer Yisrael',
  ],
  ashrei: [
    'Concluding Prayers, Ashrei',
    "Concluding Prayers, Lamenatze'ach",
    'Concluding Prayers, Uva Letzion',
  ],
  concluding: [
    'Concluding Prayers, Alenu',
    'Concluding Prayers, Song of the Day',
    'Concluding Prayers, Barchi Nafshi',
    'Concluding Prayers, LeDavid',
  ],
  torah_reading: [
    'Torah Reading, Removing the Torah from Ark, El Erech Appayim',
    'Torah Reading, Removing the Torah from Ark, Vayehi Binsoa',
    'Torah Reading, Removing the Torah from Ark, Berich Shmei',
    'Torah Reading, Removing the Torah from Ark, Lekha Hashem',
    'Torah Reading, Removing the Torah from Ark, Av Harachamim',
    'Torah Reading, Removing the Torah from Ark, Vetigaleh Veteraeh',
    'Torah Reading, Reading from Sefer, Birkat HaTorah',
    'Torah Reading, Reading from Sefer, Birkat Hagomel',
    'Torah Reading, Reading from Sefer, Raising the Torah',
    'Torah Reading, Returning Sefer to Aron, Yehalelu',
    'Torah Reading, Returning Sefer to Aron, LeDavid Mizmor',
    'Torah Reading, Returning Sefer to Aron, Uvenucho Yomar',
  ],
};

async function buildAshkenaz() {
  const OUT = path.join(ROOT, 'ashkenaz');
  console.log('\n=== Ashkenaz Shacharit ===');
  const sections = {};
  const sources = {};
  for (const [key, tails] of Object.entries(ASHKENAZ_GROUPS)) {
    console.log(key);
    const got = await fetchMany(tails.map((t) => ASH_PREFIX + t));
    sections[key] = { key, hebrew: got.hebrew, english: got.english };
    sources[key] = got.sources;
  }
  writeTs(OUT, 'raw.ts', 'SHACHARIT_ASHKENAZ_RAW', sections, 'Ashkenaz weekday');
  writeTs(
    OUT,
    'meta.ts',
    'SHACHARIT_OFFLINE_META',
    {
      nusach: 'ashkenaz',
      service: 'shacharit',
      builtAt: new Date().toISOString(),
      source: 'Sefaria',
      attribution: 'Texts provided by Sefaria (sefaria.org) under CC-BY-SA — Siddur Ashkenaz',
      sections: Object.keys(ASHKENAZ_GROUPS),
      sources,
    },
    'Ashkenaz weekday'
  );
}

async function buildSefard() {
  const OUT = path.join(ROOT, 'sefard');
  console.log('\n=== Sefard / Sfard Shacharit ===');
  const P = 'Siddur Sefard, ';
  const groups = {
    tallit: [`${P}Upon Arising, Tallit`],
    tefillin: [`${P}Upon Arising, Tefilin`],
    preparatory: [`${P}Upon Arising, Modeh Ani`, `${P}Upon Arising, Upon Entering Synagogue`],
    birchot_hashachar: [
      `${P}Weekday Shacharit, Morning Blessings`,
      `${P}Weekday Shacharit, Blessings on Torah`,
      `${P}Weekday Shacharit, Morning Prayer`,
    ],
    korbanot: [
      `${P}Weekday Shacharit, Korbanot`,
      `${P}Weekday Shacharit, B'raita d'Rabi Yishmael`,
    ],
    pesukei_dzimra: [`${P}Weekday Shacharit, Hodu`, `${P}Weekday Shacharit, Yishtabach`],
    shema_bundle: [`${P}Weekday Shacharit, The Shema`],
    amidah: [`${P}Weekday Shacharit, Amidah`],
    tachanun: [
      `${P}Weekday Shacharit, Tachanun`,
      `${P}Weekday Shacharit, Avinu Malkeinu`,
      `${P}Weekday Shacharit, For Monday & Thursday`,
    ],
    ashrei: [`${P}Weekday Shacharit, Ashrei`, `${P}Weekday Shacharit, Beit Yaakov`],
    concluding: [
      `${P}Weekday Shacharit, Song of the Day`,
      `${P}Weekday Shacharit, Barchi Nafshi`,
      `${P}Weekday Shacharit, L'David Hashem`,
      `${P}Weekday Shacharit, Kaveh`,
      `${P}Weekday Shacharit, Aleinu`,
    ],
    torah_reading: [`${P}Weekday Shacharit, Torah Reading`],
  };

  const sections = {};
  const sources = {};
  let shemaBundle = { hebrew: '', english: '' };
  for (const [key, refs] of Object.entries(groups)) {
    console.log(key);
    const got = await fetchMany(refs);
    sources[key] = got.sources;
    if (key === 'shema_bundle') {
      shemaBundle = got;
      continue;
    }
    sections[key] = { key, hebrew: got.hebrew, english: got.english };
  }
  const split = splitSefardShema(shemaBundle.hebrew, shemaBundle.english);
  sections.yotzer_or = { key: 'yotzer_or', hebrew: split.yotzerHebrew, english: split.yotzerEnglish };
  sections.shema = { key: 'shema', hebrew: split.shemaHebrew, english: split.shemaEnglish };
  sources.yotzer_or = sources.shema_bundle;
  sources.shema = sources.shema_bundle;
  delete sources.shema_bundle;

  writeTs(OUT, 'raw.ts', 'SHACHARIT_SEFARD_RAW', sections, 'Sefard/Sfard weekday');
  writeTs(
    OUT,
    'meta.ts',
    'SHACHARIT_OFFLINE_META',
    {
      nusach: 'sfard',
      service: 'shacharit',
      builtAt: new Date().toISOString(),
      source: 'Sefaria',
      attribution: 'Texts provided by Sefaria (sefaria.org) under CC-BY-SA — Siddur Sefard',
      sections: Object.keys(sections),
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
