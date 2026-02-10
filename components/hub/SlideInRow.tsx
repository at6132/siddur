/**
 * Row that slides in + fades when it mounts (satisfying add feedback).
 */

import React, { useEffect } from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const springConfig = { damping: 20, stiffness: 180 };

interface SlideInRowProps {
  children: React.ReactNode;
  style?: ViewStyle;
  delay?: number;
}

export const SlideInRow: React.FC<SlideInRowProps> = ({ children, style, delay = 0 }) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);
  const scale = useSharedValue(0.92);

  useEffect(() => {
    const t = setTimeout(() => {
      opacity.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.ease) });
      translateY.value = withSpring(0, springConfig);
      scale.value = withSpring(1, { damping: 16, stiffness: 200 });
    }, delay);
    return () => clearTimeout(t);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
};
