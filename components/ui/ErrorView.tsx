import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassPanel } from './GlassPanel';
import { GlassButton } from './GlassButton';
import { colors, spacing } from '../../src/design/colors';
import { textStyles } from '../../src/design/typography';
import { FadeIn } from '../animations/FadeIn';

interface ErrorViewProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorView: React.FC<ErrorViewProps> = ({
  message = 'Something went wrong',
  onRetry,
}) => {
  return (
    <FadeIn delay={100}>
      <View style={styles.container}>
        <GlassPanel padding="xl" borderRadius="2xl">
          <Text style={[textStyles.h3, styles.title]}>Oops</Text>
          <Text style={[textStyles.body, styles.message]}>{message}</Text>
          {onRetry && (
            <GlassButton
              title="Try again"
              onPress={onRetry}
              size="md"
              style={styles.button}
            />
          )}
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
  title: {
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  message: {
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  button: {
    marginTop: spacing.md,
  },
});
