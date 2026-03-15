import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Modal,
  useWindowDimensions,
  PanResponder,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/core';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { FadeIn } from '../../components/animations/FadeIn';
import { colors } from '../../src/design/colors';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { useTheme } from '../../src/design/theme';
import { SefariaService, PrayerTextData } from '../../src/services/SefariaService';
import { JewishCalendarService } from '../../src/core/calendar/JewishCalendar';
import { UserPreferencesService } from '../../src/storage/UserPreferences';
import { recordDaveningToday } from '../../src/storage/DaveningStreakService';
import { MizrachCompass } from '../../components/ui/MizrachCompass';
import { BackButton } from '../../components/ui/BackButton';
import { ReaderChrome, READER_CHROME_HEADER_HEIGHT_APPROX } from '../../components/reader/ReaderChrome';
import { ReaderToolbar } from '../../components/reader/ReaderToolbar';
import { ReaderAutoscrollBar } from '../../components/reader/ReaderAutoscrollBar';
import type { DisplayPreferences } from '../../src/types/preferences';

interface RouteParams {
  service: 'shacharis' | 'mincha' | 'maariv' | 'brachos' | 'shabbos' | 'bentching' | 'bedtime' | 'shema' | 'modeh_ani' | 'tefilas_haderech' | 'asher_yatzar';
  /** When set, show this single section as a full page (no pop-down list). */
  sectionKey?: string;
}

interface Section {
  key: string;
  title: string;
  hebrewTitle: string;
}

