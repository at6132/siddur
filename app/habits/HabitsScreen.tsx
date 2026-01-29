import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { GlassPanel } from '../../components/ui/GlassPanel';
import { ScalePress } from '../../components/animations/ScalePress';
import { FadeIn } from '../../components/animations/FadeIn';
import { colors } from '../../src/design/colors';
import { spacing } from '../../src/design/spacing';
import { textStyles } from '../../src/design/typography';
import { HabitTracker } from '../../src/storage/HabitTracker';
import { UserPreferencesService } from '../../src/storage/UserPreferences';
import { SpiritualGoal } from '../../src/types/preferences';

export const HabitsScreen: React.FC = () => {
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
    await HabitTracker.markToday(newMarked);
    setTodayMarked(newMarked);
    loadHabits(); // Reload to update calendar view
  };

  // Get recent marked dates for display
  const recentDates = Array.from(markedDates)
    .sort()
    .reverse()
    .slice(0, 7);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <FadeIn delay={100}>
        <GlassPanel padding="xl" borderRadius="2xl" style={styles.mainCard}>
          <Text style={[textStyles.h2, styles.title]}>
            A moment for your Neshama
          </Text>
          <Text style={[textStyles.body, styles.subtitle]}>
            Mark today when you've shown up
          </Text>
        </GlassPanel>
      </FadeIn>

      <FadeIn delay={200}>
        <GlassPanel padding="lg" borderRadius="xl" style={styles.markCard}>
          <Text style={[textStyles.bodyLarge, styles.markTitle]}>
            Today
          </Text>
          <ScalePress onPress={toggleToday}>
            <View
              style={[
                styles.markButton,
                todayMarked && styles.markButtonActive,
              ]}
            >
              <Text
                style={[
                  textStyles.bodyLarge,
                  todayMarked && styles.markButtonTextActive,
                ]}
              >
                {todayMarked ? 'Marked ✓' : 'Mark today'}
              </Text>
            </View>
          </ScalePress>
        </GlassPanel>
      </FadeIn>

      {goals.length > 0 && (
        <FadeIn delay={300}>
          <GlassPanel padding="lg" borderRadius="xl" style={styles.goalsCard}>
            <Text style={[textStyles.label, styles.sectionTitle]}>
              Your goals
            </Text>
            {goals.map((goal, index) => (
              <View key={goal} style={styles.goalItem}>
                <Text style={[textStyles.body, styles.goalText]}>
                  {goal.charAt(0).toUpperCase() + goal.slice(1).replace('_', ' ')}
                </Text>
              </View>
            ))}
          </GlassPanel>
        </FadeIn>
      )}

      {recentDates.length > 0 && (
        <FadeIn delay={400}>
          <GlassPanel padding="lg" borderRadius="xl" style={styles.recentCard}>
            <Text style={[textStyles.label, styles.sectionTitle]}>
              Recent
            </Text>
            {recentDates.map((dateStr, index) => (
              <View key={dateStr} style={styles.dateItem}>
                <Text style={[textStyles.bodySmall, styles.dateText]}>
                  {new Date(dateStr).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
                <Text style={styles.checkmark}>✓</Text>
              </View>
            ))}
          </GlassPanel>
        </FadeIn>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  content: {
    padding: spacing.lg,
  },
  mainCard: {
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  title: {
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.text.secondary,
    textAlign: 'center',
  },
  markCard: {
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  markTitle: {
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  markButton: {
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.primary.light,
    backgroundColor: colors.background.glass,
    alignItems: 'center',
    width: '100%',
  },
  markButtonActive: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.light,
  },
  markButtonTextActive: {
    color: colors.primary.dark,
    fontWeight: '600',
  },
  goalsCard: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  goalItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary.light,
  },
  goalText: {
    color: colors.text.primary,
  },
  recentCard: {
    marginBottom: spacing.lg,
  },
  dateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary.light,
  },
  dateText: {
    color: colors.text.primary,
  },
  checkmark: {
    fontSize: 16,
    color: colors.primary.main,
  },
});
