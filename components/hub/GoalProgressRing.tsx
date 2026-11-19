/**
 * Full-width daily goals progress track. Fill is always relative to the bar,
 * not the goal count layout — so 1 goal or 20 goals looks the same width.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import { useTheme } from '../../src/design/theme';

export const GoalProgressRing: React.FC<{
  completed: number;
  total: number;
}> = ({ completed, total }) => {
  const { theme } = useTheme();
  const { colors, tokens } = theme;
  const { spacing, type, radii } = tokens;
  const reduceMotion = useReducedMotion();

  const [trackWidth, setTrackWidth] = useState(0);
  const progress = useSharedValue(0);
  const trackW = useSharedValue(0);

  const ratio = total > 0 ? Math.min(1, Math.max(0, completed / total)) : 0;

  useEffect(() => {
    trackW.value = trackWidth;
  }, [trackWidth, trackW]);

  useEffect(() => {
    if (reduceMotion) {
      progress.value = ratio;
      return;
    }
    progress.value = withTiming(ratio, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [ratio, reduceMotion, progress]);

  const onTrackLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - trackWidth) > 0.5) {
      setTrackWidth(w);
    }
  };

  const fillStyle = useAnimatedStyle(() => {
    const w = trackW.value;
    const width = w > 0 ? progress.value * w : 0;
    return { width };
  });

  const barHeight = spacing.sm + spacing['2xs'];

  return (
    <View style={styles.wrap}>
      <View style={[styles.labelRow, { marginBottom: spacing.sm }]}>
        <Text style={[type.textStyles.h3, { color: colors.primary.dark }]}>
          {completed}
        </Text>
        <Text
          style={[
            type.textStyles.bodySmall,
            { color: colors.text.tertiary, marginHorizontal: spacing.xs },
          ]}
        >
          /
        </Text>
        <Text style={[type.textStyles.body, { color: colors.text.secondary }]}>
          {total}
        </Text>
        <Text
          style={[
            type.textStyles.bodySmall,
            { color: colors.text.tertiary, marginLeft: spacing.xs },
          ]}
        >
          done
        </Text>
      </View>

      <View
        onLayout={onTrackLayout}
        style={[
          styles.track,
          {
            height: barHeight,
            borderRadius: radii.full,
            backgroundColor: colors.primary.light,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.fill,
            fillStyle,
            {
              height: barHeight,
              borderRadius: radii.full,
              backgroundColor: colors.primary.main,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignSelf: 'stretch',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    alignSelf: 'flex-start',
  },
});