/** Trim Birkat Hamazon to start from first bracha (בָּרוּךְ אַתָּה ... הַזָּן אֶת הָעוֹלָם). */
function trimBirkatHamazon(content: PrayerTextData): PrayerTextData {
  let { hebrew, english, hebrewSegments, englishSegments } = content;
  const stripNikkud = (s: string) => s.replace(/[\u0591-\u05C7]/g, '');
  const strippedHeb = stripNikkud(hebrew);
  let feedIdx = strippedHeb.indexOf('הזן את העולם');
  if (feedIdx === -1) feedIdx = strippedHeb.indexOf('הזן');
  if (feedIdx !== -1) {
    const brachaStartStripped = strippedHeb.lastIndexOf('ברוך אתה', feedIdx);
    if (brachaStartStripped !== -1) {
      const strippedToOriginal: number[] = [];
      for (let i = 0; i < hebrew.length; i++) {
        if (!/[\u0591-\u05C7]/.test(hebrew[i])) strippedToOriginal.push(i);
      }
      const start = strippedToOriginal[brachaStartStripped] ?? 0;
      hebrew = hebrew.slice(start);
      hebrewSegments = [{ text: hebrew, italic: false }];
    }
  } else {
    const firstBaruch = strippedHeb.indexOf('ברוך אתה');
    if (firstBaruch > 0) {
      const strippedToOriginal: number[] = [];
      for (let i = 0; i < hebrew.length; i++) {
        if (!/[\u0591-\u05C7]/.test(hebrew[i])) strippedToOriginal.push(i);
      }
      const start = strippedToOriginal[firstBaruch] ?? 0;
      hebrew = hebrew.slice(start);
      hebrewSegments = [{ text: hebrew, italic: false }];
    }
  }
  const feedEn = english.search(/Who\s+(?:nourishes|feeds)\s+(?:the\s+entire\s+)?(?:world|whole\s+world)/i);
  if (feedEn !== -1) {
    const beforeFeed = english.slice(0, feedEn);
    const blessed = beforeFeed.lastIndexOf('Blessed are You');
    if (blessed !== -1) {
      english = english.slice(blessed);
      englishSegments = [{ text: english, italic: false }];
    }
  } else {
    const blessed = english.indexOf('Blessed are You');
    if (blessed > 0) {
      english = english.slice(blessed);
      englishSegments = [{ text: english, italic: false }];
    }
  }

  // Cut everything between end of first bracha (הזן...כולו/הכול) and "נודה לך", and put Nodeh on a new line.
  // Only look for end-of-first-bracha in the segment between "הזן" and "נודה" so we don't pick words from the middle.
  const strippedHeb2 = stripNikkud(hebrew);
  let nodehStartStripped = strippedHeb2.indexOf('נודה לך');
  if (nodehStartStripped === -1) nodehStartStripped = strippedHeb2.indexOf('נודה ');
  if (nodehStartStripped === -1) nodehStartStripped = strippedHeb2.indexOf('נודה');
  let endFirstBrachaStripped = -1;
  const hazanIdx = strippedHeb2.indexOf('הזן');
  if (nodehStartStripped > 0 && hazanIdx !== -1 && nodehStartStripped > hazanIdx) {
    const between = strippedHeb2.slice(hazanIdx, nodehStartStripped); // first bracha + middle junk
    // End of first bracha = last "העולם כולו" or "כולו" or "הכול" or "הכל" in this segment only
    const idxKol = Math.max(
      between.lastIndexOf('העולם כולו'),
      between.lastIndexOf('כולו'),
      between.lastIndexOf('הכול'),
      between.lastIndexOf('הכל')
    );
    if (idxKol !== -1) {
      const rest = between.slice(idxKol);
      // Only take the phrase + optional trailing punctuation (don't consume next words like "ברכה זו")
      const word = rest.match(/^(העולם\s+כולו|כולו|הכול|הכל)\s*[:.,]?\s*/)?.[0] ?? rest.slice(0, 8);
      endFirstBrachaStripped = hazanIdx + idxKol + word.length;
    } else if (between.includes('\n\n')) {
      endFirstBrachaStripped = hazanIdx + between.indexOf('\n\n') + 2;
    }
  }
  if (nodehStartStripped > 0 && endFirstBrachaStripped > 0 && endFirstBrachaStripped < nodehStartStripped) {
    const strippedToOriginal: number[] = [];
    for (let i = 0; i < hebrew.length; i++) {
      if (!/[\u0591-\u05C7]/.test(hebrew[i])) strippedToOriginal.push(i);
    }
    const endOriginal = strippedToOriginal[endFirstBrachaStripped] ?? endFirstBrachaStripped;
    const startOriginal = strippedToOriginal[nodehStartStripped] ?? nodehStartStripped;
    hebrew = hebrew.slice(0, endOriginal).trimEnd() + '\n\n' + hebrew.slice(startOriginal);
    hebrewSegments = [{ text: hebrew, italic: false }];
  }
  const nodehEnMatch = english.match(/\b(We\s+(?:will\s+)?(?:give\s+thanks|thank)\s+You|Nodeh\s+lecha)/i);
  const nodehStartEn = nodehEnMatch ? (nodehEnMatch.index ?? -1) : -1;
  if (nodehStartEn !== -1 && nodehStartEn > 0) {
    const beforeNodeh = english.slice(0, nodehStartEn);
    const endM = beforeNodeh.match(/(?:world|all|everything|whole\s+world)\.?\s*$/i);
    const endEn = endM ? beforeNodeh.lastIndexOf(endM[0]) + endM[0].length : -1;
    if (endEn > 0 && endEn < nodehStartEn) {
      english = english.slice(0, endEn).trimEnd() + '\n\n' + english.slice(nodehStartEn);
      englishSegments = [{ text: english, italic: false }];
    }
  }

  // Al HaNissim: hide by default; on Chanukah show only Chanukah paragraph, on Purim only Purim; normal day skip straight to ועל הכול
  const alHanissim = JewishCalendarService.isAlHanissim(new Date());
  const strippedHeb3 = stripNikkud(hebrew).replace(/\u05BE/g, ' '); // normalize maqaf so "בכל־יום" matches
  const blockStartStripped = strippedHeb3.indexOf('בחנוכה ופורים') !== -1 ? strippedHeb3.indexOf('בחנוכה ופורים')
    : strippedHeb3.indexOf('בחנוכה אומרים') !== -1 ? strippedHeb3.indexOf('בחנוכה אומרים')
    : strippedHeb3.indexOf('בחנוכה');
  const idxVeal = strippedHeb3.indexOf('ועל הכול') !== -1 ? strippedHeb3.indexOf('ועל הכול') : strippedHeb3.indexOf('ועל הכל');
  if (blockStartStripped !== -1 && idxVeal !== -1 && idxVeal > blockStartStripped) {
    const beforeBlock = strippedHeb3.slice(0, blockStartStripped);
    const lastShea = beforeBlock.lastIndexOf('שעה');
    let endBecholStripped = lastShea !== -1 ? lastShea + 3 : blockStartStripped;
    if (strippedHeb3[endBecholStripped] === ':') endBecholStripped += 1;
    while (endBecholStripped < strippedHeb3.length && (strippedHeb3[endBecholStripped] === ' ' || strippedHeb3[endBecholStripped] === '\n')) endBecholStripped += 1;
    const strippedToOriginal: number[] = [];
    for (let i = 0; i < hebrew.length; i++) {
      if (!/[\u0591-\u05C7]/.test(hebrew[i])) strippedToOriginal.push(i);
    }
    const endBecholOriginal = strippedToOriginal[endBecholStripped] ?? endBecholStripped;
    const vealOriginal = strippedToOriginal[idxVeal] ?? idxVeal;
    if (alHanissim === false) {
      hebrew = hebrew.slice(0, endBecholOriginal).trimEnd() + '\n\n' + hebrew.slice(vealOriginal);
      hebrewSegments = [{ text: hebrew, italic: false }];
    } else if (alHanissim === 'chanukah') {
      const chanukahStart = strippedHeb3.indexOf('בחנוכה אומרים', blockStartStripped);
      const purimStart = strippedHeb3.indexOf('בפורים אומרים', blockStartStripped);
      if (chanukahStart !== -1 && purimStart > chanukahStart) {
        const chanukahEndOriginal = strippedToOriginal[purimStart] ?? purimStart;
        const chanukahStartOriginal = strippedToOriginal[chanukahStart] ?? chanukahStart;
        const chanukahBlock = hebrew.slice(chanukahStartOriginal, chanukahEndOriginal).trim();
        hebrew = hebrew.slice(0, endBecholOriginal).trimEnd() + '\n\n' + chanukahBlock + '\n\n' + hebrew.slice(vealOriginal);
        hebrewSegments = [{ text: hebrew, italic: false }];
      } else {
        hebrew = hebrew.slice(0, endBecholOriginal).trimEnd() + '\n\n' + hebrew.slice(vealOriginal);
        hebrewSegments = [{ text: hebrew, italic: false }];
      }
    } else if (alHanissim === 'purim') {
      const purimStart = strippedHeb3.indexOf('בפורים אומרים', blockStartStripped);
      if (purimStart !== -1 && purimStart < idxVeal) {
        const purimStartOriginal = strippedToOriginal[purimStart] ?? purimStart;
        const purimBlock = hebrew.slice(purimStartOriginal, vealOriginal).trim();
        hebrew = hebrew.slice(0, endBecholOriginal).trimEnd() + '\n\n' + purimBlock + '\n\n' + hebrew.slice(vealOriginal);
        hebrewSegments = [{ text: hebrew, italic: false }];
      } else {
        hebrew = hebrew.slice(0, endBecholOriginal).trimEnd() + '\n\n' + hebrew.slice(vealOriginal);
        hebrewSegments = [{ text: hebrew, italic: false }];
      }
    }
  }

  // Remove "בונה ירושלים דוד ושלמה תקנוה..." paragraph (who established the bracha) through "וכן'." / "וכו'."
  const strippedBoneh = stripNikkud(hebrew);
  const bonehStart = strippedBoneh.indexOf('בונה ירושלים');
  if (bonehStart !== -1) {
    const afterBoneh = strippedBoneh.slice(bonehStart);
    const endMatch = afterBoneh.match(/[\s\S]*?(?:וכן['']\.?|וכו['']\.?)/);
    if (endMatch) {
      const endStripped = bonehStart + endMatch[0].length;
      const strippedToOriginal: number[] = [];
      for (let i = 0; i < hebrew.length; i++) {
        if (!/[\u0591-\u05C7]/.test(hebrew[i])) strippedToOriginal.push(i);
      }
      const startOriginal = strippedToOriginal[bonehStart] ?? bonehStart;
      const lastStrippedIdx = endStripped - 1;
      let endOriginal = (strippedToOriginal[lastStrippedIdx] ?? lastStrippedIdx) + 1;
      while (endOriginal < hebrew.length && /[\u0591-\u05C7]/.test(hebrew[endOriginal])) endOriginal++;
      hebrew = (hebrew.slice(0, startOriginal).trimEnd() + '\n\n' + hebrew.slice(endOriginal).trimStart()).trim();
      hebrewSegments = [{ text: hebrew, italic: false }];
    }
  }

  // Remove Shabbat addition: "בשבת מוסיפים:" through "וּבַעַל הַנֶּחָמוֹת:"
  const strippedShabbos = stripNikkud(hebrew);
  const shabbosStart = strippedShabbos.indexOf('בשבת מוסיפים');
  if (shabbosStart !== -1) {
    const afterShabbos = strippedShabbos.slice(shabbosStart);
    const endMatch = afterShabbos.match(/[\s\S]*?ובעל הנחמות:?/);
    if (endMatch) {
      const endStripped = shabbosStart + endMatch[0].length;
      const strippedToOriginal: number[] = [];
      for (let i = 0; i < hebrew.length; i++) {
        if (!/[\u0591-\u05C7]/.test(hebrew[i])) strippedToOriginal.push(i);
      }
      const startOriginal = strippedToOriginal[shabbosStart] ?? shabbosStart;
      const lastStrippedIdx = endStripped - 1;
      let endOriginal = (strippedToOriginal[lastStrippedIdx] ?? lastStrippedIdx) + 1;
      while (endOriginal < hebrew.length && /[\u0591-\u05C7]/.test(hebrew[endOriginal])) endOriginal++;
      hebrew = (hebrew.slice(0, startOriginal).trimEnd() + '\n\n' + hebrew.slice(endOriginal).trimStart()).trim();
      hebrewSegments = [{ text: hebrew, italic: false }];
    }
  }

  // Remove halacha paragraph: "שכח לומר רצה..." through "דיני שכחה:"
  const strippedHalacha = stripNikkud(hebrew);
  const halachaStart = strippedHalacha.indexOf('שכח לומר');
  if (halachaStart !== -1) {
    const afterHalacha = strippedHalacha.slice(halachaStart);
    const endMatch = afterHalacha.match(/[\s\S]*?דיני שכחה:?/);
    if (endMatch) {
      const endStripped = halachaStart + endMatch[0].length;
      const strippedToOriginal: number[] = [];
      for (let i = 0; i < hebrew.length; i++) {
        if (!/[\u0591-\u05C7]/.test(hebrew[i])) strippedToOriginal.push(i);
      }
      const startOriginal = strippedToOriginal[halachaStart] ?? halachaStart;
      const lastStrippedIdx = endStripped - 1;
      let endOriginal = (strippedToOriginal[lastStrippedIdx] ?? lastStrippedIdx) + 1;
      while (endOriginal < hebrew.length && /[\u0591-\u05C7]/.test(hebrew[endOriginal])) endOriginal++;
      if (endOriginal < hebrew.length && hebrew[endOriginal] === ':') endOriginal += 1;
      hebrew = (hebrew.slice(0, startOriginal).trimEnd() + '\n\n' + hebrew.slice(endOriginal).trimStart()).trim();
      hebrewSegments = [{ text: hebrew, italic: false }];
    }
  }

  // Remove "הטוב והמטיב ביבנה תקנוה..." paragraph through "שנתנו לקבורה."
  const strippedTov = stripNikkud(hebrew);
  const tovStart = strippedTov.indexOf('הטוב והמטיב ביבנה');
  if (tovStart === -1) {
    const alt = strippedTov.indexOf('הטוב והמטיב');
    if (alt !== -1 && strippedTov.slice(alt).includes('תקנוה')) {
      const afterAlt = strippedTov.slice(alt);
      const endMatch = afterAlt.match(/[\s\S]*?שנתנו לקבורה\.?/);
      if (endMatch) {
        const endStripped = alt + endMatch[0].length;
        const strippedToOriginal: number[] = [];
        for (let i = 0; i < hebrew.length; i++) {
          if (!/[\u0591-\u05C7]/.test(hebrew[i])) strippedToOriginal.push(i);
        }
        const startOriginal = strippedToOriginal[alt] ?? alt;
        const lastStrippedIdx = endStripped - 1;
        let endOriginal = (strippedToOriginal[lastStrippedIdx] ?? lastStrippedIdx) + 1;
        while (endOriginal < hebrew.length && /[\u0591-\u05C7]/.test(hebrew[endOriginal])) endOriginal++;
        if (endOriginal < hebrew.length && hebrew[endOriginal] === '.') endOriginal += 1;
        hebrew = (hebrew.slice(0, startOriginal).trimEnd() + '\n\n' + hebrew.slice(endOriginal).trimStart()).trim();
        hebrewSegments = [{ text: hebrew, italic: false }];
      }
    }
  } else {
    const afterTov = strippedTov.slice(tovStart);
    const endMatch = afterTov.match(/[\s\S]*?שנתנו לקבורה\.?/);
    if (endMatch) {
      const endStripped = tovStart + endMatch[0].length;
      const strippedToOriginal: number[] = [];
      for (let i = 0; i < hebrew.length; i++) {
        if (!/[\u0591-\u05C7]/.test(hebrew[i])) strippedToOriginal.push(i);
      }
      const startOriginal = strippedToOriginal[tovStart] ?? tovStart;
      const lastStrippedIdx = endStripped - 1;
      let endOriginal = (strippedToOriginal[lastStrippedIdx] ?? lastStrippedIdx) + 1;
      while (endOriginal < hebrew.length && /[\u0591-\u05C7]/.test(hebrew[endOriginal])) endOriginal++;
      if (endOriginal < hebrew.length && hebrew[endOriginal] === '.') endOriginal += 1;
      hebrew = (hebrew.slice(0, startOriginal).trimEnd() + '\n\n' + hebrew.slice(endOriginal).trimStart()).trim();
      hebrewSegments = [{ text: hebrew, italic: false }];
    }
  }

  // Yaaleh V'Yavo: hide unless Rosh Chodesh / Chol Hamoed / relevant Yom Tov; when shown, highlight the phrase for the day
  const strippedYv = stripNikkud(hebrew);
  const yvStartStripped = strippedYv.indexOf('בראש חודש') !== -1 ? strippedYv.indexOf('בראש חודש') : strippedYv.indexOf('יעלה ויבא');
  const yvEndMarker = 'ורחום אתה';
  const yvEndInStripped = yvStartStripped !== -1 ? strippedYv.indexOf(yvEndMarker, yvStartStripped) : -1;
  const yvEndStripped = yvEndInStripped !== -1 ? yvEndInStripped + yvEndMarker.length : -1;
  if (yvStartStripped !== -1 && yvEndStripped > yvStartStripped) {
    if (!JewishCalendarService.isYaalehVyavoDay(new Date())) {
      const strippedToOriginal: number[] = [];
      for (let i = 0; i < hebrew.length; i++) {
        if (!/[\u0591-\u05C7]/.test(hebrew[i])) strippedToOriginal.push(i);
      }
      const startOriginal = strippedToOriginal[yvStartStripped] ?? yvStartStripped;
      let endOriginal = (strippedToOriginal[yvEndStripped - 1] ?? yvEndStripped - 1) + 1;
      while (endOriginal < hebrew.length && /[\u0591-\u05C7]/.test(hebrew[endOriginal])) endOriginal++;
      if (strippedYv[yvEndStripped] === ':') endOriginal += 1;
      hebrew = (hebrew.slice(0, startOriginal).trimEnd() + '\n\n' + hebrew.slice(endOriginal).trimStart()).trim();
      hebrewSegments = [{ text: hebrew, italic: false }];
    }
  }

  // Day-specific HaRachaman lines: only show on the applicable day
  // Pattern includes "הרחמן" to distinguish from Yaaleh V'Yavo "בראש חודש ובחול המועד..."
  const daySpecificLines: { startPattern: string; endPattern: string; check: () => boolean }[] = [
    { startPattern: 'בשבת', endPattern: 'העולמים', check: () => JewishCalendarService.isShabbos(new Date()) },
    { startPattern: 'ביום טוב', endPattern: 'כלו טוב', check: () => JewishCalendarService.isYomTov(new Date()) },
    { startPattern: 'בראש חודש', endPattern: 'ולברכה', check: () => JewishCalendarService.isRoshChodesh(new Date()) },
    { startPattern: 'בראש השנה', endPattern: 'ולברכה', check: () => { const hd = JewishCalendarService.getJewishDate(new Date()); return hd.getMonth() === 7 && (hd.getDate() === 1 || hd.getDate() === 2); } },
    { startPattern: 'בסוכות', endPattern: 'הנופלת', check: () => { const hd = JewishCalendarService.getJewishDate(new Date()); return hd.getMonth() === 7 && hd.getDate() >= 15 && hd.getDate() <= 22; } },
  ];
  for (const { startPattern, endPattern, check } of daySpecificLines) {
    const strippedDay = stripNikkud(hebrew);
    let searchIdx = 0;
    while (true) {
      const lineStart = strippedDay.indexOf(startPattern, searchIdx);
      if (lineStart === -1) break;
      const afterStart = strippedDay.slice(lineStart);
      // Only match if "הרחמן" appears within 20 chars (not "ובחול המועד" which indicates Yaaleh V'Yavo)
      const next20 = afterStart.slice(0, 20);
      if (!next20.includes('הרחמן') || next20.includes('ובחול')) {
        searchIdx = lineStart + 1;
        continue;
      }
      if (!check()) {
        const endIdx = afterStart.indexOf(endPattern);
        if (endIdx !== -1) {
          const lineEndStripped = lineStart + endIdx + endPattern.length;
          const strippedToOriginal: number[] = [];
          for (let i = 0; i < hebrew.length; i++) {
            if (!/[\u0591-\u05C7]/.test(hebrew[i])) strippedToOriginal.push(i);
          }
          const startOriginal = strippedToOriginal[lineStart] ?? lineStart;
          let endOriginal = (strippedToOriginal[lineEndStripped - 1] ?? lineEndStripped - 1) + 1;
          while (endOriginal < hebrew.length && /[\u0591-\u05C7\s.:]/.test(hebrew[endOriginal])) endOriginal++;
          hebrew = (hebrew.slice(0, startOriginal).trimEnd() + '\n' + hebrew.slice(endOriginal).trimStart()).trim();
          break;
        }
      }
      searchIdx = lineStart + 1;
    }
  }

  // Fix backwards "תע" → "עת" in the phrase "בכל עת ובכל שעה" (letters mixed up / out of line in source)

  // Join HaRachaman sentences onto same lines (traditional formatting)
  // Find the הרחמן section and process it as a block
  {
    const stripped = stripNikkud(hebrew);
    const firstHarachaman = stripped.indexOf('הרחמן הוא ימלוך');
    const beforeBayis = stripped.indexOf('בבית אביו אומר');
    if (firstHarachaman !== -1) {
      // Map positions to original text
      const toOrig: number[] = [];
      for (let i = 0; i < hebrew.length; i++) {
        if (!/[\u0591-\u05C7]/.test(hebrew[i])) toOrig.push(i);
      }
      const startOrig = toOrig[firstHarachaman] ?? firstHarachaman;
      const endIdx = beforeBayis !== -1 ? beforeBayis : stripped.length;
      const endOrig = toOrig[endIdx] ?? endIdx;
      // Extract the הרחמן section
      let harachamanSection = hebrew.slice(startOrig, endOrig);
      // Remove ALL newlines in this section
      harachamanSection = harachamanSection.replace(/\n+/g, ' ');
      // Collapse multiple spaces
      harachamanSection = harachamanSection.replace(/\s+/g, ' ');
      // Now add back specific line breaks using stripped matching
      const sectionStripped = stripNikkud(harachamanSection);
      // After עולמים. (end of group 1)
      const olamimMatch = sectionStripped.match(/עולמים\./);
      if (olamimMatch && olamimMatch.index !== undefined) {
        const olamimEnd = olamimMatch.index + olamimMatch[0].length;
        const secToOrig: number[] = [];
        for (let i = 0; i < harachamanSection.length; i++) {
          if (!/[\u0591-\u05C7]/.test(harachamanSection[i])) secToOrig.push(i);
        }
        const origEnd = secToOrig[olamimEnd] ?? olamimEnd;
        // Find start of next word (skip whitespace)
        let nextStart = origEnd;
        while (nextStart < harachamanSection.length && /\s/.test(harachamanSection[nextStart])) nextStart++;
        harachamanSection = harachamanSection.slice(0, origEnd) + '\n' + harachamanSection.slice(nextStart);
      }
      // After ונחמות. (end of group 2)
      const updatedStripped = stripNikkud(harachamanSection);
      const nechamosMatch = updatedStripped.match(/ונחמות[.:]/);
      if (nechamosMatch && nechamosMatch.index !== undefined) {
        const nechamosEnd = nechamosMatch.index + nechamosMatch[0].length;
        const secToOrig2: number[] = [];
        for (let i = 0; i < harachamanSection.length; i++) {
          if (!/[\u0591-\u05C7]/.test(harachamanSection[i])) secToOrig2.push(i);
        }
        const origEnd2 = secToOrig2[nechamosEnd] ?? nechamosEnd;
        // Find start of next word
        let nextStart2 = origEnd2;
        while (nextStart2 < harachamanSection.length && /\s/.test(harachamanSection[nextStart2])) nextStart2++;
        harachamanSection = harachamanSection.slice(0, origEnd2) + '\n' + harachamanSection.slice(nextStart2);
      }
      // Reconstruct the full text
      hebrew = hebrew.slice(0, startOrig) + harachamanSection + hebrew.slice(endOrig);
    }
  }

  // Remove instructions between "ונחמות" and "הרחמן הוא יברך את אבי"
  {
    const stripped = stripNikkud(hebrew);
    const nechamosIdx = stripped.indexOf('ונחמות.');
    const yevarechIdx = stripped.indexOf('הרחמן הוא יברך את אבי');
    if (nechamosIdx !== -1 && yevarechIdx !== -1 && yevarechIdx > nechamosIdx) {
      const toOrig: number[] = [];
      for (let i = 0; i < hebrew.length; i++) {
        if (!/[\u0591-\u05C7]/.test(hebrew[i])) toOrig.push(i);
      }
      // End of ונחמות. (include the period)
      const endNechamos = nechamosIdx + 'ונחמות.'.length;
      let origEndNechamos = toOrig[endNechamos - 1] ?? endNechamos - 1;
      // Include trailing nikkud after period
      while (origEndNechamos + 1 < hebrew.length && /[\u0591-\u05C7]/.test(hebrew[origEndNechamos + 1])) {
        origEndNechamos++;
      }
      origEndNechamos++; // move past the period
      // Start of הרחמן הוא יברך
      const origStartYevarech = toOrig[yevarechIdx] ?? yevarechIdx;
      // Replace everything between with just a newline
      hebrew = hebrew.slice(0, origEndNechamos) + '\n' + hebrew.slice(origStartYevarech);
    }
  }

  // Hide day-specific הרחמן lines unless applicable
  // "ביו"ט אומר:הרחמן הוא ינחילנו יום שכולו טוב" - only on Yom Tov
  {
    const stripped = stripNikkud(hebrew);
    const yomTovHarachamanIdx = stripped.indexOf('ביו"ט אומר');
    if (yomTovHarachamanIdx === -1) {
      // Try alternate: just the הרחמן line without instruction
      const altIdx = stripped.indexOf('הרחמן הוא ינחילנו יום שכלו טוב');
      if (altIdx !== -1 && !JewishCalendarService.isYomTov(new Date())) {
        const toOrig: number[] = [];
        for (let i = 0; i < hebrew.length; i++) {
          if (!/[\u0591-\u05C7]/.test(hebrew[i])) toOrig.push(i);
        }
        // Find the end of this line (until : or next line)
        let endIdx = stripped.indexOf(':', altIdx + 10);
        if (endIdx === -1) endIdx = stripped.indexOf('\n', altIdx);
        if (endIdx === -1) endIdx = altIdx + 40;
        const origStart = toOrig[altIdx] ?? altIdx;
        let origEnd = toOrig[endIdx] ?? endIdx;
        origEnd++;
        while (origEnd < hebrew.length && /[\s\u0591-\u05C7]/.test(hebrew[origEnd])) origEnd++;
        hebrew = hebrew.slice(0, origStart) + hebrew.slice(origEnd);
      }
    } else if (!JewishCalendarService.isYomTov(new Date())) {
      // Remove the entire line including instruction
      const toOrig: number[] = [];
      for (let i = 0; i < hebrew.length; i++) {
        if (!/[\u0591-\u05C7]/.test(hebrew[i])) toOrig.push(i);
      }
      // Find end of line (after טוב:)
      let endIdx = stripped.indexOf('טוב:', yomTovHarachamanIdx);
      if (endIdx === -1) endIdx = stripped.indexOf('טוב', yomTovHarachamanIdx);
      if (endIdx !== -1) {
        endIdx += 'טוב:'.length;
        const origStart = toOrig[yomTovHarachamanIdx] ?? yomTovHarachamanIdx;
        let origEnd = toOrig[endIdx] ?? endIdx;
        while (origEnd < hebrew.length && /[\s\u0591-\u05C7]/.test(hebrew[origEnd])) origEnd++;
        hebrew = hebrew.slice(0, origStart) + hebrew.slice(origEnd);
      }
    }
  }

  // Hide "(בשבת וביו"ט אומר:מגדול...)" unless Shabbat or Yom Tov
  {
    const stripped = stripNikkud(hebrew);
    const migdolIdx = stripped.indexOf('בשבת וביו"ט אומר');
    if (migdolIdx === -1) {
      // Try alternate pattern
      const altIdx = stripped.indexOf('מגדול ישועות');
      if (altIdx !== -1) {
        // Check if there's instruction text before it
        const beforeText = stripped.slice(Math.max(0, altIdx - 50), altIdx);
        if (beforeText.includes('בשבת') || beforeText.includes('ביום טוב')) {
          // There's an instruction - handle it
          const isShabbosOrYomTov = JewishCalendarService.isShabbos(new Date()) || JewishCalendarService.isYomTov(new Date());
          if (!isShabbosOrYomTov) {
            // Find and remove the instruction + מגדול, keep מגדיל
            const toOrig: number[] = [];
            for (let i = 0; i < hebrew.length; i++) {
              if (!/[\u0591-\u05C7]/.test(hebrew[i])) toOrig.push(i);
            }
            // Find the closing paren after מגדול
            const closeParenIdx = stripped.indexOf(')', altIdx);
            if (closeParenIdx !== -1) {
              const startSearch = stripped.lastIndexOf('(', altIdx);
              if (startSearch !== -1) {
                const origStart = toOrig[startSearch] ?? startSearch;
                let origEnd = toOrig[closeParenIdx] ?? closeParenIdx;
                origEnd++; // include the )
                hebrew = hebrew.slice(0, origStart) + hebrew.slice(origEnd);
              }
            }
          }
        }
      }
    } else {
      const isShabbosOrYomTov = JewishCalendarService.isShabbos(new Date()) || JewishCalendarService.isYomTov(new Date());
      if (!isShabbosOrYomTov) {
        // Remove the entire parenthetical instruction
        const toOrig: number[] = [];
        for (let i = 0; i < hebrew.length; i++) {
          if (!/[\u0591-\u05C7]/.test(hebrew[i])) toOrig.push(i);
        }
        // Find opening paren before this
        const openParen = stripped.lastIndexOf('(', migdolIdx);
        const closeParen = stripped.indexOf(')', migdolIdx);
        if (openParen !== -1 && closeParen !== -1) {
          const origStart = toOrig[openParen] ?? openParen;
          let origEnd = toOrig[closeParen] ?? closeParen;
          origEnd++; // include )
          hebrew = hebrew.slice(0, origStart) + hebrew.slice(origEnd);
        }
      }
    }
  }

  // Fix instruction block: remove ) after יאמר:, add )\n after first לי.
  // Step 1: Remove ) after יאמר: in the instruction
  {
    const stripped = stripNikkud(hebrew);
    const idx = stripped.indexOf('יאמר:)');
    if (idx !== -1) {
      const toOrig: number[] = [];
      for (let i = 0; i < hebrew.length; i++) {
        if (!/[\u0591-\u05C7]/.test(hebrew[i])) toOrig.push(i);
      }
      const parenIdx = idx + 'יאמר:'.length;
      const origParen = toOrig[parenIdx] ?? parenIdx;
      if (hebrew[origParen] === ')') {
        hebrew = hebrew.slice(0, origParen) + hebrew.slice(origParen + 1);
      }
    }
  }
  // Step 2: Find first לי. after ואם סמוך and replace . with )\n
  {
    const stripped = stripNikkud(hebrew);
    const instrIdx = stripped.indexOf('ואם סמוך');
    if (instrIdx !== -1) {
      // Find לי. after the instruction (there are multiple, get the first one)
      let searchFrom = instrIdx;
      const liDotIdx = stripped.indexOf('לי.', searchFrom);
      if (liDotIdx !== -1 && liDotIdx < instrIdx + 200) { // within reasonable range
        const toOrig: number[] = [];
        for (let i = 0; i < hebrew.length; i++) {
          if (!/[\u0591-\u05C7]/.test(hebrew[i])) toOrig.push(i);
        }
        const dotStrippedIdx = liDotIdx + 'לי'.length;
        const origDot = toOrig[dotStrippedIdx] ?? dotStrippedIdx;
        if (hebrew[origDot] === '.') {
          hebrew = hebrew.slice(0, origDot) + ')\n' + hebrew.slice(origDot + 1);
        }
      }
    }
  }

  // Remove all non-parenthetical "ואם סמוך על שלחן עצמו יאמר:" (keep only parenthetical version)
  {
    let stripped = stripNikkud(hebrew);
    // Find all occurrences of "ואם סמוך על שלחן עצמו יאמר:" that are NOT preceded by "("
    let searchIdx = 0;
    while (true) {
      const idx = stripped.indexOf('ואם סמוך על שלחן עצמו יאמר:', searchIdx);
      if (idx === -1) break;
      // Check if preceded by ( (part of parenthetical version)
      if (idx > 0 && stripped[idx - 1] === '(') {
        searchIdx = idx + 1;
        continue;
      }
      // This is a non-paren version - remove it
      const toOrig: number[] = [];
      for (let i = 0; i < hebrew.length; i++) {
        if (!/[\u0591-\u05C7]/.test(hebrew[i])) toOrig.push(i);
      }
      const endIdx = idx + 'ואם סמוך על שלחן עצמו יאמר:'.length;
      const origStart = toOrig[idx] ?? idx;
      let origEnd = toOrig[endIdx - 1] ?? endIdx - 1;
      origEnd++;
      // Skip trailing whitespace/newline
      while (origEnd < hebrew.length && /[\s\u0591-\u05C7]/.test(hebrew[origEnd])) origEnd++;
      hebrew = hebrew.slice(0, origStart) + hebrew.slice(origEnd);
      // Update stripped for next iteration
      stripped = stripNikkud(hebrew);
      // Don't increment searchIdx since we removed text
    }
  }

  // Remove "אם אוכל על שלחן אחרים" instruction and the יהי רצון paragraph
  {
    const stripped = stripNikkud(hebrew);
    const startIdx = stripped.indexOf('אם אוכל על שלחן אחרים');
    const endIdx = stripped.indexOf('ועד עולם:', startIdx);
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const toOrig: number[] = [];
      for (let i = 0; i < hebrew.length; i++) {
        if (!/[\u0591-\u05C7]/.test(hebrew[i])) toOrig.push(i);
      }
      const origStart = toOrig[startIdx] ?? startIdx;
      let origEnd = toOrig[endIdx + 'ועד עולם:'.length - 1] ?? endIdx;
      // Include trailing nikkud and colon
      while (origEnd + 1 < hebrew.length && /[\u0591-\u05C7:]/.test(hebrew[origEnd + 1])) origEnd++;
      origEnd++;
      // Skip any trailing whitespace
      while (origEnd < hebrew.length && /\s/.test(hebrew[origEnd])) origEnd++;
      hebrew = hebrew.slice(0, origStart) + hebrew.slice(origEnd);
    }
  }

  // Reduce ALL double line breaks to single in the ending section (after ונחמות)
  {
    const stripped = stripNikkud(hebrew);
    const nechamosEndIdx = stripped.indexOf('ונחמות.');
    if (nechamosEndIdx !== -1) {
      const toOrig: number[] = [];
      for (let i = 0; i < hebrew.length; i++) {
        if (!/[\u0591-\u05C7]/.test(hebrew[i])) toOrig.push(i);
      }
      const periodIdx = nechamosEndIdx + 'ונחמות.'.length;
      const origPeriod = toOrig[periodIdx] ?? periodIdx;
      // Get everything after ונחמות.
      let endSection = hebrew.slice(origPeriod);
      // Replace double newlines with single newlines throughout
      endSection = endSection.replace(/\n\s*\n/g, '\n');
      hebrew = hebrew.slice(0, origPeriod) + endSection;
    }
  }

  // Cut off everything after "יי עז לעמו יתן יי יברך את עמו בשלום"
  {
    const stripped = stripNikkud(hebrew);
    // Try different spellings of the divine name
    let endIdx = stripped.indexOf('עמו בשלום.');
    if (endIdx === -1) endIdx = stripped.indexOf('עמו בשלום');
    if (endIdx !== -1) {
      // Find the end of this phrase (after בשלום and any trailing punctuation)
      let cutPoint = endIdx + 'עמו בשלום'.length;
      // Include trailing period if present
      if (stripped[cutPoint] === '.') cutPoint++;
      // Map to original position
      const toOrig: number[] = [];
      for (let i = 0; i < hebrew.length; i++) {
        if (!/[\u0591-\u05C7]/.test(hebrew[i])) toOrig.push(i);
      }
      const origCut = toOrig[cutPoint] ?? cutPoint;
      // Include any trailing nikkud
      let finalCut = origCut;
      while (finalCut < hebrew.length && /[\u0591-\u05C7]/.test(hebrew[finalCut])) finalCut++;
      hebrew = hebrew.slice(0, finalCut).trimEnd();
    }
  }

  // Fix reversed תע → עֵת in "תָּמִיד בְּכָל־יוֹם וּבְכָל־עֵת וּבְכָל שָׁעָה:"
  hebrew = hebrew.replace(/(וּבְכָל־)\s*ת[\u0591-\u05C7]*ע(\s+)(?=וּבְכָל\s|שָׁעָה)/g, '$1עֵת$2');
  // Insert missing "נָא" between רַחֵם and יְהֹוָה (רַחֵם נָא יְהֹוָה)
  hebrew = hebrew.replace(/(ר[\u0591-\u05C7]*ח[\u0591-\u05C7]*ם)(\s+)(י[\u0591-\u05C7]*ה[\u0591-\u05C7]*ו[\u0591-\u05C7]*ה)/g, '$1 נָא$2$3');

  // When Yaaleh V'Yavo is shown, build segments so instruction and today's phrase are highlighted (italic)
  const yvEndMarkerFinal = 'ורחום אתה';
  const strippedFinal = stripNikkud(hebrew);
  const yvStartF = strippedFinal.indexOf('בראש חודש') !== -1 ? strippedFinal.indexOf('בראש חודש') : strippedFinal.indexOf('יעלה ויבא');
  const yvEndF = yvStartF !== -1 ? strippedFinal.indexOf(yvEndMarkerFinal, yvStartF) : -1;
  const yvEndIdxF = yvEndF !== -1 ? yvEndF + yvEndMarkerFinal.length : -1;
  if (
    JewishCalendarService.isYaalehVyavoDay(new Date()) &&
    yvStartF !== -1 &&
    yvEndIdxF > yvStartF
  ) {
    const toOrig: number[] = [];
    for (let i = 0; i < hebrew.length; i++) {
      if (!/[\u0591-\u05C7]/.test(hebrew[i])) toOrig.push(i);
    }
    const blockStartO = toOrig[yvStartF] ?? yvStartF;
    let blockEndO = (toOrig[yvEndIdxF - 1] ?? yvEndIdxF - 1) + 1;
    while (blockEndO < hebrew.length && /[\u0591-\u05C7]/.test(hebrew[blockEndO])) blockEndO++;
    if (hebrew[blockEndO] === ':') blockEndO += 1;
    const blockText = hebrew.slice(blockStartO, blockEndO);
    const colonIdx = blockText.indexOf(':');
    const instructionEnd = colonIdx !== -1 ? colonIdx + 1 : blockText.indexOf('\n') !== -1 ? blockText.indexOf('\n') : blockText.length;
    const instructionText = blockText.slice(0, instructionEnd).trim();
    const bodyText = blockText.slice(instructionEnd).trim();
    const bodyStripped = stripNikkud(bodyText);
    const phrase = JewishCalendarService.getYaalehVyavoPhrase(new Date());
    const segs: { text: string; italic: boolean }[] = [];
    segs.push({ text: hebrew.slice(0, blockStartO), italic: false });
    segs.push({ text: instructionText + '\n\n', italic: true });
    if (phrase && bodyStripped.includes(phrase)) {
      const phraseStartStripped = bodyStripped.indexOf(phrase);
      const phraseEndStripped = phraseStartStripped + phrase.length;
      const bodyToOrig: number[] = [];
      for (let i = 0; i < bodyText.length; i++) {
        if (!/[\u0591-\u05C7]/.test(bodyText[i])) bodyToOrig.push(i);
      }
      const phraseStartO = bodyToOrig[phraseStartStripped] ?? phraseStartStripped;
      let phraseEndO = (bodyToOrig[phraseEndStripped - 1] ?? phraseEndStripped - 1) + 1;
      while (phraseEndO < bodyText.length && /[\u0591-\u05C7]/.test(bodyText[phraseEndO])) phraseEndO++;
      segs.push({ text: bodyText.slice(0, phraseStartO), italic: false });
      segs.push({ text: bodyText.slice(phraseStartO, phraseEndO), italic: true });
      segs.push({ text: bodyText.slice(phraseEndO) + (blockEndO < hebrew.length ? '\n\n' + hebrew.slice(blockEndO) : ''), italic: false });
    } else {
      segs.push({ text: bodyText + (blockEndO < hebrew.length ? '\n\n' + hebrew.slice(blockEndO) : ''), italic: false });
    }
    hebrewSegments = segs;
  } else {
    hebrewSegments = [{ text: hebrew, italic: false }];
  }

  // Format HaRachaman instructions as grey text on their own lines
  const instructionPatterns = [
    'אם סמוך על שלחן אביו יאמר:',
    '(ואם סמוך על שלחן עצמו יאמר:',
  ];
  const formatInstructions = (segs: { text: string; italic: boolean }[]): { text: string; italic: boolean }[] => {
    const result: { text: string; italic: boolean }[] = [];
    for (const seg of segs) {
      if (seg.italic) {
        result.push(seg);
        continue;
      }
      let text = seg.text;
      const stripped = stripNikkud(text);
      let splits: { start: number; end: number; pattern: string }[] = [];
      for (const pat of instructionPatterns) {
        let idx = stripped.indexOf(pat);
        while (idx !== -1) {
          splits.push({ start: idx, end: idx + pat.length, pattern: pat });
          idx = stripped.indexOf(pat, idx + 1);
        }
      }
      if (splits.length === 0) {
        result.push(seg);
        continue;
      }
      splits.sort((a, b) => a.start - b.start);
      const toOrig: number[] = [];
      for (let i = 0; i < text.length; i++) {
        if (!/[\u0591-\u05C7]/.test(text[i])) toOrig.push(i);
      }
      let cursor = 0;
      for (const sp of splits) {
        const startO = toOrig[sp.start] ?? sp.start;
        let endO = (toOrig[sp.end - 1] ?? sp.end - 1) + 1;
        while (endO < text.length && /[\u0591-\u05C7]/.test(text[endO])) endO++;
        if (startO > cursor) {
          result.push({ text: text.slice(cursor, startO).trimEnd() + '\n', italic: false });
        }
        result.push({ text: text.slice(startO, endO).trim() + '\n', italic: true });
        cursor = endO;
        while (cursor < text.length && /\s/.test(text[cursor])) cursor++;
      }
      if (cursor < text.length) {
        result.push({ text: text.slice(cursor), italic: false });
      }
    }
    return result;
  };
  hebrewSegments = formatInstructions(hebrewSegments);

  return { hebrew, english, hebrewSegments, englishSegments };
}

