/**
 * Rambam Section – grid of chapters for one Hilchot section.
 * Tap chapter -> RambamReader with sefariaRef.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { FadeIn } from '../../components/animations/FadeIn';
import { spacing } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { useTheme } from '../../src/design/theme';
import type { AppTheme } from '../../src/design/theme';
import { RAMBAM_BOOKS } from '../../src/services/RambamStructure';
import { JewishCalendarService } from '../../src/core/calendar/JewishCalendar';

type RouteParams = { sefariaName: string };

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
      marginBottom: spacing.md,
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
    title: {
      fontFamily: fonts.heading.bold,
      fontSize: 22,
      color: theme.colors.text.primary,
    },
    subtitle: {
      fontFamily: fonts.body.regular,
      fontSize: 14,
      color: theme.colors.text.tertiary,
      marginTop: 4,
      writingDirection: 'rtl',
      textAlign: 'right',
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: spacing.lg,
      marginHorizontal: -spacing.xs,
    },
    chapterWrapper: {
      width: '25%',
      padding: spacing.xs,
    },
    chapterCard: {
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.7)',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 52,
      backgroundColor: theme.isDark ? 'rgba(40,38,55,0.8)' : 'rgba(255,255,255,0.7)',
    },
    chapterTextHebrew: {
      fontFamily: fonts.heading.semibold,
      fontSize: 14,
      color: theme.colors.text.primary,
      writingDirection: 'rtl',
      textAlign: 'center',
    },
  });
}

export const RambamSectionScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { sefariaName } = (route.params || {}) as RouteParams;
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const section = RAMBAM_BOOKS.flatMap((b) => b.sections).find(
    (s) => s.sefariaName === sefariaName
  );
  const chapters = section?.chapters ?? 0;

  const openChapter = (ch: number) => {
    const sefariaRef = `Mishneh Torah, ${sefariaName} ${ch}`;
    (navigation as any).navigate('RambamReader', { sefariaRef });
  };

  if (!section || !sefariaName) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={theme.backgroundGradient} style={StyleSheet.absoluteFill} />
        <View style={[styles.content, { paddingTop: spacing.xl + spacing.safeTopInset }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Section not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={theme.backgroundGradient}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>{section.hebrew}</Text>
        <Text style={styles.subtitle}>{JewishCalendarService.numberToHebrew(chapters)} פרקים</Text>

        <View style={styles.grid}>
          {Array.from({ length: chapters }, (_, i) => i + 1).map((ch, i) => (
            <View key={ch} style={styles.chapterWrapper}>
              <FadeIn delay={Math.min(i * 5, 400)}>
                <TouchableOpacity
                  style={styles.chapterCard}
                  onPress={() => openChapter(ch)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.chapterTextHebrew}>פרק {JewishCalendarService.numberToHebrew(ch)}</Text>
                </TouchableOpacity>
              </FadeIn>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};
