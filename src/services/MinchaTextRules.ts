/**
 * Shared list of Amidah bracha titles to strip (אבות, גבורות, etc.) and helper.
 * Used by SefariaService for Shacharis, Mincha, and Maariv Amidah.
 * Add/remove titles here to control what gets stripped from Amidah content.
 */

import { JewishCalendarService } from '../core/calendar/JewishCalendar';

const stripNikkud = (s: string) => s.replace(/[\u0591-\u05C7]/g, '');
const stripHtml = (s: string) => s.replace(/<[^>]*>/g, '');

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
  'משפט',
  'על הצדיקים',
  'צדיקים',
  'על המינים',
  'ברכת המינים',
  'צדקתך',
  'בונה ירושלים',
  'ירושלים',
  'מצמיח קרן ישועה',
  'בית דוד',
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
  return /^בעשי"ת\s*:?/.test(t) || /^בעשרת ימי תשובה\s*:?/.test(t);
}

/** Match paragraph that is the Zochreinu prayer (content of the עשי"ת block) */
function isZochreinuParagraph(para: string): boolean {
  const t = stripNikkud(stripHtml(para)).trim();
  return /זכרנו\s*לחיים/.test(t) || (/ספר\s*החיים/.test(t) && /חיים/.test(t));
}

/** Match paragraph that is halacha/instruction about Zochreinu (אם לא אמר זכרנו etc) */
function isZochreinuInstructionParagraph(para: string): boolean {
  const t = para.trim();
  if (!t) return false;
  if (/^\([^)]*\)$/.test(t)) return true;
  if (/^(אם לא אמר|הטועה|נזכר|פוסק|חוזר לראש)/.test(t)) return true;
  if (/\(דה"ח\)|\(שו"ע\)|\(משנ"ב\)/.test(t)) return true;
  return false;
}

/**
 * When NOT during Aseret Yemei Teshuva (שי"ת), remove the entire בעשי"ת block:
 * the header line (בעשי"ת:), the Zochreinu prayer (זכרנו לחיים...), and the halacha note.
 * When we ARE during שי"ת, return content unchanged.
 */
export function removeAseretYemeiTeshuvaBlockIfNotToday(
  hebrew: string,
  english: string,
  date: Date = new Date()
): { hebrew: string; english: string } {
  if (JewishCalendarService.isAseretYemeiTeshuva(date)) {
    return { hebrew, english };
  }
  const hebParas = hebrew.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const engParas = english.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  let i = 0;
  for (; i < hebParas.length; i++) {
    if (isAseretYemeiTeshuvaHeader(hebParas[i])) break;
  }
  if (i >= hebParas.length) return { hebrew, english };
  const startIdx = i;
  let endIdx = i + 1;
  if (endIdx < hebParas.length && isZochreinuParagraph(hebParas[endIdx])) {
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
  return { hebrew: hebrewOut, english: englishOut || english };
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