/**
 * Mincha: remove Chatzi Kaddish block (החזן אומר חצי קדיש ... through last ואימרו אמן in that block).
 * Same pattern as trimBirkatHamazon: work on content.hebrew, strip nikkud, find indices, slice, return new content.
 */
function processMinchaSectionContent(key: string, content: PrayerTextData): PrayerTextData {
  if (key !== 'mincha_korbanot' && key !== 'mincha_ashrei' && key !== 'mincha_amidah') return content;
  let { hebrew, english, hebrewSegments, englishSegments } = content;
  const stripNikkud = (s: string) => s.replace(/[\u0591-\u05C7]/g, '');
  const stripped = stripNikkud(hebrew);

  // Find start of Chatzi Kaddish block. Sefaria uses "ואומר החזן חצי קדיש:" or just "יתגדל".
  const startMarkers = [
    'ואומר החזן חצי קדיש', 'החזן אומר חצי קדיש',
    'השליח ציבור אומר חצי קדיש', 'חצי קדיש', 'יתגדל',
  ];
  let startStripped = -1;
  for (const m of startMarkers) {
    const i = stripped.indexOf(m);
    if (i !== -1 && (startStripped === -1 || i < startStripped)) startStripped = i;
  }
  if (startStripped === -1) return content;

  // Back up to the start of the line/paragraph so we don't leave orphaned text
  const prevNewline = stripped.lastIndexOf('\n', startStripped);
  if (prevNewline !== -1) {
    const linePrefix = stripped.slice(prevNewline + 1, startStripped).trim();
    if (linePrefix.length === 0) startStripped = prevNewline + 1;
  }

  // End: last "ואמרו אמן" variant after start, then to end of paragraph.
  // Sefaria base text (nikkud-stripped) uses "ואמרו" (no yud); traditional has "ואימרו" (with yud).
  const endMarkers = ['ואמרו אמן', 'ואימרו אמן', 'ויאמרו אמן', 'אמרו אמן', 'אימרו אמן'];
  let lastAmenStripped = -1;
  let usedEndMarkerLen = 0;
  for (const endMarker of endMarkers) {
    let pos = stripped.indexOf(endMarker, startStripped);
    while (pos !== -1) {
      if (pos > lastAmenStripped) {
        lastAmenStripped = pos;
        usedEndMarkerLen = endMarker.length;
      }
      pos = stripped.indexOf(endMarker, pos + 1);
    }
  }
  if (lastAmenStripped === -1) return content;
  let endStripped = lastAmenStripped + usedEndMarkerLen;
  // Skip trailing colon/punctuation/whitespace
  while (endStripped < stripped.length && /[:\s.]/.test(stripped[endStripped])) endStripped++;
  const nextPara = stripped.indexOf('\n\n', endStripped);
  const endOfBlockStripped = nextPara === -1 ? stripped.length : nextPara + 2;

  const strippedToOriginal: number[] = [];
  for (let i = 0; i < hebrew.length; i++) {
    if (!/[\u0591-\u05C7]/.test(hebrew[i])) strippedToOriginal.push(i);
  }
  const startOriginal = strippedToOriginal[startStripped] ?? startStripped;
  const endOriginal =
    endOfBlockStripped > 0 && endOfBlockStripped <= strippedToOriginal.length
      ? strippedToOriginal[endOfBlockStripped - 1] + 1
      : hebrew.length;

  hebrew = (hebrew.slice(0, startOriginal).trimEnd() + '\n\n' + hebrew.slice(endOriginal).trimStart()).replace(/\n\n\n+/g, '\n\n').trim();
  hebrewSegments = [{ text: hebrew, italic: false }];

  if (english) {
    const engKaddish = /\b(?:The\s+leader|The\s+chazan|Chazan|leader)\s+(?:says?|recites?)\s+(?:Half\s+)?Kaddish\s*:?/i;
    const altKaddish = /\bHalf\s+Kaddish\s*:?/i;
    const m = english.match(engKaddish) || english.match(altKaddish);
    if (m && m.index !== undefined) {
      let lastAmenEn = -1;
      let idx = english.indexOf('Amen', m.index);
      while (idx !== -1) {
        lastAmenEn = idx + 4;
        while (lastAmenEn < english.length && /[.!:\s]/.test(english[lastAmenEn])) lastAmenEn++;
        idx = english.indexOf('Amen', lastAmenEn);
      }
      if (lastAmenEn !== -1) {
        const nextEn = english.indexOf('\n\n', lastAmenEn);
        const endEnBlock = nextEn === -1 ? english.length : nextEn + 2;
        english = (english.slice(0, m.index).trimEnd() + '\n\n' + english.slice(endEnBlock).trimStart()).replace(/\n\n\n+/g, '\n\n').trim();
        englishSegments = [{ text: english, italic: false }];
      }
    }
  }

  return { ...content, hebrew, english, hebrewSegments, englishSegments };
}

