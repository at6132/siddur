import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import {
  GlassView,
  isLiquidGlassAvailable,
  isGlassEffectAPIAvailable,
} from 'expo-glass-effect';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/design/theme';
import type { AppTheme } from '../../src/design/theme';
import { fonts } from '../../src/design/typography';
import { colorWithAlpha } from '../../src/design/colorAlpha';

/**
 * Settings segmented control — same Liquid Glass chrome pattern as LiquidGlassTabBar.
 * Content lives inside GlassView / BlurView; selection is a sliding translucent pill.
 */

const SPRING = { damping: 26, stiffness: 320, mass: 0.85 };

const BAR_HEIGHT = 44;
const PILL_RADIUS = BAR_HEIGHT / 2;
const SEGMENTS_PADDING_H = 4;
const SELECTION_INSET_V = 4;
const SELECTION_INSET_H = 3;
const LABEL_PAD_H = 14;
const FALLBACK_LABEL_WIDTH = 92;

function canUseNativeLiquidGlass(): boolean {
  if (Platform.OS !== 'ios') return false;
  try {
    if (!isLiquidGlassAvailable()) return false;
    if (typeof isGlassEffectAPIAvailable === 'function' && !isGlassEffectAPIAvailable()) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function selectionLeft(index: number, segmentWidth: number) {
  'worklet';
  return SEGMENTS_PADDING_H + index * segmentWidth + SELECTION_INSET_H;
}

export interface LiquidGlassSegmentedControlProps {
  tabs: { key: string; label: string }[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
}

export const LiquidGlassSegmentedControl: React.FC<LiquidGlassSegmentedControlProps> = ({
  tabs,
  activeIndex,
  onIndexChange,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const useNativeLiquidGlass = useMemo(() => canUseNativeLiquidGlass(), []);

  const tabCount = tabs.length;
  const measuredWidths = useRef<number[]>(Array(tabCount).fill(0));
  const [maxLabelWidth, setMaxLabelWidth] = useState(0);

  const labelWidth = maxLabelWidth || FALLBACK_LABEL_WIDTH;
  const segmentWidth = labelWidth + LABEL_PAD_H * 2;
  const barWidth = SEGMENTS_PADDING_H * 2 + segmentWidth * tabCount;
  const selectionWidth = Math.max(0, segmentWidth - SELECTION_INSET_H * 2);
  const selectionHeight = BAR_HEIGHT - SELECTION_INSET_V * 2;
  const selectionRadius = selectionHeight / 2;

  const selectionX = useSharedValue(selectionLeft(activeIndex, segmentWidth));

  useEffect(() => {
    selectionX.value = withSpring(selectionLeft(activeIndex, segmentWidth), SPRING);
  }, [activeIndex, segmentWidth, selectionX]);

  const selectionStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: selectionX.value }],
  }));

  const onLabelMeasure = useCallback(
    (index: number, width: number) => {
      const next = Math.ceil(width);
      if (measuredWidths.current[index] === next) return;
      measuredWidths.current[index] = next;
      if (measuredWidths.current.length !== tabCount) {
        measuredWidths.current = Array(tabCount).fill(0);
        measuredWidths.current[index] = next;
      }
      if (measuredWidths.current.every((w) => w > 0)) {
        const max = Math.max(...measuredWidths.current);
        setMaxLabelWidth((prev) => (prev === max ? prev : max));
      }
    },
    [tabCount]
  );

  const goToIndex = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(tabCount - 1, index));
      if (clamped === activeIndex) return;
      void Haptics.selectionAsync();
      onIndexChange(clamped);
    },
    [activeIndex, onIndexChange, tabCount]
  );

  const glassColorScheme = (theme.isDark ? 'dark' : 'light') as 'dark' | 'light';
  const barTint = theme.isDark
    ? colorWithAlpha(theme.colors.primary.main, 0.22)
    : colorWithAlpha(theme.colors.primary.light, 0.42);
  const selectionFill = theme.isDark
    ? colorWithAlpha(theme.colors.primary.main, 0.28)
    : colorWithAlpha(theme.colors.background.primary, 0.55);

  const segmentsContent = (
    <View style={styles.segmentsRow}>
      <Animated.View
        style={[
          styles.selection,
          {
            width: selectionWidth,
            height: selectionHeight,
            borderRadius: selectionRadius,
            top: SELECTION_INSET_V,
            backgroundColor: selectionFill,
            borderColor: theme.isDark
              ? colorWithAlpha(theme.colors.text.inverse, 0.22)
              : colorWithAlpha(theme.colors.background.primary, 0.8),
          },
          selectionStyle,
        ]}
        pointerEvents="none"
      />

      {tabs.map((tab, index) => {
        const focused = activeIndex === index;
        const color = focused ? theme.colors.primary.dark : theme.colors.text.secondary;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={tab.label}
            onPress={() => goToIndex(index)}
            style={[styles.segment, { width: segmentWidth }]}
          >
            <Text
              style={[
                styles.label,
                {
                  color,
                  fontFamily: focused ? fonts.body.semibold : fonts.body.medium,
                },
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const chrome = useNativeLiquidGlass ? (
    <GlassView
      style={[styles.chrome, { width: barWidth, borderRadius: PILL_RADIUS }]}
      glassEffectStyle="regular"
      colorScheme={glassColorScheme}
      tintColor={barTint}
      isInteractive
    >
      {segmentsContent}
    </GlassView>
  ) : Platform.OS !== 'web' ? (
    <BlurView
      intensity={theme.isDark ? 55 : 48}
      tint={theme.isDark ? 'dark' : 'extraLight'}
      style={[
        styles.chrome,
        {
          width: barWidth,
          borderRadius: PILL_RADIUS,
          overflow: 'hidden',
          backgroundColor: theme.isDark
            ? colorWithAlpha(theme.colors.primary.main, 0.18)
            : colorWithAlpha(theme.colors.primary.light, 0.45),
        },
      ]}
    >
      {segmentsContent}
    </BlurView>
  ) : (
    <View
      style={[
        styles.chrome,
        {
          width: barWidth,
          borderRadius: PILL_RADIUS,
          backgroundColor: theme.isDark
            ? colorWithAlpha(theme.colors.background.secondary, 0.92)
            : colorWithAlpha(theme.colors.primary.light, 0.92),
        },
      ]}
    >
      {segmentsContent}
    </View>
  );

  return (
    <View style={styles.outer}>
      <View style={styles.measure} pointerEvents="none">
        {tabs.map((tab, index) => (
          <Text
            key={`measure-${tab.key}`}
            style={styles.measureLabel}
            onLayout={(e) => onLabelMeasure(index, e.nativeEvent.layout.width)}
          >
            {tab.label}
          </Text>
        ))}
      </View>
      <View style={[styles.barShadow, { width: barWidth, borderRadius: PILL_RADIUS }]}>
        {chrome}
      </View>
    </View>
  );
};

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    outer: {
      alignSelf: 'center',
      marginBottom: 20,
    },
    barShadow: {
      shadowColor: theme.colors.shadow.dark,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: theme.isDark ? 0.4 : 0.12,
      shadowRadius: 20,
      elevation: 10,
      backgroundColor: 'transparent',
    },
    chrome: {
      height: BAR_HEIGHT,
      justifyContent: 'center',
    },
    measure: {
      position: 'absolute',
      opacity: 0,
      left: 0,
      top: 0,
    },
    measureLabel: {
      fontFamily: fonts.body.semibold,
      fontSize: 13,
      letterSpacing: 0.15,
    },
    segmentsRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SEGMENTS_PADDING_H,
    },
    selection: {
      position: 'absolute',
      left: 0,
      borderWidth: StyleSheet.hairlineWidth,
    },
    segment: {
      height: BAR_HEIGHT,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    },
    label: {
      fontFamily: fonts.body.medium,
      fontSize: 13,
      letterSpacing: 0.15,
      includeFontPadding: false,
      textAlign: 'center',
      textAlignVertical: 'center',
      lineHeight: 16,
    },
  });
}
