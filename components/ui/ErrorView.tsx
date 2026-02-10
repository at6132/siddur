import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassPanel } from './GlassPanel';
import { GlassButton } from './GlassButton';
import { useTheme } from '../../src/design/theme';
import type { AppTheme } from '../../src/design/theme';
import { spacing } from '../../src/design/spacing';
import { textStyles } from '../../src/design/typography';
import { FadeIn } from '../animations/FadeIn';

interface ErrorViewProps {
  message?: string;
  onRetry?: () => void;
}

function createStyles(theme: AppTheme) {
  return {
    container: {
      flex: 1,
      justifyContent: 'center' as const,
      padding: spacing.lg,
    },
    title: {
      color: theme.colors.text.primary,
      textAlign: 'center' as const,
      marginBottom: spacing.md,
    },
    message: {
      color: theme.colors.text.secondary,
      textAlign: 'center' as const,
      marginBottom: spacing.lg,
    },
    button: {
      marginTop: spacing.md,
    },
  };
}

export const ErrorView: React.FC<ErrorViewProps> = ({
  message = 'Something went wrong',
  onRetry,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => {
    try {
      return StyleSheet.create(createStyles(theme));
    } catch (e) {
      console.warn('ErrorView styles error:', e);
      return StyleSheet.create({ container: { flex: 1, justifyContent: 'center', padding: 24 }, title: {}, message: {}, button: {} });
    }
  }, [theme]);
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