const SERVICE_TITLES: { [key: string]: { english: string; hebrew: string } } = {
  shacharis: { english: 'Shacharis', hebrew: 'שחרית' },
  mincha: { english: 'Mincha', hebrew: 'מנחה' },
  maariv: { english: 'Maariv', hebrew: 'מעריב' },
  brachos: { english: 'Brachos', hebrew: 'ברכות' },
  shabbos: { english: 'Shabbos', hebrew: 'שבת' },
  bentching: { english: 'Bentching', hebrew: 'ברכת המזון' },
  bedtime: { english: 'Bedtime Shema', hebrew: 'קריאת שמע על המטה' },
  shema: { english: 'Shema', hebrew: 'קריאת שמע' },
  modeh_ani: { english: 'Modeh Ani', hebrew: 'מודה אני' },
  tefilas_haderech: { english: 'Tefillas HaDerech', hebrew: 'תפילת הדרך' },
  asher_yatzar: { english: 'Asher Yatzar', hebrew: 'אשר יצר' },
};

const AUTOSCROLL_SPEED_MIN = 0.5;
const AUTOSCROLL_SPEED_MAX = 2;

/** Tallit & Tefillin are optional (e.g. women don't have); show Hebrew + plus to expand. */
const OPTIONAL_SECTIONS = ['tallit', 'tefillin'];
/** Sections before Ashrei that are collapsed by default; tap to expand. Key = sectionKey. */
const COLLAPSED_BEFORE_ASHREI_MINCHA: string[] = ['mincha_korbanot'];
const AUTOSCROLL_PIXELS_PER_SECOND = 45; // at speed 1

