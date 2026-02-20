/**
 * Mishna Reader – displays one perek of Mishna from Sefaria.
 * Params: { mishnaYomi?: true } for today's perek, or { tractate, perek }.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
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
import { fonts } from '../../src/design/typography';
import { useTheme } from '../../src/design/theme';
import { SefariaService, SefariaText } from '../../src/services/SefariaService';
import { UserPreferencesService } from '../../src/storage/UserPreferences';
import type { AppTheme } from '../../src/design/theme';
import type { DisplayPreferences } from '../../src/types/preferences';
import { getTodayMishnaYomi, MISHNA_TRACTATES } from '../../src/services/MishnaYomiService';

type RouteParams = {
  mishnaYomi?: boolean;
  tractate?: string;
  perek?: number;
};

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1 },
    staticTopBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
      backgroundColor: theme.isDark ? 'rgba(20,18,32,0.98)' : 'rgba(250,249,247,0.98)',
      borderBottomWidth: 1,
      borderBottomColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
    },
    scrollView: { flex: 1 },
    content: {
      padding: spacing.lg,
      paddingBottom: 120,
    },
    headerRow: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
      direction: 'rtl',
    },
    backButton: {
      paddingVertical: spacing.sm,
      paddingRight: spacing.md,
    },
    backText: {
      fontFamily: fonts.body.medium,
      fontSize: 16,
      color: theme.colors.text.secondary,
    },
    headerTitleBlock: {
      flex: 1,
      marginLeft: spacing.sm,
      marginRight: spacing.sm,
    },
    title: {
      fontFamily: fonts.heading.bold,
      fontSize: 22,
      color: theme.colors.text.primary,
    },
    tractateLabel: {
      fontFamily: fonts.body.regular,
      fontSize: 12,
      color: theme.colors.text.tertiary,
      marginBottom: 2,
    },
    perekLabel: {
      fontFamily: fonts.body.regular,
      fontSize: 12,
      color: theme.colors.text.tertiary,
    },
    navRow: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: spacing.sm,
      direction: 'rtl',
    },
    navButton: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: 12,
      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
    },
    navButtonText: {
      fontFamily: fonts.body.medium,
      fontSize: 14,
      color: theme.colors.primary?.main || theme.colors.text.secondary,
    },
    navButtonDisabled: {
      opacity: 0.4,
    },
    card: {
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.8)',
      marginBottom: spacing.lg,
      backgroundColor: theme.isDark ? 'rgba(30,28,45,0.9)' : 'rgba(255,255,255,0.85)',
      padding: spacing.lg,
    },
    hebrewBlock: {
      fontFamily: fonts.heading.regular,
      fontSize: 20,
      lineHeight: 34,
      color: theme.colors.text.primary,
      marginBottom: spacing.md,
      textAlign: 'right',
      writingDirection: 'rtl',
    },
    englishBlock: {
      fontFamily: fonts.body.regular,
      fontSize: 16,
      lineHeight: 26,
      color: theme.colors.text.secondary,
      marginBottom: spacing.sm,
      textAlign: 'left',
    },
    loadingContainer: {
      padding: spacing.xl,
      alignItems: 'center',
    },
    loadingText: {
      fontFamily: fonts.body.regular,
      fontSize: 14,
      color: theme.colors.text.tertiary,
      marginTop: spacing.md,
    },
    errorText: {
      fontFamily: fonts.body.regular,
      fontSize: 15,
      color: theme.colors.text.secondary,
      marginTop: spacing.md,
    },
    attribution: {
      fontFamily: fonts.body.regular,
      fontSize: 12,
      color: theme.colors.text.tertiary,
      marginTop: spacing.lg,
    },
  });
}

export const MishnaReaderScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const params = (route.params || {}) as RouteParams;
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { height: viewportHeight } = useWindowDimensions();
  const [tractate, setTractate] = useState<string | null>(params.tractate || null);
  const [perek, setPerek] = useState<number | null>(params.perek ?? null);
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
      let t = tractate;
      let p = perek;

      if (params.mishnaYomi && (!t || p == null)) {
        const today = getTodayMishnaYomi();
        if (today) {
          t = today.tractate;
          p = today.perek;
          setTractate(t);
          setPerek(p);
        } else {
          setError("Could not determine today's Mishna Yomi.");
          setLoading(false);
          return;
        }
      }

      if (!t || p == null) {
        setError('Missing tractate or perek.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      const ref = t === 'Pirkei Avot' ? `Pirkei Avot ${p}` : `Mishnah ${t} ${p}`;
      const result = await SefariaService.fetchText(ref);
      if (cancelled) return;
      setData(result);
      setError(result ? null : 'Could not load this perek.');
      setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [params.mishnaYomi, tractate, perek]);

  const tractateIndex = tractate ? MISHNA_TRACTATES.findIndex((m) => m.sefariaName === tractate) : -1;
  const tractatePerakim = tractateIndex >= 0 ? MISHNA_TRACTATES[tractateIndex].perakim : 0;
  const hasPrev = tractate && perek != null && (perek > 1 || tractateIndex > 0);
  const hasNext = tractate && perek != null && (perek < tractatePerakim || (tractateIndex >= 0 && tractateIndex < MISHNA_TRACTATES.length - 1));

  const goPrev = () => {
    if (!tractate || perek == null) return;
    if (perek > 1) {
      setPerek(perek - 1);
    } else if (tractateIndex > 0) {
      const prev = MISHNA_TRACTATES[tractateIndex - 1];
      setTractate(prev.sefariaName);
      setPerek(prev.perakim);
    }
  };

  const goNext = () => {
    if (!tractate || perek == null) return;
    if (perek < tractatePerakim) {
      setPerek(perek + 1);
    } else if (tractateIndex >= 0 && tractateIndex < MISHNA_TRACTATES.length - 1) {
      const next = MISHNA_TRACTATES[tractateIndex + 1];
      setTractate(next.sefariaName);
      setPerek(1);
    }
  };

  const headerTractateLabel = tractate && perek != null ? `Mishnah ${tractate}` : null;
  const headerPerekLabel = tractate && perek != null ? `Perek ${perek}` : params.mishnaYomi ? "Today's Mishna Yomi" : 'Mishna';

  const hebrewFontSize = HEBREW_FONT_SIZES[textSize];
  const hebrewLineHeight = HEBREW_LINE_HEIGHTS[textSize];
  const englishFontSize = hebrewFontSize * 0.85;
  const englishLineHeight = hebrewLineHeight * 0.85;

  const chromeTitle = headerTractateLabel ? `${headerTractateLabel} • ${headerPerekLabel}` : headerPerekLabel;

  return (
    <View style={[styles.container, { direction: 'rtl' }]}>
      <LinearGradient colors={theme.backgroundGradient} style={StyleSheet.absoluteFill} />
      <ReaderChrome
        title={chromeTitle}
        onBack={() => navigation.goBack()}
        topInset={insets.top}
      >
        <ReaderToolbar
          textSize={textSize}
          onTextSizeChange={setTextSize}
          showEnglish={showEnglish}
          onShowEnglishChange={setShowEnglish}
          showEnglishToggle={true}
        />
      </ReaderChrome>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + READER_CHROME_HEADER_HEIGHT_APPROX + spacing.md, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => { scrollYRef.current = e.nativeEvent.contentOffset.y; }}
        onContentSizeChange={(_, h) => { contentHeightRef.current = h; }}
      >
        <View style={styles.navRow}>
          <TouchableOpacity
            onPress={goNext}
            style={[styles.navButton, !hasNext && styles.navButtonDisabled]}
            disabled={!hasNext}
          >
            <Text style={[styles.navButtonText, { writingDirection: 'rtl' }]}>← Next</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={goPrev}
            style={[styles.navButton, !hasPrev && styles.navButtonDisabled]}
            disabled={!hasPrev}
          >
            <Text style={[styles.navButtonText, { writingDirection: 'rtl' }]}>Prev →</Text>
          </TouchableOpacity>
        </View>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary?.main || '#888'} />
            <Text style={styles.loadingText}>Loading Mishna...</Text>
          </View>
        ) : error ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
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
      <ReaderAutoscrollBar
        playing={autoscrollPlaying}
        onPlayingChange={setAutoscrollPlaying}
        speed={autoscrollSpeed}
        onSpeedChange={setAutoscrollSpeed}
        bottomInset={insets.bottom}
      />
    </View>
  );
};
