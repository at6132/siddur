/**
 * Mishneh Torah structure – 14 books with Hilchot sections and chapter counts.
 * Sefaria ref format: "Mishneh Torah, {sectionName} {chapter}"
 */

export interface RambamSection {
  sefariaName: string;
  hebrew: string;
  chapters: number;
}

export interface RambamBook {
  id: string;
  hebrew: string;
  english: string;
  sections: RambamSection[];
}

/** The 14 books of Mishneh Torah with their Hilchot sections. Sefaria names from hebcal/sefaria. */
export const RAMBAM_BOOKS: RambamBook[] = [
  {
    id: 'madda',
    hebrew: 'מדע',
    english: 'Knowledge',
    sections: [
      { sefariaName: 'Foundations of the Torah', hebrew: 'יסודי התורה', chapters: 10 },
      { sefariaName: 'Human Dispositions', hebrew: 'דעות', chapters: 7 },
      { sefariaName: 'Torah Study', hebrew: 'תלמוד תורה', chapters: 7 },
      { sefariaName: 'Idol Worship', hebrew: 'עבודה זרה', chapters: 12 },
      { sefariaName: 'Repentance', hebrew: 'תשובה', chapters: 10 },
    ],
  },
  {
    id: 'ahavah',
    hebrew: 'אהבה',
    english: 'Love',
    sections: [
      { sefariaName: 'Reading the Shema', hebrew: 'קריאת שמע', chapters: 3 },
      { sefariaName: 'Prayer and the Priestly Blessing', hebrew: 'תפילה וברכת כהנים', chapters: 15 },
      { sefariaName: 'Tefillin', hebrew: 'תפילין', chapters: 8 },
      { sefariaName: 'Mezuzah', hebrew: 'מזוזה', chapters: 6 },
      { sefariaName: 'Scroll of the Torah', hebrew: 'ספר תורה', chapters: 10 },
      { sefariaName: 'Fringes', hebrew: 'ציצית', chapters: 3 },
      { sefariaName: 'Blessings', hebrew: 'ברכות', chapters: 11 },
      { sefariaName: 'Circumcision', hebrew: 'מילה', chapters: 3 },
    ],
  },
  {
    id: 'zemanim',
    hebrew: 'זמנים',
    english: 'Times',
    sections: [
      { sefariaName: 'Sabbath', hebrew: 'שבת', chapters: 30 },
      { sefariaName: 'Eruvin', hebrew: 'עירובין', chapters: 9 },
      { sefariaName: 'Rest on the Tenth', hebrew: 'שביתת עשור', chapters: 3 },
      { sefariaName: 'Rest on a Holiday', hebrew: 'שביתת יו"ט', chapters: 8 },
      { sefariaName: 'Leavened and Unleavened Bread', hebrew: 'חמץ ומצה', chapters: 8 },
      { sefariaName: 'Shofar, Sukkah and Lulav', hebrew: 'שופר וסוכה ולולב', chapters: 8 },
      { sefariaName: 'Shekalim', hebrew: 'שקלים', chapters: 4 },
      { sefariaName: 'Sanctification of the New Moon', hebrew: 'קידוש החודש', chapters: 19 },
      { sefariaName: 'Fasts', hebrew: 'תעניות', chapters: 5 },
      { sefariaName: 'Megillah and Chanukah', hebrew: 'מגילה וחנוכה', chapters: 4 },
    ],
  },
  {
    id: 'nashim',
    hebrew: 'נשים',
    english: 'Women',
    sections: [
      { sefariaName: 'Marriage', hebrew: 'אישות', chapters: 25 },
      { sefariaName: 'Divorce', hebrew: 'גירושין', chapters: 13 },
      { sefariaName: 'Levirate Marriage and Release', hebrew: 'יבום וחליצה', chapters: 9 },
      { sefariaName: 'The Virgin Maiden', hebrew: 'נערה בתולה', chapters: 3 },
      { sefariaName: 'The Wayward Wife', hebrew: 'סוטה', chapters: 6 },
    ],
  },
  {
    id: 'kedushah',
    hebrew: 'קדושה',
    english: 'Holiness',
    sections: [
      { sefariaName: 'Forbidden Sexual Relations', hebrew: 'איסורי ביאה', chapters: 22 },
      { sefariaName: 'Forbidden Foods', hebrew: 'מאכלות אסורות', chapters: 17 },
      { sefariaName: 'Slaughtering', hebrew: 'שחיטה', chapters: 14 },
    ],
  },
  {
    id: 'haflaah',
    hebrew: 'הפלאה',
    english: 'Promises',
    sections: [
      { sefariaName: 'Oaths', hebrew: 'שבועות', chapters: 12 },
      { sefariaName: 'Vows', hebrew: 'נדרים', chapters: 13 },
      { sefariaName: 'Naziriteship', hebrew: 'נזירות', chapters: 10 },
      { sefariaName: 'Evaluations and Devoted Things', hebrew: 'ערכין וחרמין', chapters: 9 },
    ],
  },
  {
    id: 'zeraim',
    hebrew: 'זרעים',
    english: 'Seeds',
    sections: [
      { sefariaName: 'Diverse Species', hebrew: 'כלאים', chapters: 9 },
      { sefariaName: 'Gifts to the Poor', hebrew: 'מתנות עניים', chapters: 10 },
      { sefariaName: 'Heave Offerings', hebrew: 'תרומות', chapters: 15 },
      { sefariaName: 'Tithes', hebrew: 'מעשרות', chapters: 11 },
      { sefariaName: 'Sabbatical and Jubilee', hebrew: 'שמיטה ויובל', chapters: 13 },
      { sefariaName: 'First Fruits', hebrew: 'ביכורים', chapters: 12 },
    ],
  },
  {
    id: 'avodah',
    hebrew: 'עבודה',
    english: 'Service',
    sections: [
      { sefariaName: 'The Chosen House', hebrew: 'בית הבחירה', chapters: 8 },
      { sefariaName: 'Vessels of the Sanctuary', hebrew: 'כלי המקדש', chapters: 10 },
      { sefariaName: 'Entry into the Sanctuary', hebrew: 'ביאת המקדש', chapters: 9 },
      { sefariaName: 'Procedure of the Daily Offerings', hebrew: 'מעשה הקרבנות', chapters: 19 },
      { sefariaName: 'The Passover Offering', hebrew: 'קרבן פסח', chapters: 10 },
      { sefariaName: 'Offerings for Those Who Missed Passover', hebrew: 'תמידין ומוספין', chapters: 10 },
      { sefariaName: 'Offerings for Unintentional Transgressions', hebrew: 'מעילה', chapters: 8 },
      { sefariaName: 'Disqualified from the Sanctuary', hebrew: 'פסולי המוקדשין', chapters: 19 },
      { sefariaName: 'The Temple Service on Yom Kippur', hebrew: 'עבודת יום הכיפורים', chapters: 5 },
    ],
  },
  {
    id: 'korbanot',
    hebrew: 'קורבנות',
    english: 'Sacrifices',
    sections: [
      { sefariaName: 'Animal Offerings', hebrew: 'קרבנות', chapters: 23 },
      { sefariaName: 'Sacrificial Procedure', hebrew: 'פסולי המוקדשין', chapters: 20 },
      { sefariaName: 'Substitution', hebrew: 'תמורה', chapters: 7 },
      { sefariaName: 'Misuse of Sacred Property', hebrew: 'מעילה', chapters: 8 },
    ],
  },
  {
    id: 'taharah',
    hebrew: 'טהרה',
    english: 'Purity',
    sections: [
      { sefariaName: 'Impurity of a Dead Body', hebrew: 'טומאת מת', chapters: 27 },
      { sefariaName: 'Red Heifer', hebrew: 'פרה אדומה', chapters: 19 },
      { sefariaName: 'Leprosy', hebrew: 'טומאת צרעת', chapters: 16 },
      { sefariaName: 'Those Who Defile Bed or Seat', hebrew: 'מטמאי משכב ומושב', chapters: 20 },
      { sefariaName: 'Other Fathers of Impurity', hebrew: 'שאר אבות הטומאות', chapters: 16 },
      { sefariaName: 'Impurity of Foods', hebrew: 'טומאת אוכלין', chapters: 17 },
      { sefariaName: 'Vessels', hebrew: 'כלים', chapters: 28 },
      { sefariaName: 'Immersion Pools', hebrew: 'מקוואות', chapters: 11 },
    ],
  },
  {
    id: 'nezikin',
    hebrew: 'נזיקין',
    english: 'Injuries',
    sections: [
      { sefariaName: 'Damage to Property', hebrew: 'נזקי ממון', chapters: 8 },
      { sefariaName: 'Theft', hebrew: 'גניבה', chapters: 9 },
      { sefariaName: 'Robbery and Lost Property', hebrew: 'גזילה ואבידה', chapters: 16 },
      { sefariaName: 'One Who Injures a Person or Property', hebrew: 'חובל ומזיק', chapters: 8 },
      { sefariaName: 'Murder and Preservation of Life', hebrew: 'רוצח ושמירת נפש', chapters: 13 },
    ],
  },
  {
    id: 'kinyan',
    hebrew: 'קנין',
    english: 'Acquisition',
    sections: [
      { sefariaName: 'Sales', hebrew: 'מכירה', chapters: 30 },
      { sefariaName: 'Acquisition and Gifts', hebrew: 'זכייה ומתנה', chapters: 12 },
      { sefariaName: 'Neighbors', hebrew: 'שכנים', chapters: 14 },
      { sefariaName: 'Agents and Partners', hebrew: 'שלוחין ושותפין', chapters: 10 },
      { sefariaName: 'Slaves', hebrew: 'עבדים', chapters: 9 },
    ],
  },
  {
    id: 'mishpatim',
    hebrew: 'משפטים',
    english: 'Judgments',
    sections: [
      { sefariaName: 'Hiring', hebrew: 'שכירות', chapters: 13 },
      { sefariaName: 'Borrowing and Deposit', hebrew: 'שאלה ופיקדון', chapters: 8 },
      { sefariaName: 'Lender and Borrower', hebrew: 'מלווה ולווה', chapters: 27 },
      { sefariaName: 'Plaintiff and Defendant', hebrew: 'טוען ונטען', chapters: 17 },
      { sefariaName: 'Inheritance', hebrew: 'נחלות', chapters: 11 },
    ],
  },
  {
    id: 'shofetim',
    hebrew: 'שופטים',
    english: 'Judges',
    sections: [
      { sefariaName: 'Courts', hebrew: 'סנהדרין', chapters: 26 },
      { sefariaName: 'Testimony', hebrew: 'עדות', chapters: 22 },
      { sefariaName: 'Rebels', hebrew: 'ממרים', chapters: 7 },
      { sefariaName: 'Mourning', hebrew: 'אבל', chapters: 14 },
      { sefariaName: 'Kings and Wars', hebrew: 'מלכים ומלחמות', chapters: 12 },
    ],
  },
];
