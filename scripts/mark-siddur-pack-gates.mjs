/**
 * Inject {{gate:…}} / {{fold:…}} markers into local siddur raw packs
 * and strip leftover Sefaria instruction / halacha notes.
 *
 * Usage: node scripts/mark-siddur-pack-gates.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');

function stripNikkud(s) {
  return s.replace(/[\u0591-\u05C7]/g, '');
}

function unescapeTsString(s) {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

function escapeTsString(s) {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
}

function tidy(s) {
  return s
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function gate(id, inner) {
  const t = String(inner).replace(/^\n+|\n+$/g, '');
  if (!t.trim()) return '';
  return `{{gate:${id}}}${t}{{/gate}}`;
}

function fold(id, inner) {
  const t = String(inner).replace(/^\n+|\n+$/g, '');
  if (!t.trim()) return '';
  return `{{fold:${id}}}${t}{{/fold}}`;
}

/** Strip prior markers so the script is idempotent. */
function stripMarkers(s) {
  return s
    .replace(/\{\{\/?(?:gate|fold)(?::[a-z_]+)?\}\}/gi, '')
    .replace(/\n{3,}/g, '\n\n');
}

// ─── Hebrew instruction deletion ───────────────────────────────────────────

function deleteHebrewInstructions(h) {
  let s = h;

  // Remove prior markers if re-running (idempotent rebuild from cleaned base)
  // Keep as-is if already marked: caller skips.

  const lineStart = '(?:^|(?:\\r?\\n)+|\\s+)';
  const deletes = [
    // Mashiv forgetfulness
    new RegExp(
      `${lineStart}טעה\\s+ולא\\s+אמר\\s+בחורף\\s+משיב\\s+הרוח[\\s\\S]*?(?:לראש\\s+התפלה\\.?|קיצור\\s+שו["״]?ע[^\\n]*)`,
      'gu',
    ),
    // האל הקדוש mistake
    new RegExp(
      `${lineStart}אם\\s+טעה\\s+וסיים\\s+האל\\s+הקדוש[\\s\\S]*?(?:ובימות\\s+השנה[\\s\\S]*?)?אינו\\s+חוזר\\.?`,
      'gu',
    ),
    // המלך המשפט mistakes
    new RegExp(
      `${lineStart}בכל\\s+השנה\\s+אם\\s+אמר\\s+המלך\\s+המשפט[\\s\\S]*?אין\\s+מחזירין\\s+אותו\\.?`,
      'gu',
    ),
    new RegExp(
      `${lineStart}אם\\s+טעה\\s+ואמר\\s+מלך\\s+אוהב\\s+צדקה\\s+ומשפט[\\s\\S]*?אין\\s+מחזירין\\s+אותו\\.?`,
      'gu',
    ),
    new RegExp(
      `${lineStart}ובעשי["״\\u05F4]?ת\\s+אם\\s+טעה\\s+ואמר\\s+מלך\\s+אוהב[\\s\\S]*?אין\\s+מחזירין\\s+אותו\\.?`,
      'gu',
    ),
    // זכרנו / מי כמוך / וכתוב / בספר חיים
    new RegExp(
      `${lineStart}אם\\s+לא\\s+אמר\\s+זכרנו[\\s\\S]*?(?:\\(דה["״]ח\\)|אינו\\s+חוזר\\.?|חוזר\\s+לראש[^\\n]*|מלך\\s+עוזר[^\\n]*)`,
      'gu',
    ),
    new RegExp(
      `${lineStart}ו?אם\\s+שכח\\s+לומר\\s+מי\\s+כמוך[\\s\\S]{0,120}?דינו\\s+כמו\\s+בזכרנו\\.?`,
      'gu',
    ),
    new RegExp(
      `${lineStart}שכח\\s+לומר\\s+מי\\s+כמוך[\\s\\S]{0,120}?דינו\\s+כמו\\s+בזכרנו\\.?`,
      'gu',
    ),
    new RegExp(
      `${lineStart}(?:אם\\s+)?שכח\\s+לומר\\s+וכתוב[\\s\\S]*?(?:אינו\\s+חוזר\\.?|לעיל\\s+אצל\\s+זכרנו[^\\n]*|\\(דה)`,
      'gu',
    ),
    new RegExp(
      `${lineStart}ו?אם\\s+לא\\s+אמר\\s+בספר\\s+חיים[\\s\\S]*?(?:אינו\\s+חוזר\\.?|יהיו\\s+לרצון[^\\n]*|\\(דה|ונ["״]ל[^\\n]*)`,
      'gu',
    ),
    /ו?אם\s+לא\s+אמר\s+בספר\s+חיים[^\n]+/gu,
    new RegExp(
      `${lineStart}בעשי["״\\u05F4]?ת\\s+אומרים\\s+בספר\\s+חיים[\\s\\S]*?(?:אינו\\s+חוזר\\.?|יהיו\\s+לרצון[^\\n]*|\\(דה|חיי\\s+אדם[^\\n]*)`,
      'gu',
    ),
    // Yaaleh / al hanissim / tal umatar forget
    new RegExp(
      `${lineStart}שכח\\s+ולא\\s+אמר\\s+יעלה\\s+ויבא[\\s\\S]*?(?:חוזר\\s+לראש\\s+התפלה\\.?|מחזיר\\s+שכינתו[^\\n]*)`,
      'gu',
    ),
    new RegExp(
      `${lineStart}(?:בחנוכה\\s+ופורים[^\\n]{0,60})?שכח\\s+לומר\\s+על\\s+הנסים[\\s\\S]*?(?:אינו\\s+חוזר\\.?|דה["״]ח[^\\n]*)`,
      'gu',
    ),
    new RegExp(
      `${lineStart}בחנוכה\\s+ופורים\\s+אומרים\\s+על\\s+הנסים\\.?`,
      'gu',
    ),
    new RegExp(
      `${lineStart}בחנוכה\\s+ופורים\\s+אומרים\\s+כאן\\s+על\\s+הניסים[\\s\\S]*?(?:אין\\s+מחזירין[^\\n]*|בזמן\\s+הזה[^\\n]*)`,
      'gu',
    ),
    new RegExp(
      `${lineStart}אם\\s+שכח\\s+לומר\\s+טל\\s+ומטר[\\s\\S]*?(?:עקר\\s+רגל[^\\n]*|אומרו\\s+במקום[^\\n]*|אינו\\s+חוזר\\.?|שומע\\s+תפלה[^\\n]*|תקע[^\\n]*|ברכת\\s+השנים[^\\n]*)`,
      'gu',
    ),
    new RegExp(
      `${lineStart}אם\\s+שכח\\s+לומר\\s+טל\\s+ומטר[^\\n]*(?:\\n(?![א-ת])[^\\n]*)*`,
      'gu',
    ),
    // Multi-line tal-umatar forget (continues onto next lines until blank/next bracha)
    /אם\s+שכח\s+לומר\s+טל\s+ומטר[\s\S]*?(?=\n\s*(?:תְּקַע|תקע)|(?:\n\s*\n))/gu,
    // Modim bowing / Abudarham
    new RegExp(
      `${lineStart}כשאומר\\s+מודים\\s+כורע[\\s\\S]*?(?:כאגמון[^\\n]*|או["״]?ח\\s*קיג[^\\n]*)`,
      'gu',
    ),
    new RegExp(
      `${lineStart}כשיגיע\\s+שליח\\s+צ[י]?בור[\\s\\S]*?(?:אבודרהם[^\\n]*|הודאה\\s+קטנה[^\\n]*)`,
      'gu',
    ),
    // Kedusha chazaras instruction (maariv often has this with no body)
    new RegExp(
      `${lineStart}בחזרת\\s+הש["״]?ץ\\s+אומרים\\s+כאן\\s+קדושה\\s*(?::|\u05C3)?`,
      'gu',
    ),
    // Yaaleh intro labels
    new RegExp(
      `${lineStart}בראש\\s+חודש\\s+ובחול\\s+המועד\\s+אומרים\\s+(?:זה|כאן)[^\\n]{0,40}`,
      'gu',
    ),
    // Fast / Tisha BAv / Aneinu labels
    new RegExp(`${lineStart}במנחת\\s+תשעה\\s+באב\\s*(?::|\u05C3)?`, 'gu'),
    new RegExp(`${lineStart}בתענית\\s+ציבור\\s+אומר\\s+כאן[^\\n]{0,80}`, 'gu'),
    new RegExp(`${lineStart}לתענית\\s+ציבור\\s*(?::|\u05C3)?`, 'gu'),
    // Optional choleh
    new RegExp(
      `${lineStart}מי\\s+שרוצה\\s+להתפלל\\s+על\\s+החולה[\\s\\S]{0,80}?זו\\s*(?::|\u05C3)?`,
      'gu',
    ),
    new RegExp(
      `${lineStart}יהי\\s+רצון\\s+מלפניך[\\s\\S]{0,500}?פלוני[\\s\\S]{0,120}?בתוך\\s+שאר\\s+חולי\\s+ישראל\\s*(?::|\u05C3)?`,
      'gu',
    ),
    // Ledavid minhag note (keep psalm)
    new RegExp(
      `${lineStart}מנהג\\s+טוב\\s+לומר\\s+אחר\\s+כל\\s+תפלה\\s+מזמור\\s+לדוד[\\s\\S]*?(?:מורה\\s+באצבע[^\\n]*|הושענא\\s+רבא[^\\n]*)`,
      'gu',
    ),
    // Omer long intro (אבודרהם / טור)
    new RegExp(
      `${lineStart}ערבית\\s+אחר\\s+התפלה\\s+מתחילין\\s+לספור\\s+העומר[\\s\\S]*?(?:\\(אבודרהם\\)|\\(טור[^)]*\\))`,
      'gu',
    ),
    /(?:^|\n)[^\n]*אבודרהם\)?[^\n]*/gu,
    /(?:^|\n)[^\n]*אם\s+מנה\s+או\s+לא\s+מנה[^\n]*/gu,
    // Title-only bracha names (sefard)
    new RegExp(`${lineStart}(?:אבות|גבורות|קדושה|בינה|תשובה|סליחה|גאולה|רפואה|ברכת\\s+השנים|קיבוץ\\s+גלויות|ברכת\\s+המשפט|ברכת\\s+המינים|על\\s+הצדיקים|בונה\\s+ירושלים|את\\s+צמח|שמע\\s+קולנו|רצה|מודים|שים\\s+שלום|שלום\\s+רב)\\s*(?:\\r?\\n)+`, 'gu'),
    // Speaker labels alone
    new RegExp(`${lineStart}(?:קהל\\s+וחזן|שליח\\s+ציבור|שליח\\s+צבור|ואומר\\s+שליח\\s+צבור|ועונין\\s+הקהל)\\s*(?::|\u05C3)?\\s*(?=\\r?\\n)`, 'gu'),
    // RH occasion we cannot gate
    new RegExp(`${lineStart}לר["״]?ה\\s*(?::|\u05C3)?\\s*הזכרון\\s+הזה\\s*(?::|\u05C3)?`, 'gu'),
    // English-bleed / commentary sometimes glued in hebrew packs
    new RegExp(`${lineStart}הטעם\\s+שתקנו\\s+לברך[\\s\\S]*?(?=\\r?\\n\\r?\\n|$)`, 'gu'),
  ];

  for (const re of deletes) s = s.replace(re, '\n');

  // Strip בעשי"ת מסיים / יסיים sample prefixes (keep chatima text for gating)
  s = s.replace(
    /בעשי["״\u05F4]?ת\s*מ?י?סיים\s*(?::|\u05C3)?\s*/gu,
    '',
  );
  s = s.replace(
    /(?:^|\n)\s*יסיים\s*(?::|\u05C3)?\s*/gu,
    '\n',
  );

  // Seasonal labels (keep following prayer text) — also mid-line glued forms
  s = s.replace(/(?:^|\n|:)\s*בקיץ\s*(?::|\u05C3)?\s*/gu, '\n');
  s = s.replace(/(?:^|\n|:)\s*בחורף\s*(?::|\u05C3)?\s*/gu, '\n');
  s = s.replace(/(?:^|\n)\s*בימות\s+החמה\s*(?::|\u05C3)?\s*/gu, '\n');
  s = s.replace(/(?:^|\n)\s*בימות\s+הגשמים\s*(?::|\u05C3)?\s*/gu, '\n');
  s = s.replace(/(?:^|\n)\s*בקיץ\s*\/\s*בחורף\s*(?::|\u05C3)?\s*/gu, '\n');
  s = s.replace(/בקיץ\s*(?::|\u05C3)\s*/gu, '');
  s = s.replace(/בחורף\s*(?::|\u05C3)\s*/gu, '');

  return tidy(s);
}

