/**
 * Gemara – list of Talmud mesechtas + Daf Yomi button.
 * Styled like Library / Siddur (glass cards, gradient).
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { FadeIn } from '../../components/animations/FadeIn';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { useTheme } from '../../src/design/theme';
import type { AppTheme } from '../../src/design/theme';
import { JewishCalendarService } from '../../src/core/calendar/JewishCalendar';

/** Babylonian Talmud mesechtas in Daf Yomi order; name = Sefaria ref, hebrew = display. */
export const MESECHTAS: { name: string; hebrew: string; dapim: number }[] = [
  { name: 'Berakhot', hebrew: 'ברכות', dapim: 64 },
  { name: 'Shabbat', hebrew: 'שבת', dapim: 157 },
  { name: 'Eruvin', hebrew: 'עירובין', dapim: 105 },
  { name: 'Pesachim', hebrew: 'פסחים', dapim: 121 },
  { name: 'Yoma', hebrew: 'יומא', dapim: 88 },
  { name: 'Sukkah', hebrew: 'סוכה', dapim: 56 },
  { name: 'Beitzah', hebrew: 'ביצה', dapim: 40 },
  { name: 'Rosh Hashanah', hebrew: 'ראש השנה', dapim: 35 },
  { name: 'Taanit', hebrew: 'תענית', dapim: 31 },
  { name: 'Megillah', hebrew: 'מגילה', dapim: 32 },
  { name: 'Moed Katan', hebrew: 'מועד קטן', dapim: 29 },
  { name: 'Chagigah', hebrew: 'חגיגה', dapim: 27 },
  { name: 'Yevamot', hebrew: 'יבמות', dapim: 122 },
  { name: 'Ketubot', hebrew: 'כתובות', dapim: 112 },
  { name: 'Nedarim', hebrew: 'נדרים', dapim: 91 },
  { name: 'Nazir', hebrew: 'נזיר', dapim: 66 },
  { name: 'Sotah', hebrew: 'סוטה', dapim: 49 },
  { name: 'Gittin', hebrew: 'גיטין', dapim: 90 },
  { name: 'Kiddushin', hebrew: 'קידושין', dapim: 82 },
  { name: 'Bava Kamma', hebrew: 'בבא קמא', dapim: 119 },
  { name: 'Bava Metzia', hebrew: 'בבא מציעא', dapim: 119 },
  { name: 'Bava Batra', hebrew: 'בבא בתרא', dapim: 176 },
  { name: 'Sanhedrin', hebrew: 'סנהדרין', dapim: 113 },
  { name: 'Makkot', hebrew: 'מכות', dapim: 24 },
  { name: 'Shevuot', hebrew: 'שבועות', dapim: 49 },
  { name: 'Avodah Zarah', hebrew: 'עבודה זרה', dapim: 76 },
  { name: 'Horayot', hebrew: 'הוריות', dapim: 14 },
  { name: 'Zevachim', hebrew: 'זבחים', dapim: 120 },
  { name: 'Menachot', hebrew: 'מנחות', dapim: 110 },
  { name: 'Chullin', hebrew: 'חולין', dapim: 142 },
  { name: 'Bekhorot', hebrew: 'בכורות', dapim: 61 },
  { name: 'Arachin', hebrew: 'ערכין', dapim: 34 },
  { name: 'Temurah', hebrew: 'תמורה', dapim: 34 },
  { name: 'Keritot', hebrew: 'כריתות', dapim: 28 },
  { name: 'Meilah', hebrew: 'מעילה', dapim: 22 },
  { name: 'Tamid', hebrew: 'תמיד', dapim: 32 },
  { name: 'Middot', hebrew: 'מידות', dapim: 37 },
  { name: 'Niddah', hebrew: 'נדה', dapim: 73 },
];

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
    sectionTitle: {
      fontFamily: fonts.heading.semiBold,
      fontSize: 18,
      color: theme.colors.text.primary,
      marginBottom: spacing.md,
      marginTop: spacing.lg,
    },
    dafYomiCard: {
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: theme.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.8)',
      minHeight: 100,
      backgroundColor: theme.isDark ? 'rgba(180,160,255,0.25)' : 'rgba(180,160,255,0.3)',
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
    dafYomiIcon: { fontSize: 28, marginBottom: spacing.sm },
    dafYomiTitle: {
      fontFamily: fonts.heading.semibold,
      fontSize: 20,
      color: theme.colors.text.primary,
      textAlign: 'center',
    },
    dafYomiSubtitle: {
      fontFamily: fonts.body.regular,
      fontSize: 14,
      color: theme.colors.text.secondary,
      marginTop: 4,
      textAlign: 'center',
      flexShrink: 1,
    },
    mesechtaTitleHebrew: {
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
    mesechtaCard: {
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
    mesechtaTitle: {
      fontFamily: fonts.heading.semiBold,
      fontSize: 15,
      color: theme.colors.text.primary,
    },
    mesechtaDapim: {
      fontFamily: fonts.body.regular,
      fontSize: 12,
      color: theme.colors.text.tertiary,
      marginTop: 2,
    },
  });
}

export const GemaraScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const openDafYomi = () => {
    (navigation as any).navigate('GemaraReader', { dafYomi: true });
  };

  const openTractate = (name: string) => {
    (navigation as any).navigate('GemaraTractate', { tractate: name });
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
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Gemara</Text>
        <Text style={styles.titleHebrew}>תלמוד בבלי</Text>

        <FadeIn delay={100}>
          <TouchableOpacity style={styles.dafYomiCard} onPress={openDafYomi} activeOpacity={0.85}>
            {Platform.OS !== 'web' ? (
              <BlurView intensity={50} style={StyleSheet.absoluteFill}>
                <View style={[styles.glassInner, { backgroundColor: 'rgba(180,160,255,0.25)' }]}>
                  <Text style={styles.dafYomiIcon}>📚</Text>
                  <Text style={styles.dafYomiTitle}>Daf Yomi</Text>
                  <Text style={styles.dafYomiSubtitle}>Open today's daf</Text>
                </View>
              </BlurView>
            ) : (
              <View style={[styles.glassInner, { backgroundColor: 'rgba(180,160,255,0.3)' }]}>
                <Text style={styles.dafYomiIcon}>📚</Text>
                <Text style={styles.dafYomiTitle}>Daf Yomi</Text>
                <Text style={styles.dafYomiSubtitle}>Open today's daf</Text>
              </View>
            )}
          </TouchableOpacity>
        </FadeIn>

        <FadeIn delay={150}>
          <Text style={[styles.sectionTitle, { writingDirection: 'rtl', textAlign: 'right' }]}>מסכתות</Text>
          <View style={styles.grid}>
            {MESECHTAS.map((m, i) => (
              <View key={m.name} style={styles.gridItemWrapper}>
                <FadeIn delay={200 + i * 20}>
                  <TouchableOpacity
                    style={styles.mesechtaCard}
                    onPress={() => openTractate(m.name)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.mesechtaTitleHebrew}>{m.hebrew}</Text>
                    <Text style={[styles.mesechtaDapim, { writingDirection: 'rtl', textAlign: 'right' }]}>{JewishCalendarService.numberToHebrew(m.dapim)} דפים</Text>
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
