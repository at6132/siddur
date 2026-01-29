import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { GlassButton } from '../../components/ui/GlassButton';
import { ScalePress } from '../../components/animations/ScalePress';
import { colors } from '../../src/design/colors';
import { spacing, borderRadius } from '../../src/design/spacing';
import { textStyles } from '../../src/design/typography';
import {
  SPIRITUAL_GOAL_OPTIONS,
  SpiritualGoal,
} from '../../src/types/preferences';
import { FadeIn } from '../../components/animations/FadeIn';
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
    animateOrb(orb1, 5000);
    animateOrb(orb2, 4500);
  }, []);

  const orb1Y = orb1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  const orb2X = orb2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 15],
  });

  // Auto-suggest Sefiras HaOmer if in Omer period
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

  const handleContinue = () => {
    if (selected.size > 0) {
      onSelect(Array.from(selected));
    }
  };

  return (
    <View style={styles.container}>
      {/* Background */}
      <LinearGradient
        colors={['#FAF9F7', '#E8F0F5', '#F5E6E8']}
        style={StyleSheet.absoluteFill}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
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
          { transform: [{ translateX: orb2X }] },
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
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={styles.progressDot} />
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
                <Text style={styles.emoji}>🌟</Text>
                <Text style={styles.title}>
                  What would you like help with?
                </Text>
                <Text style={styles.subtitle}>
                  Choose up to 2 — we'll send gentle reminders
                </Text>

                <View style={styles.options}>
                  {availableGoals.map((option, index) => {
                    const isSelected = selected.has(option.value);
                    const isDisabled = !isSelected && selected.size >= 2;

                    return (
                      <FadeIn key={option.value} delay={300 + index * 80}>
                        <ScalePress
                          onPress={() => toggleGoal(option.value)}
                          disabled={isDisabled}
                          style={[
                            styles.optionWrapper,
                            isDisabled && styles.optionDisabled,
                          ]}
                        >
                          <View
                            style={[
                              styles.option,
                              isSelected && styles.optionSelected,
                            ]}
                          >
                            <BlurView
                              intensity={40}
                              style={StyleSheet.absoluteFill}
                            />
                            <View style={styles.optionInner}>
                              <View
                                style={[
                                  styles.checkbox,
                                  isSelected && styles.checkboxSelected,
                                ]}
                              >
                                {isSelected && (
                                  <Text style={styles.checkmark}>✓</Text>
                                )}
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
                          </View>
                        </ScalePress>
                      </FadeIn>
                    );
                  })}
                </View>

                {selected.size > 0 && (
                  <View style={styles.selectedBadge}>
                    <Text style={styles.selectedBadgeText}>
                      {selected.size} selected
                    </Text>
                  </View>
                )}

                <View style={styles.actions}>
                  {selected.size > 0 && (
                    <FadeIn delay={100}>
                      <GlassButton
                        title="Continue"
                        onPress={handleContinue}
                        variant="primary"
                        size="large"
                      />
                    </FadeIn>
                  )}
                  {onSkip && (
                    <GlassButton
                      title="Skip for now"
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
    width: 180,
    height: 180,
    backgroundColor: 'rgba(165, 196, 212, 0.3)',
    top: height * 0.1,
    right: -70,
  },
  orb2: {
    width: 150,
    height: 150,
    backgroundColor: 'rgba(212, 196, 232, 0.3)',
    bottom: height * 0.2,
    left: -50,
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
    shadowColor: colors.secondary.main,
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
  optionWrapper: {
    marginBottom: spacing.sm,
  },
  optionDisabled: {
    opacity: 0.4,
  },
  option: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(165, 196, 212, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  optionSelected: {
    borderColor: colors.secondary.main,
    backgroundColor: 'rgba(165, 196, 212, 0.15)',
  },
  optionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    paddingVertical: spacing.lg,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.text.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  checkboxSelected: {
    borderColor: colors.secondary.main,
    backgroundColor: colors.secondary.main,
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  optionEmoji: {
    fontSize: 22,
    marginRight: spacing.sm,
  },
  optionText: {
    ...textStyles.body,
    color: colors.text.primary,
    flex: 1,
  },
  optionTextSelected: {
    color: colors.secondary.dark,
    fontWeight: '600',
  },
  selectedBadge: {
    backgroundColor: 'rgba(165, 196, 212, 0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.lg,
  },
  selectedBadgeText: {
    ...textStyles.caption,
    color: colors.secondary.dark,
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
