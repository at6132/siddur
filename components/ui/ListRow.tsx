import React, { type ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/design/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const MIN_ROW_HEIGHT = 44;

export interface ListRowProps {
  title: string;
  subtitle?: string;
  /** Leading icon / avatar slot — no emoji; caller supplies icon component. */
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Shows chevron only when this row pushes a screen. */
  showChevron?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  showChevron = false,
  onPress,
  disabled = false,
  style,
}: ListRowProps) {
  const { theme } = useTheme();
  const { spacing, type } = theme.tokens;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!onPress || disabled) return;
    scale.value = withSpring(0.98, { damping: 18, stiffness: 280 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 18, stiffness: 280 });
  };

  const handlePress = () => {
    if (!onPress || disabled) return;
    void Haptics.selectionAsync();
    onPress();
  };

  const content = (
    <View
      style={[
        styles.row,
        {
          minHeight: MIN_ROW_HEIGHT,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      {leading ? <View style={[styles.leading, { marginRight: spacing.sm }]}>{leading}</View> : null}
      <View style={styles.textCol}>
        <Text
          style={[type.textStyles.body, { color: theme.colors.text.primary }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[type.textStyles.caption, { color: theme.colors.text.secondary, marginTop: spacing['2xs'] }]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ? <View style={{ marginLeft: spacing.sm }}>{trailing}</View> : null}
      {showChevron && onPress ? (
        <Text
          style={{
            marginLeft: spacing.sm,
            color: theme.colors.text.tertiary,
            fontSize: type.fontSize.lg,
          }}
          accessibilityElementsHidden
        >
          ›
        </Text>
      ) : null}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={animatedStyle}
    >
      {content}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
});
