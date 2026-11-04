/**
 * Build offline Mincha packs from Sefaria.
 *
 * Usage:
 *   node scripts/build-mincha-offline.mjs              # ashkenaz (default)
 *   node scripts/build-mincha-offline.mjs --nusach=sfard
 *   node scripts/build-mincha-offline.mjs --nusach=both
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '../src/content/siddur/mincha');
const SEFARIA = 'https://www.sefaria.org/api/texts';

const AMIDA_BRACHOT_ASHKENAZ = [
  'Patriarchs',
  'Divine Might',
  'Holiness of God',
  'Keduasha',
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
  'Birkat Kohanim',
  'Peace',
  'Concluding Passage',
];

function toStr(v) {
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.map((x) => toStr(x)).join('\n\n');
  if (v && typeof v === 'object' && 'text' in v) return String(v.text);
  return String(v ?? '');
}

/** Plain text for offline bundle: drop HTML tags / footnotes, keep paragraph breaks. */
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

async function fetchSefaria(ref) {
  const encodings = [encodeURIComponent(ref), encodeURIComponent(ref.replace(/ /g, '_'))];
  for (const enc of encodings) {
    const url = `${SEFARIA}/${enc}?context=0`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`  HTTP ${res.status} ${ref}`);
        continue;
      }
      const json = await res.json();
      const hebrew = tidyRaw(toStr(json.he ?? json.hebrew));
      const english = tidyRaw(toStr(json.text ?? json.en ?? json.english));
      if (hebrew) {
        console.log(`  OK ${ref} (${hebrew.length} he)`);
        return { hebrew, english };
      }
    } catch (e) {
      console.warn(`  fail ${ref}`, e.message || e);
    }
  }
  return null;
}

function writeTs(outDir, fileName, exportName, payload, headerNote) {
  const body = `/**
 * Auto-generated offline Mincha (${headerNote}).
 * Re-run: node scripts/build-mincha-offline.mjs --nusach=${headerNote.includes('Sefard') || headerNote.includes('sfard') ? 'sfard' : 'ashkenaz'}
 * Source: Sefaria (CC-BY-SA) — https://sefaria.org
 */

export const ${exportName} = ${JSON.stringify(payload, null, 2)} as const;
`;
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, fileName), body, 'utf8');
  console.log(`wrote ${path.relative(ROOT, path.join(outDir, fileName))} ~${Math.round(Buffer.byteLength(body, 'utf8') / 1024)} KB`);
}

/** Split Sefard Mincha Korbanot blob: pre-Ashrei קרבנות vs Ashrei (+ chatzi kaddish). */
function splitAshreiFromKorbanot(hebrew, english) {
  const stripNikkud = (s) => s.replace(/[\u0591-\u05C7]/g, '');
  const hebParas = hebrew.split(/\n\s*\n/);
  const engParas = english.split(/\n\s*\n/);
  let ashreiIdx = -1;
  for (let i = 0; i < hebParas.length; i++) {
    if (stripNikkud(hebParas[i].trim()).startsWith('אשרי')) {
      ashreiIdx = i;
      break;
    }
  }
  if (ashreiIdx < 0) {
    for (let i = 0; i < hebParas.length; i++) {
      const st = stripNikkud(hebParas[i]);
      if (/אשרי\s+יושבי|אשרי\s+תמימי|אשרי\s+העם/.test(st) || /תהלה\s+לדוד/.test(st)) {
        ashreiIdx = i;
        break;
      }
    }
  }
  if (ashreiIdx < 0) {
    return {
      ashreiHebrew: hebrew,
      ashreiEnglish: english,
      korbanotHebrew: '',
      korbanotEnglish: '',
      found: false,
    };
  }
  const engIdx = Math.min(ashreiIdx, engParas.length);
  return {
    korbanotHebrew: hebParas.slice(0, ashreiIdx).join('\n\n').trim(),
    korbanotEnglish: engParas.slice(0, engIdx).join('\n\n').trim(),
    ashreiHebrew: hebParas.slice(ashreiIdx).join('\n\n').trim(),
    ashreiEnglish: engParas.slice(engIdx).join('\n\n').trim(),
    found: true,
  };
}

async function buildAshkenaz() {
  const OUT_DIR = path.join(ROOT, 'ashkenaz');
  console.log('\n=== Ashkenaz Mincha ===');

  console.log('Ashrei...');
  const ashrei = await fetchSefaria('Siddur Ashkenaz, Weekday, Minchah, Ashrei');
  if (!ashrei) throw new Error('Ashkenaz Ashrei fetch failed');
  writeTs(OUT_DIR, 'ashrei.ts', 'MINCHA_ASHREI_RAW', {
    key: 'mincha_ashrei',
    hebrew: ashrei.hebrew,
    english: ashrei.english,
  }, 'Ashkenaz weekday');

  console.log('Amida (by bracha)...');
  const brachaPartsHe = [];
  const brachaPartsEn = [];
  for (const name of AMIDA_BRACHOT_ASHKENAZ) {
    const part = await fetchSefaria(`Siddur Ashkenaz, Weekday, Minchah, Amida, ${name}`);
    if (!part) throw new Error(`Ashkenaz amida missing: ${name}`);
    brachaPartsHe.push(part.hebrew);
    brachaPartsEn.push(part.english);
  }
  writeTs(OUT_DIR, 'amidah.ts', 'MINCHA_AMIDAH_RAW', {
    key: 'mincha_amidah',
    hebrew: brachaPartsHe.join('\n\n'),
    english: brachaPartsEn.filter(Boolean).join('\n\n'),
    brachot: AMIDA_BRACHOT_ASHKENAZ,
  }, 'Ashkenaz weekday');

  console.log('Aleinu...');
  const aleinu =
    (await fetchSefaria('Siddur Ashkenaz, Weekday, Minchah, Concluding Prayers, Alenu')) ||
    (await fetchSefaria('Siddur Ashkenaz, Weekday, Shacharit, Concluding Prayers, Alenu'));
  if (!aleinu) throw new Error('Ashkenaz Aleinu fetch failed');
  writeTs(OUT_DIR, 'aleinu.ts', 'MINCHA_ALEINU_RAW', {
    key: 'mincha_aleinu',
    hebrew: aleinu.hebrew,
    english: aleinu.english,
  }, 'Ashkenaz weekday');

  writeTs(OUT_DIR, 'meta.ts', 'MINCHA_OFFLINE_META', {
    nusach: 'ashkenaz',
    service: 'mincha',
    builtAt: new Date().toISOString(),
    source: 'Sefaria',
    attribution: 'Texts provided by Sefaria (sefaria.org) under CC-BY-SA',
    sections: ['mincha_ashrei', 'mincha_amidah', 'mincha_aleinu'],
    note:
      'Bundled RAW from Minchah schema. OfflineMinchaService applies cosmetic + seasonal locally (no network).',
    amidahBrachot: AMIDA_BRACHOT_ASHKENAZ,
  }, 'Ashkenaz weekday');
}

