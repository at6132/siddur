/**
 * Daily Gratitude – list of entries with date. Plus button to add. No total on top.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BackButton } from '../../components/ui/BackButton';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { colors } from '../../src/design/colors';
import { DEFAULT_SCREEN_BACKGROUND } from '../../src/design/screenGradient';
import { colorWithAlpha } from '../../src/design/colorAlpha';
import { GratitudeTracker, type GratitudeEntry } from '../../src/storage/GratitudeTracker';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export const GratitudeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [entries, setEntries] = useState<GratitudeEntry[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [all, streakCount] = await Promise.all([
      GratitudeTracker.getAllEntries(),
      GratitudeTracker.getStreak(),
    ]);
    setEntries(all);
    setStreak(streakCount);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.container}>
      <LinearGradient colors={[...DEFAULT_SCREEN_BACKGROUND]} style={StyleSheet.absoluteFill} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <BackButton onPress={() => navigation.goBack()} label="Back to Hub" style={styles.backRow} />
        <Text style={styles.title}>Daily gratitude</Text>
        <Text style={styles.subtitle}>What are you thankful for?</Text>
        <View style={styles.headerActions}>
          {streak > 0 && (
            <View style={styles.streakPill}>
              <Text style={styles.streakText}>🔥 {streak} day streak</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.reminderBtn}
            onPress={() => (navigation as any).navigate('Settings', { scrollTo: 'dailyGratitude' })}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={16} color={colors.primary.main} />
            <Text style={styles.reminderBtnText}>Set Reminder</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <Text style={styles.muted}>Loading…</Text>
        ) : entries.length === 0 ? (
          <Text style={styles.muted}>No entries yet. Tap + to add.</Text>
        ) : (
          entries.map((entry) => (
            <View key={entry.id} style={styles.entryRow}>
              <Text style={styles.entryDate}>{formatDate(entry.date)}</Text>
              <Text style={styles.entryText}>{entry.text}</Text>
            </View>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => (navigation as any).navigate('AddGratitude')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.xl + spacing.safeTopInset,
  },
  backRow: { marginBottom: spacing.md },
  backText: { fontFamily: fonts.body.medium, fontSize: 16, color: colors.text.secondary },
  title: { fontFamily: fonts.heading.bold, fontSize: 28, color: colors.text.primary, marginBottom: 4 },
  subtitle: { fontFamily: fonts.body.regular, fontSize: 16, color: colors.text.secondary, marginBottom: spacing.sm },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  streakPill: {
    backgroundColor: Platform.OS === 'web' ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.9)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  streakText: { fontFamily: fonts.body.semibold, fontSize: 14, color: colors.primary.dark },
  reminderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colorWithAlpha(colors.accent.lavender, 0.22),
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  reminderBtnText: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: colors.primary.main,
  },
  muted: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.text.tertiary, marginBottom: spacing.md },
  entryRow: {
    backgroundColor: Platform.OS === 'web' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.85)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  entryDate: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.text.tertiary, marginBottom: 4 },
  entryText: { fontFamily: fonts.body.regular, fontSize: 16, color: colors.text.primary, lineHeight: 22 },
  fab: {
    position: 'absolute',
    bottom: 150,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { fontSize: 28, color: colors.text.inverse, fontFamily: fonts.body.regular, lineHeight: 32 },
});
