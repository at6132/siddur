/**
 * Shared list of Amidah bracha titles to strip (אבות, גבורות, etc.) and helper.
 * Used by SefariaService for Shacharis, Mincha, and Maariv Amidah.
 * Add/remove titles here to control what gets stripped from Amidah content.
 */

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
