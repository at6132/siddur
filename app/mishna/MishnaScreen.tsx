/**
 * Mishna – list of Mishna tractates + Mishna Yomi button.
 * Mirrors NachScreen layout.
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
import { MISHNA_TRACTATES } from '../../src/services/MishnaYomiService';

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
      fontFamily: fonts.body.regular,
      fontSize: 18,
      color: theme.colors.text.tertiary,
      marginTop: 4,
    },
    mishnaYomiCard: {
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: theme.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)',
      minHeight: 100,
      backgroundColor: theme.isDark ? 'rgba(200,165,165,0.25)' : 'rgba(200,165,165,0.3)',
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
    mishnaYomiIcon: { fontSize: 28, marginBottom: spacing.sm },
    mishnaYomiTitle: {
      fontFamily: fonts.heading.semibold,
      fontSize: 20,
      color: theme.colors.text.primary,
      textAlign: 'center',
    },
    mishnaYomiSubtitle: {
      fontFamily: fonts.body.regular,
      fontSize: 14,
      color: theme.colors.text.secondary,
      marginTop: 4,
      textAlign: 'center',
      flexShrink: 1,
    },
    tractateTitleHebrew: {
      fontFamily: fonts.heading.regular,
      fontSize: 18,
      color: theme.colors.text.primary,
      writingDirection: 'rtl',
      textAlign: 'right',
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
    tractateCard: {
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
    tractatePerakim: {
      fontFamily: fonts.body.regular,
      fontSize: 12,
      color: theme.colors.text.tertiary,
      marginTop: 2,
      writingDirection: 'rtl',
      textAlign: 'right',
    },
  });
}

export const MishnaScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const openMishnaYomi = () => {
    (navigation as any).navigate('MishnaReader', { mishnaYomi: true });
  };

  const openTractate = (sefariaName: string) => {
    (navigation as any).navigate('MishnaTractate', { tractate: sefariaName });
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
        <Text style={styles.title}>Mishna</Text>
        <Text style={styles.titleHebrew}>משנה</Text>

        <FadeIn delay={100}>
          <TouchableOpacity style={styles.mishnaYomiCard} onPress={openMishnaYomi} activeOpacity={0.85}>
            {Platform.OS !== 'web' ? (
              <BlurView intensity={50} style={StyleSheet.absoluteFill}>
                <View style={[styles.glassInner, { backgroundColor: 'rgba(200,165,165,0.25)' }]}>
                  <Text style={styles.mishnaYomiIcon}>📕</Text>
                  <Text style={styles.mishnaYomiTitle}>Mishna Yomi</Text>
                  <Text style={styles.mishnaYomiSubtitle}>Open today's perek</Text>
                </View>
              </BlurView>
            ) : (
              <View style={[styles.glassInner, { backgroundColor: 'rgba(200,165,165,0.3)' }]}>
                <Text style={styles.mishnaYomiIcon}>📕</Text>
                <Text style={styles.mishnaYomiTitle}>Mishna Yomi</Text>
                <Text style={styles.mishnaYomiSubtitle}>Open today's perek</Text>
              </View>
            )}
          </TouchableOpacity>
        </FadeIn>

        <FadeIn delay={150}>
          <Text style={[styles.tractateTitleHebrew, { marginBottom: spacing.md, marginTop: spacing.lg }]}>מסכתות</Text>
          <View style={styles.grid}>
            {MISHNA_TRACTATES.map((t, i) => (
              <View key={t.sefariaName} style={styles.gridItemWrapper}>
                <FadeIn delay={200 + i * 10}>
                  <TouchableOpacity
                    style={styles.tractateCard}
                    onPress={() => openTractate(t.sefariaName)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.tractateTitleHebrew}>{t.hebrew}</Text>
                    <Text style={styles.tractatePerakim}>{t.perakim} פרקים</Text>
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
