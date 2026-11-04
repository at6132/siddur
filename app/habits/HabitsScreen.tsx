import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Section, ListRow, GlassButton } from '../../components/ui';
import { PracticeHeader } from '../../components/hub/PracticeKit';
import { useTheme } from '../../src/design/theme';
import { toLocalDateString } from '../../src/utils/dateUtils';
import { HabitTracker } from '../../src/storage/HabitTracker';
import { UserPreferencesService } from '../../src/storage/UserPreferences';
import { SpiritualGoal } from '../../src/types/preferences';

export const HabitsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { spacing, type } = theme.tokens;
  const [goals, setGoals] = useState<SpiritualGoal[]>([]);
  const [markedDates, setMarkedDates] = useState<Set<string>>(new Set());
  const [todayMarked, setTodayMarked] = useState(false);

  useEffect(() => {
    loadHabits();
  }, []);

  const loadHabits = async () => {
    const preferences = await UserPreferencesService.getPreferences();
    if (preferences?.spiritualGoals) {
      setGoals(preferences.spiritualGoals);
    }

    const marked = await HabitTracker.getMarkedDates();
    setMarkedDates(marked);

    const todayMarkedStatus = await HabitTracker.isMarkedToday();
    setTodayMarked(todayMarkedStatus);
  };

  const toggleToday = async () => {
    const newMarked = !todayMarked;
    if (newMarked) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      void Haptics.selectionAsync();
    }
    await HabitTracker.markToday(newMarked);
    setTodayMarked(newMarked);
    loadHabits();
  };

  // Get recent marked dates for display
  const recentDates = Array.from(markedDates)
    .sort()
    .reverse()
    .slice(0, 7);

  // Calculate streak
  const calculateStreak = () => {
    const sortedDates = Array.from(markedDates).sort().reverse();
    let streak = 0;

    for (let i = 0; i < sortedDates.length; i++) {
      const date = sortedDates[i];
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - i);
      const expectedDateStr = toLocalDateString(expectedDate);

      if (date === expectedDateStr) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  const streak = calculateStreak();
  const todayStr = toLocalDateString();

  return (
    <Screen
      scroll
      bottomExtra={spacing.lg}
      contentStyle={{ paddingTop: spacing.md }}
    >
      <PracticeHeader
        title="A moment for your neshama"
        subtitle={
          streak > 0
            ? `${streak} day${streak !== 1 ? 's' : ''} in a row`
            : 'Show up today, even just a little'
        }
      />

      <View style={{ marginBottom: spacing.lg, marginHorizontal: spacing.sm }}>
        <Text style={[type.textStyles.label, { color: theme.colors.text.secondary }]}>Today</Text>
        <Text
          style={[
            type.textStyles.h3,
            { color: theme.colors.text.primary, marginTop: spacing['2xs'], marginBottom: spacing.md },
          ]}
        >
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
        <GlassButton
          title={todayMarked ? 'Marked for today' : 'Mark today'}
          variant={todayMarked ? 'secondary' : 'primary'}
          size="lg"
          onPress={toggleToday}
        />
        <Text
          style={[
            type.textStyles.bodySmall,
            { color: theme.colors.text.secondary, marginTop: spacing.sm },
          ]}
        >
          {todayMarked
            ? 'You showed up today. Tap again to undo.'
            : "Tap when you've taken a moment."}
        </Text>
      </View>

      {goals.length > 0 ? (
        <Section title="Your spiritual goals">
          {goals.map((goal) => (
            <ListRow
              key={goal}
              title={goal.charAt(0).toUpperCase() + goal.slice(1).replace(/_/g, ' ')}
            />
          ))}
        </Section>
      ) : null}

      {recentDates.length > 0 ? (
        <Section title="Recent days">
          {recentDates.map((dateStr) => {
            const date = new Date(dateStr + 'T12:00:00');
            const isToday = dateStr === todayStr;
            return (
              <ListRow
                key={dateStr}
                title={date.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
                subtitle={isToday ? 'Today' : undefined}
                trailing={
                  <Ionicons
                    name="checkmark-circle"
                    size={type.fontSize.xl}
                    color={theme.colors.primary.main}
                  />
                }
              />
            );
          })}
        </Section>
      ) : null}
    </Screen>
  );
};
