import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Screen, Section, ListRow, GlassButton } from '../../components/ui';
import { useTheme } from '../../src/design/theme';
import {
  NotificationPreferences as NotificationPrefsType,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from '../../src/types/preferences';
import { OnboardingProgress } from './OnboardingProgress';

type BooleanPrefKey = {
  [K in keyof NotificationPrefsType]: NotificationPrefsType[K] extends boolean ? K : never;
}[keyof NotificationPrefsType];

interface NotificationOption {
  key: BooleanPrefKey;
  label: string;
}

const NOTIFICATION_OPTIONS: NotificationOption[] = [
  { key: 'dailyTehillim', label: 'Daily Tehillim' },
  { key: 'minchaTime', label: 'Mincha Time' },
  { key: 'hallelAnenu', label: 'Hallel / Anenu' },
  { key: 'shabbosReminders', label: 'Shabbos Reminders' },
  { key: 'sefirasHaomer', label: 'Sefiras HaOmer' },
];

interface NotificationPreferencesProps {
  onComplete: (preferences: NotificationPrefsType) => void;
  onSkip?: () => void;
}

export const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({
  onComplete,
  onSkip,
}) => {
  const { theme } = useTheme();
  const { spacing, type } = theme.tokens;
  const [preferences, setPreferences] = useState<NotificationPrefsType>(
    DEFAULT_NOTIFICATION_PREFERENCES
  );

  const togglePreference = (key: BooleanPrefKey) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const enabledCount = Object.values(preferences).filter(Boolean).length;

  return (
    <Screen scroll>
      <View style={styles.flex}>
        <OnboardingProgress total={3} index={2} />
        <Text style={[type.textStyles.h2, { color: theme.colors.text.primary }]}>Reminders</Text>
        <Text
          style={[
            type.textStyles.body,
            { color: theme.colors.text.secondary, marginTop: spacing.sm, marginBottom: spacing.lg },
          ]}
        >
          Pick what you want. You can change this anytime in Settings.
        </Text>

        <Section
          footer={
            enabledCount > 0
              ? `${enabledCount} reminder${enabledCount !== 1 ? 's' : ''} enabled`
              : undefined
          }
        >
          {NOTIFICATION_OPTIONS.map((option) => (
            <ListRow
              key={option.key}
              title={option.label}
              onPress={() => togglePreference(option.key)}
              trailing={
                <Switch
                  value={Boolean(preferences[option.key])}
                  onValueChange={() => {
                    void Haptics.selectionAsync();
                    togglePreference(option.key);
                  }}
                  trackColor={{
                    false: theme.colors.neutral[300],
                    true: theme.colors.primary.main,
                  }}
                  thumbColor={theme.colors.background.primary}
                  ios_backgroundColor={theme.colors.neutral[300]}
                  accessibilityLabel={option.label}
                />
              }
            />
          ))}
        </Section>

        <View style={styles.flex} />

        <View style={{ gap: spacing.sm, paddingTop: spacing.lg }}>
          <GlassButton title="Complete Setup" size="lg" onPress={() => onComplete(preferences)} />
          {onSkip ? <GlassButton title="Skip" variant="ghost" onPress={onSkip} /> : null}
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
