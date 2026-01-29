import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
  SPIRITUAL_GOAL_OPTIONS,
  SpiritualGoal,
} from '../../src/types/preferences';
import { OmerCalculator } from '../../src/core/omer/OmerCalculator';

const { width, height } = Dimensions.get('window');

const GOAL_EMOJIS: Record<SpiritualGoal, string> = {
  daily_tehillim: '📖',
  mincha: '🕯️',
  neshama: '✨',
  sefiras_haomer: '🌾',
  brachos: '🙏',
};

interface SpiritualGoalsProps {
  onSelect: (goals: SpiritualGoal[]) => void;
  onSkip?: () => void;
}

export const SpiritualGoals: React.FC<SpiritualGoalsProps> = ({
  onSelect,
  onSkip,
}) => {
  const [selected, setSelected] = useState<Set<SpiritualGoal>>(new Set());
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

  const isOmerPeriod = OmerCalculator.isOmerPeriod();
  const availableGoals = isOmerPeriod
    ? SPIRITUAL_GOAL_OPTIONS
    : SPIRITUAL_GOAL_OPTIONS.filter((g) => g.value !== 'sefiras_haomer');

  const toggleGoal = (goal: SpiritualGoal) => {
    const newSelected = new Set(selected);
    if (newSelected.has(goal)) {
      newSelected.delete(goal);
    } else if (newSelected.size < 2) {
      newSelected.add(goal);
    }
    setSelected(newSelected);
  };

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#FAF9F7', '#E8F0F5', '#F5E6E8']}
        style={StyleSheet.absoluteFill}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Floating Orbs */}
      <View style={[styles.orb, styles.orb1]} />
      <View style={[styles.orb, styles.orb2]} />

      {/* Progress Dots */}
      <View style={styles.progressContainer}>
        <View style={styles.progressDot} />
        <View style={[styles.progressDot, styles.progressDotActive]} />
        <View style={styles.progressDot} />
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
            <Text style={styles.emoji}>🌟</Text>
            <Text style={styles.title}>What would you{'\n'}like help with?</Text>
            <Text style={styles.subtitle}>
              Choose up to 2 — we'll send gentle reminders
            </Text>

            {/* Options */}
            <View style={styles.optionsContainer}>
              {availableGoals.map((option) => {
                const isSelected = selected.has(option.value);
                const isDisabled = !isSelected && selected.size >= 2;

                return (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => toggleGoal(option.value)}
                    disabled={isDisabled}
                    activeOpacity={0.7}
                    style={isDisabled && styles.optionDisabled}
                  >
                    <BlurView
                      intensity={isSelected ? 80 : 40}
                      tint="light"
                      style={[
                        styles.optionCard,
                        isSelected && styles.optionCardSelected,
                      ]}
                    >
                      <View style={styles.optionInner}>
                        <View
                          style={[
                            styles.checkbox,
                            isSelected && styles.checkboxSelected,
                          ]}
                        >
                          {isSelected && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <Text style={styles.optionEmoji}>
                          {GOAL_EMOJIS[option.value]}
                        </Text>
                        <Text
                          style={[
                            styles.optionText,
                            isSelected && styles.optionTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </View>
                    </BlurView>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Selected Badge */}
            {selected.size > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{selected.size} selected</Text>
              </View>
            )}

            {/* Actions */}
            <View style={styles.actions}>
              {selected.size > 0 && (
                <GlassButton
                  title="Continue"
                  onPress={() => onSelect(Array.from(selected))}
                  variant="primary"
                  size="large"
                />
              )}
              {onSkip && (
                <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
                  <Text style={styles.skipText}>Skip for now</Text>
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
    width: 180,
    height: 180,
    backgroundColor: 'rgba(165, 196, 212, 0.35)',
    top: height * 0.1,
    right: -60,
  },
  orb2: {
    width: 150,
    height: 150,
    backgroundColor: 'rgba(212, 196, 232, 0.35)',
    bottom: height * 0.12,
    left: -50,
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
    backgroundColor: colors.secondary.main,
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
  optionDisabled: {
    opacity: 0.4,
  },
  optionCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  optionCardSelected: {
    borderColor: colors.secondary.main,
    borderWidth: 2,
  },
  optionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.text.tertiary,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: colors.secondary.main,
    backgroundColor: colors.secondary.main,
  },
  checkmark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  optionEmoji: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  optionText: {
    ...textStyles.body,
    color: colors.text.primary,
    flex: 1,
  },
  optionTextSelected: {
    ...textStyles.bodyBold,
    color: colors.secondary.dark,
  },
  badge: {
    backgroundColor: 'rgba(165, 196, 212, 0.3)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },
  badgeText: {
    ...textStyles.caption,
    color: colors.secondary.dark,
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
