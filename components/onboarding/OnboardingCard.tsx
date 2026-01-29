import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { GlassPanel } from '../ui/GlassPanel';
import { FadeIn } from '../animations/FadeIn';
import { spacing } from '../../src/design/spacing';

interface OnboardingCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const OnboardingCard: React.FC<OnboardingCardProps> = ({
  children,
  style,
}) => {
  return (
    <FadeIn delay={100} duration={400}>
      <View style={[styles.container, style]}>
        <GlassPanel padding="xl" borderRadius="2xl">
          {children}
        </GlassPanel>
      </View>
    </FadeIn>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
});

