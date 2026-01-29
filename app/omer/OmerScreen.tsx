import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { GlassPanel } from '../../components/ui/GlassPanel';
import { GlassButton } from '../../components/ui/GlassButton';
import { ScalePress } from '../../components/animations/ScalePress';
import { FadeIn } from '../../components/animations/FadeIn';
import { colors, spacing } from '../../src/design/colors';
import { textStyles } from '../../src/design/typography';
import { OmerCalculator } from '../../src/core/omer/OmerCalculator';
import { StorageService } from '../../src/storage/StorageService';

export const OmerScreen: React.FC = () => {
  const [omerDay, setOmerDay] = useState<number | null>(null);
  const [countedDays, setCountedDays] = useState<Set<number>>(new Set());
  const [todayCounted, setTodayCounted] = useState(false);

  useEffect(() => {
    loadOmerData();
  }, []);

  const loadOmerData = async () => {
    const day = OmerCalculator.getOmerDay();
    setOmerDay(day);

    if (day) {
      const counts = await StorageService.getOmerCounts();
      const counted = new Set(
        Object.keys(counts || {})
          .map(Number)
          .filter((d) => counts![d])
      );
      setCountedDays(counted);
      setTodayCounted(counted.has(day));
    }
  };

  const toggleToday = async () => {
    if (!omerDay) return;

    const newCounted = !todayCounted;
    await StorageService.markOmerDay(omerDay, newCounted);
    setTodayCounted(newCounted);

    // Update counted days set
    const updated = new Set(countedDays);
    if (newCounted) {
      updated.add(omerDay);
    } else {
      updated.delete(omerDay);
    }
    setCountedDays(updated);
  };

  if (omerDay === null) {
    return (
      <View style={styles.container}>
        <GlassPanel padding="xl" borderRadius="2xl">
          <Text style={[textStyles.h3, styles.message]}>
            We're not in the Omer period right now
          </Text>
        </GlassPanel>
      </View>
    );
  }

  const week = OmerCalculator.getOmerWeek(omerDay);
  const blessing = OmerCalculator.getOmerBlessing(omerDay);

  // Build weeks for display
  const weeks: number[][] = [];
  for (let w = 1; w <= 7; w++) {
    const weekDays: number[] = [];
    for (let d = (w - 1) * 7 + 1; d <= Math.min(w * 7, 49); d++) {
      weekDays.push(d);
    }
    weeks.push(weekDays);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <FadeIn delay={100}>
        <GlassPanel padding="xl" borderRadius="2xl" style={styles.mainCard}>
          <Text style={[textStyles.h2, styles.title]}>
            Tonight is day {omerDay} of the Omer
          </Text>
          <Text style={[textStyles.bodyLarge, styles.blessing]}>
            {blessing.english}
          </Text>
          <Text style={[textStyles.body, styles.hebrew]}>
            {blessing.hebrew}
          </Text>
        </GlassPanel>
      </FadeIn>

      <FadeIn delay={200}>
        <GlassPanel padding="lg" borderRadius="xl" style={styles.markCard}>
          <Text style={[textStyles.bodyLarge, styles.markTitle]}>
            Did you count today?
          </Text>
          <GlassButton
            title={todayCounted ? 'Counted ✓' : 'Mark as counted'}
            onPress={toggleToday}
            variant={todayCounted ? 'secondary' : 'primary'}
            size="lg"
            style={styles.markButton}
          />
        </GlassPanel>
      </FadeIn>

      <FadeIn delay={300}>
        <Text style={[textStyles.h3, styles.weeksTitle]}>Week {week}</Text>
        <View style={styles.weeksContainer}>
          {weeks.map((weekDays, weekIndex) => (
            <View key={weekIndex} style={styles.week}>
              {weekDays.map((day) => {
                const isCounted = countedDays.has(day);
                const isCurrentWeek = Math.ceil(day / 7) === week;
                const isToday = day === omerDay;

                return (
                  <FadeIn key={day} delay={400 + day * 5}>
                    <ScalePress
                      onPress={async () => {
                        const newCounted = !isCounted;
                        await StorageService.markOmerDay(day, newCounted);
                        loadOmerData();
                      }}
                    >
                      <GlassPanel
                        padding="sm"
                        borderRadius="md"
                        style={[
                          styles.dayDot,
                          isCounted && styles.dayCounted,
                          isCurrentWeek && styles.currentWeek,
                          isToday && styles.today,
                        ]}
                      >
                        <Text
                          style={[
                            textStyles.caption,
                            isCounted && styles.dayTextCounted,
                          ]}
                        >
                          {day}
                        </Text>
                        {isCounted && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
                      </GlassPanel>
                    </ScalePress>
                  </FadeIn>
                );
              })}
            </View>
          ))}
        </View>
      </FadeIn>
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
    marginBottom: spacing.md,
  },
  blessing: {
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  hebrew: {
    color: colors.text.secondary,
    textAlign: 'center',
  },
  markCard: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  markTitle: {
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  markButton: {
    width: '100%',
  },
  weeksTitle: {
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  weeksContainer: {
    marginBottom: spacing.lg,
  },
  week: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
    justifyContent: 'flex-start',
  },
  dayDot: {
    width: 40,
    height: 40,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCounted: {
    backgroundColor: colors.primary.light,
  },
  currentWeek: {
    borderWidth: 2,
    borderColor: colors.primary.main,
  },
  today: {
    borderWidth: 3,
    borderColor: colors.primary.dark,
  },
  dayTextCounted: {
    color: colors.primary.dark,
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 12,
    color: colors.primary.dark,
    position: 'absolute',
    top: 2,
    right: 4,
  },
  message: {
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
