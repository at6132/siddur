import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../src/design/theme';
import { spacing, borderRadius } from '../../src/design/spacing';
import { textStyles } from '../../src/design/typography';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface GlassButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

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
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
    opacity.value = withTiming(0.8);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
    opacity.value = withTiming(1);
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: theme.colors.primary.main,
          textColor: theme.colors.text.inverse,
        };
      case 'secondary':
        return {
          backgroundColor: theme.colors.secondary.main,
          textColor: theme.colors.text.inverse,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          textColor: theme.colors.primary.main,
        };
      default:
        return {
          backgroundColor: theme.colors.primary.main,
          textColor: theme.colors.text.inverse,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { paddingVertical: spacing.sm, paddingHorizontal: spacing.md };
      case 'md':
        return { paddingVertical: spacing.md, paddingHorizontal: spacing.lg };
      case 'lg':
        return { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl };
      default:
        return { paddingVertical: spacing.md, paddingHorizontal: spacing.lg };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[animatedStyle, style]}
    >
      <BlurView intensity={20} style={styles.blur}>
        <LinearGradient
          colors={
            variant === 'ghost'
              ? ['transparent', 'transparent']
              : [variantStyles.backgroundColor, variantStyles.backgroundColor]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.gradient,
            {
              borderRadius: borderRadius.xl,
              ...sizeStyles,
              opacity: disabled ? 0.5 : 1,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator
              color={variantStyles.textColor}
              size="small"
            />
          ) : (
            <Text
              style={[
                textStyles.label,
                {
                  color: variantStyles.textColor,
                  textAlign: 'center',
                },
                textStyle,
              ]}
            >
              {title}
            </Text>
          )}
        </LinearGradient>
      </BlurView>
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  blur: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

