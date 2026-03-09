/**
 * Rambam – Rambam Yomi (3 or 1 chapter/day) button.
 * Mirrors NachScreen / MishnaScreen layout.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { FadeIn } from '../../components/animations/FadeIn';
import { BackButton } from '../../components/ui/BackButton';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { useTheme } from '../../src/design/theme';
import type { AppTheme } from '../../src/design/theme';
import { RAMBAM_BOOKS } from '../../src/services/RambamStructure';

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
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
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
    rambamYomiCard: {
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: theme.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)',
      minHeight: 100,
      backgroundColor: theme.isDark ? 'rgba(180,140,100,0.25)' : 'rgba(180,140,100,0.3)',
      shadowColor: theme.isDark ? '#000' : 'rgba(0,0,0,0.2)',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: theme.isDark ? 0.45 : 0.2,
      shadowRadius: theme.isDark ? 14 : 8,
      elevation: 3,
    },
    glassInner: {
      flex: 1,
      padding: spacing.lg,
      paddingHorizontal: spacing.lg + 4,
      borderRadius: borderRadius.xl,
      minHeight: 88,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'stretch',
    },
    rambamYomiIcon: { fontSize: 28, marginBottom: spacing.sm },
    rambamYomiTitle: {
      fontFamily: fonts.heading.semibold,
      fontSize: 20,
      color: theme.colors.text.primary,
      textAlign: 'center',
    },
    rambamYomiSubtitle: {
      fontFamily: fonts.body.regular,
      fontSize: 14,
      color: theme.colors.text.secondary,
      marginTop: 4,
      textAlign: 'center',
      flexShrink: 1,
    },
    sectionTitle: {
      fontFamily: fonts.hebrew.semibold,
      fontSize: 18,
      color: theme.colors.text.primary,
      marginBottom: spacing.md,
      letterSpacing: 0,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -spacing.sm,
    },
    gridItemWrapper: {
      width: '50%',
      padding: spacing.sm,
    },
    bookCard: {
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.8)',
      shadowColor: theme.isDark ? '#000' : 'rgba(0,0,0,0.15)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: theme.isDark ? 0.35 : 0.15,
      shadowRadius: theme.isDark ? 10 : 6,
      elevation: 2,
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
    bookChapters: {
      fontFamily: fonts.hebrew.regular,
      fontSize: 12,
      color: theme.colors.text.tertiary,
      marginTop: 2,
      letterSpacing: 0,
    },
  });
}

export const RambamScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const openRambamYomi = () => {
    (navigation as any).navigate('RambamReader', { rambamYomi: true });
  };

  const openBook = (bookId: string) => {
    (navigation as any).navigate('RambamBook', { bookId });
  };

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
        <Text style={styles.title}>Rambam</Text>
        <Text style={styles.titleHebrew}>משנה תורה</Text>

        <FadeIn delay={100}>
          <TouchableOpacity style={styles.rambamYomiCard} onPress={openRambamYomi} activeOpacity={0.85}>
            {Platform.OS !== 'web' ? (
              <BlurView intensity={50} style={StyleSheet.absoluteFill}>
                <View style={[styles.glassInner, { backgroundColor: 'rgba(180,140,100,0.25)' }]}>
                  <Text style={styles.rambamYomiIcon}>📕</Text>
                  <Text style={styles.rambamYomiTitle}>Rambam Yomi</Text>
                  <Text style={styles.rambamYomiSubtitle}>3 chapters per day • Open today's study</Text>
                </View>
              </BlurView>
            ) : (
              <View style={[styles.glassInner, { backgroundColor: 'rgba(180,140,100,0.3)' }]}>
                <Text style={styles.rambamYomiIcon}>📕</Text>
                <Text style={styles.rambamYomiTitle}>Rambam Yomi</Text>
                <Text style={styles.rambamYomiSubtitle}>3 chapters per day • Open today's study</Text>
              </View>
            )}
          </TouchableOpacity>
        </FadeIn>

        <FadeIn delay={150}>
          <Text style={[styles.sectionTitle, { writingDirection: 'rtl', textAlign: 'right' }]}>ספרים</Text>
          <View style={styles.grid}>
            {RAMBAM_BOOKS.map((b, i) => (
              <View key={b.id} style={styles.gridItemWrapper}>
                <FadeIn delay={200 + i * 20}>
                  <TouchableOpacity
                    style={styles.bookCard}
                    onPress={() => openBook(b.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.bookTitleHebrew}>{b.hebrew}</Text>
                    <Text style={[styles.bookChapters, { writingDirection: 'rtl', textAlign: 'right' }]}>{b.sections.length} הלכות</Text>
                  </TouchableOpacity>
                </FadeIn>
              </View>
            ))}
          </View>
        </FadeIn>
      </ScrollView>
    </View>
  );
};
