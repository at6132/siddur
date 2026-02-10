/**
 * Satisfying progress: ring-style bar that fills with spring + "ping" at 100%.
 * Feels way better than Notes.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  Easing,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../../src/design/colors';
import { fonts } from '../../src/design/typography';

const springConfig = { damping: 18, stiffness: 90 };
const SIZE = 56;
const TRACK_WIDTH = SIZE * 2.2;

export const GoalProgressRing: React.FC<{
  completed: number;
  total: number;
  size?: number;
}> = ({ completed, total, size = SIZE }) => {
  const fillWidth = useSharedValue(0);
  const scale = useSharedValue(1);
  const labelScale = useSharedValue(1);

  useEffect(() => {
    const p = total ? Math.min(1, completed / total) : 0;
    fillWidth.value = withSpring(p, springConfig);
    if (total > 0 && completed === total) {
      scale.value = withSequence(
        withSpring(1.06, { damping: 10, stiffness: 200 }),
        withSpring(1, springConfig)
      );
      labelScale.value = withSequence(
        withDelay(60, withTiming(1.12, { duration: 120, easing: Easing.out(Easing.ease) })),
        withSpring(1, springConfig)
      );
    }
  }, [completed, total]);

  const fillStyle = useAnimatedStyle(() => ({
    width: fillWidth.value * TRACK_WIDTH,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    transform: [{ scale: labelScale.value }],
  }));

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.trackWrap, ringStyle, { width: TRACK_WIDTH, height: size / 2.5, borderRadius: size / 5 }]}>
        <View style={[styles.track, { height: size / 2.5, borderRadius: size / 5 }]}>
          <Animated.View
            style={[
              styles.fill,
              fillStyle,
              { height: size / 2.5, borderRadius: size / 5 },
            ]}
          />
        </View>
      </Animated.View>
      <Animated.View style={[styles.labels, labelStyle]}>
        <Text style={styles.num}>{total ? completed : 0}</Text>
        <Text style={styles.slash}>/</Text>
        <Text style={styles.total}>{total}</Text>
        <Text style={styles.done}> done</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  trackWrap: { overflow: 'hidden', marginBottom: 8 },
  track: {
    width: TRACK_WIDTH,
    backgroundColor: colors.primary.light,
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: colors.primary.main,
  },
  labels: { flexDirection: 'row', alignItems: 'baseline' },
  num: { fontFamily: fonts.heading.bold, fontSize: 22, color: colors.primary.dark },
  slash: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.text.tertiary, marginHorizontal: 2 },
  total: { fontFamily: fonts.body.semibold, fontSize: 14, color: colors.text.secondary },
  done: { fontFamily: fonts.body.regular, fontSize: 13, color: colors.text.tertiary, marginLeft: 2 },
});
