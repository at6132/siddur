/**
 * String transforms used only by Shacharit siddur section pipelines (`ShacharitSectionPipelines.ts`).
 * Mincha / Maariv paths do not import this module.
 *
 * Day omit / foldout / song-of-day: pack `{{gate}}`/`{{fold}}` markers + OfflineShacharitService.
 */

export {
  pickSongOfTheDay,
  pickSongOfTheDayEnglish,
} from '../content/siddur/shacharit/songOfTheDay';

const stripHtml = (s: string) => s.replace(/<[^>]*>/g, '');
const stripHtmlKeepLineBreaks = (s: string) => stripHtml(s.replace(/<br\s*\/?>/gi, '\n'));

/**
 * Shacharit preparatory (Sefaria): remove the long printed “תפילה קודם התפילה” bundle — Noam Elimelech יהי רצון…,
 * Zohar tikkunim (“נוהגים לומר…”), אודה לאל stanzas, Reb Meir Baal HaNes kavanah, and the note
 * “עצה זו אינה מועילה…קריאת שמע” (not normative nusach for this reader).
 */
export function removeShacharitPreparatoryPreTefillahZoharBundle(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  const h = stripHtmlKeepLineBreaks(hebrew);
  const nik = '[\\u0591-\\u05C7]*';
  const sp = '[\\s\\r\\n\u200e\u200f\u200b]*';
  const starts = [
    `ת${nik}פ${nik}י${nik}ל${nik}ה${sp}ק${nik}ו${nik}ד${nik}ם${sp}ה${nik}ת${nik}פ${nik}י${nik}ל${nik}ה`,
    `י${nik}ה${nik}י${sp}ר${nik}צ${nik}ו${nik}ן${sp}מ${nik}ה${nik}ר${nik}ב${sp}ה${nik}א${nik}ל${nik}ק${nik}י${sp}ה${nik}מ${nik}פ${nik}ו${nik}ר${nik}ס${nik}ם`,
    `נ${nik}ו${nik}ה${nik}ג${nik}י${nik}ם${sp}ל${nik}ו${nik}מ${nik}ר${sp}ז${nik}ה${sp}מ${nik}ת${nik}י${nik}ק${nik}ו${nik}נ${nik}י${sp}ה${nik}ז${nik}(?:ו${nik})?ה${nik}ר`,
  ];
  let i0 = -1;
  for (const body of starts) {
    const m = h.match(new RegExp(body, 'u'));
    if (m?.index !== undefined) {
      i0 = m.index;
      break;
    }
  }
  if (i0 === -1) return { hebrew, english };

  const tail = h.slice(i0);
  const endRe = new RegExp(
    `ע${nik}צ${nik}ה${sp}ז${nik}ו${sp}א${nik}י${nik}נ${nik}ה${sp}מ${nik}ו${nik}ע${nik}י${nik}ל${nik}ה[\\s\\S]*?קריאת${sp}שמע[^\\r\\n]*(?:\\r?\\n|$)`,
    'u'
  );
  const me = tail.match(endRe);
  if (!me) return { hebrew, english };

  const iEnd = i0 + (me.index ?? 0) + me[0].length;
  const out = (h.slice(0, i0) + h.slice(iEnd)).replace(/\n{3,}/g, '\n\n').trim();
  // Safety: never apply this broad cut if it would remove core opening items users expect to keep.
  const hasModehBefore = /מודה\s+אני/.test(stripHtmlKeepLineBreaks(hebrew));
  const hasModehAfter = /מודה\s+אני/.test(out);
  const hasTzitzisBefore = /ציצית/.test(stripHtmlKeepLineBreaks(hebrew));
  const hasTzitzisAfter = /ציצית/.test(out);
  if ((hasModehBefore && !hasModehAfter) || (hasTzitzisBefore && !hasTzitzisAfter)) {
    return { hebrew, english };
  }
  return { hebrew: out, english };
}

/**
 * Netilat Yadayim (Sefaria): collapse a paragraph-sized gap (`<br><br>`, `\n\n`, padding) between the chatima
 * וְצִוָּנוּ עַל נְטִילַת יָדָיִם and the following בָּרוּךְ אַתָּה… to a single line break so the reader does not
 * insert a huge vertical space.
 */
