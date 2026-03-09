/**
 * Pirkei Avos – 6 perakim grid. No daily-schedule button (studied weekly in summer).
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { FadeIn } from '../../components/animations/FadeIn';
import { BackButton } from '../../components/ui/BackButton';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { useTheme } from '../../src/design/theme';
import type { AppTheme } from '../../src/design/theme';

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
      fontFamily: fonts.heading.semibold,
      fontSize: 18,
      color: theme.colors.text.primary,
      marginBottom: spacing.md,
      marginTop: spacing.lg,
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
    perekCard: {
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
    perekTitle: {
      fontFamily: fonts.hebrew.semibold,
      fontSize: 18,
      color: theme.colors.text.primary,
      writingDirection: 'rtl',
      textAlign: 'right',
      letterSpacing: 0,
    },
    perekSubtitle: {
      fontFamily: fonts.body.regular,
      fontSize: 12,
      color: theme.colors.text.tertiary,
      marginTop: 2,
    },
  });
}

const PEREK_HEBREW = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳'];

export const PirkeiAvosScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const openPerek = (perek: number) => {
    (navigation as any).navigate('MishnaReader', { tractate: 'Pirkei Avot', perek });
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
        <Text style={styles.title}>Pirkei Avos</Text>
        <Text style={styles.titleHebrew}>פרקי אבות</Text>

        <FadeIn delay={100}>
          <Text style={styles.sectionTitle}>6 Perakim</Text>
          <View style={styles.grid}>
            {[1, 2, 3, 4, 5, 6].map((perek, i) => (
              <View key={perek} style={styles.gridItemWrapper}>
                <FadeIn delay={200 + i * 10}>
                  <TouchableOpacity
                    style={styles.perekCard}
                    onPress={() => openPerek(perek)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.perekTitle}>פרק {PEREK_HEBREW[i]}</Text>
                    <Text style={styles.perekSubtitle}>Perek {perek}</Text>
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
