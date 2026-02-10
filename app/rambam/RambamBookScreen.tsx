/**
 * Rambam Book – list of Hilchot sections for one book of Mishneh Torah.
 * Tap section -> RambamSectionScreen (chapters).
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { FadeIn } from '../../components/animations/FadeIn';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { useTheme } from '../../src/design/theme';
import type { AppTheme } from '../../src/design/theme';
import { RAMBAM_BOOKS } from '../../src/services/RambamStructure';
import { JewishCalendarService } from '../../src/core/calendar/JewishCalendar';

type RouteParams = { bookId: string };

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
      fontSize: 26,
      color: theme.colors.text.primary,
      writingDirection: 'rtl',
      textAlign: 'right',
    },
    subtitle: {
      fontFamily: fonts.body.regular,
      fontSize: 14,
      color: theme.colors.text.tertiary,
      marginTop: 4,
    },
    sectionList: {
      marginTop: spacing.lg,
      gap: spacing.sm,
    },
    sectionCard: {
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.8)',
      backgroundColor: theme.isDark ? 'rgba(40,38,55,0.85)' : 'rgba(255,255,255,0.75)',
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sectionTitle: {
      fontFamily: fonts.heading.semibold,
      fontSize: 16,
      color: theme.colors.text.primary,
      flex: 1,
    },
    sectionChapters: {
      fontFamily: fonts.body.regular,
      fontSize: 13,
      color: theme.colors.text.tertiary,
    },
  });
}

export const RambamBookScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { bookId } = (route.params || {}) as RouteParams;
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const book = RAMBAM_BOOKS.find((b) => b.id === bookId);

  const openSection = (sefariaName: string) => {
    (navigation as any).navigate('RambamSection', { sefariaName });
  };

  if (!book) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={theme.backgroundGradient} style={StyleSheet.absoluteFill} />
        <View style={[styles.content, { paddingTop: spacing.xl + spacing.safeTopInset }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Book not found</Text>
        </View>
      </View>
    );
  }

  const totalChapters = book.sections.reduce((sum, s) => sum + s.chapters, 0);

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
        <Text style={styles.title}>{book.hebrew}</Text>
        <Text style={styles.subtitle}>{book.english} • {JewishCalendarService.numberToHebrew(totalChapters)} פרקים</Text>

        <View style={styles.sectionList}>
          {book.sections.map((section, i) => (
            <FadeIn key={section.sefariaName} delay={i * 20}>
              <TouchableOpacity
                style={styles.sectionCard}
                onPress={() => openSection(section.sefariaName)}
                activeOpacity={0.8}
              >
                <Text style={styles.sectionTitle} numberOfLines={1}>{section.hebrew}</Text>
                <Text style={styles.sectionChapters}>{section.chapters} פרקים</Text>
              </TouchableOpacity>
            </FadeIn>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};
