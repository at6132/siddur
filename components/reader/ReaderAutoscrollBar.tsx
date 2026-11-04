/**
 * Shared reader bottom bar: autoscroll Play/Pause and speed slider.
 * Session-only — does not persist to app settings (parent may init from prefs).
 * Chrome-only glass/blur (not content cards).
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import Slider from '@react-native-community/slider';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/design/theme';
import { colorWithAlpha } from '../../src/design/colorAlpha';

export const AUTOSCROLL_SPEED_MIN = 0.5;
export const AUTOSCROLL_SPEED_MAX = 2;
export const AUTOSCROLL_SPEED_STEP = 0.25;

export interface ReaderAutoscrollBarProps {
  playing: boolean;
  onPlayingChange: (playing: boolean) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  bottomInset?: number;
}

export function ReaderAutoscrollBar({
  playing,
  onPlayingChange,
  speed,
  onSpeedChange,
  bottomInset = 0,
}: ReaderAutoscrollBarProps) {
  const { theme } = useTheme();
  const { spacing, radii, type, glass } = theme.tokens;
  const primary = theme.colors.primary.main;

  const onToggle = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPlayingChange(!playing);
  };

  const content = (
    <View
      style={{
        flexDirection: 'column',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
      }}
    >
      <View style={styles.buttonRow}>
        <Text
          style={[
            type.textStyles.label,
            { color: theme.colors.text.secondary, fontSize: type.fontSize.sm },
          ]}
        >
          Autoscroll
        </Text>
        <Pressable
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityLabel={playing ? 'Pause autoscroll' : 'Play autoscroll'}
          style={{
            minHeight: 44,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.lg,
            borderRadius: radii.lg,
            backgroundColor: colorWithAlpha(primary, 0.22),
            justifyContent: 'center',
          }}
        >
          <Text
            style={[
              type.textStyles.label,
              { color: primary, fontSize: type.fontSize.sm },
            ]}
          >
            {playing ? 'Pause' : 'Play'}
          </Text>
        </Pressable>
      </View>
      <View style={styles.speedRow}>
        <Text
          style={[
            type.textStyles.caption,
            { color: theme.colors.text.secondary, minWidth: spacing.xl },
          ]}
        >
          Speed
        </Text>
        <Slider
          style={{ flex: 1, height: spacing.lg + spacing.sm, minWidth: spacing['2xl'] }}
          minimumValue={AUTOSCROLL_SPEED_MIN}
          maximumValue={AUTOSCROLL_SPEED_MAX}
          step={AUTOSCROLL_SPEED_STEP}
          value={speed}
          onValueChange={onSpeedChange}
          minimumTrackTintColor={primary}
          maximumTrackTintColor={
            theme.isDark
              ? colorWithAlpha(theme.colors.text.inverse, 0.25)
              : colorWithAlpha(theme.colors.text.primary, 0.2)
          }
          thumbTintColor={primary}
        />
        <Text
          style={[
            type.textStyles.label,
            {
              color: theme.colors.text.primary,
              minWidth: spacing.xl,
              textAlign: 'right',
              fontSize: type.fontSize.sm,
            },
          ]}
        >
          {speed}x
        </Text>
      </View>
    </View>
  );

  const chromeStyle = {
    borderRadius: radii.xl,
    overflow: 'hidden' as const,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.isDark
      ? colorWithAlpha(theme.colors.text.inverse, 0.12)
      : colorWithAlpha(theme.colors.text.primary, 0.06),
    backgroundColor: theme.colors.background.glass,
  };

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: Math.max(spacing['3sm'], bottomInset),
      }}
    >
      {Platform.OS !== 'web' ? (
        <BlurView
          intensity={glass.intensity.chrome}
          tint={theme.isDark ? 'dark' : 'light'}
          style={chromeStyle}
        >
          {content}
        </BlurView>
      ) : (
        <View style={chromeStyle}>{content}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  speedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
