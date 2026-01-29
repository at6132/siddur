import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { GlassPanel } from '../../components/ui/GlassPanel';
import { ScalePress } from '../../components/animations/ScalePress';
import { FadeIn } from '../../components/animations/FadeIn';
import { colors, spacing } from '../../src/design/colors';
import { textStyles } from '../../src/design/typography';
import { CalendarEngine } from '../../src/core/calendar/CalendarEngine';
import { UserPreferencesService } from '../../src/storage/UserPreferences';
import { DayInfo } from '../../src/types/calendar';
import { CalendarContext } from '../../src/types/calendar';
import { HabitTracker } from '../../src/storage/HabitTracker';

interface CalendarDay {
  date: Date;
  dayInfo: DayInfo | null;
  isMarked: boolean;
  isToday: boolean;
}

export const CalendarScreen: React.FC = () => {
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCalendar();
  }, [currentMonth]);

  const loadCalendar = async () => {
    setLoading(true);
    try {
      const preferences = await UserPreferencesService.getPreferences();
      if (!preferences) return;

      const context: CalendarContext = {
        nusach: preferences.nusach,
        location: preferences.location,
      };

      // Get first day of month and number of days
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();

      // Get marked dates
      const markedDates = await HabitTracker.getMarkedDates();

      // Build calendar days
      const calendarDays: CalendarDay[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isMarked = markedDates.has(dateKey);
        const isToday =
          date.toDateString() === new Date().toDateString();

        // Load day info (simplified - in production, batch load)
        let dayInfo: DayInfo | null = null;
        if (isToday || day <= 7) {
          // Load info for today and first week
          try {
            dayInfo = await CalendarEngine.getDayInfo(date, context);
          } catch (error) {
            console.error('Error loading day info:', error);
          }
        }

        calendarDays.push({
          date,
          dayInfo,
          isMarked,
          isToday,
        });
      }

      setDays(calendarDays);
    } catch (error) {
      console.error('Error loading calendar:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMark = async (date: Date) => {
    const isMarked = await HabitTracker.isMarked(date);
    await HabitTracker.mark(date, !isMarked);
    loadCalendar(); // Reload to update UI
  };

  const monthName = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={[textStyles.body, { color: colors.text.secondary }]}>
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <FadeIn delay={100}>
        <Text style={[textStyles.h2, styles.monthTitle]}>{monthName}</Text>
      </FadeIn>

      <View style={styles.calendarGrid}>
        {days.map((day, index) => (
          <FadeIn key={index} delay={100 + index * 10}>
            <ScalePress
              onPress={() => toggleMark(day.date)}
              style={styles.dayContainer}
            >
              <GlassPanel
                padding="md"
                borderRadius="lg"
                style={[
                  styles.dayCard,
                  day.isToday && styles.todayCard,
                  day.isMarked && styles.markedCard,
                ]}
              >
                <Text
                  style={[
                    textStyles.bodySmall,
                    day.isToday && styles.todayText,
                    day.isMarked && styles.markedText,
                  ]}
                >
                  {day.date.getDate()}
                </Text>
                {day.dayInfo?.spiritualCue && (
                  <Text
                    style={[textStyles.caption, styles.cue]}
                    numberOfLines={1}
                  >
                    {day.dayInfo.spiritualCue.text}
                  </Text>
                )}
                {day.isMarked && (
                  <View style={styles.markIndicator}>
                    <Text style={styles.markEmoji}>🤍</Text>
                  </View>
                )}
              </GlassPanel>
            </ScalePress>
          </FadeIn>
        ))}
      </View>
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
  monthTitle: {
    color: colors.text.primary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayContainer: {
    width: '14%',
    marginBottom: spacing.sm,
  },
  dayCard: {
    minHeight: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCard: {
    borderWidth: 2,
    borderColor: colors.primary.main,
  },
  markedCard: {
    backgroundColor: colors.primary.light,
  },
  todayText: {
    color: colors.primary.main,
    fontWeight: '600',
  },
  markedText: {
    color: colors.primary.dark,
  },
  cue: {
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    fontSize: 8,
  },
  markIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  markEmoji: {
    fontSize: 12,
  },
});
