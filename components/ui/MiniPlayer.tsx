import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import {
  GlassView,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/design/theme';

export interface MiniPlayerProps {
  /** Now-reading title (Latin or transliteration). */
  title: string;
  /** Optional Hebrew title — uses dedicated Hebrew typeface. */
  titleHebrew?: string;
  /** 0–1 progress through the reading session. */
  progress?: number;
  playing?: boolean;
  onPlayPause?: () => void;
  onPress?: () => void;
  /** Hide entirely (collapse API). */
  visible?: boolean;
  /** Extra offset above home indicator / tab bar. */
  bottomOffset?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Floating reader-session chrome (not an audio player).
 * Liquid Glass when available; otherwise expo-blur. Never style content as cards.
 */
export function MiniPlayer({
  title,
  titleHebrew,
  progress = 0,
  playing = false,
  onPlayPause,
  onPress,
  visible = true,
  bottomOffset = 0,
  style,
}: MiniPlayerProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { spacing, radii, type, hebrew, glass } = theme.tokens;

  if (!visible) return null;

  const clamped = Math.max(0, Math.min(1, progress));
  const useGlass =
    Platform.OS !== 'web' &&
    typeof isLiquidGlassAvailable === 'function' &&
    isLiquidGlassAvailable();

  const handlePlayPause = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPlayPause?.();
  };

  const body = (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={[
        styles.inner,
        {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          gap: spacing.sm,
        },
      ]}
    >
      <View style={styles.textBlock}>
        {titleHebrew ? (
          <Text
            style={[
              hebrew.textStyles.caption,
              {
                color: theme.colors.text.primary,
                fontSize: type.fontSize.base,
                lineHeight: type.fontSize.base * type.lineHeight.relaxed,
              },
            ]}
            numberOfLines={1}
          >
            {titleHebrew}
          </Text>
        ) : null}
        <Text
          style={[type.textStyles.label, { color: theme.colors.text.secondary }]}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>

      <View
        style={[
          styles.track,
          {
            height: spacing['2xs'] + spacing['2xs'],
            maxWidth: spacing['4xl'],
            borderRadius: radii.full,
            backgroundColor: theme.colors.neutral[300],
          },
        ]}
      >
        <View
          style={{
            width: `${clamped * 100}%` as `${number}%`,
            height: '100%',
            borderRadius: radii.full,
            backgroundColor: theme.colors.primary.main,
          }}
        />
      </View>

      {onPlayPause ? (
        <Pressable
          onPress={handlePlayPause}
          hitSlop={spacing.sm}
          accessibilityRole="button"
          accessibilityLabel={playing ? 'Pause autoscroll' : 'Play autoscroll'}
          style={[
            styles.playBtn,
            {
              minWidth: 44,
              minHeight: 44,
              paddingHorizontal: spacing['3sm'],
              borderRadius: radii.full,
              backgroundColor: theme.colors.primary.main,
            },
          ]}
        >
          <Text
            style={[
              type.textStyles.label,
              { color: theme.colors.text.inverse, fontSize: type.fontSize.sm },
            ]}
          >
            {playing ? 'Pause' : 'Play'}
          </Text>
        </Pressable>
      ) : null}
    </Pressable>
  );

  const wrapperStyle: StyleProp<ViewStyle> = [
    styles.wrapper,
    {
      left: spacing.md,
      right: spacing.md,
      bottom: Math.max(insets.bottom, spacing.sm) + bottomOffset,
      borderRadius: radii.xl,
      overflow: 'hidden',
    },
    style,
  ];

  if (useGlass) {
    return (
      <View style={wrapperStyle} pointerEvents="box-none">
        <GlassView style={styles.chrome} glassEffectStyle="clear">
          {body}
        </GlassView>
      </View>
    );
  }

  if (Platform.OS !== 'web') {
    return (
      <View style={wrapperStyle} pointerEvents="box-none">
        <BlurView
          intensity={glass.intensity.chrome}
          tint={theme.isDark ? 'dark' : 'light'}
          style={[styles.chrome, { backgroundColor: theme.colors.background.glass }]}
        >
          {body}
        </BlurView>
      </View>
    );
  }

  return (
    <View
      style={[wrapperStyle, { backgroundColor: theme.colors.background.glass }]}
      pointerEvents="box-none"
    >
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    zIndex: 50,
  },
  chrome: {
    width: '100%',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  track: {
    flex: 1,
    overflow: 'hidden',
  },
  playBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});