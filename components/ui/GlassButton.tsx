import React from 'react';
import {
  Text,
  StyleSheet,
  View,
  ActivityIndicator,
  Pressable,
  type ViewStyle,
  type TextStyle,
  type StyleProp,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/design/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface GlassButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

/**
 * Primary actions — solid token fills (no gradient CTAs).
 * Blur/glass only on the ghost chrome variant.
 */
export const GlassButton: React.FC<GlassButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
}) => {
  const { theme } = useTheme();
  const { spacing, radii, type, glass } = theme.tokens;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const variantStyles = (() => {
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: theme.colors.secondary.main,
          textColor: theme.colors.text.inverse,
          useBlur: false,
        };
      case 'ghost':
        return {
          backgroundColor: theme.colors.glass.medium,
          textColor: theme.colors.primary.main,
          useBlur: true,
        };
      case 'primary':
      default:
        return {
          backgroundColor: theme.colors.primary.main,
          textColor: theme.colors.text.inverse,
          useBlur: false,
        };
    }
  })();

  const sizeStyles = (() => {
    switch (size) {
      case 'sm':
        return { paddingVertical: spacing.sm, paddingHorizontal: spacing.md };
      case 'lg':
        return { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl };
      case 'md':
      default:
        return { paddingVertical: spacing.md, paddingHorizontal: spacing.lg };
    }
  })();

  const handlePress = () => {
    if (disabled || loading) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const inner = (
    <View
      style={[
        styles.inner,
        {
          borderRadius: radii.xl,
          ...sizeStyles,
          backgroundColor: variantStyles.useBlur ? 'transparent' : variantStyles.backgroundColor,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles.textColor} size="small" />
      ) : (
        <Text
          style={[
            type.textStyles.label,
            { color: variantStyles.textColor, textAlign: 'center' },
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </View>
  );

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={() => {
        if (disabled || loading) return;
        scale.value = withSpring(0.97, { damping: 16, stiffness: 280 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 16, stiffness: 280 });
      }}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={[animatedStyle, style]}
    >
      {variantStyles.useBlur && Platform.OS !== 'web' ? (
        <BlurView
          intensity={glass.intensity.button}
          tint={theme.isDark ? 'dark' : 'light'}
          style={[styles.blur, { borderRadius: radii.xl, backgroundColor: variantStyles.backgroundColor }]}
        >
          {inner}
        </BlurView>
      ) : (
        inner
      )}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  blur: {
    overflow: 'hidden',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
});
