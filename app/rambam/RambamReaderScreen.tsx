/**
 * Rambam Reader – displays today's Rambam Yomi (Mishneh Torah) from Sefaria.
 * Params: { rambamYomi?: true } for today's 3 chapters, or { sefariaRef } for explicit ref.
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
import { getTodayRambamYomi, RambamYomiResult } from '../../src/services/RambamYomiService';
import type { AppTheme } from '../../src/design/theme';

type RouteParams = {
  rambamYomi?: boolean;
  sefariaRef?: string;
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
    refLabel: {
      fontFamily: fonts.body.regular,
      fontSize: 12,
      color: theme.colors.text.tertiary,
      marginBottom: 2,
    },
    subLabel: {
      fontFamily: fonts.body.regular,
      fontSize: 12,
      color: theme.colors.text.tertiary,
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
    linkButton: {
      marginTop: spacing.md,
      paddingVertical: spacing.sm,
    },
    linkButtonText: {
      fontFamily: fonts.body.medium,
      fontSize: 14,
      color: theme.colors.primary?.main || '#6B7FD7',
    },
  });
}

export const RambamReaderScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const params = (route.params || {}) as RouteParams;
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [rambamInfo, setRambamInfo] = useState<RambamYomiResult | null>(null);
  const [sefariaRef, setSefariaRef] = useState<string | null>(params.sefariaRef || null);
  const [data, setData] = useState<SefariaText | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            <Text style={[styles.refLabel, { textAlign: 'right', writingDirection: 'rtl' }]} numberOfLines={1}>
              {displayTitle}
            </Text>
            <Text style={[styles.subLabel, { textAlign: 'right', writingDirection: 'rtl' }]} numberOfLines={1}>
              {params.rambamYomi ? "Today's Rambam Yomi" : 'Mishneh Torah'}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary?.main || '#888'} />
            <Text style={styles.loadingText}>Loading Mishneh Torah...</Text>
          </View>
        ) : error ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.errorText}>{error}</Text>
            {rambamInfo?.link && (
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => rambamInfo.link && Linking.openURL(rambamInfo.link)}
              >
                <Text style={styles.linkButtonText}>Open in Sefaria →</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : data ? (
          <View style={styles.card}>
            {(() => {
              const rawH = data.hebrew;
              const arrH = Array.isArray(rawH) ? rawH : (rawH ? [rawH] : []);
              return arrH.map((block, i) => {
                const clean = typeof block === 'string' ? block.replace(/<[^>]+>/g, '').trim() : String(block);
                return clean ? <Text key={i} style={styles.hebrewBlock}>{clean}</Text> : null;
              });
            })()}
            {(() => {
              const rawE = data.english;
              const arrE = Array.isArray(rawE) ? rawE : (rawE ? [rawE] : []);
              return arrE.map((block, i) => {
                const clean = typeof block === 'string' ? block.replace(/<[^>]+>/g, '').trim() : String(block);
                return clean ? <Text key={i} style={styles.englishBlock}>{clean}</Text> : null;
              });
            })()}
            <Text style={styles.attribution}>Texts provided by Sefaria • sefaria.org</Text>
            {rambamInfo?.link && (
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => rambamInfo!.link && Linking.openURL(rambamInfo!.link)}
              >
                <Text style={styles.linkButtonText}>Open in Sefaria →</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};