export function collapseNetilatYadayimChatimaGapBeforeNextBaruch(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  const nik = '[\\u0591-\\u05C7]*';
  const chatimaRe = new RegExp(
    `נ${nik}ט${nik}י${nik}ל${nik}ת${nik}\\s*י${nik}ד${nik}י${nik}ם(?:\\s|<[^>]+>)*\\s*[:׃.]?`,
    'u'
  );
  const mEnd = hebrew.match(chatimaRe);
  if (!mEnd || mEnd.index === undefined) return { hebrew, english };
  const startGap = mEnd.index + mEnd[0].length;
  const tail = hebrew.slice(startGap);
  const baruchRe = new RegExp(`(?:ב|בּ)${nik}ר${nik}ו${nik}ך${nik}`, 'u');
  const mB = tail.match(baruchRe);
  if (!mB || mB.index === undefined || mB.index === 0) return { hebrew, english };
  const gapStr = tail.slice(0, mB.index);
  const gapNorm = gapStr.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
  const alreadySingleBreak = /^[\t \u00a0\u200b-\u200f]*\r?\n[\t \u00a0\u200b-\u200f]*$/.test(gapNorm);
  if (alreadySingleBreak) return { hebrew, english };
  const nextStart = startGap + mB.index;
  const out =
    hebrew.slice(0, startGap) +
    '\n' +
    hebrew.slice(nextStart).replace(/^[\s\u00a0\u200b-\u200f]+/, '');
  return { hebrew: out, english };
}

/**
 * Siddur reader splits on `\n\n` (`renderTextWithParagraphs` → large margins between grey blocks).
 * Sefaria often emits `\n\n`, `<br><br>`, or `</p><p>` between short units (e.g. Birchot HaTorah).
 * Collapse those to a single `\n` so only intentional single line breaks remain.
 */
export function collapseSefariaParagraphBreaksToSingleNewline(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  const collapse = (s: string) => {
    let t = s.replace(/<\/p>\s*<p[^>]*>/gi, '\n');
    t = t.replace(/<br\s*\/?>/gi, '\n');
    t = t.replace(/(?:\r?\n[\t \u00a0\u200b-\u200f]*){2,}/g, '\n');
    return t;
  };
  return { hebrew: collapse(hebrew), english: collapse(english) };
}

/**
 * Birchot HaTorah: Sefaria often puts a line break between the first bracha’s chatima
 * (לַעֲסֹק בְּדִבְרֵי תוֹרָה:) and the start of וְהַעֲרֶב נָא… — join with a space so it reads on one line.
 */
export function joinBirkatHaTorahLaasokDivreiTorahWithVehaarevNa(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  const nik = '[\\u0591-\\u05C7]*';
  const tagGap = '(?:\\s|<[^>]+>)*';
  const bridgeGap = '(?:[\\s\\r\\n]|<[^>]+>|<br\\s*\\/?>)+';
  const re = new RegExp(
    `(ל${nik}ע${nik}ס${nik}ו${nik}ק${tagGap}ב${nik}ד${nik}ב${nik}ר${nik}י${nik}ת${nik}ו${nik}ר${nik}ה)(\\s*[:׃.])${bridgeGap}(?=ו${nik}ה${nik}ע${nik}ר${nik}ב${tagGap}נ${nik}א${tagGap}י${nik}ה${nik}ו${nik}ה)`,
    'u'
  );
  const out = hebrew.replace(re, '$1$2 ');
  return out === hebrew ? { hebrew, english } : { hebrew: out, english };
}

/**
 * Birchot HaTorah: remove line break between the Torah-reading pasuk’s close
 * (בְּנֵי יִשְׂרָאֵל אָמוֹר לָהֶם:) and the start of Birkat Kohanim (יְבָרֶכְךָ יְהֹוָה וְיִשְׁמְרֶךָ).
 */
