/** Quick test for Birkas Hashanim dual-label regex (no TS import). */
const nik = '[\\u0591-\\u05C7]*';
const tag = '(?:<[^>]*>\\s*)*';
const lblColon = '\\s*[:׃]';
const omrim = `(?:א${nik}ו${nik}מ${nik}ר${nik}י${nik}ם)?`;

function run(hebNorm) {
  const summerInner = `(?:ו${nik}ת${nik}ן(?:${tag}|\\s)+)?ב${nik}ר${nik}כ${nik}ה`;
  const winterInner = `(?:ו${nik}ת${nik}ן(?:${tag}|\\s)+)?ט${nik}ל(?:${tag}|\\s)*ו(?:${tag}|\\s)*מ${nik}ט${nik}ר(?:${tag}|\\s)*ל${nik}ב${nik}ר${nik}כ${nik}ה`;
  const bimotBlock = new RegExp(
    `ב${nik}י${nik}ו?${nik}מ${nik}ו${nik}ת${nik}\\s+ה${nik}ח${nik}מ${nik}ה${tag}${omrim}?${lblColon}\\s*(${summerInner})\\s*` +
      `ב${nik}י${nik}ו?${nik}מ${nik}ו${nik}ת${nik}\\s+ה${nik}ג${nik}ש${nik}מ${nik}י${nik}ם${tag}${omrim}?${lblColon}\\s*(${winterInner})`,
    'gu'
  );
  const out = hebNorm.replace(bimotBlock, (_m, summer, winter) => `[SUM=${summer.trim()}|WIN=${winter.trim()}]`);
  return { matched: out !== hebNorm, out };
}

const samples = [
  'לטובה, ותן\nבימות החמה:\nברכה\nבימות הגשמים:\nטל ומטר לברכה\nעלפני',
  'לְטוֹבָה, וְתֵן\nבימות החמה:\nבְּרָכָה\nבימות הגשמים:\nטַל וּמָטָר לִבְרָכָה\nעַל־פְּנֵי',
  'לְטוֹבָה, וְתֵן\nבימות החמה:\nבְּרָכָה\nבימות הגשם:\nטַל וּמָטָר לִבְרָכָה\nעַל־פְּנֵי',
];

// Sefaria-style nikkud on labels (approximate)
const sefariaLike =
  'לְטוֹבָה, וְתֵן\nבִּימוֹת הַחַמָּה:\nבְּרָכָה\nבִּימוֹת הַגְּשָׁמִים:\nטַל וּמָטָר לִבְרָכָה\nעַל־פְּנֵי';
samples.push(sefariaLike);

for (const s of samples) {
  const hebNorm = s.replace(/[\u200B-\u200D\uFEFF]/g, '');
  const r = run(hebNorm);
  console.log('---');
  console.log('matched:', r.matched);
  console.log(r.out);
}
