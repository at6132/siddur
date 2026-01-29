import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../src/design/colors';
import { borderRadius, shadows, spacing } from '../../src/design/spacing';

interface GlassPanelProps {
  children: React.ReactNode;
  intensity?: number;
  style?: ViewStyle;
  variant?: 'light' | 'medium' | 'dark';
  padding?: keyof typeof spacing;
  borderRadius?: keyof typeof borderRadiusValues;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  intensity = 30,
  style,
  variant = 'light',
  padding = 'lg',
  borderRadius: borderRadiusProp = 'xl',
}) => {
  const glassColor = colors.glass[variant];

  return (
    <View style={[styles.container, shadows.md, style]}>
      <BlurView intensity={intensity} style={styles.blur}>
        <LinearGradient
          colors={[glassColor, colors.glass.blur]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.gradient,
            {
              borderRadius: borderRadius[borderRadiusProp],
              padding: spacing[padding],
            },
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
    flex: 1,
  },
});

