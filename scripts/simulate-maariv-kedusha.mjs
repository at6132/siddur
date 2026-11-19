import fs from 'node:fs';

const t = fs.readFileSync('src/content/siddur/maariv/ashkenaz/raw.ts', 'utf8');
const re =
  /"maariv_amidah"\s*:\s*\{\s*"key"\s*:\s*"maariv_amidah"\s*,\s*"hebrew"\s*:\s*"((?:\\.|[^"\\\\])*)"/;
const m = t.match(re);
const hebrew = m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
const stripNikkud = (s) => s.replace(/[\u0591-\u05C7]/g, '');
const hNo = hebrew;
const stripped = stripNikkud(hNo);
const toOrig = [];
for (let i = 0; i < hNo.length; i++) {
  if (!/[\u0591-\u05C7]/.test(hNo[i])) toOrig.push(i);
}

function findStart(stripped) {
  const backToInstruction = (from) => from; // simplify
  for (const open of ['נקדישך', 'נעריצך', 'נקדש']) {
    const i = stripped.indexOf(open);
    if (i !== -1) return backToInstruction(i);
  }
  const thrice = stripped.indexOf('קדוש קדוש קדוש');
  if (thrice !== -1) return backToInstruction(thrice);
  const mPrimary = stripped.match(/בחזרת[\s\S]{0,320}?קדושה/);
  if (mPrimary?.index !== undefined) return mPrimary.index;
  return -1;
}

function findEnd(stripped, startS) {
  const KEDUSHA_LEDOR_MAX_FROM_START = 2800;
  const fullLed = stripped.indexOf('לדור ודור', startS);
  console.log('ledor', fullLed, 'delta', fullLed === -1 ? null : fullLed - startS);
  if (fullLed !== -1 && fullLed - startS < KEDUSHA_LEDOR_MAX_FROM_START) {
    const slice = stripped.slice(fullLed, Math.min(stripped.length, fullLed + 750));
    let endRel = -1;
    const chatima = /(?:האל|המלך)\s*הקדוש/g;
    let cm;
    while ((cm = chatima.exec(slice)) !== null) endRel = cm.index + cm[0].length;
    if (endRel !== -1) return fullLed + endRel;
  }
  const hl = stripped.indexOf('הללויה', startS);
  console.log('halleluyah', hl);
  if (hl === -1) return -1;
  return hl + 'הללויה'.length;
}

const startS = findStart(stripped);
console.log('startS', startS, JSON.stringify(stripped.slice(startS, startS + 80)));
const endS = findEnd(stripped, startS);
console.log('endS', endS);

if (startS !== -1 && endS !== -1 && endS > startS) {
  const startOrig = toOrig[startS];
  const endOrigExcl = endS < toOrig.length ? toOrig[endS] : hNo.length;
  const kedHeb = hNo.slice(startOrig, endOrigExcl).trim();
  let mainHeb = (hNo.slice(0, startOrig).trimEnd() + '\n\n' + hNo.slice(endOrigExcl).trimStart()).trim();
  console.log('\nkedLen', kedHeb.length, 'kedStart', stripNikkud(kedHeb).replace(/\s+/g, ' ').slice(0, 120));
  console.log('mainLen', mainHeb.length, 'mainStart', stripNikkud(mainHeb).replace(/\s+/g, ' ').slice(0, 120));
  console.log('main has Avot', /מגן אברהם|אלהי אברהם/.test(stripNikkud(mainHeb)));
  console.log('main starts Modim?', /^\s*מודים/.test(stripNikkud(mainHeb).trim()));

  // slot split around אתה קדוש
  const ms = stripNikkud(mainHeb);
  let kedSt = ms.indexOf('אתה קדוש ושמך קדוש');
  if (kedSt === -1) kedSt = ms.indexOf('אתה קדוש ושמך');
  if (kedSt === -1) kedSt = ms.indexOf('אתה קדוש');
  console.log('slot אתה קדוש at', kedSt);
  // After removing instruction, אתה קדוש may sit right after גבורות
  // prefix = through מחיה המתים, suffix from אתה קדוש
  const beforeKed = ms.slice(0, kedSt);
  const chatimaRe =
    /ברוך אתה[\s\u200c\u200d]*(?:יהוה|יי|ה['׳״\u05F4]?|אדני)[\s\S]{0,220}?מחיה המתים\s*[:׃]?/g;
  let bestEndS = -1;
  let cm;
  while ((cm = chatimaRe.exec(beforeKed)) !== null) bestEndS = cm.index + cm[0].length;
  console.log('prefix end (מחיה המתים)', bestEndS);
  if (bestEndS >= 0 && kedSt >= 0) {
    const prefix = ms.slice(0, bestEndS);
    const suffix = ms.slice(kedSt);
    console.log('PREFIX start', prefix.replace(/\s+/g, ' ').slice(0, 80));
    console.log('SUFFIX start', suffix.replace(/\s+/g, ' ').slice(0, 80));
    console.log('suffix has Modim at', suffix.indexOf('מודים אנחנו לך'));
    // What OfflineMaariv does: hebrew = mainHebrew (SUFFIX only if keepsAvos)
    // So displayed main after kedusha foldout = from אתה קדוש onward — NOT from Modim
  }
}