function deleteEnglishInstructions(e) {
  if (!e?.trim()) return e || '';
  let s = e;
  const deletes = [
    /(?:^|(?:\r?\n)+)\s*If\s+you\s+forgot[\s\S]*?(?:\n\n|$)/gi,
    /(?:^|(?:\r?\n)+)\s*If\s+(?:one|he|you)\s+(?:erred|forgot|neglected|mistakenly)[\s\S]*?(?:\n\n|$)/gi,
    /(?:^|(?:\r?\n)+)\s*If\s+you\s+wish\s+to\s+pray\s+for\s+the\s+recovery[\s\S]*?(?:\n\n|$)/gi,
    /(?:^|(?:\r?\n)+)\s*\(During the Ten Days of Penitence[^)]*\)\s*/gi,
    /(?:^|(?:\r?\n)+)\s*During the Ten Days of Penitence\s*[:：]?\s*/gi,
    /(?:^|(?:\r?\n)+)\s*From the Musaf of[\s\S]*?(?:say:|following line\.)\s*/gi,
    /(?:^|(?:\r?\n)+)\s*From the first say of Pesach[\s\S]*?(?:following line\.|we say)\s*/gi,
    /(?:^|(?:\r?\n)+)\s*From the evening service[\s\S]*?(?:following line\.|we say)\s*/gi,
    /(?:^|(?:\r?\n)+)\s*On Chanukah and Purim[\s\S]*?(?:\n\n|$)/gi,
    /(?:^|(?:\r?\n)+)\s*On Fast [Dd]ays[\s\S]*?(?:\n\n|$)/gi,
    /(?:^|(?:\r?\n)+)\s*During Mincha services on the Ninth of Av[\s\S]*?(?:\n\n|$)/gi,
    /(?:^|(?:\r?\n)+)\s*On Rosh Chodesh and on Chol HaMoed[\s\S]*?(?:\n\n|$)/gi,
    /(?:^|(?:\r?\n)+)\s*On regular weekdays continue[\s\S]*?(?:\n\n|$)/gi,
    /(?:^|(?:\r?\n)+)\s*\(When the Chazzan repeats the Shemoneh Esrei, the Kedushah is said here\)\s*/gi,
    /(?:^|(?:\r?\n)+)\s*When the Chazzan repeats[\s\S]*?Modim D['']Rabanan\.?\)\s*/gi,
    /(?:^|(?:\r?\n)+)\s*At the words,\s*We are thankful[\s\S]*?(?:\n\n|$)/gi,
    /(?:^|(?:\r?\n)+)\s*Birkas Kohanim is said[\s\S]*?(?:\n\n|$)/gi,
    /(?:^|(?:\r?\n)+)\s*To be said by the Chazzan\s*/gi,
    /(?:^|(?:\r?\n)+)\s*The Congregation says and the Chazzan repeats:\s*/gi,
    /(?:^|(?:\r?\n)+)\s*Congregation says and Chazzan repeats:\s*/gi,
    /(?:^|(?:\r?\n)+)\s*The Chazzan says:\s*/gi,
    /(?:^|(?:\r?\n)+)\s*Those facing them say[\s\S]*?\n/gi,
    /(?:^|(?:\r?\n)+)\s*It is (?:a )?custom(?:ary)? to (?:say|recite) Psalm[\s\S]*?(?:\n\n|$)/gi,
    /(?:^|(?:\r?\n)+)\s*The Omer is counted from[\s\S]*?while standing\.\s*/gi,
  ];
  for (const re of deletes) s = s.replace(re, '\n');
  return tidy(s);
}

