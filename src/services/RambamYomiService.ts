/**
 * Rambam Yomi Service
 * Fetches today's Rambam (Mishneh Torah) from Hebcal API.
 * Supports 3 chapters/day (dr3) and 1 chapter/day (dr1) cycles.
 * Includes structure for browsing Mishneh Torah by book and section.
 */

/** Mishneh Torah section (Hilchot) – Sefaria ref: "Mishneh Torah, {sefariaName} {chapter}" */
export interface RambamSection {
  sefariaName: string;
  hebrew: string;
  chapters: number;
}

/** The 14 books of Mishneh Torah with their sections. */
export const RAMBAM_BOOKS: {
  hebrew: string;
  english: string;
  sections: RambamSection[];
}[] = [
  {
    hebrew: 'ספר המדע',
    english: 'Book of Knowledge',
    sections: [
      { sefariaName: 'Foundations of the Torah', hebrew: 'יסודי התורה', chapters: 10 },
      { sefariaName: 'Human Dispositions', hebrew: 'דעות', chapters: 7 },
      { sefariaName: 'Torah Study', hebrew: 'תלמוד תורה', chapters: 7 },
      { sefariaName: 'Idol Worship', hebrew: 'עבודה זרה', chapters: 12 },
      { sefariaName: 'Repentance', hebrew: 'תשובה', chapters: 10 },
    ],
  },
  {
    hebrew: 'ספר אהבה',
    english: 'Book of Love',
    sections: [
      { sefariaName: 'Reading the Shema', hebrew: 'קריאת שמע', chapters: 3 },
      { sefariaName: 'Prayer and the Priestly Blessing', hebrew: 'תפילה וברכת כהנים', chapters: 15 },
      { sefariaName: 'Tefillin', hebrew: 'תפילין', chapters: 8 },
      { sefariaName: 'Mezuzah', hebrew: 'מזוזה', chapters: 6 },
      { sefariaName: 'Sefer Torah', hebrew: 'ספר תורה', chapters: 10 },
      { sefariaName: 'Fringes', hebrew: 'ציצית', chapters: 3 },
      { sefariaName: 'Blessings', hebrew: 'ברכות', chapters: 11 },
      { sefariaName: 'Circumcision', hebrew: 'מילה', chapters: 3 },
    ],
  },
  {
    hebrew: 'ספר זמנים',
    english: 'Book of Times',
    sections: [
      { sefariaName: 'Sabbath', hebrew: 'שבת', chapters: 30 },
      { sefariaName: 'Eruvin', hebrew: 'עירובין', chapters: 9 },
      { sefariaName: 'Rest on the Tenth', hebrew: 'שביתת עשור', chapters: 3 },
      { sefariaName: 'Rest on a Holiday', hebrew: 'שביתת יום טוב', chapters: 8 },
      { sefariaName: 'Leavened and Unleavened Bread', hebrew: 'חמץ ומצה', chapters: 8 },
      { sefariaName: 'Shofar, Sukkah and Lulav', hebrew: 'שופר וסוכה ולולב', chapters: 8 },
      { sefariaName: 'Shekalim', hebrew: 'שקלים', chapters: 4 },
      { sefariaName: 'Sanctification of the New Month', hebrew: 'קידוש החודש', chapters: 19 },
      { sefariaName: 'Fasts', hebrew: 'תעניות', chapters: 5 },
      { sefariaName: 'Megillah and Chanukah', hebrew: 'מגילה וחנוכה', chapters: 4 },
    ],
  },
  {
    hebrew: 'ספר נשים',
    english: 'Book of Women',
    sections: [
      { sefariaName: 'Marriage', hebrew: 'אישות', chapters: 25 },
      { sefariaName: 'Divorce', hebrew: 'גירושין', chapters: 13 },
      { sefariaName: 'Levirate Marriage', hebrew: 'יבום וחליצה', chapters: 9 },
      { sefariaName: 'Virgin Maiden', hebrew: 'נערה בתולה', chapters: 3 },
      { sefariaName: 'Wayward Wife', hebrew: 'סוטה', chapters: 6 },
    ],
  },
  {
    hebrew: 'ספר קדושה',
    english: 'Book of Holiness',
    sections: [
      { sefariaName: 'Forbidden Sexual Relations', hebrew: 'איסורי ביאה', chapters: 22 },
      { sefariaName: 'Forbidden Foods', hebrew: 'מאכלות אסורות', chapters: 17 },
      { sefariaName: 'Ritual Slaughter', hebrew: 'שחיטה', chapters: 14 },
    ],
  },
  {
    hebrew: 'ספר הפלאה',
    english: 'Book of Promises',
    sections: [
      { sefariaName: 'Oaths', hebrew: 'שבועות', chapters: 12 },
      { sefariaName: 'Vows', hebrew: 'נדרים', chapters: 13 },
      { sefariaName: 'Naziriteship', hebrew: 'נזירות', chapters: 10 },
      { sefariaName: 'Evaluations and Devoted Things', hebrew: 'ערכין וחרמין', chapters: 9 },
    ],
  },
  {
    hebrew: 'ספר זרעים',
    english: 'Book of Seeds',
    sections: [
      { sefariaName: 'Mixed Species', hebrew: 'כלאיים', chapters: 10 },
      { sefariaName: 'Gifts to the Poor', hebrew: 'מתנות עניים', chapters: 10 },
      { sefariaName: 'Heave Offerings', hebrew: 'תרומות', chapters: 15 },
      { sefariaName: 'Tithe', hebrew: 'מעשרות', chapters: 14 },
      { sefariaName: 'Second Tithe', hebrew: 'מעשר שני', chapters: 11 },
      { sefariaName: 'First Fruits', hebrew: 'ביכורים', chapters: 6 },
      { sefariaName: 'Sabbatical and Jubilee Years', hebrew: 'שמיטה ויובל', chapters: 13 },
    ],
  },
  {
    hebrew: 'ספר עבודה',
    english: 'Book of Service',
    sections: [
      { sefariaName: 'The Chosen House', hebrew: 'בית הבחירה', chapters: 8 },
      { sefariaName: 'Vessels of the Sanctuary', hebrew: 'כלי המקדש', chapters: 10 },
      { sefariaName: 'Entry Into the Sanctuary', hebrew: 'ביאת המקדש', chapters: 9 },
      { sefariaName: 'Sacrificial Procedure', hebrew: 'מעשה הקרבנות', chapters: 19 },
      { sefariaName: 'Daily and Additional Offerings', hebrew: 'תמידין ומוספין', chapters: 10 },
      { sefariaName: 'Sacrifices Rendered Unfit', hebrew: 'פסולי המוקדשין', chapters: 19 },
      { sefariaName: 'Temple Service on Yom Kippur', hebrew: 'עבודת יום הכיפורים', chapters: 5 },
    ],
  },
  {
    hebrew: 'ספר קרבנות',
    english: 'Book of Sacrifices',
    sections: [
      { sefariaName: 'Paschal Offering', hebrew: 'קרבן פסח', chapters: 10 },
      { sefariaName: 'Festival Offering', hebrew: 'חגיגה', chapters: 3 },
      { sefariaName: 'Firstlings', hebrew: 'בכורות', chapters: 9 },
      { sefariaName: 'Offerings for Unintentional Transgressions', hebrew: 'שגגות', chapters: 15 },
      { sefariaName: 'Offerings for Those with Incomplete Atonement', hebrew: 'מעילה', chapters: 4 },
    ],
  },
  {
    hebrew: 'ספר טהרה',
    english: 'Book of Ritual Purity',
    sections: [
      { sefariaName: 'Impurity of a Human Corpse', hebrew: 'טומאת מת', chapters: 20 },
      { sefariaName: 'Red Heifer', hebrew: 'פרה אדומה', chapters: 16 },
      { sefariaName: 'Impurity of Leprosy', hebrew: 'טומאת צרעת', chapters: 16 },
      { sefariaName: 'Those Who Convey Impurity', hebrew: 'מטמאי משכב ומושב', chapters: 12 },
      { sefariaName: 'Other Sources of Impurity', hebrew: 'שאר אבות הטומאות', chapters: 18 },
      { sefariaName: 'Purity of Foods', hebrew: 'טומאת אוכלין', chapters: 17 },
      { sefariaName: 'Vessels', hebrew: 'כלים', chapters: 28 },
      { sefariaName: 'Immersion Pools', hebrew: 'מקואות', chapters: 11 },
    ],
  },
  {
    hebrew: 'ספר נזיקין',
    english: 'Book of Injuries',
    sections: [
      { sefariaName: 'Murderer and the Preservation of Life', hebrew: 'רוצח ושמירת נפש', chapters: 14 },
      { sefariaName: 'Theft', hebrew: 'גניבה', chapters: 9 },
      { sefariaName: 'Robbery and Lost Property', hebrew: 'גזילה ואבידה', chapters: 18 },
      { sefariaName: 'One Who Injures a Person or Property', hebrew: 'חובל ומזיק', chapters: 8 },
      { sefariaName: 'Damage to Property', hebrew: 'נזקי ממון', chapters: 14 },
    ],
  },
  {
    hebrew: 'ספר קניין',
    english: 'Book of Acquisition',
    sections: [
      { sefariaName: 'Sales', hebrew: 'מכירה', chapters: 30 },
      { sefariaName: 'Acquisition and Gifts', hebrew: 'זכייה ומתנה', chapters: 12 },
      { sefariaName: 'Neighbors', hebrew: 'שכנים', chapters: 14 },
      { sefariaName: 'Agents and Partners', hebrew: 'שלוחין ושותפין', chapters: 10 },
      { sefariaName: 'Slaves', hebrew: 'עבדים', chapters: 9 },
    ],
  },
  {
    hebrew: 'ספר משפטים',
    english: 'Book of Judgments',
    sections: [
      { sefariaName: 'Hiring', hebrew: 'שכירות', chapters: 13 },
      { sefariaName: 'Borrowing and Deposit', hebrew: 'שאלה ופקדון', chapters: 8 },
      { sefariaName: 'Lender and Borrower', hebrew: 'מלווה ולווה', chapters: 27 },
      { sefariaName: 'Plaintiff and Defendant', hebrew: 'טוען ונטען', chapters: 15 },
      { sefariaName: 'Inheritance', hebrew: 'נחלות', chapters: 12 },
    ],
  },
  {
    hebrew: 'ספר שופטים',
    english: 'Book of Judges',
    sections: [
      { sefariaName: 'Sanhedrin', hebrew: 'סנהדרין', chapters: 26 },
      { sefariaName: 'Testimony', hebrew: 'עדות', chapters: 24 },
      { sefariaName: 'Rebels', hebrew: 'ממרים', chapters: 7 },
      { sefariaName: 'Mourning', hebrew: 'אבל', chapters: 14 },
      { sefariaName: 'Kings and Wars', hebrew: 'מלכים ומלחמות', chapters: 12 },
    ],
  },
];

