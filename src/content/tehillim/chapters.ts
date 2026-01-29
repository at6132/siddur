/**
 * Tehillim Chapters
 * Full text of all 150 Psalms
 * 
 * NOTE: This file contains a subset of chapters. The full content
 * should be loaded from a complete Tehillim database or API.
 */

import { TehillimChapter } from './types';

// Helper to convert number to Hebrew
function numberToHebrew(num: number): string {
  const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
  const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
  const hundreds = ['', 'ק', 'ר', 'ש', 'ת'];
  
  if (num === 15) return 'ט״ו';
  if (num === 16) return 'ט״ז';
  
  let result = '';
  if (num >= 100) {
    result += hundreds[Math.floor(num / 100)];
    num %= 100;
  }
  if (num >= 10) {
    result += tens[Math.floor(num / 10)];
    num %= 10;
  }
  if (num > 0) {
    result += ones[num];
  }
  
  if (result.length === 1) return result + '׳';
  return result.slice(0, -1) + '״' + result.slice(-1);
}

// Selected chapters with full text
export const TEHILLIM_CHAPTERS: { [key: number]: TehillimChapter } = {
  1: {
    number: 1,
    hebrewNumber: 'א׳',
    title: 'The Way of the Righteous',
    titleHebrew: 'דרך צדיקים',
    bookNumber: 1,
    themes: ['righteousness', 'Torah study', 'reward and punishment'],
    verses: [
      {
        number: 1,
        hebrew: 'אַשְׁרֵי הָאִישׁ אֲשֶׁר לֹא הָלַךְ בַּעֲצַת רְשָׁעִים וּבְדֶרֶךְ חַטָּאִים לֹא עָמָד וּבְמוֹשַׁב לֵצִים לֹא יָשָׁב.',
        transliteration: 'Ashrei ha\'ish asher lo halach ba\'atzat r\'sha\'im, uv\'derech chata\'im lo amad, uv\'moshav leitzim lo yashav.',
        english: 'Happy is the man who has not walked in the counsel of the wicked, nor stood in the way of sinners, nor sat in the seat of scorners.',
      },
      {
        number: 2,
        hebrew: 'כִּי אִם בְּתוֹרַת יְיָ חֶפְצוֹ וּבְתוֹרָתוֹ יֶהְגֶּה יוֹמָם וָלָיְלָה.',
        transliteration: 'Ki im b\'torat Adonai cheftzo, uv\'torato yehgeh yomam valailah.',
        english: 'But his delight is in the Torah of the Lord, and in His Torah he meditates day and night.',
      },
      {
        number: 3,
        hebrew: 'וְהָיָה כְּעֵץ שָׁתוּל עַל פַּלְגֵי מָיִם אֲשֶׁר פִּרְיוֹ יִתֵּן בְּעִתּוֹ וְעָלֵהוּ לֹא יִבּוֹל וְכֹל אֲשֶׁר יַעֲשֶׂה יַצְלִיחַ.',
        transliteration: 'V\'hayah k\'etz shatul al palgei mayim, asher piryo yiten b\'ito, v\'alehu lo yibol, v\'chol asher ya\'aseh yatzliach.',
        english: 'And he shall be like a tree planted by streams of water, that brings forth its fruit in its season, and whose leaf does not wither; and in whatever he does, he prospers.',
      },
      {
        number: 4,
        hebrew: 'לֹא כֵן הָרְשָׁעִים כִּי אִם כַּמֹּץ אֲשֶׁר תִּדְּפֶנּוּ רוּחַ.',
        transliteration: 'Lo chen har\'sha\'im, ki im kamots asher tid\'fenu ruach.',
        english: 'Not so the wicked; but they are like the chaff which the wind drives away.',
      },
      {
        number: 5,
        hebrew: 'עַל כֵּן לֹא יָקֻמוּ רְשָׁעִים בַּמִּשְׁפָּט וְחַטָּאִים בַּעֲדַת צַדִּיקִים.',
        transliteration: 'Al ken lo yakumu r\'sha\'im bamishpat, v\'chata\'im ba\'adat tzaddikim.',
        english: 'Therefore the wicked shall not stand in the judgment, nor sinners in the congregation of the righteous.',
      },
      {
        number: 6,
        hebrew: 'כִּי יוֹדֵעַ יְיָ דֶּרֶךְ צַדִּיקִים וְדֶרֶךְ רְשָׁעִים תֹּאבֵד.',
        transliteration: 'Ki yode\'a Adonai derech tzaddikim, v\'derech r\'sha\'im toved.',
        english: 'For the Lord knows the way of the righteous, but the way of the wicked shall perish.',
      },
    ],
  },

  23: {
    number: 23,
    hebrewNumber: 'כ״ג',
    title: 'The Lord is My Shepherd',
    titleHebrew: 'ה׳ רועי',
    bookNumber: 1,
    themes: ['trust', 'protection', 'comfort', 'divine providence'],
    occasions: ['funeral', 'shiva', 'daily comfort'],
    verses: [
      {
        number: 1,
        hebrew: 'מִזְמוֹר לְדָוִד יְיָ רֹעִי לֹא אֶחְסָר.',
        transliteration: 'Mizmor l\'David, Adonai ro\'i lo echsar.',
        english: 'A Psalm of David. The Lord is my shepherd; I shall not want.',
      },
      {
        number: 2,
        hebrew: 'בִּנְאוֹת דֶּשֶׁא יַרְבִּיצֵנִי עַל מֵי מְנֻחוֹת יְנַהֲלֵנִי.',
        transliteration: 'Bin\'ot deshe yarbitzeini, al mei m\'nuchot y\'nahaleini.',
        english: 'He makes me lie down in green pastures; He leads me beside still waters.',
      },
      {
        number: 3,
        hebrew: 'נַפְשִׁי יְשׁוֹבֵב יַנְחֵנִי בְמַעְגְּלֵי צֶדֶק לְמַעַן שְׁמוֹ.',
        transliteration: 'Nafshi y\'shovev, yancheini b\'ma\'aglei tzedek l\'ma\'an sh\'mo.',
        english: 'He restores my soul; He guides me in paths of righteousness for His name\'s sake.',
      },
      {
        number: 4,
        hebrew: 'גַּם כִּי אֵלֵךְ בְּגֵיא צַלְמָוֶת לֹא אִירָא רָע כִּי אַתָּה עִמָּדִי שִׁבְטְךָ וּמִשְׁעַנְתֶּךָ הֵמָּה יְנַחֲמֻנִי.',
        transliteration: 'Gam ki elech b\'gei tzalmavet lo ira ra, ki Atah imadi, shivt\'cha u\'mish\'antecha hemah y\'nachamuni.',
        english: 'Even though I walk through the valley of the shadow of death, I will fear no evil, for You are with me; Your rod and Your staff, they comfort me.',
      },
      {
        number: 5,
        hebrew: 'תַּעֲרֹךְ לְפָנַי שֻׁלְחָן נֶגֶד צֹרְרָי דִּשַּׁנְתָּ בַשֶּׁמֶן רֹאשִׁי כּוֹסִי רְוָיָה.',
        transliteration: 'Ta\'aroch l\'fanai shulchan neged tzor\'rai, dishanta vashemen roshi, kosi r\'vayah.',
        english: 'You prepare a table before me in the presence of my enemies; You have anointed my head with oil; my cup runs over.',
      },
      {
        number: 6,
        hebrew: 'אַךְ טוֹב וָחֶסֶד יִרְדְּפוּנִי כָּל יְמֵי חַיָּי וְשַׁבְתִּי בְּבֵית יְיָ לְאֹרֶךְ יָמִים.',
        transliteration: 'Ach tov vachesed yird\'funi kol y\'mei chayai, v\'shavti b\'veit Adonai l\'orech yamim.',
        english: 'Surely goodness and mercy shall follow me all the days of my life, and I will dwell in the house of the Lord forever.',
      },
    ],
  },

  27: {
    number: 27,
    hebrewNumber: 'כ״ז',
    title: 'The Lord is My Light',
    titleHebrew: 'ה׳ אורי',
    bookNumber: 1,
    themes: ['faith', 'protection', 'seeking God', 'courage'],
    occasions: ['Elul', 'High Holidays', 'daily during Elul through Hoshana Rabbah'],
    verses: [
      {
        number: 1,
        hebrew: 'לְדָוִד יְיָ אוֹרִי וְיִשְׁעִי מִמִּי אִירָא יְיָ מָעוֹז חַיַּי מִמִּי אֶפְחָד.',
        transliteration: 'L\'David, Adonai ori v\'yish\'i, mimi ira, Adonai ma\'oz chayai, mimi efchad.',
        english: 'Of David. The Lord is my light and my salvation; whom shall I fear? The Lord is the stronghold of my life; of whom shall I be afraid?',
      },
      {
        number: 2,
        hebrew: 'בִּקְרֹב עָלַי מְרֵעִים לֶאֱכֹל אֶת בְּשָׂרִי צָרַי וְאֹיְבַי לִי הֵמָּה כָשְׁלוּ וְנָפָלוּ.',
        transliteration: 'Bikrov alai m\'re\'im le\'echol et b\'sari, tzarai v\'oy\'vai li, hemah kashlu v\'nafalu.',
        english: 'When evildoers came upon me to devour my flesh, my adversaries and my enemies, they stumbled and fell.',
      },
      {
        number: 3,
        hebrew: 'אִם תַּחֲנֶה עָלַי מַחֲנֶה לֹא יִירָא לִבִּי אִם תָּקוּם עָלַי מִלְחָמָה בְּזֹאת אֲנִי בוֹטֵחַ.',
        transliteration: 'Im tachaneh alai machaneh lo yira libi, im takum alai milchamah b\'zot ani vote\'ach.',
        english: 'Though an army encamp against me, my heart shall not fear; though war rise up against me, in this I trust.',
      },
      {
        number: 4,
        hebrew: 'אַחַת שָׁאַלְתִּי מֵאֵת יְיָ אוֹתָהּ אֲבַקֵּשׁ שִׁבְתִּי בְּבֵית יְיָ כָּל יְמֵי חַיַּי לַחֲזוֹת בְּנֹעַם יְיָ וּלְבַקֵּר בְּהֵיכָלוֹ.',
        transliteration: 'Achat sha\'alti me\'et Adonai, otah avakesh: shivti b\'veit Adonai kol y\'mei chayai, lachazot b\'no\'am Adonai ul\'vaker b\'heichalo.',
        english: 'One thing I have asked of the Lord, that I shall seek: to dwell in the house of the Lord all the days of my life, to behold the pleasantness of the Lord and to visit in His Temple.',
      },
      {
        number: 5,
        hebrew: 'כִּי יִצְפְּנֵנִי בְּסֻכֹּה בְּיוֹם רָעָה יַסְתִּרֵנִי בְּסֵתֶר אָהֳלוֹ בְּצוּר יְרוֹמְמֵנִי.',
        transliteration: 'Ki yitzp\'neini b\'sukoh b\'yom ra\'ah, yastireini b\'seter oholo, b\'tzur y\'rom\'meini.',
        english: 'For He will hide me in His pavilion in the day of trouble; He will conceal me in the cover of His tent; He will lift me up upon a rock.',
      },
      {
        number: 6,
        hebrew: 'וְעַתָּה יָרוּם רֹאשִׁי עַל אֹיְבַי סְבִיבוֹתַי וְאֶזְבְּחָה בְאָהֳלוֹ זִבְחֵי תְרוּעָה אָשִׁירָה וַאֲזַמְּרָה לַייָ.',
        transliteration: 'V\'atah yarum roshi al oy\'vai s\'vivotai, v\'ezb\'chah v\'oholo zivchei t\'ruah, ashirah va\'azam\'rah lAdonai.',
        english: 'And now my head shall be lifted up above my enemies around me, and I will offer in His tent sacrifices with shouts of joy; I will sing and make music to the Lord.',
      },
      {
        number: 7,
        hebrew: 'שְׁמַע יְיָ קוֹלִי אֶקְרָא וְחָנֵּנִי וַעֲנֵנִי.',
        transliteration: 'Sh\'ma Adonai koli ekra, v\'choneini va\'aneini.',
        english: 'Hear, O Lord, my voice when I call; be gracious to me and answer me.',
      },
      {
        number: 8,
        hebrew: 'לְךָ אָמַר לִבִּי בַּקְּשׁוּ פָנָי אֶת פָּנֶיךָ יְיָ אֲבַקֵּשׁ.',
        transliteration: 'L\'cha amar libi bak\'shu fanai, et panecha Adonai avakesh.',
        english: 'Of You my heart has said: "Seek My face." Your face, Lord, I will seek.',
      },
      {
        number: 9,
        hebrew: 'אַל תַּסְתֵּר פָּנֶיךָ מִמֶּנִּי אַל תַּט בְּאַף עַבְדֶּךָ עֶזְרָתִי הָיִיתָ אַל תִּטְּשֵׁנִי וְאַל תַּעַזְבֵנִי אֱלֹהֵי יִשְׁעִי.',
        transliteration: 'Al taster panecha mimeni, al tat b\'af avdecha, ezrati hayita, al tit\'sheini v\'al ta\'azveini Elohei yish\'i.',
        english: 'Do not hide Your face from me; do not turn Your servant away in anger. You have been my help; do not cast me off, do not forsake me, O God of my salvation.',
      },
      {
        number: 10,
        hebrew: 'כִּי אָבִי וְאִמִּי עֲזָבוּנִי וַייָ יַאַסְפֵנִי.',
        transliteration: 'Ki avi v\'imi azavuni, vAdonai ya\'as\'feini.',
        english: 'For my father and my mother have forsaken me, but the Lord will take me in.',
      },
      {
        number: 11,
        hebrew: 'הוֹרֵנִי יְיָ דַּרְכֶּךָ וּנְחֵנִי בְּאֹרַח מִישׁוֹר לְמַעַן שׁוֹרְרָי.',
        transliteration: 'Horeini Adonai dar\'kecha, un\'cheini b\'orach mishor l\'ma\'an shor\'rai.',
        english: 'Teach me Your way, O Lord, and lead me on a level path because of my enemies.',
      },
      {
        number: 12,
        hebrew: 'אַל תִּתְּנֵנִי בְּנֶפֶשׁ צָרָי כִּי קָמוּ בִי עֵדֵי שֶׁקֶר וִיפֵחַ חָמָס.',
        transliteration: 'Al tit\'neini b\'nefesh tzarai, ki kamu vi edei sheker vife\'ach chamas.',
        english: 'Do not deliver me to the will of my adversaries, for false witnesses have risen against me, and they breathe out violence.',
      },
      {
        number: 13,
        hebrew: 'לוּלֵא הֶאֱמַנְתִּי לִרְאוֹת בְּטוּב יְיָ בְּאֶרֶץ חַיִּים.',
        transliteration: 'Lulei he\'emanti lir\'ot b\'tuv Adonai b\'eretz chayim.',
        english: 'Had I not believed that I would see the goodness of the Lord in the land of the living...',
      },
      {
        number: 14,
        hebrew: 'קַוֵּה אֶל יְיָ חֲזַק וְיַאֲמֵץ לִבֶּךָ וְקַוֵּה אֶל יְיָ.',
        transliteration: 'Kaveh el Adonai, chazak v\'ya\'ametz libecha, v\'kaveh el Adonai.',
        english: 'Hope in the Lord; be strong and let your heart take courage; and hope in the Lord.',
      },
    ],
  },

  91: {
    number: 91,
    hebrewNumber: 'צ״א',
    title: 'He Who Dwells in the Shelter',
    titleHebrew: 'יושב בסתר',
    bookNumber: 4,
    themes: ['protection', 'faith', 'angels', 'divine shelter'],
    occasions: ['before sleep', 'protection', 'danger', 'pandemic'],
    verses: [
      {
        number: 1,
        hebrew: 'יֹשֵׁב בְּסֵתֶר עֶלְיוֹן בְּצֵל שַׁדַּי יִתְלוֹנָן.',
        transliteration: 'Yoshev b\'seter Elyon, b\'tzel Shadai yitlonan.',
        english: 'He who dwells in the shelter of the Most High, in the shadow of the Almighty he shall abide.',
      },
      {
        number: 2,
        hebrew: 'אֹמַר לַייָ מַחְסִי וּמְצוּדָתִי אֱלֹהַי אֶבְטַח בּוֹ.',
        transliteration: 'Omar lAdonai machsi um\'tzudati, Elohai evtach bo.',
        english: 'I will say of the Lord: He is my refuge and my fortress, my God in whom I trust.',
      },
      {
        number: 3,
        hebrew: 'כִּי הוּא יַצִּילְךָ מִפַּח יָקוּשׁ מִדֶּבֶר הַוּוֹת.',
        transliteration: 'Ki hu yatzil\'cha mipach yakush, midever havot.',
        english: 'For He will rescue you from the snare of the fowler, from the destructive pestilence.',
      },
      {
        number: 4,
        hebrew: 'בְּאֶבְרָתוֹ יָסֶךְ לָךְ וְתַחַת כְּנָפָיו תֶּחְסֶה צִנָּה וְסֹחֵרָה אֲמִתּוֹ.',
        transliteration: 'B\'evrato yasech lach, v\'tachat k\'nafav techseh, tzinah v\'socherah amito.',
        english: 'With His pinions He will cover you, and under His wings you will find refuge; His truth is a shield and armor.',
      },
      {
        number: 5,
        hebrew: 'לֹא תִירָא מִפַּחַד לָיְלָה מֵחֵץ יָעוּף יוֹמָם.',
        transliteration: 'Lo tira mipachad lailah, mechetz ya\'uf yomam.',
        english: 'You shall not fear the terror of the night, nor the arrow that flies by day.',
      },
      {
        number: 6,
        hebrew: 'מִדֶּבֶר בָּאֹפֶל יַהֲלֹךְ מִקֶּטֶב יָשׁוּד צָהֳרָיִם.',
        transliteration: 'Midever ba\'ofel yahaloch, miketev yashud tzohorayim.',
        english: 'Nor the pestilence that walks in darkness, nor the destruction that ravages at noon.',
      },
      {
        number: 7,
        hebrew: 'יִפֹּל מִצִּדְּךָ אֶלֶף וּרְבָבָה מִימִינֶךָ אֵלֶיךָ לֹא יִגָּשׁ.',
        transliteration: 'Yipol mitzid\'cha elef ur\'vavah miminecha, elecha lo yigash.',
        english: 'A thousand may fall at your side, and ten thousand at your right hand, but it shall not come near you.',
      },
      {
        number: 8,
        hebrew: 'רַק בְּעֵינֶיךָ תַבִּיט וְשִׁלֻּמַת רְשָׁעִים תִּרְאֶה.',
        transliteration: 'Rak b\'einecha tabit, v\'shilumat r\'sha\'im tir\'eh.',
        english: 'Only with your eyes shall you behold, and see the recompense of the wicked.',
      },
      {
        number: 9,
        hebrew: 'כִּי אַתָּה יְיָ מַחְסִי עֶלְיוֹן שַׂמְתָּ מְעוֹנֶךָ.',
        transliteration: 'Ki Atah Adonai machsi, Elyon samta m\'onecha.',
        english: 'Because you have made the Lord your refuge, the Most High your dwelling.',
      },
      {
        number: 10,
        hebrew: 'לֹא תְאֻנֶּה אֵלֶיךָ רָעָה וְנֶגַע לֹא יִקְרַב בְּאָהֳלֶךָ.',
        transliteration: 'Lo t\'uneh elecha ra\'ah, v\'nega lo yikrav b\'ohalecha.',
        english: 'No evil shall befall you, nor shall any plague come near your tent.',
      },
      {
        number: 11,
        hebrew: 'כִּי מַלְאָכָיו יְצַוֶּה לָּךְ לִשְׁמָרְךָ בְּכָל דְּרָכֶיךָ.',
        transliteration: 'Ki mal\'achav y\'tzaveh lach, lishmar\'cha b\'chol d\'rachecha.',
        english: 'For He will command His angels concerning you, to guard you in all your ways.',
      },
      {
        number: 12,
        hebrew: 'עַל כַּפַּיִם יִשָּׂאוּנְךָ פֶּן תִּגֹּף בָּאֶבֶן רַגְלֶךָ.',
        transliteration: 'Al kapayim yisa\'uncha, pen tigof ba\'even raglecha.',
        english: 'They shall bear you upon their hands, lest you strike your foot against a stone.',
      },
      {
        number: 13,
        hebrew: 'עַל שַׁחַל וָפֶתֶן תִּדְרֹךְ תִּרְמֹס כְּפִיר וְתַנִּין.',
        transliteration: 'Al shachal vafeten tidroch, tirmos k\'fir v\'tanin.',
        english: 'You shall tread upon the lion and the cobra; you shall trample the young lion and the serpent.',
      },
      {
        number: 14,
        hebrew: 'כִּי בִי חָשַׁק וַאֲפַלְּטֵהוּ אֲשַׂגְּבֵהוּ כִּי יָדַע שְׁמִי.',
        transliteration: 'Ki vi chashak va\'afaltehu, asag\'vehu ki yada sh\'mi.',
        english: 'Because he has set his love upon Me, I will deliver him; I will set him on high because he knows My Name.',
      },
      {
        number: 15,
        hebrew: 'יִקְרָאֵנִי וְאֶעֱנֵהוּ עִמּוֹ אָנֹכִי בְצָרָה אֲחַלְּצֵהוּ וַאֲכַבְּדֵהוּ.',
        transliteration: 'Yikra\'eini v\'e\'enehu, imo anochi v\'tzarah, achal\'tzehu va\'achab\'dehu.',
        english: 'He shall call upon Me, and I will answer him; I will be with him in trouble; I will rescue him and honor him.',
      },
      {
        number: 16,
        hebrew: 'אֹרֶךְ יָמִים אַשְׂבִּיעֵהוּ וְאַרְאֵהוּ בִּישׁוּעָתִי.',
        transliteration: 'Orech yamim asbi\'ehu, v\'ar\'ehu bishuati.',
        english: 'With long life I will satisfy him, and show him My salvation.',
      },
    ],
  },

  121: {
    number: 121,
    hebrewNumber: 'קכ״א',
    title: 'Shir Lama\'alos - A Song of Ascents',
    titleHebrew: 'שיר למעלות',
    bookNumber: 5,
    themes: ['protection', 'help from God', 'watchfulness', 'travel'],
    occasions: ['travel', 'protection', 'daily'],
    verses: [
      {
        number: 1,
        hebrew: 'שִׁיר לַמַּעֲלוֹת אֶשָּׂא עֵינַי אֶל הֶהָרִים מֵאַיִן יָבֹא עֶזְרִי.',
        transliteration: 'Shir lama\'alot, esa einai el heharim, me\'ayin yavo ezri.',
        english: 'A song of ascents. I lift my eyes to the mountains; from where will my help come?',
      },
      {
        number: 2,
        hebrew: 'עֶזְרִי מֵעִם יְיָ עֹשֵׂה שָׁמַיִם וָאָרֶץ.',
        transliteration: 'Ezri me\'im Adonai, oseh shamayim va\'aretz.',
        english: 'My help comes from the Lord, Maker of heaven and earth.',
      },
      {
        number: 3,
        hebrew: 'אַל יִתֵּן לַמּוֹט רַגְלֶךָ אַל יָנוּם שֹׁמְרֶךָ.',
        transliteration: 'Al yiten lamot raglecha, al yanum shom\'recha.',
        english: 'He will not let your foot slip; your Guardian will not slumber.',
      },
      {
        number: 4,
        hebrew: 'הִנֵּה לֹא יָנוּם וְלֹא יִישָׁן שׁוֹמֵר יִשְׂרָאֵל.',
        transliteration: 'Hineh lo yanum v\'lo yishan, shomer Yisrael.',
        english: 'Indeed, the Guardian of Israel neither slumbers nor sleeps.',
      },
      {
        number: 5,
        hebrew: 'יְיָ שֹׁמְרֶךָ יְיָ צִלְּךָ עַל יַד יְמִינֶךָ.',
        transliteration: 'Adonai shom\'recha, Adonai tzil\'cha al yad y\'minecha.',
        english: 'The Lord is your Guardian; the Lord is your shade at your right hand.',
      },
      {
        number: 6,
        hebrew: 'יוֹמָם הַשֶּׁמֶשׁ לֹא יַכֶּכָּה וְיָרֵחַ בַּלָּיְלָה.',
        transliteration: 'Yomam hashemesh lo yakeka, v\'yare\'ach balailah.',
        english: 'By day the sun will not strike you, nor the moon by night.',
      },
      {
        number: 7,
        hebrew: 'יְיָ יִשְׁמָרְךָ מִכָּל רָע יִשְׁמֹר אֶת נַפְשֶׁךָ.',
        transliteration: 'Adonai yishmar\'cha mikol ra, yishmor et nafshecha.',
        english: 'The Lord will guard you from all evil; He will guard your soul.',
      },
      {
        number: 8,
        hebrew: 'יְיָ יִשְׁמָר צֵאתְךָ וּבוֹאֶךָ מֵעַתָּה וְעַד עוֹלָם.',
        transliteration: 'Adonai yishmor tzet\'cha uvo\'echa, me\'atah v\'ad olam.',
        english: 'The Lord will guard your going out and your coming in, from now and forever.',
      },
    ],
  },

  150: {
    number: 150,
    hebrewNumber: 'ק״נ',
    title: 'Halleluyah - Let Everything Praise',
    titleHebrew: 'הללויה',
    bookNumber: 5,
    themes: ['praise', 'music', 'joy', 'worship'],
    occasions: ['daily prayers', 'pesukei dezimra', 'celebration'],
    verses: [
      {
        number: 1,
        hebrew: 'הַלְלוּיָהּ הַלְלוּ אֵל בְּקָדְשׁוֹ הַלְלוּהוּ בִּרְקִיעַ עֻזּוֹ.',
        transliteration: 'Halleluyah! Hal\'lu El b\'kodsho, hal\'luhu birkia uzo.',
        english: 'Halleluyah! Praise God in His sanctuary; praise Him in the firmament of His power.',
      },
      {
        number: 2,
        hebrew: 'הַלְלוּהוּ בִגְבוּרֹתָיו הַלְלוּהוּ כְּרֹב גֻּדְלוֹ.',
        transliteration: 'Hal\'luhu vig\'vurotav, hal\'luhu k\'rov gudlo.',
        english: 'Praise Him for His mighty acts; praise Him according to His abundant greatness.',
      },
      {
        number: 3,
        hebrew: 'הַלְלוּהוּ בְּתֵקַע שׁוֹפָר הַלְלוּהוּ בְּנֵבֶל וְכִנּוֹר.',
        transliteration: 'Hal\'luhu b\'teka shofar, hal\'luhu b\'nevel v\'chinor.',
        english: 'Praise Him with the blast of the shofar; praise Him with the lyre and harp.',
      },
      {
        number: 4,
        hebrew: 'הַלְלוּהוּ בְּתֹף וּמָחוֹל הַלְלוּהוּ בְּמִנִּים וְעוּגָב.',
        transliteration: 'Hal\'luhu b\'tof u\'machol, hal\'luhu b\'minim v\'ugav.',
        english: 'Praise Him with timbrel and dance; praise Him with strings and flute.',
      },
      {
        number: 5,
        hebrew: 'הַלְלוּהוּ בְצִלְצְלֵי שָׁמַע הַלְלוּהוּ בְּצִלְצְלֵי תְרוּעָה.',
        transliteration: 'Hal\'luhu v\'tziltz\'lei shama, hal\'luhu b\'tziltz\'lei t\'ruah.',
        english: 'Praise Him with sounding cymbals; praise Him with clashing cymbals.',
      },
      {
        number: 6,
        hebrew: 'כֹּל הַנְּשָׁמָה תְּהַלֵּל יָהּ הַלְלוּיָהּ.',
        transliteration: 'Kol han\'shamah t\'halel Yah, Halleluyah!',
        english: 'Let every soul praise the Lord. Halleluyah!',
      },
    ],
  },
};

/**
 * Get a Tehillim chapter by number
 */
export function getTehillimChapter(num: number): TehillimChapter | null {
  // Return from cache if available
  if (TEHILLIM_CHAPTERS[num]) {
    return TEHILLIM_CHAPTERS[num];
  }
  
  // Return a placeholder for chapters not yet loaded
  return {
    number: num,
    hebrewNumber: numberToHebrew(num),
    bookNumber: num <= 41 ? 1 : num <= 72 ? 2 : num <= 89 ? 3 : num <= 106 ? 4 : 5,
    themes: [],
    verses: [{
      number: 1,
      hebrew: `[תהלים פרק ${numberToHebrew(num)} - הטקסט יטען בקרוב]`,
      english: `[Psalm ${num} - Full text coming soon]`,
    }],
  };
}

/**
 * Get all available chapter numbers
 */
export function getAvailableChapters(): number[] {
  return Object.keys(TEHILLIM_CHAPTERS).map(Number).sort((a, b) => a - b);
}
