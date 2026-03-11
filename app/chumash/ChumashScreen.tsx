/**
 * Chumash – Shneyim Mikra VeChad Targum (one aliyah/day) + 5 books browse.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/core';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { FadeIn } from '../../components/animations/FadeIn';
import { BackButton } from '../../components/ui/BackButton';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { useTheme } from '../../src/design/theme';
import type { AppTheme } from '../../src/design/theme';
import { getShneyimMikraData } from '../../src/services/ShneyimMikraService';
import { ShneyimMikraTracker } from '../../src/storage/ShneyimMikraTracker';
import { CHUMASH_BOOKS } from '../../src/services/ChumashStructure';

const HEBREW_DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1 },
    scrollView: { flex: 1 },
    content: {
      padding: spacing.lg,
      paddingTop: spacing.xl + spacing.safeTopInset,
      paddingBottom: 120,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    backButton: { paddingVertical: spacing.sm, paddingRight: spacing.md },
    backText: {
      fontFamily: fonts.body.medium,
      fontSize: 16,
      color: theme.colors.text.secondary,
    },
    title: {
      fontFamily: fonts.heading.bold,
      fontSize: 28,
      color: theme.colors.text.primary,
    },
    titleHebrew: {
      fontFamily: fonts.hebrew.regular,
      fontSize: 18,
      color: theme.colors.text.tertiary,
      marginTop: 4,
      letterSpacing: 0,
    },
    shneyimMikraCard: {
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
      marginTop: spacing.lg,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: theme.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)',
      minHeight: 120,
      backgroundColor: theme.isDark ? 'rgba(165,200,165,0.25)' : 'rgba(165,200,165,0.3)',
    },
    glassInner: {
      flex: 1,
      padding: spacing.lg,
      borderRadius: borderRadius.xl,
      minHeight: 118,
    },
    cardTitle: {
      fontFamily: fonts.heading.semibold,
      fontSize: 20,
      color: theme.colors.text.primary,
      marginBottom: spacing.xs,
    },
    cardSubtitle: {
      fontFamily: fonts.body.regular,
      fontSize: 14,
      color: theme.colors.text.secondary,
      marginBottom: spacing.sm,
    },
    progressBarBg: {
      height: 8,
      backgroundColor: theme.isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: spacing.xs,
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: theme.colors.primary?.main || '#5a7fc9',
      borderRadius: 4,
    },
    progressText: {
      fontFamily: fonts.body.medium,
      fontSize: 12,
      color: theme.colors.text.secondary,
      marginBottom: spacing.md,
    },
    continueButton: {
      backgroundColor: theme.colors.primary?.main || '#5a7fc9',
      paddingVertical: spacing.sm,
      paddingTop: spacing.xs,
      paddingHorizontal: spacing.xl,
      borderRadius: borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
    },
    continueButtonText: {
      fontFamily: fonts.body.semibold,
      fontSize: 15,
      color: '#fff',
    },
    completeMessage: {
      backgroundColor: theme.isDark ? 'rgba(100,180,100,0.3)' : 'rgba(100,180,100,0.4)',
      paddingVertical: spacing.sm,
      paddingTop: spacing.xs,
      paddingHorizontal: spacing.xl,
      borderRadius: borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
    },
    sectionTitle: {
      fontFamily: fonts.hebrew.semibold,
      fontSize: 18,
      color: theme.colors.text.primary,
      marginBottom: spacing.md,
      marginTop: spacing.lg,
      letterSpacing: 0,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -spacing.sm,
    },
    gridItemWrapper: { width: '50%', padding: spacing.sm },
    bookCard: {
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.8)',
      padding: spacing.md,
      minHeight: 80,
      justifyContent: 'center',
      backgroundColor: theme.isDark ? 'rgba(40,38,55,0.85)' : 'rgba(255,255,255,0.75)',
    },
    bookTitleHebrew: {
      fontFamily: fonts.hebrew.regular,
      fontSize: 18,
      color: theme.colors.text.primary,
      writingDirection: 'rtl',
      textAlign: 'right',
      letterSpacing: 0,
    },
  });
}

export const ChumashScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [data, setData] = useState<Awaited<ReturnType<typeof getShneyimMikraData>>>(null);
  const [progress, setProgress] = useState<{ aliyotCompleted: number[]; percentComplete: number; nextAliyah: number | null }>({ aliyotCompleted: [], percentComplete: 0, nextAliyah: 1 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const d = await getShneyimMikraData();
    setData(d);
    if (d?.parsha) {
      const p = await ShneyimMikraTracker.getProgress(d.parsha);
      setProgress(p);
    }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openNextAliyah = () => {
    if (!data?.parsha) return;
    const { nextAliyah } = progress;
    const ref = nextAliyah
      ? data.aliyot.find((a) => a.aliyah === nextAliyah)?.ref ?? data.todayRef
      : data.todayRef;
    if (ref) {
      (navigation as any).navigate('ChumashReader', {
        ref,
        parsha: data.parsha,
        aliyah: nextAliyah ?? data.todayAliyah,
      });
    }
  };

  const openBook = (b: { sefariaName: string; hebrew: string; firstRef: string }) => {
    (navigation as any).navigate('ChumashParshahPicker', { sefariaName: b.sefariaName });
  };

  const dayName = HEBREW_DAY_NAMES[new Date().getDay()];

  return (
    <View style={styles.container}>
      <LinearGradient colors={theme.backgroundGradient} style={StyleSheet.absoluteFill} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <BackButton onPress={() => navigation.goBack()} style={styles.backButton} />
        </View>
        <Text style={styles.title}>Chumash</Text>
        <Text style={styles.titleHebrew}>חומש</Text>

        <FadeIn delay={100}>
          <TouchableOpacity
            style={styles.shneyimMikraCard}
            onPress={openNextAliyah}
            activeOpacity={0.85}
            disabled={loading || !data?.parsha}
          >
            {Platform.OS !== 'web' ? (
              <BlurView intensity={50} style={StyleSheet.absoluteFill}>
                <View style={[styles.glassInner, { backgroundColor: 'rgba(165,200,165,0.25)' }]}>
                  {renderShneyimMikraContent()}
                </View>
              </BlurView>
            ) : (
              <View style={[styles.glassInner, { backgroundColor: 'rgba(165,200,165,0.3)' }]}>
                {renderShneyimMikraContent()}
              </View>
            )}
          </TouchableOpacity>
        </FadeIn>

        <FadeIn delay={150}>
          <Text style={[styles.sectionTitle, { writingDirection: 'rtl', textAlign: 'right' }]}>חמשה חומשי תורה</Text>
          <View style={styles.grid}>
            {CHUMASH_BOOKS.map((b, i) => (
              <View key={b.sefariaName} style={styles.gridItemWrapper}>
                <FadeIn delay={200 + i * 20}>
                  <TouchableOpacity style={styles.bookCard} onPress={() => openBook(b)} activeOpacity={0.8}>
                    <Text style={styles.bookTitleHebrew}>{b.hebrew}</Text>
                  </TouchableOpacity>
                </FadeIn>
              </View>
            ))}
          </View>
        </FadeIn>
      </ScrollView>
    </View>
  );

  function renderShneyimMikraContent() {
    if (loading) {
      return (
        <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
          <ActivityIndicator size="small" color={theme.colors.primary?.main || '#5a7fc9'} />
        </View>
      );
    }
    if (!data) {
      return (
        <>
          <Text style={styles.cardTitle}>Shneyim Mikra VeChad Targum</Text>
          <Text style={styles.cardSubtitle}>Unable to load this week's parsha</Text>
        </>
      );
    }
    const { parsha, parshaHebrew, todayAliyah } = data;
    const { percentComplete, nextAliyah } = progress;

    return (
      <>
        <Text style={styles.cardTitle}>Shneyim Mikra VeChad Targum</Text>
        <Text style={styles.cardSubtitle}>
          {parshaHebrew} • Aliyah {todayAliyah} ({dayName})
        </Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${percentComplete}%` }]} />
        </View>
        <Text style={styles.progressText}>{progress.aliyotCompleted.length} of 7 aliyot complete</Text>
        {nextAliyah ? (
          <TouchableOpacity style={styles.continueButton} onPress={openNextAliyah} activeOpacity={0.8}>
            <Text style={styles.continueButtonText}>Continue with Aliyah {nextAliyah}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.completeMessage}>
            <Text style={[styles.continueButtonText, { color: theme.colors.text.primary }]}>✓ {parsha} complete!</Text>
          </View>
        )}
      </>
    );
  }
};
