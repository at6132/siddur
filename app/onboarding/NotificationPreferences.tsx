import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Animated,
  Dimensions,
  TouchableOpacity,
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

const { width, height } = Dimensions.get('window');

interface NotificationOption {
  key: keyof NotificationPrefsType;
  label: string;
  emoji: string;
}

const NOTIFICATION_OPTIONS: NotificationOption[] = [
  { key: 'dailyTehillim', label: 'Daily Tehillim', emoji: '📖' },
  { key: 'minchaTime', label: 'Mincha Time', emoji: '🕐' },
  { key: 'hallelAnenu', label: 'Hallel / Anenu', emoji: '🎵' },
  { key: 'shabbosReminders', label: 'Shabbos Reminders', emoji: '🕯️' },
  { key: 'sefirasHaomer', label: 'Sefiras HaOmer', emoji: '🌾' },
];

interface NotificationPreferencesProps {
  onComplete: (preferences: NotificationPrefsType) => void;
  onSkip?: () => void;
}

export const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({
  onComplete,
  onSkip,
}) => {
  const [preferences, setPreferences] = useState<NotificationPrefsType>(
    DEFAULT_NOTIFICATION_PREFERENCES
  );
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const togglePreference = (key: keyof NotificationPrefsType) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const enabledCount = Object.values(preferences).filter(Boolean).length;

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#E8F0F5', '#FAF9F7', '#F5E6E8']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Floating Orbs */}
      <View style={[styles.orb, styles.orb1]} />
      <View style={[styles.orb, styles.orb2]} />

      {/* Progress Dots */}
      <View style={styles.progressContainer}>
        <View style={styles.progressDot} />
        <View style={styles.progressDot} />
        <View style={[styles.progressDot, styles.progressDotActive]} />
      </View>

      {/* Main Glass Card */}
      <Animated.View
        style={[
          styles.cardContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <BlurView intensity={100} tint="light" style={styles.glassCard}>
          <View style={styles.glassOverlay}>
            <Text style={styles.emoji}>🔔</Text>
            <Text style={styles.title}>Gentle{'\n'}Reminders</Text>
            <Text style={styles.subtitle}>
              Calm notifications that guide, never guilt
            </Text>

            {/* Options */}
            <View style={styles.optionsContainer}>
              {NOTIFICATION_OPTIONS.map((option) => (
                <BlurView
                  key={option.key}
                  intensity={preferences[option.key] ? 70 : 40}
                  tint="light"
                  style={[
                    styles.optionCard,
                    preferences[option.key] && styles.optionCardActive,
                  ]}
                >
                  <View style={styles.optionInner}>
                    <Text style={styles.optionEmoji}>{option.emoji}</Text>
                    <Text style={styles.optionLabel}>{option.label}</Text>
                    <Switch
                      value={preferences[option.key]}
                      onValueChange={() => togglePreference(option.key)}
                      trackColor={{
                        false: 'rgba(212, 165, 184, 0.3)',
                        true: colors.primary.main,
                      }}
                      thumbColor="#fff"
                      ios_backgroundColor="rgba(212, 165, 184, 0.3)"
                    />
                  </View>
                </BlurView>
              ))}
            </View>

            {/* Enabled Badge */}
            {enabledCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {enabledCount} reminder{enabledCount !== 1 ? 's' : ''} enabled
                </Text>
              </View>
            )}

            {/* Actions */}
            <View style={styles.actions}>
              <GlassButton
                title="Complete Setup"
                onPress={() => onComplete(preferences)}
                variant="primary"
                size="large"
              />
              {onSkip && (
                <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
                  <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </BlurView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orb1: {
    width: 160,
    height: 160,
    backgroundColor: 'rgba(232, 212, 165, 0.35)',
    top: height * 0.1,
    left: -50,
  },
  orb2: {
    width: 140,
    height: 140,
    backgroundColor: 'rgba(212, 165, 184, 0.35)',
    bottom: height * 0.1,
    right: -40,
  },
  progressContainer: {
    position: 'absolute',
    top: height * 0.08,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(212, 165, 184, 0.4)',
  },
  progressDotActive: {
    width: 28,
    backgroundColor: colors.accent.gold,
  },
  cardContainer: {
    width: width - spacing.xl * 2,
    maxWidth: 400,
  },
  glassCard: {
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  glassOverlay: {
    padding: spacing.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 44,
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
    marginBottom: spacing.lg,
  },
  optionsContainer: {
    width: '100%',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  optionCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  optionCardActive: {
    borderColor: 'rgba(212, 165, 184, 0.5)',
  },
  optionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  optionEmoji: {
    fontSize: 22,
    marginRight: spacing.sm,
  },
  optionLabel: {
    ...textStyles.body,
    color: colors.text.primary,
    flex: 1,
  },
  badge: {
    backgroundColor: 'rgba(232, 212, 165, 0.3)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },
  badgeText: {
    ...textStyles.caption,
    color: colors.accent.gold,
    fontWeight: '600',
  },
  actions: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.md,
  },
  skipButton: {
    paddingVertical: spacing.sm,
  },
  skipText: {
    ...textStyles.body,
    color: colors.text.tertiary,
  },
});
