import React, { useEffect, useState } from 'react';
import { View, StyleSheet, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../src/design/theme';
import { colorWithAlpha } from '../../src/design/colorAlpha';

const springConfig = { damping: 18, stiffness: 120 };

/**
 * Thin theme-aware progress bar for Hub practice cards.
 * Uses measured pixel width so fill renders the same on every card.
 */
export const MiniProgressBar: React.FC<{
  progress: number;
  height?: number;
}> = ({ progress, height = 6 }) => {
  const { theme } = useTheme();
  const fill = useSharedValue(0);
  const trackWidth = useSharedValue(0);
  const [laidOut, setLaidOut] = useState(false);

  useEffect(() => {
    const p = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
    fill.value = withSpring(p, springConfig);
  }, [progress, fill]);

  const onTrackLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    trackWidth.value = w;
    if (!laidOut && w > 0) setLaidOut(true);
  };

  const fillStyle = useAnimatedStyle(() => ({
    width: Math.max(0, fill.value * trackWidth.value),
  }));

  return (
    <View
      onLayout={onTrackLayout}
      style={[
        styles.track,
        {
          height,
          borderRadius: height,
          backgroundColor: colorWithAlpha(theme.colors.primary.light, theme.isDark ? 0.35 : 0.55),
        },
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          fillStyle,
          {
            height,
            borderRadius: height,
            backgroundColor: theme.colors.primary.main,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  fill: {
    minWidth: 0,
  },
});
