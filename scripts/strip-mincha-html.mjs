/**
 * One-shot: strip HTML / footnotes from offline Mincha TS bundles.
 * Usage: node scripts/strip-mincha-html.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(__dirname, '../src/content/siddur/mincha/ashkenaz');

function stripHtml(s) {
  if (typeof s !== 'string') return s;
  let t = s;

  // Sefaria footnotes: <sup class="footnote-marker">N</sup><i class="footnote">...</i>
  t = t.replace(
    /<sup\b[^>]*class="[^"]*footnote-marker[^"]*"[^>]*>[\s\S]*?<\/sup>\s*<i\b[^>]*class="[^"]*footnote[^"]*"[^>]*>[\s\S]*?<\/i>/gi,
    ''
  );
  // Any remaining sup / footnotes
  t = t.replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi, '');
  t = t.replace(/<i\b[^>]*class="[^"]*footnote[^"]*"[^>]*>[\s\S]*?<\/i>/gi, '');

  // Line-break tags → newlines
  t = t.replace(/<br\s*\/?>/gi, '\n');
  t = t.replace(/<\/p>/gi, '\n\n');
  t = t.replace(/<\/div>/gi, '\n');
  t = t.replace(/<\/li>/gi, '\n');

  // All remaining tags (b, small, i, em, strong, …)
  t = t.replace(/<\/?[a-zA-Z][^>]*>/g, '');

  // Entities
  t = t
    .replace(/&nbsp;/gi, ' ')
    .replace(/&thinsp;/gi, ' ')
    .replace(/&#x2009;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));

  // Whitespace tidy (keep intentional \n\n paragraphs)
  t = t.replace(/[ \t]+\n/g, '\n');
  t = t.replace(/\n[ \t]+/g, '\n');
  t = t.replace(/[ \t]{2,}/g, ' ');
  t = t.replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

function walk(value) {
  if (typeof value === 'string') return stripHtml(value);
  if (Array.isArray(value)) return value.map(walk);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = walk(v);
    return out;
  }
  return value;
}

function processFile(fileName) {
  const p = path.join(DIR, fileName);
  const src = fs.readFileSync(p, 'utf8');
  const m = src.match(/export const (\w+)\s*=\s*/);
  if (!m) throw new Error(`No export const in ${fileName}`);
  const exportName = m[1];
  let jsonPart = src.slice(m.index + m[0].length).replace(/\s*as const;\s*$/, '');
  const obj = Function(`"use strict"; return (${jsonPart});`)();
  const cleaned = walk(obj);

  const flat = JSON.stringify(cleaned);
  const left = flat.match(/<\/?[a-zA-Z][^>]*>/g) || [];
  console.log(`${fileName}: leftover tags ${left.length}`, left.slice(0, 8));

  const body = `/**
 * Auto-generated offline Mincha (Ashkenaz weekday).
 * Re-run: node scripts/build-mincha-offline.mjs
 * Source: Sefaria (CC-BY-SA) — https://sefaria.org
 * HTML / footnotes stripped for plain reader text.
 */

export const ${exportName} = ${JSON.stringify(cleaned, null, 2)} as const;
`;
  fs.writeFileSync(p, body, 'utf8');
  console.log(`  wrote ~${Math.round(Buffer.byteLength(body, 'utf8') / 1024)} KB`);
}

for (const f of ['ashrei.ts', 'amidah.ts', 'aleinu.ts']) {
  processFile(f);
}
console.log('Done.');
