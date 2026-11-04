import React from 'react';
import { Text, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/design/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const MIN_HEIGHT = 44;

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Chip({
  label,
  selected = false,
  onPress,
  disabled = false,
  style,
}: ChipProps) {
  const { theme } = useTheme();
  const { spacing, radii, type } = theme.tokens;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const backgroundColor = selected
    ? theme.colors.primary.main
    : theme.colors.background.primary;
  const borderColor = selected
    ? theme.colors.primary.main
    : theme.colors.neutral[300];
  const textColor = selected
    ? theme.colors.text.inverse
    : theme.colors.text.primary;

  const handlePress = () => {
    if (!onPress || disabled) return;
    void Haptics.selectionAsync();
    onPress();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={() => {
        if (!onPress || disabled) return;
        scale.value = withSpring(0.96, { damping: 16, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 16, stiffness: 300 });
      }}
      disabled={disabled || !onPress}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
      style={[
        animatedStyle,
        styles.chip,
        {
          minHeight: MIN_HEIGHT,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: radii.full,
          backgroundColor,
          borderColor,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      <Text
        style={[
          type.textStyles.label,
          { color: textColor, fontSize: type.fontSize.sm },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
});