export function joinBirkatHaTorahAmorLahemWithYevarechecha(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  const nik = '[\\u0591-\\u05C7]*';
  const tagGap = '(?:\\s|<[^>]+>)*';
  const bridgeGap = '(?:[\\s\\r\\n]|<[^>]+>|<br\\s*\\/?>)+';
  const re = new RegExp(
    `(ב${nik}נ${nik}י${nik}${tagGap}י${nik}ש${nik}ר${nik}א${nik}ל${nik}${tagGap}א${nik}מ${nik}ו${nik}ר${nik}${tagGap}ל${nik}ה${nik}ם)(\\s*[:׃.])${bridgeGap}(?=י${nik}ב${nik}ר${nik}כ${nik}ך${nik}${tagGap}י${nik}ה${nik}ו${nik}ה${tagGap}ו${nik}י${nik}ש${nik}מ${nik}ר${nik}ך${nik})`,
    'u'
  );
  const out = hebrew.replace(re, '$1$2 ');
  return out === hebrew ? { hebrew, english } : { hebrew: out, english };
}

/**
 * Birchot HaTorah: keep a paragraph break between
 * "וַאֲנִי אַבָרְכֵם:" and "אֵלּוּ דְבָרִים" (double newline, not single).
 */
export function enforceDoubleBreakAfterVaaniAvarchemBeforeEluDevarim(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  const nik = '[\\u0591-\\u05C7]*';
  const tagGap = '(?:\\s|<[^>]+>)*';
  const bridgeGap = '(?:[\\s\\r\\n]|<[^>]+>|<br\\s*\\/?>)+';
  const re = new RegExp(
    `(ו${nik}א${nik}נ${nik}י${tagGap}א${nik}ב${nik}ר${nik}כ${nik}ם)(\\s*[:׃.])${bridgeGap}(?=א${nik}ל${nik}ו${nik}${tagGap}ד${nik}ב${nik}ר${nik}י${nik}ם)`,
    'u'
  );
  const out = hebrew.replace(re, '$1$2\n\n');
  return out === hebrew ? { hebrew, english } : { hebrew: out, english };
}

/**
 * Shacharit ordering: ensure מודה אני and ברכת ציצית appear before נטילת ידים.
 * This mirrors printed flow for users who want these items before "על נטילת ידים".
 */
export function moveModehAniAndBirchasTzitzisBeforeNetilasYadayim(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  const stripNikkud = (s: string) => s.replace(/[\u0591-\u05C7]/g, '');
  const clean = stripHtmlKeepLineBreaks(hebrew);
  const paras = clean.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (paras.length < 2) return { hebrew, english };

  const norm = paras.map((p) => stripNikkud(p).replace(/\s+/g, ' ').trim());
  const netilasIdx = norm.findIndex((p) => /על\s+נטילת\s+ידים/.test(p));
  if (netilasIdx <= 0) return { hebrew, english };

  const modehIdx = norm.findIndex((p) => /(?:^| )מודה\s+אני(?: |$)/.test(p));
  const tzitzIdx = norm.findIndex(
    (p) =>
      /ציצית/.test(p) &&
      (/(להתעטף|מצות|מצווה)/.test(p) || /ברוך\s+אתה/.test(p))
  );

  const moveSet = new Set<number>();
  if (modehIdx > netilasIdx) moveSet.add(modehIdx);
  if (tzitzIdx > netilasIdx) moveSet.add(tzitzIdx);
  const shouldInjectModehAni = modehIdx === -1 && tzitzIdx !== -1;
  if (moveSet.size === 0 && !shouldInjectModehAni) return { hebrew, english };

  const moved = [...moveSet].sort((a, b) => a - b).map((i) => paras[i]);
  const kept = paras.filter((_, i) => !moveSet.has(i));
  const netilasIdxKept = kept.findIndex((p) =>
    /על\s+נטילת\s+יד/.test(stripNikkud(p).replace(/\s+/g, ' '))
  );
  if (netilasIdxKept < 0) return { hebrew, english };

  const modehAniFallback =
    'מוֹדֶה אֲנִי לְפָנֶֽיךָ מֶֽלֶךְ חַי וְקַיָּם שֶׁהֶחֱזַֽרְתָּ בִּי נִשְׁמָתִי בְּחֶמְלָה, רַבָּה אֱמוּנָתֶֽךָ:' +
    '\n' +
    'רֵאשִׁית חָכְמָה יִרְאַת יְהֹוָה, שֵֽׂכֶל טוֹב לְכָל־עֹשֵׂיהֶם, תְּהִלָּתוֹ עוֹמֶֽדֶת לָעַד: בָּרוּךְ שֵׁם כְּבוֹד מַלְכוּתוֹ לְעוֹלָם וָעֶד:';
  const reordered = [
    ...kept.slice(0, netilasIdxKept),
    ...(shouldInjectModehAni ? [modehAniFallback] : []),
    ...moved,
    ...kept.slice(netilasIdxKept),
  ];
  return { hebrew: reordered.join('\n\n'), english };
}

