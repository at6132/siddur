import React from 'react';
import {
  View,
  Text,
  Pressable,
  Platform,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/design/theme';
import { colorWithAlpha } from '../../src/design/colorAlpha';
import { fonts } from '../../src/design/typography';

export type BrandGlassTint = 'rose' | 'sky' | 'lavender' | 'gold' | 'sage' | 'neutral';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface BrandGlassTileProps {
  title?: string;
  subtitle?: string;
  trailing?: string;
  icon?: IconName;
  tint?: BrandGlassTint;
  /** Compact grid tile (2-col). */
  compact?: boolean;
  /** Stretch to fill parent height (equal Hub practice cards). */
  fill?: boolean;
  muted?: boolean;
  badge?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

function tintFill(
  tint: BrandGlassTint,
  colors: ReturnType<typeof useTheme>['theme']['colors'],
  isDark: boolean,
): string {
  const alpha = isDark ? 0.28 : 0.38;
  switch (tint) {
    case 'rose':
      return colorWithAlpha(colors.primary.light, isDark ? 0.35 : 0.55);
    case 'sky':
      return colorWithAlpha(colors.secondary.light, isDark ? 0.32 : 0.5);
    case 'lavender':
      return colorWithAlpha(colors.accent.lavender, alpha);
    case 'gold':
      return colorWithAlpha(colors.accent.gold, alpha);
    case 'sage':
      return colorWithAlpha(colors.accent.sage, alpha);
    default:
      return colorWithAlpha(
        isDark ? colors.background.tertiary : colors.background.primary,
        isDark ? 0.55 : 0.72,
      );
  }
}

/**
 * Soft liquid-glass tile for Library / Hub — blur behind, token tint, press + haptic.
 * BlurView is never a Text parent (same rule as Home GlassCard).
 */
export const BrandGlassTile: React.FC<BrandGlassTileProps> = ({
  title,
  subtitle,
  trailing,
  icon,
  tint = 'neutral',
  compact = false,
  fill = false,
  muted = false,
  badge,
  onPress,
  style,
  children,
}) => {
  const { theme } = useTheme();
  const { spacing, radii } = theme.tokens;
  const fillColor = tintFill(tint, theme.colors, theme.isDark);
  const iconColor = muted
    ? theme.colors.text.tertiary
    : theme.colors.primary.dark;
  const titleColor = muted ? theme.colors.text.secondary : theme.colors.text.primary;

  const body = (
    <View
      style={[
        compact || fill ? styles.innerCompact : styles.inner,
        fill && styles.innerFill,
        { padding: compact || fill ? spacing.sm + 2 : spacing.md },
      ]}
      collapsable={false}
    >
      {children ? (
        children
      ) : (
        <>
          <View style={styles.topRow}>
            {icon ? (
              <View
                style={[
                  styles.iconWell,
                  {
                    backgroundColor: colorWithAlpha(
                      theme.colors.background.primary,
                      theme.isDark ? 0.18 : 0.45,
                    ),
                    borderRadius: radii.md,
                  },
                ]}
              >
                <Ionicons name={icon} size={compact ? 20 : 22} color={iconColor} />
              </View>
            ) : null}
            {badge ? (
              <Text
                style={[
                  styles.badge,
                  { color: theme.colors.text.tertiary, marginLeft: 'auto' },
                ]}
              >
                {badge}
              </Text>
            ) : null}
            {trailing && !badge ? (
              <Text
                style={[
                  styles.trailing,
                  {
                    color: theme.colors.text.secondary,
                    marginLeft: icon ? spacing.sm : 0,
                    flex: 1,
                    textAlign: 'right',
                  },
                ]}
                numberOfLines={1}
                accessibilityLanguage="he"
              >
                {trailing}
              </Text>
            ) : null}
            {!compact && onPress && !badge ? (
              <Ionicons
                name="chevron-forward"
                size={18}
                color={theme.colors.text.tertiary}
                style={{ marginLeft: spacing.xs }}
              />
            ) : null}
          </View>
          {title ? (
            <Text
              style={[
                compact ? styles.titleCompact : styles.title,
                { color: titleColor, marginTop: icon || trailing ? spacing.sm : 0 },
              ]}
              numberOfLines={compact ? 2 : 1}
            >
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text
              style={[styles.subtitle, { color: theme.colors.text.secondary }]}
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );

  const card = (
    <View
      style={[
        styles.card,
        fill && styles.cardFill,
        {
          borderRadius: radii.xl,
          borderColor: theme.tokens.glass.light,
          shadowColor: theme.colors.shadow.medium,
          opacity: muted ? 0.55 : 1,
          minHeight: fill ? undefined : compact ? 96 : 72,
        },
        style,
      ]}
    >
      {Platform.OS !== 'web' ? (
        <BlurView
          intensity={48}
          tint={theme.isDark ? 'dark' : 'extraLight'}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : null}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: fillColor }]} pointerEvents="none" />
      {body}
    </View>
  );

  if (!onPress) return card;

  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        { opacity: pressed ? 0.88 : 1 },
        (compact || fill) && styles.flex,
        fill && styles.pressableFill,
      ]}
      accessibilityRole="button"
      accessibilityLabel={title || subtitle || 'Open'}
      accessibilityState={muted ? { disabled: false } : undefined}
    >
      {card}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressableFill: { alignSelf: 'stretch', height: '100%' },
  card: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth * 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
    position: 'relative',
  },
  cardFill: {
    flex: 1,
    alignSelf: 'stretch',
  },
  inner: {
    justifyContent: 'center',
  },
  innerCompact: {
    flex: 1,
    justifyContent: 'space-between',
  },
  innerFill: {
    height: '100%',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWell: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.heading.semibold,
    fontSize: 20,
    letterSpacing: 0.2,
  },
  titleCompact: {
    fontFamily: fonts.body.semibold,
    fontSize: 14,
    letterSpacing: 0.15,
  },
  subtitle: {
    fontFamily: fonts.body.regular,
    fontSize: 13,
    marginTop: 4,
    lineHeight: 17,
  },
  trailing: {
    fontFamily: fonts.hebrew.regular,
    fontSize: 15,
  },
  badge: {
    fontFamily: fonts.body.medium,
    fontSize: 11,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
