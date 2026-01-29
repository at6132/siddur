import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { GlassPanel } from '../../components/ui/GlassPanel';
import { GlassButton } from '../../components/ui/GlassButton';
import { FadeIn } from '../../components/animations/FadeIn';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorView } from '../../components/ui/ErrorView';
import { colors, spacing } from '../../src/design/colors';
import { textStyles } from '../../src/design/typography';
import { CalendarEngine } from '../../src/core/calendar/CalendarEngine';
import { UserPreferencesService } from '../../src/storage/UserPreferences';
import { DayInfo } from '../../src/types/calendar';
import { CalendarContext } from '../../src/types/calendar';
import { OmerCalculator } from '../../src/core/omer/OmerCalculator';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [dayInfo, setDayInfo] = useState<DayInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDayInfo();
  }, []);

  const loadDayInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const preferences = await UserPreferencesService.getPreferences();
      if (!preferences) {
        setError('Please complete onboarding first');
        return;
      }

      const context: CalendarContext = {
        nusach: preferences.nusach,
        location: preferences.location,
      };

      const info = await CalendarEngine.getTodayInfo(context);
      setDayInfo(info);
    } catch (err) {
      console.error('Error loading day info:', err);
      setError('Failed to load day information');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDayInfo();
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorView message={error} onRetry={loadDayInfo} />;
  }

  if (!dayInfo) {
    return null;
  }

  const minchaTime = dayInfo.zmanim.mincha.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <FadeIn delay={100}>
        <GlassPanel padding="xl" borderRadius="2xl" style={styles.mainCard}>
          <Text style={[textStyles.h3, styles.jewishDate]}>
            {dayInfo.jewishDateShort}
          </Text>
          <Text style={[textStyles.bodySmall, styles.gregorianDate]}>
            {dayInfo.gregorianDate.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </GlassPanel>
      </FadeIn>

      {dayInfo.spiritualCue && (
        <FadeIn delay={200}>
          <GlassPanel padding="lg" borderRadius="xl" style={styles.card}>
            <Text style={[textStyles.bodyLarge, styles.cueText]}>
              {dayInfo.spiritualCue.text}
            </Text>
          </GlassPanel>
        </FadeIn>
      )}

      <FadeIn delay={300}>
        <GlassPanel padding="lg" borderRadius="xl" style={styles.card}>
          <Text style={[textStyles.label, styles.sectionTitle]}>
            Next Mincha
          </Text>
          <Text style={[textStyles.h4, styles.timeText]}>{minchaTime}</Text>
        </GlassPanel>
      </FadeIn>

      {dayInfo.daveningChanges.hallel && (
        <FadeIn delay={400}>
          <GlassPanel padding="lg" borderRadius="xl" style={styles.card}>
            <Text style={[textStyles.body, styles.reminderText]}>
              Hallel today
            </Text>
          </GlassPanel>
        </FadeIn>
      )}

      {dayInfo.daveningChanges.anenu && (
        <FadeIn delay={400}>
          <GlassPanel padding="lg" borderRadius="xl" style={styles.card}>
            <Text style={[textStyles.body, styles.reminderText]}>
              Anenu today (fast day)
            </Text>
          </GlassPanel>
        </FadeIn>
      )}

      {dayInfo.isShabbos && (
        <FadeIn delay={500}>
          <GlassPanel padding="lg" borderRadius="xl" style={styles.card}>
            <Text style={[textStyles.bodyLarge, styles.shabbosText]}>
              Shabbos Shalom ✨
            </Text>
          </GlassPanel>
        </FadeIn>
      )}

      {dayInfo.omerDay && (
        <FadeIn delay={600}>
          <GlassPanel padding="lg" borderRadius="xl" style={styles.card}>
            <Text style={[textStyles.bodyLarge, styles.omerText]}>
              Tonight is day {dayInfo.omerDay} of the Omer
            </Text>
            <GlassButton
              title="Count Omer"
              onPress={() => navigation.navigate('Omer' as never)}
              variant="secondary"
              size="md"
              style={styles.actionButton}
            />
          </GlassPanel>
        </FadeIn>
      )}

      <FadeIn delay={700}>
        <View style={styles.actions}>
          <GlassButton
            title="Habits"
            onPress={() => navigation.navigate('Habits' as never)}
            variant="ghost"
            size="md"
            style={styles.actionButton}
          />
          {OmerCalculator.isOmerPeriod() && (
            <GlassButton
              title="Omer"
              onPress={() => navigation.navigate('Omer' as never)}
              variant="ghost"
              size="md"
              style={styles.actionButton}
            />
          )}
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
    paddingTop: spacing.xl,
  },
  mainCard: {
    marginBottom: spacing.lg,
  },
  card: {
    marginBottom: spacing.md,
  },
  jewishDate: {
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  gregorianDate: {
    color: colors.text.secondary,
    textAlign: 'center',
  },
  cueText: {
    color: colors.text.primary,
    textAlign: 'center',
  },
  sectionTitle: {
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  timeText: {
    color: colors.primary.main,
  },
  reminderText: {
    color: colors.text.primary,
    textAlign: 'center',
  },
  shabbosText: {
    color: colors.primary.main,
    textAlign: 'center',
    fontWeight: '600',
  },
  omerText: {
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  actionButton: {
    marginHorizontal: spacing.sm,
  },
});
