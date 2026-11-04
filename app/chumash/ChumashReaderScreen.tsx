/**
 * Chumash Reader – displays Torah text from Sefaria.
 * Params: { ref } required; { parsha, aliyah } optional for Shneyim Mikra mark-complete.
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
  ReaderAction,
  ReaderDoneBadge,
} from '../../components/learning/ReaderParts';
import { SefariaService, SefariaText } from '../../src/services/SefariaService';
import { getShneyimMikraData } from '../../src/services/ShneyimMikraService';
import { ShneyimMikraTracker } from '../../src/storage/ShneyimMikraTracker';
import { UserPreferencesService } from '../../src/storage/UserPreferences';
import type { DisplayPreferences } from '../../src/types/preferences';

type RouteParams = {
  ref: string;
  parsha?: string;
  aliyah?: number;
};

export const ChumashReaderScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const params = (route.params || {}) as RouteParams;
  const { theme } = useTheme();
  const styles = useMemo(() => createReaderStyles(theme), [theme]);

  const { height: viewportHeight } = useWindowDimensions();
  const [data, setData] = useState<SefariaText | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aliyahMarked, setAliyahMarked] = useState(false);
  const [smProgress, setSmProgress] = useState<{ percent: number; completed: number } | null>(null);
  const [aliyotRefs, setAliyotRefs] = useState<{ aliyah: number; ref: string }[]>([]);
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

  const ref = params.ref;
  const parsha = params.parsha;
  const aliyah = params.aliyah;
  const canMarkComplete = !!(parsha && aliyah);

  useEffect(() => {
    if (!ref) {
      setError('Missing reference.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
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
  }, [ref]);

  useEffect(() => {
    if (!parsha) return;
    let cancelled = false;
    ShneyimMikraTracker.getProgress(parsha).then((p) => {
      if (!cancelled) setSmProgress({ percent: p.percentComplete, completed: p.aliyotCompleted.length });
    });
    return () => { cancelled = true; };
  }, [parsha, aliyahMarked]);

  useEffect(() => {
    if (!parsha) return;
    let cancelled = false;
    getShneyimMikraData().then((d) => {
      if (!cancelled && d?.parsha === parsha && d.aliyot) {
        setAliyotRefs(d.aliyot.map((a) => ({ aliyah: a.aliyah, ref: a.ref })));
      }
    });
    return () => { cancelled = true; };
  }, [parsha]);

  const handleMarkComplete = async () => {
    if (!parsha || !aliyah) return;
    await ShneyimMikraTracker.markAliyahComplete(parsha, aliyah);
    setAliyahMarked(true);
    const p = await ShneyimMikraTracker.getProgress(parsha);
    setSmProgress({ percent: p.percentComplete, completed: p.aliyotCompleted.length });
  };

  const nextAliyahRef = parsha && aliyah && aliyah < 7
    ? aliyotRefs.find((a) => a.aliyah === aliyah + 1)?.ref
    : null;

  const handleNextAliyah = () => {
    if (!nextAliyahRef || !parsha || !aliyah) return;
    (navigation as any).replace('ChumashReader', {
      ref: nextAliyahRef,
      parsha,
      aliyah: aliyah + 1,
    });
  };

  const hebrewFontSize = HEBREW_FONT_SIZES[textSize];
  const hebrewLineHeight = HEBREW_LINE_HEIGHTS[textSize];
  const englishFontSize = hebrewFontSize * 0.85;
  const englishLineHeight = hebrewLineHeight * 0.85;

  const title = parsha && aliyah ? `${parsha} • Aliyah ${aliyah}` : ref;

  return (
    <View style={[styles.container, { direction: 'rtl' }]}>
      <LinearGradient colors={theme.backgroundGradient} style={StyleSheet.absoluteFill} />
      <ReaderChrome
        title={title}
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
        {parsha && aliyah && smProgress != null && (
          <View style={styles.smBlock}>
            <View style={styles.smProgressBar}>
              <View style={[styles.smProgressFill, { width: `${smProgress.percent}%` }]} />
            </View>
            <Text style={styles.smProgressLabel}>Shneyim Mikra: {smProgress.completed}/7</Text>
          </View>
        )}
        {loading ? (
          <ReaderLoading label="Loading Chumash..." />
        ) : error ? (
          <ReaderMessage message={error} />
        ) : data ? (
          <View style={styles.card}>
            {(() => {
              const rawH = data.hebrew;
              const arrH = Array.isArray(rawH) ? rawH : rawH ? [rawH] : [];
              return arrH.map((block, i) => {
                const clean = typeof block === 'string' ? block.replace(/<[^>]+>/g, '').trim() : String(block);
                return clean ? <Text key={i} style={[styles.hebrewBlock, { fontSize: hebrewFontSize, lineHeight: hebrewLineHeight }]}>{clean}</Text> : null;
              });
            })()}
            {showEnglish && (() => {
              const rawE = data.english;
              const arrE = Array.isArray(rawE) ? rawE : rawE ? [rawE] : [];
              return arrE.map((block, i) => {
                const clean = typeof block === 'string' ? block.replace(/<[^>]+>/g, '').trim() : String(block);
                return clean ? <Text key={i} style={[styles.englishBlock, { fontSize: englishFontSize, lineHeight: englishLineHeight }]}>{clean}</Text> : null;
              });
            })()}
            {canMarkComplete && (
              <>
                {aliyahMarked ? (
                  <ReaderDoneBadge label={`Aliyah ${aliyah} marked complete`} />
                ) : (
                  <ReaderAction
                    label={`Mark Aliyah ${aliyah} Complete`}
                    onPress={handleMarkComplete}
                    icon="checkmark-circle-outline"
                    confirm
                  />
                )}
                {nextAliyahRef && (
                  <ReaderAction
                    variant="outline"
                    label="Next Aliyah"
                    onPress={handleNextAliyah}
                    icon="arrow-forward"
                  />
                )}
              </>
            )}
            <Text style={styles.attribution}>Texts provided by Sefaria • sefaria.org</Text>
          </View>
        ) : null}
      </ScrollView>
      <ReaderAutoscrollBar playing={autoscrollPlaying} onPlayingChange={setAutoscrollPlaying} speed={autoscrollSpeed} onSpeedChange={setAutoscrollSpeed} bottomInset={insets.bottom} />
    </View>
  );
};
