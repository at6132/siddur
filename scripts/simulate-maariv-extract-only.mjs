/** Pure JS port of kedusha + modim extract against Maariv raw. */
import fs from 'node:fs';

const stripNikkud = (s) => s.replace(/[\u0591-\u05C7]/g, '');
const stripHtml = (s) => s.replace(/<[^>]+>/g, '');

function load(nusach) {
  const t = fs.readFileSync(`src/content/siddur/maariv/${nusach}/raw.ts`, 'utf8');
  const re =
    /"maariv_amidah"\s*:\s*\{\s*"key"\s*:\s*"maariv_amidah"\s*,\s*"hebrew"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"english"\s*:\s*"((?:\\.|[^"\\])*)"/;
  const m = t.match(re);
  const u = (s) => s.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  return { hebrew: u(m[1]), english: u(m[2]) };
}

function findStart(stripped) {
  const backToInstruction = (from) => {
    const windowStart = Math.max(0, from - 280);
    const win = stripped.slice(windowStart, from);
    const candidates = [];
    const bch = win.search(/בחזרת[\s\S]{0,100}?קדושה/);
    if (bch !== -1) candidates.push(windowStart + bch);
    for (const open of ['נקדישך', 'נעריצך', 'נקדש']) {
      const i = win.indexOf(open);
      if (i !== -1) candidates.push(windowStart + i);
    }
    if (candidates.length) return Math.min(...candidates);
    return from;
  };
  for (const open of ['נקדישך', 'נעריצך', 'נקדש']) {
    const i = stripped.indexOf(open);
    if (i !== -1) return backToInstruction(i);
  }
  const thrice = stripped.indexOf('קדוש קדוש קדוש');
  if (thrice !== -1) return backToInstruction(thrice);
  const mPrimary = stripped.match(/בחזרת[\s\S]{0,320}?קדושה/);
  if (mPrimary?.index !== undefined) return mPrimary.index;
  const mAlt = stripped.match(/חזרת[\s\S]{0,60}?הש["״\u05F4]?צ[\s\S]{0,240}?קדושה/);
  return mAlt?.index ?? -1;
}

function findEnd(stripped, startS) {
  const KEDUSHA_LEDOR_MAX_FROM_START = 2800;
  const fullLed = stripped.indexOf('לדור ודור', startS);
  if (fullLed !== -1 && fullLed - startS < KEDUSHA_LEDOR_MAX_FROM_START) {
    const slice = stripped.slice(fullLed, Math.min(stripped.length, fullLed + 750));
    let endRel = -1;
    const chatima = /(?:האל|המלך)\s*הקדוש/g;
    let cm;
    while ((cm = chatima.exec(slice)) !== null) endRel = cm.index + cm[0].length;
    if (endRel !== -1) {
      let endS = fullLed + endRel;
      while (endS < stripped.length && /[:׃\s.\u05be־;]/.test(stripped[endS])) endS++;
      return endS;
    }
  }
  const defLed = stripped.indexOf('לדר ודר', startS);
  if (defLed !== -1) {
    const nearHl = stripped.indexOf('הללויה', defLed);
    if (nearHl !== -1 && nearHl - defLed < 40) {
      let endS = nearHl + 'הללויה'.length;
      while (endS < stripped.length && /[:׃\s.\u05be־;]/.test(stripped[endS])) endS++;
      return endS;
    }
  }
  const hl = 'הללויה';
  const hIdx = stripped.indexOf(hl, startS);
  if (hIdx === -1) return -1;
  let endS = hIdx + hl.length;
  while (endS < stripped.length && /[:׃\s.\u05be־;]/.test(stripped[endS])) endS++;
  return endS;
}

function splitSlot(mainHebrew) {
  const hNo = mainHebrew;
  let stripped = '';
  const toOrig = [];
  for (let i = 0; i < hNo.length; i++) {
    if (/[\u0591-\u05C7]/.test(hNo[i])) continue;
    if (hNo[i] === '\u200c' || hNo[i] === '\u200d') continue;
    stripped += stripNikkud(hNo[i]);
    toOrig.push(i);
  }
  let kedSt = stripped.indexOf('אתה קדוש ושמך קדוש');
  if (kedSt === -1) kedSt = stripped.indexOf('אתה קדוש ושמך');
  if (kedSt === -1) kedSt = stripped.indexOf('אתה קדוש');
  if (kedSt === -1) {
    const atahChonen = stripped.search(/אתה חונן(?:\s+ל אדם|\s+לאדם)?/);
    kedSt = atahChonen !== -1 ? atahChonen : stripped.indexOf('אתה חונן');
  }
  if (kedSt < 0) return null;
  const beforeKed = stripped.slice(0, kedSt);
  const chatimaRe =
    /ברוך אתה[\s\u200c\u200d]*(?:יהוה|יי|ה['׳״\u05F4]?|אדני)[\s\S]{0,220}?מחיה המתים\s*[:׃]?/g;
  let bestEndS = -1;
  let m;
  while ((m = chatimaRe.exec(beforeKed)) !== null) bestEndS = m.index + m[0].length;
  if (bestEndS < 0) {
    const loose = /מחיה המתים\s*[:׃]?/g;
    while ((m = loose.exec(beforeKed)) !== null) bestEndS = m.index + m[0].length;
  }
  if (bestEndS < 0 || bestEndS > kedSt) return null;
  const endOrig = bestEndS < toOrig.length ? toOrig[bestEndS] : hNo.length;
  const kedOrig = toOrig[kedSt];
  if (kedOrig === undefined || kedOrig < endOrig) return null;
  return {
    prefixHebrew: hNo.slice(0, endOrig).trimEnd(),
    suffixHebrew: hNo.slice(kedOrig).trimStart(),
  };
}

function extractKedusha(hebrew, english) {
  const hNo = stripHtml(hebrew).replace(/<br\s*\/?>/gi, '\n');
  const stripped = stripNikkud(hNo);
  const toOrig = [];
  for (let i = 0; i < hNo.length; i++) {
    if (!/[\u0591-\u05C7]/.test(hNo[i])) toOrig.push(i);
  }
  const startS = findStart(stripped);
  if (startS === -1) return { mainHebrew: hebrew, mainEnglish: english, kedushaHebrew: null };
  const endS = findEnd(stripped, startS);
  if (endS === -1 || endS <= startS)
    return { mainHebrew: hebrew, mainEnglish: english, kedushaHebrew: null, note: 'no-end', startS };
  const startOrig = toOrig[startS];
  const endOrigExcl = endS < toOrig.length ? toOrig[endS] : hNo.length;
  const kedHeb = hNo.slice(startOrig, endOrigExcl).trim();
  let mainHeb = (hNo.slice(0, startOrig).trimEnd() + '\n\n' + hNo.slice(endOrigExcl).trimStart())
    .replace(/\n\n\n+/g, '\n\n')
    .trim();
  let mainHebrewBeforeFoldout;
  let outMainHe = mainHeb;
  if (kedHeb.length > 0) {
    const slot = splitSlot(mainHeb);
    if (slot) {
      mainHebrewBeforeFoldout = slot.prefixHebrew;
      outMainHe = slot.suffixHebrew;
    }
  }
  return {
    mainHebrew: outMainHe,
    mainEnglish: english,
    mainHebrewBeforeFoldout,
    kedushaHebrew: kedHeb,
    startS,
    endS,
  };
}

function extractModim(hebrew, english) {
  const hNo = stripHtml(hebrew).replace(/<br\s*\/?>/gi, '\n');
  const stripped = stripNikkud(hNo);
  const toOrig = [];
  for (let i = 0; i < hNo.length; i++) {
    if (!/[\u0591-\u05C7]/.test(hNo[i])) toOrig.push(i);
  }
  const endRe = /ברוך\s+אל\s+ההודאות\s*[:׃]?/g;
  let endMatch = null;
  let m;
  while ((m = endRe.exec(stripped)) !== null) endMatch = m;
  if (!endMatch) return { hit: false, suffixHebrew: hebrew };
  const endS = endMatch.index + endMatch[0].length;
  const startPhrase = /מודים\s+אנחנו\s+לך/g;
  let startS = -1;
  const region = stripped.slice(0, endS);
  while ((m = startPhrase.exec(region)) !== null) startS = m.index;
  if (startS < 0) return { hit: false, suffixHebrew: hebrew };
  const block = stripped.slice(startS, endS);
  if (!/אלהי\s+כל\s+בשר/.test(block)) return { hit: false, reason: 'no basar', suffixHebrew: hebrew };
  const startOrig = toOrig[startS];
  const endOrigExcl = endS < toOrig.length ? toOrig[endS] : hNo.length;
  return {
    hit: true,
    prefixHebrew: hNo.slice(0, startOrig).trimEnd(),
    foldoutHebrew: hNo.slice(startOrig, endOrigExcl).trim(),
    suffixHebrew: hNo.slice(endOrigExcl).trimStart(),
  };
}

function preview(s) {
  return stripNikkud(s || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90);
}

for (const nusach of ['ashkenaz', 'sefard']) {
  const { hebrew, english } = load(nusach);
  console.log('\n====', nusach);
  const ked = extractKedusha(hebrew, english);
  console.log('kedusha?', !!(ked.kedushaHebrew || '').trim(), ked.note || '', 'startS', ked.startS, 'endS', ked.endS);
  console.log('before', preview(ked.mainHebrewBeforeFoldout));
  console.log('main', preview(ked.mainHebrew));
  console.log('ked', preview(ked.kedushaHebrew));
  const keeps = /מגן\s+אברהם/.test(
    stripNikkud(`${ked.mainHebrewBeforeFoldout || ''}\n${ked.mainHebrew || ''}`)
  );
  console.log('keepsAvos', keeps);
  let h = keeps ? ked.mainHebrew : hebrew;
  const mod = extractModim(h, english);
  console.log('modim hit', mod.hit, mod.reason || '');
  console.log('mod prefix', preview(mod.prefixHebrew));
  console.log('mod fold', preview(mod.foldoutHebrew));
  console.log('mod suffix', preview(mod.suffixHebrew));
  const display = keeps
    ? ked.mainHebrewBeforeFoldout || h
    : mod.hit
      ? mod.prefixHebrew || h
      : h;
  console.log('DISPLAY', preview(display));
  console.log('STARTS_MODIM', /^מודים/.test(preview(display)));
}
