/**
 * Daily Gratitude – journal entries by date. Add is the single primary action.
 */

import React, { useState, useCallback } from 'react';
import { View, Text } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Screen, Section, ListRow, GlassButton, EmptyState } from '../../components/ui';
import { PracticeHeader } from '../../components/hub/PracticeKit';
import { useTheme } from '../../src/design/theme';
import { GratitudeTracker, type GratitudeEntry } from '../../src/storage/GratitudeTracker';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export const GratitudeScreen: React.FC = () => {
  const { theme } = useTheme();
  const { spacing, type } = theme.tokens;
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

  const goAdd = () => (navigation as any).navigate('AddGratitude');

  return (
    <Screen
      scroll
      bottomExtra={spacing['3xl'] + spacing.lg}
      state={loading ? 'loading' : 'ready'}
      header={
        <PracticeHeader
          title="Daily gratitude"
          subtitle={streak > 0 ? `${streak} day streak` : 'What are you thankful for?'}
          onBack={() => navigation.goBack()}
          backLabel="Back to Hub"
          action={<GlassButton title="Add" size="sm" onPress={goAdd} />}
        />
      }
    >
      <Section>
        <ListRow
          title="Daily reminder"
          subtitle="Choose when to be prompted"
          showChevron
          onPress={() => (navigation as any).navigate('Settings', { scrollTo: 'dailyGratitude' })}
        />
      </Section>

      {entries.length === 0 ? (
        <EmptyState
          title="No entries yet"
          message="Write one thing you are thankful for today."
          action={<GlassButton title="Add entry" onPress={goAdd} />}
        />
      ) : (
        <Section title="Entries">
          {entries.map((entry) => (
            <View
              key={entry.id}
              style={{ paddingVertical: spacing.md, paddingHorizontal: spacing.md }}
            >
              <Text style={[type.textStyles.caption, { color: theme.colors.text.secondary }]}>
                {formatDate(entry.date)}
              </Text>
              <Text
                style={[
                  type.textStyles.body,
                  { color: theme.colors.text.primary, marginTop: spacing['2xs'] },
                ]}
              >
                {entry.text}
              </Text>
            </View>
          ))}
        </Section>
      )}
    </Screen>
  );
};
