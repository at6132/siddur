/**
 * Gemara Tractate – list of dapim for one mesechta.
 * Tap a daf to open GemaraReader.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { FadeIn } from '../../components/animations/FadeIn';
import { BackButton } from '../../components/ui/BackButton';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { useTheme } from '../../src/design/theme';
import type { AppTheme } from '../../src/design/theme';
import { MESECHTAS } from './GemaraScreen';
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
    },
    subtitle: {
      fontFamily: fonts.body.regular,
      fontSize: 14,
      color: theme.colors.text.tertiary,
      marginTop: 4,
    },
    subtitleHebrew: {
      fontFamily: fonts.body.regular,
      fontSize: 14,
      color: theme.colors.text.tertiary,
      marginTop: 4,
      writingDirection: 'rtl',
      textAlign: 'right',
    },
    dafTextHebrew: {
      fontFamily: fonts.heading.semiBold,
      fontSize: 14,
      color: theme.colors.text.primary,
      writingDirection: 'rtl',
      textAlign: 'center',
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: spacing.lg,
      marginHorizontal: -spacing.xs,
    },
    dafWrapper: {
      width: '25%',
      padding: spacing.xs,
    },
    dafCard: {
      borderRadius: borderRadius.md,
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
    dafText: {
      fontFamily: fonts.heading.semiBold,
      fontSize: 14,
      color: theme.colors.text.primary,
    },
  });
}

export const GemaraTractateScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { tractate } = (route.params || {}) as RouteParams;
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const info = MESECHTAS.find((m) => m.name === tractate);
  const dapim = info?.dapim ?? 0;

  const dafList: { daf: number; side: 'a' | 'b' }[] = [];
  for (let d = 2; d <= dapim + 1; d++) {
    dafList.push({ daf: d, side: 'a' });
    dafList.push({ daf: d, side: 'b' });
  }

  const openDaf = (daf: number, side: 'a' | 'b') => {
    (navigation as any).navigate('GemaraReader', { tractate, daf, side });
  };

  const hebrewName = info?.hebrew ?? '';

  if (!tractate || !info) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={theme.backgroundGradient} style={StyleSheet.absoluteFill} />
        <View style={styles.content}>
          <BackButton onPress={() => navigation.goBack()} style={styles.backButton} />
          <Text style={styles.title}>Tractate not found</Text>
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
        <Text style={styles.subtitleHebrew}>{JewishCalendarService.numberToHebrew(dapim)} דפים • נגע לדף</Text>

        <View style={styles.grid}>
          {dafList.map((item, i) => (
            <View key={`${item.daf}${item.side}`} style={styles.dafWrapper}>
              <FadeIn delay={Math.min(i * 5, 400)}>
                <TouchableOpacity
                  style={styles.dafCard}
                  onPress={() => openDaf(item.daf, item.side)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dafTextHebrew}>דף {JewishCalendarService.numberToHebrew(item.daf)} {item.side === 'a' ? 'א' : 'ב'}</Text>
                </TouchableOpacity>
              </FadeIn>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};
