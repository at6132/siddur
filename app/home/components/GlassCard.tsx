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
  const glassGradient = theme.isDark
    ? (['rgba(45,42,60,0.72)', 'rgba(35,32,50,0.62)'] as const)
    : (['rgba(255,255,255,0.92)', 'rgba(255,255,255,0.78)'] as const);

  // Opaque enough that greys read as greys (not pastel mush over the gradient)
  const fillColor = theme.isDark ? 'rgba(45,42,60,0.55)' : 'rgba(255,255,255,0.72)';

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
          borderColor: theme.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.85)',
          shadowColor: theme.colors.shadow?.medium || 'rgba(0,0,0,0.1)',
        },
        compact && styles.glassCardCompact,
        style,
      ]}
    >
      {Platform.OS !== 'web' && (
        <BlurView
          intensity={55}
          tint={theme.isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
      )}
      {Platform.OS === 'web' ? (
        <LinearGradient
          colors={glassGradient as unknown as string[]}
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
    borderWidth: 1.5,
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
    paddingVertical: 8,
    paddingHorizontal: 10,
    justifyContent: 'center',
    minHeight: 0,
  },
});
