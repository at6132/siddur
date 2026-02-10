/**
 * Satisfying checkbox: tap → scale bounce, circle fills, checkmark pops in.
 * Feels way better than Notes.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors } from '../../src/design/colors';
import { fonts } from '../../src/design/typography';

const springBounce = { damping: 12, stiffness: 280 };
const springSmooth = { damping: 20, stiffness: 200 };

interface SatisfyingCheckboxProps {
  checked: boolean;
  onToggle: () => void;
  size?: number;
}

export const SatisfyingCheckbox: React.FC<SatisfyingCheckboxProps> = ({
  checked,
  onToggle,
  size = 32,
}) => {
  const scale = useSharedValue(1);
  const fillScale = useSharedValue(checked ? 1 : 0);
  const checkScale = useSharedValue(checked ? 1 : 0);
  const checkOpacity = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    if (checked) {
      fillScale.value = withSpring(1, springSmooth);
      checkScale.value = withSequence(
        withTiming(1.25, { duration: 80, easing: Easing.out(Easing.ease) }),
        withSpring(1, springBounce)
      );
      checkOpacity.value = withTiming(1, { duration: 120 });
    } else {
      fillScale.value = withTiming(0, { duration: 150 });
      checkScale.value = withTiming(0, { duration: 120 });
      checkOpacity.value = withTiming(0, { duration: 100 });
    }
  }, [checked]);

  const rippleScale = useSharedValue(0);
  const rippleOpacity = useSharedValue(0);

  const handlePress = () => {
    scale.value = withSequence(
      withSpring(0.88, { damping: 15, stiffness: 400 }),
      withSpring(1, springBounce)
    );
    if (!checked) {
      rippleScale.value = 0;
      rippleOpacity.value = 0.45;
      rippleScale.value = withTiming(2.2, { duration: 400, easing: Easing.out(Easing.ease) });
      rippleOpacity.value = withTiming(0, { duration: 400 });
    }
    onToggle();
  };

  const boxStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const rippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rippleScale.value }],
    opacity: rippleOpacity.value,
  }));

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fillScale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
    transform: [{ scale: checkScale.value }],
  }));

  const r = size / 2;

  return (
    <Pressable onPress={handlePress} style={styles.wrapper}>
      <Animated.View style={[styles.outer, boxStyle, { width: size, height: size, borderRadius: r, overflow: 'visible' }]}>
        <Animated.View style={[styles.ripple, rippleStyle, { width: size, height: size, borderRadius: r }]} />
        <View style={[styles.border, { width: size, height: size, borderRadius: r }]} />
        <Animated.View
          style={[
            styles.fill,
            fillStyle,
            {
              width: size,
              height: size,
              borderRadius: r,
            },
          ]}
        />
        <Animated.View style={[styles.checkWrap, checkStyle, { width: size, height: size }]}>
          <Text style={[styles.check, { fontSize: size * 0.5 }]}>✓</Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginRight: 12 },
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  ripple: {
    position: 'absolute',
    left: 0,
    top: 0,
    backgroundColor: colors.primary.main,
  },
  border: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: colors.primary.main,
  },
  fill: {
    position: 'absolute',
    backgroundColor: colors.primary.main,
  },
  checkWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    fontFamily: fonts.body.bold,
    color: '#fff',
  },
});