// ─── Gate injection (Hebrew) ───────────────────────────────────────────────

function wrapAseretPhrases(s) {
  // Label + phrase → gate (label may already be stripped)
  const patterns = [
    [
      /בעשי["״\u05F4]?ת\s*(?::|\u05C3)?\s*(זָ?כְרֵ?ֽ?נוּ[\s\S]*?אֱלֹהִים\s+חַיִּים\s*(?::|\u05C3)?)/gu,
      'aseret',
    ],
    [
      /בעשי["״\u05F4]?ת\s*(?::|\u05C3)?\s*(מִי\s+כָמֽ?וֹךָ\s+אַב[\s\S]*?בְּרַחֲמִים\s*(?::|\u05C3)?)/gu,
      'aseret',
    ],
    [
      /בעשי["״\u05F4]?ת\s*(?::|\u05C3)?\s*(וּ?כְתוֹב\s+לְחַיִּים[\s\S]*?בְרִיתֶֽ?ךָ\s*(?::|\u05C3)?)/gu,
      'aseret',
    ],
    [
      /בעשי["״\u05F4]?ת\s*(?::|\u05C3)?\s*(בְּסֵֽ?פֶר\s+חַיִּים[\s\S]*?וּלְשָׁלוֹם\s*(?::|\u05C3)?)/gu,
      'aseret',
    ],
  ];
  for (const [re, id] of patterns) {
    s = s.replace(re, (_, body) => `\n${gate(id, body)}\n`);
  }

  // Unlabeled common inserts (shacharit packs) — skip if already gated
  const wrapIfNeeded = (re, id) => {
    s = s.replace(re, (full, body) => {
      // body may be undefined if no group
      const inner = body || full;
      if (full.includes(`{{gate:${id}}}`)) return full;
      return gate(id, inner);
    });
  };
  if (!/\{\{gate:aseret\}\}/.test(s) || !/זָכְרֵ/.test(s.match(/\{\{gate:aseret\}\}[\s\S]*?\{\{\/gate\}\}/)?.[0] || '')) {
    wrapIfNeeded(/(זָכְרֵ[\u0591-\u05C7]*נוּ\s+לְחַיִּים[\s\S]*?אֱלֹהִים\s+חַיִּים\s*(?::|\u05C3)?)/u, 'aseret');
  }
  wrapIfNeeded(
    /(מִי\s+כָמ[\u0591-\u05C7]*וֹךָ\s+אַב\s+הָ?רַחֲמִ[םן][\s\S]*?בְּרַחֲמִים\s*(?::|\u05C3)?)/u,
    'aseret',
  );
  wrapIfNeeded(
    /(וּ?כְתוֹב\s+לְחַיִּים\s+טוֹבִים[\s\S]*?בְרִיתֶ[\u0591-\u05C7]*ךָ\s*(?::|\u05C3)?)/u,
    'aseret',
  );
  wrapIfNeeded(
    /(בְּסֵ[\u0591-\u05C7]*פֶר\s+חַיִּים\s+בְּרָכָה[\s\S]*?וּלְשָׁלוֹם\s*(?::|\u05C3)?)/u,
    'aseret',
  );

  // עשה (בעשי"ת השלום) שלום
  s = s.replace(
    /עֹ?שֶׂה\s*\(\s*בעשי["״\u05F4]?ת\s+הַשָּׁלוֹם\s*\)\s*שָׁלוֹם/gu,
    `עֹשֶׂה ${gate('aseret', 'הַשָּׁלוֹם')} שָׁלוֹם`,
  );

  return s;
}

function wrapRainGevuros(s) {
  // Pair: מוריד הטל then משיב הרוח
  s = s.replace(
    /(מוֹרִיד\s+הַטָּל)\s*(?::|\u05C3)?\s*(מַשִּׁיב\s+הָרֽ?וּחַ\s+וּמוֹרִיד\s+הַגֶּֽ?שֶׁם\s*(?::|\u05C3)?)/gu,
    (_, dew, rain) => `${gate('morid_tal', dew)}\n${gate('mashiv', rain)}`,
  );
  // Orphan mashiv
  if (!/\{\{gate:mashiv\}\}/.test(s)) {
    s = s.replace(
      /(מַשִּׁיב\s+הָרֽ?וּחַ\s+וּמוֹרִיד\s+הַגֶּֽ?שֶׁם\s*(?::|\u05C3)?)/u,
      (_, rain) => gate('mashiv', rain),
    );
  }
  if (!/\{\{gate:morid_tal\}\}/.test(s)) {
    s = s.replace(
      /(מוֹרִיד\s+הַטָּל)\s*(?::|\u05C3)?/u,
      (_, dew) => gate('morid_tal', dew),
    );
  }
  return s;
}

function wrapVten(s) {
  // Already reconstructed (after prior mark+strip): ותן ברכהותן טל ומטר
  s = s.replace(
    /וְ?תֵן\s+(בְּרָכָה)\s*וְ?תֵן\s+(טַל\s+וּמָטָר\s+לִבְרָכָה)/gu,
    (_, bracha, tal) =>
      `${gate('vten_bracha', `וְתֵן ${bracha}`)}${gate('vten_tal', `וְתֵן ${tal}`)}`,
  );
  // Original split after seasonal labels stripped
  s = s.replace(
    /וְ?תֵן\s*\n*\s*(בְּרָכָה)\s*\n*\s*(טַל\s+וּמָטָר\s+לִבְרָכָה)/gu,
    (_, bracha, tal) =>
      `${gate('vten_bracha', `וְתֵן ${bracha}`)}${gate('vten_tal', `וְתֵן ${tal}`)}`,
  );
  return s;
}

function wrapChatimot(s) {
  // האל הקדוש vs המלך הקדוש — prefer wrapping endings after ברוך אתה ה'
  s = s.replace(
    /(בָּרוּךְ\s+אַתָּה\s+יְהֹוָה\s+)הָאֵל\s+הַקָּדוֹשׁ(\s*(?::|\u05C3)?)/gu,
    (_, pre, post) => `${pre}${gate('year_round', 'הָאֵל הַקָּדוֹשׁ')}${post}`,
  );
  s = s.replace(
    /(בָּרוּךְ\s+אַתָּה\s+יְהֹוָה\s+)הַמֶּֽ?לֶךְ\s+הַקָּדוֹשׁ(\s*(?::|\u05C3)?)/gu,
    (_, pre, post) => {
      if (pre.includes('{{gate:')) return `${pre}הַמֶּֽלֶךְ הַקָּדוֹשׁ${post}`;
      return `${pre}${gate('aseret', 'הַמֶּֽלֶךְ הַקָּדוֹשׁ')}${post}`;
    },
  );

  // מלך אוהב vs המלך המשפט
  s = s.replace(
    /(בָּרוּךְ\s+אַתָּה\s+יְהֹוָה\s+)מֶֽ?לֶךְ\s+אֹ?הֵב\s+צְדָקָה\s+וּמִשְׁפָּט(\s*(?::|\u05C3)?)/gu,
    (_, pre, post) =>
      `${pre}${gate('year_round', 'מֶֽלֶךְ אֹהֵב צְדָקָה וּמִשְׁפָּט')}${post}`,
  );
  s = s.replace(
    /(בָּרוּךְ\s+אַתָּה\s+יְהֹוָה\s+)הַמֶּֽ?לֶךְ\s+הַמִּשְׁפָּט(\s*(?::|\u05C3)?)/gu,
    (_, pre, post) => `${pre}${gate('aseret', 'הַמֶּֽלֶךְ הַמִּשְׁפָּט')}${post}`,
  );
  // Bare המלך המשפט line (after יסיים strip)
  s = s.replace(
    /(^|\n)(\s*הַמֶּֽ?לֶךְ\s+הַמִּשְׁפָּט\s*(?::|\u05C3)?)(?=\s*(?:\n|$))/gmu,
    (full, a, body) => {
      if (full.includes('{{gate:')) return full;
      return `${a}${gate('aseret', body.trim())}`;
    },
  );

  return s;
}

function wrapYaaleh(s) {
  // Find block from אלהינו…יעלה ויבא through אתה (before ותחזינה / next bracha)
  const re =
    /((?:אֱלֹהֵֽ?ינוּ\s+וֵאלֹהֵי\s+אֲבוֹתֵֽ?ינוּ[^\n]*\n?)?יַעֲלֶה\s+וְיָבֹא[\s\S]*?כִּי\s+אֵל\s+מֶֽ?לֶךְ\s+חַנּוּן\s+וְרַחוּם\s+אָֽ?תָּה\s*(?::|\u05C3)?)/u;
  if (!re.test(s)) {
    // denser punctuation variant
  }
  s = s.replace(
    /((?:אֱלֹהֵֽ?ינוּ\s+וֵאלֹהֵי\s+אֲבוֹתֵֽ?ינוּ[\s\S]{0,80}?)?יַעֲלֶה\s+וְיָבֹא[\s\S]*?חַנּוּן\s+וְרַחוּם\s+אָֽ?תָּה\s*(?::|\u05C3)?)/u,
    (block) => {
      let b = block;
      // Occasion alternatives
      const occasions = [
        [
          /(?:לר["״]?ח\s*(?::|\u05C3)?\s*)?(ר[\u0591-\u05C7]*אש[\u0591-\u05C7]*\s+ה[\u0591-\u05C7]*ח[\u0591-\u05C7]*ד[\u0591-\u05C7]*ש[\u0591-\u05C7]*\s+ה[\u0591-\u05C7]*ז[\u0591-\u05C7]*ה)\s*(?::|\u05C3)?/gu,
          'yaaleh_rosh_chodesh',
        ],
        [
          /(?:לפסח\s*(?::|\u05C3)?\s*)?(חַג\s+הַמַּצּוֹת\s+הַזֶּה)\s*(?::|\u05C3)?/gu,
          'yaaleh_pesach',
        ],
        [
          /(?:לסכות\s*(?::|\u05C3)?\s*)?(חַג\s+הַסֻּכּוֹת\s+הַזֶּה)\s*(?::|\u05C3)?/gu,
          'yaaleh_sukkot',
        ],
        [
          /(?:בשבועות\s*(?::|\u05C3)?\s*|לשבועות\s*(?::|\u05C3)?\s*)?(חַג\s+הַשָּׁבֻעוֹת|חַג\s+הַשְּׁבֻעוֹת|חַג\s+הַשָּׁבֻעֹת)\s*(?:הַזֶּה)?\s*(?::|\u05C3)?/gu,
          'yaaleh_shavuot',
        ],
        [
          /(?:לש["״]?ע\s+וש["״]?ת\s*(?::|\u05C3)?\s*|לשמיני\s*(?::|\u05C3)?\s*)?(שְׁמִינִי\s+עֲצֶ[\u0591-\u05C7]*רֶת(?:\s+הַחַג)?(?:\s+הַזֶּה)?|שִׂמְחַת\s+תּוֹרָה)\s*(?::|\u05C3)?/gu,
          'yaaleh_shemini',
        ],
        [
          /(?:ילדים\s+האוכלים\s+ביו["״]?כ\s*(?::|\u05C3)?\s*|ליוה["״]?כ\s*(?::|\u05C3)?\s*)?(הַכִּפּוּרִים)\s*(?::|\u05C3)?/gu,
          'yaaleh_yom_kippur',
        ],
      ];
      for (const [ore, id] of occasions) {
        b = b.replace(ore, (_, phrase) => gate(id, phrase || _.replace(/^[^א-ת]*/, '').trim()));
      }
      // Clean leftover occasion labels
      b = b.replace(/\s*(?:לר["״]?ח|לפסח|לסכות|בשבועות|לשבועות|לש["״]?ע\s+וש["״]?ת|ילדים\s+האוכלים\s+ביו["״]?כ)\s*[:׃]\s*/gu, ' ');
      return gate('yaaleh', tidy(b));
    },
  );
  return s;
}

function wrapAlHanissim(s) {
  // Intro — end at בזמן הזה (flexible nikkud on בזמן)
  s = s.replace(
    /((?:וְ)?עַל\s+הַנִּסִּים\s+וְעַל\s+הַפֻּרְקָן[\s\S]{0,200}?הַזֶּה\s*(?::|\u05C3)?)/u,
    (intro) => {
      if (!/פֻּרְקָן|פורקן/.test(intro)) return intro;
      if (intro.includes('{{gate:al_hanissim}}')) return intro;
      return gate('al_hanissim', intro);
    },
  );

  // Chanukah body
  s = s.replace(
    /(?:בחנוכה(?:\s+אומרים)?\s*(?::|\u05C3)?\s*)?(בִּימֵי\s+מַתִּתְיָֽ?הוּ[\s\S]*?לְשִׁמְךָ\s+הַגָּדוֹל\s*(?::|\u05C3)?)/u,
    (_, body) => gate('chanukah', body),
  );

  // Purim body
  s = s.replace(
    /(?:בפורים(?:\s+אומרים)?\s*(?::|\u05C3)?\s*)?(בִּימֵי\s+מָרְדְּ֒?כַי[\s\S]*?(?:עַל־?הָעֵץ|סֶלָה)\s*(?::|\u05C3)?\)?)/u,
    (_, body) => gate('purim', body),
  );

  return s;
}

function wrapAneinuNachem(s) {
  s = s.replace(
    /(עֲנֵֽ?נוּ\s+יְהֹוָה\s+עֲנֵֽ?נוּ[\s\S]*?צָרָה\s+וְצוּקָה\s*(?::|\u05C3)?)/u,
    (_, body) => gate('aneinu', body),
  );
  // Short insert in שומע תפלה (some sefard packs)
  if (!/\{\{gate:aneinu\}\}/.test(s)) {
    s = s.replace(
      /(עֲנֵֽ?נוּ\s+וּ?שְׁמַע\s+תְּפִלָּתֵֽ?נוּ[\s\S]{0,200}?)/u,
      (_, body) => gate('aneinu', body.trim()),
    );
  }
  s = s.replace(
    /(נַחֵם\s+יְהֹוָה\s+אֱלֹהֵֽ?ינוּ[\s\S]*?מְנַחֵם\s+צִיּוֹן\s+וּבוֹנֵה\s+יְרוּשָׁלָֽ?יִם\s*(?::|\u05C3)?)/u,
    (_, body) => gate('nachem', body),
  );
  return s;
}

function wrapMotzaei(s) {
  // אתה חוננתנו … through יראתך / distinctions (before חננו מאתך resume)
  s = s.replace(
    /(אַתָּה\s+חוֹנַנְתּ[\u0591-\u05C7]*נוּ[\s\S]*?(?:בְּיִרְאָתֶךָ|ביראתך|מֵחֹל|לחול)\s*(?::|\u05C3)?)/u,
    (_, body) => gate('motzaei_shabbat', body),
  );
  if (!/\{\{gate:motzaei_shabbat\}\}/.test(s)) {
    s = s.replace(
      /(אַתָּה\s+חוֹנַנְתּ[\u0591-\u05C7]*נוּ[\s\S]{30,900}?(?:הַמַּעֲשֶׂה|המעשה)[\s\S]{0,250}?(?::|\u05C3))/u,
      (_, body) => gate('motzaei_shabbat', body),
    );
  }
  return s;
}

function wrapLedavid(s) {
  // Psalm 27
  s = s.replace(
    /(לְדָוִד\s+יְהֹוָה\s+אוֹרִי\s+וְיִשְׁעִי[\s\S]*?קַוֵּה\s+אֶל[\s\S]*?וְיַאֲמֵץ\s+לִבֶּֽ?ךָ[\s\S]*?קַוֵּה\s+אֶל[\s\S]*?יְהֹוָה\s*(?::|\u05C3)?)/u,
    (_, body) => gate('ledavid', body),
  );
  if (!/\{\{gate:ledavid\}\}/.test(s)) {
    s = s.replace(
      /(לְדָוִד\s+יְהֹוָה\s+אוֹרִי\s+וְיִשְׁעִי[\s\S]*?קַוֵּה\s+אֶל\s+יְהֹוָה\s*(?::|\u05C3)?\s*)/u,
      (_, body) => gate('ledavid', body),
    );
  }
  return s;
}

function wrapOmer(s) {
  // If section is clearly omer content, wrap prayer body (after instruction delete)
  if (/סְפִירַת\s+הָעֹֽ?מֶר|לְשֵׁם\s+יִחוּד/.test(s) && /הִנְ֒?נִי\s+מוּכָן/.test(s)) {
    // Gate from leshem / hinni through end of counting liturgy (leave nothing outside if whole section)
    if (!/\{\{gate:omer\}\}/.test(s)) {
      return gate('omer', s);
    }
  }
  return s;
}

function wrapFolds(s, opts = {}) {
  const { allowKedusha = true } = opts;

  // Modim deRabbanan: second מודים with אלהי כל בשר … ברוך אל ההודאות
  s = s.replace(
    /(מוֹדִים\s+אֲנַֽ?חְנוּ\s+לָךְ\s+שָׁאַתָּה\s+הוּא\s+יְהֹוָה\s+אֱלֹהֵֽ?ינוּ\s+וֵאלֹהֵי\s+אֲבוֹתֵֽ?ינוּ\s+אֱלֹהֵי\s+כָל\s+בָּשָׂר[\s\S]*?בָּרוּךְ\s+אֵל\s+הַהוֹדָאוֹת\s*(?::|\u05C3)?)/u,
    (_, body) => fold('modim_derabanan', body),
  );

  if (!allowKedusha) return s;

  // Kedusha chazaras: from נקדישך / נקדש / קדוש קדוש through chatima, stop before אתה חונן
  if (!/\{\{fold:kedusha\}\}/.test(s)) {
    const kedushaBlock =
      /(נַקְדִּישְׁךָ|נַקְדִּישָׁךְ|נְקַדֵּשׁ\s+אֶת[\s\S]{0,40}?|קָדוֹשׁ\s+קָדוֹשׁ\s+קָדוֹשׁ\s+יְהֹוָה\s+צְבָאוֹת)([\s\S]*?)(?=\n\s*אַתָּה\s+חוֹנֵן|\n\s*אַתָּה\s+חוֹנַן)/u;
    if (kedushaBlock.test(s)) {
      s = s.replace(kedushaBlock, (full) => fold('kedusha', full));
    }
  }
  return s;
}

function wrapEnglishSeasonal(e) {
  if (!e?.trim()) return e || '';
  let s = e;

  s = s.replace(
    /\(?(?:During the Ten Days of Penitence add:\s*)?Remember us for life[\s\S]*?Living God\.?\)?/gi,
    (m) => gate('aseret', m.replace(/^\(|\)$/g, '').replace(/^During the Ten Days of Penitence add:\s*/i, '')),
  );
  s = s.replace(
    /Who is like You merciful Father[\s\S]*?in His mercy\.?/gi,
    (m) => gate('aseret', m),
  );
  s = s.replace(
    /Inscribe for a good life all the children of Your covenant\.?/gi,
    (m) => gate('aseret', m),
  );
  s = s.replace(
    /May we be remembered and inscribed before You[\s\S]*?good life and peace\.?/gi,
    (m) => gate('aseret', m),
  );

  s = s.replace(
    /He causes the dew to descend\.?/gi,
    (m) => gate('morid_tal', m),
  );
  s = s.replace(
    /Causer of the wind to blow and of the rain to fall\.?/gi,
    (m) => gate('mashiv', m),
  );

  s = s.replace(
    /(?:^|\n)(\s*blessing\s*)(?=\n)/gi,
    (_, b) => `\n${gate('vten_bracha', 'blessing')}\n`,
  );
  s = s.replace(
    /dew and rain for a blessing\*?/gi,
    (m) => gate('vten_tal', m.replace(/\*$/, '')),
  );

  s = s.replace(
    /Blessed are You, Adonoy, the Almighty, the Holy One\.?/gi,
    (m) => m.replace(/the Almighty, the Holy One/, gate('year_round', 'the Almighty, the Holy One')),
  );
  s = s.replace(
    /Blessed are You, Adonoy, the King, the Holy One\.?/gi,
    (m) => gate('aseret', m),
  );
  s = s.replace(
    /Blessed are You, Adonoy, King, Lover of righteousness and justice\.?/gi,
    (m) =>
      m.replace(
        /King, Lover of righteousness and justice/,
        gate('year_round', 'King, Lover of righteousness and justice'),
      ),
  );
  s = s.replace(
    /Blessed are You, Adonoy, the King of Justice\.?/gi,
    (m) => gate('aseret', m),
  );

  // Al hanissim english
  s = s.replace(
    /(\[We thank You\] for the miracles[\s\S]*?at this season\.?)/gi,
    (_, intro) => gate('al_hanissim', intro),
  );
  s = s.replace(
    /(?:On Chanukah:\s*)?(In the days of Matisyahu[\s\S]*?praise Your great Name\.?)/gi,
    (_, body) => gate('chanukah', body),
  );
  s = s.replace(
    /(?:On Purim:\s*)?(In the days of Mordechai[\s\S]*?great name forever\.?)/gi,
    (_, body) => gate('purim', body),
  );

  s = s.replace(
    /(Answer us, Adonoy, answer us[\s\S]*?trouble and distress\.?)/gi,
    (_, body) => gate('aneinu', body),
  );
  s = s.replace(
    /(Adonoy, our God, console the mourners of Zion[\s\S]*?Builder of Jerusalem\.?)/gi,
    (_, body) => gate('nachem', body),
  );

  s = s.replace(
    /(Our God and God of our fathers, may there ascend[\s\S]*?Gracious, and Merciful\.?)/gi,
    (block) => {
      let b = block;
      b = b.replace(
        /Rosh Chodesh/gi,
        (m) => gate('yaaleh_rosh_chodesh', m),
      );
      b = b.replace(
        /Festival of Matzos/gi,
        (m) => gate('yaaleh_pesach', m),
      );
      b = b.replace(
        /Festival of Sukkos/gi,
        (m) => gate('yaaleh_sukkot', m),
      );
      return gate('yaaleh', b);
    },
  );

  // Modim derabanan english
  s = s.replace(
    /(We are thankful to You, that You Adonoy are our God, and God of our fathers, God of all flesh[\s\S]*?all thanks are due\.?)/gi,
    (_, body) => fold('modim_derabanan', body),
  );

  // Kedusha english (rough)
  s = s.replace(
    /(We will hallow Your Name in the world[\s\S]*?the Almighty, the Holy One\.?)/gi,
    (_, body) => fold('kedusha', body),
  );

  return tidy(s);
}

function cleanupStubbornInstructions(s) {
  const N = '[\\u0591-\\u05C7]*';
  // Broad post-pass for notes that survive the first delete wave (nikkud-tolerant)
  s = s.replace(
    new RegExp(
      `[^\\n]*אם\\s+שכח\\s+לומר\\s+ט${N}ל\\s+ו${N}מ${N}ט${N}ר[^\\n]*(?:\\nהתחיל\\s+לומר[^\\n]*)?`,
      'gu',
    ),
    '\n',
  );
  s = s.replace(/התחיל\s+לומר\s+ת[\u0591-\u05C7]*קַע[^\n]*/gu, '\n');
  s = s.replace(/[^\n]*ו?אם\s+לא\s+אמר\s+בספר\s+חיים[^\n]*/gu, '\n');
  s = s.replace(/\(\s*ברוך\s+אתה\s+יהוה\s+עשה\s+השלום\s*:?\s*\)/gu, '');
  s = s.replace(/[^\n]*ונ["״]ל\s+דבזה[^\n]*/gu, '\n');
  // Travel-prayer timing note (standalone)
  s = s.replace(/ואם\s+שכח\s+מתפלל\s+כל\s+זמן\s+שהוא\s+בדרך[^\n]*/gu, '');
  return tidy(s);
}

function markHebrew(hebrew, meta = {}) {
  let s = stripMarkers(hebrew);
  s = deleteHebrewInstructions(s);
  s = cleanupStubbornInstructions(s);
  s = wrapAseretPhrases(s);
  s = wrapRainGevuros(s);
  s = wrapVten(s);
  s = wrapChatimot(s);
  s = wrapYaaleh(s);
  s = wrapAlHanissim(s);
  s = wrapAneinuNachem(s);
  s = wrapMotzaei(s);
  s = wrapLedavid(s);
  if (meta.sectionKey && /omer/i.test(meta.sectionKey)) {
    s = wrapOmer(s);
  } else if (/ספירת העומר|סְפִירַת/.test(stripNikkud(s)) && /הנני מוכן|הִנְ֒?נִי מוּכָן/.test(s)) {
    s = wrapOmer(s);
  }
  if (meta.sectionKey && /^tachanun$/i.test(meta.sectionKey) && !/\{\{gate:tachanun\}\}/.test(s)) {
    s = gate('tachanun', s);
  }
  // Motzaei section whole-gate if needed
  if (meta.sectionKey && /motzaei/i.test(meta.sectionKey) && !/\{\{gate:motzaei_shabbat\}\}/.test(s)) {
    // leave as-is; content may be psalms not אתה חוננתנו
  }
  const allowKedusha = !(meta.sectionKey && /maariv_amidah/i.test(meta.sectionKey));
  s = wrapFolds(s, { allowKedusha });
  // Strip leftover בעשי"ת labels
  s = s.replace(/בעשי["״\u05F4]?ת\s*(?::|\u05C3)?\s*/gu, '');
  s = s.replace(/(?:בחנוכה|בפורים)\s*[:׃]\s*/gu, '');
  return tidy(s);
}

function markEnglish(english, meta = {}) {
  let s = stripMarkers(english || '');
  s = deleteEnglishInstructions(s);
  s = wrapEnglishSeasonal(s);
  return tidy(s);
}

function countGates(text) {
  const counts = {};
  const re = /\{\{gate:([a-z_]+)\}\}/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    const id = m[1].toLowerCase();
    counts[id] = (counts[id] || 0) + 1;
  }
  const folds = {};
  const fre = /\{\{fold:([a-z_]+)\}\}/gi;
  while ((m = fre.exec(text)) !== null) {
    const id = m[1].toLowerCase();
    folds[id] = (folds[id] || 0) + 1;
  }
  return { gates: counts, folds };
}

/** Replace "hebrew"/"english" string values in a TS object literal file. */
function processFile(relPath) {
  const abs = path.join(ROOT, relPath);
  let src = fs.readFileSync(abs, 'utf8');
  const report = { file: relPath, sections: [] };

  // Match each "hebrew": "..." occurrence (possibly with key nearby)
  const stringRe = /("hebrew"|"english")\s*:\s*"((?:\\.|[^"\\])*)"/g;
  let out = '';
  let last = 0;
  let m;
  const pending = [];

  // Collect matches with surrounding context for section key
  const matches = [];
  while ((m = stringRe.exec(src)) !== null) {
    const field = m[1].replace(/"/g, '');
    const start = m.index;
    const full = m[0];
    const rawVal = m[2];
    const before = src.slice(Math.max(0, start - 200), start);
    const keyMatch = before.match(/"key"\s*:\s*"([^"]+)"|^\s*"([a-z0-9_]+)"\s*:\s*\{/m);
    const sectionKey = keyMatch ? keyMatch[1] || keyMatch[2] : '';
    matches.push({ field, start, end: start + full.length, rawVal, sectionKey, prefix: m[1] });
  }

  // Group by proximity into section pairs
  for (const item of matches) {
    const unescaped = unescapeTsString(item.rawVal);
    const meta = { sectionKey: item.sectionKey, file: relPath };
    const marked =
      item.field === 'hebrew' ? markHebrew(unescaped, meta) : markEnglish(unescaped, meta);
    const escaped = escapeTsString(marked);
    const replacement = `${item.prefix}: "${escaped}"`;
    pending.push({ start: item.start, end: item.end, replacement, item, marked });
  }

  // Apply from end to start
  pending.sort((a, b) => b.start - a.start);
  let result = src;
  for (const p of pending) {
    result = result.slice(0, p.start) + p.replacement + result.slice(p.end);
    report.sections.push({
      key: p.item.sectionKey,
      field: p.item.field,
      ...countGates(p.marked),
    });
  }

  if (pending.length) {
    fs.writeFileSync(abs, result, 'utf8');
  }
  return report;
}

const FILES = [
  'src/content/siddur/maariv/ashkenaz/raw.ts',
  'src/content/siddur/maariv/sefard/raw.ts',
  'src/content/siddur/mincha/ashkenaz/amidah.ts',
  'src/content/siddur/mincha/ashkenaz/aleinu.ts',
  'src/content/siddur/mincha/ashkenaz/ashrei.ts',
  'src/content/siddur/mincha/sefard/amidah.ts',
  'src/content/siddur/mincha/sefard/aleinu.ts',
  'src/content/siddur/mincha/sefard/ashrei.ts',
  'src/content/siddur/mincha/sefard/korbanot.ts',
  'src/content/siddur/shacharit/ashkenaz/raw.ts',
  'src/content/siddur/shacharit/sefard/raw.ts',
  'src/content/siddur/standalone/ashkenaz/raw.ts',
  'src/content/siddur/standalone/sefard/raw.ts',
];

const allReports = [];
for (const f of FILES) {
  console.log('Processing', f);
  allReports.push(processFile(f));
}

// Verify maariv ashkenaz amidah
{
  const t = fs.readFileSync(path.join(ROOT, 'src/content/siddur/maariv/ashkenaz/raw.ts'), 'utf8');
  const re = /"maariv_amidah"\s*:\s*\{[\s\S]*?"hebrew"\s*:\s*"((?:\\.|[^"\\])*)"/;
  const m = t.match(re);
  const h = unescapeTsString(m[1]);
  const start = stripNikkud(h).slice(0, 80);
  console.log('\nVERIFY maariv_amidah start:', start);
  console.log('  has אדני שפתי', /אדני שפתי|אֲדֹנָי שְׂפָתַי/.test(h));
  console.log('  starts with Modim?', /^(מודים|מוֹדִים)/.test(h.trim()));
  console.log('  gate markers', (h.match(/\{\{gate:/g) || []).length);
  console.log('  sample gates', countGates(h));
}

console.log('\n=== SUMMARY ===');
for (const r of allReports) {
  const byKey = {};
  for (const s of r.sections) {
    if (s.field !== 'hebrew') continue;
    const k = s.key || '(unknown)';
    byKey[k] = s.gates || {};
    if (s.folds && Object.keys(s.folds).length) byKey[k]._folds = s.folds;
  }
  console.log(r.file);
  for (const [k, g] of Object.entries(byKey)) {
    const folds = g._folds;
    delete g._folds;
    const parts = Object.entries(g)
      .map(([id, n]) => `${id}:${n}`)
      .join(', ');
    const foldParts = folds
      ? ' folds{' + Object.entries(folds).map(([id, n]) => `${id}:${n}`).join(', ') + '}'
      : '';
    console.log(`  ${k}: ${parts || '(no gates)'}${foldParts}`);
  }
}