async function buildSefard() {
  const OUT_DIR = path.join(ROOT, 'sefard');
  console.log('\n=== Sefard / Sfard Mincha ===');

  console.log('Korbanot (Mincha — Tzav / ketoret / Ana B\'koach; Ashrei split off)...');
  const kor = await fetchSefaria('Siddur Sefard, Weekday Mincha, Korbanot');
  if (!kor) throw new Error('Sefard Korbanot fetch failed');
  const split = splitAshreiFromKorbanot(kor.hebrew, kor.english);
  if (!split.found) console.warn('  WARN: could not isolate Ashrei — bundling full Korbanot as ashrei');
  writeTs(OUT_DIR, 'korbanot.ts', 'MINCHA_KORBANOT_RAW', {
    key: 'mincha_korbanot',
    hebrew: split.korbanotHebrew,
    english: split.korbanotEnglish,
    sourceRef: 'Siddur Sefard, Weekday Mincha, Korbanot',
  }, 'Sefard/Sfard weekday');
  writeTs(OUT_DIR, 'ashrei.ts', 'MINCHA_ASHREI_RAW', {
    key: 'mincha_ashrei',
    hebrew: split.ashreiHebrew,
    english: split.ashreiEnglish,
  }, 'Sefard/Sfard weekday');

  console.log('Amidah (monolithic)...');
  const amidah = await fetchSefaria('Siddur Sefard, Weekday Mincha, Amidah');
  if (!amidah) throw new Error('Sefard Amidah fetch failed');
  writeTs(OUT_DIR, 'amidah.ts', 'MINCHA_AMIDAH_RAW', {
    key: 'mincha_amidah',
    hebrew: amidah.hebrew,
    english: amidah.english,
  }, 'Sefard/Sfard weekday');

  console.log('Aleinu (Shacharit concluding — Sefard Mincha tree has no standalone Aleinu)...');
  // Try several paths; fall back to Ashkenaz Aleinu wording if Sefard tree lacks it.
  const aleinuCandidates = [
    'Siddur Sefard, Weekday Shacharit, Concluding Prayers, Alenu',
    'Siddur Sefard, Weekday Shacharit, Concluding Prayers, Aleinu',
    'Siddur Sefard, Weekday, Concluding Prayers, Alenu',
    'Siddur Ashkenaz, Weekday, Shacharit, Concluding Prayers, Alenu',
    'Siddur Ashkenaz, Weekday, Minchah, Concluding Prayers, Alenu',
  ];
  let aleinu = null;
  let aleinuSource = '';
  for (const ref of aleinuCandidates) {
    aleinu = await fetchSefaria(ref);
    if (aleinu) {
      aleinuSource = ref;
      break;
    }
  }
  if (!aleinu) throw new Error('Aleinu fetch failed for Sefard pack');
  writeTs(OUT_DIR, 'aleinu.ts', 'MINCHA_ALEINU_RAW', {
    key: 'mincha_aleinu',
    hebrew: aleinu.hebrew,
    english: aleinu.english,
    sourceRef: aleinuSource,
  }, 'Sefard/Sfard weekday');

  writeTs(OUT_DIR, 'meta.ts', 'MINCHA_OFFLINE_META', {
    nusach: 'sfard',
    service: 'mincha',
    builtAt: new Date().toISOString(),
    source: 'Sefaria',
    attribution: 'Texts provided by Sefaria (sefaria.org) under CC-BY-SA — Siddur Sefard',
    sections: ['mincha_korbanot', 'mincha_ashrei', 'mincha_amidah', 'mincha_aleinu'],
    note:
      'Bundled RAW from Siddur Sefard Weekday Mincha. Korbanot is the pre-Ashrei Mincha recitation (Tzav, ketoret, Ana B\'koach). OfflineMinchaService applies policy (מוריד הטל summer, etc.) + shared seasonal pipeline.',
    sources: {
      korbanot: 'Siddur Sefard, Weekday Mincha, Korbanot → text before אשרי',
      ashrei: 'Siddur Sefard, Weekday Mincha, Korbanot → from אשרי',
      amidah: 'Siddur Sefard, Weekday Mincha, Amidah',
      aleinu: aleinuSource,
    },
  }, 'Sefard/Sfard weekday');
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
    console.error('Unknown --nusach=', nusach, '(use ashkenaz | sfard | both)');
    process.exit(1);
  }
  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
