/**
 * Chumash Parshah Picker – choose a parsha within a sefer (book).
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
import { CHUMASH_BOOKS, PARSHIYOT_BY_BOOK, type ParshahOption } from '../../src/services/ChumashStructure';

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
    titleHebrew: {
      fontFamily: fonts.hebrew.semibold,
      fontSize: 24,
      color: theme.colors.text.primary,
      letterSpacing: 0,
      writingDirection: 'rtl',
      textAlign: 'right',
    },
    subtitle: {
      fontFamily: fonts.body.regular,
      fontSize: 14,
      color: theme.colors.text.tertiary,
      marginTop: 4,
    },
    list: {
      marginTop: spacing.lg,
    },
    parshaCard: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.sm,
      backgroundColor: theme.isDark ? 'rgba(40,38,55,0.8)' : 'rgba(255,255,255,0.75)',
    },
    parshaHebrew: {
      fontFamily: fonts.hebrew.regular,
      fontSize: 18,
      color: theme.colors.text.primary,
      writingDirection: 'rtl',
      textAlign: 'right',
      letterSpacing: 0,
      flex: 1,
    },
    parshaEnglish: {
      fontFamily: fonts.body.regular,
      fontSize: 14,
      color: theme.colors.text.secondary,
      marginRight: spacing.md,
    },
  });
}

export const ChumashParshahPickerScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { sefariaName } = (route.params || {}) as RouteParams;
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const book = CHUMASH_BOOKS.find((b) => b.sefariaName === sefariaName);
  const parshiyot = (sefariaName && PARSHIYOT_BY_BOOK[sefariaName]) ?? [];

  const openParshah = (p: ParshahOption) => {
    (navigation as any).navigate('ChumashReader', {
      ref: p.ref,
      parsha: p.parsha,
    });
  };

  if (!sefariaName || !book) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={theme.backgroundGradient} style={StyleSheet.absoluteFill} />
        <View style={styles.content}>
          <BackButton onPress={() => navigation.goBack()} style={styles.backButton} />
          <Text style={styles.subtitle}>Book not found</Text>
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
        <Text style={[styles.titleHebrew, { alignSelf: 'flex-end' }]}>{book.hebrew}</Text>
        <Text style={[styles.subtitle, { alignSelf: 'flex-end' }]}>{book.sefariaName} • {parshiyot.length} parshiyot</Text>

        <View style={styles.list}>
          {parshiyot.map((p, i) => (
            <FadeIn key={p.parsha} delay={Math.min(i * 15, 300)}>
              <TouchableOpacity
                style={styles.parshaCard}
                onPress={() => openParshah(p)}
                activeOpacity={0.8}
              >
                <Text style={styles.parshaHebrew}>{p.hebrew}</Text>
                <Text style={styles.parshaEnglish}>{p.parsha}</Text>
              </TouchableOpacity>
            </FadeIn>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};
