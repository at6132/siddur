import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../../src/design/theme';
import { spacing } from '../../src/design/spacing';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'large', color }) => {
  const { theme } = useTheme();
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={color ?? theme.colors.primary.main} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
});
