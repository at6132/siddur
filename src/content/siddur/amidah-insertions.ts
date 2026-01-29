/**
 * Amidah Insertions
 * Seasonal and special additions to the Shemoneh Esrei
 */

import { AmidahInsertions, PrayerText } from './types';

export const AMIDAH_INSERTIONS: AmidahInsertions = {
  // Second Bracha - Gevuros (מחיה מתים)
  mashivHaruach: {
    hebrew: 'מַשִּׁיב הָרוּחַ וּמוֹרִיד הַגֶּשֶׁם',
    transliteration: 'Mashiv haruach u\'morid hageshem',
    english: 'Who causes the wind to blow and the rain to fall',
    instructions: 'Said from Musaf of Shmini Atzeres until Musaf of first day of Pesach',
  },
  
  moridHatal: {
    hebrew: 'מוֹרִיד הַטָּל',
    transliteration: 'Morid hatal',
    english: 'Who causes the dew to fall',
    instructions: 'Said from Musaf of first day of Pesach until Musaf of Shmini Atzeres (Sefard/Edot Mizrach)',
  },

  // Ninth Bracha - Birkas Hashanim (ברכת השנים)
  vtenBracha: {
    hebrew: 'וְתֵן בְּרָכָה עַל פְּנֵי הָאֲדָמָה, וְשַׂבְּעֵנוּ מִטּוּבֶךָ, וּבָרֵךְ שְׁנָתֵנוּ כַּשָּׁנִים הַטּוֹבוֹת. בָּרוּךְ אַתָּה יְיָ, מְבָרֵךְ הַשָּׁנִים.',
    transliteration: 'V\'ten bracha al p\'nei ha\'adamah, v\'sab\'einu mituvecha, u\'varech sh\'nateinu kashanim hatovot. Baruch Atah Adonai, m\'varech hashanim.',
    english: 'And bestow blessing upon the face of the earth, satisfy us from Your goodness, and bless our year like the good years. Blessed are You, Lord, who blesses the years.',
    instructions: 'Said from Pesach until winter (December 4th in diaspora, 7 Cheshvan in Israel)',
  },
  
  vtenTalUmatar: {
    hebrew: 'וְתֵן טַל וּמָטָר לִבְרָכָה עַל פְּנֵי הָאֲדָמָה, וְשַׂבְּעֵנוּ מִטּוּבֶךָ, וּבָרֵךְ שְׁנָתֵנוּ כַּשָּׁנִים הַטּוֹבוֹת. בָּרוּךְ אַתָּה יְיָ, מְבָרֵךְ הַשָּׁנִים.',
    transliteration: 'V\'ten tal u\'matar livracha al p\'nei ha\'adamah, v\'sab\'einu mituvecha, u\'varech sh\'nateinu kashanim hatovot. Baruch Atah Adonai, m\'varech hashanim.',
    english: 'And bestow dew and rain for blessing upon the face of the earth, satisfy us from Your goodness, and bless our year like the good years. Blessed are You, Lord, who blesses the years.',
    instructions: 'Said from December 4th (diaspora) or 7 Cheshvan (Israel) until Pesach',
  },

  // Ya'aleh V'Yavo - יעלה ויבוא
  yaalehVeyavo: {
    hebrew: `יַעֲלֶה וְיָבֹא וְיַגִּיעַ וְיֵרָאֶה וְיֵרָצֶה וְיִשָּׁמַע וְיִפָּקֵד וְיִזָּכֵר זִכְרוֹנֵנוּ וּפִקְדּוֹנֵנוּ, וְזִכְרוֹן אֲבוֹתֵינוּ, וְזִכְרוֹן מָשִׁיחַ בֶּן דָּוִד עַבְדֶּךָ, וְזִכְרוֹן יְרוּשָׁלַיִם עִיר קָדְשֶׁךָ, וְזִכְרוֹן כָּל עַמְּךָ בֵּית יִשְׂרָאֵל לְפָנֶיךָ, לִפְלֵיטָה לְטוֹבָה, לְחֵן וּלְחֶסֶד וּלְרַחֲמִים, לְחַיִּים וּלְשָׁלוֹם בְּיוֹם
[רֹאשׁ הַחֹדֶשׁ הַזֶּה / חַג הַמַּצּוֹת הַזֶּה / חַג הַשָּׁבֻעוֹת הַזֶּה / חַג הַסֻּכּוֹת הַזֶּה / הַשְּׁמִינִי חַג הָעֲצֶרֶת הַזֶּה / הַזִּכָּרוֹן הַזֶּה]
זָכְרֵנוּ יְיָ אֱלֹהֵינוּ בּוֹ לְטוֹבָה, וּפָקְדֵנוּ בוֹ לִבְרָכָה, וְהוֹשִׁיעֵנוּ בוֹ לְחַיִּים. וּבִדְבַר יְשׁוּעָה וְרַחֲמִים חוּס וְחָנֵּנוּ, וְרַחֵם עָלֵינוּ וְהוֹשִׁיעֵנוּ, כִּי אֵלֶיךָ עֵינֵינוּ, כִּי אֵל מֶלֶךְ חַנּוּן וְרַחוּם אָתָּה.`,
    transliteration: 'Ya\'aleh v\'yavo v\'yagia v\'yera\'eh v\'yeratzeh v\'yishama v\'yipaked v\'yizacher zichroneinu u\'fikdoneinu...',
    english: 'May there ascend, come, reach, appear, be desired, be heard, be counted and be remembered before You: our remembrance and our reckoning; the remembrance of our ancestors; the remembrance of Mashiach son of David Your servant; the remembrance of Jerusalem Your holy city; and the remembrance of Your entire nation the House of Israel...',
    instructions: 'Said on Rosh Chodesh, Chol Hamoed, and Yom Tov. Insert the appropriate day.',
  },

  // Al Hanissim - Chanukah
  alHanissimChanukah: {
    hebrew: `עַל הַנִּסִּים וְעַל הַפֻּרְקָן וְעַל הַגְּבוּרוֹת וְעַל הַתְּשׁוּעוֹת וְעַל הַמִּלְחָמוֹת שֶׁעָשִׂיתָ לַאֲבוֹתֵינוּ בַּיָּמִים הָהֵם בַּזְּמַן הַזֶּה.

בִּימֵי מַתִּתְיָהוּ בֶּן יוֹחָנָן כֹּהֵן גָּדוֹל חַשְׁמוֹנָאִי וּבָנָיו, כְּשֶׁעָמְדָה מַלְכוּת יָוָן הָרְשָׁעָה עַל עַמְּךָ יִשְׂרָאֵל לְהַשְׁכִּיחָם תּוֹרָתֶךָ וּלְהַעֲבִירָם מֵחֻקֵּי רְצוֹנֶךָ. וְאַתָּה בְּרַחֲמֶיךָ הָרַבִּים עָמַדְתָּ לָהֶם בְּעֵת צָרָתָם, רַבְתָּ אֶת רִיבָם, דַּנְתָּ אֶת דִּינָם, נָקַמְתָּ אֶת נִקְמָתָם, מָסַרְתָּ גִבּוֹרִים בְּיַד חַלָּשִׁים, וְרַבִּים בְּיַד מְעַטִּים, וּטְמֵאִים בְּיַד טְהוֹרִים, וּרְשָׁעִים בְּיַד צַדִּיקִים, וְזֵדִים בְּיַד עוֹסְקֵי תוֹרָתֶךָ. וּלְךָ עָשִׂיתָ שֵׁם גָּדוֹל וְקָדוֹשׁ בְּעוֹלָמֶךָ, וּלְעַמְּךָ יִשְׂרָאֵל עָשִׂיתָ תְּשׁוּעָה גְדוֹלָה וּפֻרְקָן כְּהַיּוֹם הַזֶּה. וְאַחַר כֵּן בָּאוּ בָנֶיךָ לִדְבִיר בֵּיתֶךָ, וּפִנּוּ אֶת הֵיכָלֶךָ, וְטִהֲרוּ אֶת מִקְדָּשֶׁךָ, וְהִדְלִיקוּ נֵרוֹת בְּחַצְרוֹת קָדְשֶׁךָ, וְקָבְעוּ שְׁמוֹנַת יְמֵי חֲנֻכָּה אֵלּוּ לְהוֹדוֹת וּלְהַלֵּל לְשִׁמְךָ הַגָּדוֹל.`,
    transliteration: 'Al hanissim v\'al hapurkan v\'al hag\'vurot v\'al hat\'shuot v\'al hamilchamot she\'asita la\'avoteinu bayamim hahem bazman hazeh...',
    english: 'For the miracles and for the redemption and for the mighty deeds and for the victories and for the battles which You performed for our ancestors in those days, at this time. In the days of Matisyahu son of Yochanan the High Priest, the Hasmonean, and his sons...',
    instructions: 'Said during all 8 days of Chanukah',
  },

  // Al Hanissim - Purim
  alHanissimPurim: {
    hebrew: `עַל הַנִּסִּים וְעַל הַפֻּרְקָן וְעַל הַגְּבוּרוֹת וְעַל הַתְּשׁוּעוֹת וְעַל הַמִּלְחָמוֹת שֶׁעָשִׂיתָ לַאֲבוֹתֵינוּ בַּיָּמִים הָהֵם בַּזְּמַן הַזֶּה.

בִּימֵי מָרְדְּכַי וְאֶסְתֵּר בְּשׁוּשַׁן הַבִּירָה, כְּשֶׁעָמַד עֲלֵיהֶם הָמָן הָרָשָׁע, בִּקֵּשׁ לְהַשְׁמִיד לַהֲרֹג וּלְאַבֵּד אֶת כָּל הַיְּהוּדִים מִנַּעַר וְעַד זָקֵן טַף וְנָשִׁים בְּיוֹם אֶחָד, בִּשְׁלוֹשָׁה עָשָׂר לְחֹדֶשׁ שְׁנֵים עָשָׂר הוּא חֹדֶשׁ אֲדָר, וּשְׁלָלָם לָבוֹז. וְאַתָּה בְּרַחֲמֶיךָ הָרַבִּים הֵפַרְתָּ אֶת עֲצָתוֹ, וְקִלְקַלְתָּ אֶת מַחֲשַׁבְתּוֹ, וַהֲשֵׁבוֹתָ לּוֹ גְּמוּלוֹ בְּרֹאשׁוֹ, וְתָלוּ אוֹתוֹ וְאֶת בָּנָיו עַל הָעֵץ.`,
    transliteration: 'Al hanissim v\'al hapurkan v\'al hag\'vurot v\'al hat\'shuot v\'al hamilchamot she\'asita la\'avoteinu bayamim hahem bazman hazeh. Bimei Mordechai v\'Esther...',
    english: 'For the miracles and for the redemption and for the mighty deeds and for the victories and for the battles which You performed for our ancestors in those days, at this time. In the days of Mordechai and Esther in Shushan the capital...',
    instructions: 'Said on Purim and Shushan Purim',
  },

  // Aneinu - Fast Days
  aneinu: {
    hebrew: `עֲנֵנוּ יְיָ עֲנֵנוּ בְּיוֹם צוֹם תַּעֲנִיתֵנוּ, כִּי בְצָרָה גְדוֹלָה אֲנָחְנוּ. אַל תֵּפֶן אֶל רִשְׁעֵנוּ, וְאַל תַּסְתֵּר פָּנֶיךָ מִמֶּנּוּ, וְאַל תִּתְעַלַּם מִתְּחִנָּתֵנוּ. הֱיֵה נָא קָרוֹב לְשַׁוְעָתֵנוּ, יְהִי נָא חַסְדְּךָ לְנַחֲמֵנוּ. טֶרֶם נִקְרָא אֵלֶיךָ עֲנֵנוּ, כַּדָּבָר שֶׁנֶּאֱמַר: וְהָיָה טֶרֶם יִקְרָאוּ וַאֲנִי אֶעֱנֶה, עוֹד הֵם מְדַבְּרִים וַאֲנִי אֶשְׁמָע. כִּי אַתָּה יְיָ הָעוֹנֶה בְּעֵת צָרָה, פּוֹדֶה וּמַצִּיל בְּכָל עֵת צָרָה וְצוּקָה. בָּרוּךְ אַתָּה יְיָ, הָעוֹנֶה בְּעֵת צָרָה.`,
    transliteration: 'Aneinu Adonai aneinu b\'yom tzom ta\'aniteinu, ki v\'tzarah g\'dolah anachnu...',
    english: 'Answer us, Lord, answer us on this fast day of our affliction, for we are in great distress. Do not regard our wickedness, do not hide Your face from us, and do not ignore our supplication...',
    instructions: 'Said on fast days. Shaliach Tzibur says it as a separate bracha between Go\'el Yisrael and Refa\'einu.',
  },

  // Nachem - Tisha B'Av
  nachem: {
    hebrew: `נַחֵם יְיָ אֱלֹהֵינוּ אֶת אֲבֵלֵי צִיּוֹן וְאֶת אֲבֵלֵי יְרוּשָׁלָיִם, וְאֶת הָעִיר הָאֲבֵלָה וְהַחֲרֵבָה וְהַבְּזוּיָה וְהַשּׁוֹמֵמָה. הָאֲבֵלָה מִבְּלִי בָנֶיהָ, וְהַחֲרֵבָה מִמְּעוֹנוֹתֶיהָ, וְהַבְּזוּיָה מִכְּבוֹדָהּ, וְהַשּׁוֹמֵמָה מֵאֵין יוֹשֵׁב. וְהִיא יוֹשֶׁבֶת וְרֹאשָׁהּ חָפוּי כְּאִשָּׁה עֲקָרָה שֶׁלֹּא יָלָדָה. וַיְבַלְּעוּהָ לְגִיוֹנוֹת, וַיִּירָשׁוּהָ עוֹבְדֵי זָרִים, וַיַּטִּילוּ אֶת עַמְּךָ יִשְׂרָאֵל לֶחָרֶב, וַיַּהַרְגוּ בְזָדוֹן חֲסִידֵי עֶלְיוֹן. עַל כֵּן צִיּוֹן בְּמַר תִּבְכֶּה, וִירוּשָׁלַיִם תִּתֵּן קוֹלָהּ: לִבִּי לִבִּי עַל חַלְלֵיהֶם, מֵעַי מֵעַי עַל חַלְלֵיהֶם. כִּי אַתָּה יְיָ בָּאֵשׁ הִצַּתָּהּ, וּבָאֵשׁ אַתָּה עָתִיד לִבְנוֹתָהּ, כָּאָמוּר: וַאֲנִי אֶהְיֶה לָּהּ נְאֻם יְיָ חוֹמַת אֵשׁ סָבִיב וּלְכָבוֹד אֶהְיֶה בְתוֹכָהּ. בָּרוּךְ אַתָּה יְיָ, מְנַחֵם צִיּוֹן וּבוֹנֵה יְרוּשָׁלָיִם.`,
    transliteration: 'Nachem Adonai Eloheinu et availei Tzion v\'et availei Yerushalayim...',
    english: 'Console, Lord our God, the mourners of Zion and the mourners of Jerusalem, and the city that is mournful and destroyed and despised and desolate...',
    instructions: 'Said on Tisha B\'Av at Mincha, in the bracha of Boneh Yerushalayim',
  },
};

// Day-specific insertions for Ya'aleh V'Yavo
export const YAALEH_VEYAVO_DAYS: { [key: string]: string } = {
  roshChodesh: 'רֹאשׁ הַחֹדֶשׁ הַזֶּה',
  pesach: 'חַג הַמַּצּוֹת הַזֶּה',
  shavuos: 'חַג הַשָּׁבֻעוֹת הַזֶּה',
  sukkos: 'חַג הַסֻּכּוֹת הַזֶּה',
  shminiAtzeres: 'הַשְּׁמִינִי חַג הָעֲצֶרֶת הַזֶּה',
  roshHashana: 'הַזִּכָּרוֹן הַזֶּה',
};
