import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassPanel } from '../../components/ui/GlassPanel';
import { GlassButton } from '../../components/ui/GlassButton';
import { FadeIn } from '../../components/animations/FadeIn';
import { colors } from '../../src/design/colors';
import { spacing, borderRadius } from '../../src/design/spacing';
import { textStyles, fonts } from '../../src/design/typography';
import { UserPreferencesService } from '../../src/storage/UserPreferences';
import { NotificationService } from '../../src/notifications/NotificationService';
import { TehillimService } from '../../src/content/tehillim/TehillimService';
import { SefariaService } from '../../src/services/SefariaService';
import {
  UserPreferences,
  NotificationPreferences,
} from '../../src/types/preferences';

export const SettingsScreen: React.FC = () => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingContent, setDownloadingContent] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

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

  const handleDownloadContent = async () => {
    setDownloadingContent(true);
    setDownloadProgress(0);
    
    try {
      await TehillimService.prefetchAll((current, total) => {
        setDownloadProgress(Math.round((current / total) * 100));
      });
    } catch (e) {
      console.error('Error downloading content:', e);
    } finally {
      setDownloadingContent(false);
    }
  };

  const handleClearCache = async () => {
    await SefariaService.clearCache();
    // Show feedback - could add toast/alert here
  };

  const handleSefariaLink = () => {
    Linking.openURL('https://www.sefaria.org');
  };

  if (loading || !preferences) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#FAF9F7', '#F5E6E8', '#E8F0F5']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FAF9F7', '#F5E6E8', '#E8F0F5']}
        style={StyleSheet.absoluteFill}
      />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Nusach */}
        <FadeIn delay={0}>
          <GlassPanel padding="lg" borderRadius="xl" style={styles.card}>
            <Text style={styles.sectionTitle}>Your Nusach</Text>
            <View style={styles.nusachContainer}>
              <TouchableOpacity
                style={[
                  styles.nusachOption,
                  preferences.nusach === 'ashkenaz' && styles.nusachOptionActive,
                ]}
                onPress={() => UserPreferencesService.setNusach('ashkenaz').then(loadPreferences)}
              >
                <Text style={[
                  styles.nusachText,
                  preferences.nusach === 'ashkenaz' && styles.nusachTextActive,
                ]}>
                  Ashkenaz
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.nusachOption,
                  preferences.nusach === 'sfard' && styles.nusachOptionActive,
                ]}
                onPress={() => UserPreferencesService.setNusach('sfard').then(loadPreferences)}
              >
                <Text style={[
                  styles.nusachText,
                  preferences.nusach === 'sfard' && styles.nusachTextActive,
                ]}>
                  Sfard
                </Text>
              </TouchableOpacity>
            </View>
          </GlassPanel>
        </FadeIn>

        {/* Notifications */}
        <FadeIn delay={50}>
          <GlassPanel padding="lg" borderRadius="xl" style={styles.card}>
            <Text style={styles.sectionTitle}>Gentle Reminders</Text>
            <Text style={styles.sectionSubtitle}>
              Choose what you'd like to be reminded about
            </Text>

            <View style={styles.options}>
              <View style={styles.optionRow}>
                <Text style={styles.optionLabel}>Daily Tehillim</Text>
                <Switch
                  value={preferences.notifications.dailyTehillim}
                  onValueChange={(value) =>
                    updateNotificationPreference('dailyTehillim', value)
                  }
                  trackColor={{
                    false: colors.neutral[300],
                    true: colors.primary.light,
                  }}
                  thumbColor={preferences.notifications.dailyTehillim ? colors.primary.main : colors.neutral[400]}
                />
              </View>

              <View style={styles.optionRow}>
                <Text style={styles.optionLabel}>Mincha time</Text>
                <Switch
                  value={preferences.notifications.minchaTime}
                  onValueChange={(value) =>
                    updateNotificationPreference('minchaTime', value)
                  }
                  trackColor={{
                    false: colors.neutral[300],
                    true: colors.primary.light,
                  }}
                  thumbColor={preferences.notifications.minchaTime ? colors.primary.main : colors.neutral[400]}
                />
              </View>

              <View style={styles.optionRow}>
                <Text style={styles.optionLabel}>Hallel / Anenu</Text>
                <Switch
                  value={preferences.notifications.hallelAnenu}
                  onValueChange={(value) =>
                    updateNotificationPreference('hallelAnenu', value)
                  }
                  trackColor={{
                    false: colors.neutral[300],
                    true: colors.primary.light,
                  }}
                  thumbColor={preferences.notifications.hallelAnenu ? colors.primary.main : colors.neutral[400]}
                />
              </View>

              <View style={styles.optionRow}>
                <Text style={styles.optionLabel}>Shabbos reminders</Text>
                <Switch
                  value={preferences.notifications.shabbosReminders}
                  onValueChange={(value) =>
                    updateNotificationPreference('shabbosReminders', value)
                  }
                  trackColor={{
                    false: colors.neutral[300],
                    true: colors.primary.light,
                  }}
                  thumbColor={preferences.notifications.shabbosReminders ? colors.primary.main : colors.neutral[400]}
                />
              </View>

              <View style={[styles.optionRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.optionLabel}>Sefiras HaOmer</Text>
                <Switch
                  value={preferences.notifications.sefirasHaomer}
                  onValueChange={(value) =>
                    updateNotificationPreference('sefirasHaomer', value)
                  }
                  trackColor={{
                    false: colors.neutral[300],
                    true: colors.primary.light,
                  }}
                  thumbColor={preferences.notifications.sefirasHaomer ? colors.primary.main : colors.neutral[400]}
                />
              </View>
            </View>
          </GlassPanel>
        </FadeIn>

        {/* Content Download */}
        <FadeIn delay={100}>
          <GlassPanel padding="lg" borderRadius="xl" style={styles.card}>
            <Text style={styles.sectionTitle}>Offline Content</Text>
            <Text style={styles.sectionSubtitle}>
              Download all Tehillim for offline reading
            </Text>
            
            {downloadingContent ? (
              <View style={styles.downloadProgress}>
                <ActivityIndicator size="small" color={colors.primary.main} />
                <Text style={styles.progressText}>
                  Downloading... {downloadProgress}%
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.downloadButton}
                onPress={handleDownloadContent}
              >
                <Text style={styles.downloadButtonText}>
                  Download All Content
                </Text>
              </TouchableOpacity>
            )}
          </GlassPanel>
        </FadeIn>

        {/* Attribution */}
        <FadeIn delay={150}>
          <View style={styles.attributionSection}>
            <Text style={styles.attributionTitle}>About Our Texts</Text>
            <Text style={styles.attributionText}>
              Prayer texts and Tehillim are provided by{' '}
              <Text style={styles.attributionLink} onPress={handleSefariaLink}>
                Sefaria.org
              </Text>
              {' '}under Creative Commons license.
            </Text>
            <Text style={styles.versionText}>
              24/7 • Version 1.0.0
            </Text>
          </View>
        </FadeIn>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 18,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  nusachContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  nusachOption: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    alignItems: 'center',
  },
  nusachOptionActive: {
    backgroundColor: colors.primary.main,
  },
  nusachText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 16,
    color: colors.text.secondary,
  },
  nusachTextActive: {
    color: '#fff',
  },
  options: {
    marginTop: spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  optionLabel: {
    ...textStyles.body,
    color: colors.text.primary,
    flex: 1,
  },
  downloadProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  progressText: {
    ...textStyles.body,
    color: colors.text.secondary,
  },
  downloadButton: {
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  downloadButtonText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 16,
    color: '#fff',
  },
  attributionSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  attributionTitle: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  attributionText: {
    ...textStyles.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  attributionLink: {
    color: colors.primary.main,
    textDecorationLine: 'underline',
  },
  versionText: {
    ...textStyles.caption,
    color: colors.text.tertiary,
    marginTop: spacing.lg,
  },
});
