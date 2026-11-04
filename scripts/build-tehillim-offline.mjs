/**
 * Bundle all 150 Tehillim chapters from Sefaria (CC-BY-SA).
 *
 * Usage:
 *   node scripts/build-tehillim-offline.mjs
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '../src/content/tehillim/offline');
const SEFARIA = 'https://www.sefaria.org/api/texts';

function tidyVerse(s) {
  let t = String(s ?? '').replace(/\r\n/g, '\n');
  t = t.replace(/<br\s*\/?>/gi, '\n');
  t = t.replace(
    /<sup\b[^>]*class="[^"]*footnote-marker[^"]*"[^>]*>[\s\S]*?<\/sup>\s*<i\b[^>]*class="[^"]*footnote[^"]*"[^>]*>[\s\S]*?<\/i>/gi,
    ''
  );
  t = t.replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi, '');
  t = t.replace(/<i\b[^>]*class="[^"]*footnote[^"]*"[^>]*>[\s\S]*?<\/i>/gi, '');
  t = t.replace(/<\/?[a-zA-Z][^>]*>/g, '');
  t = t
    .replace(/&nbsp;/gi, ' ')
    .replace(/&thinsp;/gi, ' ')
    .replace(/&#x2009;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'");
  t = t.replace(/\s*[{\[\(]\s*[פס][\u0591-\u05C7]*\s*[}\]\)]\s*/g, '');
  t = t.replace(/\s*[{\[\(]\s*[PSps]\s*[}\]\)]\s*/g, '');
  t = t.replace(/[ \t]+/g, ' ').trim();
  return t;
}

function toVerseList(v) {
  if (Array.isArray(v)) {
    if (v.length && Array.isArray(v[0])) return v.flatMap((ch) => toVerseList(ch));
    return v.map((x) => tidyVerse(x)).filter(Boolean);
  }
  const s = tidyVerse(v);
  return s ? [s] : [];
}

function numberToHebrew(num) {
  const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
  const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
  const hundreds = ['', 'ק', 'ר', 'ש', 'ת'];
  if (num === 15) return 'ט״ו';
  if (num === 16) return 'ט״ז';
  let n = num;
  let result = '';
  if (n >= 100) {
    result += hundreds[Math.floor(n / 100)];
    n %= 100;
  }
  if (n >= 10) {
    result += tens[Math.floor(n / 10)];
    n %= 10;
  }
  if (n > 0) result += ones[n];
  if (result.length === 1) return result + '׳';
  if (result.length > 1) return result.slice(0, -1) + '״' + result.slice(-1);
  return result;
}

async function fetchChapter(chapter) {
  const ref = `Psalms.${chapter}`;
  const encodings = [encodeURIComponent(ref), encodeURIComponent(ref.replace('.', ' '))];
  for (const enc of encodings) {
    const url = `${SEFARIA}/${enc}?context=0`;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const json = await res.json();
      const heList = toVerseList(json.he ?? json.hebrew);
      const enList = toVerseList(json.text ?? json.en ?? json.english);
      if (!heList.length) continue;
      const verses = heList.map((hebrew, i) => ({
        number: i + 1,
        hebrew,
        english: enList[i] || '',
      }));
      return {
        number: chapter,
        hebrewNumber: numberToHebrew(chapter),
        title: json.heTitle || `תהלים ${numberToHebrew(chapter)}`,
        verses,
      };
    } catch (e) {
      console.warn(`  fail ${ref}`, e.message || e);
    }
  }
  return null;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const chapters = {};
  let misses = 0;
  for (let i = 1; i <= 150; i++) {
    const ch = await fetchChapter(i);
    if (ch) {
      chapters[i] = ch;
      console.log(`  OK ${i} (${ch.verses.length} verses)`);
    } else {
      misses += 1;
      console.warn(`  MISS Psalms.${i}`);
    }
    await new Promise((r) => setTimeout(r, 40));
  }
  const body = `/**
 * Auto-generated offline Tehillim (Psalms 1–150).
 * Re-run: node scripts/build-tehillim-offline.mjs
 * Source: Sefaria (CC-BY-SA) — https://sefaria.org
 */

export const TEHILLIM_OFFLINE_META = {
  builtAt: ${JSON.stringify(new Date().toISOString())},
  source: 'Sefaria',
  attribution: 'Texts provided by Sefaria (sefaria.org) under CC-BY-SA — Psalms / Tehillim',
  chapterCount: ${Object.keys(chapters).length},
} as const;

export const TEHILLIM_OFFLINE_CHAPTERS: Record<
  number,
  {
    number: number;
    hebrewNumber: string;
    title: string;
    verses: { number: number; hebrew: string; english: string }[];
  }
> = ${JSON.stringify(chapters, null, 2)};
`;
  const outFile = path.join(OUT_DIR, 'raw.ts');
  fs.writeFileSync(outFile, body, 'utf8');
  console.log(
    `wrote ${path.relative(path.join(__dirname, '..'), outFile)} ~${Math.round(Buffer.byteLength(body, 'utf8') / 1024)} KB (${Object.keys(chapters).length}/150, misses=${misses})`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