const TEXT_SIZES: DisplayPreferences['textSize'][] = ['xsmall', 'small', 'medium', 'large'];
const HEBREW_FONT_SIZES: Record<DisplayPreferences['textSize'], number> = { xsmall: 15, small: 18, medium: 22, large: 26 };
const HEBREW_LINE_HEIGHTS: Record<DisplayPreferences['textSize'], number> = { xsmall: 26, small: 32, medium: 40, large: 48 };

// Cross-platform speed slider: track + thumb, tap and drag
const SpeedSlider: React.FC<{
  value: number;
  min: number;
  max: number;
  step: number;
  onValueChange: (v: number) => void;
  minimumTrackTintColor: string;
  maximumTrackTintColor: string;
  thumbTintColor: string;
  style?: object;
}> = ({ value, min, max, step, onValueChange, minimumTrackTintColor, maximumTrackTintColor, thumbTintColor, style }) => {
  const trackWidth = useRef(0);
  const valueFromRatio = useCallback((ratio: number) => {
    const v = min + ratio * (max - min);
    const stepped = Math.round(v / step) * step;
    return Math.max(min, Math.min(max, stepped));
  }, [min, max, step]);
  const ratioFromValue = (v: number) => (v - min) / (max - min);
  const startXRef = useRef(0);
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (ev) => {
        const w = trackWidth.current;
        if (w <= 0) return;
        const x = ev.nativeEvent.locationX ?? 0;
        startXRef.current = x;
        const ratio = Math.max(0, Math.min(1, x / w));
        onValueChange(valueFromRatio(ratio));
      },
      onPanResponderMove: (ev, gestureState) => {
        const w = trackWidth.current;
        if (w <= 0) return;
        const x = startXRef.current + (gestureState.dx ?? 0);
        const ratio = Math.max(0, Math.min(1, x / w));
        onValueChange(valueFromRatio(ratio));
      },
    })
  ).current;
  const onTrackLayout = useCallback((e: { nativeEvent: { layout: { width: number } } }) => {
    trackWidth.current = e.nativeEvent.layout.width;
  }, []);
  const ratio = ratioFromValue(value);
  return (
    <View style={[styles.speedSliderTrack, style]} onLayout={onTrackLayout} {...pan.panHandlers}>
      <View style={[styles.speedSliderTrackBg, { backgroundColor: maximumTrackTintColor }]} />
      <View style={[styles.speedSliderTrackFill, { backgroundColor: minimumTrackTintColor, width: `${ratio * 100}%` }]} />
      <View style={[styles.speedSliderThumb, { backgroundColor: thumbTintColor, left: `${ratio * 100}%` }]} />
    </View>
  );
};

