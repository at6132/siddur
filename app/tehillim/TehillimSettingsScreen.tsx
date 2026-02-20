import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { colors } from '../../src/design/colors';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { useTheme } from '../../src/design/theme';
import { BackButton } from '../../components/ui/BackButton';
import { DailyTehillimTracker } from '../../src/storage/DailyTehillimTracker';
import { TehillimSettings, TehillimGoalType, WEEKLY_TEHILLIM, HEBREW_DAY_NAMES } from '../../src/content/tehillim/types';

// Glass Option Component
const GlassOption: React.FC<{
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}> = ({ title, subtitle, selected, onPress }) => {
  const content = (
    <View style={[styles.optionCard, selected && styles.optionCardSelected]}>
      {Platform.OS !== 'web' ? (
        <BlurView intensity={40} style={styles.optionBlur}>
          <View style={[styles.optionInner, selected && styles.optionInnerSelected]}>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>
                {title}
              </Text>
              <Text style={styles.optionSubtitle}>{subtitle}</Text>
            </View>
            <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
              {selected && <View style={styles.radioInner} />}
            </View>
          </View>
        </BlurView>
      ) : (
        <LinearGradient
          colors={selected 
            ? ['rgba(212, 165, 184, 0.3)', 'rgba(212, 165, 184, 0.2)']
            : ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
          style={styles.optionBlur}
        >
          <View style={[styles.optionInner, selected && styles.optionInnerSelected]}>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>
                {title}
              </Text>
              <Text style={styles.optionSubtitle}>{subtitle}</Text>
            </View>
            <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
              {selected && <View style={styles.radioInner} />}
            </View>
          </View>
        </LinearGradient>
      )}
    </View>
  );

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      {content}
    </TouchableOpacity>
  );
};