/**
 * Remove Sefaria visual separator artifacts (thin line / punctuation-only paragraph)
 * between "...הַמַּחֲזִיר נְשָׁמוֹת לִפְגָרִים מֵתִים:" and
 * "בָּרוּךְ ... לַעֲסֹק בְּדִבְרֵי תוֹרָה".
 */
export function removeSeparatorAfterHamachazirNeshamotBeforeLaasok(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  const nik = '[\\u0591-\\u05C7]*';
  const tagGap = '(?:\\s|<[^>]+>)*';
  const lineSep = '[\\-־_—–=~·•|\\\\/\\u2500-\\u257F\\u23af]';
  const re = new RegExp(
    `(מ${nik}ת${nik}י${nik}ם)(\\s*[:׃.])(?:\\s|<[^>]+>|<br\\s*\\/?>)*` +
      `(?:${lineSep}{2,}\\s*)?` +
      `(?:\\r?\\n\\s*(?:${lineSep}{2,})?\\s*)*` +
      `(?=ב${nik}ר${nik}ו${nik}ך${nik}${tagGap}א${nik}ת${nik}ה${tagGap}י${nik}ה${nik}ו${nik}ה${tagGap}א${nik}ש${nik}ר${tagGap}ק${nik}ד${nik}ש${nik}נ${nik}ו${tagGap}ל${nik}ע${nik}ס${nik}ו${nik}ק${tagGap}ב${nik}ד${nik}ב${nik}ר${nik}י${nik}${tagGap}ת${nik}ו${nik}ר${nik}ה)`,
    'u'
  );
  const out = hebrew.replace(re, '$1$2\n\n');
  return out === hebrew ? { hebrew, english } : { hebrew: out, english };
}

/**
 * Keep a paragraph break between "...כְּנֶֽגֶד כֻּלָּם:" and
 * "בָּרוּךְ ... הַנּוֹתֵן לַשֶּׂכְוִי בִינָה..." in Birchot HaShachar.
 */
export function enforceDoubleBreakAfterKenegedKulamBeforeHanotenLasechvi(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  const nik = '[\\u0591-\\u05C7]*';
  const tagGap = '(?:\\s|<[^>]+>)*';
  const bridgeGap = '(?:[\\s\\r\\n]|<[^>]+>|<br\\s*\\/?>)+';
  const re = new RegExp(
    `(כ${nik}נ${nik}ג${nik}ד${tagGap}כ${nik}ל${nik}ם)(\\s*[:׃.])${bridgeGap}(?=ב${nik}ר${nik}ו${nik}ך${nik}${tagGap}א${nik}ת${nik}ה${tagGap}י${nik}ה${nik}ו${nik}ה${tagGap}ה${nik}נ${nik}ו${nik}ת${nik}ן${tagGap}ל${nik}ש${nik}כ${nik}ו${nik}י${tagGap}ב${nik}י${nik}נ${nik}ה)`,
    'u'
  );
  const out = hebrew.replace(re, '$1$2\n\n');
  return out === hebrew ? { hebrew, english } : { hebrew: out, english };
}

/**
 * Keep a line break between "...הַמֵּכִין מִצְעֲדֵי גָֽבֶר:" and
 * "בָּרוּךְ ... שֶׁעָשָׂה לִי כָּל צָרְכִּי".
 */
