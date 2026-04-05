/**
 * Nach Book – list of chapters for one book.
 * Mirrors GemaraTractateScreen.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { FadeIn } from '../../components/animations/FadeIn';
import { BackButton } from '../../components/ui/BackButton';
import { spacing } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { useTheme } from '../../src/design/theme';
import type { AppTheme } from '../../src/design/theme';
import { NACH_BOOKS } from '../../src/services/NachYomiService';
import { JewishCalendarService } from '../../src/core/calendar/JewishCalendar';

type RouteParams = { book: string };

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
      direction: 'ltr',
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
      fontFamily: fonts.hebrew.bold,
      fontSize: 26,
      color: theme.colors.text.primary,
      letterSpacing: 0,
    },
    subtitle: {
      fontFamily: fonts.body.regular,
      fontSize: 14,
      color: theme.colors.text.tertiary,
      marginTop: 4,
    },
    subtitleHebrew: {
      fontFamily: fonts.hebrew.regular,
      fontSize: 14,
      color: theme.colors.text.tertiary,
      marginTop: 4,
      writingDirection: 'rtl',
      textAlign: 'right',
      letterSpacing: 0,
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
    chapterText: {
      fontFamily: fonts.heading.semiBold,
      fontSize: 14,
      color: theme.colors.text.primary,
    },
    chapterTextHebrew: {
      fontFamily: fonts.hebrew.semibold,
      fontSize: 14,
      color: theme.colors.text.primary,
      writingDirection: 'rtl',
      textAlign: 'center',
      letterSpacing: 0,
    },
  });
}

export const NachBookScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { book } = (route.params || {}) as RouteParams;
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const info = NACH_BOOKS.find((b) => b.sefariaName === book);
  const chapters = info?.chapters ?? 0;

  const openChapter = (ch: number) => {
    (navigation as any).navigate('NachReader', { book, chapter: ch });
  };

  const hebrewName = info?.hebrew ?? '';

  if (!book || !info) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={theme.backgroundGradient} style={StyleSheet.absoluteFill} />
        <View style={styles.content}>
          <BackButton onPress={() => navigation.goBack()} style={styles.backButton} />
          <Text style={styles.title}>Book not found</Text>
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
          <BackButton onPress={() => navigation.goBack()} style={styles.backButton} />
        </View>
        <Text style={[styles.title, { writingDirection: 'rtl', textAlign: 'right' }]}>{hebrewName}</Text>
        <Text style={styles.subtitleHebrew}>{JewishCalendarService.numberToHebrew(chapters)} פרקים</Text>

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