export const TehillimSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
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

  // Calculate weekly division info
  const weeklyInfo = Object.entries(WEEKLY_TEHILLIM).map(([day, chapters]) => ({
    day: HEBREW_DAY_NAMES[parseInt(day, 10)],
    chapters: `${chapters[0]}-${chapters[chapters.length - 1]}`,
    count: chapters.length,
  }));

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FAF9F7', '#F5E6E8', '#E8F0F5', '#FAF9F7']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <BackButton onPress={() => navigation.goBack()} style={styles.backButton} />
          <Text style={styles.title}>Daily Tehillim</Text>
          <Text style={styles.subtitle}>Choose your daily reading goal</Text>
        </View>

        {/* Goal Options */}
        <View style={styles.section}>
          <GlassOption
            title="Weekly Cycle (Default)"
            subtitle="Complete entire Tehillim each week, divided by day"
            selected={settings.goalType === 'weekly'}
            onPress={() => handleGoalTypeChange('weekly')}
          />

          <GlassOption
            title="Monthly Cycle"
            subtitle="Complete Tehillim each month (30 days)"
            selected={settings.goalType === 'monthly'}
            onPress={() => handleGoalTypeChange('monthly')}
          />

          <GlassOption
            title="Custom Daily Goal"
            subtitle="Set your own number of chapters per day"
            selected={settings.goalType === 'custom'}
            onPress={() => handleGoalTypeChange('custom')}
          />

          <GlassOption
            title="Whenever you can"
            subtitle="No daily goal. Say Tehillim whenever you have time. Complete any perek in any order; progress = % of all 150."
            selected={settings.goalType === 'whenever'}
            onPress={() => handleGoalTypeChange('whenever')}
          />
        </View>

        {/* Custom Input */}
        {settings.goalType === 'custom' && (
          <View style={styles.customSection}>
            <Text style={styles.customLabel}>Chapters per day:</Text>
            <View style={styles.customInputRow}>
              <TouchableOpacity
                style={styles.stepButton}
                onPress={() => {
                  const num = parseInt(customInput, 10);
                  if (num > 1) handleCustomChaptersChange(String(num - 1));
                }}
              >
                <Text style={styles.stepButtonText}>−</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.customInput}
                value={customInput}
                onChangeText={handleCustomChaptersChange}
                keyboardType="number-pad"
                maxLength={3}
              />
              <TouchableOpacity
                style={styles.stepButton}
                onPress={() => {
                  const num = parseInt(customInput, 10);
                  if (num < 150) handleCustomChaptersChange(String(num + 1));
                }}
              >
                <Text style={styles.stepButtonText}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.customNote}>
              At {settings.customChaptersPerDay || 5} chapters/day, you'll complete Tehillim every {Math.ceil(150 / (settings.customChaptersPerDay || 5))} days
            </Text>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={async () => {
                await DailyTehillimTracker.resetCustomProgress();
              }}
            >
              <Text style={styles.resetButtonText}>Reset progress</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Whenever you can – reset progress */}
        {settings.goalType === 'whenever' && (
          <View style={styles.wheneverResetSection}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={async () => {
                await DailyTehillimTracker.resetWheneverProgress();
              }}
            >
              <Text style={styles.resetButtonText}>Reset progress</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Weekly Schedule Preview */}
        {settings.goalType === 'weekly' && (
          <View style={styles.scheduleSection}>
            <Text style={styles.scheduleTitle}>Weekly Schedule</Text>
            <View style={styles.scheduleCard}>
              {weeklyInfo.map((info, index) => (
                <View key={index} style={styles.scheduleRow}>
                  <Text style={styles.scheduleDay}>{info.day}</Text>
                  <Text style={styles.scheduleChapters}>{info.chapters}</Text>
                  <Text style={styles.scheduleCount}>{info.count} ch.</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            The traditional practice is to complete Tehillim each week, with different portions 
            assigned to each day. This allows you to say the entire Tehillim regularly as 
            part of your daily routine.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingTop: spacing['2xl'] + spacing.safeTopInset,
    paddingBottom: 140,
  },

  // Header - Enhanced spacing
  header: {
    marginBottom: spacing['2xl'],
  },
  backButton: {
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
  },
  backText: {
    fontFamily: fonts.body.medium,
    fontSize: 16,
  },
  title: {
    fontFamily: fonts.heading.bold,
    fontSize: 32,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fonts.body.regular,
    fontSize: 16,
    color: colors.text.secondary,
  },

  // Section
  section: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },

  // Option Card - Enhanced glass effect
  optionCard: {
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    shadowColor: colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  optionCardSelected: {
    borderColor: colors.primary.main,
    shadowColor: colors.primary.main,
    shadowOpacity: 0.15,
  },
  optionBlur: {
    overflow: 'hidden',
  },
  optionInner: {
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  optionInnerSelected: {
    backgroundColor: 'rgba(212, 165, 184, 0.15)',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 17,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    letterSpacing: -0.2,
  },
  optionTitleSelected: {
    color: colors.primary.dark,
    fontFamily: fonts.heading.bold,
  },
  optionSubtitle: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.text.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.primary.main,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary.main,
  },

  // Custom Section - Enhanced glass
  customSection: {
    backgroundColor: colors.glass.light,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    padding: spacing.xl,
    marginBottom: spacing.xl,
    alignItems: 'center',
    shadowColor: colors.shadow.light,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  customLabel: {
    fontFamily: fonts.body.semiBold,
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonText: {
    fontFamily: fonts.body.bold,
    fontSize: 24,
    color: colors.primary.dark,
  },
  customInput: {
    fontFamily: fonts.heading.bold,
    fontSize: 32,
    color: colors.text.primary,
    textAlign: 'center',
    minWidth: 80,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: borderRadius.lg,
  },
  customNote: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  resetButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignSelf: 'center',
  },
  resetButtonText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 14,
    color: colors.primary.main,
  },
  wheneverResetSection: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },

  // Schedule Section
  scheduleSection: {
    marginBottom: spacing.xl,
  },
  scheduleTitle: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  scheduleCard: {
    backgroundColor: colors.glass.light,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    padding: spacing.lg,
    shadowColor: colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  scheduleDay: {
    flex: 1,
    fontFamily: fonts.body.semiBold,
    fontSize: 14,
    color: colors.text.primary,
  },
  scheduleChapters: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: colors.text.secondary,
    marginRight: spacing.md,
  },
  scheduleCount: {
    fontFamily: fonts.body.medium,
    fontSize: 12,
    color: colors.text.tertiary,
    width: 50,
    textAlign: 'right',
  },

  // Info Section
  infoSection: {
    backgroundColor: 'rgba(165, 196, 212, 0.15)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  infoText: {
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 20,
  },
});
