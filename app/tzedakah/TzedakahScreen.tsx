/**
 * Tzedakah Tracker – total at top, history list, sort by organization/date/amount, filter by period.
 * Widget shows total past month.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Screen, Section, ListRow, Chip, GlassButton, EmptyState } from '../../components/ui';
import { PracticeHeader, GroupLabel } from '../../components/hub/PracticeKit';
import { useTheme } from '../../src/design/theme';
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
  const { theme } = useTheme();
  const { spacing, type } = theme.tokens;
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
  const periodLabel = FILTER_OPTIONS.find((f) => f.value === filterPeriod)?.label;

  const goAdd = () => (navigation as any).navigate('AddTzedakah');

  return (
    <Screen
      scroll
      state={loading ? 'loading' : 'ready'}
      header={
        <PracticeHeader
          title="Tzedakah"
          subtitle="Track your giving"
          onBack={() => navigation.goBack()}
          action={<GlassButton title="Add" size="sm" onPress={goAdd} />}
        />
      }
    >
      <View style={{ marginBottom: spacing.lg, marginHorizontal: spacing.sm }}>
        <Text style={[type.textStyles.label, { color: theme.colors.text.secondary }]}>
          {`Total, ${periodLabel}`}
        </Text>
        <Text
          style={[
            type.textStyles.h1,
            { color: theme.colors.text.primary, marginTop: spacing['2xs'] },
          ]}
          accessibilityLabel={`Total ${formatCurrency(total)}`}
        >
          {formatCurrency(total)}
        </Text>
      </View>

      <GroupLabel>Period</GroupLabel>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -spacing.gutter, marginBottom: spacing.md }}
        contentContainerStyle={{ paddingHorizontal: spacing.gutter, gap: spacing.sm }}
      >
        {FILTER_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            selected={filterPeriod === opt.value}
            onPress={() => setFilterPeriod(opt.value)}
          />
        ))}
      </ScrollView>

      <GroupLabel>Sort by</GroupLabel>
      <View
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}
      >
        {SORT_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            selected={sortBy === opt.value}
            onPress={() => setSortBy(opt.value)}
          />
        ))}
      </View>

      {sorted.length === 0 ? (
        <EmptyState
          title="No gifts logged"
          message="Log a donation to see it here."
          action={<GlassButton title="Log a gift" onPress={goAdd} />}
        />
      ) : (
        <Section title="History">
          {sorted.map((entry) => (
            <ListRow
              key={entry.id}
              title={entry.organization}
              subtitle={formatDate(entry.date)}
              trailing={
                <Text style={[type.textStyles.bodyBold, { color: theme.colors.text.primary }]}>
                  {formatCurrency(entry.amount)}
                </Text>
              }
            />
          ))}
        </Section>
      )}
    </Screen>
  );
};
