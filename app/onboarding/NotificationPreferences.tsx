import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { GlassButton } from '../../components/ui/GlassButton';
import { colors } from '../../src/design/colors';
import { spacing, borderRadius } from '../../src/design/spacing';
import { textStyles } from '../../src/design/typography';
import {
  NotificationPreferences as NotificationPrefsType,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from '../../src/types/preferences';
import { FadeIn } from '../../components/animations/FadeIn';

const { width, height } = Dimensions.get('window');

interface NotificationOption {
  key: keyof NotificationPrefsType;
  label: string;
  emoji: string;
  description: string;
}

const NOTIFICATION_OPTIONS: NotificationOption[] = [
  {
    key: 'dailyTehillim',
    label: 'Daily Tehillim',
    emoji: '📖',
    description: 'Morning reminder for Tehillim',
  },
  {
    key: 'minchaTime',
    label: 'Mincha Time',
    emoji: '🕐',
    description: 'Reminder before Mincha',
  },
  {
    key: 'hallelAnenu',
    label: 'Hallel / Anenu',
    emoji: '🎵',
    description: 'Special davening additions',
  },
  {
    key: 'shabbosReminders',
    label: 'Shabbos Reminders',
    emoji: '🕯️',
    description: 'Candle lighting & more',
  },
  {
    key: 'sefirasHaomer',
    label: 'Sefiras HaOmer',
    emoji: '🌾',
    description: 'Nightly Omer counting',
  },
];

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
  const orb1 = useRef(new Animated.Value(0)).current;
  const orb2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateOrb = (orb: Animated.Value, duration: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(orb, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(orb, {
            toValue: 0,
            duration,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };
    animateOrb(orb1, 4500);
    animateOrb(orb2, 5500);
  }, []);

  const orb1Y = orb1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -18],
  });

  const orb2Y = orb2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 22],
  });

  const togglePreference = (key: keyof NotificationPrefsType) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const enabledCount = Object.values(preferences).filter(Boolean).length;

  return (
    <View style={styles.container}>
      {/* Background */}
      <LinearGradient
        colors={['#E8F0F5', '#FAF9F7', '#F5E6E8']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Floating Orbs */}
      <Animated.View
        style={[
          styles.orb,
          styles.orb1,
          { transform: [{ translateY: orb1Y }] },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          styles.orb2,
          { transform: [{ translateY: orb2Y }] },
        ]}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Indicator */}
        <FadeIn delay={100}>
          <View style={styles.progress}>
            <View style={styles.progressDot} />
            <View style={styles.progressDot} />
            <View style={[styles.progressDot, styles.progressDotActive]} />
          </View>
        </FadeIn>

        {/* Main Card */}
        <FadeIn delay={200}>
          <View style={styles.mainCard}>
            <BlurView intensity={80} style={styles.cardBlur}>
              <LinearGradient
                colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.8)']}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.cardContent}>
                <Text style={styles.emoji}>🔔</Text>
                <Text style={styles.title}>Gentle Reminders</Text>
                <Text style={styles.subtitle}>
                  We'll send calm, supportive notifications — never guilt
                </Text>

                <View style={styles.options}>
                  {NOTIFICATION_OPTIONS.map((option, index) => (
                    <FadeIn key={option.key} delay={300 + index * 70}>
                      <View style={styles.optionRow}>
                        <BlurView
                          intensity={30}
                          style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.optionContent}>
                          <Text style={styles.optionEmoji}>{option.emoji}</Text>
                          <View style={styles.optionTextContainer}>
                            <Text style={styles.optionLabel}>
                              {option.label}
                            </Text>
                            <Text style={styles.optionDescription}>
                              {option.description}
                            </Text>
                          </View>
                          <Switch
                            value={preferences[option.key]}
                            onValueChange={() => togglePreference(option.key)}
                            trackColor={{
                              false: 'rgba(212, 165, 184, 0.3)',
                              true: colors.primary.main,
                            }}
                            thumbColor={
                              preferences[option.key]
                                ? '#fff'
                                : 'rgba(255,255,255,0.9)'
                            }
                            ios_backgroundColor="rgba(212, 165, 184, 0.3)"
                          />
                        </View>
                      </View>
                    </FadeIn>
                  ))}
                </View>

                {enabledCount > 0 && (
                  <View style={styles.enabledBadge}>
                    <Text style={styles.enabledBadgeText}>
                      {enabledCount} reminder{enabledCount !== 1 ? 's' : ''}{' '}
                      enabled
                    </Text>
                  </View>
                )}

                <View style={styles.actions}>
                  <FadeIn delay={600}>
                    <GlassButton
                      title="Complete Setup"
                      onPress={() => onComplete(preferences)}
                      variant="primary"
                      size="large"
                    />
                  </FadeIn>
                  {onSkip && (
                    <GlassButton
                      title="Skip notifications"
                      onPress={onSkip}
                      variant="ghost"
                      size="md"
                      style={styles.skipButton}
                    />
                  )}
                </View>
              </View>
            </BlurView>
          </View>
        </FadeIn>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingTop: spacing['3xl'],
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orb1: {
    width: 160,
    height: 160,
    backgroundColor: 'rgba(232, 212, 165, 0.3)',
    top: height * 0.12,
    left: -50,
  },
  orb2: {
    width: 140,
    height: 140,
    backgroundColor: 'rgba(212, 165, 184, 0.25)',
    bottom: height * 0.18,
    right: -40,
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(212, 165, 184, 0.3)',
  },
  progressDotActive: {
    backgroundColor: colors.primary.main,
    width: 24,
  },
  mainCard: {
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: colors.accent.gold,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 12,
  },
  cardBlur: {
    overflow: 'hidden',
  },
  cardContent: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  title: {
    ...textStyles.h2,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...textStyles.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  options: {
    width: '100%',
    marginBottom: spacing.md,
  },
  optionRow: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  optionEmoji: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    ...textStyles.bodyBold,
    color: colors.text.primary,
  },
  optionDescription: {
    ...textStyles.caption,
    color: colors.text.secondary,
  },
  enabledBadge: {
    backgroundColor: 'rgba(232, 212, 165, 0.3)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.lg,
  },
  enabledBadgeText: {
    ...textStyles.caption,
    color: colors.accent.gold,
    fontWeight: '600',
  },
  actions: {
    width: '100%',
    marginTop: spacing.md,
  },
  skipButton: {
    marginTop: spacing.md,
  },
});
