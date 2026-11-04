/**
 * Nach Reader – displays one chapter from Sefaria.
 * Params: { nachYomi?: true } for today's chapter, or { book, chapter }.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ReaderChrome, READER_CHROME_HEADER_HEIGHT_APPROX } from '../../components/reader/ReaderChrome';
import { ReaderToolbar, HEBREW_FONT_SIZES, HEBREW_LINE_HEIGHTS } from '../../components/reader/ReaderToolbar';
import { ReaderAutoscrollBar } from '../../components/reader/ReaderAutoscrollBar';
import { useAutoscroll } from '../../components/reader/useAutoscroll';
import { spacing } from '../../src/design/spacing';
import { useTheme } from '../../src/design/theme';
import {
  createReaderStyles,
  ReaderNavRow,
  ReaderLoading,
  ReaderMessage,
} from '../../components/learning/ReaderParts';
import { SefariaService, SefariaText } from '../../src/services/SefariaService';
import { UserPreferencesService } from '../../src/storage/UserPreferences';
import type { DisplayPreferences } from '../../src/types/preferences';
import { getTodayNachYomi, NACH_BOOKS } from '../../src/services/NachYomiService';
import { JewishCalendarService } from '../../src/core/calendar/JewishCalendar';

type RouteParams = {
  nachYomi?: boolean;
  book?: string;
  chapter?: number;
};

export const NachReaderScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const params = (route.params || {}) as RouteParams;
  const { theme } = useTheme();
  const styles = useMemo(() => createReaderStyles(theme), [theme]);

  const { height: viewportHeight } = useWindowDimensions();
  const [book, setBook] = useState<string | null>(params.book || null);
  const [chapter, setChapter] = useState<number | null>(params.chapter ?? null);
  const [data, setData] = useState<SefariaText | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [textSize, setTextSize] = useState<DisplayPreferences['textSize']>('medium');
  const [showEnglish, setShowEnglish] = useState(false);
  const [autoscrollPlaying, setAutoscrollPlaying] = useState(false);
  const [autoscrollSpeed, setAutoscrollSpeed] = useState(1);
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const contentHeightRef = useRef(0);

  useEffect(() => {
    (async () => {
      const prefs = await UserPreferencesService.getPreferences();
      if (prefs?.display?.textSize) setTextSize(prefs.display.textSize);
      // English feature disabled – always default to false
      // setShowEnglish(prefs?.display?.showTransliteration ?? false);
      if (prefs?.autoscrollSpeed != null) setAutoscrollSpeed(Math.max(0.5, Math.min(2, prefs.autoscrollSpeed)));
    })();
  }, []);

  useAutoscroll(scrollRef, scrollYRef, contentHeightRef, viewportHeight, autoscrollPlaying, autoscrollSpeed);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      let b = book;
      let c = chapter;

      if (params.nachYomi && (!b || c == null)) {
        const today = getTodayNachYomi();
        if (cancelled) return;
        if (today) {
          b = today.book;
          c = today.chapter;
          setBook(b);
          setChapter(c);
        } else {
          setError("Could not determine today's Nach Yomi chapter.");
          setLoading(false);
          return;
        }
      }

      if (!b || c == null) {
        setError('Missing book or chapter.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      const ref = `${b} ${c}`;
      const result = await SefariaService.fetchText(ref);
      if (cancelled) return;
      setData(result);
      setError(result ? null : 'Could not load this chapter.');
      setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [params.nachYomi, book, chapter]);

  const bookIndex = book ? NACH_BOOKS.findIndex((b) => b.sefariaName === book) : -1;
  const bookInfo = bookIndex >= 0 ? NACH_BOOKS[bookIndex] : null;
  const chapters = bookInfo?.chapters ?? 0;

  const hasPrev = book && chapter != null && (chapter > 1 || bookIndex > 0);
  const hasNext = book && chapter != null && (chapter < chapters || (bookIndex >= 0 && bookIndex < NACH_BOOKS.length - 1));

  const goPrev = () => {
    if (!book || chapter == null) return;
    if (chapter > 1) {
      setChapter(chapter - 1);
    } else if (bookIndex > 0) {
      const prev = NACH_BOOKS[bookIndex - 1];
      setBook(prev.sefariaName);
      setChapter(prev.chapters);
    }
  };

  const goNext = () => {
    if (!book || chapter == null) return;
    if (chapter < chapters) {
      setChapter(chapter + 1);
    } else if (bookIndex >= 0 && bookIndex < NACH_BOOKS.length - 1) {
      const next = NACH_BOOKS[bookIndex + 1];
      setBook(next.sefariaName);
      setChapter(1);
    }
  };

  const hebrewChapter = chapter != null ? JewishCalendarService.numberToHebrew(chapter) : '';
  const chromeTitleHebrew =
    bookInfo && chapter != null
      ? `${bookInfo.hebrew} · פרק ${hebrewChapter}`
      : params.nachYomi
        ? 'נך יומי'
        : 'נך';
  const chromeSubtitleEnglish =
    book && chapter != null
      ? `${book} ${chapter}${params.nachYomi ? " · Today's Nach Yomi" : ''}`
      : params.nachYomi
        ? "Today's Nach Yomi"
        : 'Nach';

  const hebrewFontSize = HEBREW_FONT_SIZES[textSize];
  const hebrewLineHeight = HEBREW_LINE_HEIGHTS[textSize];
  const englishFontSize = hebrewFontSize * 0.85;
  const englishLineHeight = hebrewLineHeight * 0.85;

  return (
    <View style={[styles.container, { direction: 'rtl' }]}>
      <LinearGradient
        colors={theme.backgroundGradient}
        style={StyleSheet.absoluteFill}
      />
      <ReaderChrome
        title={chromeTitleHebrew}
        titleIsHebrew
        subtitleEnglish={chromeSubtitleEnglish}
        onBack={() => navigation.goBack()}
        topInset={insets.top}
      >
        <ReaderToolbar textSize={textSize} onTextSizeChange={setTextSize} showEnglish={showEnglish} onShowEnglishChange={setShowEnglish} showEnglishToggle={true} />
      </ReaderChrome>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + READER_CHROME_HEADER_HEIGHT_APPROX + spacing.md, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => { scrollYRef.current = e.nativeEvent.contentOffset.y; }}
        onContentSizeChange={(_, h) => { contentHeightRef.current = h; }}
      >
        <ReaderNavRow onNext={goNext} onPrev={goPrev} hasNext={!!hasNext} hasPrev={!!hasPrev} />
        {loading ? (
          <ReaderLoading label="Loading chapter..." />
        ) : error ? (
          <ReaderMessage message={error} />
        ) : data ? (
          <View style={styles.card}>
            {(() => {
              const rawH = data.hebrew;
              const arrH = Array.isArray(rawH) ? rawH : (rawH ? [rawH] : []);
              return arrH.map((block, i) => {
                const clean = typeof block === 'string' ? block.replace(/<[^>]+>/g, '').trim() : String(block);
                return clean ? <Text key={i} style={[styles.hebrewBlock, { fontSize: hebrewFontSize, lineHeight: hebrewLineHeight }]}>{clean}</Text> : null;
              });
            })()}
            {showEnglish && (() => {
              const rawE = data.english;
              const arrE = Array.isArray(rawE) ? rawE : (rawE ? [rawE] : []);
              return arrE.map((block, i) => {
                const clean = typeof block === 'string' ? block.replace(/<[^>]+>/g, '').trim() : String(block);
                return clean ? <Text key={i} style={[styles.englishBlock, { fontSize: englishFontSize, lineHeight: englishLineHeight }]}>{clean}</Text> : null;
              });
            })()}
            <Text style={styles.attribution}>Texts provided by Sefaria • sefaria.org</Text>
          </View>
        ) : null}
      </ScrollView>
      <ReaderAutoscrollBar playing={autoscrollPlaying} onPlayingChange={setAutoscrollPlaying} speed={autoscrollSpeed} onSpeedChange={setAutoscrollSpeed} bottomInset={insets.bottom} />
    </View>
  );
};
