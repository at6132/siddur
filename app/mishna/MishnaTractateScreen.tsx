/**
 * Mishna Tractate – list of perakim for one tractate.
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
import { MISHNA_TRACTATES } from '../../src/services/MishnaYomiService';
import { JewishCalendarService } from '../../src/core/calendar/JewishCalendar';

type RouteParams = { tractate: string };

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
      writingDirection: 'rtl',
      textAlign: 'right',
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: spacing.lg,
      marginHorizontal: -spacing.xs,
    },
    perekWrapper: {
      width: '25%',
      padding: spacing.xs,
    },
    perekCard: {
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
    perekTextHebrew: {
      fontFamily: fonts.heading.semibold,
      fontSize: 14,
      color: theme.colors.text.primary,
      writingDirection: 'rtl',
      textAlign: 'center',
    },
  });
}

export const MishnaTractateScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { tractate } = (route.params || {}) as RouteParams;
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const info = MISHNA_TRACTATES.find((t) => t.sefariaName === tractate);
  const perakim = info?.perakim ?? 0;

  const openPerek = (perek: number) => {
    (navigation as any).navigate('MishnaReader', { tractate, perek });
  };

  if (!tractate || !info) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={theme.backgroundGradient} style={StyleSheet.absoluteFill} />
        <View style={styles.content}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Tractate not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={theme.backgroundGradient} style={StyleSheet.absoluteFill} />
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
        <Text style={styles.title}>{info.hebrew}</Text>
        <Text style={styles.subtitle}>{JewishCalendarService.numberToHebrew(perakim)} פרקים</Text>

        <View style={styles.grid}>
          {Array.from({ length: perakim }, (_, i) => i + 1).map((p, i) => (
            <View key={p} style={styles.perekWrapper}>
              <FadeIn delay={Math.min(i * 5, 400)}>
                <TouchableOpacity
                  style={styles.perekCard}
                  onPress={() => openPerek(p)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.perekTextHebrew}>פרק {JewishCalendarService.numberToHebrew(p)}</Text>
                </TouchableOpacity>
              </FadeIn>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};
