/**
 * Rambam Reader – displays today's Rambam Yomi (Mishneh Torah) from Sefaria.
 * Params: { rambamYomi?: true } for today's 3 chapters, or { sefariaRef } for explicit ref.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
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
  ReaderAction,
} from '../../components/learning/ReaderParts';
import { SefariaService, SefariaText } from '../../src/services/SefariaService';
import { UserPreferencesService } from '../../src/storage/UserPreferences';
import { getTodayRambamYomi, RambamYomiResult } from '../../src/services/RambamYomiService';
import type { DisplayPreferences } from '../../src/types/preferences';

type RouteParams = {
  rambamYomi?: boolean;
  sefariaRef?: string;
};

export const RambamReaderScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const params = (route.params || {}) as RouteParams;
  const { theme } = useTheme();
  const styles = useMemo(() => createReaderStyles(theme), [theme]);

  const [rambamInfo, setRambamInfo] = useState<RambamYomiResult | null>(null);
  const [sefariaRef, setSefariaRef] = useState<string | null>(params.sefariaRef || null);
  const { height: viewportHeight } = useWindowDimensions();
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
      let ref = sefariaRef;

      if (params.rambamYomi && !ref) {
        const today = await getTodayRambamYomi(3);
        if (cancelled) return;
        if (today) {
          setRambamInfo(today);
          ref = today.sefariaRef;
          setSefariaRef(ref);
        } else {
          setError("Could not determine today's Rambam Yomi.");
          setLoading(false);
          return;
        }
      }

      if (!ref) {
        setError('Missing reference.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      const result = await SefariaService.fetchText(ref);
      if (cancelled) return;
      setData(result);
      setError(result ? null : 'Could not load this text.');
      setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [params.rambamYomi, params.sefariaRef]);

  const displayTitle = rambamInfo?.title ?? sefariaRef ?? "Today's Rambam Yomi";
  const hebrewFontSize = HEBREW_FONT_SIZES[textSize];
  const hebrewLineHeight = HEBREW_LINE_HEIGHTS[textSize];
  const englishFontSize = hebrewFontSize * 0.85;
  const englishLineHeight = hebrewLineHeight * 0.85;

  const chromeTitle = params.rambamYomi ? "Today's Rambam Yomi" : (displayTitle ?? 'Mishneh Torah');

  return (
    <View style={[styles.container, { direction: 'rtl' }]}>
      <LinearGradient
        colors={theme.backgroundGradient}
        style={StyleSheet.absoluteFill}
      />
      <ReaderChrome
        title={chromeTitle}
        titleHebrew={displayTitle && displayTitle !== chromeTitle ? displayTitle : undefined}
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
        {loading ? (
          <ReaderLoading label="Loading Mishneh Torah..." />
        ) : error ? (
          <ReaderMessage message={error}>
            {rambamInfo?.link && (
              <ReaderAction
                variant="link"
                label="Open in Sefaria"
                icon="open-outline"
                onPress={() => rambamInfo.link && Linking.openURL(rambamInfo.link)}
              />
            )}
          </ReaderMessage>
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
            {rambamInfo?.link && (
              <ReaderAction
                variant="link"
                label="Open in Sefaria"
                icon="open-outline"
                onPress={() => rambamInfo!.link && Linking.openURL(rambamInfo!.link)}
              />
            )}
          </View>
        ) : null}
      </ScrollView>
      <ReaderAutoscrollBar playing={autoscrollPlaying} onPlayingChange={setAutoscrollPlaying} speed={autoscrollSpeed} onSpeedChange={setAutoscrollSpeed} bottomInset={insets.bottom} />
    </View>
  );
};
