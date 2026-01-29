import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { OnboardingCard } from '../../components/onboarding/OnboardingCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { colors, spacing } from '../../src/design/colors';
import { textStyles } from '../../src/design/typography';
import { FadeIn } from '../../components/animations/FadeIn';

interface WelcomeScreenProps {
  onStart: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  return (
    <View style={styles.container}>
      <OnboardingCard>
        <View style={styles.content}>
          <FadeIn delay={200} duration={500}>
            <Text style={[textStyles.h2, styles.title]}>
              We'll take care of the timing — you just show up
            </Text>
          </FadeIn>

          <FadeIn delay={400} duration={500}>
            <Text style={[textStyles.bodyLarge, styles.subtitle]}>
              Your gentle spiritual companion is ready
            </Text>
          </FadeIn>

          <FadeIn delay={600} duration={500}>
            <View style={styles.emoji}>
              <Text style={styles.emojiText}>🤍</Text>
            </View>
          </FadeIn>

          <FadeIn delay={800} duration={500}>
            <GlassButton title="Start" onPress={onStart} size="lg" />
          </FadeIn>
        </View>
      </OnboardingCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    color: colors.text.primary,
    marginBottom: spacing.lg,
    textAlign: 'center',
    lineHeight: 36,
  },
  subtitle: {
    color: colors.text.secondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  emoji: {
    marginVertical: spacing.xl,
  },
  emojiText: {
    fontSize: 64,
  },
});
