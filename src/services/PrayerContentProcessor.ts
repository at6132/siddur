/**
 * Process prayer text: hide instructions, show day-specific content only on the right days, highlight it.
 */

import { JewishCalendarService } from '../core/calendar/JewishCalendar';

export interface PrayerSegment {
  text: string;
  highlight: boolean;
}

/** Day-specific prefixes in Hebrew (Amidah and similar). Show only when the day matches. */
const DAY_SPECIFIC_PREFIXES: { pattern: RegExp; check: (date: Date) => boolean }[] = [
  // בעשי"ת / בעשרת ימי תשובה – Ten Days of Repentance
  {
    pattern: /^בעשי["״\u05F4]ת\s*:|^בעשרת ימי תשובה\s*:/i,
    check: (d) => JewishCalendarService.isAseretYemeiTeshuva(d),
  },
  // בראש חודש – Rosh Chodesh
  { pattern: /^בראש חודש\s*:/i, check: (d) => JewishCalendarService.isRoshChodesh(d) },
  // בחול המועד – Chol Hamoed
  { pattern: /^בחול המועד\s*:/i, check: (d) => JewishCalendarService.isCholHamoed(d) },
  // בחנוכה – Chanukah
  { pattern: /^בחנוכה\s*:/i, check: (d) => !!JewishCalendarService.getChanukahDay(d) },
  // בפורים – Purim
  { pattern: /^בפורים\s*:/i, check: (d) => JewishCalendarService.isPurim(d) },
];

/** Substrings that mark a paragraph as "how to daven" / halachic instruction (not actual prayer text) */
const INSTRUCTION_MARKERS: string[] = [
  'המתפלל צריך',           // The one praying must...
  'ויזהר להתפלל',          // Be careful to pray...
  'להתפלל בלחש',           // Pray in a whisper
  'יכוין רגליו',           // Position his feet
  'זה אצל זה כאילו אינן אלא אחת', // feet together as one
  'ולא ירמוז בעיניו',      // not signal with his eyes
  'ולא יקרוץ בשפתיו',      // not move his lips
  'ולא יראה באצבעותיו',    // not gesture with fingers
  'פירוש המילות שהוא מוציא', // meaning of the words he utters
  'שיחשוב בשעת התפילה',    // that he should think during the prayer
  'מכניעים את הלב',        // humble the heart (instruction context)
  'אם שכח לומר מי כמוך',   // halacha note in Amidah (Sefaria), not tefilla
  'אפילו לקדיש וקדושה',    // even for kaddish and kedusha (instruction)
  'ואינו פוסק',            // and he does not interrupt
  'מיד כשיעור משנתו',      // immediately upon waking from his sleep
  'בעודו על משכבו',        // while still on his bed
  'כשיעור משנתו, בעודו על משכבו, יאמר', // upon waking, while on his bed, he should say:
  'לאחר שנטל ידיו יאמר',   // after he has washed his hands, he should say:
  'לפני עטיפת הטלית קטן, יברך', // before putting on the small tallit, he should bless:
];

/** Paragraph looks like halachic / "how to daven" instructions – strip from display */
function isInstructionParagraph(hebrew: string): boolean {
  const t = hebrew.trim();
  if (!t) return true;
  const noNik = t.replace(/[\u0591-\u05C7]/g, '').replace(/\s+/g, ' ');
  if (
    /אם טעה וסיים האל הקדוש אם נזכר/.test(noNik) ||
    (/אם טעה וסיים האל הקדוש/.test(noNik) &&
      /המלך הקדוש/.test(noNik) &&
      (/תוך כדי די?בור/.test(noNik) || /לחזור לראש התפלה/.test(noNik)))
  ) {
    return true;
  }
  if (/מסיים/.test(noNik) && /המלך הקדוש/.test(noNik) && /בעשי/.test(noNik) && /ברוך אתה/.test(noNik)) {
    return true;
  }
  if (
    /אם\s*לא\s*אמר\s*זכרנו/.test(noNik) &&
    (/מלך\s*עוזר/.test(noNik) || /וכתבנו/.test(noNik) || /בא"י|בא״י/.test(noNik))
  ) {
    return true;
  }
  if (/הטועה\s*ומזכיר\s*זכרנו/.test(noNik) && /ראש\s*התפלה/.test(noNik)) {
    return true;
  }
  // Entirely in parentheses (source/commentary)
  if (/^\([^)]*\)$/.test(t)) return true;
  // Halacha-style: "אם לא אמר", "הטועה", "נזכר", "פוסק", "חוזר לראש"
  if (/^(אם לא אמר|הטועה|נזכר|פוסק|חוזר לראש)/.test(t)) return true;
  if (/\(דה"ח\)|\(שו"ע\)|\(משנ"ב\)/.test(t)) return true;
  // Long parenthetical at end (common for instructions)
  if (/\([^)]{40,}\)/.test(t)) return true;
  // Sefaria: "בראש חודש ובחול המועד אומרים זה:" before יעלה ויבא (not the prayer itself)
  if (
    (/בראש חודש|בראש חדש/.test(noNik)) &&
    /בחול המועד/.test(noNik) &&
    /אומרים זה|אומר זה/.test(noNik) &&
    !/יעלה ויבא/.test(noNik) &&
    noNik.length < 120
  ) {
    return true;
  }
  if (
    /שכח/.test(noNik) &&
    /יעלה\s*ויבא/.test(noNik) &&
    /יהיו\s*לרצון|מחזיר\s*שכינתו\s*לציון|חוזר\s*לראש\s*התפלה/.test(noNik) &&
    noNik.length < 2200
  ) {
    return true;
  }
  if (
    /כשאומר\s*מודים/.test(noNik) &&
    /כאגמון/.test(noNik) &&
    (/כורע|זוקף/.test(noNik)) &&
    noNik.length < 900
  ) {
    return true;
  }
  if (
    /כשיגיע/.test(noNik) &&
    /מודים/.test(noNik) &&
    /שליח/.test(noNik) &&
    /צבור|ציבור/.test(noNik) &&
    /(?:הודאה\s*קטנה|אבודרהם|עול\s*מלכות)/.test(noNik) &&
    noNik.length < 2600
  ) {
    return true;
  }
  // "How to daven" / kavana instructions (e.g. המתפלל צריך שיכוין... ויזהר להתפלל בלחש)
  for (const marker of INSTRUCTION_MARKERS) {
    if (t.includes(marker)) return true;
  }
  return false;
}

/** Check if paragraph is day-specific and whether today matches */
function getDaySpecificMatch(hebrew: string, date: Date): boolean | null {
  const t = hebrew.trim();
  for (const { pattern, check } of DAY_SPECIFIC_PREFIXES) {
    if (pattern.test(t)) return check(date);
  }
  return null; // not day-specific
}

function splitParagraphs(text: string): string[] {
  if (text == null || typeof text !== 'string') return [];
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

/**
 * Process prayer content: remove instruction paragraphs, show day-specific only on the right day, mark for highlight.
 * Safe: accepts undefined/null, returns empty segments instead of throwing.
 */
export function processPrayerContent(
  hebrew: string | undefined | null,
  english: string | undefined | null,
  date: Date = new Date()
): { hebrewSegments: PrayerSegment[]; englishSegments: PrayerSegment[] } {
  const hebrewParas = splitParagraphs(hebrew ?? '');
  const englishParas = splitParagraphs(english ?? '');
  const hebrewSegments: PrayerSegment[] = [];
  const englishSegments: PrayerSegment[] = [];

  const maxLen = Math.max(hebrewParas.length, englishParas.length);
  for (let i = 0; i < maxLen; i++) {
    const h = hebrewParas[i] ?? '';
    const e = englishParas[i] ?? '';

    if (isInstructionParagraph(h)) continue;

    if (!JewishCalendarService.isFastDay(date)) {
      const nk = h.replace(/[\u0591-\u05C7]/g, '').replace(/\s+/g, ' ');
      if (
        /בתענית/.test(nk) &&
        /ציבור/.test(nk) &&
        /עננו/.test(nk) &&
        (/עננו יהוה/.test(nk) || /עונה לעמו/.test(nk) || /לעמו ישראל/.test(nk))
      ) {
        continue;
      }
      const nkFlat = h.replace(/[\u0591-\u05C7]/g, '').replace(/\s+/g, '');
      if (nkFlat.includes('בתענית') && nkFlat.includes('עננויהוה')) {
        continue;
      }
    }

    const dayMatch = getDaySpecificMatch(h, date);
    if (dayMatch === false) continue; // day-specific but not today – skip
    const highlight = dayMatch === true;

    hebrewSegments.push({ text: h, highlight });
    englishSegments.push({ text: e, highlight });
  }

  return { hebrewSegments, englishSegments };
}
