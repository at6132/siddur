import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../src/design/colors';
import { borderRadius as borderRadiusValues, shadows, spacing } from '../../src/design/spacing';

interface GlassCardProps {
  children: React.ReactNode;
  intensity?: number;
  style?: ViewStyle;
  variant?: 'light' | 'medium' | 'dark';
  shadow?: keyof typeof shadows;
  borderRadius?: keyof typeof borderRadiusValues;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  intensity = 20,
  style,
  variant = 'light',
  shadow = 'md',
  borderRadius: borderRadiusProp = 'lg',
}) => {
  const glassColor = colors.glass[variant];

  return (
    <View style={[styles.container, shadows[shadow], style]}>
      <BlurView intensity={intensity} style={styles.blur}>
        <LinearGradient
          colors={[glassColor, colors.glass.blur]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.gradient,
            { borderRadius: borderRadiusValues[borderRadiusProp] },
          ]}
        >
          {children}
        </LinearGradient>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  blur: {
    flex: 1,
  },
  gradient: {
    padding: spacing.lg,
  },
});

