import React from 'react';
import { View, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { borderRadius } from '../../../src/design/spacing';
import { spacing } from '../../../src/design/spacing';
import { useTheme } from '../../../src/design/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: any;
  onPress?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, style, onPress }) => {
  const { theme } = useTheme();
  const glassGradient = theme.isDark
    ? (['rgba(45,42,60,0.65)', 'rgba(35,32,50,0.55)'] as const)
    : (['rgba(255,255,255,0.85)', 'rgba(255,255,255,0.65)'] as const);

  const content = (
    <View style={[styles.glassCard, { borderColor: theme.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.8)', shadowColor: theme.colors.shadow?.medium || 'rgba(0,0,0,0.1)' }, style]}>
      {Platform.OS !== 'web' ? (
        <BlurView intensity={80} tint={theme.isDark ? 'dark' : 'light'} style={styles.glassBlur}>
          <View style={[styles.glassInner, { backgroundColor: theme.isDark ? 'rgba(45,42,60,0.3)' : 'rgba(255,255,255,0.5)' }]}>{children}</View>
        </BlurView>
      ) : (
        <LinearGradient
          colors={glassGradient as unknown as string[]}
          style={styles.glassBlur}
        >
          <View style={[styles.glassInner, { backgroundColor: theme.isDark ? 'rgba(45,42,60,0.3)' : 'rgba(255,255,255,0.5)' }]}>{children}</View>
        </LinearGradient>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
};

const styles = StyleSheet.create({
  glassCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
    minHeight: 88,
  },
  glassBlur: {
    overflow: 'hidden',
  },
  glassInner: {
    padding: spacing.md,
  },
});
