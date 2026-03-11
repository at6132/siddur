/**
 * Chumash (Five Books of Moses) structure for browsing.
 */

export const CHUMASH_BOOKS: { sefariaName: string; hebrew: string; firstRef: string }[] = [
  { sefariaName: 'Genesis', hebrew: 'בראשית', firstRef: 'Genesis 1' },
  { sefariaName: 'Exodus', hebrew: 'שמות', firstRef: 'Exodus 1' },
  { sefariaName: 'Leviticus', hebrew: 'ויקרא', firstRef: 'Leviticus 1' },
  { sefariaName: 'Numbers', hebrew: 'במדבר', firstRef: 'Numbers 1' },
  { sefariaName: 'Deuteronomy', hebrew: 'דברים', firstRef: 'Deuteronomy 1' },
];

/** English parsha name → Hebrew (54 parshiyot). */
export const PARSHA_HEBREW: Record<string, string> = {
  Bereshit: 'בְּרֵאשִׁית',
  Noach: 'נֹחַ',
  'Lech-Lecha': 'לֶךְ־לְךָ',
  Vayeira: 'וַיֵּרָא',
  'Chayei Sarah': 'חַיֵּי שָׂרָה',
  Toldot: 'תּוֹלְדֹת',
  Vayeitzei: 'וַיֵּצֵא',
  Vayishlach: 'וַיִּשְׁלַח',
  Vayeishev: 'וַיֵּשֶׁב',
  Mikeitz: 'מִקֵּץ',
  Vayigash: 'וַיִּגַּשׁ',
  Vayechi: 'וַיְחִי',
  Shemot: 'שְׁמוֹת',
  "Va'eira": 'וָאֵרָא',
  Bo: 'בֹּא',
  Beshalach: 'בְּשַׁלַּח',
  Yitro: 'יִתְרוֹ',
  Mishpatim: 'מִשְׁפָּטִים',
  Terumah: 'תְּרוּמָה',
  Tetzaveh: 'תְּצַוֶּה',
  'Ki Tisa': 'כִּי תִשָּׂא',
  Vayakhel: 'וַיַּקְהֵל',
  Pekudei: 'פְקוּדֵי',
  Vayikra: 'וַיִּקְרָא',
  Tzav: 'צַו',
  Shemini: 'שְּׁמִינִי',
  Tazria: 'תַזְרִיעַ',
  Metzora: 'מְּצֹרָע',
  Acharei: 'אַחֲרֵי מוֹת',
  Kedoshim: 'קְדֹשִׁים',
  Emor: 'אֱמֹר',
  Behar: 'בְּהַר',
  Bechukotai: 'בְּחֻקֹּתַי',
  Bamidbar: 'בְּמִדְבַּר',
  Nasso: 'נָשֹׂא',
  "Beha'alotcha": 'בְּהַעֲלֹתְךָ',
  "Sh'lach": 'שְׁלַח־לְךָ',
  Korach: 'קֹרַח',
  Chukat: 'חֻקַּת',
  Balak: 'בָּלָק',
  Pinchas: 'פִּינְחָס',
  Matot: 'מַּטּוֹת',
  Masei: 'מַסְעֵי',
  Devarim: 'דְּבָרִים',
  Vaetchanan: 'וָאֶתְחַנַּן',
  "Va'etchanan": 'וָאֶתְחַנַּן',
  Eikev: 'עֵקֶב',
  Reeh: 'רְאֵה',
  "Re'eh": 'רְאֵה',
  Shoftim: 'שֹׁפְטִים',
  'Ki Teitzei': 'כִּי־תֵצֵא',
  'Ki Tavo': 'כִּי־תָבוֹא',
  Nitzavim: 'נִצָּבִים',
  Vayeilech: 'וַיֵּלֶךְ',
  HaAzinu: 'הַאֲזִינוּ',
  "V'Zot HaBerachah": 'וְזֹאת הַבְּרָכָה',
  'Vezot HaBerachah': 'וְזֹאת הַבְּרָכָה',
};

