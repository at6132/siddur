import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { OnboardingCard } from '../../components/onboarding/OnboardingCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { ScalePress } from '../../components/animations/ScalePress';
import { colors } from '../../src/design/colors';
import { spacing } from '../../src/design/spacing';
import { textStyles } from '../../src/design/typography';
import {
  SPIRITUAL_GOAL_OPTIONS,
  SpiritualGoal,
} from '../../src/types/preferences';
import { FadeIn } from '../../components/animations/FadeIn';
import { OmerCalculator } from '../../src/core/omer/OmerCalculator';

interface SpiritualGoalsProps {
  onSelect: (goals: SpiritualGoal[]) => void;
  onSkip?: () => void;
}

export const SpiritualGoals: React.FC<SpiritualGoalsProps> = ({
  onSelect,
  onSkip,
}) => {
  const [selected, setSelected] = useState<Set<SpiritualGoal>>(new Set());

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
      // Max 2 selections
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
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <OnboardingCard>
        <View style={styles.content}>
          <FadeIn delay={200}>
            <Text style={[textStyles.h2, styles.title]}>
              What would you like help being consistent with?
            </Text>
            <Text style={[textStyles.bodySmall, styles.subtitle]}>
              Choose up to 2 (recommended)
            </Text>
          </FadeIn>

          <View style={styles.options}>
            {availableGoals.map((option, index) => {
              const isSelected = selected.has(option.value);
              const isDisabled = !isSelected && selected.size >= 2;

              return (
                <FadeIn key={option.value} delay={300 + index * 100}>
                  <ScalePress
                    onPress={() => toggleGoal(option.value)}
                    disabled={isDisabled}
                    style={[
                      styles.optionContainer,
                      isDisabled && styles.optionDisabled,
                    ]}
                  >
                    <View
                      style={[
                        styles.option,
                        isSelected && styles.optionSelected,
                      ]}
                    >
                      <Text
                        style={[
                          textStyles.body,
                          isSelected && styles.optionTextSelected,
                          isDisabled && styles.optionTextDisabled,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </View>
                  </ScalePress>
                </FadeIn>
              );
            })}
          </View>

          <View style={styles.actions}>
            {selected.size > 0 && (
              <FadeIn delay={500}>
                <GlassButton
                  title="Continue"
                  onPress={handleContinue}
                  size="lg"
                />
              </FadeIn>
            )}
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
  optionContainer: {
    marginBottom: spacing.md,
  },
  optionDisabled: {
    opacity: 0.4,
  },
  option: {
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.primary.light,
    backgroundColor: colors.background.glass,
  },
  optionSelected: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.light,
  },
  optionTextSelected: {
    color: colors.primary.dark,
    fontWeight: '600',
  },
  optionTextDisabled: {
    color: colors.text.tertiary,
  },
  actions: {
    width: '100%',
    marginTop: spacing.lg,
  },
  skipButton: {
    marginTop: spacing.md,
  },
});

