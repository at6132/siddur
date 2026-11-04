/**
 * Gemara Reader – displays one daf (Talmud page) from Sefaria.
 * Params: { dafYomi?: true } for today's daf, or { tractate, daf, side: 'a'|'b' }.
 * Styled like SiddurReader (gradient, glass, readable text).
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ReaderChrome, READER_CHROME_HEADER_HEIGHT_APPROX } from '../../components/reader/ReaderChrome';
import { ReaderToolbar, HEBREW_FONT_SIZES, HEBREW_LINE_HEIGHTS } from '../../components/reader/ReaderToolbar';
import { ReaderAutoscrollBar } from '../../components/reader/ReaderAutoscrollBar';
import { useAutoscroll } from '../../components/reader/useAutoscroll';
import { spacing, borderRadius } from '../../src/design/spacing';
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
import { MESECHTAS } from './GemaraScreen';

type RouteParams = {
  dafYomi?: boolean;
  tractate?: string;
  daf?: number;
  side?: 'a' | 'b';
};

/** Get today's Daf Yomi from Hebcal (hebcal.com) API. */
async function fetchTodayDafYomi(): Promise<{ tractate: string; daf: number } | null> {
  try {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${day}`;
    const res = await fetch(
      `https://www.hebcal.com/hebcal?cfg=json&v=1&F=on&start=${dateStr}&end=${dateStr}`
    );
    const data = await res.json();
    const item = data?.items?.find((e: { category?: string }) => e.category === 'dafyomi');
    const title = item?.title?.trim();
    if (!title) return null;
    const match = title.match(/^(.+?)\s+(\d+)$/);
    if (!match) return null;
    return { tractate: match[1].trim(), daf: parseInt(match[2], 10) };
  } catch {
    return null;
  }
}