export function enforceBreakAfterHameichinMitzadeiGaverBeforeSheasaLiKolTzorki(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  const nik = '[\\u0591-\\u05C7]*';
  const tagGap = '(?:\\s|<[^>]+>)*';
  const bridgeGap = '(?:[\\s\\r\\n]|<[^>]+>|<br\\s*\\/?>)+';
  const re = new RegExp(
    `(ה${nik}מ${nik}כ${nik}י${nik}ן${tagGap}מ${nik}צ${nik}ע${nik}ד${nik}י${tagGap}ג${nik}ב${nik}ר)(\\s*[:׃.])${bridgeGap}(?=ב${nik}ר${nik}ו${nik}ך${nik}${tagGap}א${nik}ת${nik}ה${tagGap}י${nik}ה${nik}ו${nik}ה${tagGap}ש${nik}ע${nik}ש${nik}ה${tagGap}ל${nik}י${tagGap}כ${nik}ל${tagGap}צ${nik}ר${nik}כ${nik}י)`,
    'u'
  );
  const out = hebrew.replace(re, '$1$2\n');
  return out === hebrew ? { hebrew, english } : { hebrew: out, english };
}

/**
 * Birchot HaTorah: fix duplicated wording in "...וְצֶאֱצָאֵינוּ וְצֶאֱצָאֵי צֶאֱצָאֵינוּ..."
 * to the standard "...וְצֶאֱצָאֵינוּ וְצֶאֱצָאֵי עַמְּךָ...".
 */
export function fixVenehiyehTzetzaeiDuplication(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  const nik = '[\\u0591-\\u05C7]*';
  const tagGap = '(?:\\s|<[^>]+>)*';
  const re = new RegExp(
    `(ו${nik}צ${nik}א${nik}צ${nik}א${nik}י${nik}${tagGap})צ${nik}א${nik}צ${nik}א${nik}י${nik}נ${nik}ו${nik}(?=${tagGap}ע${nik}מ${nik}ך)`,
    'gu'
  );
  const out = hebrew.replace(re, '$1');
  return out === hebrew ? { hebrew, english } : { hebrew: out, english };
}

/**
 * Birchot HaTorah (Sefaria): remove the printed note that this beracha is not said on Tish'a B'Av and Yom Kippur
 * (e.g. בט׳ אב ויוה״כ אין אומרים ברכה זו).
 */
export function removeBirchosHatorahTishaAvYomKippurInstruction(
  hebrew: string,
  english: string
): { hebrew: string; english: string } {
  const nik = '[\\u0591-\\u05C7]*';
  const tag = '(?:\\s|<[^>]+>)*';
  const quotes = `['׳״\u05F4\u201C\u201D]*`;
  // Accept both forms, including spaced apostrophe variants like "בט' אב" and "ט' באב".
  const b9Av = `(?:ב${nik}י${nik}ו${nik}ם${tag})?(?:ט${quotes}${tag}ב${nik}א${nik}ב|ב${nik}ט${quotes}${tag}א${nik}ב)`;
  const yk = `ו${nik}י${nik}ו${nik}ה${quotes}${nik}כ`;
  const einOmerim = `א${nik}י${nik}נ${tag}א${nik}ו${nik}מ${nik}ר${nik}י${nik}ם${tag}ב${nik}ר${nik}כ${nik}ה${tag}ז${nik}ו`;
  const body = `${b9Av}${tag}${yk}${tag}${einOmerim}`;
  const re = new RegExp(
    `${body}\\s*[:׃.]?(?:\\r?\\n|<br\\s*\\/?>|<\\/p>\\s*<p[^>]*>)?`,
    'gu'
  );
  let out = hebrew.replace(re, '');
  out = out.replace(/\n{3,}/g, '\n\n').trim();
  return { hebrew: out, english };
}

function stripNik(s: string): string {
  return s.replace(/[\u0591-\u05C7]/g, '').replace(/\u05BE/g, ' ');
}

