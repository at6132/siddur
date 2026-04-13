function buildHebrewDenikkudMap(s) {
  let flat = '';
  const orig = [];
  for (let i = 0; i < s.length; i++) {
    if (/[\u0591-\u05C7]/.test(s[i])) continue;
    flat += s[i];
    orig.push(i);
  }
  return { flat, orig };
}

function replaceBirkas(hebrew, useWinter) {
  const hebNorm = hebrew.replace(/[\u200B-\u200F\uFEFF\u00A0]/g, '');
  const { flat, orig } = buildHebrewDenikkudMap(hebNorm);
  const spacer = '(?:\\s|[־\\u05BE-])*';
  const reGshamim = new RegExp(
    `(בימות${spacer}החמה${spacer}:\\s*)` +
      `([\\s\\S]*?)` +
      `(\\s*בימות${spacer}הגשמים${spacer}:\\s*)` +
      `([\\s\\S]*?)(?=\\s*על${spacer}פני)`,
    'u'
  );
  const m = flat.match(reGshamim);
  if (!m) return null;
  const p0 = m.index;
  const p5 = p0 + m[0].length;
  const p2 = p0 + m[1].length;
  const p3 = p2 + m[2].length;
  const p4 = p3 + m[3].length;
  const oStart = orig[p0];
  const oEnd = p5 >= orig.length ? hebNorm.length : orig[p5];
  const summerOrig = hebNorm.slice(orig[p2], orig[p3]).trim();
  const winterOrig = hebNorm.slice(orig[p4], orig[p5]).trim();
  const chosen = useWinter ? winterOrig : summerOrig;
  return hebNorm.slice(0, oStart).trimEnd() + '\n\n' + chosen + '\n\n' + hebNorm.slice(oEnd).trimStart();
}

const bimot = '\u05D1\u05D9\u05DE\u05D5\u05EA'; // בימות
const s = `לְטוֹבָה, וְתֵן
${bimot} החמה:
בְּרָכָה
${bimot} הגשמים:
טַל וּמָטָר לִבְרָכָה
עַל־פְּנֵי`;
console.log(replaceBirkas(s, false));
console.log('---');
console.log(replaceBirkas(s, true));
