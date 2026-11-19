/**
 * Daily Gratitude – journal entries by date. Add is the single primary action.
 */

import React, { useState, useCallback, useRef } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Swipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Screen, Section, ListRow, GlassButton } from '../../components/ui';
import { PracticeHeader } from '../../components/hub/PracticeKit';
import { IconButton } from '../../components/settings/SettingsKit';
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
  const swipeableRefs = useRef(new Map<string, SwipeableMethods>());

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

  const handleDelete = useCallback(async (id: string) => {
    try {
      await GratitudeTracker.deleteEntry(id);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const [all, streakCount] = await Promise.all([
        GratitudeTracker.getAllEntries(),
        GratitudeTracker.getStreak(),
      ]);
      setEntries(all);
      setStreak(streakCount);
      swipeableRefs.current.delete(id);
    } catch (e) {
      console.warn('Gratitude delete error:', e);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, []);

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

      <Section
        title="Entries"
        titleRight={
          <IconButton
            name="add"
            label="Add gratitude entry"
            tone="primary"
            size={type.fontSize.xl}
            onPress={goAdd}
            style={{ marginVertical: -spacing.sm, marginRight: -spacing.xs }}
          />
        }
        footer={entries.length > 0 ? 'Swipe an entry left to delete it.' : undefined}
      >
        {entries.length === 0 ? (
          <View style={{ paddingVertical: spacing.lg, paddingHorizontal: spacing.md }}>
            <Text style={[type.textStyles.body, { color: theme.colors.text.primary }]}>
              No entries yet
            </Text>
            <Text
              style={[
                type.textStyles.caption,
                { color: theme.colors.text.secondary, marginTop: spacing['2xs'] },
              ]}
            >
              Write one thing you are thankful for today.
            </Text>
          </View>
        ) : (
          entries.map((entry) => (
            <Swipeable
              key={entry.id}
              friction={2}
              rightThreshold={40}
              overshootRight={false}
              onSwipeableWillOpen={() => {
                swipeableRefs.current.forEach((methods, id) => {
                  if (id !== entry.id) methods.close();
                });
              }}
              renderRightActions={(_progress, _translation, methods) => {
                swipeableRefs.current.set(entry.id, methods);
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Delete gratitude entry"
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      methods.close();
                      void handleDelete(entry.id);
                    }}
                    style={{
                      backgroundColor: theme.colors.semantic.error,
                      justifyContent: 'center',
                      alignItems: 'center',
                      minWidth: 88,
                      paddingHorizontal: spacing.md,
                    }}
                  >
                    <Ionicons name="trash-outline" size={type.fontSize.xl} color={theme.colors.text.inverse} />
                    <Text
                      style={[
                        type.textStyles.caption,
                        { color: theme.colors.text.inverse, marginTop: spacing['2xs'] },
                      ]}
                    >
                      Delete
                    </Text>
                  </Pressable>
                );
              }}
            >
              <View
                style={{
                  backgroundColor: theme.colors.background.primary,
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.md,
                }}
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
            </Swipeable>
          ))
        )}
      </Section>
    </Screen>
  );
};
