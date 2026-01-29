/**
 * Shemoneh Esrei (Amidah) - The 18/19 Blessings
 * Core weekday Amidah with all brachos
 */

import { Prayer, PrayerText } from './types';

export interface AmidahBracha {
  number: number;
  name: string;
  nameHebrew: string;
  theme: string;
  opening: PrayerText;
  body: PrayerText;
  closing: PrayerText;
  // Where insertions go
  insertionPoints?: {
    afterOpening?: string[];
    beforeClosing?: string[];
  };
}

export const SHEMONEH_ESREI_BRACHOS: AmidahBracha[] = [
  // === FIRST THREE - PRAISE ===
  {
    number: 1,
    name: 'Avos',
    nameHebrew: 'אבות',
    theme: 'Patriarchs - Divine protection through the merit of our ancestors',
    opening: {
      hebrew: 'בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ וֵאלֹהֵי אֲבוֹתֵינוּ, אֱלֹהֵי אַבְרָהָם, אֱלֹהֵי יִצְחָק, וֵאלֹהֵי יַעֲקֹב',
      transliteration: 'Baruch Atah Adonai, Eloheinu v\'Elohei avoteinu, Elohei Avraham, Elohei Yitzchak, v\'Elohei Ya\'akov',
      english: 'Blessed are You, Lord our God and God of our ancestors, God of Abraham, God of Isaac, and God of Jacob',
    },
    body: {
      hebrew: 'הָאֵל הַגָּדוֹל הַגִּבּוֹר וְהַנּוֹרָא, אֵל עֶלְיוֹן, גּוֹמֵל חֲסָדִים טוֹבִים, וְקוֹנֵה הַכֹּל, וְזוֹכֵר חַסְדֵי אָבוֹת, וּמֵבִיא גוֹאֵל לִבְנֵי בְנֵיהֶם לְמַעַן שְׁמוֹ בְּאַהֲבָה.',
      transliteration: 'Ha\'El hagadol hagibor v\'hanora, El elyon, gomel chasadim tovim, v\'koneh hakol, v\'zocher chasdei avot, u\'mevi go\'el livnei v\'neihem l\'ma\'an sh\'mo b\'ahavah.',
      english: 'The great, mighty, and awesome God, supreme God, who bestows bountiful kindness, who creates all, who remembers the piety of the Patriarchs, and who brings a redeemer to their children\'s children, for the sake of His Name, with love.',
    },
    closing: {
      hebrew: 'מֶלֶךְ עוֹזֵר וּמוֹשִׁיעַ וּמָגֵן. בָּרוּךְ אַתָּה יְיָ, מָגֵן אַבְרָהָם.',
      transliteration: 'Melech ozer u\'moshia u\'magen. Baruch Atah Adonai, magen Avraham.',
      english: 'King, Helper, Savior, and Shield. Blessed are You, Lord, Shield of Abraham.',
    },
    insertionPoints: {
      beforeClosing: ['zochreinu_l\'chaim'], // Aseres Yemei Teshuva
    },
  },
  {
    number: 2,
    name: 'Gevuros',
    nameHebrew: 'גבורות',
    theme: 'Divine Might - Power over life and death',
    opening: {
      hebrew: 'אַתָּה גִּבּוֹר לְעוֹלָם אֲדֹנָי, מְחַיֵּה מֵתִים אַתָּה, רַב לְהוֹשִׁיעַ.',
      transliteration: 'Atah gibor l\'olam Adonai, m\'chayeh metim Atah, rav l\'hoshia.',
      english: 'You are mighty forever, my Lord; You resurrect the dead; You are powerful to save.',
    },
    body: {
      hebrew: `[מַשִּׁיב הָרוּחַ וּמוֹרִיד הַגֶּשֶׁם / מוֹרִיד הַטָּל]

מְכַלְכֵּל חַיִּים בְּחֶסֶד, מְחַיֵּה מֵתִים בְּרַחֲמִים רַבִּים, סוֹמֵךְ נוֹפְלִים, וְרוֹפֵא חוֹלִים, וּמַתִּיר אֲסוּרִים, וּמְקַיֵּם אֱמוּנָתוֹ לִישֵׁנֵי עָפָר. מִי כָמוֹךָ בַּעַל גְּבוּרוֹת, וּמִי דּוֹמֶה לָּךְ, מֶלֶךְ מֵמִית וּמְחַיֶּה וּמַצְמִיחַ יְשׁוּעָה.`,
      transliteration: '[Mashiv haruach u\'morid hageshem / Morid hatal] M\'chalkel chaim b\'chesed, m\'chayeh metim b\'rachamim rabim...',
      english: '[Who causes the wind to blow and the rain to fall / Who causes the dew to fall] He sustains the living with kindness, resurrects the dead with great mercy, supports the falling, heals the sick, releases the bound, and fulfills His trust to those who sleep in the dust. Who is like You, mighty One! And who can be compared to You, King, who brings death and restores life, and causes salvation to sprout.',
      instructions: 'In winter say "Mashiv Haruach"; in summer, Sefard says "Morid Hatal"',
    },
    closing: {
      hebrew: 'וְנֶאֱמָן אַתָּה לְהַחֲיוֹת מֵתִים. בָּרוּךְ אַתָּה יְיָ, מְחַיֵּה הַמֵּתִים.',
      transliteration: 'V\'ne\'eman Atah l\'hachayot metim. Baruch Atah Adonai, m\'chayeh hametim.',
      english: 'And You are faithful to revive the dead. Blessed are You, Lord, who revives the dead.',
    },
    insertionPoints: {
      afterOpening: ['mashiv_haruach', 'morid_hatal'],
      beforeClosing: ['mi_chamocha'], // Aseres Yemei Teshuva
    },
  },
  {
    number: 3,
    name: 'Kedushas Hashem',
    nameHebrew: 'קדושת השם',
    theme: 'Holiness of God\'s Name',
    opening: {
      hebrew: 'אַתָּה קָדוֹשׁ וְשִׁמְךָ קָדוֹשׁ, וּקְדוֹשִׁים בְּכָל יוֹם יְהַלְלוּךָ סֶּלָה.',
      transliteration: 'Atah kadosh v\'shimcha kadosh, u\'k\'doshim b\'chol yom y\'hal\'lucha selah.',
      english: 'You are holy and Your Name is holy, and holy ones praise You every day, Selah.',
    },
    body: {
      hebrew: '',
      english: '',
    },
    closing: {
      hebrew: 'בָּרוּךְ אַתָּה יְיָ, הָאֵל הַקָּדוֹשׁ.',
      transliteration: 'Baruch Atah Adonai, ha\'El hakadosh.',
      english: 'Blessed are You, Lord, the holy God.',
      instructions: 'During Aseres Yemei Teshuva: "HaMelech Hakadosh" - the holy King',
    },
  },

  // === MIDDLE THIRTEEN - REQUESTS ===
  {
    number: 4,
    name: 'Binah',
    nameHebrew: 'בינה',
    theme: 'Understanding and Wisdom',
    opening: {
      hebrew: 'אַתָּה חוֹנֵן לְאָדָם דַּעַת, וּמְלַמֵּד לֶאֱנוֹשׁ בִּינָה.',
      transliteration: 'Atah chonen l\'adam da\'at, u\'m\'lamed le\'enosh binah.',
      english: 'You graciously bestow knowledge upon man and teach mortals understanding.',
    },
    body: {
      hebrew: '',
      english: '',
    },
    closing: {
      hebrew: 'חָנֵּנוּ מֵאִתְּךָ דֵּעָה בִּינָה וְהַשְׂכֵּל. בָּרוּךְ אַתָּה יְיָ, חוֹנֵן הַדָּעַת.',
      transliteration: 'Choneinu me\'it\'cha de\'ah binah v\'haskel. Baruch Atah Adonai, chonen hada\'at.',
      english: 'Graciously bestow upon us from You wisdom, understanding, and knowledge. Blessed are You, Lord, who graciously bestows knowledge.',
    },
  },
  {
    number: 5,
    name: 'Teshuvah',
    nameHebrew: 'תשובה',
    theme: 'Repentance',
    opening: {
      hebrew: 'הֲשִׁיבֵנוּ אָבִינוּ לְתוֹרָתֶךָ, וְקָרְבֵנוּ מַלְכֵּנוּ לַעֲבוֹדָתֶךָ, וְהַחֲזִירֵנוּ בִּתְשׁוּבָה שְׁלֵמָה לְפָנֶיךָ.',
      transliteration: 'Hashiveinu Avinu l\'Toratecha, v\'karveinu Malkeinu la\'avodatecha, v\'hachazireinu bi\'tshuvah sh\'leimah l\'fanecha.',
      english: 'Return us, our Father, to Your Torah; bring us near, our King, to Your service; and bring us back in complete repentance before You.',
    },
    body: {
      hebrew: '',
      english: '',
    },
    closing: {
      hebrew: 'בָּרוּךְ אַתָּה יְיָ, הָרוֹצֶה בִתְשׁוּבָה.',
      transliteration: 'Baruch Atah Adonai, harotzeh bi\'tshuvah.',
      english: 'Blessed are You, Lord, who desires repentance.',
    },
  },
  {
    number: 6,
    name: 'Selichah',
    nameHebrew: 'סליחה',
    theme: 'Forgiveness',
    opening: {
      hebrew: 'סְלַח לָנוּ אָבִינוּ כִּי חָטָאנוּ, מְחַל לָנוּ מַלְכֵּנוּ כִּי פָשָׁעְנוּ, כִּי מוֹחֵל וְסוֹלֵחַ אָתָּה.',
      transliteration: 'S\'lach lanu Avinu ki chatanu, m\'chal lanu Malkeinu ki fashanu, ki mochel v\'sole\'ach Atah.',
      english: 'Forgive us, our Father, for we have sinned; pardon us, our King, for we have transgressed; for You are a pardoner and forgiver.',
    },
    body: {
      hebrew: '',
      english: '',
    },
    closing: {
      hebrew: 'בָּרוּךְ אַתָּה יְיָ, חַנּוּן הַמַּרְבֶּה לִסְלֹחַ.',
      transliteration: 'Baruch Atah Adonai, chanun hamarbeh lislo\'ach.',
      english: 'Blessed are You, Lord, gracious One who forgives abundantly.',
    },
  },
  {
    number: 7,
    name: 'Geulah',
    nameHebrew: 'גאולה',
    theme: 'Redemption',
    opening: {
      hebrew: 'רְאֵה בְעָנְיֵנוּ, וְרִיבָה רִיבֵנוּ, וּגְאָלֵנוּ מְהֵרָה לְמַעַן שְׁמֶךָ, כִּי גּוֹאֵל חָזָק אָתָּה.',
      transliteration: 'R\'eh v\'onyeinu, v\'rivah riveinu, u\'g\'aleinu m\'herah l\'ma\'an sh\'mecha, ki go\'el chazak Atah.',
      english: 'Look upon our affliction and wage our battle; redeem us speedily for the sake of Your Name, for You are a powerful Redeemer.',
    },
    body: {
      hebrew: '',
      english: '',
    },
    closing: {
      hebrew: 'בָּרוּךְ אַתָּה יְיָ, גּוֹאֵל יִשְׂרָאֵל.',
      transliteration: 'Baruch Atah Adonai, go\'el Yisrael.',
      english: 'Blessed are You, Lord, Redeemer of Israel.',
    },
    insertionPoints: {
      beforeClosing: ['aneinu'], // Fast days - Shaliach Tzibur only
    },
  },
  {
    number: 8,
    name: 'Refuah',
    nameHebrew: 'רפואה',
    theme: 'Healing',
    opening: {
      hebrew: 'רְפָאֵנוּ יְיָ וְנֵרָפֵא, הוֹשִׁיעֵנוּ וְנִוָּשֵׁעָה, כִּי תְהִלָּתֵנוּ אָתָּה.',
      transliteration: 'R\'fa\'einu Adonai v\'nerafeh, hoshi\'einu v\'nivashea, ki t\'hilateinu Atah.',
      english: 'Heal us, Lord, and we will be healed; save us and we will be saved; for You are our praise.',
    },
    body: {
      hebrew: 'וְהַעֲלֵה רְפוּאָה שְׁלֵמָה לְכָל מַכּוֹתֵינוּ, כִּי אֵל מֶלֶךְ רוֹפֵא נֶאֱמָן וְרַחֲמָן אָתָּה.',
      transliteration: 'V\'ha\'aleh r\'fuah sh\'leimah l\'chol makoteinu, ki El Melech rofeh ne\'eman v\'rachaman Atah.',
      english: 'And bring complete healing to all our wounds, for You are God, King, faithful and compassionate Healer.',
      instructions: 'Personal prayers for the sick may be added here',
    },
    closing: {
      hebrew: 'בָּרוּךְ אַתָּה יְיָ, רוֹפֵא חוֹלֵי עַמּוֹ יִשְׂרָאֵל.',
      transliteration: 'Baruch Atah Adonai, rofeh cholei amo Yisrael.',
      english: 'Blessed are You, Lord, who heals the sick of His people Israel.',
    },
  },
  {
    number: 9,
    name: 'Birkas Hashanim',
    nameHebrew: 'ברכת השנים',
    theme: 'Prosperity and Livelihood',
    opening: {
      hebrew: 'בָּרֵךְ עָלֵינוּ יְיָ אֱלֹהֵינוּ אֶת הַשָּׁנָה הַזֹּאת וְאֶת כָּל מִינֵי תְבוּאָתָהּ לְטוֹבָה,',
      transliteration: 'Barech aleinu Adonai Eloheinu et hashanah hazot v\'et kol minei t\'vuatah l\'tovah,',
      english: 'Bless for us, Lord our God, this year and all its types of produce for good,',
    },
    body: {
      hebrew: '[וְתֵן בְּרָכָה / וְתֵן טַל וּמָטָר לִבְרָכָה]',
      transliteration: '[V\'ten bracha / V\'ten tal u\'matar livracha]',
      english: '[and bestow blessing / and bestow dew and rain for blessing]',
      instructions: 'Summer: V\'ten bracha. Winter (from Dec 4 in diaspora): V\'ten tal u\'matar livracha',
    },
    closing: {
      hebrew: 'עַל פְּנֵי הָאֲדָמָה, וְשַׂבְּעֵנוּ מִטּוּבֶךָ, וּבָרֵךְ שְׁנָתֵנוּ כַּשָּׁנִים הַטּוֹבוֹת. בָּרוּךְ אַתָּה יְיָ, מְבָרֵךְ הַשָּׁנִים.',
      transliteration: 'Al p\'nei ha\'adamah, v\'sab\'einu mituvecha, u\'varech sh\'nateinu kashanim hatovot. Baruch Atah Adonai, m\'varech hashanim.',
      english: 'upon the face of the earth; satisfy us from Your goodness, and bless our year like the good years. Blessed are You, Lord, who blesses the years.',
    },
    insertionPoints: {
      afterOpening: ['vten_bracha', 'vten_tal_umatar'],
    },
  },
  {
    number: 10,
    name: 'Kibbutz Galuyos',
    nameHebrew: 'קיבוץ גלויות',
    theme: 'Ingathering of Exiles',
    opening: {
      hebrew: 'תְּקַע בְּשׁוֹפָר גָּדוֹל לְחֵרוּתֵנוּ, וְשָׂא נֵס לְקַבֵּץ גָּלֻיּוֹתֵינוּ, וְקַבְּצֵנוּ יַחַד מֵאַרְבַּע כַּנְפוֹת הָאָרֶץ.',
      transliteration: 'T\'ka b\'shofar gadol l\'cheruteinu, v\'sa nes l\'kabetz galuyoteinu, v\'kab\'tzeinu yachad me\'arba kanfot ha\'aretz.',
      english: 'Sound the great shofar for our freedom; raise a banner to gather our exiles, and gather us together from the four corners of the earth.',
    },
    body: {
      hebrew: '',
      english: '',
    },
    closing: {
      hebrew: 'בָּרוּךְ אַתָּה יְיָ, מְקַבֵּץ נִדְחֵי עַמּוֹ יִשְׂרָאֵל.',
      transliteration: 'Baruch Atah Adonai, m\'kabetz nidchei amo Yisrael.',
      english: 'Blessed are You, Lord, who gathers the dispersed of His people Israel.',
    },
  },
  {
    number: 11,
    name: 'Hashivas Hashoftim',
    nameHebrew: 'השבת השופטים',
    theme: 'Restoration of Justice',
    opening: {
      hebrew: 'הָשִׁיבָה שׁוֹפְטֵינוּ כְּבָרִאשׁוֹנָה, וְיוֹעֲצֵינוּ כְּבַתְּחִלָּה, וְהָסֵר מִמֶּנּוּ יָגוֹן וַאֲנָחָה, וּמְלוֹךְ עָלֵינוּ אַתָּה יְיָ לְבַדְּךָ בְּחֶסֶד וּבְרַחֲמִים, וְצַדְּקֵנוּ בַּמִּשְׁפָּט.',
      transliteration: 'Hashivah shofteinu k\'varishonah, v\'yo\'atzeinu k\'vat\'chilah, v\'haser mimenu yagon va\'anachah, u\'mloch aleinu Atah Adonai l\'vad\'cha b\'chesed uv\'rachamim, v\'tzadkeinu bamishpat.',
      english: 'Restore our judges as at first, and our counselors as in the beginning; remove from us sorrow and sighing; and reign over us, You alone, Lord, with kindness and compassion, and vindicate us in judgment.',
    },
    body: {
      hebrew: '',
      english: '',
    },
    closing: {
      hebrew: 'בָּרוּךְ אַתָּה יְיָ, מֶלֶךְ אוֹהֵב צְדָקָה וּמִשְׁפָּט.',
      transliteration: 'Baruch Atah Adonai, Melech ohev tz\'dakah u\'mishpat.',
      english: 'Blessed are You, Lord, King who loves righteousness and justice.',
      instructions: 'During Aseres Yemei Teshuva: "HaMelech Hamishpat" - the King of Justice',
    },
  },
  {
    number: 12,
    name: 'Birkas HaMinim',
    nameHebrew: 'ברכת המינים',
    theme: 'Against Heretics and Enemies',
    opening: {
      hebrew: 'וְלַמַּלְשִׁינִים אַל תְּהִי תִקְוָה, וְכָל הָרִשְׁעָה כְּרֶגַע תֹּאבֵד, וְכָל אוֹיְבֶיךָ מְהֵרָה יִכָּרֵתוּ, וְהַזֵּדִים מְהֵרָה תְעַקֵּר וּתְשַׁבֵּר וּתְמַגֵּר וְתַכְנִיעַ בִּמְהֵרָה בְיָמֵינוּ.',
      transliteration: 'V\'lamal\'shinim al t\'hi tikvah, v\'chol harish\'ah k\'rega toved, v\'chol oy\'vecha m\'herah yikaretu, v\'hazeidim m\'herah t\'aker ut\'shaber ut\'mager v\'tachnia bim\'herah v\'yameinu.',
      english: 'And for informers let there be no hope; and may all wickedness perish in an instant; and may all Your enemies be speedily cut off; and the wanton sinners - may You speedily uproot, break, crush, and subdue speedily in our days.',
    },
    body: {
      hebrew: '',
      english: '',
    },
    closing: {
      hebrew: 'בָּרוּךְ אַתָּה יְיָ, שׁוֹבֵר אוֹיְבִים וּמַכְנִיעַ זֵדִים.',
      transliteration: 'Baruch Atah Adonai, shover oy\'vim u\'machnia zedim.',
      english: 'Blessed are You, Lord, who breaks enemies and humbles wanton sinners.',
    },
  },
  {
    number: 13,
    name: 'Al HaTzaddikim',
    nameHebrew: 'על הצדיקים',
    theme: 'For the Righteous',
    opening: {
      hebrew: 'עַל הַצַּדִּיקִים וְעַל הַחֲסִידִים וְעַל זִקְנֵי עַמְּךָ בֵּית יִשְׂרָאֵל וְעַל פְּלֵיטַת סוֹפְרֵיהֶם וְעַל גֵּרֵי הַצֶּדֶק וְעָלֵינוּ, יֶהֱמוּ נָא רַחֲמֶיךָ יְיָ אֱלֹהֵינוּ, וְתֵן שָׂכָר טוֹב לְכָל הַבּוֹטְחִים בְּשִׁמְךָ בֶּאֱמֶת, וְשִׂים חֶלְקֵנוּ עִמָּהֶם לְעוֹלָם וְלֹא נֵבוֹשׁ, כִּי בְךָ בָטָחְנוּ.',
      transliteration: 'Al hatzaddikim v\'al hachasidim v\'al ziknei am\'cha beit Yisrael v\'al pleitat sof\'reihem v\'al gerei hatzedek v\'aleinu...',
      english: 'Upon the righteous, upon the pious, upon the elders of Your people the House of Israel, upon the remnant of their scholars, upon the righteous converts and upon us, may Your compassion be aroused, Lord our God...',
    },
    body: {
      hebrew: '',
      english: '',
    },
    closing: {
      hebrew: 'בָּרוּךְ אַתָּה יְיָ, מִשְׁעָן וּמִבְטָח לַצַּדִּיקִים.',
      transliteration: 'Baruch Atah Adonai, mish\'an u\'mivtach latzaddikim.',
      english: 'Blessed are You, Lord, support and trust of the righteous.',
    },
  },
  {
    number: 14,
    name: 'Boneh Yerushalayim',
    nameHebrew: 'בונה ירושלים',
    theme: 'Rebuilding Jerusalem',
    opening: {
      hebrew: 'וְלִירוּשָׁלַיִם עִירְךָ בְּרַחֲמִים תָּשׁוּב, וְתִשְׁכּוֹן בְּתוֹכָהּ כַּאֲשֶׁר דִּבַּרְתָּ, וּבְנֵה אוֹתָהּ בְּקָרוֹב בְּיָמֵינוּ בִּנְיַן עוֹלָם, וְכִסֵּא דָוִד מְהֵרָה לְתוֹכָהּ תָּכִין.',
      transliteration: 'V\'lirushalayim ir\'cha b\'rachamim tashuv, v\'tishkon b\'tochah ka\'asher dibarta, u\'vneh otah b\'karov b\'yameinu binyan olam, v\'chiseh David m\'herah l\'tochah tachin.',
      english: 'And to Jerusalem Your city return in mercy and dwell in it as You have spoken; and rebuild it soon in our days as an eternal structure; and speedily establish the throne of David within it.',
    },
    body: {
      hebrew: '',
      english: '',
    },
    closing: {
      hebrew: 'בָּרוּךְ אַתָּה יְיָ, בּוֹנֵה יְרוּשָׁלָיִם.',
      transliteration: 'Baruch Atah Adonai, boneh Yerushalayim.',
      english: 'Blessed are You, Lord, who builds Jerusalem.',
    },
    insertionPoints: {
      beforeClosing: ['nachem'], // Tisha B'Av at Mincha
    },
  },
  {
    number: 15,
    name: 'Malchus Beis David',
    nameHebrew: 'מלכות בית דוד',
    theme: 'Davidic Kingdom / Mashiach',
    opening: {
      hebrew: 'אֶת צֶמַח דָּוִד עַבְדְּךָ מְהֵרָה תַצְמִיחַ, וְקַרְנוֹ תָּרוּם בִּישׁוּעָתֶךָ, כִּי לִישׁוּעָתְךָ קִוִּינוּ כָּל הַיּוֹם.',
      transliteration: 'Et tzemach David av\'d\'cha m\'herah tatzmiach, v\'karno tarum bishuatecha, ki lishuatcha kivinu kol hayom.',
      english: 'The offspring of David Your servant speedily cause to flourish, and raise up his power through Your salvation, for we hope for Your salvation all day.',
    },
    body: {
      hebrew: '',
      english: '',
    },
    closing: {
      hebrew: 'בָּרוּךְ אַתָּה יְיָ, מַצְמִיחַ קֶרֶן יְשׁוּעָה.',
      transliteration: 'Baruch Atah Adonai, matzmiach keren y\'shuah.',
      english: 'Blessed are You, Lord, who causes the power of salvation to flourish.',
    },
  },
  {
    number: 16,
    name: 'Shome\'a Tefillah',
    nameHebrew: 'שומע תפילה',
    theme: 'Acceptance of Prayer',
    opening: {
      hebrew: 'שְׁמַע קוֹלֵנוּ יְיָ אֱלֹהֵינוּ, חוּס וְרַחֵם עָלֵינוּ, וְקַבֵּל בְּרַחֲמִים וּבְרָצוֹן אֶת תְּפִלָּתֵנוּ, כִּי אֵל שׁוֹמֵעַ תְּפִלּוֹת וְתַחֲנוּנִים אָתָּה.',
      transliteration: 'Sh\'ma koleinu Adonai Eloheinu, chus v\'rachem aleinu, v\'kabel b\'rachamim uv\'ratzon et t\'filateinu, ki El shome\'a t\'filot v\'tachanunim Atah.',
      english: 'Hear our voice, Lord our God; have compassion upon us and accept our prayer with compassion and favor, for You are God who hears prayers and supplications.',
    },
    body: {
      hebrew: 'וּמִלְּפָנֶיךָ מַלְכֵּנוּ רֵיקָם אַל תְּשִׁיבֵנוּ.',
      transliteration: 'U\'mil\'fanecha Malkeinu reikam al t\'shiveinu.',
      english: 'And from before You, our King, do not turn us away empty-handed.',
      instructions: 'Personal prayers may be added here',
    },
    closing: {
      hebrew: 'כִּי אַתָּה שׁוֹמֵעַ תְּפִלַּת כָּל פֶּה. בָּרוּךְ אַתָּה יְיָ, שׁוֹמֵעַ תְּפִלָּה.',
      transliteration: 'Ki Atah shome\'a t\'filat kol peh. Baruch Atah Adonai, shome\'a t\'filah.',
      english: 'For You hear the prayer of every mouth. Blessed are You, Lord, who hears prayer.',
    },
    insertionPoints: {
      beforeClosing: ['aneinu_individual'], // Fast days - individual
    },
  },

  // === LAST THREE - THANKSGIVING ===
  {
    number: 17,
    name: 'Avodah',
    nameHebrew: 'עבודה',
    theme: 'Temple Service',
    opening: {
      hebrew: 'רְצֵה יְיָ אֱלֹהֵינוּ בְּעַמְּךָ יִשְׂרָאֵל וּבִתְפִלָּתָם, וְהָשֵׁב אֶת הָעֲבוֹדָה לִדְבִיר בֵּיתֶךָ, וְאִשֵּׁי יִשְׂרָאֵל וּתְפִלָּתָם בְּאַהֲבָה תְקַבֵּל בְּרָצוֹן, וּתְהִי לְרָצוֹן תָּמִיד עֲבוֹדַת יִשְׂרָאֵל עַמֶּךָ.',
      transliteration: 'R\'tzeh Adonai Eloheinu b\'am\'cha Yisrael u\'vitfilatam, v\'hashev et ha\'avodah lidvir beitecha...',
      english: 'Be favorable, Lord our God, toward Your people Israel and their prayer, and restore the service to the Holy of Holies of Your Temple, and the fire-offerings of Israel and their prayer accept with love and favor...',
    },
    body: {
      hebrew: '',
      english: '',
      instructions: 'On Rosh Chodesh and Yom Tov, Ya\'aleh V\'Yavo is inserted here',
    },
    closing: {
      hebrew: 'וְתֶחֱזֶינָה עֵינֵינוּ בְּשׁוּבְךָ לְצִיּוֹן בְּרַחֲמִים. בָּרוּךְ אַתָּה יְיָ, הַמַּחֲזִיר שְׁכִינָתוֹ לְצִיּוֹן.',
      transliteration: 'V\'techezenah eineinu b\'shuvcha l\'Tzion b\'rachamim. Baruch Atah Adonai, hamachazir Sh\'chinato l\'Tzion.',
      english: 'And may our eyes behold Your return to Zion in compassion. Blessed are You, Lord, who restores His Divine Presence to Zion.',
    },
    insertionPoints: {
      beforeClosing: ['yaaleh_veyavo', 'retzeh_shabbos'], // Rosh Chodesh, Yom Tov, Shabbos
    },
  },
  {
    number: 18,
    name: 'Hodaah',
    nameHebrew: 'הודאה',
    theme: 'Thanksgiving',
    opening: {
      hebrew: 'מוֹדִים אֲנַחְנוּ לָךְ, שָׁאַתָּה הוּא יְיָ אֱלֹהֵינוּ וֵאלֹהֵי אֲבוֹתֵינוּ לְעוֹלָם וָעֶד. צוּר חַיֵּינוּ, מָגֵן יִשְׁעֵנוּ אַתָּה הוּא לְדוֹר וָדוֹר.',
      transliteration: 'Modim anachnu lach, sha\'Atah Hu Adonai Eloheinu v\'Elohei avoteinu l\'olam va\'ed. Tzur chayeinu, magen yisheinu Atah Hu l\'dor vador.',
      english: 'We thank You, for You are the Lord our God and God of our ancestors forever and ever. Rock of our lives, Shield of our salvation, You are from generation to generation.',
    },
    body: {
      hebrew: 'נוֹדֶה לְּךָ וּנְסַפֵּר תְּהִלָּתֶךָ עַל חַיֵּינוּ הַמְּסוּרִים בְּיָדֶךָ, וְעַל נִשְׁמוֹתֵינוּ הַפְּקוּדוֹת לָךְ, וְעַל נִסֶּיךָ שֶׁבְּכָל יוֹם עִמָּנוּ, וְעַל נִפְלְאוֹתֶיךָ וְטוֹבוֹתֶיךָ שֶׁבְּכָל עֵת, עֶרֶב וָבֹקֶר וְצָהֳרָיִם.',
      transliteration: 'Nodeh l\'cha u\'n\'saper t\'hilatecha al chayeinu ham\'surim b\'yadecha...',
      english: 'We shall thank You and declare Your praise for our lives which are committed into Your hand, for our souls which are entrusted to You, for Your miracles which are with us every day, and for Your wonders and beneficences at all times...',
    },
    closing: {
      hebrew: 'הַטּוֹב כִּי לֹא כָלוּ רַחֲמֶיךָ, וְהַמְרַחֵם כִּי לֹא תַמּוּ חֲסָדֶיךָ, מֵעוֹלָם קִוִּינוּ לָךְ. וְעַל כֻּלָּם יִתְבָּרַךְ וְיִתְרוֹמַם שִׁמְךָ מַלְכֵּנוּ תָּמִיד לְעוֹלָם וָעֶד. וְכָל הַחַיִּים יוֹדוּךָ סֶּלָה, וִיהַלְלוּ אֶת שִׁמְךָ בֶּאֱמֶת, הָאֵל יְשׁוּעָתֵנוּ וְעֶזְרָתֵנוּ סֶלָה. בָּרוּךְ אַתָּה יְיָ, הַטּוֹב שִׁמְךָ וּלְךָ נָאֶה לְהוֹדוֹת.',
      transliteration: 'Hatov ki lo chalu rachamecha, v\'ham\'rachem ki lo tamu chasadecha... Baruch Atah Adonai, hatov shimcha ul\'cha na\'eh l\'hodot.',
      english: 'The Good One, for Your compassion is never exhausted... Blessed are You, Lord, whose Name is the Good One, and to whom it is fitting to give thanks.',
    },
    insertionPoints: {
      afterOpening: ['al_hanissim_chanukah', 'al_hanissim_purim', 'modim_d\'rabbanan'],
    },
  },
  {
    number: 19,
    name: 'Birkas Kohanim / Shalom',
    nameHebrew: 'ברכת כהנים / שלום',
    theme: 'Peace',
    opening: {
      hebrew: 'שִׂים שָׁלוֹם טוֹבָה וּבְרָכָה, חֵן וָחֶסֶד וְרַחֲמִים, עָלֵינוּ וְעַל כָּל יִשְׂרָאֵל עַמֶּךָ.',
      transliteration: 'Sim shalom tovah u\'vracha, chen vachesed v\'rachamim, aleinu v\'al kol Yisrael amecha.',
      english: 'Establish peace, goodness and blessing, grace, kindness and compassion, upon us and upon all Israel Your people.',
    },
    body: {
      hebrew: 'בָּרְכֵנוּ אָבִינוּ כֻּלָּנוּ כְּאֶחָד בְּאוֹר פָּנֶיךָ, כִּי בְאוֹר פָּנֶיךָ נָתַתָּ לָּנוּ יְיָ אֱלֹהֵינוּ תּוֹרַת חַיִּים וְאַהֲבַת חֶסֶד, וּצְדָקָה וּבְרָכָה וְרַחֲמִים וְחַיִּים וְשָׁלוֹם. וְטוֹב בְּעֵינֶיךָ לְבָרֵךְ אֶת עַמְּךָ יִשְׂרָאֵל בְּכָל עֵת וּבְכָל שָׁעָה בִּשְׁלוֹמֶךָ.',
      transliteration: 'Bar\'cheinu Avinu kulanu k\'echad b\'or panecha...',
      english: 'Bless us, our Father, all of us as one, with the light of Your countenance, for by the light of Your countenance You gave us, Lord our God, a Torah of life and love of kindness, righteousness, blessing, compassion, life, and peace.',
    },
    closing: {
      hebrew: 'בָּרוּךְ אַתָּה יְיָ, הַמְבָרֵךְ אֶת עַמּוֹ יִשְׂרָאֵל בַּשָּׁלוֹם.',
      transliteration: 'Baruch Atah Adonai, ham\'varech et amo Yisrael bashalom.',
      english: 'Blessed are You, Lord, who blesses His people Israel with peace.',
    },
    insertionPoints: {
      beforeClosing: ['b\'sefer_chaim'], // Aseres Yemei Teshuva
    },
  },
];

// Export helper to get bracha by number or name
export function getAmidahBracha(identifier: number | string): AmidahBracha | undefined {
  if (typeof identifier === 'number') {
    return SHEMONEH_ESREI_BRACHOS.find(b => b.number === identifier);
  }
  return SHEMONEH_ESREI_BRACHOS.find(b => b.name === identifier || b.nameHebrew === identifier);
}
