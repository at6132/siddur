import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Screen, Section, ListRow } from '../../components/ui';
import { PracticeHeader } from '../../components/hub/PracticeKit';
import { CheckRow, IconButton, TextAction } from '../../components/settings/SettingsKit';
import { useTheme } from '../../src/design/theme';
import { DailyTehillimTracker } from '../../src/storage/DailyTehillimTracker';
import { TehillimSettings, TehillimGoalType, WEEKLY_TEHILLIM, HEBREW_DAY_NAMES } from '../../src/content/tehillim/types';

export const TehillimSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { spacing, radii, type } = theme.tokens;
  const [settings, setSettings] = useState<TehillimSettings>({
    goalType: 'weekly',
    customChaptersPerDay: 5,
  });
  const [customInput, setCustomInput] = useState('5');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const current = await DailyTehillimTracker.getSettings();
    setSettings(current);
    setCustomInput(String(current.customChaptersPerDay || 5));
    setLoading(false);
  };

  const handleGoalTypeChange = async (goalType: TehillimGoalType) => {
    const newSettings = { ...settings, goalType };
    setSettings(newSettings);
    await DailyTehillimTracker.saveSettings(newSettings);
  };

  const handleCustomChaptersChange = async (value: string) => {
    setCustomInput(value);
    const num = parseInt(value, 10);
    if (!isNaN(num) && num > 0 && num <= 150) {
      const newSettings = { ...settings, customChaptersPerDay: num };
      setSettings(newSettings);
      await DailyTehillimTracker.saveSettings(newSettings);
    }
  };

  const resetWith = async (fn: () => Promise<unknown>) => {
    await fn();
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Calculate weekly division info
  const weeklyInfo = Object.entries(WEEKLY_TEHILLIM).map(([day, chapters]) => ({
    day: HEBREW_DAY_NAMES[parseInt(day, 10)],
    chapters: `${chapters[0]}-${chapters[chapters.length - 1]}`,
    count: chapters.length,
  }));

  const perDay = settings.customChaptersPerDay || 5;

  return (
    <Screen
      scroll
      state={loading ? 'loading' : 'ready'}
      header={
        <PracticeHeader
          title="Daily Tehillim"
          subtitle="Choose your daily goal"
          onBack={() => navigation.goBack()}
        />
      }
    >
      <Section title="Goal">
        <CheckRow
          title="Weekly cycle"
          subtitle="Complete entire Tehillim each week, divided by day. This is the default."
          selected={settings.goalType === 'weekly'}
          onPress={() => handleGoalTypeChange('weekly')}
        />
        <CheckRow
          title="Monthly cycle"
          subtitle="Complete Tehillim each month (30 days)"
          selected={settings.goalType === 'monthly'}
          onPress={() => handleGoalTypeChange('monthly')}
        />
        <CheckRow
          title="Custom daily goal"
          subtitle="Set your own number of chapters per day"
          selected={settings.goalType === 'custom'}
          onPress={() => handleGoalTypeChange('custom')}
        />
        <CheckRow
          title="Whenever you can"
          subtitle="No daily goal. Say Tehillim whenever you have time. Complete any perek in any order."
          selected={settings.goalType === 'whenever'}
          onPress={() => handleGoalTypeChange('whenever')}
        />
      </Section>

      {settings.goalType === 'custom' && (
        <Section
          title="Chapters per day"
          footer={`At ${perDay} chapters per day, you'll complete Tehillim every ${Math.ceil(150 / perDay)} days.`}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.md,
              paddingVertical: spacing.md,
            }}
          >
            <IconButton
              name="remove-circle-outline"
              label="Fewer chapters per day"
              tone="primary"
              size={type.fontSize['3xl']}
              onPress={() => {
                const num = parseInt(customInput, 10);
                if (num > 1) handleCustomChaptersChange(String(num - 1));
              }}
            />
            <TextInput
              accessibilityLabel="Chapters per day"
              style={{
                fontFamily: type.fonts.heading.bold,
                fontSize: type.fontSize['4xl'],
                color: theme.colors.text.primary,
                textAlign: 'center',
                minWidth: spacing['3xl'] + spacing.lg,
                paddingVertical: spacing.xs,
                borderRadius: radii.lg,
                backgroundColor: theme.colors.background.secondary,
              }}
              value={customInput}
              onChangeText={handleCustomChaptersChange}
              keyboardType="number-pad"
              maxLength={3}
              inputAccessoryViewID={Platform.OS === 'ios' ? 'globalDone' : undefined}
            />
            <IconButton
              name="add-circle-outline"
              label="More chapters per day"
              tone="primary"
              size={type.fontSize['3xl']}
              onPress={() => {
                const num = parseInt(customInput, 10);
                if (num < 150) handleCustomChaptersChange(String(num + 1));
              }}
            />
          </View>
          <View style={{ paddingHorizontal: spacing.xs }}>
            <TextAction
              label="Reset progress"
              tone="danger"
              onPress={() => resetWith(() => DailyTehillimTracker.resetCustomProgress())}
            />
          </View>
        </Section>
      )}

      {settings.goalType === 'whenever' && (
        <Section>
          <View style={{ paddingHorizontal: spacing.xs }}>
            <TextAction
              label="Reset progress"
              tone="danger"
              onPress={() => resetWith(() => DailyTehillimTracker.resetWheneverProgress())}
            />
          </View>
        </Section>
      )}

      {settings.goalType === 'weekly' && (
        <Section title="Weekly schedule">
          {weeklyInfo.map((info) => (
            <ListRow
              key={info.day}
              title={info.day}
              trailing={
                <Text style={[type.textStyles.bodySmall, { color: theme.colors.text.secondary }]}>
                  {info.chapters} · {info.count} ch.
                </Text>
              }
            />
          ))}
        </Section>
      )}

      <Text
        style={[
          type.textStyles.caption,
          { color: theme.colors.text.tertiary, marginHorizontal: spacing.sm, marginBottom: spacing.lg },
        ]}
      >
        The traditional practice is to complete Tehillim each week, with different portions assigned to each day.
        This allows you to say the entire Tehillim regularly as part of your daily routine.
      </Text>
    </Screen>
  );
};