/** Lines we must keep even when unvocalized (ritual cues, calendar labels, song-of-day). */
const KEEP_UNVOCALIZED_LINE =
  /(?:^|[\s:״"'‘’])(יאמר|יברך|יניח|ועונין|שליח צבור|בלחש|וכורך)(?:\s|$|:)|בראש חודש|נשים אומרות|בעשי"?ת|בקיץ|בחורף|^ג["״]פ|יום ראשון|יום שני|יום שלישי|יום רביעי|יום חמישי|יום ששי|יום שישי|שיר של יום|קודם שיהדק|קודם שמהדק|אחר שיהדק|ואח["״]כ/;

const SEFARIA_COMMENTARY_MARK =
  /אבודרהם|ערוה|ערוך השלחן|ערוך השולחן|טור או|לבוש|מגן אברהם|קיצשו|שו"ע|שו״ע|שער הכונות|דה"ח|דה״ח|א"ר סי|צפורן|כתב בספר|המנהג הפשוט|צריך לכוין|צריך לאומרו|יש לאומרו|צריך שיכוין|מזמור זה|מזמור לתודה יש|פיוט |מיוחס|הטעם ש|אין להפסיק|אמרו חכמים|קבעו ל|יש מי ש|יש שאין|לפיכך יאמר|אומרים פרשת|תקנו לומר|בויברך|המתפלל צריך|נהגו לומר|אם נזכר|שכח ולא|טעה ולא|אינו חוזר|חוזר לראש|חוזר ומתחיל|מה שתקנו/;

function isUnvocalizedSefariaNote(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (KEEP_UNVOCALIZED_LINE.test(t)) return false;
  const heb = (t.match(/[\u05D0-\u05EA]/g) || []).length;
  const nik = (t.match(/[\u0591-\u05C7]/g) || []).length;
  if (heb < 2) return false;
  const noNik = nik === 0 || nik / heb < 0.08;
  if (!noNik) return false;
  if (SEFARIA_COMMENTARY_MARK.test(t)) return true;
  // Short editorial headings (Yigdal ikkarim, “אבות”, “משנה א” without the mishnah body).
  return heb <= 36 && !/[.:׃]/.test(t.slice(-1));
}

function dropLeadingUnvocalizedNote(line: string): string {
  if (isUnvocalizedSefariaNote(line)) return '';
  const nikIdx = line.search(/[\u0591-\u05C7]/);
  if (nikIdx <= 12) return line;
  const prefix = line.slice(0, nikIdx);
  if (!SEFARIA_COMMENTARY_MARK.test(prefix) && !isUnvocalizedSefariaNote(prefix)) return line;
  if (KEEP_UNVOCALIZED_LINE.test(prefix)) return line;
  let i = nikIdx;
  while (i > 0 && /[\u05D0-\u05EA\u0591-\u05C7]/.test(line[i - 1] || '')) i--;
  return line.slice(i).trimStart();
}

/**
 * Morning berachot stay in the reader; optional הרחבות start at
 * אלהינו ואלהי אבותינו זכרנו בזכרון טוב… (not after הנותן לשכוי).
 */
export function splitBirchotHashacharCoreAndExpansion(
  hebrew: string,
  english: string
): {
  beforeHebrew: string;
  beforeEnglish: string;
  foldoutHebrew: string;
  foldoutEnglish: string;
} | null {
  const hp = splitParas(hebrew);
  const ep = splitParas(english);
  const foldIdx = hp.findIndex((p) =>
    /(?:אלהינו|אלוקינו|אלוהינו)\s+(?:ואלקי|ואלהי)\s+אבותינו\s+זכרנו/.test(stripNik(p))
  );
  if (foldIdx > 0) {
    const beforeHebrew = hp.slice(0, foldIdx).join('\n\n').trim();
    const foldoutHebrew = hp.slice(foldIdx).join('\n\n').trim();
    if (beforeHebrew.length > 80 && foldoutHebrew.length > 80) {
      return {
        beforeHebrew,
        foldoutHebrew,
        beforeEnglish: ep.slice(0, Math.min(foldIdx, ep.length)).join('\n\n').trim(),
        foldoutEnglish: ep.slice(Math.min(foldIdx, ep.length)).join('\n\n').trim(),
      };
    }
  }
  return null;
}

function splitParas(s: string): string[] {
  return s.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

/**
 * @deprecated Calendar omit/swap now lives in pack markers + OfflineShacharitService.
 * Pass-through kept for any stray callers.
 */
export function applyShacharitSectionCalendarGates(
  _sectionKey: string,
  hebrew: string,
  english: string,
  _date: Date,
  _opts: {
    tachanun: boolean;
    aseret: boolean;
    roshChodesh: boolean;
    ledavidSeason: boolean;
    fastOrAseret: boolean;
    mondayThursday: boolean;
  }
): { hebrew: string; english: string } {
  return { hebrew, english };
}
