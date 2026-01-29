import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { GlassPanel } from '../../components/ui/GlassPanel';
import { GlassButton } from '../../components/ui/GlassButton';
import { FadeIn } from '../../components/animations/FadeIn';
import { colors, spacing } from '../../src/design/colors';
import { textStyles } from '../../src/design/typography';
import { UserPreferencesService } from '../../src/storage/UserPreferences';
import { NotificationService } from '../../src/notifications/NotificationService';
import {
  UserPreferences,
  NotificationPreferences,
} from '../../src/types/preferences';

export const SettingsScreen: React.FC = () => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    const prefs = await UserPreferencesService.getPreferences();
    setPreferences(prefs);
    setLoading(false);
  };

  const updateNotificationPreference = async (
    key: keyof NotificationPreferences,
    value: boolean
  ) => {
    if (!preferences) return;

    const updated = {
      ...preferences.notifications,
      [key]: value,
    };

    await UserPreferencesService.setNotificationPreferences(updated);
    await NotificationService.reschedule();
    loadPreferences();
  };

  if (loading || !preferences) {
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
        <GlassPanel padding="xl" borderRadius="2xl" style={styles.card}>
          <Text style={[textStyles.h3, styles.sectionTitle]}>
            Gentle Reminders
          </Text>
          <Text style={[textStyles.bodySmall, styles.sectionSubtitle]}>
            Choose what you'd like to be reminded about
          </Text>

          <View style={styles.options}>
            <View style={styles.optionRow}>
              <Text style={[textStyles.body, styles.optionLabel]}>
                Daily Tehillim
              </Text>
              <Switch
                value={preferences.notifications.dailyTehillim}
                onValueChange={(value) =>
                  updateNotificationPreference('dailyTehillim', value)
                }
                trackColor={{
                  false: colors.primary.light,
                  true: colors.primary.main,
                }}
              />
            </View>

            <View style={styles.optionRow}>
              <Text style={[textStyles.body, styles.optionLabel]}>
                Mincha time
              </Text>
              <Switch
                value={preferences.notifications.minchaTime}
                onValueChange={(value) =>
                  updateNotificationPreference('minchaTime', value)
                }
                trackColor={{
                  false: colors.primary.light,
                  true: colors.primary.main,
                }}
              />
            </View>

            <View style={styles.optionRow}>
              <Text style={[textStyles.body, styles.optionLabel]}>
                Hallel / Anenu
              </Text>
              <Switch
                value={preferences.notifications.hallelAnenu}
                onValueChange={(value) =>
                  updateNotificationPreference('hallelAnenu', value)
                }
                trackColor={{
                  false: colors.primary.light,
                  true: colors.primary.main,
                }}
              />
            </View>

            <View style={styles.optionRow}>
              <Text style={[textStyles.body, styles.optionLabel]}>
                Shabbos reminders
              </Text>
              <Switch
                value={preferences.notifications.shabbosReminders}
                onValueChange={(value) =>
                  updateNotificationPreference('shabbosReminders', value)
                }
                trackColor={{
                  false: colors.primary.light,
                  true: colors.primary.main,
                }}
              />
            </View>

            <View style={styles.optionRow}>
              <Text style={[textStyles.body, styles.optionLabel]}>
                Sefiras HaOmer
              </Text>
              <Switch
                value={preferences.notifications.sefirasHaomer}
                onValueChange={(value) =>
                  updateNotificationPreference('sefirasHaomer', value)
                }
                trackColor={{
                  false: colors.primary.light,
                  true: colors.primary.main,
                }}
              />
            </View>
          </View>
        </GlassPanel>
      </FadeIn>

      <FadeIn delay={200}>
        <GlassPanel padding="lg" borderRadius="xl" style={styles.card}>
          <Text style={[textStyles.body, styles.infoText]}>
            Nusach: {preferences.nusach.charAt(0).toUpperCase() + preferences.nusach.slice(1)}
          </Text>
        </GlassPanel>
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
  card: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  options: {
    marginTop: spacing.md,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary.light,
  },
  optionLabel: {
    color: colors.text.primary,
    flex: 1,
  },
  infoText: {
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