export const GemaraReaderScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const params = (route.params || {}) as RouteParams;
  const { theme } = useTheme();
  const styles = useMemo(() => createReaderStyles(theme), [theme]);

  const [tractate, setTractate] = useState<string | null>(params.tractate || null);
  const [daf, setDaf] = useState<number | null>(params.daf ?? null);
  const [side, setSide] = useState<'a' | 'b'>(params.side || 'a');
  const { height: viewportHeight } = useWindowDimensions();
  const [data, setData] = useState<SefariaText | null>(null);
  const [dataB, setDataB] = useState<SefariaText | null>(null);
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
      let t = tractate;
      let d = daf;

      if (params.dafYomi && (!t || !d)) {
        const today = await fetchTodayDafYomi();
        if (cancelled) return;
        if (today) {
          t = today.tractate;
          d = today.daf;
          setTractate(t);
          setDaf(d);
          setSide('a');
        } else {
          setError("Could not load today's Daf Yomi.");
          setLoading(false);
          return;
        }
      }

      if (!t || d == null) {
        setError('Missing tractate or daf.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      if (params.dafYomi) {
        const [resultA, resultB] = await Promise.all([
          SefariaService.fetchTalmudPage(t, d, 'a'),
          SefariaService.fetchTalmudPage(t, d, 'b'),
        ]);
        if (cancelled) return;
        setData(resultA);
        setDataB(resultB);
        setError(resultA || resultB ? null : "Could not load today's Daf Yomi.");
      } else {
        const result = await SefariaService.fetchTalmudPage(t, d, side);
        if (cancelled) return;
        setData(result);
        setDataB(null);
        setError(result ? null : "Could not load this daf.");
      }
      setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [params.dafYomi, tractate, daf, side]);

  const currentSide = side;
  const nextSide: 'a' | 'b' | null = currentSide === 'a' ? 'b' : null;
  const currentDaf = daf ?? 0;

  const tractateIndex = tractate ? MESECHTAS.findIndex((m) => m.name === tractate) : -1;
  const tractateDapim = tractateIndex >= 0 ? MESECHTAS[tractateIndex].dapim : 0;
  const lastDaf = tractateDapim + 1;

  const hasPrevAmud =
    tractate && daf != null &&
    (side === 'b' || (side === 'a' && daf > 2) || (side === 'a' && daf === 2 && tractateIndex > 0));
  const hasNextAmud =
    tractate && daf != null &&
    (side === 'a' || (side === 'b' && daf < lastDaf) || (side === 'b' && daf === lastDaf && tractateIndex >= 0 && tractateIndex < MESECHTAS.length - 1));

  const goPrevAmud = () => {
    if (!tractate || daf == null) return;
    if (side === 'b') {
      setSide('a');
      return;
    }
    if (daf > 2) {
      setDaf(daf - 1);
      setSide('b');
      return;
    }
    if (tractateIndex > 0) {
      const prev = MESECHTAS[tractateIndex - 1];
      setTractate(prev.name);
      setDaf(prev.dapim + 1);
      setSide('b');
    }
  };

  const goNextAmud = () => {
    if (!tractate || daf == null) return;
    if (side === 'a') {
      setSide('b');
      return;
    }
    if (daf < lastDaf) {
      setDaf(daf + 1);
      setSide('a');
      return;
    }
    if (tractateIndex >= 0 && tractateIndex < MESECHTAS.length - 1) {
      const next = MESECHTAS[tractateIndex + 1];
      setTractate(next.name);
      setDaf(2);
      setSide('a');
    }
  };

  const openNextAmud = () => {
    if (nextSide) setSide(nextSide);
  };

  const headerTractateLabel = tractate && daf != null ? `Tractate: ${tractate}` : null;
  const headerDafLabel = tractate && daf != null
    ? (params.dafYomi ? `Daf: ${daf}a–b` : `Daf: ${daf}${side}`)
    : params.dafYomi ? "Today's Daf Yomi" : 'Gemara';

  const hebrewFontSize = HEBREW_FONT_SIZES[textSize];
  const hebrewLineHeight = HEBREW_LINE_HEIGHTS[textSize];
  const englishFontSize = hebrewFontSize * 0.85;
  const englishLineHeight = hebrewLineHeight * 0.85;

  const chromeTitle = headerTractateLabel ? `${headerTractateLabel} • ${headerDafLabel}` : headerDafLabel;

  return (
    <View style={[styles.container, { direction: 'rtl' }]}>
      <LinearGradient
        colors={theme.backgroundGradient}
        style={StyleSheet.absoluteFill}
      />
      <ReaderChrome
        title={chromeTitle}
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
        <ReaderNavRow onNext={goNextAmud} onPrev={goPrevAmud} hasNext={!!hasNextAmud} hasPrev={!!hasPrevAmud} />
        {loading ? (
          <ReaderLoading label="Loading daf..." />
        ) : error ? (
          <ReaderMessage message={error} />
        ) : data || dataB ? (
          <>
            <View style={styles.card}>
              <Text style={[styles.amudSectionHeader, { marginTop: 0 }]}>דף א – Amud Alef</Text>
              {data && (() => {
                const rawH = data.hebrew;
                const arrH = Array.isArray(rawH) ? rawH : (rawH ? [rawH] : []);
                return arrH.map((block, i) => {
                  const clean = typeof block === 'string' ? block.replace(/<[^>]+>/g, '').trim() : String(block);
                  return clean ? <Text key={`a-h-${i}`} style={[styles.hebrewBlock, { fontSize: hebrewFontSize, lineHeight: hebrewLineHeight }]}>{clean}</Text> : null;
                });
              })()}
              {showEnglish && data && (() => {
                const rawE = data.english;
                const arrE = Array.isArray(rawE) ? rawE : (rawE ? [rawE] : []);
                return arrE.map((block, i) => {
                  const clean = typeof block === 'string' ? block.replace(/<[^>]+>/g, '').trim() : String(block);
                  return clean ? <Text key={`a-e-${i}`} style={[styles.englishBlock, { fontSize: englishFontSize, lineHeight: englishLineHeight }]}>{clean}</Text> : null;
                });
              })()}
              {!params.dafYomi && (
                <>
                  {nextSide && tractate && (
                    <TouchableOpacity style={styles.nextAmud} onPress={openNextAmud}>
                      <Text style={styles.nextAmudText}>Next: {tractate} {currentDaf}{nextSide} →</Text>
                    </TouchableOpacity>
                  )}
                  <Text style={[styles.englishBlock, { marginTop: spacing.lg, fontSize: 12, color: theme.colors.text.tertiary }]}>
                    Texts provided by Sefaria • sefaria.org
                  </Text>
                </>
              )}
            </View>
            {params.dafYomi && dataB && (
              <View style={[styles.card, { marginTop: spacing.lg }]}>
                <Text style={styles.amudSectionHeader}>דף ב – Amud Beis</Text>
                {(() => {
                  const rawH = dataB.hebrew;
                  const arrH = Array.isArray(rawH) ? rawH : (rawH ? [rawH] : []);
                  return arrH.map((block, i) => {
                    const clean = typeof block === 'string' ? block.replace(/<[^>]+>/g, '').trim() : String(block);
                    return clean ? <Text key={`b-h-${i}`} style={[styles.hebrewBlock, { fontSize: hebrewFontSize, lineHeight: hebrewLineHeight }]}>{clean}</Text> : null;
                  });
                })()}
                {showEnglish && (() => {
                  const rawE = dataB.english;
                  const arrE = Array.isArray(rawE) ? rawE : (rawE ? [rawE] : []);
                  return arrE.map((block, i) => {
                    const clean = typeof block === 'string' ? block.replace(/<[^>]+>/g, '').trim() : String(block);
                    return clean ? <Text key={`b-e-${i}`} style={[styles.englishBlock, { fontSize: englishFontSize, lineHeight: englishLineHeight }]}>{clean}</Text> : null;
                  });
                })()}
                <Text style={[styles.englishBlock, { marginTop: spacing.lg, fontSize: 12, color: theme.colors.text.tertiary }]}>
                  Texts provided by Sefaria • sefaria.org
                </Text>
              </View>
            )}
            {params.dafYomi && !dataB && data && (
              <Text style={[styles.englishBlock, { marginTop: spacing.lg, fontSize: 12, color: theme.colors.text.tertiary }]}>
                Texts provided by Sefaria • sefaria.org
              </Text>
            )}
          </>
        ) : null}
      </ScrollView>
      <ReaderAutoscrollBar playing={autoscrollPlaying} onPlayingChange={setAutoscrollPlaying} speed={autoscrollSpeed} onSpeedChange={setAutoscrollSpeed} bottomInset={insets.bottom} />
    </View>
  );
};
