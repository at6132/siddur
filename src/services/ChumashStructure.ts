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
  Eikev: 'עֵקֶב',
  Reeh: 'רְאֵה',
  Shoftim: 'שֹׁפְטִים',
  'Ki Teitzei': 'כִּי־תֵצֵא',
  'Ki Tavo': 'כִּי־תָבוֹא',
  Nitzavim: 'נִצָּבִים',
  Vayeilech: 'וַיֵּלֶךְ',
  HaAzinu: 'הַאֲזִינוּ',
  "V'Zot HaBerachah": 'וְזֹאת הַבְּרָכָה',
};

/** Get sefer name in Hebrew from a Sefaria ref (e.g. "Genesis 1:2" -> "בראשית"). */
export function getSeferHebrewFromRef(ref: string): string {
  const bookName = ref.trim().split(/\s+/)[0] || '';
  const book = CHUMASH_BOOKS.find((b) => b.sefariaName === bookName);
  return book?.hebrew ?? bookName;
}
