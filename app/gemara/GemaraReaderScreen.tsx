/**
 * Gemara Reader – displays one daf (Talmud page) from Sefaria.
 * Params: { dafYomi?: true } for today's daf, or { tractate, daf, side: 'a'|'b' }.
 * Styled like SiddurReader (gradient, glass, readable text).
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { useTheme } from '../../src/design/theme';
import { SefariaService, SefariaText } from '../../src/services/SefariaService';
import type { AppTheme } from '../../src/design/theme';
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


function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1 },
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
    dafLabel: {
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
      borderRadius: borderRadius.md,
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
      borderRadius: borderRadius.xl,
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
    nextAmud: {
      marginTop: spacing.lg,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    },
    amudSectionHeader: {
      fontFamily: fonts.heading.semibold,
      fontSize: 18,
      color: theme.colors.text.primary,
      marginTop: spacing.xl,
      marginBottom: spacing.md,
      textAlign: 'center',
      writingDirection: 'rtl',
    },
    nextAmudText: {
      fontFamily: fonts.body.medium,
      fontSize: 14,
      color: theme.colors.primary?.main || theme.colors.text.secondary,
    },
  });
}

export const GemaraReaderScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const params = (route.params || {}) as RouteParams;
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [tractate, setTractate] = useState<string | null>(params.tractate || null);
  const [daf, setDaf] = useState<number | null>(params.daf ?? null);
  const [side, setSide] = useState<'a' | 'b'>(params.side || 'a');
  const [data, setData] = useState<SefariaText | null>(null);
  const [dataB, setDataB] = useState<SefariaText | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <View style={[styles.container, { paddingTop: insets.top, direction: 'rtl' }]}>
      <LinearGradient
        colors={theme.backgroundGradient}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: spacing.md }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={[styles.backText, { writingDirection: 'rtl' }]}>Back →</Text>
          </TouchableOpacity>
          <View style={[styles.headerTitleBlock, { alignItems: 'flex-start' }]}>
            {headerTractateLabel ? (
              <>
                <Text style={[styles.tractateLabel, { textAlign: 'right', writingDirection: 'rtl' }]} numberOfLines={1}>{headerTractateLabel}</Text>
                <Text style={[styles.dafLabel, { textAlign: 'right', writingDirection: 'rtl' }]} numberOfLines={1}>{headerDafLabel}</Text>
              </>
            ) : (
              <Text style={[styles.title, { textAlign: 'right', writingDirection: 'rtl' }]} numberOfLines={1}>{headerDafLabel}</Text>
            )}
          </View>
          <View style={styles.navRow}>
            <TouchableOpacity
              onPress={goNextAmud}
              style={[styles.navButton, !hasNextAmud && styles.navButtonDisabled]}
              disabled={!hasNextAmud}
            >
              <Text style={[styles.navButtonText, { writingDirection: 'rtl' }]}>← Next</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={goPrevAmud}
              style={[styles.navButton, !hasPrevAmud && styles.navButtonDisabled]}
              disabled={!hasPrevAmud}
            >
              <Text style={[styles.navButtonText, { writingDirection: 'rtl' }]}>Prev →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary?.main || '#888'} />
            <Text style={styles.loadingText}>Loading daf...</Text>
          </View>
        ) : error ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : data || dataB ? (
          <>
            <View style={styles.card}>
              <Text style={[styles.amudSectionHeader, { marginTop: 0 }]}>דף א – Amud Alef</Text>
              {data && (() => {
                const rawH = data.hebrew;
                const arrH = Array.isArray(rawH) ? rawH : (rawH ? [rawH] : []);
                return arrH.map((block, i) => {
                  const clean = typeof block === 'string' ? block.replace(/<[^>]+>/g, '').trim() : String(block);
                  return clean ? <Text key={`a-h-${i}`} style={styles.hebrewBlock}>{clean}</Text> : null;
                });
              })()}
              {data && (() => {
                const rawE = data.english;
                const arrE = Array.isArray(rawE) ? rawE : (rawE ? [rawE] : []);
                return arrE.map((block, i) => {
                  const clean = typeof block === 'string' ? block.replace(/<[^>]+>/g, '').trim() : String(block);
                  return clean ? <Text key={`a-e-${i}`} style={styles.englishBlock}>{clean}</Text> : null;
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
                    return clean ? <Text key={`b-h-${i}`} style={styles.hebrewBlock}>{clean}</Text> : null;
                  });
                })()}
                {(() => {
                  const rawE = dataB.english;
                  const arrE = Array.isArray(rawE) ? rawE : (rawE ? [rawE] : []);
                  return arrE.map((block, i) => {
                    const clean = typeof block === 'string' ? block.replace(/<[^>]+>/g, '').trim() : String(block);
                    return clean ? <Text key={`b-e-${i}`} style={styles.englishBlock}>{clean}</Text> : null;
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
    </View>
  );
};
