/**
 * Shared reader bottom bar: autoscroll Play/Pause and speed slider.
 * Session-only — does not persist to app settings (parent may init from prefs).
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Slider from '@react-native-community/slider';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../src/design/theme';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { colors } from '../../src/design/colors';
import type { AppTheme } from '../../src/design/theme';

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
  const styles = createStyles(theme);
  const primary = theme.colors.primary?.main ?? colors.primary.main;

  const content = (
    <View style={styles.inner}>
      <View style={styles.buttonRow}>
        <Text style={styles.label}>Autoscroll</Text>
        <TouchableOpacity
          onPress={() => onPlayingChange(!playing)}
          style={styles.playButton}
          activeOpacity={0.8}
        >
          <Text style={styles.playButtonText}>
            {playing ? '⏸ Pause' : '▶ Play'}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.speedRow}>
        <Text style={styles.speedLabel}>Speed</Text>
        <Slider
          style={styles.slider}
          minimumValue={AUTOSCROLL_SPEED_MIN}
          maximumValue={AUTOSCROLL_SPEED_MAX}
          step={AUTOSCROLL_SPEED_STEP}
          value={speed}
          onValueChange={(v) => onSpeedChange(v)}
          minimumTrackTintColor={primary}
          maximumTrackTintColor={theme.isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)'}
          thumbTintColor={primary}
        />
        <Text style={styles.speedValue}>{speed}×</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(12, bottomInset) }]}>
      {Platform.OS !== 'web' ? (
        <BlurView intensity={70} tint={theme.isDark ? 'dark' : 'light'} style={styles.blur}>
          {content}
        </BlurView>
      ) : (
        <LinearGradient
          colors={
            theme.isDark
              ? ['rgba(28,26,38,0.92)', 'rgba(24,22,34,0.88)']
              : ['rgba(255,255,255,0.92)', 'rgba(248,248,252,0.88)']
          }
          style={styles.blur}
        >
          {content}
        </LinearGradient>
      )}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    wrapper: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
    },
    blur: {
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
    },
    inner: {
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    label: {
      fontFamily: fonts.body.semiBold,
      fontSize: 14,
      color: theme.colors.text.secondary,
    },
    buttonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    playButton: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.lg,
      backgroundColor: theme.colors.primary?.main
        ? `${theme.colors.primary.main}22`
        : 'rgba(212, 165, 184, 0.35)',
    },
    playButtonText: {
      fontFamily: fonts.body.semiBold,
      fontSize: 15,
      color: theme.colors.primary?.main ?? theme.colors.text.primary,
    },
    speedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    speedLabel: {
      fontFamily: fonts.body.medium,
      fontSize: 13,
      color: theme.colors.text.secondary,
      minWidth: 40,
    },
    slider: {
      flex: 1,
      height: 28,
      minWidth: 80,
    },
    speedValue: {
      fontFamily: fonts.body.semiBold,
      fontSize: 14,
      color: theme.colors.text.primary,
      minWidth: 28,
      textAlign: 'right',
    },
  });
}
