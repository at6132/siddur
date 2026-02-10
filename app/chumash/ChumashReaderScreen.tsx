/**
 * Chumash Reader – displays Torah text from Sefaria.
 * Params: { ref } required; { parsha, aliyah } optional for Shneyim Mikra mark-complete.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { useTheme } from '../../src/design/theme';
import { SefariaService, SefariaText } from '../../src/services/SefariaService';
import { getShneyimMikraData } from '../../src/services/ShneyimMikraService';
import { ShneyimMikraTracker } from '../../src/storage/ShneyimMikraTracker';
import type { AppTheme } from '../../src/design/theme';

type RouteParams = {
  ref: string;
  parsha?: string;
  aliyah?: number;
};

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
    backButton: { paddingVertical: spacing.sm, paddingRight: spacing.md },
    backText: {
      fontFamily: fonts.body.medium,
      fontSize: 16,
      color: theme.colors.text.secondary,
    },
    headerTitleBlock: { flex: 1, marginLeft: spacing.sm, marginRight: spacing.sm },
    refLabel: {
      fontFamily: fonts.body.regular,
      fontSize: 12,
      color: theme.colors.text.tertiary,
    },
    subLabel: {
      fontFamily: fonts.body.regular,
      fontSize: 12,
      color: theme.colors.text.tertiary,
      marginTop: 2,
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
    loadingContainer: { padding: spacing.xl, alignItems: 'center' },
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
    linkButton: { marginTop: spacing.md, paddingVertical: spacing.sm },
    linkButtonText: {
      fontFamily: fonts.body.medium,
      fontSize: 14,
      color: theme.colors.primary?.main || '#6B7FD7',
    },
    smProgressBar: {
      height: 4,
      backgroundColor: theme.isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.08)',
      borderRadius: 2,
      overflow: 'hidden',
      marginTop: spacing.sm,
    },
    smProgressFill: {
      height: '100%',
      backgroundColor: theme.colors.primary?.main || '#5a7fc9',
      borderRadius: 2,
    },
    smProgressLabel: {
      fontFamily: fonts.body.regular,
      fontSize: 11,
      color: theme.colors.text.tertiary,
      marginTop: 2,
    },
    markCompleteButton: {
      marginTop: spacing.lg,
      backgroundColor: theme.colors.primary?.main || '#5a7fc9',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: 12,
      alignItems: 'center',
    },
    markCompleteButtonText: {
      fontFamily: fonts.body.semibold,
      fontSize: 15,
      color: '#fff',
    },
    markedComplete: {
      marginTop: spacing.lg,
      backgroundColor: theme.isDark ? 'rgba(100,180,100,0.4)' : 'rgba(100,180,100,0.5)',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: 12,
      alignItems: 'center',
    },
    markedCompleteText: {
      fontFamily: fonts.body.semibold,
      fontSize: 15,
      color: theme.colors.text.primary,
    },
    nextAliyahButton: {
      marginTop: spacing.sm,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.primary?.main || '#5a7fc9',
      backgroundColor: 'transparent',
    },
    nextAliyahButtonText: {
      fontFamily: fonts.body.semibold,
      fontSize: 15,
      color: theme.colors.primary?.main || '#5a7fc9',
    },
  });
}

export const ChumashReaderScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const params = (route.params || {}) as RouteParams;
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [data, setData] = useState<SefariaText | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aliyahMarked, setAliyahMarked] = useState(false);
  const [smProgress, setSmProgress] = useState<{ percent: number; completed: number } | null>(null);
  const [aliyotRefs, setAliyotRefs] = useState<{ aliyah: number; ref: string }[]>([]);

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

  const sefariaUrl = ref
    ? `https://www.sefaria.org/${encodeURIComponent(ref.replace(/\s+/g, '_'))}`
    : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top, direction: 'rtl' }]}>
      <LinearGradient colors={theme.backgroundGradient} style={StyleSheet.absoluteFill} />
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
            <Text style={[styles.refLabel, { textAlign: 'right', writingDirection: 'rtl' }]} numberOfLines={1}>
              {ref}
            </Text>
            {parsha && aliyah && (
              <>
                <Text style={[styles.subLabel, { textAlign: 'right', writingDirection: 'rtl' }]}>
                  {parsha} • Aliyah {aliyah}
                </Text>
                {smProgress != null && (
                  <View style={styles.smProgressBar}>
                    <View style={[styles.smProgressFill, { width: `${smProgress.percent}%` }]} />
                  </View>
                )}
                {smProgress != null && (
                  <Text style={[styles.smProgressLabel, { textAlign: 'right', writingDirection: 'rtl' }]}>
                    Shneyim Mikra: {smProgress.completed}/7
                  </Text>
                )}
              </>
            )}
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary?.main || '#888'} />
            <Text style={styles.loadingText}>Loading Chumash...</Text>
          </View>
        ) : error ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.errorText}>{error}</Text>
            {sefariaUrl && (
              <TouchableOpacity style={styles.linkButton} onPress={() => Linking.openURL(sefariaUrl)}>
                <Text style={styles.linkButtonText}>Open in Sefaria →</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : data ? (
          <View style={styles.card}>
            {(() => {
              const rawH = data.hebrew;
              const arrH = Array.isArray(rawH) ? rawH : rawH ? [rawH] : [];
              return arrH.map((block, i) => {
                const clean = typeof block === 'string' ? block.replace(/<[^>]+>/g, '').trim() : String(block);
                return clean ? <Text key={i} style={styles.hebrewBlock}>{clean}</Text> : null;
              });
            })()}
            {(() => {
              const rawE = data.english;
              const arrE = Array.isArray(rawE) ? rawE : rawE ? [rawE] : [];
              return arrE.map((block, i) => {
                const clean = typeof block === 'string' ? block.replace(/<[^>]+>/g, '').trim() : String(block);
                return clean ? <Text key={i} style={styles.englishBlock}>{clean}</Text> : null;
              });
            })()}
            {canMarkComplete && (
              <>
                {aliyahMarked ? (
                  <View style={styles.markedComplete}>
                    <Text style={styles.markedCompleteText}>✓ Aliyah {aliyah} marked complete</Text>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.markCompleteButton} onPress={handleMarkComplete} activeOpacity={0.8}>
                    <Text style={styles.markCompleteButtonText}>Mark Aliyah {aliyah} Complete</Text>
                  </TouchableOpacity>
                )}
                {nextAliyahRef && (
                  <TouchableOpacity style={styles.nextAliyahButton} onPress={handleNextAliyah} activeOpacity={0.8}>
                    <Text style={styles.nextAliyahButtonText}>Next Aliyah →</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
            <Text style={styles.attribution}>Texts provided by Sefaria • sefaria.org</Text>
            {sefariaUrl && (
              <TouchableOpacity style={styles.linkButton} onPress={() => Linking.openURL(sefariaUrl)}>
                <Text style={styles.linkButtonText}>Open in Sefaria →</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};
