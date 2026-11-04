import React from 'react';
import { View, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { borderRadius, spacing } from '../../../src/design/spacing';
import { colorWithAlpha } from '../../../src/design/colorAlpha';
import { useTheme } from '../../../src/design/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: any;
  onPress?: () => void;
  /** Half-width home tiles: less padding and fill slot height without clipping. */
  compact?: boolean;
}

/**
 * Home glass card.
 * Content View is always a normal View that owns the Text tree.
 * On native, BlurView is only a background layer (not a Text parent).
 */
export const GlassCard: React.FC<GlassCardProps> = ({ children, style, onPress, compact }) => {
  const { theme } = useTheme();
  const { glass } = theme.tokens;
  // Surface tint derived from the background palette (white in light, deep plum in dark).
  const surface = theme.isDark ? theme.colors.background.tertiary : theme.colors.background.primary;
  const glassGradient = [
    colorWithAlpha(surface, theme.isDark ? 0.72 : 0.92),
    colorWithAlpha(surface, theme.isDark ? 0.62 : 0.78),
  ] as const;

  // Opaque enough that greys read as greys (not pastel mush over the gradient)
  const fillColor = colorWithAlpha(surface, theme.isDark ? 0.55 : 0.72);

  const contentBody = (
    <View
      style={[
        compact ? styles.glassInnerCompact : styles.glassInner,
        { backgroundColor: fillColor },
      ]}
      // Keep child layout measuring correctly under absolute parents
      collapsable={false}
    >
      {children}
    </View>
  );

  const content = (
    <View
      style={[
        styles.glassCard,
        {
          borderColor: glass.light,
          shadowColor: theme.colors.shadow.medium,
        },
        compact && styles.glassCardCompact,
        style,
      ]}
    >
      {Platform.OS !== 'web' && (
        <BlurView
          intensity={55}
          tint={theme.isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      )}
      {Platform.OS === 'web' ? (
        <LinearGradient
          colors={[...glassGradient]}
          style={compact ? styles.flexFill : styles.webBackdrop}
        >
          {contentBody}
        </LinearGradient>
      ) : (
        contentBody
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={compact ? styles.touchableCompact : undefined}
      >
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
    borderWidth: StyleSheet.hairlineWidth * 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
    minHeight: 88,
    position: 'relative',
  },
  glassCardCompact: {
    minHeight: 0,
    flex: 1,
    alignSelf: 'stretch',
  },
  touchableCompact: {
    flex: 1,
    alignSelf: 'stretch',
    minHeight: 0,
  },
  flexFill: {
    flex: 1,
  },
  webBackdrop: {
    overflow: 'hidden',
  },
  glassInner: {
    padding: spacing.md,
  },
  /** Compact fills the card without absolute positioning (absolute was zeroing height on web). */
  glassInnerCompact: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
    minHeight: 0,
  },
});