// Glass Card Component (for non–full-scroll mode)
const GlassCard: React.FC<{
  children: React.ReactNode;
  style?: any;
  onPress?: () => void;
}> = ({ children, style, onPress }) => {
  const content = (
    <View style={[styles.glassCard, style]}>
      {Platform.OS !== 'web' ? (
        <BlurView intensity={50} style={styles.glassBlur}>
          <View style={styles.glassInner}>{children}</View>
        </BlurView>
      ) : (
        <LinearGradient
          colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
          style={styles.glassBlur}
        >
          <View style={styles.glassInner}>{children}</View>
        </LinearGradient>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
};

export const SiddurReaderScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { theme } = useTheme();
  const { service, sectionKey } = (route.params as RouteParams) || { service: 'shacharis' };

  const [sections, setSections] = useState<Section[]>([]);
  const isFullScroll =
    service === 'shacharis' || service === 'mincha' || service === 'maariv';
  /** When there's only one section, go straight to tefila (no "page with a button"). */
  const effectiveSectionKey =
    sectionKey ?? (sections.length === 1 ? sections[0]?.key : null);
  /** Single section full-page view: explicit sectionKey from nav or only one section in service. */
  const isSingleSectionView = !isFullScroll && !!effectiveSectionKey;
  const [sectionContent, setSectionContent] = useState<{ [key: string]: PrayerTextData | null }>({});
  const [loading, setLoading] = useState(true);
  const [loadingSection, setLoadingSection] = useState<string | null>(null);
  const [nusach, setNusach] = useState<'ashkenaz' | 'sfard'>('ashkenaz');
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [textSize, setTextSize] = useState<DisplayPreferences['textSize']>('medium');
  /** Session-only: show English/translation (init from prefs, not persisted from this screen). */
  const [showEnglish, setShowEnglish] = useState(false);

  // Full-scroll mode: section jump + autoscroll
  const [sectionOffsets, setSectionOffsets] = useState<Record<string, number>>({});
  const [showSectionMenu, setShowSectionMenu] = useState(false);
  const [showCompassModal, setShowCompassModal] = useState(false);
  const [autoscrollPlaying, setAutoscrollPlaying] = useState(false);
  const [autoscrollSpeed, setAutoscrollSpeed] = useState(1); // 0.5–2
  /** Optional sections (tallit, tefillin) collapsed by default; tap to expand. */
  const [expandedOptionals, setExpandedOptionals] = useState<Record<string, boolean>>({});
  /** "Before Ashrei" sections (e.g. Mincha Korbanot) collapsed by default; tap to expand. */
  const [expandedBeforeAshrei, setExpandedBeforeAshrei] = useState<Record<string, boolean>>({});

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const scrollYFloatRef = useRef(0);
  const contentHeightRef = useRef(0);
  const autoscrollRafRef = useRef<number | null>(null);

  const loadPreferences = useCallback(async () => {
    try {
      const prefs = await UserPreferencesService.getPreferences();
      if (prefs?.nusach) setNusach(prefs.nusach);
      if (prefs?.autoscrollSpeed != null) {
        const v = Math.max(AUTOSCROLL_SPEED_MIN, Math.min(AUTOSCROLL_SPEED_MAX, prefs.autoscrollSpeed));
        setAutoscrollSpeed(v);
      }
      if (prefs?.display?.textSize && TEXT_SIZES.includes(prefs.display.textSize)) {
        setTextSize(prefs.display.textSize);
      }
      // English feature disabled – always default to false
      // setShowEnglish(prefs?.display?.showTransliteration ?? false);
    } finally {
      setPrefsLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadPreferences();
    const fallback = setTimeout(() => setPrefsLoaded(true), 2500);
    return () => clearTimeout(fallback);
  }, [loadPreferences]);

  // Record davening streak when user opens siddur
  useFocusEffect(
    useCallback(() => {
      recordDaveningToday();
    }, [])
  );

  // Persist autoscroll speed when user changes it (not on initial load)
  const userHasChangedSpeedRef = useRef(false);
  useEffect(() => {
    if (!userHasChangedSpeedRef.current) return;
    const t = setTimeout(() => {
      UserPreferencesService.setAutoscrollSpeed(autoscrollSpeed);
    }, 400);
    return () => clearTimeout(t);
  }, [autoscrollSpeed]);

  const handleSpeedChange = useCallback((v: number) => {
    userHasChangedSpeedRef.current = true;
    setAutoscrollSpeed(v);
  }, []);

  useEffect(() => {
    if (!prefsLoaded) return;
    if (isFullScroll) {
      const flatSections = SefariaService.getFlatSectionsForFullScroll(service);
      setSections(flatSections);
      setLoading(true);
      (async () => {
        try {
          const results = await Promise.all(
            flatSections.map(async (s) => {
              try {
                const data = await SefariaService.fetchSiddurSection(s.key, nusach);
                return { key: s.key, data };
              } catch {
                return { key: s.key, data: null };
              }
            })
          );
          const content: { [key: string]: PrayerTextData | null } = {};
          for (const { key, data } of results) {
            if (key === 'birchas_hamazon' && data) {
              try {
                content[key] = trimBirkatHamazon(data);
              } catch {
                content[key] = data;
              }
            } else if (
              service === 'mincha' &&
              data &&
              (key === 'mincha_korbanot' || key === 'mincha_ashrei' || key === 'mincha_amidah')
            ) {
              try {
                content[key] = processMinchaSectionContent(key, data);
              } catch {
                content[key] = data;
              }
            } else {
              content[key] = data;
            }
          }
          setSectionContent(content);
        } finally {
          setLoading(false);
        }
      })();
    } else {
      loadServiceStructure();
    }
  }, [service, nusach, isFullScroll, prefsLoaded]);

  // Single-section view: load that section's content when we have effectiveSectionKey
  useEffect(() => {
    if (isSingleSectionView && effectiveSectionKey) {
      loadSectionContent(effectiveSectionKey);
    }
  }, [isSingleSectionView, effectiveSectionKey, nusach]);

  const loadServiceStructure = async () => {
    setLoading(true);
    try {
      if (service === 'bentching') {
        setSections([
          { key: 'birchas_hamazon', title: 'Birkas Hamazon', hebrewTitle: 'ברכת המזון' },
          { key: 'al_hamichya', title: 'Al Hamichya', hebrewTitle: 'על המחיה' },
        ]);
      } else if (service === 'bedtime') {
        setSections([
          { key: 'krias_shema_al_hamita', title: 'Kriyas Shema', hebrewTitle: 'קריאת שמע על המטה' },
        ]);
      } else if (service === 'shabbos') {
        setSections([
          { key: 'kabbalas_shabbos', title: 'Kabbalas Shabbos', hebrewTitle: 'קבלת שבת' },
          { key: 'lecha_dodi', title: 'Lecha Dodi', hebrewTitle: 'לכה דודי' },
          { key: 'kiddush_friday', title: 'Friday Kiddush', hebrewTitle: 'קידוש' },
          { key: 'kiddush_shabbos_day', title: 'Shabbos Day Kiddush', hebrewTitle: 'קידוש' },
          { key: 'havdalah', title: 'Havdalah', hebrewTitle: 'הבדלה' },
        ]);
      } else if (service === 'brachos') {
        setSections([
          { key: 'netilas_yadayim', title: 'Washing Hands', hebrewTitle: 'נטילת ידים' },
          { key: 'asher_yatzar', title: 'Asher Yatzar', hebrewTitle: 'אשר יצר' },
          { key: 'birchos_hatorah', title: 'Torah Blessings', hebrewTitle: 'ברכות התורה' },
        ]);
      } else if (service === 'shema') {
        setSections([{ key: 'shema', title: 'The Shema', hebrewTitle: 'קריאת שמע' }]);
      } else if (service === 'modeh_ani') {
        setSections([{ key: 'modeh_ani', title: 'Modeh Ani', hebrewTitle: 'מודה אני' }]);
      } else if (service === 'tefilas_haderech') {
        setSections([{ key: 'tefilas_haderech', title: 'Tefillas HaDerech', hebrewTitle: 'תפילת הדרך' }]);
      } else if (service === 'asher_yatzar') {
        setSections([{ key: 'asher_yatzar', title: 'Asher Yatzar', hebrewTitle: 'אשר יצר' }]);
      } else {
        const structure = await SefariaService.fetchDaveningService(
          service as 'shacharis' | 'mincha' | 'maariv' | 'musaf',
          false,
          nusach
        );
        setSections(structure.sections);
      }
    } catch (e) {
      console.error('Error loading service structure:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadSectionContent = async (sectionKey: string) => {
    if (sectionContent[sectionKey]) return;
    setLoadingSection(sectionKey);
    try {
      let content = await SefariaService.fetchSiddurSection(sectionKey, nusach);
      if (sectionKey === 'birchas_hamazon' && content) {
        try {
          content = trimBirkatHamazon(content);
        } catch {
          // keep content unchanged if trim fails
        }
      }
      if (
        (sectionKey === 'mincha_korbanot' || sectionKey === 'mincha_ashrei' || sectionKey === 'mincha_amidah') &&
        content
      ) {
        try {
          content = processMinchaSectionContent(sectionKey, content);
        } catch {}
      }
      setSectionContent(prev => ({ ...prev, [sectionKey]: content }));
    } catch {
      setSectionContent(prev => ({ ...prev, [sectionKey]: null }));
    } finally {
      setLoadingSection(null);
    }
  };

  /** Re-fetch a section (e.g. after a failed load). Used in full-scroll when sectionContent[key] is null. */
  const retrySectionContent = useCallback(
    async (sectionKey: string) => {
      setLoadingSection(sectionKey);
      try {
        let content = await SefariaService.fetchSiddurSection(sectionKey, nusach);
        if (sectionKey === 'birchas_hamazon' && content) {
          try {
            content = trimBirkatHamazon(content);
          } catch {}
        }
        if (
          (sectionKey === 'mincha_korbanot' || sectionKey === 'mincha_ashrei' || sectionKey === 'mincha_amidah') &&
          content
        ) {
          try {
            content = processMinchaSectionContent(sectionKey, content);
          } catch {}
        }
        setSectionContent(prev => ({ ...prev, [sectionKey]: content }));
      } catch {
        setSectionContent(prev => ({ ...prev, [sectionKey]: null }));
      } finally {
        setLoadingSection(null);
      }
    },
    [nusach]
  );

  const handleSectionPress = (key: string) => {
    (navigation as any).navigate('SiddurReader', { service, sectionKey: key });
  };

  const scrollToSection = useCallback((key: string) => {
    const y = sectionOffsets[key];
    if (y != null && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y: Math.max(0, y - 16),
        animated: true,
      });
    }
    setShowSectionMenu(false);
  }, [sectionOffsets]);

  // Autoscroll: smooth scroll using requestAnimationFrame (float position, small delta per frame)
  useEffect(() => {
    if (!autoscrollPlaying) {
      if (autoscrollRafRef.current != null) {
        cancelAnimationFrame(autoscrollRafRef.current);
        autoscrollRafRef.current = null;
      }
      return;
    }
    scrollYFloatRef.current = scrollYRef.current;
    const maxY = Math.max(0, contentHeightRef.current - height);
    let lastTs = 0;
    const tick = (ts: number) => {
      if (lastTs === 0) lastTs = ts;
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;
      const speed = autoscrollSpeed;
      const delta = AUTOSCROLL_PIXELS_PER_SECOND * speed * dt;
      const nextY = Math.min(scrollYFloatRef.current + delta, maxY);
      if (nextY >= maxY) {
        setAutoscrollPlaying(false);
        return;
      }
      scrollYFloatRef.current = nextY;
      scrollYRef.current = nextY;
      scrollViewRef.current?.scrollTo({ y: nextY, animated: false });
      autoscrollRafRef.current = requestAnimationFrame(tick);
    };
    autoscrollRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (autoscrollRafRef.current != null) {
        cancelAnimationFrame(autoscrollRafRef.current);
        autoscrollRafRef.current = null;
      }
    };
  }, [autoscrollPlaying, autoscrollSpeed, height]);

  const serviceTitle = SERVICE_TITLES[service] || { english: service, hebrew: '' };

  const renderFullScrollContent = () => (
    <>
      <ReaderChrome
        title={serviceTitle.english}
        titleHebrew={serviceTitle.hebrew}
        onBack={() => navigation.goBack()}
        topInset={insets.top}
        showCompass
        onCompass={() => setShowCompassModal(true)}
        showHamburger
        onHamburger={() => setShowSectionMenu(true)}
      >
        <ReaderToolbar
          textSize={textSize}
          onTextSizeChange={setTextSize}
          showEnglish={showEnglish}
          onShowEnglishChange={setShowEnglish}
        />
      </ReaderChrome>

      <ScrollView
        ref={scrollViewRef}
        style={[styles.scrollView, Platform.OS === 'web' && styles.scrollViewWeb]}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + READER_CHROME_HEADER_HEIGHT_APPROX + spacing.md, paddingBottom: 24 + 88 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          scrollYRef.current = y;
          scrollYFloatRef.current = y;
        }}
        onContentSizeChange={(_, h) => {
          contentHeightRef.current = h;
        }}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary.main} />
            <Text style={styles.loadingText}>Loading prayers...</Text>
          </View>
        ) : sections.length === 0 ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>No sections for this service.</Text>
          </View>
        ) : (
          sections.map((section) => {
            const isOptional = OPTIONAL_SECTIONS.includes(section.key);
            const isOptionalExpanded = isOptional && expandedOptionals[section.key];
            const showOptionalCollapsed = isOptional && !isOptionalExpanded;

            const isBeforeAshreiCollapsed =
              service === 'mincha' &&
              COLLAPSED_BEFORE_ASHREI_MINCHA.includes(section.key) &&
              !expandedBeforeAshrei[section.key];

            const isBeforeAshreiExpanded =
              service === 'mincha' &&
              COLLAPSED_BEFORE_ASHREI_MINCHA.includes(section.key) &&
              expandedBeforeAshrei[section.key];

            return (
              <View
                key={section.key}
                onLayout={(e) => {
                  const { y } = e.nativeEvent.layout;
                  setSectionOffsets(prev => (prev[section.key] === y ? prev : { ...prev, [section.key]: y }));
                }}
                style={styles.fullScrollSectionBlock}
              >
                {showOptionalCollapsed ? (
                  <TouchableOpacity
                    onPress={() => setExpandedOptionals(prev => ({ ...prev, [section.key]: true }))}
                    style={styles.optionalSectionRow}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.hebrewText, styles.optionalSectionLabel, { fontSize: HEBREW_FONT_SIZES[textSize] }]}>
                      {section.hebrewTitle}  +
                    </Text>
                  </TouchableOpacity>
                ) : isBeforeAshreiCollapsed ? (
                  <TouchableOpacity
                    onPress={() => setExpandedBeforeAshrei(prev => ({ ...prev, [section.key]: true }))}
                    style={styles.collapsedBeforeAshreiRow}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.hebrewText, styles.collapsedBeforeAshreiHebrew, { fontSize: HEBREW_FONT_SIZES[textSize] }]}>
                      {section.hebrewTitle}
                    </Text>
                    <Text style={styles.collapsedBeforeAshreiChevron}>▼</Text>
                  </TouchableOpacity>
                ) : sectionContent[section.key] ? (
                  <>
                    {isBeforeAshreiExpanded && (
                      <TouchableOpacity
                        onPress={() => setExpandedBeforeAshrei(prev => ({ ...prev, [section.key]: false }))}
                        style={styles.collapsedBeforeAshreiRow}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.hebrewText, styles.collapsedBeforeAshreiHebrew, { fontSize: HEBREW_FONT_SIZES[textSize] }]}>
                          {section.hebrewTitle}
                        </Text>
                        <Text style={styles.collapsedBeforeAshreiChevron}>▲</Text>
                      </TouchableOpacity>
                    )}
                    {(() => {
                      const content = sectionContent[section.key]!;
                    const hebrewStyle = [
                      styles.hebrewText,
                      { fontSize: HEBREW_FONT_SIZES[textSize], lineHeight: HEBREW_LINE_HEIGHTS[textSize] },
                    ];
                    const hebrewInstructionStyle = [
                      styles.hebrewText,
                      styles.instructionText,
                      { fontSize: HEBREW_FONT_SIZES[textSize] * 0.8, lineHeight: HEBREW_LINE_HEIGHTS[textSize] * 0.9 },
                    ];
                    const renderSegmentsAsBlocks = (
                      segs: { text: string; italic: boolean }[],
                      normalStyle: object,
                      instructionStyle: object,
                      instructionBlockStyle: object
                    ) => {
                      const nodes: React.ReactNode[] = [];
                      let i = 0;
                      let keyIdx = 0;
                      while (i < segs.length) {
                        if (segs[i].italic) {
                          nodes.push(
                            <View key={`seg-${keyIdx++}`} style={instructionBlockStyle}>
                              <Text allowFontScaling={false} style={instructionStyle}>{segs[i].text}</Text>
                            </View>
                          );
                          i += 1;
                        } else {
                          const normalParts: string[] = [];
                          while (i < segs.length && !segs[i].italic) {
                            normalParts.push(segs[i].text);
                            i += 1;
                          }
                          const combined = normalParts.join('');
                          nodes.push(
                            <View key={`seg-${keyIdx++}`} style={styles.hebrewSegmentBlock}>
                              {renderTextWithParagraphs(combined, normalStyle, spacing.lg, true)}
                            </View>
                          );
                        }
                      }
                      return <>{nodes}</>;
                    };
                    const renderHebrew = () => {
                      if (content.hebrewSegments?.length) {
                        return renderSegmentsAsBlocks(
                          content.hebrewSegments,
                          hebrewStyle,
                          hebrewInstructionStyle,
                          styles.instructionBlock
                        );
                      }
                      return (
                        <View style={styles.hebrewSegmentBlock}>
                          {renderTextWithParagraphs(content.hebrew, hebrewStyle, spacing.lg, true)}
                        </View>
                      );
                    };
                    const renderEnglish = () => {
                      if (!showEnglish) return null;
                      const engSize = HEBREW_FONT_SIZES[textSize] * 0.85;
                      const engLine = HEBREW_LINE_HEIGHTS[textSize] * 0.85;
                      const engStyle = [styles.englishText, { fontSize: engSize, lineHeight: engLine }];
                      if (content.englishSegments?.length) {
                        return (
                          <View style={styles.englishBlockWrap}>
                            {content.englishSegments.map((seg, idx) =>
                              seg.italic ? (
                                <Text key={idx} style={[styles.englishText, styles.instructionText, { fontSize: engSize, lineHeight: engLine }]}>{seg.text}</Text>
                              ) : (
                                <Text key={idx} style={engStyle}>{seg.text}</Text>
                              )
                            )}
                          </View>
                        );
                      }
                      if (content.english) {
                        return <Text style={engStyle}>{content.english}</Text>;
                      }
                      return null;
                    };
                    return (
                      <>
                        {isOptional && (
                          <TouchableOpacity
                            onPress={() => setExpandedOptionals(prev => ({ ...prev, [section.key]: false }))}
                            style={styles.optionalSectionRow}
                          >
                            <Text style={[styles.hebrewText, styles.optionalSectionLabel, { fontSize: HEBREW_FONT_SIZES[textSize] }]}>
                              {section.hebrewTitle}  −
                            </Text>
                          </TouchableOpacity>
                        )}
                        {renderHebrew()}
                        {renderEnglish()}
                      </>
                    );
                  })()}
                  </>
                ) : (
                  loadingSection === section.key ? (
                    <View style={styles.retryRow}>
                      <ActivityIndicator size="small" color={colors.primary.main} />
                      <Text style={styles.retryRowText}>Loading…</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => retrySectionContent(section.key)}
                      style={styles.retryRow}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.retryRowText}>Tap to load {section.title}</Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Compass modal - Apple-style */}
      <Modal
        visible={showCompassModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCompassModal(false)}
      >
        <View style={[styles.compassModalBackdrop, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowCompassModal(false)}
          />
          <View style={styles.compassModalContent} pointerEvents="box-none">
            <MizrachCompass variant="apple" onClose={() => setShowCompassModal(false)} />
          </View>
        </View>
      </Modal>

      {/* Section jump dropdown */}
      <Modal
        visible={showSectionMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSectionMenu(false)}
      >
        <TouchableOpacity
          style={styles.sectionMenuBackdrop}
          activeOpacity={1}
          onPress={() => setShowSectionMenu(false)}
        >
          <View style={[styles.sectionMenuBox, { marginTop: insets.top + 56 }]} pointerEvents="box-none">
            <ScrollView
              style={styles.sectionMenuScroll}
              contentContainerStyle={styles.sectionMenuScrollContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {sections.map((s, idx) => (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.sectionMenuItem, idx === sections.length - 1 && styles.sectionMenuItemLast]}
                  onPress={() => scrollToSection(s.key)}
                >
                  <Text style={styles.sectionMenuHebrew}>{s.hebrewTitle}</Text>
                  <Text style={styles.sectionMenuEnglish}>{s.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <ReaderAutoscrollBar
        playing={autoscrollPlaying}
        onPlayingChange={setAutoscrollPlaying}
        speed={autoscrollSpeed}
        onSpeedChange={handleSpeedChange}
        bottomInset={insets.bottom}
      />
    </>
  );

  /** Split text by paragraph breaks (\n\n). On iOS use one View+Text per paragraph to avoid RTL run fragmentation and fragment displacement. No RLM; rely on writingDirection + textAlign. */
  const renderTextWithParagraphs = (text: string, textStyle: object, paragraphSpacing?: number, isRtl?: boolean) => {
    const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    if (paragraphs.length <= 1) {
      return <Text allowFontScaling={false} style={textStyle}>{text}</Text>;
    }
    const gap = paragraphSpacing ?? spacing.md;
    return (
      <>
        {paragraphs.map((para, idx) => (
          <View key={idx} style={idx > 0 ? [styles.prayerParagraph, { marginTop: gap }] : undefined}>
            <Text allowFontScaling={false} style={textStyle}>{para}</Text>
          </View>
        ))}
      </>
    );
  };

  const renderSectionContent = (content: PrayerTextData) => {
    const hebrewStyle = [
      styles.hebrewText,
      { fontSize: HEBREW_FONT_SIZES[textSize], lineHeight: HEBREW_LINE_HEIGHTS[textSize] },
    ];
    const hebrewInstructionStyle = [
      styles.hebrewText,
      styles.instructionText,
      { fontSize: HEBREW_FONT_SIZES[textSize] * 0.8, lineHeight: HEBREW_LINE_HEIGHTS[textSize] * 0.9 },
    ];
    const renderSegmentsAsBlocks = (
      segs: { text: string; italic: boolean }[],
      normalStyle: object,
      instructionStyle: object,
      instructionBlockStyle: object
    ) => {
      const nodes: React.ReactNode[] = [];
      let i = 0;
      let keyIdx = 0;
      while (i < segs.length) {
        if (segs[i].italic) {
          nodes.push(
            <Text key={`seg-${keyIdx++}`} allowFontScaling={false} style={instructionStyle}>{segs[i].text}</Text>
          );
          i += 1;
        } else {
          const normalParts: string[] = [];
          while (i < segs.length && !segs[i].italic) {
            normalParts.push(segs[i].text);
            i += 1;
          }
          const combined = normalParts.join('');
          nodes.push(
            <View key={`seg-${keyIdx++}`} style={styles.hebrewSegmentBlock}>
              {renderTextWithParagraphs(combined, normalStyle, spacing.lg, true)}
            </View>
          );
        }
      }
      return <>{nodes}</>;
    };
    const renderHebrew = () => {
      if (content.hebrewSegments?.length) {
        return renderSegmentsAsBlocks(
          content.hebrewSegments,
          hebrewStyle,
          hebrewInstructionStyle,
          styles.instructionBlock
        );
      }
      return (
        <View style={styles.hebrewSegmentBlock}>
          {renderTextWithParagraphs(content.hebrew, hebrewStyle, spacing.lg, true)}
        </View>
      );
    };
    const renderEnglish = () => {
      if (!showEnglish) return null;
      const engSize = HEBREW_FONT_SIZES[textSize] * 0.85;
      const engLine = HEBREW_LINE_HEIGHTS[textSize] * 0.85;
      const engStyle = [styles.englishText, { fontSize: engSize, lineHeight: engLine }];
      const engInstructionStyle = [styles.englishText, styles.instructionText, { fontSize: engSize, lineHeight: engLine }];
      if (content.englishSegments?.length) {
        return (
          <View style={styles.englishBlockWrap}>
            {content.englishSegments.map((seg, idx) => (
              <View key={idx} style={seg.italic ? styles.instructionBlock : undefined}>
                {renderTextWithParagraphs(
                  seg.text,
                  seg.italic ? engInstructionStyle : engStyle,
                  seg.italic ? spacing.sm : spacing.lg
                )}
              </View>
            ))}
          </View>
        );
      }
      if (content.english) {
        return (
          <View style={styles.englishBlockWrap}>
            {renderTextWithParagraphs(content.english, engStyle, spacing.lg)}
          </View>
        );
      }
      return null;
    };
    return <>{renderHebrew()}{renderEnglish()}</>;
  };

  const renderSingleSectionView = () => {
    const section = effectiveSectionKey ? sections.find((s) => s.key === effectiveSectionKey) : null;
    const content = effectiveSectionKey ? sectionContent[effectiveSectionKey] : null;
    const isLoading = effectiveSectionKey && loadingSection === effectiveSectionKey;

    return (
      <>
        <ReaderChrome
          title={section?.title ?? serviceTitle.english}
          titleHebrew={section?.hebrewTitle ?? serviceTitle.hebrew}
          onBack={() => navigation.goBack()}
          topInset={insets.top}
        >
          <ReaderToolbar
            textSize={textSize}
            onTextSizeChange={setTextSize}
            showEnglish={showEnglish}
            onShowEnglishChange={setShowEnglish}
          />
        </ReaderChrome>
        <ScrollView
          ref={scrollViewRef}
          style={[styles.scrollView, Platform.OS === 'web' && styles.scrollViewWeb]}
          contentContainerStyle={[styles.content, { paddingTop: insets.top + READER_CHROME_HEADER_HEIGHT_APPROX + spacing.md, paddingBottom: 120 + 88 }]}
          showsVerticalScrollIndicator={false}
          onScroll={(e) => {
            const y = e.nativeEvent.contentOffset.y;
            scrollYRef.current = y;
            scrollYFloatRef.current = y;
          }}
          onContentSizeChange={(_, h) => {
            contentHeightRef.current = h;
          }}
        >
          {isLoading ? (
            <View style={styles.sectionLoading}>
              <ActivityIndicator size="small" color={colors.primary.main} />
              <Text style={styles.sectionLoadingText}>Loading text...</Text>
            </View>
          ) : content ? (
            <View style={styles.sectionContent}>{renderSectionContent(content)}</View>
          ) : (
            <Text style={styles.errorText}>Unable to load this section.</Text>
          )}
          <View style={{ height: 120 }} />
        </ScrollView>
        <ReaderAutoscrollBar
          playing={autoscrollPlaying}
          onPlayingChange={setAutoscrollPlaying}
          speed={autoscrollSpeed}
          onSpeedChange={handleSpeedChange}
          bottomInset={insets.bottom}
        />
      </>
    );
  };

  const renderDropdownMode = () => (
    <>
      <View style={[styles.dropdownModeHeader, { paddingTop: insets.top + spacing.sm }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <View style={styles.dropdownModeTitleWrap}>
          <Text style={styles.dropdownModeTitle}>{serviceTitle.english}</Text>
          <Text style={styles.dropdownModeTitleHebrew}>{serviceTitle.hebrew}</Text>
        </View>
      </View>
      <ScrollView
        style={[styles.scrollView, Platform.OS === 'web' && styles.scrollViewWeb]}
        contentContainerStyle={[styles.content, { paddingTop: spacing.sm, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <View style={styles.sectionsList}>
          {sections.map((section, index) => (
            <FadeIn key={section.key} delay={50 + index * 30}>
              <GlassCard
                style={styles.sectionCard}
                onPress={() => handleSectionPress(section.key)}
              >
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleContainer}>
                    <Text style={styles.sectionHebrewTitle}>{section.hebrewTitle}</Text>
                    <Text style={styles.sectionEnglishTitle}>{section.title}</Text>
                  </View>
                  <Text style={styles.sectionArrow}>→</Text>
                </View>
              </GlassCard>
            </FadeIn>
          ))}
        </View>
      )}
      <View style={{ height: 120 }} />
      </ScrollView>
    </>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FAF9F7', '#F5E6E8', '#E8F0F5']}
        style={StyleSheet.absoluteFill}
      />
      {isSingleSectionView
        ? renderSingleSectionView()
        : isFullScroll
          ? renderFullScrollContent()
          : renderDropdownMode()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewWeb: {
    overflow: 'auto',
    minHeight: 0,
  },
  staticHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(250, 249, 247, 0.95)',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  dropdownModeHeader: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingBottom: 2,
  },
  dropdownModeTitleWrap: {
    marginTop: spacing.sm,
    marginLeft: 0,
  },
  dropdownModeTitle: {
    fontFamily: fonts.heading.bold,
    fontSize: 28,
    color: colors.text.primary,
  },
  dropdownModeTitleHebrew: {
    fontFamily: fonts.hebrew.regular,
    fontSize: 18,
    color: colors.text.tertiary,
    marginTop: 4,
    writingDirection: 'rtl',
    textAlign: 'left',
    letterSpacing: 0,
  },
  content: {
    padding: spacing.xl,
    paddingTop: spacing.lg + 44,
    paddingBottom: 140,
  },

  header: {
    marginBottom: spacing.xl,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  backButton: {},
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  compassButton: {
    padding: spacing.sm,
  },
  compassIcon: {
    fontSize: 22,
  },
  hamburgerButton: {
    padding: spacing.sm,
  },
  hamburgerIcon: {
    fontSize: 24,
    color: colors.text.secondary,
  },
  compassModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  compassModalContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.heading.bold,
    fontSize: 32,
    color: colors.text.primary,
    letterSpacing: -0.7,
  },
  titleHebrew: {
    fontFamily: fonts.hebrew.regular,
    fontSize: 24,
    color: colors.text.secondary,
    letterSpacing: 0,
    flexShrink: 0,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  textSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  textSizeButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  textSizeButtonDisabled: {
    opacity: 0.4,
  },
  textSizeButtonLabel: {
    fontFamily: fonts.body.semiBold,
    fontSize: 16,
    color: colors.text.primary,
  },
  toggleButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  toggleButtonActive: {
    backgroundColor: colors.primary.light,
  },
  toggleText: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: colors.text.secondary,
  },
  toggleTextActive: {
    color: colors.primary.dark,
  },
  englishToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  englishToggleLabel: {
    fontFamily: fonts.body.medium,
    fontSize: 14,
    color: colors.text.secondary,
  },

  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['2xl'],
  },
  loadingText: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },

  fullScrollSectionBlock: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  optionalSectionRow: {
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
  },
  optionalSectionLabel: {
    fontFamily: fonts.hebrew.semibold,
    color: colors.primary.main,
  },
  collapsedBeforeAshreiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingRight: spacing.sm,
    gap: 8,
  },
  collapsedBeforeAshreiHebrew: {
    fontFamily: fonts.hebrew.semibold,
    color: colors.primary.main,
    letterSpacing: 0,
  },
  collapsedBeforeAshreiChevron: {
    fontSize: 12,
    color: colors.primary.main,
  },
  retryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  retryRowText: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: colors.text.tertiary,
  },

  sectionMenuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: spacing.lg,
  },
  sectionMenuBox: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: borderRadius.xl,
    padding: spacing.sm,
    maxHeight: 360,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  sectionMenuScroll: {
    maxHeight: 336,
  },
  sectionMenuScrollContent: {
    paddingBottom: spacing.sm,
  },
  sectionMenuItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  sectionMenuHebrew: {
    fontFamily: fonts.hebrew.semibold,
    fontSize: 18,
    color: colors.text.primary,
    marginBottom: 2,
    letterSpacing: 0,
  },
  sectionMenuEnglish: {
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: colors.text.secondary,
  },
  sectionMenuItemLast: {
    borderBottomWidth: 0,
  },

  bottomBarWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  bottomBarBlur: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  bottomBarInner: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  autoscrollLabel: {
    fontFamily: fonts.body.semiBold,
    fontSize: 14,
    color: colors.text.secondary,
  },
  autoscrollButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  autoscrollButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(212, 165, 184, 0.35)',
  },
  autoscrollButtonText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 15,
    color: colors.primary.dark,
  },
  speedButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(165, 196, 212, 0.35)',
  },
  speedButtonText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 14,
    color: colors.secondary.dark,
  },
  speedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  speedLabel: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: colors.text.secondary,
    minWidth: 40,
  },
  speedSlider: {
    flex: 1,
    height: 28,
    minWidth: 80,
    marginLeft: 14, /* room for thumb at min so it doesn't cover "Speed" */
  },
  speedSliderTrack: {
    height: 28,
    flex: 1,
    minWidth: 80,
    justifyContent: 'center',
    position: 'relative',
  },
  speedSliderTrackBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 8,
    borderRadius: 4,
    top: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  speedSliderTrackFill: {
    position: 'absolute',
    left: 0,
    height: 8,
    borderRadius: 4,
    top: 10,
  },
  speedSliderThumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    marginLeft: -12,
    top: 2,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  speedValue: {
    fontFamily: fonts.body.semiBold,
    fontSize: 14,
    color: colors.text.primary,
    minWidth: 28,
    textAlign: 'right',
  },

  glassCard: {
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  glassBlur: {
    overflow: 'hidden',
  },
  glassInner: {
    padding: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },

  sectionsList: {
    gap: spacing.md,
  },
  sectionCard: {},
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionHebrewTitle: {
    fontFamily: fonts.hebrew.semibold,
    fontSize: 20,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    letterSpacing: 0,
  },
  sectionEnglishTitle: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: colors.text.secondary,
    letterSpacing: 0.2,
  },
  sectionArrow: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  sectionContent: {
    width: '100%',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  hebrewSegmentBlock: {
    width: '100%',
  },
  prayerParagraph: {
    marginBottom: 0,
  },
  sectionLoading: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  sectionLoadingText: {
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: colors.text.tertiary,
    marginTop: spacing.sm,
  },
  hebrewText: {
    fontFamily: fonts.hebrew.regular,
    fontSize: 22,
    color: colors.text.primary,
    lineHeight: 40,
    textAlign: 'right',
    writingDirection: 'rtl',
    letterSpacing: 0,
  },
  daySpecificHighlight: {
    backgroundColor: 'rgba(212, 165, 184, 0.22)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginVertical: spacing.xs,
  },
  instructionText: {
    fontStyle: 'italic',
    color: colors.neutral[600],
  },
  instructionBlock: {
    marginTop: 2,
    marginBottom: 0,
  },
  englishText: {
    fontFamily: fonts.body.regular,
    color: colors.text.secondary,
    textAlign: 'left',
    marginTop: spacing.sm,
  },
  englishBlockWrap: {
    marginTop: spacing.sm,
  },
  errorText: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: colors.semantic.error,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
});
