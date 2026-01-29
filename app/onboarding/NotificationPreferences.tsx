import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { OnboardingCard } from '../../components/onboarding/OnboardingCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { colors } from '../../src/design/colors';
import { spacing } from '../../src/design/spacing';
import { textStyles } from '../../src/design/typography';
import {
  NotificationPreferences as NotificationPrefsType,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from '../../src/types/preferences';
import { FadeIn } from '../../components/animations/FadeIn';
import { Switch } from 'react-native';

interface NotificationPreferencesProps {
  onComplete: (preferences: NotificationPrefsType) => void;
  onSkip?: () => void;
}

export const NotificationPreferences: React.FC<
  NotificationPreferencesProps
> = ({ onComplete, onSkip }) => {
  const [preferences, setPreferences] = useState<NotificationPrefsType>(
    DEFAULT_NOTIFICATION_PREFERENCES
  );

  const togglePreference = (key: keyof NotificationPrefsType) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <OnboardingCard>
        <View style={styles.content}>
          <FadeIn delay={200}>
            <Text style={[textStyles.h2, styles.title]}>
              What should we gently remind you about?
            </Text>
            <Text style={[textStyles.bodySmall, styles.subtitle]}>
              Gentle reminders to help you stay consistent
            </Text>
          </FadeIn>

          <View style={styles.options}>
            <FadeIn delay={300}>
              <View style={styles.optionRow}>
                <Text style={[textStyles.body, styles.optionLabel]}>
                  Daily Tehillim
                </Text>
                <Switch
                  value={preferences.dailyTehillim}
                  onValueChange={() => togglePreference('dailyTehillim')}
                  trackColor={{
                    false: colors.primary.light,
                    true: colors.primary.main,
                  }}
                />
              </View>
            </FadeIn>

            <FadeIn delay={350}>
              <View style={styles.optionRow}>
                <Text style={[textStyles.body, styles.optionLabel]}>
                  Mincha time
                </Text>
                <Switch
                  value={preferences.minchaTime}
                  onValueChange={() => togglePreference('minchaTime')}
                  trackColor={{
                    false: colors.primary.light,
                    true: colors.primary.main,
                  }}
                />
              </View>
            </FadeIn>

            <FadeIn delay={400}>
              <View style={styles.optionRow}>
                <Text style={[textStyles.body, styles.optionLabel]}>
                  Hallel / Anenu
                </Text>
                <Switch
                  value={preferences.hallelAnenu}
                  onValueChange={() => togglePreference('hallelAnenu')}
                  trackColor={{
                    false: colors.primary.light,
                    true: colors.primary.main,
                  }}
                />
              </View>
            </FadeIn>

            <FadeIn delay={450}>
              <View style={styles.optionRow}>
                <Text style={[textStyles.body, styles.optionLabel]}>
                  Shabbos reminders
                </Text>
                <Switch
                  value={preferences.shabbosReminders}
                  onValueChange={() => togglePreference('shabbosReminders')}
                  trackColor={{
                    false: colors.primary.light,
                    true: colors.primary.main,
                  }}
                />
              </View>
            </FadeIn>

            <FadeIn delay={500}>
              <View style={styles.optionRow}>
                <Text style={[textStyles.body, styles.optionLabel]}>
                  Sefiras HaOmer
                </Text>
                <Switch
                  value={preferences.sefirasHaomer}
                  onValueChange={() => togglePreference('sefirasHaomer')}
                  trackColor={{
                    false: colors.primary.light,
                    true: colors.primary.main,
                  }}
                />
              </View>
            </FadeIn>
          </View>

          <View style={styles.actions}>
            <FadeIn delay={600}>
              <GlassButton
                title="Continue"
                onPress={() => onComplete(preferences)}
                size="lg"
              />
            </FadeIn>
            {onSkip && (
              <GlassButton
                title="Skip"
                onPress={onSkip}
                variant="ghost"
                size="md"
                style={styles.skipButton}
              />
            )}
          </View>
        </View>
      </OnboardingCard>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.text.secondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  options: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.background.glass,
  },
  optionLabel: {
    color: colors.text.primary,
    flex: 1,
  },
  actions: {
    width: '100%',
    marginTop: spacing.lg,
  },
  skipButton: {
    marginTop: spacing.md,
  },
});