/** Get sefer name in Hebrew from a Sefaria ref (e.g. "Genesis 1:2" -> "בראשית"). */
export function getSeferHebrewFromRef(ref: string): string {
  const bookName = ref.trim().split(/\s+/)[0] || '';
  const book = CHUMASH_BOOKS.find((b) => b.sefariaName === bookName);
  return book?.hebrew ?? bookName;
}

export interface ParshahOption {
  parsha: string;   // English (for Sefaria/Shneyim Mikra)
  hebrew: string;
  ref: string;      // Full parsha range for picker (entire parsha); Shneyim Mikra uses its own aliyah ref
}

/** Parshiyot per book (sefariaName). ref = full parsha range (verse format for Sefaria API). */
export const PARSHIYOT_BY_BOOK: Record<string, ParshahOption[]> = {
  Genesis: [
    { parsha: 'Bereshit', hebrew: 'בְּרֵאשִׁית', ref: 'Genesis 1:1-6:8' },
    { parsha: 'Noach', hebrew: 'נֹחַ', ref: 'Genesis 6:9-11:32' },
    { parsha: 'Lech-Lecha', hebrew: 'לֶךְ־לְךָ', ref: 'Genesis 12:1-17:27' },
    { parsha: 'Vayeira', hebrew: 'וַיֵּרָא', ref: 'Genesis 18:1-22:24' },
    { parsha: 'Chayei Sarah', hebrew: 'חַיֵּי שָׂרָה', ref: 'Genesis 23:1-25:18' },
    { parsha: 'Toldot', hebrew: 'תּוֹלְדֹת', ref: 'Genesis 25:19-28:9' },
    { parsha: 'Vayeitzei', hebrew: 'וַיֵּצֵא', ref: 'Genesis 28:10-32:3' },
    { parsha: 'Vayishlach', hebrew: 'וַיִּשְׁלַח', ref: 'Genesis 32:4-36:43' },
    { parsha: 'Vayeishev', hebrew: 'וַיֵּשֶׁב', ref: 'Genesis 37:1-40:23' },
    { parsha: 'Mikeitz', hebrew: 'מִקֵּץ', ref: 'Genesis 41:1-44:17' },
    { parsha: 'Vayigash', hebrew: 'וַיִּגַּשׁ', ref: 'Genesis 44:18-47:27' },
    { parsha: 'Vayechi', hebrew: 'וַיְחִי', ref: 'Genesis 47:28-50:26' },
  ],
  Exodus: [
    { parsha: 'Shemot', hebrew: 'שְׁמוֹת', ref: 'Exodus 1:1-6:1' },
    { parsha: "Va'eira", hebrew: 'וָאֵרָא', ref: 'Exodus 6:2-9:35' },
    { parsha: 'Bo', hebrew: 'בֹּא', ref: 'Exodus 10:1-13:16' },
    { parsha: 'Beshalach', hebrew: 'בְּשַׁלַּח', ref: 'Exodus 13:17-17:16' },
    { parsha: 'Yitro', hebrew: 'יִתְרוֹ', ref: 'Exodus 18:1-20:23' },
    { parsha: 'Mishpatim', hebrew: 'מִשְׁפָּטִים', ref: 'Exodus 21:1-24:18' },
    { parsha: 'Terumah', hebrew: 'תְּרוּמָה', ref: 'Exodus 25:1-27:19' },
    { parsha: 'Tetzaveh', hebrew: 'תְּצַוֶּה', ref: 'Exodus 27:20-30:10' },
    { parsha: 'Ki Tisa', hebrew: 'כִּי תִשָּׂא', ref: 'Exodus 30:11-34:35' },
    { parsha: 'Vayakhel', hebrew: 'וַיַּקְהֵל', ref: 'Exodus 35:1-38:20' },
    { parsha: 'Pekudei', hebrew: 'פְקוּדֵי', ref: 'Exodus 38:21-40:38' },
  ],
  Leviticus: [
    { parsha: 'Vayikra', hebrew: 'וַיִּקְרָא', ref: 'Leviticus 1:1-5:26' },
    { parsha: 'Tzav', hebrew: 'צַו', ref: 'Leviticus 6:1-8:36' },
    { parsha: 'Shemini', hebrew: 'שְּׁמִינִי', ref: 'Leviticus 9:1-11:47' },
    { parsha: 'Tazria', hebrew: 'תַזְרִיעַ', ref: 'Leviticus 12:1-13:59' },
    { parsha: 'Metzora', hebrew: 'מְּצֹרָע', ref: 'Leviticus 14:1-15:33' },
    { parsha: 'Acharei', hebrew: 'אַחֲרֵי מוֹת', ref: 'Leviticus 16:1-18:30' },
    { parsha: 'Kedoshim', hebrew: 'קְדֹשִׁים', ref: 'Leviticus 19:1-20:27' },
    { parsha: 'Emor', hebrew: 'אֱמֹר', ref: 'Leviticus 21:1-24:23' },
    { parsha: 'Behar', hebrew: 'בְּהַר', ref: 'Leviticus 25:1-26:2' },
    { parsha: 'Bechukotai', hebrew: 'בְּחֻקֹּתַי', ref: 'Leviticus 26:3-27:34' },
  ],
  Numbers: [
    { parsha: 'Bamidbar', hebrew: 'בְּמִדְבַּר', ref: 'Numbers 1:1-4:20' },
    { parsha: 'Nasso', hebrew: 'נָשֹׂא', ref: 'Numbers 4:21-7:89' },
    { parsha: "Beha'alotcha", hebrew: 'בְּהַעֲלֹתְךָ', ref: 'Numbers 8:1-12:16' },
    { parsha: "Sh'lach", hebrew: 'שְׁלַח־לְךָ', ref: 'Numbers 13:1-15:41' },
    { parsha: 'Korach', hebrew: 'קֹרַח', ref: 'Numbers 16:1-18:32' },
    { parsha: 'Chukat', hebrew: 'חֻקַּת', ref: 'Numbers 19:1-22:1' },
    { parsha: 'Balak', hebrew: 'בָּלָק', ref: 'Numbers 22:2-25:9' },
    { parsha: 'Pinchas', hebrew: 'פִּינְחָס', ref: 'Numbers 25:10-30:1' },
    { parsha: 'Matot', hebrew: 'מַּטּוֹת', ref: 'Numbers 30:2-32:42' },
    { parsha: 'Masei', hebrew: 'מַסְעֵי', ref: 'Numbers 33:1-36:13' },
  ],
  Deuteronomy: [
    { parsha: 'Devarim', hebrew: 'דְּבָרִים', ref: 'Deuteronomy 1:1-3:22' },
    { parsha: 'Vaetchanan', hebrew: 'וָאֶתְחַנַּן', ref: 'Deuteronomy 3:23-7:11' },
    { parsha: 'Eikev', hebrew: 'עֵקֶב', ref: 'Deuteronomy 7:12-11:25' },
    { parsha: 'Reeh', hebrew: 'רְאֵה', ref: 'Deuteronomy 11:26-16:17' },
    { parsha: 'Shoftim', hebrew: 'שֹׁפְטִים', ref: 'Deuteronomy 16:18-21:9' },
    { parsha: 'Ki Teitzei', hebrew: 'כִּי־תֵצֵא', ref: 'Deuteronomy 21:10-25:19' },
    { parsha: 'Ki Tavo', hebrew: 'כִּי־תָבוֹא', ref: 'Deuteronomy 26:1-29:8' },
    { parsha: 'Nitzavim', hebrew: 'נִצָּבִים', ref: 'Deuteronomy 29:9-30:20' },
    { parsha: 'Vayeilech', hebrew: 'וַיֵּלֶךְ', ref: 'Deuteronomy 31:1-31:30' },
    { parsha: 'HaAzinu', hebrew: 'הַאֲזִינוּ', ref: 'Deuteronomy 32:1-32:52' },
    { parsha: "V'Zot HaBerachah", hebrew: 'וְזֹאת הַבְּרָכָה', ref: 'Deuteronomy 33:1-34:12' },
  ],
};
