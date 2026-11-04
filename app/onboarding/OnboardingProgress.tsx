import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../src/design/theme';

const DOT_SIZE = 6;
const ACTIVE_WIDTH = 24;

interface OnboardingProgressProps {
  total: number;
  /** Zero-based index of the current step. */
  index: number;
}

/** Quiet step indicator shared by onboarding screens. Presentation only. */
export const OnboardingProgress: React.FC<OnboardingProgressProps> = ({ total, index }) => {
  const { theme } = useTheme();
  const { spacing, radii } = theme.tokens;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${index + 1} of ${total}`}
      style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}
    >
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            height: DOT_SIZE,
            width: i === index ? ACTIVE_WIDTH : DOT_SIZE,
            borderRadius: radii.full,
            backgroundColor: i === index ? theme.colors.primary.main : theme.colors.neutral[300],
          }}
        />
      ))}
    </View>
  );
};