export interface RambamYomiResult {
  /** Display title, e.g. "Mishneh Torah, Hilchot Shabbat 1-3" */
  title: string;
  /** Sefaria ref for API, e.g. "Mishneh Torah, Hilchot Shabbat 1-3" */
  sefariaRef: string;
  /** Sefaria URL from Hebcal link */
  link?: string;
}

/**
 * Fetch today's Rambam Yomi from Hebcal.
 * Uses 3-chapters-per-day cycle (dr3) by default; set dr1 for 1-chapter cycle.
 */
export async function getTodayRambamYomi(
  chaptersPerDay: 1 | 3 = 3
): Promise<RambamYomiResult | null> {
  return getRambamYomiForDate(new Date(), chaptersPerDay);
}

/**
 * Fetch Rambam Yomi for a given date.
 */
export async function getRambamYomiForDate(
  date: Date,
  chaptersPerDay: 1 | 3 = 3
): Promise<RambamYomiResult | null> {
  try {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const param = chaptersPerDay === 3 ? 'dr3' : 'dr1';
    const res = await fetch(
      `https://www.hebcal.com/hebcal?cfg=json&v=1&${param}=on&start=${dateStr}&end=${dateStr}`
    );
    const data = await res.json();
    const items = data?.items ?? [];

    // Hebcal returns rambam with category 'dailyRambam3' or 'dailyRambam1'
    const item = items.find(
      (e: { category?: string; title?: string; link?: string }) =>
        e.category === 'dailyRambam3' ||
        e.category === 'dailyRambam1' ||
        e.category === 'rambam' ||
        (e.link && String(e.link).includes('Mishneh_Torah'))
    );

    if (!item?.title?.trim()) return null;

    const title = item.title.trim();
    const link = item.link?.trim();

    // Build Sefaria ref from link. Hebcal link: .../Mishneh_Torah%2C_Plaintiff_and_Defendant.13-15
    // Sefaria ref: "Mishneh Torah, Plaintiff and Defendant 13-15"
    let sefariaRef = title;
    if (link) {
      try {
        const match = link.match(/sefaria\.org\/([^?]+)/);
        if (match) {
          const path = decodeURIComponent(match[1]);
          // path like "Mishneh Torah, Plaintiff and Defendant.13-15"
          const dotIdx = path.indexOf('.');
          if (dotIdx > 0) {
            const book = path.substring(0, dotIdx).replace(/_/g, ' ');
            const range = path.substring(dotIdx + 1);
            sefariaRef = `${book} ${range}`;
          }
        }
      } catch {
        // fallback: "Mishneh Torah, " + title
        sefariaRef = `Mishneh Torah, ${title}`;
      }
    } else {
      sefariaRef = `Mishneh Torah, ${title}`;
    }

    return { title, sefariaRef, link };
  } catch {
    return null;
  }
}
