import React, { type ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../src/design/theme';

export interface EmptyStateProps {
  title: string;
  message?: string;
  action?: ReactNode;
}

/** Centered empty state for data screens (Screen.state="empty" or standalone). */
export function EmptyState({ title, message, action }: EmptyStateProps) {
  const { theme } = useTheme();
  const { spacing, type } = theme.tokens;

  return (
    <View style={[styles.root, { padding: spacing.xl }]}>
      <Text
        style={[
          type.textStyles.h3,
          { color: theme.colors.text.primary, textAlign: 'center', marginBottom: spacing.sm },
        ]}
      >
        {title}
      </Text>
      {message ? (
        <Text
          style={[
            type.textStyles.body,
            {
              color: theme.colors.text.secondary,
              textAlign: 'center',
              marginBottom: spacing.lg,
            },
          ]}
        >
          {message}
        </Text>
      ) : null}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
