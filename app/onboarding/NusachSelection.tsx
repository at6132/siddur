import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { OnboardingCard } from '../../components/onboarding/OnboardingCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { ScalePress } from '../../components/animations/ScalePress';
import { colors, spacing } from '../../src/design/colors';
import { textStyles } from '../../src/design/typography';
import { NUSACH_OPTIONS, Nusach } from '../../src/types/nusach';
import { FadeIn } from '../../components/animations/FadeIn';

interface NusachSelectionProps {
  onSelect: (nusach: Nusach) => void;
  onSkip?: () => void;
}

export const NusachSelection: React.FC<NusachSelectionProps> = ({
  onSelect,
  onSkip,
}) => {
  const [selected, setSelected] = useState<Nusach | null>(null);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <OnboardingCard>
        <View style={styles.content}>
          <FadeIn delay={200}>
            <Text style={[textStyles.h2, styles.title]}>
              Which nusach do you daven?
            </Text>
          </FadeIn>

          <View style={styles.options}>
            {NUSACH_OPTIONS.map((option, index) => (
              <FadeIn key={option.value} delay={300 + index * 100}>
                <ScalePress
                  onPress={() => setSelected(option.value)}
                  style={styles.optionContainer}
                >
                  <View
                    style={[
                      styles.option,
                      selected === option.value && styles.optionSelected,
                    ]}
                  >
                    <Text
                      style={[
                        textStyles.bodyLarge,
                        selected === option.value && styles.optionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </View>
                </ScalePress>
              </FadeIn>
            ))}
          </View>

          <View style={styles.actions}>
            {selected && (
              <FadeIn delay={500}>
                <GlassButton
                  title="Continue"
                  onPress={() => onSelect(selected)}
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
  actions: {
    width: '100%',
    marginTop: spacing.lg,
  },
  skipButton: {
    marginTop: spacing.md,
  },
});

