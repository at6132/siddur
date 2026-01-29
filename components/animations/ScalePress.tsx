import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface ScalePressProps {
  children: React.ReactNode;
  onPress: () => void;
  scale?: number;
  style?: ViewStyle;
  disabled?: boolean;
}

export const ScalePress: React.FC<ScalePressProps> = ({
  children,
  onPress,
  scale = 0.95,
  style,
  disabled = false,
}) => {
  const scaleValue = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  const handlePressIn = () => {
    if (!disabled) {
      scaleValue.value = withSpring(scale);
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      scaleValue.value = withSpring(1);
    }
  };

  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={0.9}
      style={[animatedStyle, style]}
    >
      {children}
    </AnimatedTouchable>
  );
};

