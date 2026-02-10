/**
 * Mishna Yomi Service
 * Computes today's Mishna from the standard Mishna Yomi cycle.
 * Cycle: 1 perek per day, ~525 perakim, ~1.4 years. Starts day after Simchat Torah.
 */

export interface MishnaPerek {
  tractate: string;
  tractateHebrew: string;
  perek: number;
  /** Sefaria ref, e.g. "Mishnah Berakhot 1" */
  sefariaRef: string;
}

/** Mishna tractates in standard order (6 sedarim) with perek counts. Sefaria names. */
export const MISHNA_TRACTATES: { sefariaName: string; hebrew: string; perakim: number }[] = [
  // Zeraim
  { sefariaName: 'Berakhot', hebrew: 'ברכות', perakim: 9 },
  { sefariaName: 'Peah', hebrew: 'פאה', perakim: 8 },
  { sefariaName: 'Demai', hebrew: 'דמאי', perakim: 7 },
  { sefariaName: 'Kilayim', hebrew: 'כלאים', perakim: 9 },
  { sefariaName: 'Sheviit', hebrew: 'שביעית', perakim: 10 },
  { sefariaName: 'Terumot', hebrew: 'תרומות', perakim: 11 },
  { sefariaName: 'Maasrot', hebrew: 'מעשרות', perakim: 5 },
  { sefariaName: 'Maaser Sheni', hebrew: 'מעשר שני', perakim: 5 },
  { sefariaName: 'Challah', hebrew: 'חלה', perakim: 4 },
  { sefariaName: 'Orlah', hebrew: 'ערלה', perakim: 3 },
  { sefariaName: 'Bikkurim', hebrew: 'ביכורים', perakim: 4 },
  // Moed
  { sefariaName: 'Shabbat', hebrew: 'שבת', perakim: 24 },
  { sefariaName: 'Eruvin', hebrew: 'עירובין', perakim: 10 },
  { sefariaName: 'Pesachim', hebrew: 'פסחים', perakim: 10 },
  { sefariaName: 'Shekalim', hebrew: 'שקלים', perakim: 8 },
  { sefariaName: 'Yoma', hebrew: 'יומא', perakim: 8 },
  { sefariaName: 'Sukkah', hebrew: 'סוכה', perakim: 5 },
  { sefariaName: 'Beitzah', hebrew: 'ביצה', perakim: 5 },
  { sefariaName: 'Rosh Hashanah', hebrew: 'ראש השנה', perakim: 4 },
  { sefariaName: 'Taanit', hebrew: 'תענית', perakim: 4 },
  { sefariaName: 'Megillah', hebrew: 'מגילה', perakim: 4 },
  { sefariaName: 'Moed Katan', hebrew: 'מועד קטן', perakim: 3 },
  { sefariaName: 'Chagigah', hebrew: 'חגיגה', perakim: 3 },
  // Nashim
  { sefariaName: 'Yevamot', hebrew: 'יבמות', perakim: 16 },
  { sefariaName: 'Ketubot', hebrew: 'כתובות', perakim: 13 },
  { sefariaName: 'Nedarim', hebrew: 'נדרים', perakim: 11 },
  { sefariaName: 'Nazir', hebrew: 'נזיר', perakim: 9 },
  { sefariaName: 'Sotah', hebrew: 'סוטה', perakim: 9 },
  { sefariaName: 'Gittin', hebrew: 'גיטין', perakim: 9 },
  { sefariaName: 'Kiddushin', hebrew: 'קידושין', perakim: 4 },
  // Nezikin
  { sefariaName: 'Bava Kamma', hebrew: 'בבא קמא', perakim: 10 },
  { sefariaName: 'Bava Metzia', hebrew: 'בבא מציעא', perakim: 10 },
  { sefariaName: 'Bava Batra', hebrew: 'בבא בתרא', perakim: 10 },
  { sefariaName: 'Sanhedrin', hebrew: 'סנהדרין', perakim: 11 },
  { sefariaName: 'Makkot', hebrew: 'מכות', perakim: 3 },
  { sefariaName: 'Shevuot', hebrew: 'שבועות', perakim: 8 },
  { sefariaName: 'Eduyot', hebrew: 'עדיות', perakim: 8 },
  { sefariaName: 'Avodah Zarah', hebrew: 'עבודה זרה', perakim: 5 },
  { sefariaName: 'Pirkei Avot', hebrew: 'אבות', perakim: 6 },
  { sefariaName: 'Horayot', hebrew: 'הוריות', perakim: 3 },
  // Kodshim
  { sefariaName: 'Zevachim', hebrew: 'זבחים', perakim: 14 },
  { sefariaName: 'Menachot', hebrew: 'מנחות', perakim: 13 },
  { sefariaName: 'Chullin', hebrew: 'חולין', perakim: 12 },
  { sefariaName: 'Bekhorot', hebrew: 'בכורות', perakim: 9 },
  { sefariaName: 'Arakhin', hebrew: 'ערכין', perakim: 9 },
  { sefariaName: 'Temurah', hebrew: 'תמורה', perakim: 7 },
  { sefariaName: 'Keritot', hebrew: 'כריתות', perakim: 6 },
  { sefariaName: 'Meilah', hebrew: 'מעילה', perakim: 6 },
  { sefariaName: 'Tamid', hebrew: 'תמיד', perakim: 7 },
  { sefariaName: 'Middot', hebrew: 'מידות', perakim: 5 },
  { sefariaName: 'Kinnim', hebrew: 'קינים', perakim: 3 },
  // Tohorot
  { sefariaName: 'Kelim', hebrew: 'כלים', perakim: 30 },
  { sefariaName: 'Oholot', hebrew: 'אהלות', perakim: 18 },
  { sefariaName: 'Negaim', hebrew: 'נגעים', perakim: 14 },
  { sefariaName: 'Parah', hebrew: 'פרה', perakim: 12 },
  { sefariaName: 'Tohorot', hebrew: 'טהרות', perakim: 10 },
  { sefariaName: 'Mikvaot', hebrew: 'מקואות', perakim: 10 },
  { sefariaName: 'Niddah', hebrew: 'נדה', perakim: 10 },
  { sefariaName: 'Makhshirin', hebrew: 'מכשירין', perakim: 6 },
  { sefariaName: 'Zavim', hebrew: 'זבים', perakim: 5 },
  { sefariaName: 'Tevul Yom', hebrew: 'טבול יום', perakim: 4 },
  { sefariaName: 'Yadayim', hebrew: 'ידיים', perakim: 4 },
  { sefariaName: 'Oktzin', hebrew: 'עוקצין', perakim: 3 },
];

const TOTAL_PERAKIM = MISHNA_TRACTATES.reduce((sum, t) => sum + t.perakim, 0);

/** Simchat Torah 5785 = Oct 24, 2024. Cycle starts Oct 25. */
const CYCLE_START_DATE = new Date(2024, 9, 25);
CYCLE_START_DATE.setHours(0, 0, 0, 0);

function daysSinceCycleStart(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const diff = d.getTime() - CYCLE_START_DATE.getTime();
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}

export function getTodayMishnaYomi(): MishnaPerek | null {
  return getMishnaYomiForDate(new Date());
}

export function getMishnaYomiForDate(date: Date): MishnaPerek | null {
  const days = daysSinceCycleStart(date);
  if (days < 0) return null;
  const dayInCycle = days % TOTAL_PERAKIM;
  let remaining = dayInCycle;
  for (const tractate of MISHNA_TRACTATES) {
    if (remaining < tractate.perakim) {
      const perek = remaining + 1;
      return {
        tractate: tractate.sefariaName,
        tractateHebrew: tractate.hebrew,
        perek,
        sefariaRef: `Mishnah ${tractate.sefariaName} ${perek}`,
      };
    }
    remaining -= tractate.perakim;
  }
  return null;
}
