/**
 * Shared list of Amidah bracha titles to strip (אבות, גבורות, etc.) and helper.
 * Used by SefariaService for Shacharis, Mincha, and Maariv Amidah.
 * Add/remove titles here to control what gets stripped from Amidah content.
 */

import { JewishCalendarService } from '../core/calendar/JewishCalendar';
import type { RefuahPersonalName } from '../types/preferences';

const stripNikkud = (s: string) => s.replace(/[\u0591-\u05C7]/g, '');
const stripHtml = (s: string) => s.replace(/<[^>]*>/g, '');
/** `<br>` → newline first, then strip tags so עשי"ת rules see real Hebrew (Sefaria wraps insertions in `<i>` / `<small>`). */
const stripHtmlKeepLineBreaks = (s: string) => stripHtml(s.replace(/<br\s*\/?>/gi, '\n'));

/**
 * Run once at the start of weekday amidah processing (see `AmidahTextPipeline.ts`).
 * Strips HTML while keeping `<br>` as newlines so calendar/regex rules see plain Hebrew/English.
 */
export function normalizeSefariaAmidahSource(hebrew: string, english: string): { hebrew: string; english: string } {
  return {
    hebrew: stripHtmlKeepLineBreaks(hebrew),
    english: stripHtmlKeepLineBreaks(english),
  };
}

/**
 * Strip Sefaria’s parenthetical “(את צמח וגו׳)” (citation ellipsis) from amidah text.
 */
export function stripEtSemachVeguParenthetical(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  const nik = '[\\u0591-\\u05C7]*';
  const tag = '(?:<[^>]*>\\s*)*';
  const sp = `(?:\\s|${tag}|[־\\u05BE])*`;
  const re = new RegExp(
    `\\(\\s*א${nik}ת${nik}${sp}צ${nik}מ${nik}ח${sp}ו${nik}ג${nik}ו['׳״\\u05F4]*\\s*\\)`,
    'gu'
  );
  const heb = hebrew.replace(re, '').replace(/[ \t]{2,}/g, ' ');
  return { hebrew: heb, english: english };
}

/** Gershayim / quotes for בעשי"ת (Sefaria + Unicode). */
const ASERET_BASHIT_GERSHAYIM = `(?:"|״|\u05F4|\u201C|\u201D)`;

/** Bracha titles to strip from Amidah (Sefaria often puts these as lines before each blessing). */
export const AMIDAH_BRACHA_TITLES = [
  'אבות',
  'גבורות',
  'קדושת השם',
  'קדושה',
  'קדושת היום',
  'בינה',
  'אתה חונן',
  'תשובה',
  'סליחה',
  'גאולה',
  'רפאה',
  'רפואה',
  'ברכת השנים',
  'ברכות השנים',
  'קיבוץ גלויות',
  'קיבוץ גליות',
  'דין',
  'משפט',
  'על הצדיקים',
  'צדיקים',
  'על המינים',
  'ברכת המינים',
  'צדקתך',
  'בונה ירושלים',
  'בנין ירושלים',
  'ירושלים',
  'מצמיח קרן ישועה',
  'בית דוד',
  'מלכות בית דוד',
  'קבלת תפלה',
  'קבלת תפילה',
  'תפילה',
  'שמע קולנו',
  'רצה',
  'עבודה',
  'מודים',
  'הודאה',
  'ברכת כהנים',
  'כהנים',
  'שלום',
  'שים שלום',
  'סיום',
];

/**
 * Remove paragraphs (or first line of paragraph) that are exactly one of the given titles.
 * Used for Amidah in Shacharis, Mincha, and Maariv.
 * Normalizes title match by stripping nikkud and trailing colons/punctuation so "אבות:" matches "אבות".
 */
export function removeParagraphTitles(
  hebrew: string,
  english: string,
  titles: string[]
): { hebrew: string; english: string } {
  const titlesSet = new Set(titles);
  const normalize = (s: string) => stripNikkud(stripHtml(s)).replace(/[\s:\.\-]+$/g, '').trim();
  const hebParas = hebrew.split(/\n\s*\n/);
  const engParas = english.split(/\n\s*\n/);
  const keepIndices: number[] = [];
  const hebProcessed: string[] = [];
  for (let i = 0; i < hebParas.length; i++) {
    let para = hebParas[i].trim();
    if (!para) continue;
    const lines = para.split(/\n/);
    const firstLine = lines[0].trim();
    const firstKey = normalize(firstLine);
    if (titlesSet.has(firstKey)) {
      if (lines.length > 1) {
        hebProcessed.push(lines.slice(1).join('\n').trim());
        keepIndices.push(i);
      }
      continue;
    }
    if (titlesSet.has(normalize(para))) continue;
    hebProcessed.push(para);
    keepIndices.push(i);
  }
  const hebrewOut = hebProcessed.join('\n\n').replace(/\n\n\n+/g, '\n\n').trim();
  const englishOut = keepIndices
    .map((i) => engParas[i] ?? '')
    .filter((p) => p.trim())
    .join('\n\n')
    .replace(/\n\n\n+/g, '\n\n')
    .trim();
  return { hebrew: hebrewOut, english: englishOut || english };
}

