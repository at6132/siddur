/**
 * Nach – list of Nach books + Nach Yomi button.
 * Mirrors GemaraScreen layout.
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
import { NACH_BOOKS } from '../../src/services/NachYomiService';

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
    sectionTitle: {
      fontFamily: fonts.hebrew.semibold,
      fontSize: 18,
      color: theme.colors.text.primary,
      marginBottom: spacing.md,
      marginTop: spacing.lg,
      letterSpacing: 0,
    },
    nachYomiCard: {
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: theme.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)',
      minHeight: 100,
      backgroundColor: theme.isDark ? 'rgba(165,200,165,0.25)' : 'rgba(165,200,165,0.3)',
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
    nachYomiIcon: { fontSize: 28, marginBottom: spacing.sm },
    nachYomiTitle: {
      fontFamily: fonts.heading.semibold,
      fontSize: 20,
      color: theme.colors.text.primary,
      textAlign: 'center',
    },
    nachYomiSubtitle: {
      fontFamily: fonts.body.regular,
      fontSize: 14,
      color: theme.colors.text.secondary,
      marginTop: 4,
      textAlign: 'center',
      flexShrink: 1,
    },
    bookTitleHebrew: {
      fontFamily: fonts.hebrew.regular,
      fontSize: 18,
      color: theme.colors.text.primary,
      writingDirection: 'rtl',
      textAlign: 'right',
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
    bookTitle: {
      fontFamily: fonts.heading.semibold,
      fontSize: 15,
      color: theme.colors.text.primary,
    },
    bookChapters: {
      fontFamily: fonts.body.regular,
      fontSize: 12,
      color: theme.colors.text.tertiary,
      marginTop: 2,
    },
  });
}

export const NachScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const openNachYomi = () => {
    (navigation as any).navigate('NachReader', { nachYomi: true });
  };

  const openBook = (sefariaName: string) => {
    (navigation as any).navigate('NachBook', { book: sefariaName });
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
        <Text style={styles.title}>Nach</Text>
        <Text style={styles.titleHebrew}>נביאים וכתובים</Text>

        <FadeIn delay={100}>
          <TouchableOpacity style={styles.nachYomiCard} onPress={openNachYomi} activeOpacity={0.85}>
            {Platform.OS !== 'web' ? (
              <BlurView intensity={50} style={StyleSheet.absoluteFill}>
                <View style={[styles.glassInner, { backgroundColor: 'rgba(165,200,165,0.25)' }]}>
                  <Text style={styles.nachYomiIcon}>📖</Text>
                  <Text style={styles.nachYomiTitle}>Nach Yomi</Text>
                  <Text style={styles.nachYomiSubtitle}>Open today's chapter</Text>
                </View>
              </BlurView>
            ) : (
              <View style={[styles.glassInner, { backgroundColor: 'rgba(165,200,165,0.3)' }]}>
                <Text style={styles.nachYomiIcon}>📖</Text>
                <Text style={styles.nachYomiTitle}>Nach Yomi</Text>
                <Text style={styles.nachYomiSubtitle}>Open today's chapter</Text>
              </View>
            )}
          </TouchableOpacity>
        </FadeIn>

        <FadeIn delay={150}>
          <Text style={[styles.sectionTitle, { writingDirection: 'rtl', textAlign: 'right' }]}>ספרים</Text>
          <View style={styles.grid}>
            {NACH_BOOKS.map((b, i) => (
              <View key={b.sefariaName} style={styles.gridItemWrapper}>
                <FadeIn delay={200 + i * 20}>
                  <TouchableOpacity
                    style={styles.bookCard}
                    onPress={() => openBook(b.sefariaName)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.bookTitleHebrew}>{b.hebrew}</Text>
                    <Text style={[styles.bookChapters, { writingDirection: 'rtl', textAlign: 'right' }]}>{b.chapters} פרקים</Text>
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
