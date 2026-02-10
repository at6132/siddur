/**
 * Nach Yomi / Tanakh Yomi Service
 * Computes today's chapter from the Neviim + Ketuvim cycle.
 * Cycle: 585 chapters (excluding Tehillim), starts day after Simchat Torah (23 Tishrei).
 */

export interface NachChapter {
  book: string;
  bookHebrew: string;
  chapter: number;
  /** Sefaria ref, e.g. "Joshua 1", "I Samuel 5" */
  sefariaRef: string;
}

/** Nach books in Tanakh Yomi order: Neviim Rishonim, Neviim Acharonim, Ketuvim (excluding Tehillim). */
export const NACH_BOOKS: { sefariaName: string; hebrew: string; chapters: number }[] = [
  { sefariaName: 'Joshua', hebrew: 'יהושע', chapters: 24 },
  { sefariaName: 'Judges', hebrew: 'שופטים', chapters: 21 },
  { sefariaName: 'I Samuel', hebrew: 'שמואל א', chapters: 31 },
  { sefariaName: 'II Samuel', hebrew: 'שמואל ב', chapters: 24 },
  { sefariaName: 'I Kings', hebrew: 'מלכים א', chapters: 22 },
  { sefariaName: 'II Kings', hebrew: 'מלכים ב', chapters: 25 },
  { sefariaName: 'Isaiah', hebrew: 'ישעיהו', chapters: 66 },
  { sefariaName: 'Jeremiah', hebrew: 'ירמיהו', chapters: 52 },
  { sefariaName: 'Ezekiel', hebrew: 'יחזקאל', chapters: 48 },
  { sefariaName: 'Hosea', hebrew: 'הושע', chapters: 14 },
  { sefariaName: 'Joel', hebrew: 'יואל', chapters: 4 },
  { sefariaName: 'Amos', hebrew: 'עמוס', chapters: 9 },
  { sefariaName: 'Obadiah', hebrew: 'עובדיה', chapters: 1 },
  { sefariaName: 'Jonah', hebrew: 'יונה', chapters: 4 },
  { sefariaName: 'Micah', hebrew: 'מיכה', chapters: 7 },
  { sefariaName: 'Nahum', hebrew: 'נחום', chapters: 3 },
  { sefariaName: 'Habakkuk', hebrew: 'חבקוק', chapters: 3 },
  { sefariaName: 'Zephaniah', hebrew: 'צפניה', chapters: 3 },
  { sefariaName: 'Haggai', hebrew: 'חגי', chapters: 2 },
  { sefariaName: 'Zechariah', hebrew: 'זכריה', chapters: 14 },
  { sefariaName: 'Malachi', hebrew: 'מלאכי', chapters: 3 },
  { sefariaName: 'Proverbs', hebrew: 'משלי', chapters: 31 },
  { sefariaName: 'Job', hebrew: 'איוב', chapters: 42 },
  { sefariaName: 'Song of Solomon', hebrew: 'שיר השירים', chapters: 1 },
  { sefariaName: 'Ruth', hebrew: 'רות', chapters: 4 },
  { sefariaName: 'Lamentations', hebrew: 'איכה', chapters: 5 },
  { sefariaName: 'Ecclesiastes', hebrew: 'קהלת', chapters: 12 },
  { sefariaName: 'Esther', hebrew: 'אסתר', chapters: 10 },
  { sefariaName: 'Daniel', hebrew: 'דניאל', chapters: 12 },
  { sefariaName: 'Ezra', hebrew: 'עזרא', chapters: 10 },
  { sefariaName: 'Nehemiah', hebrew: 'נחמיה', chapters: 13 },
  { sefariaName: 'I Chronicles', hebrew: 'דברי הימים א', chapters: 29 },
  { sefariaName: 'II Chronicles', hebrew: 'דברי הימים ב', chapters: 36 },
];

const TOTAL_CHAPTERS = NACH_BOOKS.reduce((sum, b) => sum + b.chapters, 0);

/** Simchat Torah 5785 = Oct 24, 2024. Cycle starts Oct 25. */
const CYCLE_START_DATE = new Date(2024, 9, 25);
CYCLE_START_DATE.setHours(0, 0, 0, 0);

function daysSinceCycleStart(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const diff = d.getTime() - CYCLE_START_DATE.getTime();
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}

/**
 * Get today's Nach Yomi chapter.
 */
export function getTodayNachYomi(): NachChapter | null {
  return getNachYomiForDate(new Date());
}

/**
 * Get Nach Yomi chapter for a given date.
 */
export function getNachYomiForDate(date: Date): NachChapter | null {
  const days = daysSinceCycleStart(date);
  if (days < 0) return null;
  const dayInCycle = days % TOTAL_CHAPTERS;
  let remaining = dayInCycle;
  for (const book of NACH_BOOKS) {
    if (remaining < book.chapters) {
      const chapter = remaining + 1;
      return {
        book: book.sefariaName,
        bookHebrew: book.hebrew,
        chapter,
        sefariaRef: `${book.sefariaName} ${chapter}`,
      };
    }
    remaining -= book.chapters;
  }
  return null;
}