/** Match paragraph that is the עשי"ת (Ten Days of Repentance) header */
function isAseretYemeiTeshuvaHeader(para: string): boolean {
  const t = stripNikkud(stripHtml(para)).trim();
  // "בעשי"ת מסיים" is the third-blessing instruction, not the gevuros insertion header
  if (/מסיים/.test(t)) return false;
  return (
    /^בעשי+["״\u05F4]ת\s*:?/.test(t) ||
    /^בעשרת\s+ימי\s+תשובה\s*:?/.test(t)
  );
}

/** Paragraph is only the בעשי"ת / בעשרת ימי תשובה label (no prayer text). */
function isAseretLabelOnlyParagraph(para: string): boolean {
  const t = stripNikkud(stripHtml(para)).replace(/\s+/g, ' ').trim();
  return (
    /^בעשי+["״\u05F4]ת\s*:?\s*$/i.test(t) ||
    /^בעשרת ימי תשובה\s*:?\s*$/i.test(t)
  );
}

/** Match paragraph that is the Zochreinu prayer (content of the עשי"ת block) */
function isZochreinuParagraph(para: string): boolean {
  const t = stripNikkud(stripHtml(para)).trim();
  return /זכרנו\s*לחיים/.test(t) || (/ספר\s*החיים/.test(t) && /חיים/.test(t));
}

/** Match paragraph that is the Gevuros עשי"ת insertion (Sefaria: מִי כָמֽוֹךָ אָב הָרַחַמָן…) */
function isMeiAvHarachamimAseretParagraph(para: string): boolean {
  const t = stripNikkud(stripHtml(para)).replace(/\s+/g, ' ').trim();
  return (
    /מי\s+כמוך(ך|כה)?\s+אב\s+הרחמ(ים|ן)/.test(t) &&
    /זוכר\s+יצורי/.test(t) &&
    /לחיים/.test(t) &&
    /ברחמים/.test(t)
  );
}

/**
 * Inline Sefaria `:בעשי"ת:…` (or בעשרת ימי תשובה) before מי כמוך / זכרנו / וכתוב לחיים / בספר חיים…
 * When not Aseret: remove label + prayer. When Aseret: keep prayer only (drop label).
 */
function applyAseretInlineHebrewBlock(hebrew: string, inAseret: boolean): string {
  const nik = '[\\u0591-\\u05C7]*';
  const tag = '(?:<[^>]*>\\s*)*';
  // Some prints spell the abbreviation with two yuds before gershayim (עשיי"ת); optional tags may wrap the label.
  const bashit = `(?:${tag})*ב${nik}ע${nik}ש${nik}י${nik}(?:י${nik})?${ASERET_BASHIT_GERSHAYIM}${nik}ת`;
  const bashitLong = `ב${nik}ע${nik}ש${nik}ר${nik}ת${nik}(?:\\s|${tag})+י${nik}מ${nik}י${nik}(?:\\s|${tag})+ת${nik}ש${nik}ו${nik}ב${nik}ה`;
  const dayPrefix = `(?:${bashit}|${bashitLong})`;
  // Trailing colon after בעשי"ת optional (Sefaria sometimes uses line break only)
  const labelRun = `(?:[:׃]\\s*)*${tag}(?:${dayPrefix})${tag}\\s*[:׃]?\\s*`;

  // כָמֽוֹךָ ends with final kaf ך (not hei); Sefaria often has a space after מִי
  // אב הרחמן (some siddurim) or אב הרחמים (Sefaria Ashkenaz Minchah)
  // Trailing : or ׃ after בְּרַחֲמִים is common — include so the block still matches
  const meiPhrase =
    `מ${nik}י${nik}(?:${tag}|\\s)*כ${nik}מ${nik}ו${nik}[ךכ]${nik}(?:${tag}|\\s)*א${nik}ב(?:${tag}|\\s)*ה${nik}ר${nik}ח${nik}מ${nik}(?:ן|י${nik}[מם])(?:${tag}|\\s)*ז${nik}ו${nik}כ${nik}ר(?:${tag}|\\s)*י${nik}צ${nik}ו${nik}ר${nik}י${nik}ו(?:${tag}|\\s)*ל${nik}ח${nik}י${nik}י${nik}ם(?:${tag}|\\s)*ב${nik}ר${nik}ח${nik}מ${nik}י${nik}[מם]${nik}\\s*[:׃]?`;
  const reMei = new RegExp(`${labelRun}(${meiPhrase})`, 'gu');

  const zochLead = `ז${nik}כ${nik}ר${nik}נ${nik}ו`;
  const reZoch = new RegExp(
    `${labelRun}(${zochLead}[\\s\\S]*?)(?=\\s*\\r?\\n\\s*\\r?\\n|א${nik}ם${nik}\\s+ל${nik}א|$)`,
    'gu'
  );

  // בִּרְכַּת הַשָּׁנִים: Sefaria prints `בעשי"ת:` then `וּכְתוֹב לְחַיִים טוֹבִים…` — drop the label; off Aseret remove both.
  const sp = `(?:${tag}|\\s|[־\\u05BE])+`;
  const vichtov = `ו${nik}כ${nik}ת${nik}ו${nik}ב${sp}ל${nik}ח${nik}י${nik}י${nik}ם${sp}ט${nik}ו${nik}ב${nik}י${nik}ם${sp}כ${nik}ל${sp}ב${nik}נ${nik}י${sp}ב${nik}ר${nik}י${nik}ת${nik}[ךכ]${nik}`;
  const reKtov = new RegExp(`${labelRun}(${vichtov}(?:\\s|${tag})*[:׃]?)`, 'gu');

  // זכרנו (older): `בעשי"ת:` then `בספר חיים ברכה ושלום…` — same label strip as וכתוב.
  const seferBody =
    `ב${nik}ס${nik}פ${nik}ר${nik}\\s*ח${nik}י${nik}י${nik}ם${sp}ב${nik}ר${nik}כ${nik}ה${sp}ו${nik}ש${nik}ל${nik}ו${nik}ם[\\s\\S]+?ל${nik}ח${nik}י${nik}י${nik}ם${sp}ט${nik}ו${nik}ב${nik}י${nik}ם${sp}(?:ו${nik}ל${nik}ש${nik}ל${nik}ו${nik}ם|ו${nik}ש${nik}ל${nik}ו${nik}ם)\\s*[:׃]?`;
  const reSefer = new RegExp(`${labelRun}(${seferBody})`, 'gu');

  let out = hebrew;
  out = out.replace(reMei, (_full, phrase: string) => (inAseret ? ` ${phrase.trim()} ` : ''));
  out = out.replace(reZoch, (_full, body: string) => (inAseret ? ` ${body.trim()} ` : ''));
  out = out.replace(reKtov, (_full, phrase: string) => (inAseret ? ` ${phrase.trim()} ` : ''));
  out = out.replace(reSefer, (_full, phrase: string) => (inAseret ? ` ${phrase.trim()} ` : ''));
  // Modim: after "מַלְכֵּנוּ תָּמִיד לְעוֹלָם וָעֶד" Sefaria uses sof pasuq ׃ or no ASCII period before בעשי"ת — `afterSentence` misses. Anchor on that phrase.
  const malkeinuTamid = `מ${nik}ל${nik}כ${nik}[נן]${nik}ו${sp}ת${nik}מ${nik}י${nik}ד${sp}ל${nik}ע${nik}ו${nik}ל${nik}ם${sp}ו${nik}ע${nik}ד`;
  const modimAfterLolamBashitUchtov = new RegExp(
    `(${malkeinuTamid})(?:\\s|${tag})*(?:[.\\u05C3]|\\s*:\\s*)?(?:\\s|${tag})+(?:${bashit}|(?:${tag})*${bashitLong})${tag}\\s*[:׃]?\\s*(${vichtov}(?:\\s|${tag})*[:׃]?)`,
    'gu'
  );
  out = out.replace(modimAfterLolamBashitUchtov, (_m, keep: string, vch: string) =>
    inAseret ? `${keep.trimEnd()} ${vch.trim()} ` : keep.trimEnd()
  );
  // Modim: "…לעולם ועד." then "בעשי"ת: וכתוב לחיים…" is often same paragraph; `labelRun` only allows leading :/tags so `reKtov` misses. Strip label+phrase after a sentence period.
  const afterSentenceBashitUchtov = new RegExp(
    `(\\.)(?:\\s|${tag})+(?:${bashit}|${bashitLong})${tag}\\s*[:׃]?\\s*(${vichtov}(?:\\s|${tag})*[:׃]?)`,
    'gu'
  );
  out = out.replace(afterSentenceBashitUchtov, (_m, period: string, vch: string) =>
    inAseret ? `${period} ${vch.trim()} ` : period
  );
  // Same insertion on its own line after "לעולם ועד" (newline, no period before בעשי"ת on the next line).
  const afterNewlineBashitUchtov = new RegExp(
    `(\\n\\s*)(?:${bashit}|${bashitLong})${tag}\\s*[:׃]?\\s*(${vichtov}(?:\\s|${tag})*[:׃]?)`,
    'gu'
  );
  out = out.replace(afterNewlineBashitUchtov, (_m, nl: string, vch: string) =>
    inAseret ? `${nl}${vch.trim()} ` : nl
  );

  // Concluding: עֹשֶׂה (בעשי"ת הַשָּׁלוֹם) שָׁלוֹם בִּמְרוֹמָיו
  // Aseret → עשה השלום; year-round → עשה שלום
  const osehHashalomParen = new RegExp(
    `(ע${nik}ש${nik}ה${nik})\\s*\\(\\s*(?:${dayPrefix})\\s*(ה${nik}ש${nik}ל${nik}ו${nik}ם${nik})\\s*\\)\\s*ש${nik}ל${nik}ו${nik}ם`,
    'gu'
  );
  out = out.replace(osehHashalomParen, (_m, oseh: string, haShalom: string) =>
    inAseret ? `${oseh} ${haShalom.trim()}` : `${oseh} שָׁלוֹם`
  );

  return out.replace(/ {2,}/g, ' ');
}

/** Strip English "During/In the Ten Days of Repentance:" label when we keep the insertion text. */
function applyAseretInlineEnglishLabelStrip(english: string, inAseret: boolean): string {
  if (!inAseret || !english?.trim()) return english;
  return english.replace(/\b(?:During|In)\s+the\s+Ten\s+Days\s+of\s+Repentance:?\s*/gi, '');
}

/** Match paragraph that is halacha/instruction about Zochreinu (אם לא אמר זכרנו etc) */
function isZochreinuInstructionParagraph(para: string): boolean {
  const t = para.trim();
  if (!t) return false;
  const st = stripNikkud(stripHtml(t)).replace(/\s+/g, ' ');
  if (/אם\s+שכח\s+לומר\s+מי\s+כמוך/.test(st) && /דינו\s+כמו\s+בזכרנו/.test(st)) return true;
  if (/^\([^)]*\)$/.test(t)) return true;
  // Long Sefaria halacha blocks (nikkud-stripped for ^ anchors)
  if (/^אם\s*לא\s*אמר\s*זכרנו/.test(st) && (/מלך\s*עוזר/.test(st) || /וכתבנו/.test(st) || /בא"י|בא״י/.test(st))) return true;
  if (/הטועה\s*ומזכיר\s*זכרנו/.test(st) && /ראש\s*התפלה/.test(st)) return true;
  if (/^(אם\s*לא\s*אמר|הטועה|נזכר|פוסק|חוזר לראש)/.test(st)) return true;
  if (
    /\(דה"ח\)|\(דה״ח\)/.test(t) &&
    /זכרנו/.test(st) &&
    (/אם\s*לא\s*אמר|הטועה|מזכיר\s*זכרנו/.test(st))
  ) {
    return true;
  }
  if (/\(שו"ע\)|\(משנ"ב\)/.test(t) && /זכרנו/.test(st) && /אם\s*לא\s*אמר/.test(st)) return true;
  return false;
}

/** Standalone Sefaria paragraph: halacha on זכרנו / עשי"ת (not tefilla). Always removed from display. */
function isZochreinuTaanitHalachaParagraph(para: string): boolean {
  const st = stripNikkud(stripHtml(para)).replace(/\s+/g, ' ').trim();
  if (/אם\s*לא\s*אמר\s*זכרנו/.test(st) && (/מלך\s*עוזר/.test(st) || /וכתבנו/.test(st) || /בא"י|בא״י/.test(st))) return true;
  if (/הטועה\s*ומזכיר\s*זכרנו/.test(st)) return true;
  // וּכְתוֹב לְחַיִים… — אם שכח לומר וכתוב… לעיל אצל זכרנו ומי כמוך (דה״ח תקפ״ב)
  if (
    /שכח\s+לומר\s+וכתוב/.test(st) &&
    /לעיל\s+אצל\s+זכרנו/.test(st) &&
    /מי\s+כמוך/.test(st) &&
    /מברכת\s+הטוב|אינו\s+חוזר/.test(st)
  ) {
    return st.length < 1400;
  }
  // בעשי"ת אומרים בספר חיים… אינו חוזר… יהיו לרצון… (חיי אדם כלל כ"ד)
  if (
    /בעשי["״\u05F4]?ת/.test(st) &&
    /בספר\s+חיים/.test(st) &&
    /אומרים\s+בספר|ואם\s+לא\s+אמר/.test(st) &&
    /אינו\s+חוזר/.test(st) &&
    /חיי\s+אדם|דהא\s+לר|יהיו\s+לרצון/.test(st)
  ) {
    return st.length < 5200;
  }
  return false;
}

/**
 * Remove halacha paragraphs about זכרנו / עשי"ת / וכתוב / בספר חיים (אם לא אמר זכרנו…; חיי אדם …) outside the Aseret block stripper.
 */
export function removeZochreinuTaanitHalachaParagraphs(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  const hebParas = stripHtmlKeepLineBreaks(hebrew)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const engParas = stripHtmlKeepLineBreaks(english)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const drop = new Set<number>();
  for (let i = 0; i < hebParas.length; i++) {
    if (isZochreinuTaanitHalachaParagraph(hebParas[i])) drop.add(i);
  }
  const keptHeb = hebParas.filter((_, i) => !drop.has(i));
  const keptEng =
    engParas.length === hebParas.length ? engParas.filter((_, i) => !drop.has(i)) : engParas;
  return {
    hebrew: keptHeb.join('\n\n').replace(/\n\n\n+/g, '\n\n').trim(),
    english: keptEng.join('\n\n').replace(/\n\n\n+/g, '\n\n').trim() || english,
  };
}

/** Sefaria halacha: שכח ולא אמר יעלה ויבא (רצה / יהיו לרצון / המחזיר שכינתו לציון / חוזר לראש). */
function isYaalehVeyavoForgottenHalachaParagraph(para: string): boolean {
  const st = stripNikkud(stripHtml(para)).replace(/\s+/g, ' ').trim();
  if (!/שכח/.test(st) || !/יעלה\s*ויבא/.test(st)) return false;
  if (!/יהיו\s*לרצון|מחזיר\s*שכינתו\s*לציון|חוזר\s*לראש\s*התפלה/.test(st)) return false;
  if (!/רצה|מודים|תחזינה\s*עינינו|נזכר/.test(st)) return false;
  return st.length < 2200;
}

/**
 * Remove halacha paragraph(s) about forgetting יעלה ויבא (רצה / יהיו לרצון / המחזיר שכינתו לציון).
 */
export function removeYaalehVeyavoForgottenHalachaParagraphs(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  const hebParas = stripHtmlKeepLineBreaks(hebrew)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const engParas = stripHtmlKeepLineBreaks(english)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const drop = new Set<number>();
  for (let i = 0; i < hebParas.length; i++) {
    if (isYaalehVeyavoForgottenHalachaParagraph(hebParas[i])) drop.add(i);
  }
  const keptHeb = hebParas.filter((_, i) => !drop.has(i));
  const keptEng =
    engParas.length === hebParas.length ? engParas.filter((_, i) => !drop.has(i)) : engParas;
  const hebrewOut = keptHeb.join('\n\n').replace(/\n\n\n+/g, '\n\n').trim();
  const englishOut = keptEng.join('\n\n').replace(/\n\n\n+/g, '\n\n').trim() || english;
  return { hebrew: hebrewOut, english: englishOut };
}

/** Sefaria / Shulchan Aruch note: כשאומר מודים כורע… כאגמון… (או"ח קיג). */
function isModimBowingInstructionParagraph(para: string): boolean {
  const st = stripNikkud(stripHtml(para)).replace(/\s+/g, ' ').trim();
  if (!/כשאומר\s*מודים/.test(st)) return false;
  if (!/כאגמון/.test(st)) return false;
  if (!/כורע|זוקף/.test(st)) return false;
  return st.length < 900;
}

/** Sefaria note: כשיגיע שליח צבור למודים… הודאה קטנה… (אבודרהם). */
function isModimAbudarhamInstructionParagraph(para: string): boolean {
  const st = stripNikkud(stripHtml(para)).replace(/\s+/g, ' ').trim();
  if (!/כשיגיע/.test(st) || !/מודים/.test(st)) return false;
  if (!/שליח/.test(st) || !/צבור|ציבור/.test(st)) return false;
  if (!/(?:הודאה\s*קטנה|אבודרהם|עול\s*מלכות|לא\s*שלחתיו)/.test(st)) return false;
  return st.length < 2600;
}

/**
 * Remove halacha paragraphs about מודים: bowing (כאגמון / או"ח קיג) and שליח צבור / הודאה קטנה (אבודרהם).
 */
export function removeModimBowingInstructionParagraphs(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  const hebParas = stripHtmlKeepLineBreaks(hebrew)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const engParas = stripHtmlKeepLineBreaks(english)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const drop = new Set<number>();
  for (let i = 0; i < hebParas.length; i++) {
    if (
      isModimBowingInstructionParagraph(hebParas[i]) ||
      isModimAbudarhamInstructionParagraph(hebParas[i])
    ) {
      drop.add(i);
    }
  }
  const keptHeb = hebParas.filter((_, i) => !drop.has(i));
  const keptEng =
    engParas.length === hebParas.length ? engParas.filter((_, i) => !drop.has(i)) : engParas;
  return {
    hebrew: keptHeb.join('\n\n').replace(/\n\n\n+/g, '\n\n').trim(),
    english: keptEng.join('\n\n').replace(/\n\n\n+/g, '\n\n').trim() || english,
  };
}

/** Sefaria halacha: בחנוכה ופורים אומרים על הנסים — שכח לומר… מברכת הטוב שמך… אינו חוזר (דה״ח …). */
function isAlHanissimForgottenHalachaParagraph(para: string): boolean {
  const st = stripNikkud(stripHtml(para)).replace(/\s+/g, ' ').trim();
  if (!/בחנוכה\s+ופורים/.test(st)) return false;
  if (!/שכח\s+לומר\s+על\s+הנסים/.test(st)) return false;
  if (!/מברכת\s+הטוב\s+שמך|ברכת\s+הטוב\s+שמך/.test(st)) return false;
  if (!/אינו\s+חוזר|דה["׳״\u05F4]*ח/.test(st)) return false;
  return st.length < 2600;
}

/**
 * Remove halacha paragraph(s) about forgetting על הנסים (בחנוכה ופורים… דה״ח תרפ״ב ותרצ״ג).
 */
export function removeAlHanissimForgottenHalachaParagraphs(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  const hebParas = stripHtmlKeepLineBreaks(hebrew)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const engParas = stripHtmlKeepLineBreaks(english)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const drop = new Set<number>();
  for (let i = 0; i < hebParas.length; i++) {
    if (isAlHanissimForgottenHalachaParagraph(hebParas[i])) drop.add(i);
  }
  const keptHeb = hebParas.filter((_, i) => !drop.has(i));
  const keptEng =
    engParas.length === hebParas.length ? engParas.filter((_, i) => !drop.has(i)) : engParas;
  return {
    hebrew: keptHeb.join('\n\n').replace(/\n\n\n+/g, '\n\n').trim(),
    english: keptEng.join('\n\n').replace(/\n\n\n+/g, '\n\n').trim() || english,
  };
}

/**
 * Map each character of a nikkud-stripped Hebrew string (maqaf → space) back to `hebrew` indices.
 * Matches how bentching / amidah locate spans on stripped text.
 */
function buildStrippedHebrewIndexMap(hebrew: string): { stripped: string; toOrig: number[] } {
  let stripped = '';
  const toOrig: number[] = [];
  for (let i = 0; i < hebrew.length; i++) {
    // Maqaf (U+05BE) lies inside the Hebrew mark block but must become a word space, not be dropped.
    if (hebrew[i] === '\u05BE') {
      stripped += ' ';
      toOrig.push(i);
      continue;
    }
    if (/[\u0591-\u05C7]/.test(hebrew[i])) continue;
    if (hebrew[i] === '\u200c' || hebrew[i] === '\u200d') continue;
    // RLM/LRM/ZWSP/ALM — Sefaria / PDF paste can break naive `indexOf('ועל…')` anchors.
    if (hebrew[i] === '\u200e' || hebrew[i] === '\u200f' || hebrew[i] === '\u200b' || hebrew[i] === '\u061c') continue;
    stripped += hebrew[i];
    toOrig.push(i);
  }
  return { stripped, toOrig };
}

/** Character offset in `hebrew` at start of עלינו לשבח (nikkud/HTML ignored); -1 if not found. */
function findAleinuSplitOffsetInHebrew(hebrew: string): number {
  const h = stripHtmlKeepLineBreaks(hebrew);
  const { stripped, toOrig } = buildStrippedHebrewIndexMap(h);
  if (stripped.length === 0 || stripped.length !== toOrig.length) return -1;
  let pos = 0;
  while (pos < stripped.length) {
    const i = stripped.indexOf('עלינו', pos);
    if (i === -1) return -1;
    if (/לשבח/.test(stripped.slice(i, Math.min(stripped.length, i + 40)))) {
      return toOrig[i] ?? -1;
    }
    pos = i + 1;
  }
  return -1;
}

/** If `על הנסים` matched inside `ועל הנסים`, keep the leading vav (Sefard). */
function includeLeadingVavIfPresent(stripped: string, i: number): number {
  if (i > 0 && stripped[i - 1] === 'ו') return i - 1;
  return i;
}

/** Maqaf becomes a space in `stripped`; some editions have `ו` + maqaf + `על` → `ו על`. */
function findStrippedAlHanissimStart(stripped: string): number {
  // Prefer the prayer body (not the forgotten-halacha note that also says "על הנסים").
  // Vav-prefixed forms first: `על הנסים ועל הפרקן` is a suffix of `ועל הנסים ועל הפרקן`
  // and would otherwise leave a stray וְ before וְעַל כולם (Sefard).
  const prayerBodies = [
    'ועל הנסים ועל הפרקן',
    'ועל הנסים ועל הפורקן',
    'ועל הניסים ועל הפרקן',
    'על הנסים ועל הפרקן',
    'על הנסים ועל הפורקן',
    'על הניסים ועל הפרקן',
  ] as const;
  for (const t of prayerBodies) {
    const i = stripped.indexOf(t);
    if (i !== -1) return includeLeadingVavIfPresent(stripped, i);
  }
  const tries = ['ועל הנסים', 'ועל הניסים', 'ו על הנסים', 'ו על הניסים'] as const;
  for (const t of tries) {
    const i = stripped.indexOf(t);
    if (i !== -1) return includeLeadingVavIfPresent(stripped, i);
  }
  const m = stripped.match(/ו\s+על\s+הניסים|ו\s+על\s+הנסים/);
  if (m?.index !== undefined) return includeLeadingVavIfPresent(stripped, m.index);
  // Last resort: "על הנסים … בימים ההם" prayer open (no leading vav; Metsudah Ashkenaz)
  const bare = stripped.match(/על\s+הנסים\s+ועל\s+הפ[רו]קן|על\s+הנסים[\s\S]{0,80}?בימים\s+ההם/);
  if (bare?.index === undefined) return -1;
  return includeLeadingVavIfPresent(stripped, bare.index);
}

/**
 * Modim after על הנסים continues `…וְעַל הַכֹּל …` or (Metsudah) `וְעַל כֻּלָּם יִתְבָּרַךְ…`.
 * Require this tail so we never anchor on stray `ועל כל` inside holiday bodies or Sim Shalom.
 */
function looksLikeAlHanissimAfterVealHakolSuffix(stripped: string, j: number): boolean {
  const tail = stripped.slice(j, Math.min(stripped.length, j + 130));
  const flat = tail.replace(/[\s\u200e\u200f\u200c\u200d\u05BE]+/g, ' ');
  // Metsudah / many Ashkenaz: וְעַל כֻּלָּם יִתְבָּרַךְ וְיִתְרוֹמַם שִׁמְךָ
  if (/ועל\s*כלם?\s*יתברך|ועלכלם\s*יתברך|ועל\s*כולם\s*יתברך/.test(flat)) return true;
  if (/יתברך/.test(flat) && /יתרומם|שמך/.test(flat)) return true;
  return (
    /שהיקיש|שהקיש|שהקדש|שיקיש|שקדש|הקיש לנו|הקדשת לך|והכל שלמים|והכלשלמים/.test(flat) ||
    (/לנו/.test(flat) && /קדוש/.test(flat) && /ברוך/.test(flat))
  );
}

/** First `ועל הכל` / `ועל כולם` after `from` that closes the על הנסים insertion. */
function findStrippedVealHakolClosingFrom(stripped: string, from: number): number {
  let best = -1;
  const consider = (j: number) => {
    if (j === -1 || j < from) return;
    if (!looksLikeAlHanissimAfterVealHakolSuffix(stripped, j)) return;
    if (best === -1 || j < best) best = j;
  };

  // Explicit Metsudah close (often written without space after stripping odd whitespace)
  for (const n of ['ועלכלם יתברך', 'ועל כולם יתברך', 'ועל כלם יתברך', 'ו על כולם יתברך'] as const) {
    const j = stripped.indexOf(n, from);
    consider(j);
  }

  for (const n of ['ועל הכול', 'ועל הכל', 'ו על הכול', 'ו על הכל'] as const) {
    let pos = from;
    while (pos < stripped.length) {
      const j = stripped.indexOf(n, pos);
      if (j === -1) break;
      consider(j);
      pos = j + 1;
    }
  }

  for (const n of ['ועל כול', 'ועל כל', 'ו על כול', 'ו על כל'] as const) {
    let pos = from;
    while (pos < stripped.length) {
      const j = stripped.indexOf(n, pos);
      if (j === -1) break;
      const after = stripped[j + n.length];
      // Skip “ועל כל עם/ישראל” style (Sim Shalom) but keep “ועל כולם יתברך”
      if (after === 'ם') {
        const peek = stripped.slice(j, j + 40).replace(/\s+/g, '');
        if (!/ועלכלם?יתברך|ועלכולםיתברך/.test(peek)) {
          pos = j + 1;
          continue;
        }
      }
      const afterTrim = stripped
        .slice(j + n.length, j + n.length + 48)
        .replace(/^[\s\u200e\u200f\u200c\u200d\u05BE]+/, '');
      const near = 12;
      const ixAm = afterTrim.indexOf('עמך');
      const ixAmo = afterTrim.indexOf('עמו');
      const ixYis = afterTrim.indexOf('ישראל');
      if (
        after !== 'ם' &&
        ((ixAm !== -1 && ixAm <= near) ||
          (ixAmo !== -1 && ixAmo <= near) ||
          (ixYis !== -1 && ixYis <= near))
      ) {
        pos = j + 1;
        continue;
      }
      consider(j);
      pos = j + 1;
    }
  }

  if (best !== -1) return best;
  const spaced =
    /ו\s+על\s+הכול|ו\s+על\s+הכל|ו\s+על\s+כול(?!\s*ם)(?!\s*עמך)(?!\s*עמו)(?!\s*ישראל)|ו\s+על\s+כל(?!\s*ם)(?!\s*עמך)(?!\s*עמו)(?!\s*ישראל)/g;
  const slice = stripped.slice(from);
  spaced.lastIndex = 0;
  let m;
  while ((m = spaced.exec(slice)) !== null) {
    const jj = from + m.index;
    if (looksLikeAlHanissimAfterVealHakolSuffix(stripped, jj)) return jj;
  }
  return -1;
}

/**
 * When `ועל הכול` is missing (pipe/segment break / edition), end the Purim clause at `על העץ`
 * (…ותלו אותו ואת בניו על העץ).
 */
function findStrippedAfterPurimTreePhrase(stripped: string, searchFrom: number): number {
  const i = stripped.indexOf('על העץ', searchFrom);
  if (i === -1) return -1;
  let e = i + 'על העץ'.length;
  while (e < stripped.length && /[\s|.:׃\])\]}\u200e\u200f]/.test(stripped[e])) e++;
  return e;
}

function strippedSpanToOriginalSlice(hebrew: string, toOrig: number[], s0: number, s1Exclusive: number): string {
  if (s1Exclusive <= s0) return '';
  const o0 = toOrig[s0] ?? s0;
  let o1 = (toOrig[s1Exclusive - 1] ?? s1Exclusive - 1) + 1;
  while (o1 < hebrew.length && /[\u0591-\u05C7]/.test(hebrew[o1])) o1++;
  return hebrew.slice(o0, o1);
}

/**
 * ועל הנסים (Modim / bentching): **calendar-shaped view** of Sefaria’s dual-holiday text — not a one-off delete.
 *
 * - **Source**: Sefaria (and our API cache) still carry Chanukah + Purim when both exist; we never rely on
 *   “cut once” storage. Each call uses `date` again.
 * - **`JewishCalendarService.isAlHanissim(date)`**: `'chanukah'` → intro + בחנוכה body only; `'purim'` → intro +
 *   בפורים body only; `false` → remove the whole insertion for that day but **keep** the closing
 *   `וְעַל הַכֹּל …` / Modim continuation so the bracha stays valid.
 *
 * Layouts: (1) `בחנוכה:` / `בפורים:` after `ועל הנסים … בזמן הזה`, (2) legacy `בחנוכה ופורים` / `בחנוכה אומרים`.
 */
export function trimAlHanissimInsertionByCalendar(
  hebrew: string,
  english: string,
  date: Date
): { hebrew: string; english: string } {
  const hebClean = stripHtmlKeepLineBreaks(hebrew);
  const { stripped, toOrig } = buildStrippedHebrewIndexMap(hebClean);
  if (stripped.length === 0 || toOrig.length !== stripped.length) return { hebrew, english };

  const alKind = JewishCalendarService.isAlHanissim(date);

  const iAl = findStrippedAlHanissimStart(stripped);
  if (iAl === -1) return { hebrew, english };

  const oStart = (si: number) => toOrig[si] ?? si;
  const joinGap = (before: string, mid: string, after: string) =>
    `${before.trimEnd()}\n\n${mid.trim()}\n\n${after.trimStart()}`.replace(/\n{3,}/g, '\n\n').trim();

  /** Sof pasuq etc. are omitted from `stripped`, so `בחנוכה׃` becomes `בחנוכה` + `בימי…`. */
  const findChanukahSectionStart = (from: number, until: number): number => {
    for (const base of ['בחנוכה', 'ב חנוכה'] as const) {
      let pos = from;
      while (pos < until) {
        const i = stripped.indexOf(base, pos);
        if (i === -1 || i >= until) break;
        const tail = stripped.slice(i + base.length, i + base.length + 16);
        if (/^[\s:׃]*אומרים|^[\s:׃]*$/.test(tail) || /^[\s:׃]*בימי/.test(tail)) return i;
        pos = i + 1;
      }
    }
    return -1;
  };
  const findPurimSectionStart = (from: number, until: number): number => {
    for (const base of ['בפורים', 'ב פורים'] as const) {
      let pos = from;
      while (pos < until) {
        const i = stripped.indexOf(base, pos);
        if (i === -1 || i >= until) break;
        const tail = stripped.slice(i + base.length, i + base.length + 16);
        if (/^[\s:׃]*אומרים|^[\s:׃]*$/.test(tail) || /^[\s:׃]*בימי/.test(tail)) return i;
        pos = i + 1;
      }
    }
    return -1;
  };

  let idxVeal = findStrippedVealHakolClosingFrom(stripped, iAl);
  const iPurForEnd = findPurimSectionStart(iAl, stripped.length);
  const afterPurimTree =
    iPurForEnd === -1 ? -1 : findStrippedAfterPurimTreePhrase(stripped, iPurForEnd);
  if (afterPurimTree !== -1 && afterPurimTree > iAl) {
    if (idxVeal === -1 || idxVeal < afterPurimTree) {
      const retryFrom = Math.max(iAl, afterPurimTree - 8);
      const retry = findStrippedVealHakolClosingFrom(stripped, retryFrom);
      idxVeal = retry !== -1 && retry >= afterPurimTree - 12 ? retry : afterPurimTree;
    }
  } else if (idxVeal === -1 && stripped.indexOf('בפורים', iAl) !== -1 && iPurForEnd !== -1) {
    idxVeal = findStrippedAfterPurimTreePhrase(stripped, iPurForEnd);
  }
  if (idxVeal === -1 || idxVeal <= iAl) return { hebrew, english };

  const from = iAl >= 0 ? iAl : 0;
  const iChanColon = stripped.indexOf('בחנוכה:', from);
  const iChanOmr = stripped.indexOf('בחנוכה אומרים', from);
  const iChanBare = findChanukahSectionStart(from, idxVeal);
  const iPurColon = stripped.indexOf('בפורים:', from);
  const iPurOmr = stripped.indexOf('בפורים אומרים', from);
  const iPurBare = findPurimSectionStart(from, idxVeal);
  const iChanCandidates = [iChanColon, iChanOmr, iChanBare].filter((x) => x !== -1 && x < idxVeal);
  const iPurCandidates = [iPurColon, iPurOmr, iPurBare].filter((x) => x !== -1 && x < idxVeal);
  const iChan = iChanCandidates.length ? Math.min(...iChanCandidates) : -1;
  const iPur = iPurCandidates.length ? Math.min(...iPurCandidates) : -1;

  const newLayout =
    iAl < idxVeal &&
    iChan !== -1 &&
    iPur !== -1 &&
    Math.min(iChan, iPur) >= iAl &&
    Math.max(iChan, iPur) < idxVeal;

  if (newLayout) {
    const low = Math.min(iChan, iPur);
    const high = Math.max(iChan, iPur);
    const introCommon = strippedSpanToOriginalSlice(hebClean, toOrig, iAl, low).trim();
    const firstHolidayBody = strippedSpanToOriginalSlice(hebClean, toOrig, low, high).trim();
    const secondHolidayBody = strippedSpanToOriginalSlice(hebClean, toOrig, high, idxVeal).trim();
    const chanBody = iChan < iPur ? firstHolidayBody : secondHolidayBody;
    const purBody = iChan < iPur ? secondHolidayBody : firstHolidayBody;

    const beforeAl = hebClean.slice(0, oStart(iAl));
    const fromVeal = hebClean.slice(oStart(idxVeal));
    let newHeb: string;
    if (alKind === false) {
      newHeb = `${beforeAl.trimEnd()}\n\n${fromVeal.trimStart()}`.replace(/\n{3,}/g, '\n\n').trim();
    } else if (alKind === 'chanukah') {
      const mid = [introCommon, chanBody].filter(Boolean).join('\n\n');
      newHeb = joinGap(beforeAl, mid, fromVeal);
    } else {
      const mid = [introCommon, purBody].filter(Boolean).join('\n\n');
      newHeb = joinGap(beforeAl, mid, fromVeal);
    }
    return { hebrew: newHeb, english };
  }

  let blockStartStripped =
    stripped.indexOf('בחנוכה ופורים') !== -1
      ? stripped.indexOf('בחנוכה ופורים')
      : stripped.indexOf('בחנוכה אומרים') !== -1
        ? stripped.indexOf('בחנוכה אומרים')
        : findChanukahSectionStart(0, idxVeal);
  if (blockStartStripped === -1) {
    const j = stripped.indexOf('בחנוכה');
    blockStartStripped = j !== -1 && j < idxVeal ? j : -1;
  }
  if (blockStartStripped === -1 || !(blockStartStripped < idxVeal)) {
    return { hebrew, english };
  }

  const beforeBlock = stripped.slice(0, blockStartStripped);
  const lastShea = beforeBlock.lastIndexOf('שעה');
  let endBecholStripped = lastShea !== -1 ? lastShea + 3 : blockStartStripped;
  if (stripped[endBecholStripped] === ':') endBecholStripped += 1;
  while (
    endBecholStripped < stripped.length &&
    (stripped[endBecholStripped] === ' ' || stripped[endBecholStripped] === '\n')
  ) {
    endBecholStripped += 1;
  }
  const endBecholOriginal = oStart(endBecholStripped);
  const vealOriginal = oStart(idxVeal);

  let newHeb: string;
  if (alKind === false) {
    newHeb =
      hebClean.slice(0, endBecholOriginal).trimEnd() + '\n\n' + hebClean.slice(vealOriginal).trimStart();
  } else if (alKind === 'chanukah') {
    const chanukahStart = stripped.indexOf('בחנוכה אומרים', blockStartStripped);
    const purimStart = stripped.indexOf('בפורים אומרים', blockStartStripped);
    if (chanukahStart !== -1 && purimStart > chanukahStart) {
      const chanukahBlock = strippedSpanToOriginalSlice(hebClean, toOrig, chanukahStart, purimStart).trim();
      newHeb =
        hebClean.slice(0, endBecholOriginal).trimEnd() +
        '\n\n' +
        chanukahBlock +
        '\n\n' +
        hebClean.slice(vealOriginal).trimStart();
    } else {
      newHeb =
        hebClean.slice(0, endBecholOriginal).trimEnd() + '\n\n' + hebClean.slice(vealOriginal).trimStart();
    }
  } else {
    const purimStart = stripped.indexOf('בפורים אומרים', blockStartStripped);
    if (purimStart !== -1 && purimStart < idxVeal) {
      const purimBlock = strippedSpanToOriginalSlice(hebClean, toOrig, purimStart, idxVeal).trim();
      newHeb =
        hebClean.slice(0, endBecholOriginal).trimEnd() +
        '\n\n' +
        purimBlock +
        '\n\n' +
        hebClean.slice(vealOriginal).trimStart();
    } else {
      newHeb =
        hebClean.slice(0, endBecholOriginal).trimEnd() + '\n\n' + hebClean.slice(vealOriginal).trimStart();
    }
  }
  return { hebrew: newHeb.replace(/\n{3,}/g, '\n\n').trim(), english };
}

/**
 * Stray Sim-Shalom tail / Sefaria artifact: a short paragraph `וְעַל כָּל עַמְּךָ בֵּית יִשְׂרָאֵל … לְמִשְׁמֶרֶת שָׁלוֹם`
 * before Modim's `וְכֹל הַחַיִּים …` or before `שִים שָׁלוֹם` (e.g. after bad על הנסים span). Not said here — remove.
 */
export function removeMisplacedVealKolAmchaLemishmeretParagraph(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  const hebParas = stripHtmlKeepLineBreaks(hebrew)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const engParas = stripHtmlKeepLineBreaks(english)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const drop = new Set<number>();
  for (let i = 0; i < hebParas.length; i++) {
    const s = stripNikkud(stripHtml(hebParas[i])).replace(/\s+/g, ' ').trim();
    if (!/על כל עמך|עמך בית ישראל/.test(s) || !(/למשמרת שלום|משמרת שלום/.test(s))) continue;
    if (/שים שלום|שם שלום/.test(s)) continue;
    if (/כל החיים\s*יוד|וכל החיים|ו?כול החיים/.test(s)) continue;
    const next =
      i + 1 < hebParas.length
        ? stripNikkud(stripHtml(hebParas[i + 1])).replace(/\s+/g, ' ').trim()
        : '';
    const isNextModimClose = /^ו?כול החיים|^כל החיים יוד|^וכל החיים/.test(next);
    const isNextSimOpen = /^שים שלום|^שם שלום/.test(next);
    if (!isNextModimClose && !isNextSimOpen) continue;
    const prev =
      i > 0 ? stripNikkud(stripHtml(hebParas[i - 1])).replace(/\s+/g, ' ').trim() : '';
    const prevLooksModimTail =
      /לעולם ועד|ברוך אל ההודאות|הטוב שמך|מודים|קוינו לך|מלכנו תמיד|כל בשר/.test(prev);
    if (isNextModimClose || (isNextSimOpen && (prevLooksModimTail || i === 0))) {
      drop.add(i);
    }
  }
  const keptHeb = hebParas.filter((_, i) => !drop.has(i));
  const keptEng =
    engParas.length === hebParas.length ? engParas.filter((_, i) => !drop.has(i)) : engParas;
  return {
    hebrew: keptHeb.join('\n\n').replace(/\n\n\n+/g, '\n\n').trim(),
    english: keptEng.join('\n\n').replace(/\n\n\n+/g, '\n\n').trim() || english,
  };
}

function isMeiChamochaForgottenInstructionParagraph(para: string): boolean {
  const st = stripNikkud(stripHtml(para)).replace(/\s+/g, ' ').trim();
  return /אם\s+שכח\s+לומר\s+מי\s+כמוך/.test(st) && /דינו\s+כמו\s+בזכרנו/.test(st);
}

/**
 * Remove Sefaria halacha note about forgetting "מי כמוך" (אם שכח לומר מי כמוך דינו כמו בזכרנו).
 * Always stripped — not prayer text.
 */
export function removeMeiChamochaForgottenInstructionNote(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  const nik = '[\\u0591-\\u05C7]*';
  const tag = '(?:<[^>]*>\\s*)*';
  const halacha = `א${nik}ם${nik}\\s+ש${nik}כ${nik}ח${nik}\\s+ל${nik}ו${nik}מ${nik}ר${nik}\\s+מ${nik}י${nik}\\s+כ${nik}מ${nik}ו${nik}כ${nik}[ךכ]${nik}ד${nik}י${nik}נ${nik}ו${nik}\\s+כ${nik}מ${nik}ו${nik}\\s+ב${nik}ז${nik}כ${nik}ר${nik}נ${nik}ו${nik}\\s*\\.?`;
  const inlineRe = new RegExp(`(?:[:׃]\\s*)*${tag}(?:${halacha})`, 'gu');
  let hebOut = hebrew.replace(inlineRe, ' ').replace(/ {2,}/g, ' ');

  const hebParas = hebOut.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const engParas = english.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const drop = new Set<number>();
  for (let i = 0; i < hebParas.length; i++) {
    if (isMeiChamochaForgottenInstructionParagraph(hebParas[i])) drop.add(i);
  }
  const keptHeb = hebParas.filter((_, i) => !drop.has(i));
  let keptEng: string[];
  if (engParas.length === hebParas.length) {
    keptEng = engParas.filter((_, i) => !drop.has(i));
  } else {
    keptEng = engParas;
  }
  const hebrewOut = keptHeb.join('\n\n').replace(/\n\n\n+/g, '\n\n').trim();
  const englishOut = keptEng.join('\n\n').replace(/\n\n\n+/g, '\n\n').trim();
  return { hebrew: hebrewOut, english: englishOut || english };
}

/**
 * Aseret Yemei Teshuva (שי"ת) Amidah insertion: Sefaria may use inline `:בעשי"ת:…` with
 * מִי כָמֽוֹךָ אָב הָרַחַמָן… (or the older זכרנו לחיים block in separate paragraphs).
 * When NOT during שי"ת: remove label + insertion + halacha notes.
 * When during שי"ת: keep only the prayer text (no בעשי"ת label).
 */
export function removeAseretYemeiTeshuvaBlockIfNotToday(
  hebrew: string,
  english: string,
  date: Date = new Date()
): { hebrew: string; english: string } {
  const inAseret = JewishCalendarService.isAseretYemeiTeshuva(date);
  // Rules run before parseInstructionSegments; Sefaria often wraps this insertion in <i>/<small>
  const hebrewPlain = stripHtmlKeepLineBreaks(hebrew);
  const englishPlain = stripHtmlKeepLineBreaks(english);

  let hebOut = applyAseretInlineHebrewBlock(hebrewPlain, inAseret);
  let engOut = applyAseretInlineEnglishLabelStrip(englishPlain, inAseret);

  const hebParas = hebOut.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const engParas = engOut.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  if (inAseret) {
    if (engParas.length === hebParas.length) {
      const keptHeb: string[] = [];
      const keptEng: string[] = [];
      for (let i = 0; i < hebParas.length; i++) {
        if (isAseretLabelOnlyParagraph(hebParas[i])) continue;
        keptHeb.push(hebParas[i]);
        keptEng.push(engParas[i] ?? '');
      }
      return {
        hebrew: keptHeb.join('\n\n').replace(/\n\n\n+/g, '\n\n').trim(),
        english: keptEng.join('\n\n').replace(/\n\n\n+/g, '\n\n').trim() || englishPlain,
      };
    }
    const keptHeb = hebParas.filter((p) => !isAseretLabelOnlyParagraph(p));
    return {
      hebrew: keptHeb.join('\n\n').replace(/\n\n\n+/g, '\n\n').trim(),
      english: engOut,
    };
  }

  let i = 0;
  for (; i < hebParas.length; i++) {
    if (isAseretYemeiTeshuvaHeader(hebParas[i])) break;
  }
  if (i >= hebParas.length) return { hebrew: hebOut, english: engOut || englishPlain };
  const startIdx = i;
  let endIdx = i + 1;
  if (
    endIdx < hebParas.length &&
    (isZochreinuParagraph(hebParas[endIdx]) || isMeiAvHarachamimAseretParagraph(hebParas[endIdx]))
  ) {
    endIdx++;
  }
  while (endIdx < hebParas.length && isZochreinuInstructionParagraph(hebParas[endIdx])) {
    endIdx++;
  }
  const keptHeb = [...hebParas.slice(0, startIdx), ...hebParas.slice(endIdx)];
  const hebrewOut = keptHeb.join('\n\n').replace(/\n\n\n+/g, '\n\n').trim();
  const engEndIdx = Math.min(endIdx, engParas.length);
  const keptEng = [...engParas.slice(0, startIdx), ...engParas.slice(engEndIdx)];
  const englishOut = keptEng.join('\n\n').replace(/\n\n\n+/g, '\n\n').trim();
  return { hebrew: hebrewOut, english: englishOut || engOut || englishPlain };
}

/** Strip inline `:בעשי"ת מסיים:ברוך…המלך הקדוש` (Sefaria instruction; not said aloud). */
function stripInlineBashitMesayemHaMelechBeracha(hebrew: string): string {
  const nik = '[\\u0591-\\u05C7]*';
  const tag = '(?:<[^>]*>\\s*)*';
  const br = '(?:\\s|\\r?\\n|<br\\s*\\/?>)+';
  const bashit = `ב${nik}ע${nik}ש${nik}י${nik}${ASERET_BASHIT_GERSHAYIM}${nik}ת`;
  const bashitLong = `ב${nik}ע${nik}ש${nik}ר${nik}ת${nik}(?:${br}|${tag})+י${nik}מ${nik}י${nik}(?:${br}|${tag})+ת${nik}ש${nik}ו${nik}ב${nik}ה`;
  const day = `(?:${bashit}|${bashitLong})`;
  const mesayem = `מ${nik}ס${nik}י${nik}מ${nik}`;
  const barchuMelech = `ב${nik}ר${nik}ו${nik}ך${nik}\\s+א${nik}ת${nik}ה${nik}\\s+י${nik}ה${nik}ו${nik}ה${nik}\\s+ה${nik}מ${nik}ל${nik}ך${nik}\\s+ה${nik}ק${nik}ד${nik}ו${nik}ש${nik}`;
  const lead = `(?:[:׃]\\s*)*${tag}`;
  const gap = `(?:${br}|\\s)*`; // allow blank lines between מסיים and sample ברוך
  const re = new RegExp(`${lead}${day}(?:${br}|\\s)+${mesayem}\\s*[:׃]?${gap}${tag}${barchuMelech}`, 'giu');
  return hebrew.replace(re, ' ').replace(/ {2,}/g, ' ');
}

/** Strip inline `:בעשי"ת מסיים:ברוך…המלך המשפט` (Sefaria sample for Din; not said as a second line). */
function stripInlineBashitMesayemMelechMishpatBeracha(hebrew: string): string {
  const nik = '[\\u0591-\\u05C7]*';
  const tag = '(?:<[^>]*>\\s*)*';
  const br = '(?:\\s|\\r?\\n|<br\\s*\\/?>)+';
  const bashit = `ב${nik}ע${nik}ש${nik}י${nik}${ASERET_BASHIT_GERSHAYIM}${nik}ת`;
  const bashitLong = `ב${nik}ע${nik}ש${nik}ר${nik}ת${nik}(?:${br}|${tag})+י${nik}מ${nik}י${nik}(?:${br}|${tag})+ת${nik}ש${nik}ו${nik}ב${nik}ה`;
  const day = `(?:${bashit}|${bashitLong})`;
  const mesayem = `מ${nik}ס${nik}י${nik}מ${nik}`;
  const barchuMishpat = `ב${nik}ר${nik}ו${nik}ך${nik}\\s+א${nik}ת${nik}ה${nik}\\s+י${nik}ה${nik}ו${nik}ה${nik}\\s+ה${nik}מ${nik}ל${nik}ך${nik}\\s+ה${nik}מ${nik}ש${nik}פ${nik}ט`;
  const lead = `(?:[:׃]\\s*)*${tag}`;
  const gap = `(?:${br}|\\s)*`;
  const re = new RegExp(`${lead}${day}(?:${br}|\\s)+${mesayem}\\s*[:׃]?${gap}${tag}${barchuMishpat}`, 'giu');
  return hebrew.replace(re, ' ').replace(/ {2,}/g, ' ');
}

function isAseretMesayemHaMelechInstructionParagraph(para: string): boolean {
  const t = stripNikkud(stripHtml(para)).replace(/\s+/g, ' ').trim();
  if (!/מסיים/.test(t) || !/המלך הקדוש/.test(t)) return false;
  if (!/בעשי["״\u05F4]?ת|בעשרת ימי תשובה/.test(t)) return false;
  return /ברוך אתה/.test(t);
}

function isOnlyBarchuHaMelechHaKadoshSampleParagraph(para: string): boolean {
  const t = stripNikkud(stripHtml(para)).replace(/\s+/g, ' ').trim();
  if (!/^ברוך אתה/.test(t)) return false;
  // Sefaria’s duplicate line is a single short beracha (not a full paragraph of tefilla)
  return /המלך הקדוש/.test(t) && !/האל הקדוש/.test(t) && t.length < 95;
}

function isAseretMesayemMelechMishpatInstructionParagraph(para: string): boolean {
  const t = stripNikkud(stripHtml(para)).replace(/\s+/g, ' ').trim();
  if (!/מסיים/.test(t) || !/המלך המשפט/.test(t)) return false;
  if (!/בעשי["״\u05F4]?ת|בעשרת ימי תשובה/.test(t)) return false;
  return /ברוך אתה/.test(t);
}

function isOnlyBashitMesayemHaMelechHaMishpatLabelParagraph(para: string): boolean {
  const t = stripNikkud(stripHtml(para)).replace(/\s+/g, ' ').trim();
  // e.g. בעשי"ת יסיים: המלך המשפט:  (no full ברוך אתה sample)
  return (
    /בעשי["״\u05F4]?ת/.test(t) &&
    /י?סיים/.test(t) &&
    /המלך המשפט/.test(t) &&
    !/ברוך אתה/.test(t) &&
    t.length < 80
  );
}

function isOnlyBashitMesayemHaMelechHaKadoshLabelParagraph(para: string): boolean {
  const t = stripNikkud(stripHtml(para)).replace(/\s+/g, ' ').trim();
  return (
    /בעשי["״\u05F4]?ת/.test(t) &&
    /י?סיים/.test(t) &&
    /המלך הקדוש/.test(t) &&
    !/ברוך אתה/.test(t) &&
    t.length < 90
  );
}

function isOnlyBarchuHaMelechHaMishpatSampleParagraph(para: string): boolean {
  const t = stripNikkud(stripHtml(para)).replace(/\s+/g, ' ').trim();
  if (!/^ברוך אתה/.test(t)) return false;
  return /המלך המשפט/.test(t) && !/מלך אוהב/.test(t) && t.length < 120;
}

function paragraphContainsBarchuHaMelechHaMishpatChatima(para: string): boolean {
  const t = stripNikkud(stripHtml(para)).replace(/\s+/g, ' ').trim();
  return /ברוך אתה/.test(t) && /המלך המשפט/.test(t);
}

function removeAseretMesayemInstructionParagraphs(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  const hebParas = hebrew.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const engParas = english.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const drop = new Set<number>();
  for (let i = 0; i < hebParas.length; i++) {
    if (isAseretMesayemHaMelechInstructionParagraph(hebParas[i])) {
      drop.add(i);
      continue;
    }
    if (isAseretMesayemMelechMishpatInstructionParagraph(hebParas[i])) {
      drop.add(i);
      continue;
    }
    if (
      isOnlyBashitMesayemHaMelechHaMishpatLabelParagraph(hebParas[i]) ||
      isOnlyBashitMesayemHaMelechHaKadoshLabelParagraph(hebParas[i])
    ) {
      drop.add(i);
      continue;
    }
    const merged = `${hebParas[i]}\n\n${hebParas[i + 1] ?? ''}`;
    if (hebParas[i + 1] && isAseretMesayemHaMelechInstructionParagraph(merged)) {
      drop.add(i);
      drop.add(i + 1);
      continue;
    }
    if (hebParas[i + 1] && isAseretMesayemMelechMishpatInstructionParagraph(merged)) {
      drop.add(i);
      drop.add(i + 1);
      continue;
    }
    const st = stripNikkud(stripHtml(hebParas[i])).replace(/\s+/g, ' ').trim();
    if (
      /מסיים/.test(st) &&
      /בעשי/.test(st) &&
      !/ברוך אתה/.test(st) &&
      hebParas[i + 1] &&
      isOnlyBarchuHaMelechHaKadoshSampleParagraph(hebParas[i + 1])
    ) {
      drop.add(i);
      drop.add(i + 1);
      continue;
    }
    if (
      /מסיים/.test(st) &&
      /בעשי/.test(st) &&
      !/ברוך אתה/.test(st) &&
      hebParas[i + 1] &&
      isOnlyBarchuHaMelechHaMishpatSampleParagraph(hebParas[i + 1])
    ) {
      drop.add(i);
      drop.add(i + 1);
    }
  }
  const keptHeb = hebParas.filter((_, i) => !drop.has(i));
  const keptEng =
    engParas.length === hebParas.length ? engParas.filter((_, i) => !drop.has(i)) : engParas;
  return {
    hebrew: keptHeb.join('\n\n').replace(/\n\n\n+/g, '\n\n').trim(),
    english: keptEng.join('\n\n').replace(/\n\n\n+/g, '\n\n').trim() || english,
  };
}

function stripInlineBashitMesayemHaMelechBerachaEnglish(english: string): string {
  if (!english?.trim()) return english;
  return english
    .replace(
      /\b(?:During|In)\s+the\s+Ten\s+Days\s+of\s+Repentance[\s\S]{0,160}?\bconclud(?:e|es)\s+with\s*:?\s*Blessed\s+are\s+You[\s\S]{0,240}?King,?\s+the\s+holy\s+God\.?/gi,
      ' '
    )
    .replace(
      /\b(?:During|In)\s+the\s+Ten\s+Days[\s\S]{0,200}?\bconclud(?:e|es)\s+with\s*:?\s*Blessed\s+are\s+You[\s\S]{0,280}?(?:true\s+)?Judge\.?/gi,
      ' '
    )
    .replace(/ {2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n');
}

function removeOrphanBarchuHaMelechHaMishpatSampleParagraphs(hebrew: string): string {
  const hebParas = hebrew.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const kept = hebParas.filter((p) => !isOnlyBarchuHaMelechHaMishpatSampleParagraph(p));
  return kept.join('\n\n').replace(/\n\n\n+/g, '\n\n').trim();
}

/** After in-text replace to המלך המשפט, drop a following duplicate short “ברוך…המלך המשפט” paragraph. */
function removeDuplicateBarchuHaMelechHaMishpatClosing(hebrew: string): string {
  const hebParas = hebrew.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < hebParas.length; i++) {
    if (
      i > 0 &&
      isOnlyBarchuHaMelechHaMishpatSampleParagraph(hebParas[i]) &&
      paragraphContainsBarchuHaMelechHaMishpatChatima(hebParas[i - 1])
    ) {
      continue;
    }
    out.push(hebParas[i]);
  }
  return out.join('\n\n').replace(/\n\n\n+/g, '\n\n').trim();
}

/** Third-blessing closing: האל הקדוש → המלך הקדוש (Aseret Yemei Teshuva only). */
function replaceHaElHaKadoshWithHaMelechHaKadoshClosing(hebrew: string): string {
  const nik = '[\\u0591-\\u05C7]*';
  const re = new RegExp(
    `(ב${nik}ר${nik}ו${nik}ך${nik}\\s+א${nik}ת${nik}ה${nik}\\s+י${nik}ה${nik}ו${nik}ה${nik}\\s+)ה${nik}א${nik}ל${nik}(\\s+ה${nik}ק${nik}ד${nik}ו${nik}ש${nik})`,
    'gu'
  );
  return hebrew.replace(re, `$1הַמֶּֽלֶךְ$2`);
}

/** Fourth-blessing (דין) chatima: מלך אוהב צדקה ומשפט → המלך המשפט (Aseret Yemei Teshuva only). */
function replaceMelechOhevTzedakaVmishpatWithHaMelechHaMishpatClosing(hebrew: string): string {
  const nik = '[\\u0591-\\u05C7]*';
  const re = new RegExp(
    `(ב${nik}ר${nik}ו${nik}ך${nik}\\s+א${nik}ת${nik}ה${nik}\\s+י${nik}ה${nik}ו${nik}ה${nik}\\s+)מ${nik}ל${nik}ך${nik}\\s+א${nik}ה${nik}ב${nik}\\s+צ${nik}ד${nik}ק${nik}ה${nik}\\s+ו${nik}מ${nik}ש${nik}פ${nik}ט(\\s*[:׃])?`,
    'gu'
  );
  return hebrew.replace(re, '$1הַמֶּֽלֶךְ הַמִּשְׁפָּט$2');
}

/**
 * Remove Sefaria’s `בעשי"ת מסיים` + sample `ברוך…המלך הקדוש` (always).
 * During Aseret Yemei Teshuva: replace `ברוך…האל הקדוש` with `ברוך…המלך הקדוש` (third blessing), and
 * `ברוך…מלך אוהב צדקה ומשפט` with `ברוך…המלך המשפט` (fourth blessing).
 */
export function applyAseretThirdBlessingHaMelechHaKadosh(
  hebrew: string,
  english: string,
  date: Date = new Date()
): { hebrew: string; english: string } {
  let heb = stripInlineBashitMesayemHaMelechBeracha(hebrew);
  heb = stripInlineBashitMesayemMelechMishpatBeracha(heb);
  let eng = stripInlineBashitMesayemHaMelechBerachaEnglish(english);
  const rmParas = removeAseretMesayemInstructionParagraphs(heb, eng);
  heb = rmParas.hebrew;
  eng = rmParas.english;
  if (!JewishCalendarService.isAseretYemeiTeshuva(date)) {
    heb = removeOrphanBarchuHaMelechHaMishpatSampleParagraphs(heb);
    return {
      hebrew: heb.trim().replace(/\n\n\n+/g, '\n\n'),
      english: eng.trim().replace(/\n\n\n+/g, '\n\n'),
    };
  }
  heb = replaceHaElHaKadoshWithHaMelechHaKadoshClosing(heb);
  heb = replaceMelechOhevTzedakaVmishpatWithHaMelechHaMishpatClosing(heb);
  heb = removeDuplicateBarchuHaMelechHaMishpatClosing(heb);
  return {
    hebrew: heb.trim().replace(/\n\n\n+/g, '\n\n'),
    english: eng.trim().replace(/\n\n\n+/g, '\n\n'),
  };
}

/** Paragraph is the full Sefaria עננו insertion (public fast + tefilla through ברכת העונה). */
function isAneinuTaanitTziburInsertionParagraph(para: string): boolean {
  const t = stripNikkud(stripHtml(para)).replace(/\s+/g, ' ').trim();
  if (!/בתענית/.test(t) || !/ציבור/.test(t)) return false;
  return /עננו/.test(t) && (/עננו יהוה/.test(t) || /עונה לעמו/.test(t) || /לעמו ישראל/.test(t));
}

/** Instruction-only line (בתענית ציבור … עננו …) without the body of עננו יהוה. */
function isAneinuInstructionLineOnlyParagraph(para: string): boolean {
  const t = stripNikkud(stripHtml(para)).replace(/\s+/g, ' ').trim();
  if (!/בתענית/.test(t) || !/ציבור/.test(t) || !/עננו/.test(t)) return false;
  if (/עננו יהוה/.test(t)) return false;
  return t.length < 240;
}

/** Full עננו body only (no בתענית ציבור line) — Sefaria sometimes omits or splits the instruction. */
function isAneinuPrayerBodyOnlyParagraph(para: string): boolean {
  const t = stripNikkud(stripHtml(para)).replace(/\s+/g, ' ').trim();
  if (/בתענית/.test(t) && /ציבור/.test(t)) return false;
  if (!/^עננו/.test(t)) return false;
  if (!/יהוה/.test(t)) return false;
  if (!/(?:ביום צום|צום תענית|בצרה גדולה)/.test(t)) return false;
  return /(?:פודה ומציל|העונה לעמו|בעת צרה)/.test(t);
}

function sweepAneinuParagraphs(
  hebrew: string,
  english: string,
  isFast: boolean
): { hebrew: string; english: string } {
  const hebParas = hebrew.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const engParas = english.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const drop = new Set<number>();
  for (let i = 0; i < hebParas.length; i++) {
    if (isFast) {
      if (isAneinuInstructionLineOnlyParagraph(hebParas[i])) drop.add(i);
    } else if (
      isAneinuTaanitTziburInsertionParagraph(hebParas[i]) ||
      isAneinuPrayerBodyOnlyParagraph(hebParas[i])
    ) {
      drop.add(i);
    }
  }
  const keptHeb = hebParas.filter((_, i) => !drop.has(i));
  const keptEng =
    engParas.length === hebParas.length ? engParas.filter((_, i) => !drop.has(i)) : engParas;
  return {
    hebrew: keptHeb.join('\n\n').replace(/\n\n\n+/g, '\n\n').trim(),
    english: keptEng.join('\n\n').replace(/\n\n\n+/g, '\n\n').trim() || english,
  };
}

function isRoshChodeshCholHamoedYaalehInstructionParagraph(para: string): boolean {
  const t = stripNikkud(stripHtml(para)).replace(/\s+/g, ' ').trim();
  if (!/בראש חודש|בראש חדש/.test(t)) return false;
  if (!/בחול המועד/.test(t)) return false;
  if (!/אומרים זה|אומר זה/.test(t)) return false;
  if (/יעלה ויבא/.test(t)) return false;
  return t.length < 160;
}

/**
 * Remove Sefaria label `בראש חודש ובחול המועד אומרים זה:` (or חדש / אומר) before יעלה ויבא in weekday Amidah.
 */
export function removeRoshChodeshCholHamoedYaalehInstruction(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  const nik = '[\\u0591-\\u05C7]*';
  const tag = '(?:<[^>]*>\\s*)*';
  const ws = `(?:\\s|${tag})+`;
  let heb = stripHtmlKeepLineBreaks(hebrew);
  let eng = stripHtmlKeepLineBreaks(english);

  const hebParas = heb.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const engParas = eng.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const drop = new Set<number>();
  for (let i = 0; i < hebParas.length; i++) {
    if (isRoshChodeshCholHamoedYaalehInstructionParagraph(hebParas[i])) drop.add(i);
  }
  if (drop.size > 0) {
    const keptHeb = hebParas.filter((_, i) => !drop.has(i));
    const keptEng =
      engParas.length === hebParas.length ? engParas.filter((_, i) => !drop.has(i)) : engParas;
    heb = keptHeb.join('\n\n').replace(/\n\n\n+/g, '\n\n').trim();
    eng = (keptEng.join('\n\n').replace(/\n\n\n+/g, '\n\n').trim() || eng).trim();
  }

  const labelRe = new RegExp(
    `ב${nik}ר${nik}א${nik}ש${nik}${ws}ח${nik}(?:ו${nik})?ד${nik}ש${nik}${ws}ו${ws}ב${nik}ח${nik}ו${nik}ל${nik}${ws}ה${nik}מ${nik}ו${nik}ע${nik}ד${ws}א${nik}ו${nik}מ${nik}ר${nik}(?:י${nik}מ${nik})?${ws}ז${nik}ה\\s*[:׃]?\\s*`,
    'giu'
  );
  heb = heb.replace(labelRe, ' ').replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

  eng = eng
    .replace(
      /\bOn\s+Rosh\s+Chodesh\s+and\s+(?:on\s+)?Ch(?:o)?l\s+Hamoed[\s\S]{0,180}?(?:we\s+)?(?:say|recite)\s+this\s*:?\s*/gi,
      ' '
    )
    .replace(/ {2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { hebrew: heb, english: eng || english };
}

function stripEnglishAneinuFullBlockLoose(english: string): string {
  if (!english?.trim()) return english;
  let e = english.replace(
    /\bOn\s+(?:a\s+)?communal\s+(?:public\s+)?fast[\s\S]{0,4500}?Blessed\s+(?:are|be)\s+You[\s\S]{0,600}?Israel[^.?]{0,200}?(?:distress|trouble)[^.?]*\./gi,
    ' '
  );
  e = e.replace(/\bAnswer\s+us[\s\S]{0,4000}?Israel[^.?]{0,200}?(?:distress|trouble)[^.?]*\./gi, ' ');
  return e.replace(/ {2,}/g, ' ').replace(/\n{3,}/g, '\n\n');
}

function stripEnglishAneinuInstructionLineLoose(english: string): string {
  if (!english?.trim()) return english;
  return english
    .replace(
      /\bOn\s+(?:a\s+)?communal\s+(?:public\s+)?fast[\s\S]{0,280}?(?:the\s+)?(?:cantor|chazzan|leader)[\s\S]{0,140}?(?:here\s+)?(?:says|recites)\s+Aneinu\s*:?\s*/gi,
      ''
    )
    .replace(
      /\bOn\s+(?:a\s+)?communal\s+(?:public\s+)?fast[\s\S]{0,400}?(?:we\s+)?(?:say|recite)\s+Aneinu[\s\S]{0,220}?(?:whispered|silent|half[\s-]*aloud|quiet)[\s\S]{0,160}?:?\s*/gi,
      ''
    )
    .replace(/ {2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n');
}

/**
 * Peace bracha (Ashkenaz weekday Mincha): שָׁלוֹם רָב year-round;
 * on public fasts replace with שִׂים שָׁלוֹם (Sefaria prints both under `לתענית ציבור:`).
 * Not used for Shacharit (Sim Shalom always) or Maariv (typically Shalom Rav only).
 */
export function applyAmidahPeaceBrachaByPublicFast(
  hebrew: string,
  english: string,
  date: Date = new Date(),
  amidahSlot: 'shacharit' | 'mincha' | 'maariv' = 'mincha'
): { hebrew: string; english: string } {
  // Shacharit always uses Sim Shalom in Ashkenaz; Maariv stays Shalom Rav — only Mincha duals.
  if (amidahSlot !== 'mincha') return { hebrew, english };

  const isFast = JewishCalendarService.isFastDay(date);
  const hebParas = stripHtmlKeepLineBreaks(hebrew)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const engParas = stripHtmlKeepLineBreaks(english)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const aligned = engParas.length === hebParas.length;

  const isShalomRavPara = (para: string): boolean => {
    const st = stripNikkud(stripHtml(para)).replace(/\s+/g, ' ').trim();
    return /^שלום\s+רב/.test(st) && /בשלומך/.test(st);
  };
  const isSimShalomPara = (para: string): boolean => {
    const st = stripNikkud(stripHtml(para)).replace(/\s+/g, ' ').trim();
    if (/שים\s+שלום/.test(st) && /ברכנו\s+אבינו/.test(st) && /תורת\s+חיים/.test(st)) return true;
    if (/לתענית/.test(st) && /שים\s+שלום/.test(st)) return true;
    return false;
  };
  const stripSimLabel = (para: string): string => {
    const nik = '[\\u0591-\\u05C7]*';
    const tag = '(?:<[^>]*>\\s*)*';
    const re = new RegExp(
      `^\\s*(?:ל${nik})?ת${nik}ע${nik}נ${nik}י${nik}ת(?:\\s|${tag})+צ${nik}י${nik}ב${nik}ו${nik}ר\\s*[:׃]?\\s*`,
      'iu'
    );
    return para.replace(re, '').trim();
  };

  const keptHeb: string[] = [];
  const keptEng: string[] = [];
  for (let i = 0; i < hebParas.length; i++) {
    const p = hebParas[i];
    const e = aligned ? engParas[i] : '';
    if (isFast) {
      if (isShalomRavPara(p)) continue;
      if (isSimShalomPara(p)) {
        keptHeb.push(stripSimLabel(p));
        if (aligned) keptEng.push(e.replace(/^\s*(?:On\s+)?(?:public\s+)?fast\s+days?\s*[,:]\s*/i, '').trim() || e);
        continue;
      }
    } else if (isSimShalomPara(p)) {
      continue;
    }
    keptHeb.push(p);
    if (aligned) keptEng.push(e);
  }

  return {
    hebrew: keptHeb.join('\n\n').replace(/\n{3,}/g, '\n\n').trim(),
    english: (aligned ? keptEng.join('\n\n') : english).replace(/\n{3,}/g, '\n\n').trim() || english,
  };
}

/**
 * עננו (Shomea Tefillah): Sefaria inserts `בתענית ציבור אומר כאן הש"ץ עננו:` or
 * `בתענית ציבור אומרים כאן עננו בתפילת הלחש:` + full עננו + ברכה.
 * Remove entirely except on public-fast Shacharit/Mincha; never keep at Maariv.
 * On those fast slots, strip the instruction line only.
 */
export function applyAmidahAneinuPublicFast(
  hebrew: string,
  english: string,
  date: Date = new Date(),
  amidahSlot: 'shacharit' | 'mincha' | 'maariv' = 'mincha'
): { hebrew: string; english: string } {
  // Aneinu is not said at Maariv (individual: Mincha; chazan: Shacharit).
  const isFast = amidahSlot !== 'maariv' && JewishCalendarService.isFastDay(date);
  const nik = '[\\u0591-\\u05C7]*';
  const tag = '(?:<[^>]*>\\s*)*';

  /** Through עננו, optional `בתפילת הלחש`, then colon (Sefaria variants). */
  const aneinuInstructionPrefix = `(?:[:׃]\\s*)*ב${nik}ת${nik}ע${nik}נ${nik}י${nik}ת(?:\\s|${tag})+צ${nik}י${nik}ב${nik}ו${nik}ר[\\s\\S]{0,420}?ע${nik}נ${nik}נ${nik}ו(?:[\\s\\S]{0,140}?ב${nik}ת${nik}פ${nik}ל${nik}ל${nik}ת(?:\\s|${tag})+ה${nik}ל${nik}ח${nik}ש${nik})?\\s*[:׃]`;
  const aneinuEndBracha = `ב${nik}ר${nik}ו${nik}ך${nik}\\s+א${nik}ת${nik}ה${nik}\\s+י${nik}ה${nik}ו${nik}ה${nik}\\s+ה${nik}ע${nik}ו${nik}נ${nik}ה${nik}\\s+ל${nik}ע${nik}מ${nik}ו\\s+י${nik}ש${nik}ר${nik}א${nik}ל\\s+ב${nik}ע${nik}ת${nik}\\s+צ${nik}ר${nik}ה\\s*[:׃]?`;
  /** Some editions end עננו with פודה ומציל… (no separate ברוך אתה chatima in the same block). */
  const aneinuEndPodeh = `פ${nik}ו${nik}ד${nik}ה${nik}\\s+ו${nik}מ${nik}צ${nik}י${nik}ל${nik}\\s+ב${nik}כ${nik}ל${nik}\\s+ע${nik}ת${nik}\\s+צ${nik}ר${nik}ה${nik}\\s+ו${nik}צ${nik}ו${nik}ק${nik}ה${nik}\\s*[:׃]?`;
  const aneinuEndAny = `(?:${aneinuEndBracha}|${aneinuEndPodeh})`;
  /** Fallback when tight regex misses (HTML quirks, extra words, single newlines). */
  const aneinuUltraLoose = new RegExp(
    `(?:[:׃]\\s*)*ב${nik}ת${nik}ע${nik}נ${nik}י${nik}ת[\\s\\S]{0,220}?צ${nik}י${nik}ב${nik}ו${nik}ר[\\s\\S]{0,12000}?(?:${aneinuEndBracha}|${aneinuEndPodeh})`,
    'giu'
  );

  let heb = stripHtmlKeepLineBreaks(hebrew);
  let eng = stripHtmlKeepLineBreaks(english);

  if (!isFast) {
    const removeAll = new RegExp(`${aneinuInstructionPrefix}\\s*([\\s\\S]*?)${aneinuEndAny}`, 'giu');
    heb = heb.replace(removeAll, ' ').replace(/ {2,}/g, ' ');
    const flat = stripNikkud(heb).replace(/\s+/g, '');
    if (
      (flat.includes('בתענית') && flat.includes('עננו')) ||
      (flat.includes('עננויהוה') &&
        (flat.includes('פודהומציל') || flat.includes('העונהלעמו') || flat.includes('ביוםצום')))
    ) {
      heb = heb.replace(aneinuUltraLoose, ' ').replace(/ {2,}/g, ' ');
    }
    eng = stripEnglishAneinuFullBlockLoose(eng);
  } else {
    const stripInstr = new RegExp(
      `${aneinuInstructionPrefix}(?=\\s*ע${nik}נ${nik}נ${nik}ו${nik}\\s+י${nik}ה${nik}ו${nik}ה)`,
      'giu'
    );
    heb = heb.replace(stripInstr, ' ').replace(/ {2,}/g, ' ');
    eng = stripEnglishAneinuInstructionLineLoose(eng);
  }

  const swept = sweepAneinuParagraphs(heb, eng, isFast);
  return {
    hebrew: swept.hebrew.trim().replace(/\n\n\n+/g, '\n\n'),
    english: swept.english.trim().replace(/\n\n\n+/g, '\n\n'),
  };
}

/** First paragraph index that is Aleinu (עלינו לשבח); -1 if none. */
function findAleinuParagraphIndex(hebParas: string[]): number {
  for (let i = 0; i < hebParas.length; i++) {
    const n = normAmidahEpiloguePara(hebParas[i]);
    if (/עלינו/.test(n) && /לשבח/.test(n)) return i;
  }
  return -1;
}

/**
 * Mincha Amidah from Sefaria often includes Aleinu; we also fetch `mincha_aleinu`. Drop Aleinu from the Amidah blob.
 */
export function splitMinchaAmidahBeforeStandaloneAleinu(hebrew: string, english: string): { hebrew: string; english: string } {
  const hFlat = stripHtmlKeepLineBreaks(hebrew);
  const hebParas = hFlat.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const aleinuParaIdx = findAleinuParagraphIndex(hebParas);
  if (aleinuParaIdx >= 0) {
    const keptHeb = hebParas.slice(0, aleinuParaIdx).join('\n\n').trim();
    const engParas = stripHtmlKeepLineBreaks(english).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    const keptEng =
      engParas.length === hebParas.length ? engParas.slice(0, aleinuParaIdx).join('\n\n').trim() : english;
    return { hebrew: keptHeb, english: keptEng || english };
  }
  const off = findAleinuSplitOffsetInHebrew(hebrew);
  if (off < 0) return { hebrew, english };
  const hNorm = stripHtmlKeepLineBreaks(hebrew);
  return { hebrew: hNorm.slice(0, off).trimEnd(), english };
}

/**
 * Sefaria note (public fast): chazzan says Birkat Kohanim here — אלהינו… / יברכך… / לאחר ברכת כהנים /
 * אדיר במרום… Not part of the ordinary silent Amidah text.
 */
export function removeBirkatKohanimTaanitTziburInsertion(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  const nik = '[\\u0591-\\u05C7]*';
  const tag = '(?:<[^>]*>\\s*)*';
  const br = '(?:\\s|\\r?\\n|<br\\s*\\/?>)+';
  const head =
    `ב${nik}ת${nik}ע${nik}נ${nik}י${nik}ת(?:${br}|${tag})+צ${nik}י${nik}ב${nik}ו${nik}ר[\\s\\S]{0,520}?ב${nik}ר${nik}כ${nik}ת(?:${br}|${tag})+כ${nik}ה${nik}נ${nik}י${nik}ם\\s*[:׃]?`;
  const tail =
    `א${nik}ד${nik}י${nik}ר(?:${br}|${tag})+ב${nik}מ${nik}ר${nik}ו${nik}ם[\\s\\S]{0,6200}?מ${nik}ש${nik}מ${nik}ר${nik}ת(?:${br}|${tag})+ש${nik}ל${nik}ו${nik}ם\\s*[:׃]?`;
  const reBlockAnchored = new RegExp(`(?:^|\\r?\\n\\s*\\r?\\n)\\s*${head}[\\s\\S]*?${tail}`, 'giu');

  const stripAnchoredBkBlocks = (prefix: string) =>
    prefix
      .replace(reBlockAnchored, (match) => {
        const flat = stripNikkud(stripHtmlKeepLineBreaks(match));
        if (/וכל החיים|כל החיים\s*יוד|כול החיים/.test(flat)) return match;
        if (/עלינו/.test(flat) && /לשבח/.test(flat)) return match;
        if (match.length > 5500) return match;
        if (/שים שלום/.test(flat) && /ברוך אתה/.test(flat)) return match;
        return ' ';
      })
      .replace(/[ \t]{2,}/g, ' ')
      .trimEnd();

  let heb = stripHtmlKeepLineBreaks(hebrew);
  const aleinuOff = findAleinuSplitOffsetInHebrew(heb);
  let prefixText: string;
  let suffixText: string;
  if (aleinuOff >= 0) {
    prefixText = heb.slice(0, aleinuOff);
    suffixText = heb.slice(aleinuOff);
  } else {
    const preParas = heb.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    const aleinuIdx = findAleinuParagraphIndex(preParas);
    if (aleinuIdx >= 0) {
      prefixText = preParas.slice(0, aleinuIdx).join('\n\n');
      suffixText = preParas.slice(aleinuIdx).join('\n\n');
    } else {
      prefixText = heb;
      suffixText = '';
    }
  }
  const cleanedPrefix = stripAnchoredBkBlocks(prefixText);
  heb = suffixText
    ? `${cleanedPrefix}\n\n${suffixText}`.replace(/\n{3,}/g, '\n\n').trim()
    : `${cleanedPrefix}`.replace(/\n{3,}/g, '\n\n').trim();

  const hebParas = heb.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const engParas = stripHtmlKeepLineBreaks(english)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  /** Real silent Amidah resumes here — never swallow peace bracha / elohai netzor / chatima. */
  const isAmidahResumesAfterBkNote = (sj: string): boolean => {
    if (/^שלום\s+רב/.test(sj) || /שים\s+שלום/.test(sj)) return true;
    if (/על כל עמך|עמך בית ישראל/.test(sj)) return true;
    if (/ברוך אתה/.test(sj) && (/הטוב שמך|בשלום|המברך\s+את\s+עמו/.test(sj))) return true;
    if (/כל החיים\s+יודו|וכל החיים|ו?כול החיים/.test(sj)) return true;
    if (/אלהי\s+נצור|אלקי\s+נצור|יהיו\s+לרצון|עשה\s+שלום|עושה\s+שלום/.test(sj)) return true;
    if (/יהי\s+רצון/.test(sj) && /בית\s+המקדש/.test(sj)) return true;
    return false;
  };
  /** Only priestly-blessing body / stage labels after the taanit-tzibur note. */
  const isBirkatKohanimBodyPara = (sj: string): boolean => {
    if (isAmidahResumesAfterBkNote(sj)) return false;
    if (/^שליח\s+ציבור\s*[:׃]?$/.test(sj) || /^חזן\s*[:׃]?$/.test(sj)) return true;
    if (/אלהינו\s+ואלהי\s+אבותינו\s+ברכנו/.test(sj) && /משולשת|אהרן|כהנים/.test(sj)) return true;
    if (/יברכך\s+יהוה/.test(sj) && (/יאר\s+יהוה|ישא\s+יהוה|וישם\s+לך\s+שלום/.test(sj) || /כהנים/.test(sj)))
      return true;
    if (/אדיר\s+במרום/.test(sj) && (/משמרת|למשמרת|רצון/.test(sj) || sj.length > 120)) return true;
    if (/משמרת\s+שלום|למשמרת\s+שלום/.test(sj) && sj.length < 400) return true;
    return false;
  };
  const drop = new Set<number>();
  for (let i = 0; i < hebParas.length; i++) {
    if (drop.has(i)) continue;
    const st = stripNikkud(stripHtml(hebParas[i])).replace(/\s+/g, ' ').trim();
    if (/עננו\s+יהוה/.test(st)) continue;
    if (!/בתענית\s+ציבור/.test(st) || !/ברכת\s+כהנים/.test(st)) continue;
    // Instruction line (and any self-contained אדיר…משמרת blob already in the same para).
    drop.add(i);
    // Only peel the next BK body paragraphs — never the rest of the Amidah (old code dropped 15).
    for (let j = i + 1; j < Math.min(hebParas.length, i + 8); j++) {
      const sj = stripNikkud(stripHtml(hebParas[j])).replace(/\s+/g, ' ').trim();
      if (isAmidahResumesAfterBkNote(sj)) break;
      if (isBirkatKohanimBodyPara(sj)) {
        drop.add(j);
        continue;
      }
      break;
    }
  }
  const keptHeb = hebParas.filter((_, i) => !drop.has(i));
  const keptEng =
    engParas.length === hebParas.length ? engParas.filter((_, i) => !drop.has(i)) : engParas;
  return {
    hebrew: keptHeb.join('\n\n').replace(/\n\n\n+/g, '\n\n').trim(),
    english: keptEng.join('\n\n').replace(/\n\n\n+/g, '\n\n').trim() || english,
  };
}

/** Sefaria: `במנחת תשעה באב:` … נחם … `מנחם ציון ובונה ירושלים:` (weekday Amidah, בונה ירושלים blessing). */
function nachemMinchaTishaBAvHebrewRegexParts(): {
  label: string;
  menachemClose: string;
  barchuBoneh: string;
} {
  const nik = '[\\u0591-\\u05C7]*';
  const bem = `ב${nik}מ${nik}נ${nik}ח${nik}ת`;
  const tavShin = `ת${nik}ש${nik}ע${nik}ה`;
  const bAv = `ב${nik}א${nik}ב`;
  const avSep = '(?:\\s|־|\\u05BE)+';
  const label = `${bem}\\s*${tavShin}${avSep}${bAv}\\s*[:\u05C3]?`;
  /** Word-final mem is often ם (U+05DD), not מ (U+05DE) — e.g. מְנַחֵם, יְרוּשָׁלַיִם */
  const mem = '(?:מ|ם)';
  const menachemClose = `מ${nik}נ${nik}ח${nik}${mem}\\s+צ${nik}י${nik}ו${nik}ן\\s+ו${nik}ב${nik}ו${nik}נ${nik}ה\\s+י${nik}ר${nik}ו${nik}ש${nik}ל${nik}י${nik}${mem}\\s*[:\u05C3.]?`;
  const barchuBoneh = `ב${nik}ר${nik}ו${nik}ך${nik}\\s+א${nik}ת${nik}ה${nik}\\s+י${nik}ה${nik}ו${nik}ה${nik}\\s+ב${nik}ו${nik}נ${nik}ה${nik}\\s+י${nik}ר${nik}ו${nik}ש${nik}ל${nik}י${nik}${mem}\\s*[:\u05C3.]?`;
  return { label, menachemClose, barchuBoneh };
}

/** Short standalone year-round chatima (not מנחם ציון). */
function isStandaloneBarchuBonehYerushalayimOnly(para: string): boolean {
  const t = stripNikkud(stripHtml(para)).replace(/\s+/g, ' ').trim();
  if (!/^ברוך אתה/.test(t)) return false;
  if (/מנחם/.test(t)) return false;
  return /בונה ירושלים/.test(t) && t.length < 130;
}

/** After נחם chatima, Sefaria may leave a duplicate `ברוך…בונה ירושלים` in its own paragraph. */
function removeDuplicateBonehParagraphAfterMenachemClosing(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  const hebParas = hebrew.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const engParas = english.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const drop = new Set<number>();
  for (let i = 1; i < hebParas.length; i++) {
    const plainPrev = stripNikkud(stripHtml(hebParas[i - 1])).replace(/\s+/g, ' ');
    if (
      isStandaloneBarchuBonehYerushalayimOnly(hebParas[i]) &&
      /מנחם\s*ציון/.test(plainPrev) &&
      /בונה\s*ירושלים/.test(plainPrev)
    ) {
      drop.add(i);
    }
  }
  if (drop.size === 0) return { hebrew, english };
  const keptHeb = hebParas.filter((_, i) => !drop.has(i));
  const keptEng =
    engParas.length === hebParas.length ? engParas.filter((_, i) => !drop.has(i)) : engParas;
  return {
    hebrew: keptHeb.join('\n\n').replace(/\n\n\n+/g, '\n\n').trim(),
    english: (keptEng.join('\n\n').replace(/\n\n\n+/g, '\n\n').trim() || english).trim(),
  };
}

function stripEnglishNachemMinchaTishaBAvBlock(english: string): string {
  if (!english?.trim()) return english;
  const re =
    /\b(?:At|During)\s+Minch(?:a|ah)\s+on\s+Tish(?:a['\u2019`]?|ah)\s*B['\u2019`]?Av\s*[,:\s][\s\S]*?(?:Consoler|Comfort(?:er)?)\s+of\s+Zion[\s\S]{0,4500}?(?:Builder|Restorer)\s+of\s+Jerusalem\s*[.:]?\s*/giu;
  return english.replace(re, ' ').replace(/ {2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function applyEnglishNachemTishaMincha(english: string): string {
  if (!english?.trim()) return english;
  const reFull =
    /(?:Blessed\s+are\s+You[\s\S]{0,280}?Builder\s+of\s+Jerusalem\s*[.:]?\s*)?(?:At|During)\s+Minch(?:a|ah)\s+on\s+Tish(?:a['\u2019`]?|ah)\s*B['\u2019`]?Av\s*[,:\s][\s\S]*?(?:Consoler|Comfort(?:er)?)\s+of\s+Zion[\s\S]{0,4500}?(?:Builder|Restorer)\s+of\s+Jerusalem\s*[.:]?\s*/giu;
  return english
    .replace(reFull, (m) => {
      let x = m;
      x = x.replace(/^\s*Blessed\s+are\s+You[\s\S]{0,280}?Builder\s+of\s+Jerusalem\s*[.:]?\s*/giu, '');
      x = x.replace(/^\s*(?:At|During)\s+Minch(?:a|ah)\s+on\s+Tish(?:a['\u2019`]?|ah)\s*B['\u2019`]?Av\s*[,:\s]\s*/giu, '');
      return x.trim();
    })
    .replace(/ {2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Remove Sefaria’s נחם insertion (`במנחת תשעה באב:` … `מנחם ציון ובונה ירושלים:`) on all days except
 * Mincha on Tisha B'Av. On that slot only: keep נחם, strip the instruction label and the duplicate
 * year-round chatima `ברוך אתה … בונה ירושלים` that precedes it.
 */
export function applyNachemTishaBAvBonehYerushalayim(
  hebrew: string,
  english: string,
  date: Date = new Date(),
  amidahSlot: 'shacharit' | 'mincha' | 'maariv' = 'shacharit'
): { hebrew: string; english: string } {
  const { label, menachemClose, barchuBoneh } = nachemMinchaTishaBAvHebrewRegexParts();
  const nachemBlock = `${label}\\s*[\\s\\S]*?${menachemClose}`;
  const reBlock = new RegExp(nachemBlock, 'giu');
  const tishaMincha =
    JewishCalendarService.isTishaBAv(date) && amidahSlot === 'mincha';

  if (!tishaMincha) {
    const heb = hebrew.replace(reBlock, '').replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim();
    const eng = stripEnglishNachemMinchaTishaBAvBlock(english);
    return { hebrew: heb, english: eng || english };
  }

  const reFull = new RegExp(`(?:${barchuBoneh})?\\s*${nachemBlock}`, 'giu');
  let heb = hebrew
    .replace(reFull, (m) => {
      let x = m;
      x = x.replace(new RegExp(`^\\s*(?:${barchuBoneh})\\s*`, 'iu'), '');
      x = x.replace(new RegExp(`^\\s*${label}\\s*`, 'iu'), '');
      return x.trim();
    })
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
  let eng = applyEnglishNachemTishaMincha(english);
  const deduped = removeDuplicateBonehParagraphAfterMenachemClosing(heb, eng);
  heb = deduped.hebrew;
  eng = deduped.english;
  return { hebrew: heb, english: eng || english };
}

/** Match paragraph that is the Mashiv Haruach halacha (טעה ולא אמר בחורף משיב הרוח... קיצור שו"ע יט) */
function isMashivHaruachInstructionParagraph(para: string): boolean {
  const t = stripNikkud(stripHtml(para)).trim();
  return (
    /טעה\s*ולא\s*אמר\s*בחורף\s*משיב\s*הרוח/.test(t) ||
    (/משיב\s*הרוח\s*ומוריד\s*הגשם/.test(t) && /מחיה\s*המתים\s*צריך\s*לחזור\s*לראש\s*התפלה/.test(t))
  );
}

/**
 * Remove the halacha paragraph about forgetting Mashiv Haruach (טעה ולא אמר בחורף... קיצור שו"ע יט).
 */
export function removeMashivHaruachInstructionParagraph(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  const hebParas = hebrew.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const engParas = english.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const dropHebrew = new Set<number>();
  for (let i = 0; i < hebParas.length; i++) {
    if (isMashivHaruachInstructionParagraph(hebParas[i])) dropHebrew.add(i);
  }
  const keptHeb = hebParas.filter((_, i) => !dropHebrew.has(i));
  const keptEng = engParas.filter((_, i) => !dropHebrew.has(i));
  const hebrewOut = keptHeb.join('\n\n').replace(/\n\n\n+/g, '\n\n').trim();
  const englishOut = keptEng.join('\n\n').replace(/\n\n\n+/g, '\n\n').trim();
  return { hebrew: hebrewOut, english: englishOut || english };
}

/** Match halacha paragraph: mistaken האל הקדוש vs המלך הקדוש (אם טעה וסיים… ובימות השנה…). */
function isHaElHaKadoshTayaInstructionParagraph(para: string): boolean {
  const t = stripNikkud(stripHtml(para)).replace(/\s+/g, ' ').trim();
  return (
    /אם\s*טעה\s*וסיים\s*האל\s*הקדוש\s*אם\s*נזכר/.test(t) ||
    (/אם\s*טעה\s*וסיים\s*האל\s*הקדוש/.test(t) &&
      /המלך\s*הקדוש/.test(t) &&
      (/תוך\s*כדי\s*די?בור/.test(t) || /לחזור\s*לראש\s*התפלה/.test(t)))
  );
}

/**
 * Remove halacha paragraph about finishing האל הקדוש vs saying המלך הקדוש (תוך כדי דיבור / ימות השנה).
 */
export function removeHaElHaKadoshTayaInstructionParagraph(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  const hebParas = hebrew.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const engParas = english.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const dropHebrew = new Set<number>();
  for (let i = 0; i < hebParas.length; i++) {
    if (isHaElHaKadoshTayaInstructionParagraph(hebParas[i])) dropHebrew.add(i);
  }
  const keptHeb = hebParas.filter((_, i) => !dropHebrew.has(i));
  const keptEng = engParas.filter((_, i) => !dropHebrew.has(i));
  const hebrewOut = keptHeb.join('\n\n').replace(/\n\n\n+/g, '\n\n').trim();
  const englishOut = keptEng.join('\n\n').replace(/\n\n\n+/g, '\n\n').trim();
  return { hebrew: hebrewOut, english: englishOut || english };
}

/** Halacha: המלך המשפט vs מלך אוהב צדקה ומשפט (בכל השנה / בעשי"ת, אין מחזירין). */
function isMelechHamishpatAseretInstructionParagraph(para: string): boolean {
  const t = stripNikkud(stripHtml(para)).replace(/\s+/g, ' ').trim();
  const mishpat = /המלך\s*המשפט/.test(t);
  const melechOhev = /מלך\s*אוהב\s*צדקה/.test(t);
  if (!mishpat && !(/מלך\s*אוהב\s*צדקה\s*ומשפט/.test(t) && (/אין\s*מחזירין/.test(t) || /נזכר/.test(t)))) {
    return false;
  }
  return (
    (/בכל\s*השנה/.test(t) && mishpat && (/יצא/.test(t) || /חזור/.test(t))) ||
    (/בעשי/.test(t) && /טעה/.test(t) && melechOhev && mishpat) ||
    (/אין\s*מחזירין/.test(t) && melechOhev && mishpat) ||
    (/נזכר/.test(t) && /תוך\s*כדי/.test(t) && melechOhev && mishpat)
  );
}

/**
 * Remove halacha paragraph about המלך המשפט vs מלך אוהב צדקה ומשפט (year-round vs Aseret).
 */
export function removeMelechHamishpatAseretInstructionParagraph(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  const hebParas = hebrew.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const engParas = english.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const dropHebrew = new Set<number>();
  for (let i = 0; i < hebParas.length; i++) {
    if (isMelechHamishpatAseretInstructionParagraph(hebParas[i])) dropHebrew.add(i);
  }
  const keptHeb = hebParas.filter((_, i) => !dropHebrew.has(i));
  const keptEng = engParas.filter((_, i) => !dropHebrew.has(i));
  const hebrewOut = keptHeb.join('\n\n').replace(/\n\n\n+/g, '\n\n').trim();
  const englishOut = keptEng.join('\n\n').replace(/\n\n\n+/g, '\n\n').trim();
  return { hebrew: hebrewOut, english: englishOut || english };
}

function normAmidahEpiloguePara(p: string): string {
  return stripNikkud(stripHtml(p))
    .replace(/[\u05BE־-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Paragraphs Sefaria appends after weekday Amidah: aveil mizmor 49, Mourner’s Kaddish, minhag note, Tehillim 27. */
function shouldDropAmidahEpilogueParagraph(para: string, date: Date): boolean {
  const n = normAmidahEpiloguePara(para);
  if (!n) return false;
  // Same blob as Kaddish / notes — never drop Aleinu.
  if (/עלינו/.test(n) && /לשבח/.test(n)) return false;
  if (/בבית האבל/.test(n) && (/בוקר|מנחה|תחנון|שיר של יום/.test(n) || /אחר מנחה/.test(n))) {
    return true;
  }
  if (/למנצח/.test(n) && /לבני/.test(n) && /קרח/.test(n)) return true;
  if (/שמעו זאת/.test(n) && (/כל\s*העמים|כלהעמים/.test(n.replace(/־/g, '')) || /ישבי חלד/.test(n))) {
    return true;
  }
  if (/\(?\s*קדיש\s*יתום\s*\)?/.test(para.replace(/[\s\u200E\u200F]+/g, ' ')) && n.length < 120) {
    return true;
  }
  if (/יתגדל/.test(n) && /יתקדש/.test(n) && /שמיה/.test(n)) return true;
  if (/יתברך/.test(n) && /ישתבח/.test(n) && /דאמירן/.test(n)) return true;
  if (/יהא שלמא רבא/.test(n) && /מן שמיא/.test(n)) return true;
  if (/מנהג טוב לומר/.test(n) || (/מנהג/.test(n) && /מזמור לדוד/.test(n))) {
    return true;
  }
  if ((/עשה שלום|עושה שלום/.test(n)) && /במרומיו/.test(n) && /בעשי/.test(stripHtml(para))) {
    return true;
  }
  if (/לדוד/.test(n) && /אורי/.test(n) && /ישעי/.test(n)) {
    return !JewishCalendarService.isLedavidAfterTefillahSeason(date);
  }
  if (
    /מי אירא/.test(n) &&
    /אחת שאלתי/.test(n) &&
    /קוו?ה אל/.test(n) &&
    !/לדוד/.test(n)
  ) {
    return !JewishCalendarService.isLedavidAfterTefillahSeason(date);
  }
  return false;
}

/** When Sefaria repeats עושה שלום במרומיו (Amidah close + Kaddish), drop all but the first. */
function indicesOfDuplicateOsehShalomBemromim(hebParas: string[]): Set<number> {
  const drop = new Set<number>();
  const hits: number[] = [];
  for (let i = 0; i < hebParas.length; i++) {
    const nn = normAmidahEpiloguePara(hebParas[i]);
    if (/עלינו/.test(nn) && /לשבח/.test(nn)) continue;
    if ((/עשה שלום|עושה שלום/.test(nn)) && /במרומיו/.test(nn)) hits.push(i);
  }
  for (let k = 1; k < hits.length; k++) drop.add(hits[k]);
  return drop;
}

function stripInlineKaddishYatomParens(s: string): string {
  return s.replace(/\([^)]*קדיש[^)]*יתום[^)]*\)/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Strip Sefaria’s post-Amidah tail: בבית האבל + Mizmor 49, Kaddish Yatom block, minhag note,
 * Tehillim 27 — except לדוד from Rosh Chodesh Elul through Hoshana Raba (calendar).
 */
export function stripAmidahEpilogueKaddishLedavid(
  hebrew: string,
  english: string,
  date: Date
): { hebrew: string; english: string } {
  const hebParas = hebrew.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const engParas = english.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const drop = new Set<number>();
  for (let i = 0; i < hebParas.length; i++) {
    if (shouldDropAmidahEpilogueParagraph(hebParas[i], date)) drop.add(i);
  }
  indicesOfDuplicateOsehShalomBemromim(hebParas).forEach((i) => drop.add(i));
  const keptHeb = hebParas.filter((_, i) => !drop.has(i));
  const keptEng = engParas.filter((_, i) => !drop.has(i));
  const hebrewOut = keptHeb.map(stripInlineKaddishYatomParens).join('\n\n').replace(/\n\n\n+/g, '\n\n').trim();
  const englishOut = keptEng.join('\n\n').replace(/\n\n\n+/g, '\n\n').trim();
  return { hebrew: hebrewOut, english: englishOut || english };
}

/** Opening / stanzas of full Kaddish (not חצי קדיש); תתקבל distinguishes full from Mourner’s. */
function isFullKaddishBodyParagraph(n: string): boolean {
  if (/יתגדל/.test(n) && /יתקדש/.test(n) && /שמיה/.test(n)) return true;
  if (/יתברך/.test(n) && /ישתבח/.test(n) && /דאמירן/.test(n)) return true;
  if (/תתקבל/.test(n)) return true;
  if (/יהא שלמא רבא/.test(n) && /מן שמיא/.test(n)) return true;
  if ((/עשה שלום|עושה שלום/.test(n)) && /במרומיו/.test(n)) return true;
  return false;
}

function isFullKaddishShalemInstructionParagraph(n: string): boolean {
  if (/חצי/.test(n)) return false;
  const c = n.replace(/["״\u05F4']/g, '');
  if (!/קדיש/.test(c) || !/שלם/.test(c)) return false;
  return (
    /אומר/.test(c) ||
    /השץ|השליח|שליחציבור|השליח ציבור|חזן/.test(c) ||
    c.replace(/\s/g, '').length < 42
  );
}

/**
 * Shacharit “Concluding Prayers”: remove הש\"ץ אומר קדיש שלם and the full Kaddish block before עלינו לשבח.
 */
export function stripFullKaddishShalemBeforeAleinu(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  const hebParas = hebrew.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const engParas = english.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const aleinuIdx = findAleinuParagraphIndex(hebParas);
  if (aleinuIdx <= 0) return { hebrew, english };

  const drop = new Set<number>();
  let i = aleinuIdx - 1;
  while (i >= 0) {
    const n = normAmidahEpiloguePara(hebParas[i]);
    if (isFullKaddishBodyParagraph(n) || isFullKaddishShalemInstructionParagraph(n)) {
      drop.add(i);
      i--;
      continue;
    }
    break;
  }
  const hasFullKaddishMarker = [...drop].some((j) => {
    const n = normAmidahEpiloguePara(hebParas[j]);
    return /תתקבל/.test(n) || isFullKaddishShalemInstructionParagraph(n);
  });
  if (!hasFullKaddishMarker || drop.size === 0) return { hebrew, english };

  const keptHeb = hebParas.filter((_, idx) => !drop.has(idx));
  const keptEng = engParas.filter((_, idx) => !drop.has(idx));
  const hebrewOut = keptHeb.join('\n\n').replace(/\n\n\n+/g, '\n\n').trim();
  const englishOut = keptEng.join('\n\n').replace(/\n\n\n+/g, '\n\n').trim();
  return { hebrew: hebrewOut, english: englishOut || english };
}

/**
 * Refuah (8th blessing): remove Sefaria’s ארוכה…מכותינו clause; keep petition then chatimah
 * (רפאנו… כי תהילתנו אתה, והעלה…, כי אל מלך…, ברוך אתה…ישראל:). Insert רְפוּאָה שְׁלֵמָה לְכָל מַכּוֹתֵינוּ
 * after וְהַעֲלֵה (not after כי תהילתנו אתה).
 */
export function removeRefuahAruchaUmarpeClause(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  let h = stripHtmlKeepLineBreaks(hebrew);
  const nik = '[\\u0591-\\u05C7]*';
  const tag = '(?:<[^>]*>\\s*)*';
  const ws = `(?:${tag}|\\s|־|\\u05BE|-)*`;
  const pe = '(?:פ|ף)';
  const lk = `ל${nik}${ws}כ${nik}ל`;
  /** Nested build: a one-line `${lk}…${lk}…` template can differ from this and fail to match (e.g. רְפָאֵנוּ … וְהַעֲלֵה אֲרוּכָה …). */
  const tripleTachlu = `${lk}${ws}ת${nik}ח${nik}ל${nik}ו${nik}א${nik}י${nik}נ${nik}ו${nik}`;
  const tripleThroughMakoveinu = `${tripleTachlu}${ws}ו${nik}${lk}${ws}מ${nik}כ${nik}א${nik}ו${nik}ב${nik}י${nik}נ${nik}ו${nik}`;
  const triple = `${tripleThroughMakoveinu}${ws}ו${nik}${lk}${ws}מ${nik}כ${nik}ו${nik}ת${nik}י${nik}נ${nik}ו${nik}`;
  const reFull = new RegExp(
    `א${nik}ר${nik}ו${nik}כ${nik}ה${ws}ו${nik}מ${nik}ר${nik}${pe}${nik}א${ws}${triple}`,
    'gu'
  );
  const reArcha = new RegExp(
    `א${nik}ר${nik}כ${nik}ה${ws}ו${nik}מ${nik}ר${nik}${pe}${nik}א${ws}${triple}`,
    'gu'
  );
  const reNoArucha = new RegExp(`ו${nik}מ${nik}ר${nik}${pe}${nik}א${ws}${triple}`, 'gu');
  h = h.replace(reFull, '').replace(reArcha, '').replace(reNoArucha, '');
  h = h.replace(/ {2,}/g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  const refuahShleimaPhrase = 'רְפוּאָה שְׁלֵמָה לְכָל מַכּוֹתֵֽינוּ';
  const refuahShleimaBody = `ר${nik}פ${nik}ו${nik}א${nik}ה${ws}ש${nik}ל${nik}מ${nik}ה${ws}ל${nik}כ${nik}ל${ws}מ${nik}כ${nik}ו${nik}ת${nik}י${nik}נ${nik}ו${nik}`;
  const refuahShleimaPrefix = `ר${nik}פ${nik}ו${nik}א${nik}ה`;
  const refuahAnchorA = `כ${nik}י${nik}${ws}`;
  const refuahAnchorB = `ת${nik}ה${nik}ל${nik}ת${nik}י${nik}נ${nik}ו${nik}`;
  const refuahAnchorC = `${ws}א${nik}ת${nik}ה`;
  /** Strip רפואה שלמה mistakenly placed after “כי תהילתנו אתה” (old rule) when והעלה follows. */
  const reStripMisplacedShleimaAfterTehilateinu = new RegExp(
    `(${refuahAnchorA}${refuahAnchorB}${refuahAnchorC})\\s+${refuahShleimaBody}(?=\\s*ו${nik}ה${nik}ע${nik}ל${nik}ה)`,
    'gu'
  );
  h = h.replace(reStripMisplacedShleimaAfterTehilateinu, '$1');

  const reInsertAfterVehaale = new RegExp(
    `(ו${nik}ה${nik}ע${nik}ל${nik}ה)(?!${ws}${refuahShleimaPrefix})`,
    'gu'
  );
  h = h.replace(reInsertAfterVehaale, `$1 ${refuahShleimaPhrase}`);
  h = h.replace(/ {2,}/g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  return { hebrew: flattenRefuahJoinPoints(h), english };
}

/** Fixed Hebrew for personal מי שבירך after רְפוּאָה שְׁלֵמָה לְכָל מַכּוֹתֵינוּ in רפאנו */
const REFUAH_MI_SHEBEIRACH_PREFIX =
  'יְהִי רָצוֹן מִלְּפָנֶיךָ יְהֹוָה אֱלֹהֵינוּ וֵאלֹהֵי אֲבֹתֵינוּ שֶׁתִּשְׁלַח מְהֵרָה רְפוּאָה שְׁלֵמָה מִן הַשָּׁמַיִם, רְפוּאַת הַנֶּפֶשׁ וּרְפוּאַת הַגּוּף, ';

const REFUAH_MI_SHEBEIRACH_SUFFIX = ' בְּתוֹךְ שְׁאָר חוֹלֵי יִשְׂרָאֵל:';

/** Any space/line-break (incl. exotic Unicode spaces) — never leave a line break before chatimah. */
const REFUAH_ANY_WS = '[\\s\\u00a0\\u1680\\u2000-\\u200b\\u2028\\u2029\\u202f\\u205f\\u3000\\ufeff]+';

/**
 * Force continuous text (single spaces only) at Refuah join points:
 * - …מכותינו [optional mi-shebeirach …בתוך שאר חולי ישראל:] כי אל מלך רופא…
 * Reader treats `\n` as a full line break; remove all of them here.
 */
export function flattenRefuahJoinPoints(hebrew: string): string {
  if (!hebrew) return hebrew;
  const nik = '[\\u0591-\\u05C7]*';
  const letterWs = `(?:${REFUAH_ANY_WS}|־|\\u05BE|-)*`;
  const colon = `\\s*[:׃\\u05C3.]?`;
  const makos = `מ${nik}כ${nik}ו${nik}ת${nik}י${nik}נ${nik}ו${nik}`;
  const betoch =
    `ב${nik}ת${nik}ו${nik}ך${nik}${letterWs}ש${nik}א${nik}ר${nik}${letterWs}ח${nik}ו${nik}ל${nik}י${nik}${letterWs}י${nik}ש${nik}ר${nik}א${nik}ל${nik}`;
  const kiElRofa =
    `כ${nik}י${nik}${letterWs}א${nik}ל${nik}${letterWs}מ${nik}ל${nik}ך${nik}${letterWs}ר${nik}ו${nik}פ${nik}א`;

  // 1) בתוך שאר חולי ישראל:  <--no line break-->  כי אל מלך רופא
  const reBetochToKiEl = new RegExp(`(${betoch})(${colon})${REFUAH_ANY_WS}(${kiElRofa})`, 'gu');
  // 2) מכותינו  <--no line break-->  כי אל… (no personal names)
  const reMakosToKiEl = new RegExp(`(${makos})(${colon})${REFUAH_ANY_WS}(${kiElRofa})`, 'gu');
  // 3) מכותינו  <--no line break-->  יהי רצון… (personal names block)
  const reMakosToYehi = new RegExp(
    `(${makos})(${colon})${REFUAH_ANY_WS}(י${nik}ה${nik}י${nik}${letterWs}ר${nik}צ${nik}ו${nik}ן)`,
    'gu'
  );

  let h = hebrew;
  const joinOneSpace = (_m: string, a: string, col: string | undefined, b: string) =>
    col?.trim() ? `${a}${col.trimEnd()} ${b}` : `${a} ${b}`;
  h = h.replace(reBetochToKiEl, joinOneSpace);
  h = h.replace(reMakosToKiEl, joinOneSpace);
  h = h.replace(reMakosToYehi, joinOneSpace);
  // Flatten any newlines still inside the optional מי שבירך bridge (mishaps / multi-line insert).
  const reBridge = new RegExp(
    `(${makos})(${colon})([\\s\\S]{0,900}?)(${kiElRofa})`,
    'gu'
  );
  h = h.replace(reBridge, (_m, a: string, col: string | undefined, mid: string, b: string) => {
    if (!/[\r\n]/.test(mid)) {
      return col?.trim() ? `${a}${col.trimEnd()}${mid}${b}` : `${a}${mid}${b}`;
    }
    const midFlat = mid.replace(new RegExp(REFUAH_ANY_WS, 'g'), ' ').replace(/ {2,}/g, ' ');
    const left = col?.trim() ? `${a}${col.trimEnd()}` : a;
    return `${left}${midFlat.startsWith(' ') ? '' : ' '}${midFlat.trimEnd()}${midFlat.endsWith(' ') ? '' : ' '}${b}`
      .replace(/ {2,}/g, ' ');
  });
  return h.replace(/ {2,}/g, ' ');
}

export function buildRefuahPersonalNamesClause(names: RefuahPersonalName[]): string | null {
  const parts: string[] = [];
  for (const n of names) {
    const nm = n.nameHebrew?.trim();
    const mo = n.motherNameHebrew?.trim();
    if (!nm || !mo) continue;
    if (n.gender === 'female') {
      parts.push(`לַחוֹלָה ${nm} בַּת ${mo}`);
    } else {
      parts.push(`לַחוֹלֶה ${nm} בֶּן ${mo}`);
    }
  }
  if (!parts.length) return null;
  return parts.join(' וְ');
}

/** Character index in `hebrew` immediately after רפואה שלמה לכל מכותינו, or -1. */
export function findRefuahShleimaMakosInsertIndex(hebrew: string): number {
  const nik = '[\\u0591-\\u05C7]*';
  const re = new RegExp(
    `ר${nik}פ${nik}ו${nik}א${nik}ה${nik}\\s+ש${nik}ל${nik}מ${nik}ה${nik}\\s+ל${nik}כ${nik}ל${nik}\\s+מ${nik}כ${nik}ו${nik}ת${nik}י${nik}נ${nik}ו`,
    'u'
  );
  const m = hebrew.match(re);
  if (!m || m.index === undefined) return -1;
  const idx = m.index + m[0].length;
  const tail = stripNikkud(hebrew.slice(idx, idx + 240));
  if (/יהי רצון מלפניך|יהי רצון מלפני/.test(tail)) return -1;
  return idx;
}

export function buildRefuahMiShebeirachInsertionBlock(names: RefuahPersonalName[]): string | null {
  const clause = buildRefuahPersonalNamesClause(names);
  if (!clause) return null;
  return REFUAH_MI_SHEBEIRACH_PREFIX + clause + REFUAH_MI_SHEBEIRACH_SUFFIX;
}

export function injectRefuahMiShebeirachAfterShleimaMakos(
  hebrew: string,
  names: RefuahPersonalName[]
): string {
  if (!names?.length) return flattenRefuahJoinPoints(hebrew);
  const block = buildRefuahMiShebeirachInsertionBlock(names);
  if (!block) return flattenRefuahJoinPoints(hebrew);
  const idx = findRefuahShleimaMakosInsertIndex(hebrew);
  if (idx < 0) return flattenRefuahJoinPoints(hebrew);
  // Single continuous string — no \n before/after the personal clause.
  const before = hebrew.slice(0, idx).replace(new RegExp(`${REFUAH_ANY_WS}$`, 'u'), '');
  const after = hebrew.slice(idx).replace(new RegExp(`^${REFUAH_ANY_WS}`, 'u'), '');
  return flattenRefuahJoinPoints(`${before} ${block} ${after}`.replace(/ {2,}/g, ' ').trim());
}

export type HebrewInstructionSegment = { text: string; italic: boolean };

function mapStrippedRangeToOriginal(
  full: string,
  startStripped: number,
  endStripped: number
): { startOriginal: number; endOriginal: number } {
  const strippedToOriginal: number[] = [];
  for (let i = 0; i < full.length; i++) {
    if (!/[\u0591-\u05C7]/.test(full[i])) strippedToOriginal.push(i);
  }
  const startOriginal = strippedToOriginal[startStripped] ?? startStripped;
  const endOriginal =
    endStripped > 0 && endStripped <= strippedToOriginal.length
      ? (strippedToOriginal[endStripped - 1] ?? endStripped - 1) + 1
      : full.length;
  return { startOriginal, endOriginal };
}

function normalizeSmallVersePhrase(phrase: string): string {
  return phrase
    .replace(/[\n\r]+/g, ' ')
    .replace(/[ \t\u00a0]+/g, ' ')
    .trim();
}

/**
 * Small/grey first "יהיו לרצון… וגואלי" only (after peace chatima, before Elohai Netzor).
 * The second (closing Elohai Netzor) stays full body size. Non-italic segments only.
 */
function markYehiyuLeratzonParagraphSmall(
  segs: HebrewInstructionSegment[]
): HebrewInstructionSegment[] {
  const stripNikkud = (s: string) => s.replace(/[\u0591-\u05C7]/g, '');
  const out: HebrewInstructionSegment[] = [];
  let markedFirst = false;

  for (const seg of segs) {
    if (markedFirst || seg.italic || !seg.text) {
      out.push(seg);
      continue;
    }

    const full = seg.text;
    const stripped = stripNikkud(full);
    const isLikelyEnglish = !/[\u0590-\u05FF]/.test(stripped.slice(0, Math.min(200, stripped.length)));

    let start = -1;
    let end = -1;

    if (isLikelyEnglish) {
      const re = /May the words of my mouth[\s\S]*?my Redeemer\.?/i;
      const m = re.exec(full);
      if (m) {
        start = m.index;
        end = m.index + m[0].length;
      }
    } else {
      const startStripped = stripped.indexOf('יהיו לרצון');
      if (startStripped !== -1) {
        let endStripped = stripped.indexOf('וגואלי', startStripped);
        if (endStripped !== -1) {
          endStripped += 'וגואלי'.length;
          while (endStripped < stripped.length && /[:׃.\s]/.test(stripped[endStripped])) endStripped++;
          const mapped = mapStrippedRangeToOriginal(full, startStripped, endStripped);
          start = mapped.startOriginal;
          end = mapped.endOriginal;
        }
      }
    }

    if (start < 0 || end < 0) {
      out.push(seg);
      continue;
    }

    markedFirst = true;
    const before = full.slice(0, start).replace(/[\n\r\t\u0020\u00a0]+$/g, '');
    const phrase = normalizeSmallVersePhrase(full.slice(start, end));
    const after = full.slice(end).replace(/^[\n\r\t\u0020\u00a0]+/g, '');
    if (before) out.push({ text: before, italic: false });
    if (phrase) out.push({ text: phrase, italic: true });
    if (after) out.push({ text: after, italic: false });
  }

  return out.length > 0 ? out : segs;
}

/**
 * Small/grey closing "יהי רצון מלפניך… שיבנה בית המקדש… קדמוניות" (after Oseh Shalom).
 */
function markYehiRatzonSheyibanehSmall(
  segs: HebrewInstructionSegment[]
): HebrewInstructionSegment[] {
  const stripNikkud = (s: string) => s.replace(/[\u0591-\u05C7]/g, '');
  const out: HebrewInstructionSegment[] = [];
  let marked = false;

  for (const seg of segs) {
    if (marked || seg.italic || !seg.text) {
      out.push(seg);
      continue;
    }

    const full = seg.text;
    const stripped = stripNikkud(full);
    const isLikelyEnglish = !/[\u0590-\u05FF]/.test(stripped.slice(0, Math.min(200, stripped.length)));

    let start = -1;
    let end = -1;

    if (isLikelyEnglish) {
      // Metsudah / Sefaria: Temple rebuild closing petition after Oseh Shalom.
      const re =
        /May it be Your will[\s\S]*?Holy Temple be rebuilt[\s\S]*?days of old and in earlier years\.?/i;
      const m = re.exec(full);
      if (m) {
        start = m.index;
        end = m.index + m[0].length;
      }
    } else {
      // Prefer the Temple-rebuild formula (not other יהי רצון inserts).
      let startStripped = stripped.indexOf('יהי רצון מלפניך');
      if (startStripped === -1) {
        const loose = stripped.search(/יהי\s+רצון\s+מלפניך/);
        startStripped = loose;
      }
      if (startStripped !== -1) {
        const mikdash = stripped.indexOf('בית המקדש', startStripped);
        if (mikdash !== -1 && mikdash - startStripped < 120) {
          // Full block ends at the last "קדמוניות" of this petition (there are two).
          const firstKad = stripped.indexOf('קדמוניות', mikdash);
          if (firstKad !== -1) {
            let endStripped = firstKad + 'קדמוניות'.length;
            const secondKad = stripped.indexOf('קדמוניות', endStripped);
            if (secondKad !== -1 && secondKad - firstKad < 120) {
              endStripped = secondKad + 'קדמוניות'.length;
            }
            while (endStripped < stripped.length && /[:׃.\s]/.test(stripped[endStripped])) endStripped++;
            const mapped = mapStrippedRangeToOriginal(full, startStripped, endStripped);
            start = mapped.startOriginal;
            end = mapped.endOriginal;
          }
        }
      }
    }

    if (start < 0 || end < 0) {
      out.push(seg);
      continue;
    }

    marked = true;
    const before = full.slice(0, start).replace(/[\n\r\t\u0020\u00a0]+$/g, '');
    const phrase = normalizeSmallVersePhrase(full.slice(start, end));
    const after = full.slice(end).replace(/^[\n\r\t\u0020\u00a0]+/g, '');
    if (before) out.push({ text: before, italic: false });
    if (phrase) out.push({ text: phrase, italic: true });
    if (after) out.push({ text: after, italic: false });
  }

  return out.length > 0 ? out : segs;
}

/**
 * Small/grey Amidah frame verses (same style):
 * - Intro: "כי שם… / אדני שפתי…" before Avot
 * - First "יהיו לרצון… וגואלי" only (not the Elohai Netzor close)
 * - Closing "יהי רצון… שיבנה בית המקדש… קדמוניות"
 * One line each; no extra gap after.
 */
export function markSefataiParagraphSmall(
  segs: HebrewInstructionSegment[]
): HebrewInstructionSegment[] {
  const stripNikkud = (s: string) => s.replace(/[\u0591-\u05C7]/g, '');
  const full = segs.map((s) => s.text).join('');
  const stripped = stripNikkud(full);
  let startStripped: number;
  let endStripped: number;
  const isLikelyEnglish = !/[\u0590-\u05FF]/.test(stripped.slice(0, Math.min(200, stripped.length)));
  let sefataiMarked: HebrewInstructionSegment[];
  if (isLikelyEnglish) {
    startStripped = stripped.search(/Lord,?\s*open\s+my\s+lips|Open\s+my\s+lips/i);
    if (startStripped === -1) startStripped = stripped.search(/When I call out the name/i);
    if (startStripped === -1) {
      sefataiMarked = segs;
    } else {
      const praiseMatch = stripped.slice(startStripped).match(/Your\s+praise\.?/i);
      endStripped = praiseMatch
        ? startStripped + (stripped.slice(startStripped).indexOf(praiseMatch[0]) + praiseMatch[0].length)
        : stripped.length;
      const { startOriginal, endOriginal } = mapStrippedRangeToOriginal(full, startStripped, endStripped);
      const before = full.slice(0, startOriginal);
      const phrase = normalizeSmallVersePhrase(full.slice(startOriginal, endOriginal));
      const after = full.slice(endOriginal).replace(/^[\n\r\t\u0020\u00a0]+/g, '');
      const out: HebrewInstructionSegment[] = [];
      if (before.trim()) out.push({ text: before, italic: false });
      if (phrase) out.push({ text: phrase, italic: true });
      if (after.trim()) out.push({ text: after, italic: false });
      sefataiMarked = out.length > 0 ? out : segs;
    }
  } else {
    const startMarker = 'כי שם';
    const endMarker = 'תהלתך';
    startStripped = stripped.indexOf(startMarker);
    if (startStripped === -1) startStripped = stripped.indexOf('שפתי תפתח');
    if (startStripped === -1) {
      sefataiMarked = segs;
    } else {
      endStripped = stripped.indexOf(endMarker, startStripped);
      if (endStripped === -1) {
        sefataiMarked = segs;
      } else {
        endStripped += endMarker.length;
        while (endStripped < stripped.length && /[:\s\u0591-\u05C7]/.test(stripped[endStripped])) endStripped++;
        const { startOriginal, endOriginal } = mapStrippedRangeToOriginal(full, startStripped, endStripped);
        const before = full.slice(0, startOriginal);
        const phrase = normalizeSmallVersePhrase(full.slice(startOriginal, endOriginal));
        const after = full.slice(endOriginal).replace(/^[\n\r\t\u0020\u00a0]+/g, '');
        const out: HebrewInstructionSegment[] = [];
        if (before.trim()) out.push({ text: before, italic: false });
        if (phrase) out.push({ text: phrase, italic: true });
        if (after.trim()) out.push({ text: after, italic: false });
        sefataiMarked = out.length > 0 ? out : segs;
      }
    }
  }
  return markYehiRatzonSheyibanehSmall(markYehiyuLeratzonParagraphSmall(sefataiMarked));
}

/**
 * Same insertion as {@link injectRefuahMiShebeirachAfterShleimaMakos}, preserving segment boundaries when
 * `segments` concatenation matches `hebrew`.
 */
export function injectRefuahMiShebeirachIntoHebrewSegments(
  hebrew: string,
  segments: HebrewInstructionSegment[] | undefined,
  names: RefuahPersonalName[]
): { hebrew: string; segments: HebrewInstructionSegment[] | undefined } {
  const newHebrew = injectRefuahMiShebeirachAfterShleimaMakos(hebrew, names);
  if (newHebrew === hebrew) return { hebrew, segments };
  if (!segments?.length) return { hebrew: newHebrew, segments: undefined };
  const joined = segments.map((s) => s.text).join('');
  if (joined !== hebrew) return { hebrew: newHebrew, segments: undefined };
  const block = buildRefuahMiShebeirachInsertionBlock(names);
  if (!block) return { hebrew, segments };
  const idx = findRefuahShleimaMakosInsertIndex(hebrew);
  if (idx < 0) return { hebrew: newHebrew, segments: undefined };
  const insertion = ` ${block} `;
  let pos = 0;
  const out = segments.map((s) => ({ ...s }));
  const finish = (segs: HebrewInstructionSegment[]) => {
    const mapped = segs.map((s) => ({ ...s, text: flattenRefuahJoinPoints(s.text) }));
    const flat = flattenRefuahJoinPoints(mapped.map((s) => s.text).join(''));
    // If flatten only needed cross-segment join, re-sync one segment that held the insert:
    if (flat !== mapped.map((s) => s.text).join('')) {
      return { hebrew: flat, segments: [{ text: flat, italic: false }] };
    }
    return { hebrew: flat, segments: mapped };
  };
  for (let i = 0; i < out.length; i++) {
    const len = out[i].text.length;
    const end = pos + len;
    if (idx < end) {
      const local = idx - pos;
      const left = out[i].text.slice(0, local).replace(new RegExp(`${REFUAH_ANY_WS}$`, 'u'), '');
      const right = out[i].text.slice(local).replace(new RegExp(`^${REFUAH_ANY_WS}`, 'u'), '');
      out[i] = { ...out[i], text: `${left}${insertion}${right}`.replace(/ {2,}/g, ' ') };
      return finish(out);
    }
    if (idx === end && i < out.length - 1) {
      const next = out[i + 1];
      out[i] = { ...out[i], text: out[i].text.replace(new RegExp(`${REFUAH_ANY_WS}$`, 'u'), '') };
      out[i + 1] = {
        ...next,
        text: `${insertion}${next.text.replace(new RegExp(`^${REFUAH_ANY_WS}`, 'u'), '')}`.replace(
          / {2,}/g,
          ' '
        ),
      };
      return finish(out);
    }
    if (idx === end && i === out.length - 1) {
      out[i] = {
        ...out[i],
        text: `${out[i].text.replace(new RegExp(`${REFUAH_ANY_WS}$`, 'u'), '')}${insertion}`.replace(
          / {2,}/g,
          ' '
        ),
      };
      return finish(out);
    }
    pos = end;
  }
  return { hebrew: newHebrew, segments: undefined };
}

export function injectRefuahIntoAmidahPrayerTextData<T extends {
  hebrew: string;
  hebrewSegments?: HebrewInstructionSegment[];
  hebrewBeforeKedushaFoldout?: string;
  hebrewBeforeKedushaFoldoutSegments?: HebrewInstructionSegment[];
  hebrewBeforeModimDerabananFoldout?: string;
  hebrewBeforeModimDerabananFoldoutSegments?: HebrewInstructionSegment[];
}>(data: T, names: RefuahPersonalName[]): T {
  if (!names?.length) return data;
  let next: T = { ...data };
  let changed = false;
  const main = injectRefuahMiShebeirachIntoHebrewSegments(next.hebrew, next.hebrewSegments, names);
  if (main.hebrew !== next.hebrew) {
    changed = true;
    next = { ...next, hebrew: main.hebrew, hebrewSegments: main.segments };
  }
  if (next.hebrewBeforeKedushaFoldout) {
    const pre = injectRefuahMiShebeirachIntoHebrewSegments(
      next.hebrewBeforeKedushaFoldout,
      next.hebrewBeforeKedushaFoldoutSegments,
      names
    );
    if (pre.hebrew !== next.hebrewBeforeKedushaFoldout) {
      changed = true;
      next = {
        ...next,
        hebrewBeforeKedushaFoldout: pre.hebrew,
        hebrewBeforeKedushaFoldoutSegments: pre.segments,
      };
    }
  }
  // After kedusha/modim foldouts, רפאנו lives in the modim prefix (not main suffix).
  if (next.hebrewBeforeModimDerabananFoldout) {
    const preMod = injectRefuahMiShebeirachIntoHebrewSegments(
      next.hebrewBeforeModimDerabananFoldout,
      next.hebrewBeforeModimDerabananFoldoutSegments,
      names
    );
    if (preMod.hebrew !== next.hebrewBeforeModimDerabananFoldout) {
      changed = true;
      next = {
        ...next,
        hebrewBeforeModimDerabananFoldout: preMod.hebrew,
        hebrewBeforeModimDerabananFoldoutSegments: preMod.segments,
      };
    }
  }
  return changed ? next : data;
}

export type AmidahKedushaFoldoutSplit = {
  mainHebrew: string;
  mainEnglish: string;
  kedushaHebrew: string | null;
  kedushaEnglish: string | null;
  /** When set, reader shows prefix → kedusha foldout → suffix (mainHebrew is suffix only). */
  mainHebrewBeforeFoldout?: string;
  mainEnglishBeforeFoldout?: string;
};

/**
 * After removing the Chazaras Kedushah block, split main text so the foldout sits after גבורות
 * (through מחיה המתים) and before the next bracha ("אתה קדוש…" or, if that was folded out, "אתה חונן…").
 * Uses nikkud-stripped search + index map so vocalization does not break the split.
 */
function splitAmidahMainAroundKedushaFoldoutSlot(
  mainHebrew: string,
  mainEnglish: string
): {
  prefixHebrew: string;
  suffixHebrew: string;
  prefixEnglish: string;
  suffixEnglish: string;
} | null {
  const hNo = mainHebrew;
  let stripped = '';
  const toOrig: number[] = [];
  for (let i = 0; i < hNo.length; i++) {
    if (/[\u0591-\u05C7]/.test(hNo[i])) continue;
    if (hNo[i] === '\u200c' || hNo[i] === '\u200d') continue;
    stripped += stripNikkud(hNo[i]);
    toOrig.push(i);
  }
  if (stripped.length === 0 || stripped.length !== toOrig.length) return null;

  // Suffix starts at Kedushat Hashem (silent) when present; else first middle petition after kedusha.
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
  let m: RegExpExecArray | null;
  chatimaRe.lastIndex = 0;
  while ((m = chatimaRe.exec(beforeKed)) !== null) {
    bestEndS = m.index + m[0].length;
  }
  if (bestEndS < 0) {
    const loose = /מחיה המתים\s*[:׃]?/g;
    loose.lastIndex = 0;
    while ((m = loose.exec(beforeKed)) !== null) {
      bestEndS = m.index + m[0].length;
    }
  }
  if (bestEndS < 0 || bestEndS > kedSt) return null;

  const endOrig = bestEndS < toOrig.length ? toOrig[bestEndS] : hNo.length;
  const kedOrig = toOrig[kedSt];
  if (kedOrig === undefined || kedOrig < endOrig) return null;

  const prefixHebrew = hNo.slice(0, endOrig).trimEnd();
  const suffixHebrew = hNo.slice(kedOrig).trimStart();
  if (!prefixHebrew || !suffixHebrew) return null;

  const en = mainEnglish ?? '';
  let prefixEnglish = '';
  let suffixEnglish = '';
  if (en.trim()) {
    let idxSuffix = en.search(/\bYou are holy\b/i);
    if (idxSuffix === -1) idxSuffix = en.search(/\bYou favor man\b/i);
    if (idxSuffix === -1) idxSuffix = en.search(/\bYou grant\b[\s\S]{0,40}\bknowledge\b/i);
    if (idxSuffix !== -1) {
      const sub = en.slice(0, idxSuffix);
      const blessedDeadRe = /Blessed are You[\s\S]{0,1600}?\bdead\b[\s.:]*/gi;
      let lastEnd = -1;
      blessedDeadRe.lastIndex = 0;
      while ((m = blessedDeadRe.exec(sub)) !== null) {
        lastEnd = m.index + m[0].length;
      }
      if (lastEnd !== -1 && lastEnd <= idxSuffix) {
        prefixEnglish = en.slice(0, lastEnd).trimEnd();
        suffixEnglish = en.slice(idxSuffix).trimStart();
      }
    }
    if (!suffixEnglish) {
      const totalH = Math.max(1, hNo.length);
      const i0 = Math.max(0, Math.floor((en.length * endOrig) / totalH));
      const i1 = Math.min(en.length, Math.ceil((en.length * kedOrig) / totalH));
      prefixEnglish = en.slice(0, i0).trimEnd();
      suffixEnglish = en.slice(i1).trimStart();
    }
  }

  return { prefixHebrew, suffixHebrew, prefixEnglish, suffixEnglish };
}

/** Stripped indices: chazaras open (נקדישך / thrice-holy / בחזרת…קדושה). */
function findStrippedAmidahKedushaFoldoutStart(stripped: string): number {
  /** Walk up a short window for instruction / open / stacked קהל labels. */
  const backToInstruction = (from: number): number => {
    const windowStart = Math.max(0, from - 280);
    const win = stripped.slice(windowStart, from);
    const candidates: number[] = [];
    const bch = win.search(/בחזרת[\s\S]{0,100}?קדושה/);
    if (bch !== -1) candidates.push(windowStart + bch);
    for (const open of ['נקדישך', 'נעריצך', 'נקדש'] as const) {
      const i = win.indexOf(open);
      if (i !== -1) candidates.push(windowStart + i);
    }
    const labels = /(?:קהל\s+וחזן|קהל\s+ו?חזן|שליח\s+ציבור)\s*[:׃]?/g;
    let lm: RegExpExecArray | null;
    while ((lm = labels.exec(win)) !== null) {
      candidates.push(windowStart + lm.index);
    }
    if (candidates.length) return Math.min(...candidates);
    return from;
  };

  // Sfard: נקדישך / נעריצך. Ashkenaz weekday often opens נקדש את שמך (not נקדישך).
  for (const open of ['נקדישך', 'נעריצך', 'נקדש'] as const) {
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

/** End exclusive of foldout on stripped text: לדור chatima when present, else through הללויה. */
function findStrippedAmidahKedushaFoldoutEnd(stripped: string, startS: number): number {
  // Ashkenaz: full לדור ודור … האל/המלך הקדוש (prefer over earlier defective לדר in ימלך).
  // Cap window so Modim's "אתה הוא לדור ודור" cannot swallow the rest of the Amidah.
  const KEDUSHA_LEDOR_MAX_FROM_START = 2800;
  const fullLed = stripped.indexOf('לדור ודור', startS);
  if (fullLed !== -1 && fullLed - startS < KEDUSHA_LEDOR_MAX_FROM_START) {
    const slice = stripped.slice(fullLed, Math.min(stripped.length, fullLed + 750));
    let endRel = -1;
    const chatima = /(?:האל|המלך)\s*הקדוש/g;
    let cm: RegExpExecArray | null;
    while ((cm = chatima.exec(slice)) !== null) {
      endRel = cm.index + cm[0].length;
    }
    if (endRel !== -1) {
      let endS = fullLed + endRel;
      while (endS < stripped.length && /[:׃\s.\u05be־;]/.test(stripped[endS])) endS++;
      return endS;
    }
  }

  // Sfard weekday: thrice often ends at ימלך … לדר ודר: הללויה (no separate לדור).
  const defLed = stripped.indexOf('לדר ודר', startS);
  if (defLed !== -1) {
    const nearHl = stripped.indexOf('הללויה', defLed);
    if (nearHl !== -1 && nearHl - defLed < 40) {
      const after = stripped.slice(nearHl, nearHl + 220);
      if (!/לדור\s+ודור/.test(after)) {
        let endS = nearHl + 'הללויה'.length;
        while (endS < stripped.length && /[:׃\s.\u05be־;]/.test(stripped[endS])) endS++;
        return endS;
      }
    }
  }

  const hl = 'הללויה';
  const hIdx = stripped.indexOf(hl, startS);
  if (hIdx === -1) return -1;
  let endS = hIdx + hl.length;
  while (endS < stripped.length && /[:׃\s.\u05be־;]/.test(stripped[endS])) endS++;
  // Metsudah: שליח ציבור / לדור after early הללויה
  const after = stripped.slice(endS, Math.min(stripped.length, endS + 400));
  if (/שליח\s+ציבור|לדור/.test(after) && !/אתה\s+קדוש/.test(after.slice(0, 60))) {
    const iLed2 = stripped.indexOf('לדור ודור', endS);
    if (iLed2 !== -1 && iLed2 - endS < 80) {
      const slice = stripped.slice(iLed2, Math.min(stripped.length, iLed2 + 750));
      let endRel = -1;
      const chatima = /(?:האל|המלך)\s*הקדוש/g;
      let cm: RegExpExecArray | null;
      while ((cm = chatima.exec(slice)) !== null) {
        endRel = cm.index + cm[0].length;
      }
      if (endRel !== -1) {
        let e = iLed2 + endRel;
        while (e < stripped.length && /[:׃\s.\u05be־;]/.test(stripped[e])) e++;
        return e;
      }
    }
    const iChonen = stripped.indexOf('אתה חונן', endS);
    if (iChonen !== -1 && iChonen - endS < 500) return iChonen;
  }
  return endS;
}

/** Drop lone chazaras instruction line left between Gevuros and Kedushat Hashem. */
function stripLeftoverChazarasKedushaInstruction(hebrew: string): string {
  const nik = '[\u0591-\u05C7]*';
  const re = new RegExp(
    '(?:^|\\n)\\s*ב' +
      nik +
      'ח' +
      nik +
      'ז' +
      nik +
      'ר' +
      nik +
      'ת' +
      nik +
      '[\\s\\S]{0,120}?ק' +
      nik +
      'ד' +
      nik +
      'ו' +
      nik +
      'ש' +
      nik +
      'ה' +
      nik +
      '\\s*[:׃]?\\s*(?=\\n|$)',
    'gmu'
  );
  return hebrew
    .replace(re, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Split Chazaras ha-shatz Kedushah from the main Amidah into a collapsible "קדושה" section.
 * Metsudah packs silent אתה קדוש before congregational קדוש×3 — fold out only the chazaras
 * responses through לדור ודור (not silent Kedushat Hashem), so the dropdown can sit after גבורות.
 */
export function extractAmidahKedushaFoldout(hebrew: string, english: string): AmidahKedushaFoldoutSplit {
  const hNo = stripHtml(hebrew).replace(/<br\s*\/?>/gi, '\n');
  const stripped = stripNikkud(hNo);
  const toOrig: number[] = [];
  for (let i = 0; i < hNo.length; i++) {
    if (!/[\u0591-\u05C7]/.test(hNo[i])) toOrig.push(i);
  }
  if (toOrig.length === 0) {
    return { mainHebrew: hebrew, mainEnglish: english, kedushaHebrew: null, kedushaEnglish: null };
  }

  const startS = findStrippedAmidahKedushaFoldoutStart(stripped);
  if (startS === -1) {
    return { mainHebrew: hebrew, mainEnglish: english, kedushaHebrew: null, kedushaEnglish: null };
  }
  const endS = findStrippedAmidahKedushaFoldoutEnd(stripped, startS);
  if (endS === -1 || endS <= startS) {
    return { mainHebrew: hebrew, mainEnglish: english, kedushaHebrew: null, kedushaEnglish: null };
  }

  const startOrig = startS < toOrig.length ? toOrig[startS] : 0;
  const endOrigExcl = endS < toOrig.length ? toOrig[endS] : hNo.length;

  const kedHeb = hNo.slice(startOrig, endOrigExcl).trim();
  let mainHeb = (hNo.slice(0, startOrig).trimEnd() + '\n\n' + hNo.slice(endOrigExcl).trimStart())
    .replace(/\n\n\n+/g, '\n\n')
    .trim();
  mainHeb = stripLeftoverChazarasKedushaInstruction(mainHeb);

  const splitEnglish = (): { main: string; ked: string | null } => {
    const en = english ?? '';
    if (!en.trim()) return { main: en, ked: null };
    const low = en.toLowerCase();
    const heads = [
      'during the repetition',
      'in the repetition',
      'at the repetition',
      "in the chazzan's repetition",
      "in the chazan's repetition",
      "during the chazzan's repetition",
      "leader's repetition",
      'the congregation says and the chazzan',
      'congregation says and chazzan',
    ];
    let es = -1;
    for (const h of heads) {
      const i = low.indexOf(h);
      if (i !== -1 && (es === -1 || i < es)) es = i;
    }
    let ee = -1;
    if (es !== -1) {
      const fromGeneration = low.indexOf('from generation to generation', es);
      if (fromGeneration !== -1) {
        const blessed = low.indexOf('blessed are you', fromGeneration);
        if (blessed !== -1) {
          const holyOne = low.indexOf('holy one', blessed);
          if (holyOne !== -1 && holyOne - blessed < 120) {
            ee = holyOne + 'holy one'.length;
            while (ee < en.length && /[\s.:;!—\-'"’]/.test(en[ee])) ee++;
          }
        }
      }
      if (ee === -1) {
        const hi = low.indexOf('hallelujah', es);
        if (hi !== -1) {
          ee = hi + 'hallelujah'.length;
          while (ee < en.length && /[\s.:;!—\-'"’]/.test(en[ee])) ee++;
        }
      }
    }
    if (es !== -1 && ee !== -1 && ee > es) {
      return {
        main: (en.slice(0, es).trimEnd() + '\n\n' + en.slice(ee).trimStart()).replace(/\n\n\n+/g, '\n\n').trim(),
        ked: en.slice(es, ee).trim(),
      };
    }
    const sl = Math.max(1, stripped.length);
    const i0 = Math.floor((en.length * startS) / sl);
    const i1 = Math.min(en.length, Math.ceil((en.length * endS) / sl));
    if (i1 > i0 + 30) {
      return {
        main: (en.slice(0, i0).trimEnd() + '\n\n' + en.slice(i1).trimStart()).replace(/\n\n\n+/g, '\n\n').trim(),
        ked: en.slice(i0, i1).trim(),
      };
    }
    return { main: en, ked: null };
  };

  const { main: mainEn, ked: kedEn } = splitEnglish();

  let outMainHe = mainHeb;
  let outMainEn = mainEn;
  let mainHebrewBeforeFoldout: string | undefined;
  let mainEnglishBeforeFoldout: string | undefined;
  if (kedHeb.length > 0) {
    const slot = splitAmidahMainAroundKedushaFoldoutSlot(mainHeb, mainEn);
    if (slot) {
      mainHebrewBeforeFoldout = slot.prefixHebrew;
      mainEnglishBeforeFoldout = slot.prefixEnglish;
      outMainHe = slot.suffixHebrew;
      outMainEn = slot.suffixEnglish;
    }
  }

  return {
    mainHebrew: outMainHe,
    mainEnglish: outMainEn,
    mainHebrewBeforeFoldout,
    mainEnglishBeforeFoldout,
    kedushaHebrew: kedHeb.length > 0 ? kedHeb : null,
    kedushaEnglish: kedEn && kedEn.length > 0 ? kedEn : null,
  };
}


/** Modim deRabbanan (מודים אנחנו לך … ברוך אל ההודאות) split out for a collapsible row in the reader. */
export type ModimDerabananFoldoutSplit = {
  prefixHebrew: string;
  prefixEnglish: string;
  suffixHebrew: string;
  suffixEnglish: string;
  foldoutHebrew: string | null;
  foldoutEnglish: string | null;
};

/**
 * Extract Modim deRabbanan only: amidah has two blocks opening "מודים אנחנו לך" (chazzan Modim, then Modim deRabbanan).
 * We anchor on the closing "ברוך אל ההודאות" and take the *last* "מודים אנחנו לך" before it — the paragraph that
 * includes "אלוהי כל בשר" / "אלהי כל בשר", not the longer first Modim (לעולם ועד … קוינו לך).
 */
export function extractModimDerabananFoldout(hebrew: string, english: string): ModimDerabananFoldoutSplit {
  const empty = {
    prefixHebrew: '',
    prefixEnglish: '',
    suffixHebrew: hebrew,
    suffixEnglish: english,
    foldoutHebrew: null,
    foldoutEnglish: null,
  };
  const hNo = stripHtml(hebrew).replace(/<br\s*\/?>/gi, '\n');
  const stripped = stripNikkud(hNo);
  const toOrig: number[] = [];
  for (let i = 0; i < hNo.length; i++) {
    if (!/[\u0591-\u05C7]/.test(hNo[i])) toOrig.push(i);
  }
  if (toOrig.length === 0) return empty;

  const endRe = /ברוך\s+אל\s+ההודאות\s*[:׃]?/g;
  let endMatch: RegExpMatchArray | null = null;
  let m: RegExpExecArray | null;
  while ((m = endRe.exec(stripped)) !== null) {
    endMatch = m;
  }
  if (!endMatch || endMatch.index === undefined) return empty;
  const endS = endMatch.index + endMatch[0].length;

  const startPhrase = /מודים\s+אנחנו\s+לך/g;
  let startS = -1;
  let sm: RegExpExecArray | null;
  const region = stripped.slice(0, endS);
  while ((sm = startPhrase.exec(region)) !== null) {
    startS = sm.index;
  }
  if (startS < 0) return empty;

  const blockStripped = stripped.slice(startS, endS);
  /** Modim deRabbanan names God "אלהי כל בשר"; the first Modim (through קוינו לך) does not. */
  if (!/אלהי\s+כל\s+בשר/.test(blockStripped)) return empty;

  const startOrig = startS < toOrig.length ? toOrig[startS] : 0;
  const endOrigExcl = endS < toOrig.length ? toOrig[endS] : hNo.length;
  const foldHeb = hNo.slice(startOrig, endOrigExcl).trim();
  if (foldHeb.length < 60) return empty;

  const prefixHeb = hNo.slice(0, startOrig).trimEnd();
  const suffixHeb = hNo.slice(endOrigExcl).trimStart();

  const en = english ?? '';
  let prefixEn = '';
  let foldEn: string | null = null;
  let suffixEn = en;
  if (en.trim()) {
    const sl = Math.max(1, stripped.length);
    const i0 = Math.max(0, Math.floor((en.length * startS) / sl));
    const i1 = Math.min(en.length, Math.ceil((en.length * endS) / sl));
    if (i1 > i0 + 10) {
      prefixEn = en.slice(0, i0).trimEnd();
      foldEn = en.slice(i0, i1).trim();
      suffixEn = en.slice(i1).trimStart();
    }
  }

  return {
    prefixHebrew: prefixHeb,
    prefixEnglish: prefixEn,
    suffixHebrew: suffixHeb,
    suffixEnglish: suffixEn,
    foldoutHebrew: foldHeb,
    foldoutEnglish: foldEn && foldEn.length > 0 ? foldEn : null,
  };
}

/** After main Birchot HaShachar: optional long Zichronos / Va’ani block before “לְעוֹלָם יְהֵא אָדָם יְרֵא שָׁמַיִם” (collapsible in reader). */
export type BirchosHashacharExpansionSplit = {
  beforeHebrew: string;
  beforeEnglish: string;
  foldoutHebrew: string;
  foldoutEnglish: string;
  mainHebrew: string;
  mainEnglish: string;
};

/**
 * Split Sefaria **Birkot HaShachar** so the optional block beginning at
 * אֱלֹהֵינוּ/אֱלֹקֵינוּ/אֱלוֹהֵינוּ וֵאלֹהֵי אֲבוֹתֵינוּ זָכְרֵנוּ is placed in a foldout.
 * The foldout runs from that start marker through the **end of section**.
 */
export function extractBirchosHashacharExpansionFoldout(
  hebrew: string,
  english: string
): BirchosHashacharExpansionSplit | null {
  /** Strip bidi / ZWJ / WJ so Sefaria RLM/LRM does not break fixed-string regexes. */
  const stripBidiEtc = (s: string) => s.replace(/[\u200E\u200F\u202A-\u202E\u2060\u200C-\u200D]/g, '');
  const hNo = stripBidiEtc(stripHtml(hebrew).replace(/<br\s*\/?>/gi, '\n'));
  const stripped = stripNikkud(hNo);
  const toOrig: number[] = [];
  for (let i = 0; i < hNo.length; i++) {
    if (!/[\u0591-\u05C7]/.test(hNo[i])) toOrig.push(i);
  }
  if (toOrig.length === 0) return null;

  const gap = '[\\s\\r\\n\u05be־\u00a0\u200c-\u200f]*';
  const startRe = new RegExp(
    `(?:אלהינו|אלוקינו|אלוהינו)${gap}(?:ואלקי|ואלהי)${gap}אבותינו${gap}זכרנו`
  );
  const startMatch = stripped.match(startRe);
  if (!startMatch || startMatch.index === undefined) return null;
  const startS = startMatch.index;

  const startOrig = startS < toOrig.length ? toOrig[startS] : 0;
  const beforeHebrew = hNo.slice(0, startOrig).trimEnd();
  const foldoutHebrew = hNo.slice(startOrig).trim();
  const mainHebrew = '';
  if (foldoutHebrew.length < 120) return null;

  const en = english ?? '';
  const sl = Math.max(1, stripped.length);
  let beforeEnglish = '';
  let foldoutEnglish = '';
  let mainEnglish = '';
  if (en.trim()) {
    const i0 = Math.max(0, Math.floor((en.length * startS) / sl));
    beforeEnglish = en.slice(0, i0).trimEnd();
    foldoutEnglish = en.slice(i0).trimStart();
  }

  return {
    beforeHebrew,
    beforeEnglish,
    foldoutHebrew,
    foldoutEnglish,
    mainHebrew,
    mainEnglish,
  };
}

/**
 * Collapse line/paragraph break between "למען שמו באהבה" (optional :) and "מלך עוזר" (Avos → Gevuros) into one line.
 * Sefaria often omits the colon and uses only a newline; the old pattern required `:` and never matched.
 */
export function collapseLmaanShmoToMelechOzerBreak(hebrew: string, english: string): { hebrew: string; english: string } {
  const nik = '[\\u0591-\\u05C7]*';
  const tag = '(?:<[^>]*>\\s*)*';
  const br = '(?:\\s|\\r?\\n|<br\\s*\\/?>)+';
  const hebRe = new RegExp(
    `(ל${nik}מ${nik}ע${nik}ן${nik}\\s+ש${nik}מ${nik}ו${nik}\\s+ב${nik}א${nik}ה${nik}ב${nik}ה)(\\s*[:׃])?${tag}\\s*${br}\\s*${tag}(מ${nik}ל${nik}ך${nik}\\s+ע${nik}ו${nik}ז${nik}ר)`,
    'gu'
  );
  const hebOut = hebrew.replace(hebRe, (_m, g1: string, g2: string | undefined, g3: string) =>
    g2?.trim() ? `${g1.trimEnd()}${g2.trimEnd()} ${g3}` : `${g1.trimEnd()} ${g3}`
  );
  const engOut = english.replace(
    /\b(in\s+love|with\s+love|for\s+His\s+Name[^:]{0,40})(\s*[:׃])?\s*(?:\s|\r?\n|<br\s*\/?>)+\s*(King,?\s+Helper|O\s+King)/gi,
    (_m, a: string, b: string | undefined, c: string) => (b?.trim() ? `${a.trimEnd()}${b.trimEnd()} ${c}` : `${a.trimEnd()} ${c}`)
  );
  return { hebrew: hebOut, english: engOut || english };
}

/**
 * Collapse line/paragraph break between "כי אל מלך גדול וקדוש אתה:" and "ברוך אתה … האל הקדוש"
 * (end of Kedusha / start of third blessing closing in Amidah).
 */
export function collapseKiElMelechKadoshAtahToBarchuHaElHaKadoshBreak(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  const nik = '[\\u0591-\\u05C7]*';
  const tag = '(?:<[^>]*>\\s*)*';
  const br = '(?:\\s|\\n|<br\\s*\\/?>)+';
  const hebRe = new RegExp(
    `(כ${nik}י${nik}\\s+א${nik}ל${nik}\\s+מ${nik}ל${nik}ך${nik}\\s+ג${nik}ד${nik}ו${nik}ל${nik}\\s+ו${nik}ק${nik}ד${nik}ו${nik}ש${nik}\\s+א${nik}ת${nik}ה)\\s*[:׃]${tag}\\s*${br}\\s*${tag}(ב${nik}ר${nik}ו${nik}ך${nik}\\s+א${nik}ת${nik}ה${nik}\\s+י${nik}ה${nik}ו${nik}ה${nik}\\s+ה${nik}א${nik}ל${nik}\\s+ה${nik}ק${nik}ד${nik}ו${nik}ש${nik})`,
    'giu'
  );
  const hebOut = hebrew.replace(hebRe, '$1: $2');
  const engOut = english.replace(
    /(great\s+and\s+holy)\s*:\s*(?:\s|\n|<br\s*\/?>)+(\s*Blessed\s+are\s+You)/gi,
    (_m, a: string, b: string) => `${a}: ${b.trimStart()}`
  );
  return { hebrew: hebOut, english: engOut || english };
}

/**
 * Collapse line/paragraph break between "וּמַצְמִיחַ יְשׁוּעָה" (end of Geulah) and
 * "וְנֶאֱמָן אַתָּה לְהַחֲיוֹת מֵתִים" (start of Mechayei ha-meisim) — Sefaria often splits here.
 */
export function collapseUmatzmichYesuahToNeemanLehachayotMetimBreak(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  const nik = '[\\u0591-\\u05C7]*';
  const tag = '(?:<[^>]*>\\s*)*';
  const br = '(?:\\s|\\r?\\n|<br\\s*\\/?>)+';
  const hebRe = new RegExp(
    `(ו${nik}מ${nik}צ${nik}מ${nik}י${nik}ח${nik}\\s+(?:ק${nik}ר${nik}ן${nik}\\s+)?י${nik}ש${nik}ו${nik}ע${nik}ה)${tag}\\s*${br}\\s*${tag}(ו${nik}נ${nik}א${nik}מ${nik}ן${nik}\\s+א${nik}ת${nik}ה${nik}\\s+ל${nik}ה${nik}ח${nik}י${nik}ו${nik}ת${nik}\\s+מ${nik}ת${nik}י${nik}ם)`,
    'gu'
  );
  const hebOut = hebrew.replace(hebRe, '$1 $2');
  const engBr = '(?:\\s|\\r?\\n|<br\\s*\\/?>)+';
  const engRe = new RegExp(
    `(\\b(?:and\\s+)?(?:who\\s+)?(?:causes?\\s+)?salvation\\s+to\\s+sprout(?:\\s+forth)?\\b)${engBr}\\s*(\\b(?:You\\s+are\\s+faithful|Faithful\\s+are\\s+You)\\s+to\\s+(?:revive|resurrect|give\\s+life\\s+to)\\s+the\\s+dead\\b)`,
    'giu'
  );
  const engOut = english.replace(engRe, '$1 $2');
  return { hebrew: hebOut, english: engOut || english };
}

/**
 * Collapse paragraph break before Din chatima.
 * Covers Sefaria “…ובצדק ובמשפט” and Ashkenaz “…וברחמים וצדקנו במשפט”.
 */
export function collapseRachamimTzedekMishpatToBarchuMelechOhevBreak(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  const nik = '[\\u0591-\\u05C7]*';
  const tag = '(?:<[^>]*>\\s*)*';
  const br = '(?:\\s|\\r?\\n|<br\\s*\\/?>)+';
  // either “וצדקנו בצדק ובמשפט” or “וברחמים וצדקנו במשפט” (this pack)
  const bodyEnd =
    `(?:` +
    `ו${nik}ב${nik}ר${nik}ח${nik}מ${nik}י${nik}ם${nik}\\s+ו${nik}צ${nik}ד${nik}ק${nik}נ${nik}ו${nik}\\s+ב${nik}מ${nik}ש${nik}פ${nik}ט` +
    `|` +
    `ו${nik}צ${nik}ד${nik}ק${nik}נ${nik}ו${nik}\\s+ב${nik}צ${nik}ד${nik}ק${nik}\\s+ו${nik}ב${nik}מ${nik}ש${nik}פ${nik}ט` +
    `|` +
    `ו${nik}ב${nik}ר${nik}ח${nik}מ${nik}י${nik}ם${nik}\\s+ו${nik}צ${nik}ד${nik}ק${nik}נ${nik}ו${nik}\\s+ב${nik}צ${nik}ד${nik}ק${nik}\\s+ו${nik}ב${nik}מ${nik}ש${nik}פ${nik}ט` +
    `)`;
  const chatima =
    `ב${nik}ר${nik}ו${nik}ך${nik}\\s+א${nik}ת${nik}ה${nik}\\s+י${nik}ה${nik}ו${nik}ה${nik}\\s+מ${nik}ל${nik}ך${nik}\\s+א${nik}ה${nik}ב`;
  const hebRe = new RegExp(
    `(${bodyEnd})(\\s*[:׃])?${tag}\\s*${br}\\s*${tag}(${chatima})`,
    'gu'
  );
  const hebOut = hebrew.replace(hebRe, (_m, g1: string, g2: string | undefined, g3: string) =>
    g2?.trim() ? `${g1.trimEnd()}${g2.trimEnd()} ${g3}` : `${g1.trimEnd()}: ${g3}`
  );
  return { hebrew: hebOut, english: english };
}

/**
 * Collapse extra line/paragraph break between בונה ירושלים chatima and מְהֵרָה לְתוֹכָהּ תָכִין (or the same
 * two phrases in the other order). Sefaria often splits them across lines.
 */
export function collapseBarchuBonehYerushalayimToMeheraTachinBreak(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  const nik = '[\\u0591-\\u05C7]*';
  const tag = '(?:<[^>]*>\\s*)*';
  const br = '(?:\\s|\\r?\\n|<br\\s*\\/?>)+';
  const mem = '(?:מ|ם)';
  const nunEnd = '(?:נ|ן)';
  const barchuBoneh =
    `ב${nik}ר${nik}ו${nik}ך${nik}\\s+א${nik}ת${nik}ה${nik}\\s+י${nik}ה${nik}ו${nik}ה${nik}\\s+ב${nik}ו${nik}נ${nik}ה${nik}\\s+י${nik}ר${nik}ו${nik}ש${nik}ל${nik}י${nik}${mem}`;
  const meheraLetocha =
    `מ${nik}ה${nik}ר${nik}ה${nik}\\s+ל${nik}ת${nik}ו${nik}כ${nik}ה${nik}\\s+ת${nik}כ${nik}י${nik}${nunEnd}`;
  const colon = '\\s*[:׃\\u05C3.]?';
  const reBarchuFirst = new RegExp(
    `(${barchuBoneh})(${colon})${tag}${br}${tag}(${meheraLetocha})(${colon})`,
    'gu'
  );
  const reMeheraFirst = new RegExp(
    `(${meheraLetocha})(${colon})${tag}${br}${tag}(${barchuBoneh})(${colon})`,
    'gu'
  );
  let hebOut = hebrew.replace(reBarchuFirst, '$1$2 $3$4').replace(reMeheraFirst, '$1$2 $3$4');
  hebOut = hebOut.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n');
  return { hebrew: hebOut.trim(), english: english };
}

/**
 * Collapse break between חננו ועננו ושמע תפילתנו and כי אתה שומע תפילת… (Shomea Tefillah).
 */
export function collapseChanenuShomeaTefilaBreak(hebrew: string, english: string): { hebrew: string; english: string } {
  const nik = '[\\u0591-\\u05C7]*';
  const tag = '(?:<[^>]*>\\s*)*';
  const br = '(?:\\s|\\r?\\n|<br\\s*\\/?>)+';
  const first =
    `ח${nik}נ${nik}נ${nik}ו${nik}\\s+ו${nik}ע${nik}נ${nik}נ${nik}ו${nik}\\s+ו${nik}ש${nik}מ${nik}ע${nik}\\s+ת${nik}פ${nik}ל${nik}ת${nik}נ${nik}ו${nik}`;
  const second =
    `כ${nik}י${nik}\\s+א${nik}ת${nik}ה${nik}\\s+ש${nik}ו${nik}מ${nik}ע${nik}\\s+ת${nik}פ${nik}(?:ל${nik}י${nik}ל${nik}|ל${nik}ל${nik}|ל${nik})ת`;
  const hebRe = new RegExp(`(${first})(\\s*[:׃\\u05C3.]?)${tag}${br}${tag}(${second})`, 'gu');
  const hebOut = hebrew
    .replace(hebRe, (_m, g1: string, g2: string | undefined, g3: string) =>
      g2?.trim() ? `${g1.trimEnd()}${g2.trimEnd()} ${g3}` : `${g1.trimEnd()} ${g3}`
    )
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n');
  return { hebrew: hebOut.trim(), english: english };
}

/**
 * Collapse break after Sefaria’s parenthetical `(ברוב עוז ושלום).` and before `ברוך אתה …` (e.g. Sim Shalom chatima).
 */
export function collapseBeRovOzShalomToBarchuBreak(hebrew: string, english: string): { hebrew: string; english: string } {
  const nik = '[\\u0591-\\u05C7]*';
  const tag = '(?:<[^>]*>\\s*)*';
  const br = '(?:\\s|\\r?\\n|<br\\s*\\/?>)+';
  const first =
    `\\(${tag}ב${nik}ר${nik}ו${nik}ב${nik}\\s+ע${nik}ו${nik}ז${nik}\\s+ו${nik}ש${nik}ל${nik}ו${nik}ם${tag}\\)\\s*\\.?`;
  const second =
    `ב${nik}ר${nik}ו${nik}ך${nik}\\s+א${nik}ת${nik}ה${nik}(?:\\s+י${nik}ה${nik}ו${nik}ה|\\s+א${nik}ד${nik}נ${nik}י)?`;
  const hebRe = new RegExp(`(${first})${tag}${br}${tag}(${second})`, 'gu');
  const hebOut = hebrew
    .replace(hebRe, (_m, g1: string, g2: string) => `${g1.trimEnd()} ${g2}`)
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n');
  return { hebrew: hebOut.trim(), english: english };
}

/**
 * Indices in `hebrew` for the full יעלה ויבא paragraph (Retzei insertion), or null if not found.
 * Uses nikkud-stripped search + index map (like kedusha/modim) so we still match Sefaria’s full vocalization.
 */
function findYaalehVeyavoBlockSpanInHebrew(hebrew: string): { blockStart: number; endIdx: number } | null {
  /** Post-`normalize_html` amidah text is plain; indices must match the pipeline string. */
  const hNo = hebrew;
  let stripped = '';
  const toOrig: number[] = [];
  for (let i = 0; i < hNo.length; i++) {
    if (/[\u0591-\u05C7]/.test(hNo[i])) continue;
    if (hNo[i] === '\u200c' || hNo[i] === '\u200d') continue;
    stripped += stripNikkud(hNo[i]);
    toOrig.push(i);
  }
  if (stripped.length === 0 || stripped.length !== toOrig.length) return null;

  const endRe = /כי אליך עינינו\s*,?\s*כי אל מלך חנון ורחום אתה\s*[:׃]?/;
  const endM = stripped.match(endRe);
  if (!endM || endM.index === undefined) return null;
  const endS = endM.index + endM[0].length;

  const region = stripped.slice(0, endS);
  let startS = -1;
  let sm: RegExpExecArray | null;
  // Sof pasuq / maqaf / nikkud between אבותינו and יעלה are omitted from `stripped`, so the text can be
  // "אבותינועלה" with no whitespace — require \s only when it survived (e.g. newline, ASCII punctuation).
  const rA = /אלהינו\s+ואלהי\s+אבותינו(?:\s|[.:;])*יעלה/g;
  rA.lastIndex = 0;
  while ((sm = rA.exec(region)) !== null) startS = Math.max(startS, sm.index);
  const rB = /יעלה\s+ויבאו?/g;
  if (startS < 0) {
    rB.lastIndex = 0;
    while ((sm = rB.exec(region)) !== null) startS = Math.max(startS, sm.index);
  }
  if (startS < 0) return null;

  const blockStart = toOrig[startS];
  const endIdx = endS < toOrig.length ? toOrig[endS] : hNo.length;
  if (endIdx <= blockStart) return null;
  return { blockStart, endIdx };
}

/**
 * Amidah: Sefaria always includes the יעלה ויבא paragraph; remove it unless today is a day we say it
 * (Rosh Chodesh, Chol Hamoed, Yom Kippur, first days Pesach/Shavuot/Sukkot — same calendar as `JewishCalendarService.isYaalehVyavoDay`).
 */
export function removeYaalehVeyavoBlockUnlessApplicable(
  hebrew: string,
  english: string,
  date: Date
): { hebrew: string; english: string } {
  if (JewishCalendarService.isYaalehVyavoDay(date)) {
    return { hebrew, english };
  }
  const span = findYaalehVeyavoBlockSpanInHebrew(hebrew);
  if (!span) return { hebrew, english };
  const { blockStart, endIdx } = span;
  const newHebrew = (hebrew.slice(0, blockStart).trimEnd() + '\n\n' + hebrew.slice(endIdx).trimStart())
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const en = english ?? '';
  let newEnglish = en;
  if (en.trim()) {
    const sl = Math.max(1, hebrew.length);
    const i0 = Math.floor((en.length * blockStart) / sl);
    const i1 = Math.min(en.length, Math.ceil((en.length * endIdx) / sl));
    if (i1 > i0 + 20) {
      newEnglish = (en.slice(0, i0).trimEnd() + '\n\n' + en.slice(i1).trimStart()).replace(/\n{3,}/g, '\n\n').trim();
    }
  }
  return { hebrew: newHebrew, english: newEnglish };
}

/**
 * Sefaria splits יעלה ויבא across lines (לר"ח / לפסח / לסכות / ביום …). Join the whole block into one paragraph.
 * The block may open with "יעלה ויבא" on its own line or with "אלהינו ואלהי אבותינו יעלה" — anchor on the unique
 * closing "כי אליך עינינו … חנון ורחום אתה" and take the latest valid opening before it so the regex still matches.
 */
export function collapseYaalehVeyavoInternalLineBreaks(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  const span = findYaalehVeyavoBlockSpanInHebrew(hebrew);
  if (!span) return { hebrew, english };
  const { blockStart, endIdx } = span;

  const block = hebrew.slice(blockStart, endIdx);
  const collapsed = block
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/\u2028+/g, ' ')
    .replace(/\s*\r?\n+\s*/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  const before = hebrew.slice(0, blockStart).replace(/\s+$/, '');
  const after = hebrew.slice(endIdx).replace(/^\s+/, '');
  const joinBefore = before.length > 0 ? `${before}\n\n` : '';
  const joinAfter = after.length > 0 ? `\n\n${after}` : '';
  const hebOut = `${joinBefore}${collapsed}${joinAfter}`.replace(/\n{3,}/g, '\n\n');
  return { hebrew: hebOut.trim(), english };
}

/**
 * יעלה ויבא: Sefaria keeps "לר"ח" / "לפסח" / "לסכות" on separate lines with `\n\n`, so the reader treats each as a
 * new paragraph (large vertical gap). Collapse the span from after "…טובים ולשלום ביום" through the start of "זכרנו".
 */
export function collapseYaalehHolidayOptionLineBreaks(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  const raw = hebrew.replace(/<br\s*\/?>/gi, '\n');
  let stripped = '';
  const stToHe: number[] = [];
  for (let i = 0; i < raw.length; i++) {
    if (/[\u0591-\u05C7]/.test(raw[i])) continue;
    stripped += stripNikkud(raw[i]);
    stToHe.push(i);
  }
  const ySearch = stripped.indexOf('יעלה');
  const fromY = ySearch !== -1 ? ySearch : 0;
  const tail = stripped.slice(fromY);
  const mFull = tail.match(/טובים\s+ו\s*ל\s*שלום\s+ביום/);
  const mShort = tail.match(/ו\s*ל\s*שלום\s+ביום/);
  const mAnchor = mFull ?? mShort;
  if (!mAnchor || mAnchor.index === undefined) {
    return { hebrew, english };
  }
  const sliceFromSt = fromY + mAnchor.index + mAnchor[0].length;
  if (sliceFromSt >= stripped.length) {
    return { hebrew, english };
  }
  const zIdx = stripped.indexOf('זכרנו', sliceFromSt);
  if (zIdx < 0 || zIdx <= sliceFromSt) {
    return { hebrew, english };
  }
  const hStart = stToHe[sliceFromSt];
  const hEnd = stToHe[zIdx];
  if (hStart === undefined || hEnd === undefined || hEnd <= hStart) {
    return { hebrew, english };
  }
  const middle = raw.slice(hStart, hEnd);
  const collapsed = middle
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/\u2028+/g, ' ')
    .replace(/\s*\r?\n+\s*/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
  const out =
    raw.slice(0, hStart).trimEnd() +
    (collapsed.length ? ` ${collapsed} ` : ' ') +
    raw.slice(hEnd).trimStart();
  return { hebrew: out.replace(/ {2,}/g, ' ').trim(), english };
}

/** Join Gevuros lines Sefaria splits after "להושיע:" / after מוריד הטל or משיב…הגשם before "מכלכל". */
function collapseGevurosPhraseLineBreaks(hebrew: string): string {
  const nik = '[\\u0591-\\u05C7]*';
  const tag = '(?:<[^>]*>\\s*)*';
  const br = '\\s*\\r?\\n+\\s*';
  let out = hebrew;
  out = out.replace(new RegExp(`(ל${nik}ה${nik}ו${nik}ש${nik}י${nik}ע${nik})\\s*[:׃]${br}`, 'gu'), '$1: ');
  out = out.replace(
    new RegExp(
      `(מ${nik}ו${nik}ר${nik}י${nik}ד(?:${tag}|\\s|־)*ה${nik}ט${nik}ל${nik})\\s*:?${br}(מ${nik}כ${nik}ל${nik}כ${nik}ל)`,
      'gu'
    ),
    '$1 $2'
  );
  out = out.replace(
    new RegExp(
      `(מ${nik}ש${nik}י${nik}ב(?:${tag}|\\s)*ה${nik}ר${nik}ו${nik}ח${nik}(?:${tag}|\\s)*ו${nik}מ${nik}ו${nik}ר${nik}י${nik}ד(?:${tag}|\\s)*ה${nik}ג${nik}ש${nik}[מם]${nik})\\s*:?${br}(מ${nik}כ${nik}ל${nik}כ${nik}ל)`,
      'gu'
    ),
    '$1 $2'
  );
  // Also join להושיע: → מכלכל when summer silence left no middle phrase
  out = out.replace(
    new RegExp(
      `(ל${nik}ה${nik}ו${nik}ש${nik}י${nik}ע${nik})\\s*[:׃]\\s*(מ${nik}כ${nik}ל${nik}כ${nik}ל)`,
      'gu'
    ),
    '$1: $2'
  );
  return out;
}

/**
 * Gevuros (2nd bracha): Sefaria often prints both summer (מוריד הטל) and winter (משיב הרוח ומוריד הגשם)
 * with labels בקיץ:/בחורף:.
 *
 * - Winter (Mashiv Haruach season): keep משיב הרוח ומוריד הגשם only.
 * - Summer, classic Nusach Ashkenaz: silence (drop both phrases and labels). Morid HaTal is
 *   Sfard / some Israeli minhagim — same as SiddurService.getGevurosInsertion (sfard-gated).
 * - Summer with `sayMoridHatalInSummer: true`: keep מוריד הטל only.
 *
 * English: same summer/winter dual block handling.
 */
export function applyGevurosSeasonalMoridOrMashiv(
  hebrew: string,
  english: string,
  date: Date = new Date(),
  options?: { sayMoridHatalInSummer?: boolean }
): { hebrew: string; english: string } {
  const winter = JewishCalendarService.isMashivHaruach(date);
  const sayTalSummer = options?.sayMoridHatalInSummer === true;
  const nik = '[\\u0591-\\u05C7]*';
  const tag = '(?:<[^>]*>\\s*)*';
  const lblColon = '\\s*[:׃]'; // ASCII colon or Hebrew sof pasuq (some siddur editions)
  // Strip format controls that can sit between letters in copied or HTML-normalized text
  const hebNorm = hebrew.replace(/[\u200B-\u200D\uFEFF]/g, '');
  // טל may touch בחורף with no space (הַטָּלבחורף); some editions insert a space
  // Sefaria often spells בחורף without vav (בַּחֹֽרֶף); optional ו between ח and ר
  // קיץ/חורף labels may use final or non-final tsadi/pe (צ/ץ, פ/ף)
  // Final word is הגשם / הגשם with sofit ם
  const hebRe = new RegExp(
    `${tag}ב${nik}ק${nik}י${nik}[ץצ]${nik}${lblColon}${tag}\\s*(מ${nik}ו${nik}ר${nik}י${nik}ד(?:${tag}|\\s|־)*ה${nik}ט${nik}ל${nik})\\s*[:׃]?` +
      `(?:${tag}|\\s)*(ב${nik}ח${nik}ו?${nik}ר${nik}[ףפ])${tag}${lblColon}${tag}\\s*` +
      `(מ${nik}ש${nik}י${nik}ב(?:${tag}|\\s)*ה${nik}ר${nik}ו${nik}ח${nik}(?:${tag}|\\s)*ו${nik}מ${nik}ו${nik}ר${nik}י${nik}ד(?:${tag}|\\s)*ה${nik}ג${nik}ש${nik}[מם]${nik})\\s*[:׃]?`,
    'gu'
  );
  const pickGevurosPhrase = (summerPhrase: string, winterPhrase: string): string => {
    if (winter) return winterPhrase.trim();
    if (sayTalSummer) return summerPhrase.trim();
    return ''; // Ashkenaz summer silence
  };
  let hebOut = hebNorm.replace(hebRe, (_m, summerPhrase: string, _bhLabel: string, winterPhrase: string) =>
    pickGevurosPhrase(summerPhrase, winterPhrase)
  );

  // Residual sweep: if summer Ashkenaz still has a lone מוריד הטל (labels already stripped).
  if (!winter && !sayTalSummer) {
    hebOut = hebOut.replace(
      new RegExp(
        `(?:ב${nik}ק${nik}י${nik}[ץצ]${nik}${lblColon}\\s*)?מ${nik}ו${nik}ר${nik}י${nik}ד(?:${tag}|\\s|־)*ה${nik}ט${nik}ל${nik}\\s*[:׃]?`,
        'gu'
      ),
      ''
    );
    // Drop a remaining winter-only label if summer silence left it hanging (rare partial match).
    hebOut = hebOut.replace(
      new RegExp(`ב${nik}ח${nik}ו?${nik}ר${nik}[ףפ]${nik}${lblColon}\\s*`, 'gu'),
      ''
    );
    hebOut = hebOut.replace(new RegExp(`ב${nik}ק${nik}י${nik}[ץצ]${nik}${lblColon}\\s*`, 'gu'), '');
  }

  hebOut = collapseGevurosPhraseLineBreaks(hebOut);
  hebOut = hebOut.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n');

  let engOut = english;
  const engRe =
    /\bIn\s+summer\s*:\s*([\s\S]*?)\s+In\s+winter\s*:\s*([\s\S]*?)(?=\n\n[^\n]|$|Who\s+restores)/i;
  engOut = english.replace(engRe, (_all, summerEn: string, winterEn: string) => {
    if (winter) return winterEn.trim().replace(/\n{3,}/g, '\n\n');
    if (sayTalSummer) return summerEn.trim().replace(/\n{3,}/g, '\n\n');
    return '';
  });
  if (!winter && !sayTalSummer) {
    engOut = engOut
      .replace(/\bHe causes the dew to descend\.?\s*/gi, '')
      .replace(/\bIn\s+summer\s*:\s*/gi, '')
      .replace(/\bIn\s+winter\s*:\s*/gi, '');
  }

  return { hebrew: hebOut, english: engOut || english };
}

/** Map each non-nikkud char in `s` to its start index in `s` (for slicing original with nikkud). */
function buildHebrewDenikkudMap(s: string): { flat: string; orig: number[] } {
  let flat = '';
  const orig: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (/[\u0591-\u05C7]/.test(c)) continue;
    flat += c;
    orig.push(i);
  }
  return { flat, orig };
}

/**
 * When the strict nikkud-aware regex misses (Sefaria punctuation / הגשם vs הגשמים / maqaf), match on
 * denikkud `flat` and splice the corresponding span in `hebrew` so cantillation is preserved.
 */
function replaceBirkasHashanimDualBlockDenikkud(
  hebrew: string,
  useWinterVten: boolean
): string | null {
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
  const reGsham = new RegExp(
    `(בימות${spacer}החמה${spacer}:\\s*)` +
      `([\\s\\S]*?)` +
      `(\\s*בימות${spacer}הגשם${spacer}:\\s*)` +
      `([\\s\\S]*?)(?=\\s*על${spacer}פני)`,
    'u'
  );
  const m = flat.match(reGshamim) || flat.match(reGsham);
  if (!m) return null;
  const p0 = m.index ?? 0;
  const p5 = p0 + m[0].length;
  const p2 = p0 + m[1].length;
  const p3 = p2 + m[2].length;
  const p4 = p3 + m[3].length;
  const oStart = orig[p0];
  const oEnd = p5 >= orig.length ? hebNorm.length : orig[p5];
  const summerOrig = hebNorm.slice(orig[p2], orig[p3]).trim();
  const winterOrig = hebNorm.slice(orig[p4], orig[p5]).trim();
  const chosen = useWinterVten ? winterOrig : summerOrig;
  if (!chosen) return null;
  // Single spaces: avoid `\n\n` here — the reader treats `\n\n` as separate paragraphs (large vertical gaps).
  return hebNorm.slice(0, oStart).trimEnd() + ' ' + chosen + ' ' + hebNorm.slice(oEnd).trimStart();
}

/** Join ותן ↔ seasonal phrase ↔ על פני on one paragraph (no `\n\n` gaps after Birkas Hashanim collapse). */
function collapseBirkasHashanimVtenParagraphGaps(hebrew: string): string {
  const nik = '[\\u0591-\\u05C7]*';
  let h = hebrew;
  h = h.replace(new RegExp(`(ו${nik}ת${nik}ן)(?:\\s|\\n)+(?=(?:ב${nik}ר${nik}כ${nik}ה|ט${nik}ל))`, 'gu'), '$1 ');
  h = h.replace(new RegExp(`(ל${nik}ב${nik}ר${nik}כ${nik}ה)(?:\\s|\\n)+(?=ע${nik}ל)`, 'gu'), '$1 ');
  h = h.replace(new RegExp(`(?<![ל])(ב${nik}ר${nik}כ${nik}ה)(?:\\s|\\n)+(?=ע${nik}ל)`, 'gu'), '$1 ');
  return h;
}

/**
 * Birkas Hashanim (9th bracha): Sefaria often prints both seasonal endings — בימות החמה (ברכה / ותן ברכה)
 * and בימות הגשמים or בימות הגשם (טל ומטר לברכה). Collapse to the correct phrase for
 * {@link JewishCalendarService.isVtenTalUmatar}. Uses a nikkud-stripped fallback so pointed Sefaria text still matches.
 */
export function applyBirkasHashanimSeasonalVtenBrachaOrTalUmatar(
  hebrew: string,
  english: string,
  date: Date = new Date(),
  isIsrael: boolean = false
): { hebrew: string; english: string } {
  const useWinterVten = JewishCalendarService.isVtenTalUmatar(date, isIsrael);
  const nik = '[\\u0591-\\u05C7]*';
  const tag = '(?:<[^>]*>\\s*)*';
  const lblColon = '\\s*[:׃]';
  const omrim = `(?:א${nik}ו${nik}מ${nik}ר${nik}י${nik}ם)?`;
  const wsSep = `(?:\\s|[־\\u05BE-]|${tag})+`;
  const hebNorm = hebrew.replace(/[\u200B-\u200F\uFEFF\u00A0]/g, '');

  const summerInner = `(?:ו${nik}ת${nik}ן(?:${tag}|\\s)+)?ב${nik}ר${nik}כ${nik}ה`;
  const winterInner = `(?:ו${nik}ת${nik}ן(?:${tag}|\\s)+)?ט${nik}ל(?:${tag}|\\s)*ו(?:${tag}|\\s)*מ${nik}ט${nik}ר(?:${tag}|\\s)*ל${nik}ב${nik}ר${nik}כ${nik}ה`;

  const winterHead = `ב${nik}י${nik}ו?${nik}מ${nik}ו${nik}ת${nik}${wsSep}ה${nik}ג${nik}ש${nik}(?:מ${nik}י${nik}ם|ם)`;

  const bimotBlock = new RegExp(
    `ב${nik}י${nik}ו?${nik}מ${nik}ו${nik}ת${nik}${wsSep}ה${nik}ח${nik}מ${nik}ה${tag}${omrim}?${lblColon}\\s*(${summerInner})\\s*` +
      `${winterHead}${tag}${omrim}?${lblColon}\\s*(${winterInner})`,
    'gu'
  );

  let hebOut = hebNorm.replace(bimotBlock, (_m, summer: string, winter: string) =>
    (useWinterVten ? winter : summer).trim()
  );

  if (hebOut === hebNorm) {
    const bkiyotBlock = new RegExp(
      `ב${nik}ק${nik}י${nik}[ץצ]${nik}${lblColon}\\s*(${summerInner})\\s*ב${nik}ח${nik}ו?${nik}ר${nik}[ףפ]${nik}${lblColon}\\s*(${winterInner})`,
      'gu'
    );
    hebOut = hebOut.replace(bkiyotBlock, (_m, summer: string, winter: string) =>
      (useWinterVten ? winter : summer).trim()
    );
  }

  if (hebOut === hebNorm) {
    const fb = replaceBirkasHashanimDualBlockDenikkud(hebNorm, useWinterVten);
    if (fb != null) hebOut = fb;
  }

  let engOut = english;
  const engRe1 =
    /During\s+(?:the\s+)?(?:summer|dry)\s+(?:months?\s*)?:\s*([\s\S]*?)\s*(?:During\s+(?:the\s+)?(?:rainy|wet)\s+(?:months?\s*)?:|In\s+the\s+rainy\s+season\s*:)\s*([\s\S]*?)(?=\n\n[^\n]|$)/i;
  if (engRe1.test(engOut)) {
    engOut = engOut.replace(engRe1, (_a, summerEn: string, winterEn: string) =>
      (useWinterVten ? winterEn : summerEn).trim()
    );
  }

  hebOut = collapseBirkasHashanimVtenParagraphGaps(hebOut);

  return { hebrew: hebOut, english: engOut || english };
}

/**
 * Strip bare Amidah bracha title lines (אבות / גבורות / …) even when packs use
 * single `\n` instead of paragraph breaks (Sfard raw often does this).
 */
export function stripAmidahBrachaTitleLines(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  const titlesSet = new Set(AMIDAH_BRACHA_TITLES);
  const normalize = (s: string) =>
    stripNikkud(stripHtml(s)).replace(/[\s:.\-]+$/g, '').trim();
  const out = hebrew
    .split('\n')
    .filter((line) => {
      const t = line.trim();
      if (!t) return true;
      return !titlesSet.has(normalize(t));
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { hebrew: out, english };
}

/** Starts of weekday Amidah brachot (denikkud) — used to restore `\n\n` between them. */
const AMIDAH_NEXT_BRACHA_STARTS = [
  'אתה גבור',
  'אתה קדוש',
  'אתה חונן',
  'השיבנו',
  'סלח לנו',
  'ראה נא',
  'רפאנו',
  'ברך עלינו',
  'תקע בשופר',
  'השיבה שופטינו',
  'ולמלשינים',
  'על הצדיקים',
  'ולירושלים',
  'את צמח',
  'שמע קולנו',
  'רצה',
  'מודים',
  'שים שלום',
  'שלום רב',
  'יעלה ויבא',
  'יעלה ויבוא',
  'ועל הנסים',
  'על הנסים',
  'עננו',
  'נחם',
] as const;

/**
 * Reader treats `\n\n` as paragraph spacing. Sfard (and some Ashkenaz) packs join
 * brachot with a single `\n`. Upgrade those boundaries so each bracha groups cleanly
 * — does not add/remove liturgy, only spacing.
 */
export function ensureAmidahBrachaParagraphBreaks(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  if (!hebrew.trim()) return { hebrew, english };
  const { flat, orig } = (() => {
    let flat = '';
    const orig: number[] = [];
    for (let i = 0; i < hebrew.length; i++) {
      if (/[\u0591-\u05C7]/.test(hebrew[i])) continue;
      flat += hebrew[i];
      orig.push(i);
    }
    return { flat, orig };
  })();

  const insertAt = new Set<number>();
  for (const start of AMIDAH_NEXT_BRACHA_STARTS) {
    let pos = 0;
    while (true) {
      const i = flat.indexOf(start, pos);
      if (i === -1) break;
      // Look back over whitespace for a single newline (not already paragraph)
      let j = i - 1;
      while (j >= 0 && (flat[j] === ' ' || flat[j] === '\t' || flat[j] === '\r')) j--;
      if (j >= 0 && flat[j] === '\n') {
        const prev = j - 1;
        if (prev < 0 || flat[prev] !== '\n') {
          // Insert an extra \n just before this bracha start (original index)
          insertAt.add(orig[i] ?? i);
        }
      }
      pos = i + start.length;
    }
  }

  if (insertAt.size === 0) {
    return { hebrew: hebrew.replace(/\n{3,}/g, '\n\n'), english };
  }
  const points = [...insertAt].sort((a, b) => a - b);
  let out = '';
  let cursor = 0;
  for (const p of points) {
    out += hebrew.slice(cursor, p) + '\n';
    cursor = p;
  }
  out += hebrew.slice(cursor);
  return { hebrew: out.replace(/\n{3,}/g, '\n\n').trim(), english };
}

/**
 * Soft layout helper for non-Amidah sections (Sfard continuous blobs especially):
 * 1) `\n\n` before each `ברוך אתה` that only had a single newline
 * 2) `\n\n` after a line-ending colon/`׃` when the next line continues (matches how
 *    Ashkenaz packs already use paragraph gaps between Sefaria leaves)
 *
 * Does not add or remove liturgy — spacing only.
 */
export function ensureBaruchAtahParagraphBreaks(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  const nik = '[\\u0591-\\u05C7]*';
  const baruch = `ב${nik}ר${nik}ו${nik}ך${nik}\\s+א${nik}ת${nik}ה`;
  const out = hebrew
    .replace(new RegExp(`(?<!\\n)\\n(?!\\n)(?=${baruch})`, 'gu'), '\n\n')
    .replace(/([:׃])\r?\n(?!\n)(?=\S)/g, '$1\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { hebrew: out, english };
}
