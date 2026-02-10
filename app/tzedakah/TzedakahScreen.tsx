/**
 * Tzedakah Tracker – total at top, history list, sort by organization/date/amount, filter by period.
 * Widget shows total past month.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { colors } from '../../src/design/colors';
import {
  TzedakahTracker,
  TzedakahEntry,
  TzedakahSortBy,
  TzedakahFilterPeriod,
} from '../../src/storage/TzedakahTracker';

const SORT_OPTIONS: { value: TzedakahSortBy; label: string }[] = [
  { value: 'date', label: 'Date' },
  { value: 'organization', label: 'Organization' },
  { value: 'amount', label: 'Amount' },
];

const FILTER_OPTIONS: { value: TzedakahFilterPeriod; label: string }[] = [
  { value: 'month', label: 'Past month' },
  { value: 'three_months', label: 'Past 3 months' },
  { value: 'year', label: 'This year' },
  { value: 'all', label: 'All time' },
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(amount: number): string {
  return '$' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export const TzedakahScreen: React.FC = () => {
  const navigation = useNavigation();
  const [entries, setEntries] = useState<TzedakahEntry[]>([]);
  const [sortBy, setSortBy] = useState<TzedakahSortBy>('date');
  const [filterPeriod, setFilterPeriod] = useState<TzedakahFilterPeriod>('month');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const all = await TzedakahTracker.getAllEntries();
    setEntries(all);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = TzedakahTracker.filterEntriesByPeriod(entries, filterPeriod);
  const sorted = TzedakahTracker.sortEntries(filtered, sortBy);
  const total = TzedakahTracker.getTotalForPeriod(filtered, filterPeriod);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FAF9F7', '#F5E6E8', '#E8F0F5']}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backRow}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Tzedakah</Text>
        <Text style={styles.subtitle}>Track your giving</Text>

        {/* Total */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total ({FILTER_OPTIONS.find((f) => f.value === filterPeriod)?.label })</Text>
          <Text style={styles.totalAmount}>{formatCurrency(total)}</Text>
        </View>

        {/* Filter */}
        <Text style={styles.sectionLabel}>Filter</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipContainer}>
          {FILTER_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.chip, filterPeriod === opt.value && styles.chipActive]}
              onPress={() => setFilterPeriod(opt.value)}
            >
              <Text style={[styles.chipText, filterPeriod === opt.value && styles.chipTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sort */}
        <Text style={styles.sectionLabel}>Sort by</Text>
        <View style={styles.chipRow}>
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.chip, sortBy === opt.value && styles.chipActive]}
              onPress={() => setSortBy(opt.value)}
            >
              <Text style={[styles.chipText, sortBy === opt.value && styles.chipTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* List */}
        <Text style={styles.sectionLabel}>History</Text>
        {loading ? (
          <Text style={styles.mutedText}>Loading…</Text>
        ) : sorted.length === 0 ? (
          <Text style={styles.mutedText}>No entries yet. Tap + to add.</Text>
        ) : (
          sorted.map((entry) => (
            <View key={entry.id} style={styles.entryRow}>
              <View style={styles.entryMain}>
                <Text style={styles.entryOrg}>{entry.organization}</Text>
                <Text style={styles.entryDate}>{formatDate(entry.date)}</Text>
              </View>
              <Text style={styles.entryAmount}>{formatCurrency(entry.amount)}</Text>
            </View>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* + FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => (navigation as any).navigate('AddTzedakah')}
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
  subtitle: { fontFamily: fonts.body.regular, fontSize: 16, color: colors.text.secondary, marginBottom: spacing.lg },
  totalCard: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  totalLabel: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.text.secondary, marginBottom: 4 },
  totalAmount: { fontFamily: fonts.heading.bold, fontSize: 32, color: colors.primary.dark },
  sectionLabel: { fontFamily: fonts.body.semibold, fontSize: 14, color: colors.text.secondary, marginBottom: spacing.sm },
  chipScroll: { marginHorizontal: -spacing.lg, marginBottom: spacing.md },
  chipContainer: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  chipActive: { backgroundColor: colors.primary.main, borderColor: colors.primary.main },
  chipText: { fontFamily: fonts.body.medium, fontSize: 14, color: colors.text.secondary },
  chipTextActive: { color: '#fff' },
  mutedText: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.text.tertiary, marginBottom: spacing.md },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.7)',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  entryMain: { flex: 1 },
  entryOrg: { fontFamily: fonts.body.semibold, fontSize: 16, color: colors.text.primary },
  entryDate: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.text.tertiary, marginTop: 2 },
  entryAmount: { fontFamily: fonts.body.semibold, fontSize: 16, color: colors.primary.dark },
  fab: {
    position: 'absolute',
    bottom: spacing.xl + 24,
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
  fabText: { fontSize: 28, color: '#fff', fontFamily: fonts.body.regular, lineHeight: 32 },
});
