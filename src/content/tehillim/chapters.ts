/**
 * Tehillim Chapters - Fallback Content
 * 
 * Primary content is fetched from Sefaria API.
 * This file contains minimal fallback data for key chapters
 * in case the API is unavailable.
 */

import { TehillimChapter } from './types';

// Minimal fallback - most popular chapters only
// Full content loaded from Sefaria API
export const TEHILLIM_CHAPTERS: { [key: number]: TehillimChapter } = {
  // Chapter 23 - The Lord is My Shepherd (most popular)
  23: {
    number: 23,
    hebrewNumber: 'כ״ג',
    title: 'The Lord is My Shepherd',
    titleHebrew: 'מזמור לדוד',
    bookNumber: 1,
    themes: ['trust', 'comfort', 'protection', 'faith'],
    occasions: ['comfort', 'funeral', 'shiva'],
    verses: [
      {
        number: 1,
        hebrew: 'מִזְמוֹר לְדָוִד יְיָ רֹעִי לֹא אֶחְסָר.',
        english: 'A Psalm of David. The Lord is my shepherd; I shall not want.',
      },
      {
        number: 2,
        hebrew: 'בִּנְאוֹת דֶּשֶׁא יַרְבִּיצֵנִי עַל מֵי מְנֻחוֹת יְנַהֲלֵנִי.',
        english: 'He makes me lie down in green pastures; He leads me beside still waters.',
      },
      {
        number: 3,
        hebrew: 'נַפְשִׁי יְשׁוֹבֵב יַנְחֵנִי בְמַעְגְּלֵי צֶדֶק לְמַעַן שְׁמוֹ.',
        english: 'He restores my soul; He guides me in paths of righteousness for His name\'s sake.',
      },
      {
        number: 4,
        hebrew: 'גַּם כִּי אֵלֵךְ בְּגֵיא צַלְמָוֶת לֹא אִירָא רָע כִּי אַתָּה עִמָּדִי שִׁבְטְךָ וּמִשְׁעַנְתֶּךָ הֵמָּה יְנַחֲמֻנִי.',
        english: 'Even though I walk through the valley of the shadow of death, I will fear no evil, for You are with me; Your rod and Your staff, they comfort me.',
      },
      {
        number: 5,
        hebrew: 'תַּעֲרֹךְ לְפָנַי שֻׁלְחָן נֶגֶד צֹרְרָי דִּשַּׁנְתָּ בַשֶּׁמֶן רֹאשִׁי כּוֹסִי רְוָיָה.',
        english: 'You prepare a table before me in the presence of my enemies; You anoint my head with oil; my cup overflows.',
      },
      {
        number: 6,
        hebrew: 'אַךְ טוֹב וָחֶסֶד יִרְדְּפוּנִי כָּל יְמֵי חַיָּי וְשַׁבְתִּי בְּבֵית יְיָ לְאֹרֶךְ יָמִים.',
        english: 'Surely goodness and loving-kindness shall follow me all the days of my life, and I shall dwell in the house of the Lord forever.',
      },
    ],
  },

  // Chapter 121 - I Lift My Eyes (protection, travel)
  121: {
    number: 121,
    hebrewNumber: 'קכ״א',
    title: 'I Lift My Eyes to the Mountains',
    titleHebrew: 'שיר למעלות',
    bookNumber: 5,
    themes: ['protection', 'help', 'travel safety'],
    occasions: ['travel', 'protection'],
    verses: [
      {
        number: 1,
        hebrew: 'שִׁיר לַמַּעֲלוֹת אֶשָּׂא עֵינַי אֶל הֶהָרִים מֵאַיִן יָבֹא עֶזְרִי.',
        english: 'A Song of Ascents. I lift my eyes to the mountains—from where will my help come?',
      },
      {
        number: 2,
        hebrew: 'עֶזְרִי מֵעִם יְיָ עֹשֵׂה שָׁמַיִם וָאָרֶץ.',
        english: 'My help comes from the Lord, Maker of heaven and earth.',
      },
      {
        number: 3,
        hebrew: 'אַל יִתֵּן לַמּוֹט רַגְלֶךָ אַל יָנוּם שֹׁמְרֶךָ.',
        english: 'He will not let your foot slip; your Guardian will not slumber.',
      },
      {
        number: 4,
        hebrew: 'הִנֵּה לֹא יָנוּם וְלֹא יִישָׁן שׁוֹמֵר יִשְׂרָאֵל.',
        english: 'Indeed, the Guardian of Israel neither slumbers nor sleeps.',
      },
      {
        number: 5,
        hebrew: 'יְיָ שֹׁמְרֶךָ יְיָ צִלְּךָ עַל יַד יְמִינֶךָ.',
        english: 'The Lord is your Guardian; the Lord is your shade at your right hand.',
      },
      {
        number: 6,
        hebrew: 'יוֹמָם הַשֶּׁמֶשׁ לֹא יַכֶּכָּה וְיָרֵחַ בַּלָּיְלָה.',
        english: 'By day the sun will not strike you, nor the moon by night.',
      },
      {
        number: 7,
        hebrew: 'יְיָ יִשְׁמָרְךָ מִכָּל רָע יִשְׁמֹר אֶת נַפְשֶׁךָ.',
        english: 'The Lord will guard you from all evil; He will guard your soul.',
      },
      {
        number: 8,
        hebrew: 'יְיָ יִשְׁמָר צֵאתְךָ וּבוֹאֶךָ מֵעַתָּה וְעַד עוֹלָם.',
        english: 'The Lord will guard your going out and your coming in, from now and forever.',
      },
    ],
  },

  // Chapter 91 - Protection Psalm
  91: {
    number: 91,
    hebrewNumber: 'צ״א',
    title: 'He Who Dwells in the Shelter',
    titleHebrew: 'יושב בסתר',
    bookNumber: 4,
    themes: ['protection', 'faith', 'angels', 'safety'],
    occasions: ['protection', 'before sleep', 'danger'],
    verses: [
      {
        number: 1,
        hebrew: 'יֹשֵׁב בְּסֵתֶר עֶלְיוֹן בְּצֵל שַׁדַּי יִתְלוֹנָן.',
        english: 'He who dwells in the shelter of the Most High will abide in the shadow of the Almighty.',
      },
      {
        number: 2,
        hebrew: 'אֹמַר לַייָ מַחְסִי וּמְצוּדָתִי אֱלֹהַי אֶבְטַח בּוֹ.',
        english: 'I will say of the Lord, "He is my refuge and my fortress, my God in whom I trust."',
      },
    ],
  },
};
