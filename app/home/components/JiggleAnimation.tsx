import React, { useEffect, useMemo } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  cancelAnimation,
} from 'react-native-reanimated';

interface JiggleViewProps {
  children: React.ReactNode;
  isEditing: boolean;
  style?: any;
}

export const JiggleView: React.FC<JiggleViewProps> = ({ children, isEditing, style }) => {
  const rotation = useSharedValue(0);

  // Per-instance random values for organic feel
  const { duration, angle } = useMemo(() => ({
    duration: 130 + Math.random() * 40, // 130-170ms
    angle: 1.2 + Math.random() * 0.6,   // 1.2-1.8 degrees
  }), []);

  useEffect(() => {
    if (isEditing) {
      rotation.value = withRepeat(
        withSequence(
          withTiming(angle, { duration }),
          withTiming(-angle, { duration }),
        ),
        -1,
        true,
      );
    } else {
      cancelAnimation(rotation);
      rotation.value = withSpring(0, { damping: 15, stiffness: 200 });
    }
  }, [isEditing, angle, duration, rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
};
