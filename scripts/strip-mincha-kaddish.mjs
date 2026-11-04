/**
 * Remove all Kaddish text (chatzi / shalem / mourning) from offline Mincha bundles.
 * Does NOT touch Kedusha (קדוש קדוש קדוש / נקדיש / נְקַדֵּשׁ).
 *
 * Usage: node scripts/strip-mincha-kaddish.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(__dirname, '../src/content/siddur/mincha/ashkenaz');

function stripNikkud(s) {
  return s.replace(/[\u0591-\u05C7]/g, '');
}

/** Hebrew Kaddish blocks: from instruction/yitgadal through last Amen of the block. */
function stripHebrewKaddish(hebrew) {
  if (!hebrew) return hebrew;
  let he = hebrew;
  const flat = () => stripNikkud(he);

  // Instruction lines that introduce kaddish (not kedusha)
  he = he.replace(
    /(?:^|\n+)\s*(?:ואומר החזן חצי קדיש|החזן אומר חצי קדיש|השליח ציבור אומר חצי קדיש|אומר החזן קדיש שלם|הש"ץ אומר קדיש שלם|קדיש שלם|חצי קדיש)\s*[:׃]?\s*/gu,
    '\n\n'
  );
  // "בימים שאין אומרים... חצי קדיש" trailing note
  he = he.replace(
    /(?:^|\n+)\s*בימים שאין אומרים[^\n]*קדיש[^\n]*/gu,
    '\n\n'
  );

  // Main body: from יתגדל / יִתְגַּדַּל through last ואמרו אמן / אמן of that block
  // Loop in case multiple kaddishes remain
  for (let pass = 0; pass < 8; pass++) {
    const stripped = stripNikkud(he);
    let start = stripped.search(/יתגדל\s*ויתקדש/);
    if (start === -1) start = stripped.indexOf('יתגדל');
    if (start === -1) break;

    // Prefer full block end markers typical of half/full kaddish
    const after = stripped.slice(start);
    let endRel = -1;
    let usedLen = 0;
    for (const end of ['ואמרו אמן', 'ואימרו אמן', 'ויאמרו אמן', 'אמרו אמן']) {
      let pos = 0;
      while (true) {
        const i = after.indexOf(end, pos);
        if (i === -1) break;
        if (i > endRel) {
          endRel = i;
          usedLen = end.length;
        }
        pos = i + end.length;
      }
    }
    // Also classic chatzi ends with יהא שמה... or לעילא ... אמן — if no ואמרו, cut after last אמן in ~800 chars
    if (endRel === -1) {
      const window = after.slice(0, 900);
      let lastAmen = -1;
      let p = 0;
      while (true) {
        const i = window.indexOf('אמן', p);
        if (i === -1) break;
        lastAmen = i;
        p = i + 2;
      }
      if (lastAmen !== -1) {
        endRel = lastAmen;
        usedLen = 3;
      }
    }
    if (endRel === -1) {
      // safety: drop from yitgadal to next double newline after 20 chars
      const next = after.indexOf('\n\n', 20);
      endRel = next === -1 ? Math.min(after.length, 600) : next;
      usedLen = 0;
    }

    let endFlat = start + endRel + usedLen;
    while (endFlat < stripped.length && /[:\s.׃]/.test(stripped[endFlat])) endFlat++;
    // extend to end of paragraph
    const nextPara = stripped.indexOf('\n\n', endFlat);
    if (nextPara !== -1 && nextPara - endFlat < 12) endFlat = nextPara + 2;

    // Map stripped indices → original
    const map = [];
    for (let i = 0; i < he.length; i++) {
      if (!/[\u0591-\u05C7]/.test(he[i])) map.push(i);
    }
    const oStart = map[start] ?? start;
    const oEnd =
      endFlat > 0 && endFlat <= map.length ? map[endFlat - 1] + 1 : he.length;

    // Include any lone label line just before (קדיש…)
    let cutStart = oStart;
    const before = he.slice(0, oStart);
    const lastNl = before.lastIndexOf('\n');
    if (lastNl !== -1) {
      const line = before.slice(lastNl + 1);
      if (/קדיש|חזן|ש["״]ץ/.test(stripNikkud(line)) && line.length < 80) {
        cutStart = lastNl + 1;
      }
    }

    he = (he.slice(0, cutStart).trimEnd() + '\n\n' + he.slice(oEnd).trimStart())
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // Drop remaining short “קדיש” instruction paragraphs
  he = he
    .split(/\n\s*\n/)
    .filter((para) => {
      const t = stripNikkud(para).replace(/\s+/g, ' ').trim();
      if (!t) return false;
      // pure kaddish labels / remnants
      if (/^י?תגדל/.test(t)) return false;
      if (/קדיש/.test(t) && t.length < 120 && !/קדוש קדוש/.test(t) && !/נקדיש/.test(t)) {
        return false;
      }
      // half-kaddish body remnants (aramaitic kaddish lines without yitgadal left)
      if (
        /יהא שמ[הה] רבא/.test(t) &&
        /מברך/.test(t) &&
        !/קדוש/.test(t)
      ) {
        return false;
      }
      if (/יתברך וישתבח/.test(t) && /דקודשא/.test(t)) return false;
      if (/לעילא מן כל ברכתא/.test(t) || /לעילא לעילא מכל ברכתא/.test(t)) return false;
      if (/בעלמא די ברא/.test(t) && /וימליך מלכותיה/.test(t)) return false;
      return true;
    })
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return he;
}

function stripEnglishKaddish(english) {
  if (!english) return english;
  let en = english;

  // Instruction + full Half/Full Kaddish translation blocks
  en = en.replace(
    /(?:The\s+)?(?:Half[- ]?Kaddish|Full\s+Kaddish|Kaddish\s+Shalem|Mourner's\s+Kaddish)[^\n]*\n?/gi,
    ''
  );
  en = en.replace(
    /(?:Exalted and sanctified)[\s\S]*?(?:and say Amein\.?)/gi,
    ''
  );
  // Common full block from yitgadal english through final amen of kaddish
  en = en.replace(
    /Exalted and sanctified[\s\S]{0,2500}?above[\s\S]{0,400}?and say Amein\.?/gi,
    ''
  );
  // Secondary kaddish phrases if split
  en = en.replace(
    /May His great Name be blessed forever and for all eternity\.?/gi,
    ''
  );
  en = en.replace(
    /Blessed and praised, glorified[\s\S]{0,800}?and say Amein\.?/gi,
    ''
  );
  en = en.replace(
    /in the world which He created according to His will[\s\S]{0,400}?and say Amein\.?/gi,
    ''
  );

  en = en
    .split(/\n\s*\n/)
    .filter((para) => {
      const t = para.replace(/\s+/g, ' ').trim();
      if (!t) return false;
      if (/^Half[- ]?Kaddish/i.test(t)) return false;
      if (/recites? (?:the )?(?:Half[- ]?)?Kaddish/i.test(t) && t.length < 200) return false;
      if (/Exalted and sanctified/i.test(t)) return false;
      if (/May His great Name be blessed forever/i.test(t) && t.length < 200) return false;
      if (/Name of the Holy One, blessed is He/i.test(t) && /elevated and extolled/i.test(t))
        return false;
      if (/above[\s\S]{0,40}all the blessings and hymns/i.test(t)) return false;
      return true;
    })
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return en;
}

function processFile(fileName) {
  const p = path.join(DIR, fileName);
  const src = fs.readFileSync(p, 'utf8');
  const m = src.match(/export const (\w+)\s*=\s*/);
  if (!m) throw new Error(`No export in ${fileName}`);
  const exportName = m[1];
  const jsonPart = src.slice(m.index + m[0].length).replace(/\s*as const;\s*$/, '');
  const obj = Function(`"use strict"; return (${jsonPart});`)();

  const beforeHe = (obj.hebrew || '').length;
  obj.hebrew = stripHebrewKaddish(obj.hebrew || '');
  obj.english = stripEnglishKaddish(obj.english || '');
  const afterHe = obj.hebrew.length;

  const leftover = stripNikkud(obj.hebrew);
  const still =
    leftover.includes('יתגדל') ||
    /י\s*תגדל/.test(leftover) ||
    (leftover.includes('קדיש') && !leftover.includes('קדוש'));
  console.log(
    `${fileName}: hebrew ${beforeHe} → ${afterHe}; leftover yitgadal/kaddish? ${still}`
  );
  if (still) {
    const i = leftover.indexOf('יתגדל');
    const j = leftover.indexOf('קדיש');
    console.log('  sample', leftover.slice(Math.max(0, (i >= 0 ? i : j) - 20), (i >= 0 ? i : j) + 80));
  }

  const body = `/**
 * Auto-generated offline Mincha (Ashkenaz weekday).
 * Re-run: node scripts/build-mincha-offline.mjs
 * Source: Sefaria (CC-BY-SA) — https://sefaria.org
 * HTML stripped; Kaddish (not Kedusha) removed for individual reader.
 */

export const ${exportName} = ${JSON.stringify(obj, null, 2)} as const;
`;
  fs.writeFileSync(p, body, 'utf8');
}

for (const f of ['ashrei.ts', 'amidah.ts', 'aleinu.ts']) {
  processFile(f);
}
console.log('Done.');
